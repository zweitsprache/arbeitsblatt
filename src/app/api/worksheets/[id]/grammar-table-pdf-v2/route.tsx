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
import satori from "satori";
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
  CaseSection,
  GrammatikalFall,
  Genus,
  CASE_LABELS,
  GENUS_LABELS,
  VerbPrepositionTableEntry,
  VERB_PREP_ARTICLE_LABELS,
  THIRD_PERSON_KEYS,
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
    { src: fontDataUri("EncodeSans-Medium.ttf"), fontWeight: 500 },
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
export async function readLogoAsPngDataUri(
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

/** Download a remote image, resize & compress it, return as JPEG data-URI. */
export async function compressImageUrl(
  url: string,
  maxWidth = 400,
  quality = 80,
): Promise<string> {
  try {
    const res = await fetch(url);
    if (!res.ok) return url; // fallback to original
    const buf = Buffer.from(await res.arrayBuffer());
    const compressed = await sharp(buf)
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .resize({ width: maxWidth, withoutEnlargement: true })
      .jpeg({ quality })
      .toBuffer();
    return `data:image/jpeg;base64,${compressed.toString("base64")}`;
  } catch (e) {
    console.warn(`[Grammar Table PDF v2] Could not compress image: ${url}`, e);
    return url; // fallback to original
  }
}

// ─── Constants ──────────────────────────────────────────────

const SOURCE_TEXT = "Quellenverzeichnis | Text: selbst erstellt – Fonts: fonts.google.com – Bilder: KI-generiert mit Google Nano Banana Pro";

const TENSE_COLORS: Record<VerbTense, string> = {
  praesens: "#F2E2D4",    // Peach
  perfekt: "#D8E6F2",     // Sky
  praeteritum: "#DAF0DC", // Mint
};

const CELL_GAP = 1.5;       // white gap between cells (pt)
const TENSE_GAP = CELL_GAP * 3; // wider gap between tense column groups
const CELL_BG = "#E4E4EC"; // Cloud – for non-tense cells
const ROW_H = 14;           // uniform row height for all table rows (pt)

// Alternating verb column colours for simplified layout
const SIMPLIFIED_VERB_COLORS = ["#F2EDDA", "#F2E2D4", "#F2EDDA"]; // Buttercup, Peach, Buttercup
const SIMPLIFIED_VERB_COLORS_LIGHT = ["#F7F4EC", "#F8F0E8", "#F7F4EC"]; // lighter variants for subtitle row

// Adjective-declination gender colours (pastel palette)
const GENDER_COLORS: Record<Genus, string> = {
  maskulin: "#F2E2D4",  // Peach
  neutrum: "#D8E6F2",   // Sky
  feminin: "#F2EDDA",   // Buttercup
  plural: "#DAF0DC",    // Mint
};

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
    marginBottom: mm(3),
  },
  // Source attribution text – rotated 90° CCW on right edge of last page
  // Positioned so that after center-based rotation the text sits vertically
  // along the right margin of A4 landscape (297×210mm).
  sourceText: {
    position: "absolute" as const,
    left: mm(199),    // centers element at x≈289mm (8mm from right edge)
    top: mm(93),      // centers element at y≈95mm
    fontFamily: "Encode Sans",
    fontSize: 5.5,
    color: "#000000",
    transform: "rotate(-90deg)",
    width: mm(180),   // becomes visual height after rotation
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
    paddingHorizontal: 6,
    justifyContent: "center",
    height: ROW_H,
  },
  sectionHeaderText: {
    fontSize: 7,
    fontWeight: 700,
    textTransform: "uppercase",
  },
  // Generic cell
  cell: {
    paddingHorizontal: 6,
    justifyContent: "center",
    backgroundColor: CELL_BG,
    marginLeft: CELL_GAP,
    height: ROW_H,
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
    fontWeight: 500,
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
          // Trim whitespace captured from highlight ranges
          const trimmed = seg.text.trim();
          // Did the original text end with a space? (= badge is at end of a word)
          const atWordEnd = seg.text !== seg.text.trimEnd();
          // Badge content: inner padding via \u00A0 on both sides
          const badgeText = `\u00A0${trimmed}\u00A0`;
          // Small space before badge if preceded by a letter (not a space)
          const prevEndsWithLetter = prev && !prev.highlighted && !prev.text.endsWith(" ");
          const before = prevEndsWithLetter ? "\u00A0" : "";
          // After badge: double space at word boundary, single space if followed by letter
          const nextStartsWithLetter = next && !next.highlighted && !next.text.startsWith(" ");
          const after = atWordEnd ? "\u00A0\u00A0" : (nextStartsWithLetter ? "\u00A0" : "");
          return (
            <React.Fragment key={i}>
              {before ? <Text>{before}</Text> : null}
              <Text style={{ backgroundColor: HIGHLIGHT_BG, color: HIGHLIGHT_COLOR }}>{badgeText}</Text>
              {after ? <Text>{after}</Text> : null}
            </React.Fragment>
          );
        }
        // Normal text: preserve spaces adjacent to highlights as non-breaking
        let text = seg.text;
        if (prev?.highlighted) {
          // Remove leading space — spacing is handled by badge after-text
          text = text.replace(/^ /, "");
        }
        if (next?.highlighted && text.endsWith(" ")) {
          text = text.slice(0, -1) + "\u00A0";
        }
        return <Text key={i}>{text}</Text>;
      })}
    </Text>
  );
}

// ─── Components ─────────────────────────────────────────────

interface VerbTableProps {
  tableData: VerbConjugationTable;
  showHighlights: boolean;
}

export const TENSES: VerbTense[] = ["praesens", "perfekt", "praeteritum"];

function VerbTable({ tableData, showHighlights }: VerbTableProps) {
  const hasSep =
    tableData.isSeparable && !!tableData.separablePrefix;
  const isRefl = tableData.isReflexive || false;
  const isThirdOnly = tableData.thirdPersonOnly ?? false;

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
            conjugations={
              isThirdOnly && !THIRD_PERSON_KEYS.includes(rd.personKey)
                ? undefined
                : tableData.conjugations?.[rd.personKey]
            }
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
            conjugations={
              isThirdOnly && !THIRD_PERSON_KEYS.includes(rd.personKey)
                ? undefined
                : tableData.conjugations?.[rd.personKey]
            }
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
        <Text style={[s.cellText, { fontWeight: 500 }]}>
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
            style={[s.cellText, bold[i] ? { fontWeight: 500 } : {}]}
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

/** Create an empty VerbConjugationTable for "Leertabellen" padding */
function createEmptyVerbTable(): VerbConjugationTable {
  const emptyTense = { main: "" };
  const emptyPerson = { praesens: emptyTense, perfekt: emptyTense, praeteritum: emptyTense };
  return {
    input: { verb: "\u00A0" },
    isSeparable: false,
    isReflexive: false,
    conjugations: {
      ich: emptyPerson,
      du: emptyPerson,
      Sie_sg: emptyPerson,
      er_sie_es: emptyPerson,
      wir: emptyPerson,
      ihr: emptyPerson,
      Sie_pl: emptyPerson,
      sie_pl: emptyPerson,
    } as Record<PersonKey, import("@/types/grammar-table").PersonConjugations>,
  };
}

/**
 * Pad verb tables with empty entries so pages are fully filled.
 * - Full mode: pad to next multiple of 6
 * - Simplified mode: pad to next multiple of 12 (6 per page × 2 for double page)
 */
function padWithEmptyTables(tables: VerbConjugationTable[], simplified: boolean): VerbConjugationTable[] {
  const multiple = simplified ? 12 : 6;
  const remainder = tables.length % multiple;
  if (remainder === 0) return tables;
  const padding = multiple - remainder;
  return [...tables, ...Array.from({ length: padding }, () => createEmptyVerbTable())];
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
                  backgroundColor: SIMPLIFIED_VERB_COLORS[i] || SIMPLIFIED_VERB_COLORS[0],
                  marginLeft: TENSE_GAP,
                },
              ]}
            >
              <Text style={[s.cellText, { fontWeight: 700 }]}>{tbl.input.verb}</Text>
            </View>
          ))}
        </View>

        {/* Second row: Perfekt (Hilfsverb + Partizip II) | Präteritum 3.P.Sg */}
        <View style={s.row}>
          <View style={[s.cell, s.cellFirst, { width: `${BASE_PERSON_W}%` }]}>
            <Text style={s.cellText}></Text>
          </View>
          <View style={[s.cell, { width: `${BASE_FORMAL_W}%` }]}>
            <Text style={s.cellText}></Text>
          </View>
          <View style={[s.cell, { width: `${BASE_PRONOUN_W}%` }]}>
            <Text style={s.cellText}></Text>
          </View>
          {tables.map((tbl, i) => {
            const isRefl = tbl.isReflexive || false;
            const perfekt3 = tbl.conjugations?.er_sie_es?.perfekt;
            const praet3 = tbl.conjugations?.er_sie_es?.praeteritum;
            const perfektParts = [perfekt3?.auxiliary, isRefl ? "sich" : undefined, perfekt3?.partizip].filter(Boolean);
            const perfektStr = perfektParts.join(" ");
            const praetParts = [praet3?.main, isRefl ? "sich" : undefined, praet3?.prefix].filter(Boolean);
            const praetStr = praetParts.join(" ");
            const subtitle = [perfektStr, praetStr].filter(Boolean).join(" | ");
            return (
              <View
                key={i}
                style={[
                  s.cell,
                  {
                    width: `${verbW}%`,
                    backgroundColor: SIMPLIFIED_VERB_COLORS_LIGHT[i] || SIMPLIFIED_VERB_COLORS_LIGHT[0],
                    marginLeft: TENSE_GAP,
                  },
                ]}
              >
                <Text style={{ fontSize: 9, fontWeight: 400, color: "#444444" }}>{subtitle}</Text>
              </View>
            );
          })}
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
        <Text style={[s.cellText, { fontWeight: 500 }]}>{rowDef.pronoun}</Text>
      </View>
      {/* One tense cell group per verb — reuses TenseCells with verbW */}
      {tables.map((tbl, i) => {
        const hasSep = tbl.isSeparable && !!tbl.separablePrefix;
        const isRefl = tbl.isReflexive || false;
        const isThirdOnly = tbl.thirdPersonOnly ?? false;
        const conj = tbl.conjugations?.[rowDef.personKey]?.[tense];
        const blankRow = isThirdOnly && !THIRD_PERSON_KEYS.includes(rowDef.personKey);
        return (
          <SimplifiedTenseCells
            key={i}
            tense={tense}
            data={blankRow ? undefined : conj}
            hasSep={hasSep}
            isRefl={isRefl}
            verbW={verbW}
            verbIndex={i}
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
  verbIndex,
  showHighlights,
}: {
  tense: VerbTense;
  data?: import("@/types/grammar-table").TenseConjugation;
  hasSep: boolean;
  isRefl: boolean;
  verbW: number;
  verbIndex: number;
  showHighlights: boolean;
}) {
  const bg = SIMPLIFIED_VERB_COLORS[verbIndex] || SIMPLIFIED_VERB_COLORS[0];
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
            style={[s.cellText, bold[j] ? { fontWeight: 500 } : {}]}
          />
        </View>
      ))}
    </>
  );
}

// ─── Adjective ending highlight helper ───────────────────────

/**
 * Compare a base adjective (e.g. "frisch") with its declined form (e.g. "frische")
 * and return a highlight range covering the ending that differs.
 * Returns undefined if no difference or inputs are empty.
 */
function getAdjectiveEndingRange(
  baseAdj: string,
  declinedAdj: string,
): [number, number][] | undefined {
  if (!baseAdj || !declinedAdj) return undefined;
  const base = baseAdj.toLowerCase();
  const declined = declinedAdj.toLowerCase();
  // Find how many leading characters match
  let matchLen = 0;
  for (let i = 0; i < base.length && i < declined.length; i++) {
    if (base[i] === declined[i]) matchLen++;
    else break;
  }
  // The ending is everything from matchLen onwards in the declined form
  if (matchLen >= declinedAdj.length) return undefined; // no ending to highlight
  return [[matchLen, declinedAdj.length]];
}

// ─── Adjective-Declination Components ───────────────────────

interface CaseTableProps {
  caseSection: CaseSection;
  settings: GrammarTableSettings;
  /** Base adjective inputs per gender – needed for ending highlights */
  input: import("@/types/grammar-table").DeclinationInput;
}

// A4 landscape content width in pt (297mm – 15mm left – 15mm right = 267mm)
const DECL_CONTENT_W = mm(267);

function CaseTable({ caseSection, settings, input }: CaseTableProps) {
  const genders: Genus[] = ["maskulin", "neutrum", "feminin", "plural"];

  // ── Compute fixed-pt column widths ──
  // 12 data cells (3 per gender), no extra column
  const totalItems = 12;
  const totalGaps = totalItems - 1;
  const available = DECL_CONTENT_W - totalGaps * CELL_GAP;
  const cellW = available / 12;
  const genderBlockW = 3 * cellW + 2 * CELL_GAP; // header row 1: spans 3 cells + 2 internal gaps

  // Flatten all data rows across groups
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

  return (
    <View style={{ marginBottom: mm(4) }} wrap={false}>
      {/* Case title */}
      <Text
        style={{
          fontSize: 11,
          fontWeight: 700,
          marginBottom: mm(2),
          color: "#000000",
        }}
      >
        {CASE_LABELS[caseSection.case].de}
      </Text>

      <View style={s.tableContainer}>
        {/* ── Header row 1: one cell per gender (true colspan via computed widths) ── */}
        <View style={[s.row, s.rowFirst]}>
          {genders.map((g, gi) => (
            <View
              key={g}
              style={[
                s.cell,
                gi === 0 ? s.cellFirst : {},
                {
                  width: genderBlockW,
                  backgroundColor: GENDER_COLORS[g],
                  ...(gi === 0 ? { borderTopLeftRadius: 3 } : {}),
                  ...(gi === genders.length - 1
                    ? { borderTopRightRadius: 3 }
                    : {}),
                },
              ]}
            >
              <Text style={[s.cellText, { fontWeight: 700 }]}>
                {GENUS_LABELS[g].de}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Header row 2: Artikel / Adjektiv / Nomen × 4 ── */}
        <View style={s.row}>
          {genders.map((g, gi) =>
            ["Artikel", "Adjektiv", "Nomen"].map((label, li) => (
              <View
                key={`${g}-${label}`}
                style={[
                  s.cell,
                  gi === 0 && li === 0 ? s.cellFirst : {},
                  {
                    width: cellW,
                    backgroundColor: GENDER_COLORS[g],
                  },
                ]}
              >
                <Text style={[s.cellTextSmall, { fontWeight: 600 }]}>
                  {label}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* ── Data rows ── */}
        {flatRows.map((fr, fi) => {
          const isGlobalLast = fi === flatRows.length - 1;

          return (
            <View key={fi} style={s.row}>
              {genders.map((g, gi) => {
                const shared = fr.group.shared?.[g] || {
                  adjective: "",
                  noun: "",
                };
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

                return (
                  <React.Fragment key={g}>
                    {/* Article cell */}
                    <View
                      style={[
                        s.cell,
                        gi === 0 ? s.cellFirst : {},
                        {
                          width: cellW,
                          backgroundColor: bg,
                          ...(isGlobalLast && gi === 0
                            ? { borderBottomLeftRadius: 3 }
                            : {}),
                        },
                      ]}
                    >
                      <Text style={s.cellText}>{article}</Text>
                    </View>
                    {/* Adjective cell */}
                    <View
                      style={[
                        s.cell,
                        {
                          width: cellW,
                          backgroundColor: bg,
                        },
                      ]}
                    >
                      <HighlightedText
                        value={adj}
                        ranges={getAdjectiveEndingRange(input?.[g]?.adjective ?? "", adj)}
                        show={settings.highlightEndings ?? false}
                        style={s.cellText}
                      />
                    </View>
                    {/* Noun cell */}
                    <View
                      style={[
                        s.cell,
                        {
                          width: cellW,
                          backgroundColor: bg,
                          ...(isGlobalLast &&
                          gi === genders.length - 1
                            ? { borderBottomRightRadius: 3 }
                            : {}),
                        },
                      ]}
                    >
                      <Text style={s.cellText}>{noun}</Text>
                    </View>
                  </React.Fragment>
                );
              })}

            </View>
          );
        })}
      </View>

      {/* Two dotted writing lines */}
      {[0, 1].map((i) => (
        <View
          key={`line-${i}`}
          style={{
            marginTop: mm(2),
            borderBottomWidth: 0.5,
            borderBottomColor: "#999999",
            borderBottomStyle: "dotted",
            width: "100%",
            height: mm(5),
          }}
        />
      ))}
    </View>
  );
}

// ─── Declination PDF Document ───────────────────────────────

interface DeclinationTablePDFProps {
  title: string;
  tableData: AdjectiveDeclinationTable;
  settings: GrammarTableSettings;
  brand: Brand;
  worksheetId: string;
  bigLogoDataUri: string;
  iconDataUri: string;
  includeTitlePage?: boolean;
}

function DeclinationTablePDF({
  title,
  tableData,
  settings,
  brand,
  worksheetId,
  bigLogoDataUri,
  iconDataUri,
  includeTitlePage = true,
}: DeclinationTablePDFProps) {
  const now = new Date();
  const year = now.getFullYear();
  const dateStr = now.toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const bodyFont =
    brand === "lingostar" ? "Encode Sans" : "Asap Condensed";

  return (
    <Document title={title} author="lingostar">
      {/* ── Title page ── */}
      {includeTitlePage ? (
      <Page size="A4" orientation="landscape" style={s.titlePage}>
        {bigLogoDataUri ? (
          <View style={s.bigLogoWrap}>
            <Image src={bigLogoDataUri} style={s.bigLogo} />
          </View>
        ) : null}
        <View style={s.titlePageContent}>
          <View>
            <Text style={s.subtitle}>Adjektivdeklination</Text>
            <Text style={s.mainTitle}>{title}</Text>
            <Text style={s.tenseInfo}>
              Nominativ · Akkusativ · Dativ · Genitiv
            </Text>
            {/* 4 cover image slots */}
            <View style={{ flexDirection: "row", gap: mm(4), marginTop: mm(12), justifyContent: "flex-start" }}>
              {[0, 1, 2, 3].map((i) => {
                const src = settings.coverImages?.[i];
                const hasBorder = settings.coverImageBorder ?? false;
                return src && src !== "" ? (
                  <View
                    key={i}
                    style={{
                      width: mm(30),
                      height: mm(30),
                      borderRadius: 3,
                      overflow: "hidden",
                      ...(hasBorder
                        ? { borderWidth: 1, borderColor: "#CCCCCC", borderStyle: "solid" as const }
                        : {}),
                    }}
                  >
                    <Image
                      src={src}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        borderRadius: 3,
                      }}
                    />
                  </View>
                ) : (
                  <View
                    key={i}
                    style={{
                      width: mm(30),
                      height: mm(30),
                      borderRadius: 3,
                      backgroundColor: "#F0F0F0",
                      borderWidth: 1,
                      borderColor: "#CCCCCC",
                      borderStyle: "dashed",
                    }}
                  />
                );
              })}
            </View>
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
      ) : null}

      {/* ── Content pages ── */}
      <Page
        size="A4"
        orientation="landscape"
        style={[s.contentPage, { fontFamily: bodyFont }]}
      >
        <View style={s.headerLeft} fixed>
          <Text style={s.headerLeftText}>
            {`Adjektivdeklination | Nominativ · Akkusativ · Dativ · Genitiv`}
          </Text>
        </View>

        {iconDataUri ? (
          <View style={s.headerIcon} fixed>
            <Image src={iconDataUri} style={s.headerIconImg} />
          </View>
        ) : null}

        {/* Document title – visible on first content page, invisible spacer on subsequent pages */}
        <Text style={s.contentTitle} fixed
          render={({ pageNumber }) => pageNumber === (includeTitlePage ? 2 : 1) ? (settings.contentTitle || title) : "\u00A0"}
        />

        {(tableData.cases ?? []).map((cs) => (
          <CaseTable key={cs.case} caseSection={cs} settings={settings} input={tableData.input} />
        ))}

        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            {`© ${year} lingostar | Marcel Allenspach\nAlle Rechte vorbehalten`}
          </Text>
          <Text
            style={s.footerCenter}
            render={({ pageNumber, totalPages }) => {
              const off = includeTitlePage ? 1 : 0;
              return `${pageNumber - off} / ${totalPages - off}`;
            }}
          />
          <Text style={s.footerRight}>
            {`${worksheetId}\n${dateStr}`}
          </Text>
        </View>

        {/* Source attribution – rotated 90° CCW on right edge, last page only */}
        <Text style={s.sourceText} fixed
          render={({ pageNumber, totalPages }) => pageNumber === totalPages ? SOURCE_TEXT : ""}
        />
      </Page>
    </Document>
  );
}

// ─── Document ───────────────────────────────────────────────

// ─── Verb + Preposition Components ──────────────────────────

interface VPTableProps {
  entry: VerbPrepositionTableEntry;
}

function VPTable({ entry }: VPTableProps) {
  const genders: Genus[] = ["maskulin", "neutrum", "feminin", "plural"];

  const caseLabel = CASE_LABELS[entry.case]?.de || entry.case;

  // Reuse the same cell width math as the declination table: 12 data cells (3 per gender)
  const totalItems = 12;
  const totalGaps = totalItems - 1;
  const available = DECL_CONTENT_W - totalGaps * CELL_GAP;
  const cellW = available / 12;
  const genderBlockW = 3 * cellW + 2 * CELL_GAP;

  return (
    <View style={s.verbTableWrap} wrap={false}>
      {/* Title with Kasus badge */}
      <View style={{ flexDirection: "row", alignItems: "flex-end", marginBottom: mm(1), gap: mm(2) }}>
        <Text style={s.verbTitle}>
          {entry.input.verb} + {entry.input.preposition}
        </Text>
        <View style={{ paddingHorizontal: 3, paddingVertical: 1, borderWidth: 0.5, borderColor: "#999999", borderRadius: 3 }}>
          <Text style={{ fontSize: 7 }}>{caseLabel}</Text>
        </View>
      </View>

      {/* 1st person singular example as cloud-bg cells */}
      {(() => {
        const sentenceIntro = entry.input?.sentenceIntro || entry.firstPersonExample || "";
        const words = sentenceIntro.split(/\s+/).filter(Boolean);
        const totalCols = 12;
        return (
          <View style={[s.row, s.rowFirst]}>
            {Array.from({ length: totalCols }).map((_, i) => (
              <View
                key={i}
                style={[
                  s.cell,
                  i === 0 ? s.cellFirst : {},
                  {
                    width: cellW,
                    ...(i < words.length
                      ? {
                          backgroundColor: CELL_BG,
                          ...(i === 0 ? { borderTopLeftRadius: 3, borderBottomLeftRadius: 3 } : {}),
                          ...(i === words.length - 1 ? { borderTopRightRadius: 3, borderBottomRightRadius: 3 } : {}),
                        }
                      : { backgroundColor: "transparent" }),
                  },
                ]}
              >
                <Text style={s.cellText}>{i < words.length ? words[i] : ""}</Text>
              </View>
            ))}
          </View>
        );
      })()}

      {/* Gap between example row and declension table */}
      <View style={{ height: mm(2) }} />

      {/* Declension table: 4 genders × 3 subcols (Artikel / Adjektiv / Nomen) */}
      <View style={s.tableContainer}>
        {/* Header row 1: one cell per gender spanning 3 subcols */}
        <View style={[s.row, s.rowFirst]}>
          {genders.map((g, gi) => (
            <View
              key={g}
              style={[
                s.cell,
                gi === 0 ? s.cellFirst : {},
                {
                  width: genderBlockW,
                  backgroundColor: GENDER_COLORS[g],
                  ...(gi === 0 ? { borderTopLeftRadius: 3 } : {}),
                  ...(gi === genders.length - 1 ? { borderTopRightRadius: 3 } : {}),
                },
              ]}
            >
              <Text style={[s.cellText, { fontWeight: 700 }]}>
                {GENUS_LABELS[g].de}
              </Text>
            </View>
          ))}
        </View>

        {/* Header row 2: Artikel / Adjektiv / Nomen × 4 */}
        <View style={s.row}>
          {genders.map((g, gi) =>
            ["Artikel", "Adjektiv", "Nomen"].map((label, li) => (
              <View
                key={`${g}-${label}`}
                style={[
                  s.cell,
                  gi === 0 && li === 0 ? s.cellFirst : {},
                  {
                    width: cellW,
                    backgroundColor: GENDER_COLORS[g],
                  },
                ]}
              >
                <Text style={[s.cellTextSmall, { fontWeight: 600 }]}>
                  {label}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Single data row */}
        <View style={s.row}>
          {genders.map((g, gi) => {
            const d = entry.declension?.[g];
            return (
              <React.Fragment key={g}>
                {/* Article cell */}
                <View
                  style={[
                    s.cell,
                    gi === 0 ? s.cellFirst : {},
                    {
                      width: cellW,
                      backgroundColor: GENDER_COLORS[g],
                      ...(gi === 0 ? { borderBottomLeftRadius: 3 } : {}),
                    },
                  ]}
                >
                  <Text style={s.cellText}>{d?.article || ""}</Text>
                </View>
                {/* Adjective cell */}
                <View
                  style={[
                    s.cell,
                    {
                      width: cellW,
                      backgroundColor: GENDER_COLORS[g],
                    },
                  ]}
                >
                  <Text style={s.cellText}>{d?.adjective || ""}</Text>
                </View>
                {/* Noun cell */}
                <View
                  style={[
                    s.cell,
                    {
                      width: cellW,
                      backgroundColor: GENDER_COLORS[g],
                      ...(gi === genders.length - 1 ? { borderBottomRightRadius: 3 } : {}),
                    },
                  ]}
                >
                  <Text style={s.cellText}>{d?.noun || ""}</Text>
                </View>
              </React.Fragment>
            );
          })}
        </View>
      </View>
    </View>
  );
}

// ─── Verb + Preposition PDF Document ────────────────────────

interface VerbPrepositionPDFProps {
  title: string;
  entries: VerbPrepositionTableEntry[];
  settings: GrammarTableSettings;
  brand: Brand;
  worksheetId: string;
  bigLogoDataUri: string;
  iconDataUri: string;
  includeTitlePage?: boolean;
}

function VerbPrepositionPDF({
  title,
  entries,
  settings,
  brand,
  worksheetId,
  bigLogoDataUri,
  iconDataUri,
  includeTitlePage = true,
}: VerbPrepositionPDFProps) {
  const now = new Date();
  const year = now.getFullYear();
  const dateStr = now.toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const bodyFont = brand === "lingostar" ? "Encode Sans" : "Asap Condensed";

  return (
    <Document title={title} author="lingostar">
      {/* ── Title page ── */}
      {includeTitlePage ? (
      <Page size="A4" orientation="landscape" style={s.titlePage}>
        {bigLogoDataUri ? (
          <View style={s.bigLogoWrap}>
            <Image src={bigLogoDataUri} style={s.bigLogo} />
          </View>
        ) : null}
        <View style={s.titlePageContent}>
          <View>
            <Text style={s.subtitle}>Verben mit Präpositionen</Text>
            <Text style={s.mainTitle}>{title}</Text>
            <Text style={s.tenseInfo}>Präsens · Adjektivdeklination</Text>
            {/* 4 cover image slots */}
            <View style={{ flexDirection: "row", gap: mm(4), marginTop: mm(12), justifyContent: "flex-start" }}>
              {[0, 1, 2, 3].map((i) => {
                const src = settings.coverImages?.[i];
                const hasBorder = settings.coverImageBorder ?? false;
                return src && src !== "" ? (
                  <View
                    key={i}
                    style={{
                      width: mm(30),
                      height: mm(30),
                      borderRadius: 3,
                      overflow: "hidden",
                      ...(hasBorder
                        ? { borderWidth: 1, borderColor: "#CCCCCC", borderStyle: "solid" as const }
                        : {}),
                    }}
                  >
                    <Image
                      src={src}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        borderRadius: 3,
                      }}
                    />
                  </View>
                ) : (
                  <View
                    key={i}
                    style={{
                      width: mm(30),
                      height: mm(30),
                      borderRadius: 3,
                      backgroundColor: "#F0F0F0",
                      borderWidth: 1,
                      borderColor: "#CCCCCC",
                      borderStyle: "dashed",
                    }}
                  />
                );
              })}
            </View>
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
      ) : null}

      {/* ── Content pages ── */}
      <Page
        size="A4"
        orientation="landscape"
        style={[s.contentPage, { fontFamily: bodyFont }]}
      >
        <View style={s.headerLeft} fixed>
          <Text style={s.headerLeftText}>
            {`Verben mit Präpositionen\n${title} – Präsens · Adjektivdeklination`}
          </Text>
        </View>

        {iconDataUri ? (
          <View style={s.headerIcon} fixed>
            <Image src={iconDataUri} style={s.headerIconImg} />
          </View>
        ) : null}

        <Text style={s.contentTitle} fixed
          render={({ pageNumber }) => pageNumber === (includeTitlePage ? 2 : 1) ? (settings.contentTitle || title) : "\u00A0"}
        />

        {entries.map((entry, i) => (
          <VPTable key={i} entry={entry} />
        ))}

        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            {`© ${year} lingostar | Marcel Allenspach\nAlle Rechte vorbehalten`}
          </Text>
          <Text
            style={s.footerCenter}
            render={({ pageNumber, totalPages }) => {
              const off = includeTitlePage ? 1 : 0;
              return `${pageNumber - off} / ${totalPages - off}`;
            }}
          />
          <Text style={s.footerRight}>
            {`${worksheetId}\n${dateStr}`}
          </Text>
        </View>

        {/* Source attribution – rotated 90° CCW on right edge, last page only */}
        <Text style={s.sourceText} fixed
          render={({ pageNumber, totalPages }) => pageNumber === totalPages ? SOURCE_TEXT : ""}
        />
      </Page>
    </Document>
  );
}

// ─── Document ───────────────────────────────────────────────

interface GrammarTablePDFProps {
  title: string;
  tables: VerbConjugationTable[];
  settings: GrammarTableSettings;
  brand: Brand;
  worksheetId: string;
  bigLogoDataUri: string;
  iconDataUri: string;
  simplified: boolean;
  simplifiedTenses: Record<VerbTense, boolean>;
  showIrregularHighlights: boolean;
  includeTitlePage?: boolean;
}

export { renderToBuffer };

export function GrammarTablePDF({
  title,
  tables,
  settings,
  brand,
  worksheetId,
  bigLogoDataUri,
  iconDataUri,
  simplified,
  simplifiedTenses,
  showIrregularHighlights,
  includeTitlePage = true,
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
  // Optionally pad with empty tables for student fill-in
  const paddedTables = settings.insertEmptyTables
    ? padWithEmptyTables(tables, simplified)
    : tables;
  // Chunk tables into groups of 3 for simplified mode
  const verbChunks = simplified ? chunkArray(paddedTables, 3) : [];
  // Build tense label for header
  const tenseLabel = simplified
    ? activeTenses.map((t) => TENSE_LABELS[t].de).join(" · ") + " – 3. Person Singular Perfekt und Präteritum"
    : "Präsens · Perfekt · Präteritum";

  return (
    <Document title={title} author="lingostar">
      {/* ── Title page ── */}
      {includeTitlePage ? (
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
            {/* 4 cover image slots */}
            <View style={{ flexDirection: "row", gap: mm(4), marginTop: mm(12), justifyContent: "flex-start" }}>
              {[0, 1, 2, 3].map((i) => {
                const src = settings.coverImages?.[i];
                const hasBorder = settings.coverImageBorder ?? false;
                return src && src !== "" ? (
                  <View
                    key={i}
                    style={{
                      width: mm(30),
                      height: mm(30),
                      borderRadius: 3,
                      overflow: "hidden",
                      ...(hasBorder
                        ? { borderWidth: 1, borderColor: "#CCCCCC", borderStyle: "solid" as const }
                        : {}),
                    }}
                  >
                    <Image
                      src={src}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        borderRadius: 3,
                      }}
                    />
                  </View>
                ) : (
                  <View
                    key={i}
                    style={{
                      width: mm(30),
                      height: mm(30),
                      borderRadius: 3,
                      backgroundColor: "#F0F0F0",
                      borderWidth: 1,
                      borderColor: "#CCCCCC",
                      borderStyle: "dashed",
                    }}
                  />
                );
              })}
            </View>
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
      ) : null}

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

        {/* Document title – visible on first content page, invisible spacer on subsequent pages */}
        <Text style={s.contentTitle} fixed
          render={({ pageNumber }) => pageNumber === (includeTitlePage ? 2 : 1) ? (settings.contentTitle || title) : "\u00A0"}
        />

        {/* Verb tables */}
        {simplified
          ? activeTenses.map((tense) =>
              verbChunks.map((chunk, ci) => (
                <SimplifiedVerbTable key={`${tense}-${ci}`} tables={chunk} tense={tense} showHighlights={showIrregularHighlights} />
              ))
            )
          : paddedTables.map((tbl, i) => (
              <VerbTable key={i} tableData={tbl} showHighlights={showIrregularHighlights} />
            ))}

        {/* Repeating footer with page numbers */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            {`© ${year} lingostar | Marcel Allenspach\nAlle Rechte vorbehalten`}
          </Text>
          <Text
            style={s.footerCenter}
            render={({ pageNumber, totalPages }) => {
              const off = includeTitlePage ? 1 : 0;
              return `${pageNumber - off} / ${totalPages - off}`;
            }}
          />
          <Text style={s.footerRight}>
            {`${worksheetId}\n${dateStr}`}
          </Text>
        </View>

        {/* Source attribution – rotated 90° CCW on right edge, last page only */}
        <Text style={s.sourceText} fixed
          render={({ pageNumber, totalPages }) => pageNumber === totalPages ? SOURCE_TEXT : ""}
        />
      </Page>
    </Document>
  );
}

// ─── API Route ──────────────────────────────────────────────

/**
 * Deep-replace all ß → ss in string values of an object/array.
 * Used for Swiss German (CH) PDF variant.
 */
export function replaceEszett<T>(data: T): T {
  if (typeof data === "string") return data.replace(/ß/g, "ss") as unknown as T;
  if (Array.isArray(data)) return data.map(replaceEszett) as unknown as T;
  if (data && typeof data === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = replaceEszett(value);
    }
    return result as T;
  }
  return data;
}

// ─── Cover page via satori (JSX → SVG → PNG) ───────────────

export interface CoverSvgProps {
  subtitle: string;
  title: string;
  tenseInfo: string;
  settings: GrammarTableSettings;
  worksheetId: string;
  bigLogoDataUri: string;
  flagDataUri?: string;
  ribbonLabel?: string;
  ribbonColor?: string;
}

/** Render cover page to SVG string using satori, then convert to PNG buffer via sharp. */
export async function renderCoverPng(props: CoverSvgProps): Promise<Buffer> {
  const { subtitle, title, tenseInfo, settings, worksheetId, bigLogoDataUri, flagDataUri, ribbonLabel, ribbonColor } = props;
  const now = new Date();
  const year = now.getFullYear();
  const dateStr = now.toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  // Load font files for satori
  const encodeSansRegular = fs.readFileSync(path.join(fontDir, "EncodeSans-Regular.ttf"));
  const encodeSansMedium = fs.readFileSync(path.join(fontDir, "EncodeSans-Medium.ttf"));
  const merriweatherRegular = fs.readFileSync(path.join(fontDir, "Merriweather-Regular.woff"));

  // A4 at 2x density: 595 × 842 pt → 1190 × 1684 px
  const W = 1190;
  const H = 1684;
  const PAD = 85; // ~15mm at 2x

  const coverImages = settings.coverImages ?? [];
  const hasBorder = settings.coverImageBorder ?? false;
  const imgSize = 227; // ~40mm at 2x
  const imgGap = 23;   // ~4mm at 2x

  const jsx = (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", padding: PAD, backgroundColor: "white", position: "relative", overflow: "hidden" }}>
      {/* Ribbon — positioned so the rotated band spans from left edge to top edge */}
      {ribbonLabel ? (
        <div style={{
          position: "absolute",
          top: 130,
          left: -110,
          width: 560,
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: ribbonColor || "#4A3D55",
          transform: "rotate(-45deg)",
          transformOrigin: "center center",
          boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
        }}>
          <span style={{ fontFamily: "Encode Sans", fontWeight: 500, fontSize: 26, color: "#FFFFFF", textTransform: "uppercase" as const, letterSpacing: 1, lineHeight: 1, textAlign: "center" as const }}>
            {ribbonLabel}
          </span>
        </div>
      ) : null}
      {/* Flag — top-left corner */}
      {flagDataUri ? (
        <div style={{ position: "absolute", top: 45, left: 45, display: "flex" }}>
          <img src={flagDataUri} width={72} height={48} />
        </div>
      ) : null}
      {/* Logo */}
      {bigLogoDataUri ? (
        <div style={{ position: "absolute", top: PAD, right: PAD, display: "flex" }}>
          <img src={bigLogoDataUri} width={227} height={53} />
        </div>
      ) : null}

      {/* Centered content */}
      <div style={{ display: "flex", flex: 1, flexDirection: "column", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontFamily: "Encode Sans", fontSize: 22, fontWeight: 400, textTransform: "uppercase" as const, color: "#000000", marginBottom: 23 }}>
            {subtitle}
          </span>
          <span style={{ fontFamily: "Merriweather", fontSize: 56, fontWeight: 400, color: "#222222" }}>
            {title}
          </span>
          <span style={{ fontFamily: "Encode Sans", fontSize: 22, fontWeight: 400, color: "#000000", marginTop: 17 }}>
            {tenseInfo}
          </span>

          {/* Cover images */}
          <div style={{ display: "flex", flexDirection: "row", gap: imgGap, marginTop: 68, flexWrap: "wrap" }}>
            {[0, 1, 2, 3].map((i) => {
              const src = coverImages[i];
              return src && src !== "" ? (
                <div
                  key={i}
                  style={{
                    width: imgSize,
                    height: imgSize,
                    borderRadius: 6,
                    overflow: "hidden",
                    display: "flex",
                    ...(hasBorder
                      ? { border: "2px solid #CCCCCC" }
                      : {}),
                  }}
                >
                  <img
                    src={src}
                    width={imgSize}
                    height={imgSize}
                    style={{ objectFit: "cover", borderRadius: 6 }}
                  />
                </div>
              ) : (
                <div
                  key={i}
                  style={{
                    width: imgSize,
                    height: imgSize,
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

      {/* Footer */}
      <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", paddingTop: 11 }}>
        <span style={{ fontFamily: "Encode Sans", fontSize: 14, color: "#666666", lineHeight: 1.4 }}>
          {`© ${year} lingostar | Marcel Allenspach`}
        </span>
        <span style={{ fontFamily: "Encode Sans", fontSize: 14, color: "#666666", textAlign: "right" as const, lineHeight: 1.4 }}>
          {`${worksheetId}  ·  ${dateStr}`}
        </span>
      </div>
    </div>
  );

  const svg = await satori(jsx as React.ReactNode, {
    width: W,
    height: H,
    fonts: [
      { name: "Encode Sans", data: encodeSansRegular, weight: 400, style: "normal" as const },
      { name: "Encode Sans", data: encodeSansMedium, weight: 500, style: "normal" as const },
      { name: "Merriweather", data: merriweatherRegular, weight: 400, style: "normal" as const },
    ],
  });

  const pngBuffer = await sharp(Buffer.from(svg))
    .png()
    .toBuffer();

  return pngBuffer;
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  const { id } = await params;
  const locale = (_req.nextUrl.searchParams.get("locale") || "DE").toUpperCase() as "DE" | "CH" | "NEUTRAL";
  const isSwiss = locale === "CH";
  const isNeutral = locale === "NEUTRAL";

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
    declinationInput?: import("@/types/grammar-table").DeclinationInput;
    tableData?: AdjectiveDeclinationTable | VerbConjugationTable[] | VerbPrepositionTableEntry[];
  } | null;

  const tableType = blocksData?.tableType || "adjective-declination";
  const tableData = blocksData?.tableData ?? null;
  const settings = (worksheet.settings ?? {}) as unknown as GrammarTableSettings;

  const brand = settings.brand || "edoomio";
  const brandSettings: BrandSettings = {
    ...DEFAULT_BRAND_SETTINGS[brand],
    ...settings.brandSettings,
  };

  // Read logos (convert SVG → PNG for react-pdf compatibility)
  const bigLogoDataUri = await readLogoAsPngDataUri("logo/lingostar_logo_and_brand_flat.svg", 800);
  const flagDataUri = isNeutral
    ? ""
    : await readLogoAsPngDataUri(
        isSwiss ? "key_visuals/flag_of_Switzerland.svg" : "key_visuals/flag_of_Germany.svg",
        200,
      );
  const iconDataUri = brandSettings.logo
    ? await readLogoAsPngDataUri(brandSettings.logo.replace(/^\//, ""), 200)
    : "";

  // Compress cover images (download, resize, convert to JPEG data-URI)
  const rawCoverImages = settings.coverImages ?? [];
  const compressedCoverImages = await Promise.all(
    rawCoverImages.map((url) =>
      url && url !== "" ? compressImageUrl(url, 400, 75) : Promise.resolve(url)
    )
  );
  // Override coverImages in settings with compressed versions
  const pdfSettings = { ...settings, coverImages: compressedCoverImages };

  const format = _req.nextUrl.searchParams.get("format"); // "cover" for title page image
  const includeTitlePage = _req.nextUrl.searchParams.get("titlePage") !== "false"; // default true
  // Optional override for simplified flag (used by collection ZIP generator)
  const simplifiedParam = _req.nextUrl.searchParams.get("simplified");
  const simplifiedOverride = simplifiedParam !== null ? simplifiedParam === "true" : undefined;

  // ── Cover page image (portrait PNG) ──
  if (format === "cover") {
    try {
      const pdfTitle = isSwiss ? replaceEszett(worksheet.title) : worksheet.title;

      // Determine subtitle and tense info based on table type
      let coverSubtitle = "Grammatik";
      let coverTenseInfo = "";
      let coverRibbonLabel = "";
      let coverRibbonColor = "";
      if (tableType === "verb-conjugation") {
        const simplified = simplifiedOverride ?? (settings.simplified ?? false);
        const activeTenses: VerbTense[] = simplified
          ? TENSES.filter((t) => (settings.simplifiedTenses ?? { praesens: true, perfekt: false, praeteritum: false })[t])
          : [];
        const tenseLabel = simplified
          ? activeTenses.map((t) => TENSE_LABELS[t].de).join(" · ") + " – 3. Person Singular Perfekt und Präteritum"
          : "Präsens · Perfekt · Präteritum";
        coverSubtitle = "Verbkonjugation";
        coverTenseInfo = `Indikativ | ${tenseLabel}`;
        coverRibbonLabel = simplified ? "Kompakte Version" : "Ausführliche Version";
        coverRibbonColor = simplified ? "#4A3D55" : "#3A6570";
      } else if (tableType === "adjective-declination") {
        coverSubtitle = "Adjektivdeklination";
        coverTenseInfo = "Nominativ · Akkusativ · Dativ · Genitiv";
      } else if (tableType === "verb-preposition") {
        coverSubtitle = "Verben mit Präpositionen";
        coverTenseInfo = "Präsens · Adjektivdeklination";
      }

      if (isSwiss) {
        coverSubtitle = replaceEszett(coverSubtitle);
        coverTenseInfo = replaceEszett(coverTenseInfo);
      }

      const pngBuffer = await renderCoverPng({
        subtitle: coverSubtitle,
        title: pdfTitle,
        tenseInfo: coverTenseInfo,
        settings: isSwiss ? replaceEszett(pdfSettings) : pdfSettings,
        worksheetId: worksheet.id,
        bigLogoDataUri,
        flagDataUri,
        ribbonLabel: coverRibbonLabel || undefined,
        ribbonColor: coverRibbonColor || undefined,
      });

      const shortId = worksheet.id.slice(0, 8);
      const effectiveSimplified = simplifiedOverride ?? (settings.simplified ?? false);
      const exSuffix = tableType === "verb-conjugation" && !effectiveSimplified ? "_EX" : "";
      const filename = `${shortId}${exSuffix}_cover_${locale === "NEUTRAL" ? "DACH" : locale}.png`;

      return new NextResponse(new Uint8Array(pngBuffer), {
        headers: {
          "Content-Type": "image/png",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    } catch (error) {
      console.error("[Grammar Table PDF v2] Cover image error:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      return NextResponse.json(
        { error: `Cover image generation failed: ${message}` },
        { status: 500 }
      );
    }
  }

  try {
    let buffer: Buffer;

    if (tableType === "verb-conjugation") {
      const conjTablesUnsorted = tableData as VerbConjugationTable[];
      if (!Array.isArray(conjTablesUnsorted) || conjTablesUnsorted.length === 0) {
        return NextResponse.json(
          { error: "No conjugation data to export" },
          { status: 400 }
        );
      }

      // Sort verbs alphabetically by infinitive (unless disabled)
      // Strip leading "sich " so reflexive verbs sort by infinitive
      const sortKey = (verb: string) => verb.replace(/^sich\s+/i, "");
      const conjTablesSorted = (settings.alphabeticalOrder ?? true)
        ? [...conjTablesUnsorted].sort((a, b) => sortKey(a.input.verb).localeCompare(sortKey(b.input.verb), "de"))
        : conjTablesUnsorted;

      // Apply ß → ss for Swiss variant
      const conjTables = isSwiss ? replaceEszett(conjTablesSorted) : conjTablesSorted;
      const pdfTitle = isSwiss ? replaceEszett(worksheet.title) : worksheet.title;

      console.log(
        `[Grammar Table PDF v2] Generating react-pdf for "${worksheet.title}" (${conjTables.length} verbs, locale=${locale})`
      );

      buffer = Buffer.from(
        await renderToBuffer(
          <GrammarTablePDF
            title={pdfTitle}
            tables={conjTables}
            settings={isSwiss ? replaceEszett(pdfSettings) : pdfSettings}
            brand={brand}
            worksheetId={worksheet.id}
            bigLogoDataUri={bigLogoDataUri}
            iconDataUri={iconDataUri}
            simplified={simplifiedOverride ?? (settings.simplified ?? false)}
            simplifiedTenses={settings.simplifiedTenses ?? { praesens: true, perfekt: false, praeteritum: false }}
            showIrregularHighlights={settings.showIrregularHighlights ?? false}
            includeTitlePage={includeTitlePage}
          />
        )
      );
    } else if (tableType === "verb-preposition") {
      const vpEntriesRaw = tableData as VerbPrepositionTableEntry[];
      if (!Array.isArray(vpEntriesRaw) || vpEntriesRaw.length === 0) {
        return NextResponse.json(
          { error: "No verb+preposition data to export" },
          { status: 400 }
        );
      }

      // Apply ß → ss for Swiss variant
      const vpEntries = isSwiss ? replaceEszett(vpEntriesRaw) : vpEntriesRaw;
      const pdfTitle = isSwiss ? replaceEszett(worksheet.title) : worksheet.title;

      console.log(
        `[Grammar Table PDF v2] Generating react-pdf for "${worksheet.title}" (verb-preposition, ${vpEntries.length} entries, locale=${locale})`
      );

      buffer = Buffer.from(
        await renderToBuffer(
          <VerbPrepositionPDF
            title={pdfTitle}
            entries={vpEntries}
            settings={isSwiss ? replaceEszett(pdfSettings) : pdfSettings}
            brand={brand}
            worksheetId={worksheet.id}
            bigLogoDataUri={bigLogoDataUri}
            iconDataUri={iconDataUri}
            includeTitlePage={includeTitlePage}
          />
        )
      );
    } else {
      // adjective-declination
      const declData = tableData as AdjectiveDeclinationTable;
      if (!declData || !declData.cases || declData.cases.length === 0) {
        return NextResponse.json(
          { error: "No declination data to export" },
          { status: 400 }
        );
      }

      // Prefer user's stored declinationInput over AI-generated input
      if (blocksData?.declinationInput) {
        declData.input = blocksData.declinationInput;
      }

      // Apply ß → ss for Swiss variant
      const pdfDeclData = isSwiss ? replaceEszett(declData) : declData;
      const pdfTitle = isSwiss ? replaceEszett(worksheet.title) : worksheet.title;

      console.log(
        `[Grammar Table PDF v2] Generating react-pdf for "${worksheet.title}" (adjective-declination, ${declData.cases.length} cases, locale=${locale})`,
        `highlightEndings=${settings.highlightEndings}`,
        `input.maskulin.adj=${declData.input?.maskulin?.adjective}`,
      );

      buffer = Buffer.from(
        await renderToBuffer(
          <DeclinationTablePDF
            title={pdfTitle}
            tableData={pdfDeclData}
            settings={isSwiss ? replaceEszett(pdfSettings) : pdfSettings}
            brand={brand}
            worksheetId={worksheet.id}
            bigLogoDataUri={bigLogoDataUri}
            iconDataUri={iconDataUri}
            includeTitlePage={includeTitlePage}
          />
        )
      );
    }

    const shortId = worksheet.id.slice(0, 8);
    const effectiveSimplified = simplifiedOverride ?? (settings.simplified ?? false);
    const exSuffix = tableType === "verb-conjugation" && !effectiveSimplified ? "_EX" : "";
    const filename = `${shortId}${exSuffix}_${locale === "NEUTRAL" ? "DACH" : locale}.pdf`;

    return new NextResponse(Buffer.from(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
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
