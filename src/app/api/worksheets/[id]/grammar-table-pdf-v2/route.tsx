import React from "react";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  Font,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import {
  AdjectiveDeclinationTable,
  VerbConjugationTable,
  GrammarTableSettings,
  GrammarTableType,
  TENSE_LABELS,
  VerbTense,
  CONJUGATION_ROWS,
  PersonKey,
  TenseHighlights,
} from "@/types/grammar-table";
import {
  DEFAULT_BRAND_SETTINGS,
  BrandSettings,
  BRAND_FONTS,
  Brand,
} from "@/types/worksheet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── Font Registration ──────────────────────────────────────

const fontDir = path.join(process.cwd(), "public", "fonts");

function fontDataUri(filename: string, mime = "font/truetype"): string {
  const buf = fs.readFileSync(path.join(fontDir, filename));
  return `data:${mime};base64,${buf.toString("base64")}`;
}

Font.register({
  family: "Encode Sans",
  fonts: [
    { src: fontDataUri("EncodeSans-Regular.ttf"), fontWeight: 400 },
    { src: fontDataUri("EncodeSans-Bold.ttf"), fontWeight: 700 },
  ],
});

Font.register({
  family: "Merriweather",
  fonts: [
    { src: fontDataUri("Merriweather-Regular.woff", "font/woff"), fontWeight: 400 },
    { src: fontDataUri("Merriweather-Bold.woff", "font/woff"), fontWeight: 700 },
  ],
});

Font.register({
  family: "Asap Condensed",
  fonts: [
    { src: fontDataUri("asap-condensed-400.ttf"), fontWeight: 400 },
    { src: fontDataUri("asap-condensed-600.ttf"), fontWeight: 600 },
  ],
});

// Disable hyphenation for German words
Font.registerHyphenationCallback((word) => [word]);

// ─── Logo helpers ───────────────────────────────────────────

/** Convert an SVG file to a PNG data-URI (react-pdf can't render SVG with CSS classes). */
async function readLogoAsPngDataUri(
  relativePath: string,
  width = 400,
): Promise<string> {
  try {
    const abs = path.join(process.cwd(), "public", relativePath);
    const svgBuf = fs.readFileSync(abs);
    const pngBuf = await sharp(svgBuf)
      .resize({ width })
      .png()
      .toBuffer();
    return `data:image/png;base64,${pngBuf.toString("base64")}`;
  } catch (e) {
    console.warn(`[Grammar Table PDF v2] Could not convert logo: ${relativePath}`, e);
    return "";
  }
}

// ─── Constants ──────────────────────────────────────────────

const TENSE_COLORS: Record<VerbTense, string> = {
  praesens: "#f8f4ef",
  perfekt: "#f4f6f3",
  praeteritum: "#faf4e8",
};

const CELL_GAP = 1.5;       // white gap between cells (pt)
const TENSE_GAP = CELL_GAP * 3; // wider gap between tense column groups
const CELL_BG = "#f2f2f2"; // light grey for non-tense cells

// Column width constants (%)
const BASE_PERSON_W = 7;
const BASE_FORMAL_W = 7;
const BASE_PRONOUN_W = 10;
const REMAINING_W = 100 - BASE_PERSON_W - BASE_FORMAL_W - BASE_PRONOUN_W; // 76%
const TENSE_W = REMAINING_W / 3; // ~25.33%

// mm → pt helper
const mm = (v: number) => v * 2.8346;

// ─── Styles ─────────────────────────────────────────────────

const s = StyleSheet.create({
  // Title page
  titlePage: {
    padding: mm(15),
    position: "relative",
  },
  titlePageContent: {
    flex: 1,
    justifyContent: "center",
  },
  bigLogoWrap: {
    position: "absolute",
    top: mm(20),
    right: mm(15),
  },
  bigLogo: {
    width: mm(40),
  },
  subtitle: {
    fontFamily: "Encode Sans",
    fontSize: 11,
    fontWeight: 400,
    textTransform: "uppercase",
    color: "#000000",
    marginBottom: mm(4),
  },
  mainTitle: {
    fontFamily: "Merriweather",
    fontSize: 28,
    fontWeight: 400,
    color: "#222222",
  },
  tenseInfo: {
    fontFamily: "Encode Sans",
    fontSize: 11,
    fontWeight: 400,
    color: "#000000",
    marginTop: mm(3),
  },
  // Content pages
  contentPage: {
    paddingTop: mm(30),
    paddingBottom: mm(12),
    paddingLeft: mm(15),
    paddingRight: mm(15),
    fontFamily: "Encode Sans",
    fontSize: 9,
  },
  headerLeft: {
    position: "absolute",
    top: mm(20),
    left: mm(15),
  },
  headerLeftText: {
    fontFamily: "Encode Sans",
    fontSize: 7,
    color: "#666666",
    lineHeight: 1.4,
  },
  headerIcon: {
    position: "absolute",
    top: mm(20),
    right: mm(15),
  },
  headerIconImg: {
    width: mm(6),
    height: "auto",
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: mm(7.5),
    left: mm(15),
    right: mm(15),
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingTop: mm(2),
  },
  footerText: {
    fontFamily: "Encode Sans",
    fontSize: 7,
    color: "#666666",
    lineHeight: 1.4,
  },
  footerCenter: {
    fontFamily: "Encode Sans",
    fontSize: 7,
    color: "#666666",
    textAlign: "center",
  },
  footerRight: {
    fontFamily: "Encode Sans",
    fontSize: 7,
    color: "#666666",
    textAlign: "right",
    lineHeight: 1.4,
  },
  // Document title on content pages
  contentTitle: {
    fontFamily: "Merriweather",
    fontWeight: 400,
    fontSize: 14,
    color: "#000000",
    marginBottom: mm(4),
  },
  // Verb table
  verbTableWrap: {
    marginBottom: mm(4),
  },
  verbTitle: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: mm(2),
    color: "#000000",
  },
  tableContainer: {
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: "#ffffff",  // white shows through as cell gaps
  },
  // Row
  row: {
    flexDirection: "row",
    marginTop: CELL_GAP,
  },
  rowFirst: {
    marginTop: 0,
  },
  // Section header (SINGULAR / PLURAL)
  sectionHeader: {
    flexDirection: "row",
    marginTop: CELL_GAP,
  },
  sectionHeaderCol: {
    backgroundColor: CELL_BG,
    padding: "3 6",
    justifyContent: "center",
  },
  sectionHeaderText: {
    fontSize: 7,
    fontWeight: 700,
    textTransform: "uppercase",
  },
  // Generic cell
  cell: {
    padding: "3 6",
    justifyContent: "center",
    backgroundColor: CELL_BG,
    marginLeft: CELL_GAP,
  },
  cellFirst: {
    marginLeft: 0,
  },
  cellText: {
    fontSize: 9,
  },
  cellTextSmall: {
    fontSize: 7,
  },
  cellTextMuted: {
    fontSize: 7,
    color: "#666666",
  },
  cellTextBold: {
    fontSize: 9,
    fontWeight: 600,
  },
});

// ─── Conjugation table helpers ──────────────────────────────

function getColsForTense(
  tense: VerbTense,
  hasSep: boolean,
  isRefl: boolean
): number {
  if (tense === "perfekt") return isRefl ? 3 : 2;
  if (hasSep && isRefl) return 3;
  if (hasSep || isRefl) return 2;
  return 1;
}

/**  Widths for each sub-column in a tense (fractions of tense width). */
function subColFractions(
  tense: VerbTense,
  cols: number
): number[] {
  if (cols === 3) {
    return tense === "perfekt" ? [0.25, 0.25, 0.5] : [0.5, 0.25, 0.25];
  }
  if (cols === 2) return [0.5, 0.5];
  return [1];
}

// ─── Highlighted Text (irregularity markers) ────────────────

const HIGHLIGHT_BG = "#5a4540"; // dark brown marker
const HIGHLIGHT_COLOR = "#ffffff"; // white text

/**
 * Renders text with optional yellow background highlights on specific character ranges.
 * If no highlights or showHighlights is off, renders plain text.
 */
function HighlightedText({
  value,
  ranges,
  show,
  style,
}: {
  value: string;
  ranges?: [number, number][];
  show: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  style: any;
}) {
  if (!show || !ranges || ranges.length === 0 || !value) {
    return <Text style={style}>{value}</Text>;
  }

  // Sort ranges by start index and merge/clip
  const sorted = [...ranges]
    .filter(([s, e]) => s < e && s < value.length)
    .sort((a, b) => a[0] - b[0]);

  if (sorted.length === 0) {
    return <Text style={style}>{value}</Text>;
  }

  // Build segments: alternating normal / highlighted
  const segments: { text: string; highlighted: boolean }[] = [];
  let cursor = 0;
  for (const [start, end] of sorted) {
    const s = Math.max(start, cursor);
    const e = Math.min(end, value.length);
    if (s > cursor) {
      segments.push({ text: value.slice(cursor, s), highlighted: false });
    }
    if (e > s) {
      segments.push({ text: value.slice(s, e), highlighted: true });
    }
    cursor = e;
  }
  if (cursor < value.length) {
    segments.push({ text: value.slice(cursor), highlighted: false });
  }

  return (
    <Text style={style}>
      {segments.map((seg, i) => {
        const prev = segments[i - 1];
        const next = segments[i + 1];
        if (seg.highlighted) {
          // Space before if preceded by normal text, after if followed by normal text
          // Plus non-breaking spaces inside for visual padding
          const spaceBefore = prev && !prev.highlighted ? "\u00A0" : "";
          const spaceAfter = next && !next.highlighted ? "\u00A0" : "";
          return (
            <React.Fragment key={i}>
              {spaceBefore ? <Text>{spaceBefore}</Text> : null}
              <Text style={{ backgroundColor: HIGHLIGHT_BG, color: HIGHLIGHT_COLOR }}>{`\u00A0${seg.text}\u00A0`}</Text>
              {spaceAfter ? <Text>{spaceAfter}</Text> : null}
            </React.Fragment>
          );
        }
        return <Text key={i}>{seg.text}</Text>;
      })}
    </Text>
  );
}

// ─── Components ─────────────────────────────────────────────

interface VerbTableProps {
  tableData: VerbConjugationTable;
  showHighlights: boolean;
}

const TENSES: VerbTense[] = ["praesens", "perfekt", "praeteritum"];

function VerbTable({ tableData, showHighlights }: VerbTableProps) {
  const hasSep =
    tableData.isSeparable && !!tableData.separablePrefix;
  const isRefl = tableData.isReflexive || false;

  const singularRows = CONJUGATION_ROWS.filter(
    (r) => r.section === "singular"
  );
  const pluralRows = CONJUGATION_ROWS.filter(
    (r) => r.section === "plural"
  );

  return (
    <View style={s.verbTableWrap} wrap={false}>
      <Text style={s.verbTitle}>{tableData.input.verb}</Text>
      <View style={s.tableContainer}>
        {/* Header row */}
        <HeaderRow hasSep={hasSep} isRefl={isRefl} />
        {/* SINGULAR */}
        <View style={s.sectionHeader}>
          <View style={[s.sectionHeaderCol, s.cellFirst, { width: `${BASE_PERSON_W}%` }]}>
            <Text style={s.sectionHeaderText}>Singular</Text>
          </View>
          <View style={[s.sectionHeaderCol, { width: `${BASE_FORMAL_W}%`, marginLeft: CELL_GAP }]} />
          <View style={[s.sectionHeaderCol, { width: `${BASE_PRONOUN_W}%`, marginLeft: CELL_GAP }]} />
          {TENSES.map((t) => (
            <View key={t} style={{ width: `${TENSE_W}%`, marginLeft: TENSE_GAP }} />
          ))}
        </View>
        {singularRows.map((rd) => (
          <DataRow
            key={rd.personKey}
            rowDef={rd}
            conjugations={tableData.conjugations?.[rd.personKey]}
            hasSep={hasSep}
            isRefl={isRefl}
            showHighlights={showHighlights}
          />
        ))}
        {/* PLURAL */}
        <View style={s.sectionHeader}>
          <View style={[s.sectionHeaderCol, s.cellFirst, { width: `${BASE_PERSON_W}%` }]}>
            <Text style={s.sectionHeaderText}>Plural</Text>
          </View>
          <View style={[s.sectionHeaderCol, { width: `${BASE_FORMAL_W}%`, marginLeft: CELL_GAP }]} />
          <View style={[s.sectionHeaderCol, { width: `${BASE_PRONOUN_W}%`, marginLeft: CELL_GAP }]} />
          {TENSES.map((t) => (
            <View key={t} style={{ width: `${TENSE_W}%`, marginLeft: TENSE_GAP }} />
          ))}
        </View>
        {pluralRows.map((rd) => (
          <DataRow
            key={rd.personKey}
            rowDef={rd}
            conjugations={tableData.conjugations?.[rd.personKey]}
            hasSep={hasSep}
            isRefl={isRefl}
            showHighlights={showHighlights}
          />
        ))}
      </View>
    </View>
  );
}

function HeaderRow({
  hasSep,
  isRefl,
}: {
  hasSep: boolean;
  isRefl: boolean;
}) {
  return (
    <View style={[s.row, s.rowFirst]}>
      {/* Person + Formality + Pronoun: 3 separate cells matching data rows */}
      <View style={[s.cell, s.cellFirst, { width: `${BASE_PERSON_W}%` }]}>
        <Text style={s.cellText}></Text>
      </View>
      <View style={[s.cell, { width: `${BASE_FORMAL_W}%` }]}>
        <Text style={s.cellText}></Text>
      </View>
      <View style={[s.cell, { width: `${BASE_PRONOUN_W}%` }]}>
        <Text style={s.cellText}></Text>
      </View>
      {TENSES.map((tense, tIdx) => (
        <View
          key={tense}
          style={[
            s.cell,
            {
              width: `${TENSE_W}%`,
              backgroundColor: TENSE_COLORS[tense],
              marginLeft: TENSE_GAP,
            },
          ]}
        >
          <Text style={[s.cellText, { fontWeight: 700 }]}>
            {TENSE_LABELS[tense].de}
          </Text>
        </View>
      ))}
    </View>
  );
}

function DataRow({
  rowDef,
  conjugations,
  hasSep,
  isRefl,
  showHighlights,
}: {
  rowDef: (typeof CONJUGATION_ROWS)[0];
  conjugations?: {
    praesens: import("@/types/grammar-table").TenseConjugation;
    perfekt: import("@/types/grammar-table").TenseConjugation;
    praeteritum: import("@/types/grammar-table").TenseConjugation;
  };
  hasSep: boolean;
  isRefl: boolean;
  showHighlights: boolean;
}) {
  const personDisplay = `${rowDef.person}. Person`;

  return (
    <View style={s.row}>
      {/* Person */}
      <View style={[s.cell, s.cellFirst, { width: `${BASE_PERSON_W}%` }]}>
        <Text style={s.cellTextSmall}>{personDisplay}</Text>
      </View>
      {/* Formality */}
      <View style={[s.cell, { width: `${BASE_FORMAL_W}%` }]}>
        <Text style={s.cellTextMuted}>{rowDef.formality || ""}</Text>
      </View>
      {/* Pronoun */}
      <View style={[s.cell, { width: `${BASE_PRONOUN_W}%` }]}>
        <Text style={[s.cellText, { fontWeight: 600 }]}>
          {rowDef.pronoun}
        </Text>
      </View>
      {/* Tense cells */}
      {TENSES.map((tense) => (
        <TenseCells
          key={tense}
          tense={tense}
          data={conjugations?.[tense]}
          hasSep={hasSep}
          isRefl={isRefl}
          showHighlights={showHighlights}
        />
      ))}
    </View>
  );
}

function TenseCells({
  tense,
  data,
  hasSep,
  isRefl,
  showHighlights,
}: {
  tense: VerbTense;
  data?: import("@/types/grammar-table").TenseConjugation;
  hasSep: boolean;
  isRefl: boolean;
  showHighlights: boolean;
}) {
  const cols = getColsForTense(tense, hasSep, isRefl);
  const fractions = subColFractions(tense, cols);
  const bg = TENSE_COLORS[tense];
  const hl = data?.highlights;

  // Build cell values and corresponding highlight ranges for this tense
  const values: string[] = [];
  const bold: boolean[] = [];
  const hlRanges: ([number, number][] | undefined)[] = [];
  if (tense === "perfekt") {
    values.push(data?.auxiliary || "");  bold.push(false); hlRanges.push(hl?.auxiliary);
    if (isRefl) { values.push(data?.reflexive || ""); bold.push(false); hlRanges.push(hl?.reflexive); }
    values.push(data?.partizip || "");  bold.push(true);  hlRanges.push(hl?.partizip);
  } else {
    values.push(data?.main || "");      bold.push(true);  hlRanges.push(hl?.main);
    if (hasSep && isRefl) {
      values.push(data?.reflexive || ""); bold.push(false); hlRanges.push(hl?.reflexive);
      values.push(data?.prefix || "");    bold.push(true);  hlRanges.push(hl?.prefix);
    } else if (hasSep) {
      values.push(data?.prefix || "");    bold.push(true);  hlRanges.push(hl?.prefix);
    } else if (isRefl) {
      values.push(data?.reflexive || ""); bold.push(false); hlRanges.push(hl?.reflexive);
    }
  }

  return (
    <>
      {fractions.map((frac, i) => (
        <View
          key={i}
          style={[
            s.cell,
            {
              width: `${TENSE_W * frac}%`,
              backgroundColor: bg,
              marginLeft: i === 0 ? TENSE_GAP : 0,
            },
          ]}
        >
          <HighlightedText
            value={values[i] ?? ""}
            ranges={hlRanges[i]}
            show={showHighlights}
            style={[s.cellText, bold[i] ? { fontWeight: 600 } : {}]}
          />
        </View>
      ))}
    </>
  );
}

// ─── Simplified table helpers ───────────────────────────────

/** Chunk array into groups of n */
function chunkArray<T>(arr: T[], n: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += n) {
    result.push(arr.slice(i, i + n));
  }
  return result;
}

// Simplified mode reuses BASE_* widths for left columns; REMAINING_W for verb area
// A4 landscape content width in pt (297mm - 30mm margins = 267mm ≈ 757pt)
const SIMP_PAGE_W_PT = mm(267);
// Subtract the TENSE_GAP margins (one per verb) from remaining width
function simpVerbW(verbCount: number): number {
  const gapsPt = verbCount * TENSE_GAP; // each verb gets a TENSE_GAP marginLeft
  const gapsPct = (gapsPt / SIMP_PAGE_W_PT) * 100;
  return (REMAINING_W - gapsPct) / verbCount;
}

interface SimplifiedVerbTableProps {
  tables: VerbConjugationTable[];
  tense: VerbTense;
  showHighlights: boolean;
}

/** Simplified table: shows up to 3 verbs side-by-side for a single tense */
function SimplifiedVerbTable({ tables, tense, showHighlights }: SimplifiedVerbTableProps) {
  const singularRows = CONJUGATION_ROWS.filter((r) => r.section === "singular");
  const pluralRows = CONJUGATION_ROWS.filter((r) => r.section === "plural");
  const bg = TENSE_COLORS[tense];
  const verbCount = tables.length;
  // Always use 3-verb width so partial chunks don't stretch
  const verbW = simpVerbW(3);

  return (
    <View style={s.verbTableWrap} wrap={false}>
      <View style={s.tableContainer}>
        {/* Header row: empty left (3 cells matching data rows) + infinitive per verb */}
        <View style={[s.row, s.rowFirst]}>
          <View style={[s.cell, s.cellFirst, { width: `${BASE_PERSON_W}%` }]}>
            <Text style={s.cellText}></Text>
          </View>
          <View style={[s.cell, { width: `${BASE_FORMAL_W}%` }]}>
            <Text style={s.cellText}></Text>
          </View>
          <View style={[s.cell, { width: `${BASE_PRONOUN_W}%` }]}>
            <Text style={s.cellText}></Text>
          </View>
          {tables.map((tbl, i) => (
            <View
              key={i}
              style={[
                s.cell,
                {
                  width: `${verbW}%`,
                  backgroundColor: bg,
                  marginLeft: i === 0 ? TENSE_GAP : TENSE_GAP,
                },
              ]}
            >
              <Text style={[s.cellText, { fontWeight: 700 }]}>{tbl.input.verb}</Text>
            </View>
          ))}
        </View>

        {/* SINGULAR header */}
        <View style={s.sectionHeader}>
          <View style={[s.sectionHeaderCol, s.cellFirst, { width: `${BASE_PERSON_W}%` }]}>
            <Text style={s.sectionHeaderText}>Singular</Text>
          </View>
          <View style={[s.sectionHeaderCol, { width: `${BASE_FORMAL_W}%`, marginLeft: CELL_GAP }]} />
          <View style={[s.sectionHeaderCol, { width: `${BASE_PRONOUN_W}%`, marginLeft: CELL_GAP }]} />
          {tables.map((_, i) => (
            <View key={i} style={{ width: `${verbW}%`, marginLeft: TENSE_GAP }} />
          ))}
        </View>
        {singularRows.map((rd) => (
          <SimplifiedDataRow
            key={rd.personKey}
            rowDef={rd}
            tables={tables}
            tense={tense}
            verbW={verbW}
            showHighlights={showHighlights}
          />
        ))}

        {/* PLURAL header */}
        <View style={s.sectionHeader}>
          <View style={[s.sectionHeaderCol, s.cellFirst, { width: `${BASE_PERSON_W}%` }]}>
            <Text style={s.sectionHeaderText}>Plural</Text>
          </View>
          <View style={[s.sectionHeaderCol, { width: `${BASE_FORMAL_W}%`, marginLeft: CELL_GAP }]} />
          <View style={[s.sectionHeaderCol, { width: `${BASE_PRONOUN_W}%`, marginLeft: CELL_GAP }]} />
          {tables.map((_, i) => (
            <View key={i} style={{ width: `${verbW}%`, marginLeft: TENSE_GAP }} />
          ))}
        </View>
        {pluralRows.map((rd) => (
          <SimplifiedDataRow
            key={rd.personKey}
            rowDef={rd}
            tables={tables}
            tense={tense}
            verbW={verbW}
            showHighlights={showHighlights}
          />
        ))}
      </View>
    </View>
  );
}

function SimplifiedDataRow({
  rowDef,
  tables,
  tense,
  verbW,
  showHighlights,
}: {
  rowDef: (typeof CONJUGATION_ROWS)[0];
  tables: VerbConjugationTable[];
  tense: VerbTense;
  verbW: number;
  showHighlights: boolean;
}) {
  const personDisplay = `${rowDef.person}. Person`;

  return (
    <View style={s.row}>
      {/* Person */}
      <View style={[s.cell, s.cellFirst, { width: `${BASE_PERSON_W}%` }]}>
        <Text style={s.cellTextSmall}>{personDisplay}</Text>
      </View>
      {/* Formality */}
      <View style={[s.cell, { width: `${BASE_FORMAL_W}%` }]}>
        <Text style={s.cellTextMuted}>{rowDef.formality || ""}</Text>
      </View>
      {/* Pronoun */}
      <View style={[s.cell, { width: `${BASE_PRONOUN_W}%` }]}>
        <Text style={[s.cellText, { fontWeight: 600 }]}>{rowDef.pronoun}</Text>
      </View>
      {/* One tense cell group per verb — reuses TenseCells with verbW */}
      {tables.map((tbl, i) => {
        const hasSep = tbl.isSeparable && !!tbl.separablePrefix;
        const isRefl = tbl.isReflexive || false;
        const conj = tbl.conjugations?.[rowDef.personKey]?.[tense];
        return (
          <SimplifiedTenseCells
            key={i}
            tense={tense}
            data={conj}
            hasSep={hasSep}
            isRefl={isRefl}
            verbW={verbW}
            showHighlights={showHighlights}
          />
        );
      })}
    </View>
  );
}

function SimplifiedTenseCells({
  tense,
  data,
  hasSep,
  isRefl,
  verbW,
  showHighlights,
}: {
  tense: VerbTense;
  data?: import("@/types/grammar-table").TenseConjugation;
  hasSep: boolean;
  isRefl: boolean;
  verbW: number;
  showHighlights: boolean;
}) {
  const bg = TENSE_COLORS[tense];
  const cols = getColsForTense(tense, hasSep, isRefl);
  const fractions = subColFractions(tense, cols);
  const hl = data?.highlights;

  // Build cell values and highlight ranges — same logic as TenseCells
  const values: string[] = [];
  const bold: boolean[] = [];
  const hlRanges: ([number, number][] | undefined)[] = [];
  if (tense === "perfekt") {
    values.push(data?.auxiliary || "");  bold.push(false); hlRanges.push(hl?.auxiliary);
    if (isRefl) { values.push(data?.reflexive || ""); bold.push(false); hlRanges.push(hl?.reflexive); }
    values.push(data?.partizip || "");  bold.push(true);  hlRanges.push(hl?.partizip);
  } else {
    values.push(data?.main || "");      bold.push(true);  hlRanges.push(hl?.main);
    if (hasSep && isRefl) {
      values.push(data?.reflexive || ""); bold.push(false); hlRanges.push(hl?.reflexive);
      values.push(data?.prefix || "");    bold.push(true);  hlRanges.push(hl?.prefix);
    } else if (hasSep) {
      values.push(data?.prefix || "");    bold.push(true);  hlRanges.push(hl?.prefix);
    } else if (isRefl) {
      values.push(data?.reflexive || ""); bold.push(false); hlRanges.push(hl?.reflexive);
    }
  }

  return (
    <>
      {fractions.map((frac, j) => (
        <View
          key={j}
          style={[
            s.cell,
            {
              width: `${verbW * frac}%`,
              backgroundColor: bg,
              marginLeft: j === 0 ? TENSE_GAP : 0,
            },
          ]}
        >
          <HighlightedText
            value={values[j] ?? ""}
            ranges={hlRanges[j]}
            show={showHighlights}
            style={[s.cellText, bold[j] ? { fontWeight: 600 } : {}]}
          />
        </View>
      ))}
    </>
  );
}

// ─── Document ───────────────────────────────────────────────

interface GrammarTablePDFProps {
  title: string;
  tables: VerbConjugationTable[];
  brand: Brand;
  worksheetId: string;
  bigLogoDataUri: string;
  iconDataUri: string;
  simplified: boolean;
  simplifiedTenses: Record<VerbTense, boolean>;
  showIrregularHighlights: boolean;
}

function GrammarTablePDF({
  title,
  tables,
  brand,
  worksheetId,
  bigLogoDataUri,
  iconDataUri,
  simplified,
  simplifiedTenses,
  showIrregularHighlights,
}: GrammarTablePDFProps) {
  const now = new Date();
  const year = now.getFullYear();
  const dateStr = now.toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const brandFonts = BRAND_FONTS[brand];
  const bodyFont = brand === "lingostar" ? "Encode Sans" : "Asap Condensed";

  // Determine which tenses are active for simplified mode
  const activeTenses: VerbTense[] = simplified
    ? TENSES.filter((t) => simplifiedTenses[t])
    : [];
  // Chunk tables into groups of 3 for simplified mode
  const verbChunks = simplified ? chunkArray(tables, 3) : [];
  // Build tense label for header
  const tenseLabel = simplified
    ? activeTenses.map((t) => TENSE_LABELS[t].de).join(" · ")
    : "Präsens · Perfekt · Präteritum";

  return (
    <Document title={title} author="lingostar">
      {/* ── Title page ── */}
      <Page size="A4" orientation="landscape" style={s.titlePage}>
        {bigLogoDataUri ? (
          <View style={s.bigLogoWrap}>
            <Image src={bigLogoDataUri} style={s.bigLogo} />
          </View>
        ) : null}
        <View style={s.titlePageContent}>
          <View>
            <Text style={s.subtitle}>Verbkonjugation</Text>
            <Text style={s.mainTitle}>{title}</Text>
            <Text style={s.tenseInfo}>Indikativ | {tenseLabel}</Text>
          </View>
        </View>
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            {`© ${year} lingostar | Marcel Allenspach\nAlle Rechte vorbehalten`}
          </Text>
          <Text style={s.footerCenter}></Text>
          <Text style={s.footerRight}>
            {`${worksheetId}\n${dateStr}`}
          </Text>
        </View>
      </Page>

      {/* ── Content pages ── */}
      <Page
        size="A4"
        orientation="landscape"
        style={[s.contentPage, { fontFamily: bodyFont }]}
      >
        {/* Repeating header – left text */}
        <View style={s.headerLeft} fixed>
          <Text style={s.headerLeftText}>
            {simplified
              ? `Verbkonjugation – Indikativ | ${tenseLabel}`
              : `Verbkonjugation\n${title} – Indikativ | ${tenseLabel}`}
          </Text>
        </View>

        {/* Repeating header icon */}
        {iconDataUri ? (
          <View style={s.headerIcon} fixed>
            <Image src={iconDataUri} style={s.headerIconImg} />
          </View>
        ) : null}

        {/* Document title */}
        <Text style={s.contentTitle}>{title}</Text>

        {/* Verb tables */}
        {simplified
          ? activeTenses.map((tense) =>
              verbChunks.map((chunk, ci) => (
                <SimplifiedVerbTable key={`${tense}-${ci}`} tables={chunk} tense={tense} showHighlights={showIrregularHighlights} />
              ))
            )
          : tables.map((tbl, i) => (
              <VerbTable key={i} tableData={tbl} showHighlights={showIrregularHighlights} />
            ))}

        {/* Repeating footer with page numbers */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            {`© ${year} lingostar | Marcel Allenspach\nAlle Rechte vorbehalten`}
          </Text>
          <Text
            style={s.footerCenter}
            render={({ pageNumber, totalPages }) =>
              `${pageNumber} / ${totalPages}`
            }
          />
          <Text style={s.footerRight}>
            {`${worksheetId}\n${dateStr}`}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

// ─── API Route ──────────────────────────────────────────────

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
    input?: unknown;
    tableData?: AdjectiveDeclinationTable | VerbConjugationTable[];
  } | null;

  const tableType = blocksData?.tableType || "adjective-declination";
  const tableData = blocksData?.tableData ?? null;
  const settings = (worksheet.settings ?? {}) as unknown as GrammarTableSettings;

  if (tableType !== "verb-conjugation") {
    return NextResponse.json(
      { error: "react-pdf v2 route only supports verb-conjugation. Use original route for adjective-declination." },
      { status: 400 }
    );
  }

  const conjTablesUnsorted = tableData as VerbConjugationTable[];
  if (!Array.isArray(conjTablesUnsorted) || conjTablesUnsorted.length === 0) {
    return NextResponse.json(
      { error: "No conjugation data to export" },
      { status: 400 }
    );
  }

  // Sort verbs alphabetically by infinitive
  const conjTables = [...conjTablesUnsorted].sort((a, b) =>
    a.input.verb.localeCompare(b.input.verb, "de")
  );

  const brand = settings.brand || "edoomio";
  const brandSettings: BrandSettings = {
    ...DEFAULT_BRAND_SETTINGS[brand],
    ...settings.brandSettings,
  };

// Read logos (convert SVG → PNG for react-pdf compatibility)
    const bigLogoDataUri = await readLogoAsPngDataUri("logo/lingostar_logo_and_brand_flat.svg", 800);
    const iconDataUri = brandSettings.logo
      ? await readLogoAsPngDataUri(brandSettings.logo.replace(/^\//, ""), 200)
    : "";

  try {
    console.log(
      `[Grammar Table PDF v2] Generating react-pdf for "${worksheet.title}" (${conjTables.length} verbs)`
    );

    const buffer = await renderToBuffer(
      <GrammarTablePDF
        title={worksheet.title}
        tables={conjTables}
        brand={brand}
        worksheetId={worksheet.id}
        bigLogoDataUri={bigLogoDataUri}
        iconDataUri={iconDataUri}
        simplified={settings.simplified ?? false}
        simplifiedTenses={settings.simplifiedTenses ?? { praesens: true, perfekt: false, praeteritum: false }}
        showIrregularHighlights={settings.showIrregularHighlights ?? false}
      />
    );

    const safeTitle = worksheet.title
      .replace(/[\u2013\u2014]/g, "-")
      .replace(/[^\x20-\x7E]/g, "_");

    return new NextResponse(Buffer.from(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeTitle}.pdf"`,
      },
    });
  } catch (error) {
    console.error("[Grammar Table PDF v2] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `PDF generation failed: ${message}` },
      { status: 500 }
    );
  }
}
