import React from "react";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import PptxGenJS from "pptxgenjs";
import fs from "fs";
import path from "path";
import {
  AdjectiveDeclinationTable,
  GrammarTableSettings,
  GrammarTableType,
  CaseSection,
  Genus,
  CASE_LABELS,
  GENUS_LABELS,
  DeclinationInput,
} from "@/types/grammar-table";
import { DEFAULT_BRAND_SETTINGS, BrandSettings } from "@/types/worksheet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── Constants ──────────────────────────────────────────────

const SLIDE_W = 1920;
const SLIDE_H = 1080;
const PAD = 60; // padding around slide content
const CELL_GAP = 3; // gap between cells in px

const GENDER_COLORS: Record<Genus, string> = {
  maskulin: "#F2E2D4",
  neutrum: "#D8E6F2",
  feminin: "#F2EDDA",
  plural: "#DAF0DC",
};

const HIGHLIGHT_BG = "#5a4540";
const HIGHLIGHT_COLOR = "#ffffff";

// ─── Font Loading ───────────────────────────────────────────

const fontDir = path.join(process.cwd(), "public", "fonts");

function loadFont(filename: string): Buffer {
  return fs.readFileSync(path.join(fontDir, filename));
}

let fontsCache: { name: string; data: Buffer; weight: number; style: string }[] | null = null;

function getFonts() {
  if (fontsCache) return fontsCache;
  fontsCache = [
    { name: "Encode Sans", data: loadFont("EncodeSans-Regular.ttf"), weight: 400, style: "normal" },
    { name: "Encode Sans", data: loadFont("EncodeSans-Bold.ttf"), weight: 700, style: "normal" },
    { name: "Merriweather", data: loadFont("Merriweather-Regular.ttf"), weight: 400, style: "normal" },
    { name: "Asap Condensed", data: loadFont("asap-condensed-400.ttf"), weight: 400, style: "normal" },
    { name: "Asap Condensed", data: loadFont("asap-condensed-600.ttf"), weight: 600, style: "normal" },
  ];
  return fontsCache;
}

// ─── Logo Loading ───────────────────────────────────────────

function loadLogoPng(relativePath: string): string | null {
  try {
    const abs = path.join(process.cwd(), "public", relativePath);
    const buf = fs.readFileSync(abs);
    // If SVG, we can't embed directly in Satori img — convert via resvg
    if (relativePath.endsWith(".svg")) {
      const resvg = new Resvg(buf, { fitTo: { mode: "width", value: 400 } });
      const pngData = resvg.render();
      const pngBuf = pngData.asPng();
      return `data:image/png;base64,${Buffer.from(pngBuf).toString("base64")}`;
    }
    const ext = relativePath.endsWith(".png") ? "png" : "jpeg";
    return `data:image/${ext};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

// ─── Adjective ending highlight ─────────────────────────────

function getAdjectiveEndingRange(
  baseAdj: string,
  declinedAdj: string,
): [number, number] | undefined {
  if (!baseAdj || !declinedAdj) return undefined;
  const base = baseAdj.toLowerCase();
  const declined = declinedAdj.toLowerCase();
  let matchLen = 0;
  for (let i = 0; i < base.length && i < declined.length; i++) {
    if (base[i] === declined[i]) matchLen++;
    else break;
  }
  if (matchLen >= declinedAdj.length) return undefined;
  return [matchLen, declinedAdj.length];
}

// ─── Slide JSX Components (Satori-compatible) ───────────────

function HighlightedAdj({
  base,
  declined,
  show,
  fontSize,
}: {
  base: string;
  declined: string;
  show: boolean;
  fontSize: number;
}) {
  const range = getAdjectiveEndingRange(base, declined);
  if (!show || !range) {
    return <span style={{ fontSize }}>{declined}</span>;
  }
  const [start, end] = range;
  return (
    <span style={{ fontSize, display: "flex" }}>
      {declined.slice(0, start)}
      <span
        style={{
          backgroundColor: HIGHLIGHT_BG,
          color: HIGHLIGHT_COLOR,
          borderRadius: 2,
          padding: "0 2px",
        }}
      >
        {declined.slice(start, end)}
      </span>
    </span>
  );
}

interface CaseTableProps {
  caseSection: CaseSection;
  settings: GrammarTableSettings;
  input: DeclinationInput;
  bodyFont: string;
  cellW: number;
  genderBlockW: number;
}

function CaseTableBlock({ caseSection, settings, input, bodyFont, cellW, genderBlockW }: CaseTableProps) {
  const genders: Genus[] = ["maskulin", "neutrum", "feminin", "plural"];

  // Flatten rows
  type FlatRow = {
    groupIdx: number;
    rowIdx: number;
    isFirstInGroup: boolean;
    groupRowCount: number;
    group: CaseSection["groups"][number];
    articleRow: CaseSection["groups"][number]["articleRows"][number];
    isLastGroup: boolean;
  };
  const flatRows: FlatRow[] = [];
  caseSection.groups.forEach((group, gi) => {
    const rows = group.articleRows ?? [];
    rows.forEach((ar, ri) => {
      flatRows.push({
        groupIdx: gi,
        rowIdx: ri,
        isFirstInGroup: ri === 0,
        groupRowCount: rows.length,
        group,
        articleRow: ar,
        isLastGroup: gi === caseSection.groups.length - 1,
      });
    });
  });

  const cellFontSize = 16;
  const headerFontSize = 12;

  const cellStyle = (bg: string, w: number, isFirst = false): React.CSSProperties => ({
    width: w,
    padding: "3px 6px",
    backgroundColor: bg,
    marginLeft: isFirst ? 0 : CELL_GAP,
    display: "flex",
    justifyContent: "center",
    fontSize: cellFontSize,
    fontFamily: bodyFont,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", marginBottom: 12 }}>
      {/* Case title */}
      <div style={{ fontSize: 18, fontWeight: 700, color: "#000000", marginBottom: 4, display: "flex" }}>
        {CASE_LABELS[caseSection.case].de}
      </div>

      {/* Table */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          borderRadius: 6,
          overflow: "hidden",
          backgroundColor: "#ffffff",
        }}
      >
        {/* Header row 1: gender names */}
        <div style={{ display: "flex", flexDirection: "row" }}>
          {genders.map((g, gi) => (
            <div
              key={g}
              style={{
                width: genderBlockW,
                padding: "4px 6px",
                backgroundColor: GENDER_COLORS[g],
                marginLeft: gi === 0 ? 0 : CELL_GAP,
                display: "flex",
                justifyContent: "center",
                fontSize: headerFontSize,
                fontWeight: 700,
                borderTopLeftRadius: gi === 0 ? 6 : 0,
                borderTopRightRadius: gi === genders.length - 1 ? 6 : 0,
              }}
            >
              {GENUS_LABELS[g].de}
            </div>
          ))}
        </div>

        {/* Header row 2: Artikel / Adjektiv / Nomen */}
        <div style={{ display: "flex", flexDirection: "row", marginTop: CELL_GAP }}>
          {genders.map((g, gi) =>
            ["Artikel", "Adjektiv", "Nomen"].map((label, li) => (
              <div
                key={`${g}-${label}`}
                style={{
                  width: cellW,
                  padding: "2px 6px",
                  backgroundColor: GENDER_COLORS[g],
                  marginLeft: gi === 0 && li === 0 ? 0 : CELL_GAP,
                  display: "flex",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {label}
              </div>
            ))
          )}
        </div>

        {/* Data rows */}
        {flatRows.map((fr, fi) => {
          const isGlobalLast = fi === flatRows.length - 1;

          return (
            <div key={fi} style={{ display: "flex", flexDirection: "row", marginTop: CELL_GAP }}>
              {genders.map((g, gi) => {
                const shared = fr.group.shared?.[g] || { adjective: "", noun: "" };
                const article = (fr.articleRow?.[g] || "").replace(/\*+$/g, "");
                const adj =
                  g === "plural" && fr.articleRow?.pluralOverride
                    ? fr.articleRow.pluralOverride.adjective
                    : shared.adjective;
                const noun =
                  g === "plural" && fr.articleRow?.pluralOverride
                    ? fr.articleRow.pluralOverride.noun
                    : shared.noun;
                const bg = GENDER_COLORS[g];
                const isFirst = gi === 0;

                return (
                  <div key={g} style={{ display: "flex", flexDirection: "row" }}>
                    {/* Article */}
                    <div
                      style={{
                        ...cellStyle(bg, cellW, isFirst),
                        ...(isGlobalLast && gi === 0 ? { borderBottomLeftRadius: 6 } : {}),
                      }}
                    >
                      <span style={{ fontSize: cellFontSize }}>{article}</span>
                    </div>
                    {/* Adjective */}
                    {fr.isFirstInGroup ? (
                      <div style={{ ...cellStyle(bg, cellW), alignItems: "center" }}>
                        <HighlightedAdj
                          base={input?.[g]?.adjective ?? ""}
                          declined={adj}
                          show={settings.highlightEndings ?? false}
                          fontSize={cellFontSize}
                        />
                      </div>
                    ) : (
                      <div style={{ ...cellStyle(bg, cellW), visibility: "hidden" as const }}>
                        <span style={{ fontSize: cellFontSize }}> </span>
                      </div>
                    )}
                    {/* Noun */}
                    {fr.isFirstInGroup ? (
                      <div
                        style={{
                          ...cellStyle(bg, cellW),
                          ...(isGlobalLast && gi === genders.length - 1 ? { borderBottomRightRadius: 6 } : {}),
                        }}
                      >
                        <span style={{ fontSize: cellFontSize }}>{noun}</span>
                      </div>
                    ) : (
                      <div
                        style={{
                          ...cellStyle(bg, cellW),
                          visibility: "hidden" as const,
                          ...(isGlobalLast && gi === genders.length - 1 ? { borderBottomRightRadius: 6 } : {}),
                        }}
                      >
                        <span style={{ fontSize: cellFontSize }}> </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ContentSlideProps {
  cases: CaseSection[];
  settings: GrammarTableSettings;
  input: DeclinationInput;
  title: string;
  iconDataUri: string | null;
  bodyFont: string;
}

function ContentSlide({ cases, settings, input, title, iconDataUri, bodyFont }: ContentSlideProps) {
  const contentW = SLIDE_W - PAD * 2;
  const totalCells = 12;
  const totalGaps = totalCells - 1;
  const available = contentW - totalGaps * CELL_GAP;
  const cellW = Math.floor(available / totalCells);
  const genderBlockW = 3 * cellW + 2 * CELL_GAP;

  return (
    <div
      style={{
        width: SLIDE_W,
        height: SLIDE_H,
        backgroundColor: "#ffffff",
        display: "flex",
        flexDirection: "column",
        padding: PAD,
        fontFamily: bodyFont,
      }}
    >
      {/* Header bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <span style={{ fontSize: 12, color: "#666666", fontFamily: "Encode Sans" }}>
          Adjektivdeklination | Nominativ · Akkusativ · Dativ · Genitiv
        </span>
        {iconDataUri ? (
          <img src={iconDataUri} width={30} height={30} style={{ objectFit: "contain" }} />
        ) : null}
      </div>

      {/* Document title */}
      <div style={{ fontSize: 22, fontWeight: 400, color: "#000000", marginBottom: 10, fontFamily: "Merriweather", display: "flex" }}>
        {settings.contentTitle || title}
      </div>

      {/* Case tables stacked vertically */}
      {cases.map((cs) => (
        <CaseTableBlock
          key={cs.case}
          caseSection={cs}
          settings={settings}
          input={input}
          bodyFont={bodyFont}
          cellW={cellW}
          genderBlockW={genderBlockW}
        />
      ))}
    </div>
  );
}

function TitleSlide({
  title,
  bigLogoDataUri,
  coverImages,
  coverImageBorder,
  bodyFont,
}: {
  title: string;
  bigLogoDataUri: string | null;
  coverImages: string[];
  coverImageBorder: boolean;
  bodyFont: string;
}) {
  return (
    <div
      style={{
        width: SLIDE_W,
        height: SLIDE_H,
        backgroundColor: "#ffffff",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: PAD,
        fontFamily: bodyFont,
        position: "relative",
      }}
    >
      {/* Logo top-right */}
      {bigLogoDataUri ? (
        <div style={{ position: "absolute", top: PAD, right: PAD, display: "flex" }}>
          <img src={bigLogoDataUri} width={200} style={{ objectFit: "contain" }} />
        </div>
      ) : null}

      <div style={{ display: "flex", flexDirection: "column" }}>
        <span
          style={{
            fontFamily: "Encode Sans",
            fontSize: 22,
            textTransform: "uppercase" as const,
            color: "#000000",
            marginBottom: 12,
          }}
        >
          Adjektivdeklination
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
        <span
          style={{
            fontFamily: "Encode Sans",
            fontSize: 22,
            color: "#000000",
            marginTop: 10,
          }}
        >
          Nominativ · Akkusativ · Dativ · Genitiv
        </span>

        {/* Cover images */}
        <div style={{ display: "flex", flexDirection: "row", gap: 16, marginTop: 40 }}>
          {[0, 1, 2, 3].map((i) => {
            const src = coverImages?.[i];
            return src && src !== "" ? (
              <div
                key={i}
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 6,
                  overflow: "hidden",
                  ...(coverImageBorder
                    ? { border: "2px solid #CCCCCC" }
                    : {}),
                  display: "flex",
                }}
              >
                <img
                  src={src}
                  width={120}
                  height={120}
                  style={{ objectFit: "cover", borderRadius: 6 }}
                />
              </div>
            ) : (
              <div
                key={i}
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 6,
                  backgroundColor: "#F0F0F0",
                  border: "2px dashed #CCCCCC",
                  display: "flex",
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Render slide to PNG ────────────────────────────────────

async function renderSlideToPng(element: React.ReactElement): Promise<Buffer> {
  const fonts = getFonts();
  const svg = await satori(element, {
    width: SLIDE_W,
    height: SLIDE_H,
    fonts: fonts.map((f) => ({
      name: f.name,
      data: f.data,
      weight: f.weight as 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900,
      style: f.style as "normal" | "italic",
    })),
  });

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: SLIDE_W },
  });
  const pngData = resvg.render();
  return Buffer.from(pngData.asPng());
}

// ─── POST handler ───────────────────────────────────────────

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
  if (!worksheet || worksheet.type !== "grammar-table") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const blocksData = worksheet.blocks as unknown as {
    tableType?: GrammarTableType;
    declinationInput?: DeclinationInput;
    tableData?: AdjectiveDeclinationTable;
  } | null;

  const tableType = blocksData?.tableType || "adjective-declination";

  if (tableType !== "adjective-declination") {
    return NextResponse.json(
      { error: "PPTX export is currently only supported for adjective-declination tables" },
      { status: 400 }
    );
  }

  const tableData = blocksData?.tableData as AdjectiveDeclinationTable;
  if (!tableData || !tableData.cases || tableData.cases.length === 0) {
    return NextResponse.json(
      { error: "No declination data to export" },
      { status: 400 }
    );
  }

  // Prefer user's stored declinationInput
  if (blocksData?.declinationInput) {
    tableData.input = blocksData.declinationInput;
  }

  const settings = (worksheet.settings ?? {}) as unknown as GrammarTableSettings;
  const brand = settings.brand || "edoomio";
  const brandSettings: BrandSettings = {
    ...DEFAULT_BRAND_SETTINGS[brand],
    ...settings.brandSettings,
  };
  const bodyFont = brand === "lingostar" ? "Encode Sans" : "Asap Condensed";

  // Load logos
  const bigLogoDataUri = loadLogoPng("logo/lingostar_logo_and_brand_flat.svg");
  const iconDataUri = brandSettings.logo
    ? loadLogoPng(brandSettings.logo.replace(/^\//, ""))
    : null;

  try {
    console.log(
      `[Grammar Table PPTX] Generating for "${worksheet.title}" (${tableData.cases.length} cases)`
    );

    // Render slides
    const slidePngs: Buffer[] = [];

    // 1. Title slide
    const titlePng = await renderSlideToPng(
      <TitleSlide
        title={worksheet.title}
        bigLogoDataUri={bigLogoDataUri}
        coverImages={settings.coverImages ?? []}
        coverImageBorder={settings.coverImageBorder ?? false}
        bodyFont={bodyFont}
      />
    );
    slidePngs.push(titlePng);

    // 2. Slide: Nominativ + Akkusativ
    const nomAkkCases = tableData.cases.filter(cs => cs.case === "nominativ" || cs.case === "akkusativ");
    const slide2Png = await renderSlideToPng(
      <ContentSlide
        cases={nomAkkCases}
        settings={settings}
        input={tableData.input}
        title={worksheet.title}
        iconDataUri={iconDataUri}
        bodyFont={bodyFont}
      />
    );
    slidePngs.push(slide2Png);

    // 3. Slide: Dativ + Genitiv
    const datGenCases = tableData.cases.filter(cs => cs.case === "dativ" || cs.case === "genitiv");
    const slide3Png = await renderSlideToPng(
      <ContentSlide
        cases={datGenCases}
        settings={settings}
        input={tableData.input}
        title={worksheet.title}
        iconDataUri={iconDataUri}
        bodyFont={bodyFont}
      />
    );
    slidePngs.push(slide3Png);

    // Build PPTX
    const pptx = new PptxGenJS();
    pptx.defineLayout({ name: "CUSTOM_16x9", width: 13.333, height: 7.5 });
    pptx.layout = "CUSTOM_16x9";
    pptx.author = "lingostar";
    pptx.title = worksheet.title;

    for (const pngBuf of slidePngs) {
      const slide = pptx.addSlide();
      const base64 = pngBuf.toString("base64");
      slide.addImage({
        data: `image/png;base64,${base64}`,
        x: 0,
        y: 0,
        w: "100%",
        h: "100%",
      });
    }

    const pptxBuffer = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;

    const safeTitle = worksheet.title
      .replace(/[\u2013\u2014]/g, "-")
      .replace(/[^\x20-\x7E]/g, "_");

    return new NextResponse(Buffer.from(pptxBuffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${safeTitle}.pptx"`,
      },
    });
  } catch (error) {
    console.error("[Grammar Table PPTX] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `PPTX generation failed: ${message}` },
      { status: 500 }
    );
  }
}
