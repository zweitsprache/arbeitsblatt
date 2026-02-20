import React from "react";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";
import {
  CoverElement,
  CoverTextElement,
  CoverImageElement,
  CoverRibbonElement,
  CoverFlagElement,
  CoverSettings,
  DEFAULT_COVER_SETTINGS,
  COVER_WIDTH,
  COVER_HEIGHT,
  COVER_PAD,
} from "@/types/cover";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import satori from "satori";
import {
  readLogoAsPngDataUri,
  compressImageUrl,
} from "@/app/api/worksheets/[id]/grammar-table-pdf-v2/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fontDir = path.join(process.cwd(), "public", "fonts");

// Flag SVG paths relative to public/
const FLAG_FILE: Record<string, string> = {
  DE: "key_visuals/flag_of_Germany.svg",
  CH: "key_visuals/flag_of_Switzerland.svg",
  AT: "key_visuals/flag_of_Germany.svg",
};

/** Convert local SVG to PNG dataURI at given width */
async function svgToPngDataUri(relPath: string, width: number): Promise<string> {
  try {
    const abs = path.join(process.cwd(), "public", relPath);
    const buf = fs.readFileSync(abs);
    const pngBuf = await sharp(buf).resize({ width }).png().toBuffer();
    return `data:image/png;base64,${pngBuf.toString("base64")}`;
  } catch {
    return "";
  }
}

/** Build satori JSX from cover elements + settings, then render to PNG buffer */
async function renderCoverCreatorPng(
  elements: CoverElement[],
  settings: CoverSettings,
  worksheetId: string,
): Promise<Buffer> {
  // Load fonts
  const encodeSansRegular = fs.readFileSync(path.join(fontDir, "EncodeSans-Regular.ttf"));
  const encodeSansMedium = fs.readFileSync(path.join(fontDir, "EncodeSans-Medium.ttf"));
  const encodeSansSemiBold = fs.readFileSync(path.join(fontDir, "EncodeSans-SemiBold.ttf"));
  const encodeSansBold = fs.readFileSync(path.join(fontDir, "EncodeSans-Bold.ttf"));
  const merriweatherRegular = fs.readFileSync(path.join(fontDir, "Merriweather-Regular.woff"));
  const merriweatherBold = fs.readFileSync(path.join(fontDir, "Merriweather-Bold.woff"));

  // Pre-process assets into data URIs for satori
  const logoDataUri = settings.showLogo
    ? await readLogoAsPngDataUri("logo/lingostar_logo_and_brand_flat.svg", 800)
    : "";

  // Pre-process image elements
  const imageDataUris: Record<string, string> = {};
  for (const el of elements) {
    if (el.type === "image" && (el as CoverImageElement).src) {
      const src = (el as CoverImageElement).src;
      if (src.startsWith("http") || src.startsWith("/")) {
        const uri = src.startsWith("/")
          ? await svgToPngDataUri(src.replace(/^\//, ""), 800)
          : await compressImageUrl(src, 800, 90);
        imageDataUris[el.id] = uri;
      }
    }
    if (el.type === "flag") {
      const f = el as CoverFlagElement;
      const flagFile = FLAG_FILE[f.variant] || FLAG_FILE.DE;
      imageDataUris[el.id] = await svgToPngDataUri(flagFile, Math.round(f.width * 2));
    }
  }

  const now = new Date();
  const year = now.getFullYear();
  const dateStr = now.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" });

  // Build JSX for each element
  const elementJsx = elements.map((el) => {
    switch (el.type) {
      case "text": {
        const t = el as CoverTextElement;
        return (
          <div
            key={el.id}
            style={{
              position: "absolute",
              top: t.top,
              left: t.left,
              width: t.width > 0 ? t.width : undefined,
              maxWidth: COVER_WIDTH - t.left - COVER_PAD,
              fontFamily: t.fontFamily,
              fontSize: t.fontSize,
              fontWeight: t.fontWeight,
              color: t.color,
              textAlign: t.textAlign as "left" | "center" | "right",
              textTransform: t.uppercase ? ("uppercase" as const) : ("none" as const),
              lineHeight: 1.3,
              display: "flex",
              flexDirection: "column" as const,
            }}
          >
            {t.text}
          </div>
        );
      }
      case "image": {
        const img = el as CoverImageElement;
        const src = imageDataUris[el.id] || img.src;
        return (
          <div
            key={el.id}
            style={{
              position: "absolute",
              top: img.top,
              left: img.left,
              width: img.width,
              height: img.height,
              borderRadius: img.borderRadius,
              overflow: "hidden",
              display: "flex",
              ...(img.showBorder ? { border: "2px solid #CCCCCC" } : {}),
            }}
          >
            <img
              src={src}
              width={img.width}
              height={img.height}
              style={{ objectFit: img.objectFit, borderRadius: img.borderRadius }}
            />
          </div>
        );
      }
      case "ribbon": {
        const r = el as CoverRibbonElement;
        return (
          <div
            key={el.id}
            style={{
              position: "absolute",
              top: 130,
              left: -110,
              width: 560,
              height: 60,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: r.color,
              transform: "rotate(-45deg)",
              transformOrigin: "center center",
              boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
            }}
          >
            <span
              style={{
                fontFamily: "Encode Sans",
                fontWeight: 500,
                fontSize: r.fontSize,
                color: r.textColor,
                textTransform: "uppercase" as const,
                letterSpacing: 1,
                lineHeight: 1,
                textAlign: "center" as const,
              }}
            >
              {r.text}
            </span>
          </div>
        );
      }
      case "flag": {
        const f = el as CoverFlagElement;
        const src = imageDataUris[el.id] || "";
        if (!src) return null;
        return (
          <div key={el.id} style={{ position: "absolute", top: f.top, left: f.left, display: "flex" }}>
            <img src={src} width={f.width} height={Math.round(f.width * 0.67)} />
          </div>
        );
      }
    }
  });

  const jsx = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        backgroundColor: settings.backgroundColor,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Logo */}
      {settings.showLogo && logoDataUri ? (
        <div style={{ position: "absolute", top: COVER_PAD, right: COVER_PAD, display: "flex" }}>
          <img src={logoDataUri} width={227} height={53} />
        </div>
      ) : null}

      {/* Elements */}
      {elementJsx}

      {/* Footer */}
      {settings.showFooter ? (
        <div
          style={{
            position: "absolute",
            bottom: COVER_PAD,
            left: COVER_PAD,
            right: COVER_PAD,
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-end",
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
            <span>{worksheetId.toUpperCase().slice(0, 8)}</span>
            <span>{dateStr}</span>
          </div>
        </div>
      ) : null}
    </div>
  );

  const svg = await satori(jsx as React.ReactNode, {
    width: COVER_WIDTH,
    height: COVER_HEIGHT,
    fonts: [
      { name: "Encode Sans", data: encodeSansRegular, weight: 400, style: "normal" as const },
      { name: "Encode Sans", data: encodeSansMedium, weight: 500, style: "normal" as const },
      { name: "Encode Sans", data: encodeSansSemiBold, weight: 600, style: "normal" as const },
      { name: "Encode Sans", data: encodeSansBold, weight: 700, style: "normal" as const },
      { name: "Merriweather", data: merriweatherRegular, weight: 400, style: "normal" as const },
      { name: "Merriweather", data: merriweatherBold, weight: 700, style: "normal" as const },
    ],
  });

  return sharp(Buffer.from(svg)).png().toBuffer();
}

// ─── POST /api/worksheets/[id]/cover-png ─────────────────────

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  const { id } = await params;

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

  if (!worksheet || worksheet.type !== "covers") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const elements = (worksheet.blocks ?? []) as unknown as CoverElement[];
  const settings: CoverSettings = {
    ...DEFAULT_COVER_SETTINGS,
    ...(worksheet.settings as unknown as Partial<CoverSettings>),
  };

  try {
    const pngBuffer = await renderCoverCreatorPng(elements, settings, worksheet.id);

    const shortId = worksheet.id.slice(0, 16);
    const filename = `${shortId}_cover.png`;

    return new NextResponse(new Uint8Array(pngBuffer), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("[Cover PNG] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Cover image generation failed: ${message}` },
      { status: 500 },
    );
  }
}
