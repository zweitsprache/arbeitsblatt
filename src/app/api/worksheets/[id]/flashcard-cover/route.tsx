import React from "react";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";
import { FlashcardItem, FlashcardSide } from "@/types/flashcard";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import satori from "satori";
import { readLogoAsPngDataUri } from "@/app/api/worksheets/[id]/grammar-table-pdf-v2/route";
import { replaceEszett } from "@/lib/locale-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fontDir = path.join(process.cwd(), "public", "fonts");

// A4 portrait at 2× density: 595 × 842 pt → 1190 × 1684 px
const W = 1190;
const H = 1684;
const PAD = 85;

// Mini-card dimensions (px at 2× density, roughly 40mm × 28mm)
const CARD_W = 280;
const CARD_H = 195;

// ─── Text rendering helpers (markers → React elements for satori) ──

/**
 * Parse card text with {{hl}}, {{sup}}, {{verb}} markers into React inline elements.
 * For front: first line bold, {{verb}} stripped.
 * For back: {{verb}} splits into regular / semibold.
 */
function renderCardTextElements(
  text: string,
  side: "front" | "back",
  fontSize: number,
): React.ReactNode {
  const lines = text.split("\n");

  return lines.map((line, lineIdx) => {
    // Parse markers within this line
    const elements = parseLineMarkers(line, side, lineIdx === 0 && side === "front", fontSize);
    return (
      <div
        key={lineIdx}
        style={{
          display: "flex",
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "baseline",
          fontWeight: lineIdx === 0 && side === "front" ? 600 : 400,
        }}
      >
        {elements}
      </div>
    );
  });
}

function parseLineMarkers(
  line: string,
  side: "front" | "back",
  _isBoldLine: boolean,
  fontSize: number,
): React.ReactNode[] {
  const elements: React.ReactNode[] = [];
  let remaining = line;
  let key = 0;

  // For back text: split at {{verb}} → left part regular, right part semibold
  if (side === "back" && remaining.includes("{{verb}}")) {
    const [left, right] = remaining.split("{{verb}}");
    elements.push(
      <span key={key++} style={{ fontWeight: 400 }}>
        {renderInlineMarkers(left, fontSize, key)}
      </span>,
    );
    if (right) {
      elements.push(
        <span key={key++} style={{ fontWeight: 600 }}>
          {renderInlineMarkers(right, fontSize, key * 100)}
        </span>,
      );
    }
    return elements;
  }

  // Strip {{verb}} for front
  remaining = remaining.replace(/\{\{verb\}\}/g, "");
  elements.push(...renderInlineMarkers(remaining, fontSize, key));
  return elements;
}

function renderInlineMarkers(
  text: string,
  fontSize: number,
  keyOffset: number,
): React.ReactNode[] {
  const elements: React.ReactNode[] = [];
  // Match {{hl}}...{{/hl}} and {{sup}}...{{/sup}}
  const regex = /\{\{hl\}\}(.*?)\{\{\/hl\}\}|\{\{sup\}\}(.*?)\{\{\/sup\}\}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = keyOffset;

  while ((match = regex.exec(text)) !== null) {
    // Text before match
    if (match.index > lastIndex) {
      elements.push(
        <span key={key++}>{text.slice(lastIndex, match.index)}</span>,
      );
    }

    if (match[1] !== undefined) {
      // {{hl}}...{{/hl}}
      elements.push(
        <span
          key={key++}
          style={{
            backgroundColor: "#5a4540",
            color: "#fff",
            fontWeight: 600,
            padding: "0 2px",
            borderRadius: 2,
          }}
        >
          {match[1]}
        </span>,
      );
    } else if (match[2] !== undefined) {
      // {{sup}}...{{/sup}}
      elements.push(
        <span
          key={key++}
          style={{
            fontSize: Math.round(fontSize * 0.6),
            color: "#888",
            fontWeight: 400,
            verticalAlign: "super",
            lineHeight: 1,
          }}
        >
          {match[2]}
        </span>,
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < text.length) {
    elements.push(<span key={key++}>{text.slice(lastIndex)}</span>);
  }

  return elements;
}

// ─── Mini-card component for satori ─────────────────────────

function MiniCard({
  sideData,
  pageSide,
  iconDataUri,
}: {
  sideData: FlashcardSide;
  pageSide: "front" | "back";
  iconDataUri: string;
}) {
  const fontSize = 13;
  const text = sideData.text || "";

  return (
    <div
      style={{
        width: CARD_W,
        height: CARD_H,
        backgroundColor: "#FFFFFF",
        borderRadius: 10,
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        boxShadow: "0 4px 20px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.08)",
        padding: "10px 14px",
      }}
    >
      {/* Card text */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center" as const,
          fontFamily: "Encode Sans",
          fontSize,
          lineHeight: 1.35,
          color: "#222",
          gap: 2,
          maxWidth: CARD_W - 28,
        }}
      >
        {renderCardTextElements(text, pageSide, fontSize)}
      </div>
    </div>
  );
}

// ─── Cover page layout ──────────────────────────────────────

interface FlashcardCoverProps {
  cards: FlashcardItem[];
  title: string;
  worksheetId: string;
  bigLogoDataUri: string;
  iconDataUri: string;
}

function FlashcardCoverSvg({
  cards,
  title,
  worksheetId,
  bigLogoDataUri,
  iconDataUri,
}: FlashcardCoverProps) {
  const now = new Date();
  const year = now.getFullYear();
  const dateStr = now.toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  // Pick 2 non-blank cards from different infinitives (first line of front text)
  const realCards = cards.filter(
    (c) => c.front.text || c.front.image || c.back.text || c.back.image,
  );
  const card1 = realCards[0];
  const card1Infinitive = card1?.front.text?.split("\n")[0] ?? "";
  const card2 = realCards.find(
    (c) => (c.front.text?.split("\n")[0] ?? "") !== card1Infinitive,
  ) ?? (realCards.length > 1 ? realCards[1] : realCards[0]);

  // 4 cards scattered below title, slightly overlapping, horizontally centered
  const placements = card1
    ? [
        { top: 1010, left: 195, rot: -5,  side: card1.front, ps: "front" as const },
        { top: 980,  left: 530, rot: 3,   side: card1.back,  ps: "back" as const },
        { top: 1180, left: 270, rot: 4,   side: card2 ? card2.front : card1.front, ps: "front" as const },
        { top: 1160, left: 610, rot: -6,  side: card2 ? card2.back : card1.back, ps: "back" as const },
      ]
    : [];

  // Extract unique tense+modus labels from card front text (2nd line)
  const tenseSet = new Set<string>();
  for (const c of realCards) {
    const lines = c.front.text?.split("\n") ?? [];
    if (lines[1]) tenseSet.add(lines[1].trim());
  }
  const tenseInfo = Array.from(tenseSet).join(" · ");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        padding: PAD,
        backgroundColor: "white",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Logo — top-right */}
      {bigLogoDataUri ? (
        <div style={{ position: "absolute", top: PAD, right: PAD, display: "flex" }}>
          <img src={bigLogoDataUri} width={227} height={53} />
        </div>
      ) : null}

      {/* Centered title content — same as grammar tables */}
      <div style={{ display: "flex", flex: 1, flexDirection: "column", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span
            style={{
              fontFamily: "Encode Sans",
              fontSize: 22,
              fontWeight: 400,
              textTransform: "uppercase" as const,
              color: "#000000",
              marginBottom: 23,
            }}
          >
            Flashcards
          </span>
          <span
            style={{
              fontFamily: "Merriweather",
              fontSize: 56,
              fontWeight: 400,
              color: "#222222",
            }}
          >
            {title}
          </span>
          {tenseInfo ? (
            <span
              style={{
                fontFamily: "Encode Sans",
                fontSize: 22,
                fontWeight: 400,
                color: "#000000",
                marginTop: 17,
              }}
            >
              {tenseInfo}
            </span>
          ) : null}
        </div>
      </div>

      {/* Scattered cards — positioned absolutely in the lower portion */}
      {placements.map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: p.top,
            left: p.left,
            transform: `rotate(${p.rot}deg)`,
            display: "flex",
          }}
        >
          <MiniCard sideData={p.side} pageSide={p.ps} iconDataUri={iconDataUri} />
        </div>
      ))}

      {/* Footer */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-end",
          paddingTop: 11,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontFamily: "Encode Sans",
            fontSize: 14,
            color: "#666666",
            lineHeight: 1.4,
          }}
        >
          <span>{`© ${year} lingostar | Marcel Allenspach`}</span>
          <span>Alle Rechte vorbehalten</span>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontFamily: "Encode Sans",
            fontSize: 14,
            color: "#666666",
            textAlign: "right" as const,
            lineHeight: 1.4,
            alignItems: "flex-end",
          }}
        >
          <span>{worksheetId.toUpperCase()}</span>
          <span>{dateStr}</span>
        </div>
      </div>
    </div>
  );
}

async function renderFlashcardCoverPng(props: FlashcardCoverProps): Promise<Buffer> {
  const encodeSansRegular = fs.readFileSync(path.join(fontDir, "EncodeSans-Regular.ttf"));
  const encodeSansMedium = fs.readFileSync(path.join(fontDir, "EncodeSans-Medium.ttf"));
  const encodeSansSemiBold = fs.readFileSync(path.join(fontDir, "EncodeSans-SemiBold.ttf"));
  const merriweatherRegular = fs.readFileSync(path.join(fontDir, "Merriweather-Regular.woff"));

  const jsx = <FlashcardCoverSvg {...props} />;

  const svg = await satori(jsx as React.ReactNode, {
    width: W,
    height: H,
    fonts: [
      { name: "Encode Sans", data: encodeSansRegular, weight: 400, style: "normal" as const },
      { name: "Encode Sans", data: encodeSansMedium, weight: 500, style: "normal" as const },
      { name: "Encode Sans", data: encodeSansSemiBold, weight: 600, style: "normal" as const },
      { name: "Merriweather", data: merriweatherRegular, weight: 400, style: "normal" as const },
    ],
  });

  return sharp(Buffer.from(svg)).png().toBuffer();
}

// ─── POST /api/worksheets/[id]/flashcard-cover ──────────────

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  const { id } = await params;
  const locale = (_req.nextUrl.searchParams.get("locale") || "DE").toUpperCase() as "DE" | "CH";
  const isSwiss = locale === "CH";

  const worksheet = await prisma.worksheet.findFirst({
    where: {
      id,
      userId,
    } as Parameters<typeof prisma.worksheet.findFirst>[0] extends {
      where?: infer W;
    }
      ? W
      : never,
  });
  if (!worksheet || worksheet.type !== "flashcards") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let cards = (worksheet.blocks ?? []) as unknown as FlashcardItem[];
  if (cards.length === 0) {
    return NextResponse.json({ error: "No cards" }, { status: 400 });
  }

  if (isSwiss) {
    cards = replaceEszett(cards);
  }

  try {
    const bigLogoDataUri = await readLogoAsPngDataUri(
      "logo/lingostar_logo_and_brand_flat.svg",
      800,
    );
    const iconDataUri = await readLogoAsPngDataUri(
      "logo/lingostar_logo_icon_flat.svg",
      64,
    );

    let title = worksheet.title.replace(/\s*[\u2013\u2014-]\s*Lernkarten$/i, "");
    if (isSwiss) {
      title = replaceEszett(title);
    }

    const pngBuffer = await renderFlashcardCoverPng({
      cards,
      title,
      worksheetId: worksheet.id,
      bigLogoDataUri,
      iconDataUri,
    });

    const shortId = worksheet.id.slice(0, 16);
    const filename = `${shortId}_cover_${isSwiss ? "CH" : "DE"}.png`;

    return new NextResponse(new Uint8Array(pngBuffer), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("[Flashcard Cover] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Cover image generation failed: ${message}` },
      { status: 500 },
    );
  }
}
