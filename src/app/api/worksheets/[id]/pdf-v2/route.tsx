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
  Link,
} from "@react-pdf/renderer";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import {
  WorksheetBlock,
  HeadingBlock,
  TextBlock,
  ImageBlock,
  ImageCardsBlock,
  TextCardsBlock,
  SpacerBlock,
  DividerBlock,
  MultipleChoiceBlock,
  FillInBlankBlock,
  MatchingBlock,
  GlossaryBlock,
  OpenResponseBlock,
  WordBankBlock,
  NumberLineBlock,
  ColumnsBlock,
  TrueFalseMatrixBlock,
  ArticleTrainingBlock,
  OrderItemsBlock,
  InlineChoicesBlock,
  WordSearchBlock,
  SortingCategoriesBlock,
  UnscrambleWordsBlock,
  FixSentencesBlock,
  CompleteSentencesBlock,
  VerbTableBlock,
  WorksheetSettings,
  DEFAULT_SETTINGS,
  Brand,
  BrandSettings,
  BrandFonts,
  BRAND_FONTS,
  DEFAULT_BRAND_SETTINGS,
  migrateInlineChoicesBlock,
} from "@/types/worksheet";
import { readLogoAsPngDataUri, replaceEszett } from "../grammar-table-pdf-v2/route";
import { applyChOverrides } from "@/lib/locale-utils";

import type { Style } from "@react-pdf/types";

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
    { src: fontDataUri("EncodeSans-SemiBold.ttf"), fontWeight: 600 },
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

Font.registerHyphenationCallback((word) => [word]);

// ─── Helpers ────────────────────────────────────────────────

const mm = (v: number) => v * 2.8346;
const pt = (px: number) => px * 0.75; // CSS px → PDF pt (approximate)

/** Map brand font family strings to registered react-pdf family names */
function resolveFontFamily(css: string): string {
  if (css.includes("Asap Condensed")) return "Asap Condensed";
  if (css.includes("Encode Sans")) return "Encode Sans";
  if (css.includes("Merriweather")) return "Merriweather";
  return "Asap Condensed"; // fallback
}

/** Deterministic seeded shuffle (same algorithm as viewer) */
function seededShuffle<T>(arr: T[], blockId: string): T[] {
  const copy = [...arr];
  let seed = 0;
  for (let i = 0; i < blockId.length; i++) {
    seed = ((seed << 5) - seed + blockId.charCodeAt(i)) | 0;
  }
  for (let i = copy.length - 1; i > 0; i--) {
    seed = (seed * 16807 + 0) % 2147483647;
    const j = Math.abs(seed) % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Deterministic word scramble (same algorithm as viewer) */
function scrambleWordDeterministic(
  word: string,
  keepFirst: boolean,
  lowercase: boolean,
  seed: number,
): string {
  let letters = word.split("");
  let firstLetter = "";
  if (keepFirst && letters.length > 1) {
    firstLetter = letters[0];
    letters = letters.slice(1);
  }
  let s = seed;
  for (let i = letters.length - 1; i > 0; i--) {
    s = (s * 16807 + 0) % 2147483647;
    const j = Math.abs(s) % (i + 1);
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }
  let result = keepFirst ? firstLetter + letters.join("") : letters.join("");
  if (lowercase) result = result.toLowerCase();
  return result;
}

function getSeed(blockId: string, itemId: string): number {
  let seed = 0;
  const combined = blockId + itemId;
  for (let i = 0; i < combined.length; i++) {
    seed = ((seed << 5) - seed + combined.charCodeAt(i)) | 0;
  }
  return Math.abs(seed);
}

/** Replace template variables in header/footer strings */
function replaceVars(
  text: string,
  vars: {
    worksheetId: string;
    organization: string;
    teacher: string;
  },
): string {
  const now = new Date();
  return text
    .replace(/\{current_date\}/g, now.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" }))
    .replace(/\{current_year\}/g, String(now.getFullYear()))
    .replace(/\{organization\}/g, vars.organization || "")
    .replace(/\{teacher\}/g, vars.teacher || "")
    .replace(/\{worksheet_uuid\}/g, vars.worksheetId.toUpperCase())
    .replace(/\{current_page\}/g, "") // handled via render prop
    .replace(/\{no_of_pages\}/g, "");  // handled via render prop
}

/** Strip HTML tags for simple text rendering in react-pdf */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
    .replace(/<\/li>\s*/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/** Parse HTML content into styled text segments for react-pdf */
interface TextSegment {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  sup?: boolean;
}

function parseHtmlToSegments(html: string): TextSegment[] {
  const segments: TextSegment[] = [];
  // Simple token-based parser for common inline formatting
  type StackEntry = { bold?: boolean; italic?: boolean; underline?: boolean; strikethrough?: boolean; sup?: boolean };
  const stack: StackEntry[] = [{}];

  const tokens = html.split(/(<[^>]+>)/g);
  for (const token of tokens) {
    if (token.startsWith("<")) {
      const tag = token.toLowerCase();
      if (tag.startsWith("<strong") || tag.startsWith("<b>") || tag.startsWith("<b ")) {
        stack.push({ ...stack[stack.length - 1], bold: true });
      } else if (tag.startsWith("<em") || tag.startsWith("<i>") || tag.startsWith("<i ")) {
        stack.push({ ...stack[stack.length - 1], italic: true });
      } else if (tag.startsWith("<u>") || tag.startsWith("<u ")) {
        stack.push({ ...stack[stack.length - 1], underline: true });
      } else if (tag.startsWith("<s>") || tag.startsWith("<s ") || tag.startsWith("<del") || tag.startsWith("<strike")) {
        stack.push({ ...stack[stack.length - 1], strikethrough: true });
      } else if (tag.startsWith("<sup")) {
        stack.push({ ...stack[stack.length - 1], sup: true });
      } else if (tag.startsWith("</strong") || tag.startsWith("</b>") || tag.startsWith("</em") || tag.startsWith("</i>") || tag.startsWith("</u>") || tag.startsWith("</s>") || tag.startsWith("</del") || tag.startsWith("</strike") || tag.startsWith("</sup")) {
        if (stack.length > 1) stack.pop();
      } else if (tag === "<br>" || tag === "<br/>" || tag === "<br />") {
        segments.push({ text: "\n", ...stack[stack.length - 1] });
      } else if (tag.startsWith("</p>")) {
        segments.push({ text: "\n", ...stack[stack.length - 1] });
      } else if (tag.startsWith("<li")) {
        segments.push({ text: "• ", ...stack[stack.length - 1] });
      }
    } else if (token.length > 0) {
      const text = token
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&nbsp;/g, " ")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
      if (text) segments.push({ text, ...stack[stack.length - 1] });
    }
  }
  return segments;
}

/** Compress a remote image URL to a JPEG data URI for embedding */
async function compressImage(url: string, maxWidth = 500, quality = 80): Promise<string> {
  try {
    if (url.startsWith("data:")) return url;
    const res = await fetch(url);
    if (!res.ok) return url;
    const buf = Buffer.from(await res.arrayBuffer());
    const compressed = await sharp(buf)
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .resize({ width: maxWidth, withoutEnlargement: true })
      .jpeg({ quality })
      .toBuffer();
    return `data:image/jpeg;base64,${compressed.toString("base64")}`;
  } catch {
    return url;
  }
}

// ─── Styles ─────────────────────────────────────────────────

function createStyles(
  settings: WorksheetSettings,
  brandFonts: BrandFonts,
) {
  const bodyFont = resolveFontFamily(brandFonts.bodyFont);
  const headlineFont = resolveFontFamily(brandFonts.headlineFont);
  const hfFont = resolveFontFamily(brandFonts.headerFooterFont);
  const baseFontSize = settings.fontSize * 0.75; // CSS px → pt

  return StyleSheet.create({
    page: {
      paddingTop: mm(30),
      paddingBottom: mm(25),
      paddingLeft: mm(settings.margins.left + 5), // extra 5mm like viewer (25mm left vs 20mm right)
      paddingRight: mm(settings.margins.right),
      fontFamily: bodyFont,
      fontSize: baseFontSize,
      color: "#1a1a1a",
    },

    // ─── Header ───
    header: {
      position: "absolute",
      top: mm(15),
      left: mm(settings.margins.left + 5),
      right: mm(settings.margins.right),
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    headerText: {
      fontFamily: hfFont,
      fontSize: 7,
      color: "#666666",
      lineHeight: 1.5,
      maxWidth: "70%",
    },
    headerLogo: {
      height: mm(8),
      width: "auto",
    },

    // ─── Footer ───
    footer: {
      position: "absolute",
      bottom: mm(8),
      left: mm(settings.margins.left + 5),
      right: mm(settings.margins.right),
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
    },
    footerText: {
      fontFamily: hfFont,
      fontSize: 7,
      color: "#666666",
      lineHeight: 1.5,
    },
    footerCenter: {
      fontFamily: hfFont,
      fontSize: 7,
      color: "#666666",
      textAlign: "center",
    },
    footerRight: {
      fontFamily: hfFont,
      fontSize: 7,
      color: "#666666",
      textAlign: "right",
      lineHeight: 1.5,
    },

    // ─── Block spacing ───
    blockGap: {
      marginBottom: 16,
    },

    // ─── Heading ───
    h1: { fontFamily: headlineFont, fontWeight: brandFonts.headlineWeight as 400 | 700, fontSize: baseFontSize * 1.35, marginBottom: -2 },
    h2: { fontFamily: headlineFont, fontWeight: brandFonts.headlineWeight as 400 | 700, fontSize: baseFontSize * 1.25 },
    h3: { fontFamily: headlineFont, fontWeight: brandFonts.headlineWeight as 400 | 700, fontSize: baseFontSize * 1.1 },

    // ─── Common patterns ───
    instruction: { fontWeight: 500, marginBottom: 6 },
    numberBadge: {
      width: 15,
      height: 15,
      borderRadius: 3,
      backgroundColor: "#e5e7eb",
      fontSize: 6.5,
      fontWeight: 700,
      color: "#6b7280",
      textAlign: "center" as const,
      lineHeight: 1,
      display: "flex" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    emptySquare: {
      width: 12,
      height: 12,
      borderRadius: 3,
      borderWidth: 1,
      borderColor: "#9ca3af",
      opacity: 0.5,
    },
    smallSquare: {
      width: 9,
      height: 9,
      borderRadius: 1.5,
      borderWidth: 1,
      borderColor: "#9ca3af",
      opacity: 0.5,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 4,
      borderBottomWidth: 0.5,
      borderBottomColor: "#e5e7eb",
    },
    rowNoBorder: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 4,
    },
    chip: {
      paddingHorizontal: 6,
      paddingVertical: 3,
      backgroundColor: "#f3f4f6",
      borderRadius: 10,
      fontSize: baseFontSize * 0.85,
      fontWeight: 500,
    },
    chipBorder: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      borderWidth: 0.5,
      borderColor: "#e5e7eb",
      fontSize: baseFontSize * 0.85,
    },
    dashedBox: {
      borderWidth: 1.5,
      borderStyle: "dashed",
      borderColor: "#9ca3af40",
      borderRadius: 6,
      padding: 10,
    },
    writingLine: {
      height: 18,
      borderBottomWidth: 0.5,
      borderBottomColor: "#d1d5db",
      borderBottomStyle: "dashed" as const,
    },
    solidWritingLine: {
      height: 18,
      borderBottomWidth: 0.5,
      borderBottomColor: "#d1d5db",
    },
    bodyText: {
      fontWeight: 500,
    },
    letterBadge: {
      width: 15,
      height: 15,
      borderRadius: 3,
      backgroundColor: "#e5e7eb",
      fontSize: 6.5,
      fontWeight: 700,
      color: "#6b7280",
      textAlign: "center" as const,
      lineHeight: 1,
      display: "flex" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
  });
}

type S = ReturnType<typeof createStyles>;

// ─── Block Renderer Components ──────────────────────────────

/* Render <sup>...</sup> tags in text as superscript Text elements */
function RichText({ children, style, baseFontSize }: { children: string; style?: Style | Style[]; baseFontSize: number }) {
  const parts = children.split(/(<sup>[^<]*<\/sup>)/g);
  const hasSupTags = parts.some((p) => p.startsWith("<sup>"));
  if (!hasSupTags) return <Text style={style}>{children}</Text>;
  return (
    <Text style={style}>
      {parts.map((p, i) => {
        const m = p.match(/^<sup>([^<]*)<\/sup>$/);
        if (m) {
          return (
            <Text key={i} style={{ fontSize: baseFontSize * 0.6, color: "#6b7280" }}>
              {m[1]}
            </Text>
          );
        }
        return <Text key={i}>{p}</Text>;
      })}
    </Text>
  );
}

/* Rich HTML text rendered from segments — supports paragraph spacing */
function HtmlText({ html, style, baseFontSize }: { html: string; style?: Style | Style[]; baseFontSize: number }) {
  // Split HTML by paragraphs first, then parse segments within each
  // Handle both <p>...</p> blocks and bare text
  const paragraphs = html
    .split(/<\/p>\s*/gi)
    .map((p) => p.replace(/<p[^>]*>/gi, "").trim())
    .filter((p) => p.length > 0);

  // If no <p> tags were found, treat as single block
  if (paragraphs.length <= 1) {
    const segments = parseHtmlToSegments(html);
    if (segments.length === 0) return null;
    return (
      <Text style={[{ lineHeight: 1.5 }, ...(Array.isArray(style) ? style : style ? [style] : [])]}>
        {segments.map((seg, i) => (
          <Text
            key={i}
            style={{
              fontWeight: seg.bold ? 700 : undefined,
              fontStyle: seg.italic ? "italic" : undefined,
              textDecoration: seg.underline ? "underline" : seg.strikethrough ? "line-through" : undefined,
              fontSize: seg.sup ? baseFontSize * 0.6 : undefined,
            }}
          >
            {seg.text}
          </Text>
        ))}
      </Text>
    );
  }

  // Multiple paragraphs: render each with bottom margin
  return (
    <View>
      {paragraphs.map((pHtml, pi) => {
        const segments = parseHtmlToSegments(pHtml);
        if (segments.length === 0) return null;
        return (
          <Text
            key={pi}
            style={[
              { lineHeight: 1.5 },
              ...(Array.isArray(style) ? style : style ? [style] : []),
              pi < paragraphs.length - 1 ? { marginBottom: baseFontSize * 0.6 } : {},
            ]}
          >
            {segments.map((seg, i) => (
              <Text
                key={i}
                style={{
                  fontWeight: seg.bold ? 700 : undefined,
                  fontStyle: seg.italic ? "italic" : undefined,
                  textDecoration: seg.underline ? "underline" : seg.strikethrough ? "line-through" : undefined,
                  fontSize: seg.sup ? baseFontSize * 0.6 : undefined,
                }}
              >
                {seg.text}
              </Text>
            ))}
          </Text>
        );
      })}
    </View>
  );
}

function NumberBadge({ n, s }: { n: number; s: S }) {
  return (
    <View style={s.numberBadge}>
      <Text>{String(n).padStart(2, "0")}</Text>
    </View>
  );
}

function LetterBadge({ letter, s }: { letter: string; s: S }) {
  return (
    <View style={s.letterBadge}>
      <Text>{letter}</Text>
    </View>
  );
}

function EmptySquare({ s }: { s: S }) {
  return <View style={s.emptySquare} />;
}

/** Green filled square for solution key */
function FilledSquare() {
  return (
    <View
      style={{
        width: 12,
        height: 12,
        borderRadius: 3,
        backgroundColor: "#22c55e",
        borderWidth: 1,
        borderColor: "#16a34a",
      }}
    />
  );
}

/** Solution text styling constant */
const solutionTextStyle = { color: "#166534", fontWeight: 600 as const };

function SmallSquare({ s }: { s: S }) {
  return <View style={s.smallSquare} />;
}

// ─── Individual Block Components ────────────────────────────

function HeadingBlockPdf({ block, s }: { block: HeadingBlock; s: S }) {
  const style = block.level === 1 ? s.h1 : block.level === 2 ? s.h2 : s.h3;
  return <Text style={style}>{block.content}</Text>;
}

function TextBlockPdf({
  block,
  s,
  baseFontSize,
  imageMap,
}: {
  block: TextBlock;
  s: S;
  baseFontSize: number;
  imageMap: Record<string, string>;
}) {
  const hasImage = block.imageSrc && imageMap[block.imageSrc];
  const imageScale = block.imageScale || 30;

  if (hasImage) {
    const imgUri = imageMap[block.imageSrc!];
    const isLeft = block.imageAlign !== "right";

    // Simulate CSS float: split paragraphs so that some sit beside the image
    // and overflow paragraphs render full-width below
    const paragraphs = block.content
      .split(/<\/p>\s*/gi)
      .map((p) => p.replace(/<p[^>]*>/gi, "").trim())
      .filter((p) => p.length > 0);

    // Heuristic: show at most 3 paragraphs beside the image, rest below
    const beside = paragraphs.slice(0, 3);
    const below = paragraphs.slice(3);

    const imgStyle = {
      width: `${imageScale}%`,
      objectFit: "contain" as const,
      flexShrink: 0,
    };
    const marginStyle = isLeft
      ? { marginRight: 10, marginTop: 4 }
      : { marginLeft: 10, marginTop: 4 };

    return (
      <View>
        {/* Row: image + first paragraphs side by side */}
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          {isLeft && <Image src={imgUri} style={{ ...imgStyle, ...marginStyle }} />}
          <View style={{ flex: 1 }}>
            {beside.map((pHtml, pi) => {
              const segments = parseHtmlToSegments(pHtml);
              if (segments.length === 0) return null;
              return (
                <Text
                  key={pi}
                  style={{
                    lineHeight: 1.5,
                    ...(pi < beside.length - 1 || below.length > 0 ? { marginBottom: baseFontSize * 0.6 } : {}),
                  }}
                >
                  {segments.map((seg, i) => (
                    <Text
                      key={i}
                      style={{
                        fontWeight: seg.bold ? 700 : undefined,
                        fontStyle: seg.italic ? "italic" : undefined,
                        textDecoration: seg.underline ? "underline" : seg.strikethrough ? "line-through" : undefined,
                        fontSize: seg.sup ? baseFontSize * 0.6 : undefined,
                      }}
                    >
                      {seg.text}
                    </Text>
                  ))}
                </Text>
              );
            })}
          </View>
          {!isLeft && <Image src={imgUri} style={{ ...imgStyle, ...marginStyle }} />}
        </View>

        {/* Remaining paragraphs at full width */}
        {below.length > 0 && (
          <View>
            {below.map((pHtml, pi) => {
              const segments = parseHtmlToSegments(pHtml);
              if (segments.length === 0) return null;
              return (
                <Text
                  key={pi}
                  style={{
                    lineHeight: 1.5,
                    ...(pi < below.length - 1 ? { marginBottom: baseFontSize * 0.6 } : {}),
                  }}
                >
                  {segments.map((seg, i) => (
                    <Text
                      key={i}
                      style={{
                        fontWeight: seg.bold ? 700 : undefined,
                        fontStyle: seg.italic ? "italic" : undefined,
                        textDecoration: seg.underline ? "underline" : seg.strikethrough ? "line-through" : undefined,
                        fontSize: seg.sup ? baseFontSize * 0.6 : undefined,
                      }}
                    >
                      {seg.text}
                    </Text>
                  ))}
                </Text>
              );
            })}
          </View>
        )}
      </View>
    );
  }

  return <HtmlText html={block.content} baseFontSize={baseFontSize} />;
}

function ImageBlockPdf({
  block,
  imageMap,
}: {
  block: ImageBlock;
  imageMap: Record<string, string>;
}) {
  const src = imageMap[block.src] || block.src;
  return (
    <View style={{ alignItems: "center" }}>
      <Image src={src} style={{ width: block.width ? `${block.width}%` : "100%", borderRadius: 4 }} />
      {block.caption && (
        <Text style={{ fontSize: 8, color: "#6b7280", marginTop: 3, textAlign: "center" }}>
          {block.caption}
        </Text>
      )}
    </View>
  );
}

function ImageCardsBlockPdf({
  block,
  s,
  imageMap,
}: {
  block: ImageCardsBlock;
  s: S;
  imageMap: Record<string, string>;
}) {
  const cols = block.columns || 2;
  const itemWidth = `${Math.floor(100 / cols) - 2}%`;

  // Word bank
  const wordBank = block.showWordBank ? (
    <View style={[s.dashedBox, { marginBottom: 8 }]}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {seededShuffle(block.items, block.id).map((item, i) => (
          <Text key={i} style={[s.chip, { fontSize: 7 }]}>
            {item.text || `Item ${i + 1}`}
          </Text>
        ))}
      </View>
    </View>
  ) : null;

  return (
    <View>
      {wordBank}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {block.items.map((item, i) => {
          const imgSrc = item.src ? (imageMap[item.src] || item.src) : "";
          return (
            <View key={i} style={{ width: itemWidth, borderWidth: 0.5, borderColor: "#e5e7eb", borderRadius: 4, overflow: "hidden" }} wrap={false}>
              {imgSrc && <Image src={imgSrc} style={{ width: "100%" }} />}
              {block.showWritingLines ? (
                <View style={{ padding: 4 }}>
                  {Array.from({ length: block.writingLinesCount || 1 }).map((_, li) => (
                    <View key={li} style={s.writingLine} />
                  ))}
                </View>
              ) : (
                item.text && <Text style={{ padding: 4, fontSize: 8, textAlign: "center" }}>{item.text}</Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function TextCardsBlockPdf({
  block,
  s,
}: {
  block: TextCardsBlock;
  s: S;
}) {
  const cols = block.columns || 2;
  const itemWidth = `${Math.floor(100 / cols) - 2}%`;

  const sizeMap: Record<string, number> = { xs: 7, sm: 8, base: 10, lg: 12, xl: 14, "2xl": 16 };
  const fontSize = sizeMap[block.textSize || "base"] || 10;

  // Word bank
  const wordBank = block.showWordBank ? (
    <View style={[s.dashedBox, { marginBottom: 8 }]}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {seededShuffle(block.items, block.id).map((item, i) => (
          <Text key={i} style={[s.chip, { fontSize: 7 }]}>
            {item.text || `Item ${i + 1}`}
          </Text>
        ))}
      </View>
    </View>
  ) : null;

  return (
    <View>
      {wordBank}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {block.items.map((item, i) => (
          <View
            key={i}
            style={{
              width: itemWidth,
              borderWidth: block.showBorder ? 0.5 : 0,
              borderColor: "#e5e7eb",
              borderRadius: 4,
              overflow: "hidden",
            }}
            wrap={false}
          >
            <Text
              style={{
                padding: 6,
                fontSize,
                textAlign: (block.textAlign as "left" | "center" | "right") || "center",
                fontWeight: block.textBold ? 700 : 400,
                fontStyle: block.textItalic ? "italic" : "normal",
              }}
            >
              {item.text}
            </Text>
            {block.showWritingLines && (
              <View style={{ paddingHorizontal: 6, paddingBottom: 4 }}>
                {Array.from({ length: block.writingLinesCount || 1 }).map((_, li) => (
                  <View key={li} style={s.writingLine} />
                ))}
              </View>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

function SpacerBlockPdf({ block }: { block: SpacerBlock }) {
  return <View style={{ height: pt(block.height) }} />;
}

function DividerBlockPdf({ block }: { block: DividerBlock }) {
  return (
    <View
      style={{
        borderBottomWidth: 1,
        borderBottomColor: "#d1d5db",
        borderBottomStyle: block.style === "dashed" ? "dashed" : block.style === "dotted" ? "dashed" : "solid",
        marginVertical: 4,
      }}
    />
  );
}

function MultipleChoiceBlockPdf({ block, s, showSolutions = false }: { block: MultipleChoiceBlock; s: S; showSolutions?: boolean }) {
  return (
    <View>
      {block.question && <Text style={s.instruction}>{block.question}</Text>}
      {block.options.map((opt, i) => {
        const filled = showSolutions && opt.isCorrect;
        return (
          <View key={opt.id} style={[s.row, i === block.options.length - 1 ? { borderBottomWidth: 0 } : {}]}>
            <NumberBadge n={i + 1} s={s} />
            {filled ? (
              <FilledSquare />
            ) : (
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: block.allowMultiple ? 2 : 5,
                  borderWidth: 1.5,
                  borderColor: "#9ca3af80",
                }}
              />
            )}
            <Text style={{ flex: 1, ...(filled ? solutionTextStyle : {}) }}>{opt.text}</Text>
          </View>
        );
      })}
    </View>
  );
}

function FillInBlankBlockPdf({ block, s, baseFontSize, showSolutions = false }: { block: FillInBlankBlock; s: S; baseFontSize: number; showSolutions?: boolean }) {
  // Parse content to extract text and blanks
  const parts = block.content.split(/(\{\{blank:[^}]+\}\})/g);
  let blankIndex = 0;

  return (
    <View>
      <Text style={{ lineHeight: 2 }}>
        {parts.map((part, i) => {
          const match = part.match(/\{\{blank:(.+)\}\}/);
          if (match) {
            blankIndex++;
            if (showSolutions) {
              return (
                <Text key={i} style={{ backgroundColor: "#dcfce7", ...solutionTextStyle }}>
                  {" "}{match[1]}{" "}
                </Text>
              );
            }
            return (
              <Text key={i}>
                <Text
                  style={{
                    backgroundColor: "#f3f4f6",
                    fontSize: baseFontSize * 0.6,
                    color: "#6b7280",
                  }}
                >
                  {" "}
                  {String(blankIndex).padStart(2, "0")}
                  {"               "}
                </Text>
                <Text> </Text>
              </Text>
            );
          }
          return <Text key={i}>{part}</Text>;
        })}
      </Text>
    </View>
  );
}

function MatchingBlockPdf({ block, s, showSolutions = false }: { block: MatchingBlock; s: S; showSolutions?: boolean }) {
  const shuffled = seededShuffle(block.pairs, block.id);
  // Build a map from pair.id → letter in the shuffled right column
  const pairToLetter: Record<string, string> = {};
  shuffled.forEach((pair, i) => {
    pairToLetter[pair.id] = String.fromCharCode(65 + i);
  });
  return (
    <View>
      {block.instruction && <Text style={s.instruction}>{block.instruction}</Text>}
      <View style={{ flexDirection: "row", gap: 16 }}>
        {/* Left column */}
        <View style={{ flex: 1 }}>
          {block.pairs.map((pair, i) => (
            <View key={pair.id} style={[s.row, i === block.pairs.length - 1 ? { borderBottomWidth: 0 } : {}]}>
              <NumberBadge n={i + 1} s={s} />
              <Text style={{ flex: 1 }}>{pair.left}</Text>
              {showSolutions ? (
                <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: "#22c55e", borderWidth: 1, borderColor: "#16a34a", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 7, fontWeight: 700, color: "#ffffff" }}>{pairToLetter[pair.id]}</Text>
                </View>
              ) : (
                <EmptySquare s={s} />
              )}
            </View>
          ))}
        </View>
        {/* Right column (shuffled) */}
        <View style={{ flex: 1 }}>
          {shuffled.map((pair, i) => (
            <View key={pair.id} style={[s.row, i === shuffled.length - 1 ? { borderBottomWidth: 0 } : {}]}>
              <EmptySquare s={s} />
              <Text style={{ flex: 1 }}>{pair.right}</Text>
              <LetterBadge letter={String.fromCharCode(65 + i)} s={s} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function GlossaryBlockPdf({ block, s }: { block: GlossaryBlock; s: S }) {
  return (
    <View>
      {block.instruction && <Text style={s.instruction}>{block.instruction}</Text>}
      {block.pairs.map((pair, i) => (
        <View key={pair.id} style={[s.row, i === block.pairs.length - 1 ? { borderBottomWidth: 0 } : {}]}>
          <Text style={{ fontWeight: 600, width: "25%" }}>{pair.term}</Text>
          <Text style={{ flex: 1 }}>{pair.definition}</Text>
        </View>
      ))}
    </View>
  );
}

function OpenResponseBlockPdf({ block, s }: { block: OpenResponseBlock; s: S }) {
  return (
    <View>
      {block.question && <Text style={s.instruction}>{block.question}</Text>}
      {Array.from({ length: block.lines }).map((_, i) => (
        <View key={i} style={s.solidWritingLine} />
      ))}
    </View>
  );
}

function WordBankBlockPdf({ block, s }: { block: WordBankBlock; s: S }) {
  return (
    <View style={s.dashedBox}>
      <Text style={{ fontSize: 6, fontWeight: 600, color: "#6b7280", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>
        WORD BANK
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {block.words.map((word, i) => (
          <Text key={i} style={s.chip}>{word}</Text>
        ))}
      </View>
    </View>
  );
}

function NumberLineBlockPdf({ block, s }: { block: NumberLineBlock; s: S }) {
  const range = block.max - block.min;
  const steps = Math.ceil(range / block.step);
  return (
    <View style={{ paddingVertical: 10 }}>
      {/* Main line */}
      <View style={{ height: 1, backgroundColor: "#1a1a1a", width: "100%" }} />
      {/* Ticks */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: -6 }}>
        {Array.from({ length: steps + 1 }).map((_, i) => {
          const value = block.min + i * block.step;
          return (
            <View key={i} style={{ alignItems: "center" }}>
              <View style={{ width: 1, height: 6, backgroundColor: "#1a1a1a" }} />
              <Text style={{ fontSize: 6, color: "#6b7280", marginTop: 2 }}>{value}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/** Render {{blank}} as a visual gap in react-pdf Text nodes (matching fill-in-blank style) */
function renderTfBlanksPdf(text: string): React.ReactNode {
  if (!text.includes("{{blank}}")) return text;
  const parts = text.split("{{blank}}");
  return parts.flatMap((part, i) =>
    i < parts.length - 1
      ? [part, <Text key={i} style={{ backgroundColor: "#f3f4f6", color: "#f3f4f6" }}>{" _____________ "}</Text>]
      : [part]
  );
}

function TrueFalseMatrixBlockPdf({ block, s, showSolutions = false }: { block: TrueFalseMatrixBlock; s: S; showSolutions?: boolean }) {
  return (
    <View>
      {block.instruction && <Text style={s.instruction}>{block.instruction}</Text>}
      {/* Header */}
      <View style={[s.row, { borderBottomWidth: 1 }]}>
        <Text style={{ flex: 1, fontWeight: 700 }}>{block.statementColumnHeader || ""}</Text>
        <View style={{ width: 40, alignItems: "center" }}>
          <Text style={{ fontSize: 8, fontWeight: 500, color: "#6b7280" }}>{block.trueLabel || "R"}</Text>
        </View>
        <View style={{ width: 40, alignItems: "center" }}>
          <Text style={{ fontSize: 8, fontWeight: 500, color: "#6b7280" }}>{block.falseLabel || "F"}</Text>
        </View>
      </View>
      {/* Rows */}
      {block.statements.map((stmt, i) => (
        <View key={stmt.id} style={[s.row, i === block.statements.length - 1 ? { borderBottomWidth: 0 } : {}]}>
          <NumberBadge n={i + 1} s={s} />
          <Text style={{ flex: 1 }}>{renderTfBlanksPdf(stmt.text)}</Text>
          <View style={{ width: 40, alignItems: "center" }}>
            {showSolutions && stmt.correctAnswer ? <FilledSquare /> : <EmptySquare s={s} />}
          </View>
          <View style={{ width: 40, alignItems: "center" }}>
            {showSolutions && !stmt.correctAnswer ? <FilledSquare /> : <EmptySquare s={s} />}
          </View>
        </View>
      ))}
    </View>
  );
}

function ArticleTrainingBlockPdf({ block, s, showSolutions = false }: { block: ArticleTrainingBlock; s: S; showSolutions?: boolean }) {
  const articles = ["der", "das", "die"];
  return (
    <View>
      {block.instruction && <Text style={s.instruction}>{block.instruction}</Text>}
      {/* Header */}
      <View style={[s.row, { borderBottomWidth: 1 }]}>
        <View style={{ width: 20 }} />
        {articles.map((a) => (
          <View key={a} style={{ width: 32, alignItems: "center" }}>
            <Text style={{ fontSize: 8, fontWeight: 500, color: "#6b7280" }}>{a}</Text>
          </View>
        ))}
        <Text style={{ flex: 1, paddingLeft: 4 }} />
        {block.showWritingLine && <View style={{ width: 80 }} />}
      </View>
      {/* Items */}
      {block.items.map((item, i) => (
        <View key={item.id} style={[s.row, i === block.items.length - 1 ? { borderBottomWidth: 0 } : {}]}>
          <NumberBadge n={i + 1} s={s} />
          {articles.map((a) => (
            <View key={a} style={{ width: 32, alignItems: "center" }}>
              {showSolutions && item.correctArticle === a ? <FilledSquare /> : <EmptySquare s={s} />}
            </View>
          ))}
          <Text style={{ flex: 1, paddingLeft: 4 }}>{item.text}</Text>
          {block.showWritingLine && (
            showSolutions ? (
              <Text style={{ width: 80, ...solutionTextStyle, fontSize: 8 }}>{item.correctArticle} {item.text}</Text>
            ) : (
              <View style={{ width: 80, borderBottomWidth: 0.5, borderBottomColor: "#9ca3af50", height: 14 }} />
            )
          )}
        </View>
      ))}
    </View>
  );
}

function OrderItemsBlockPdf({ block, s, showSolutions = false }: { block: OrderItemsBlock; s: S; showSolutions?: boolean }) {
  const shuffled = seededShuffle(block.items, block.id);
  return (
    <View>
      {block.instruction && <Text style={s.instruction}>{block.instruction}</Text>}
      {shuffled.map((item, i) => (
        <View key={item.id} style={[s.row, i === shuffled.length - 1 ? { borderBottomWidth: 0 } : {}]}>
          {showSolutions ? (
            <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: "#22c55e", borderWidth: 1, borderColor: "#16a34a", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 7, fontWeight: 700, color: "#ffffff" }}>{item.correctPosition}</Text>
            </View>
          ) : (
            <EmptySquare s={s} />
          )}
          <Text style={{ flex: 1 }}>{item.text}</Text>
        </View>
      ))}
    </View>
  );
}

function InlineChoicesBlockPdf({ block, s, baseFontSize, showSolutions = false }: { block: InlineChoicesBlock; s: S; baseFontSize: number; showSolutions?: boolean }) {
  const items = migrateInlineChoicesBlock(block);

  return (
    <View>
      {items.map((item, idx) => {
        // Parse the content to extract text and choice markers
        const parts = item.content.split(/(\{\{(?:choice:)?[^}]+\}\})/g);
        let hasTextBefore = false;

        // Build segments: each is either a text node or a choice group (rendered as View row)
        // Since react-pdf Text can't contain View children, we render each line as a View row
        // with mixed Text segments and choice View groups.
        const segments: React.ReactNode[] = [];
        parts.forEach((part, i) => {
          const match = part.match(/\{\{(?:choice:)?(.+)\}\}/);
          if (match) {
            const rawOptions = match[1].split("|");
            const atStart = !hasTextBefore;

            // Normalise: if any option has *, move it to first; otherwise first = correct
            const starIdx = rawOptions.findIndex((o: string) => o.startsWith("*"));
            const options = starIdx >= 0
              ? [rawOptions[starIdx].slice(1), ...rawOptions.filter((_: string, idx: number) => idx !== starIdx).map((o: string) => o.startsWith("*") ? o.slice(1) : o)]
              : rawOptions;
            // options[0] is always correct now

            // Deterministic shuffle for PDF so order varies
            let seed = 0;
            const seedStr = `${item.id || idx}-${i}`;
            for (let si = 0; si < seedStr.length; si++) {
              seed = ((seed << 5) - seed + seedStr.charCodeAt(si)) | 0;
            }
            const shuffled = options.map((opt: string, oi: number) => ({ item: opt, originalIndex: oi }));
            let ss = seed;
            for (let si = shuffled.length - 1; si > 0; si--) {
              ss = (ss * 1664525 + 1013904223) & 0xffffffff;
              const j = Math.floor(((ss >>> 0) / 0xffffffff) * (si + 1));
              [shuffled[si], shuffled[j]] = [shuffled[j], shuffled[si]];
            }

            // Show all options — consistent with T/F: emptySquare centered, same gap
            segments.push(
              <View key={`c${i}`} style={{ flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 2 }}>
                {shuffled.map((sh: { item: string; originalIndex: number }, oi: number) => {
                  const isCorrect = sh.originalIndex === 0;
                  const raw = sh.item;
                  const label = atStart ? raw.charAt(0).toUpperCase() + raw.slice(1) : raw;
                  const filled = showSolutions && isCorrect;
                  return (
                    <View key={oi} style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                      <View style={filled
                        ? { width: 12, height: 12, borderRadius: 3, backgroundColor: "#22c55e", borderWidth: 1, borderColor: "#16a34a" }
                        : s.emptySquare
                      } />
                      <Text style={{
                        fontWeight: 600,
                        ...(filled ? { color: "#166534" } : {}),
                      }}>{label}</Text>
                    </View>
                  );
                })}
              </View>,
            );
            return;
          }
          if (part.trim().length > 0) hasTextBefore = true;
          if (part) {
            // Handle <sup> tags
            const supParts = part.split(/(<sup>[^<]*<\/sup>)/g);
            const hasSup = supParts.some((p) => p.startsWith("<sup>"));
            if (hasSup) {
              segments.push(
                <Text key={`t${i}`}>
                  {supParts.map((sp, si) => {
                    const sm = sp.match(/^<sup>([^<]*)<\/sup>$/);
                    if (sm) {
                      return <Text key={si} style={{ fontSize: baseFontSize * 0.6, color: "#6b7280" }}>{sm[1]}</Text>;
                    }
                    return <Text key={si}>{sp}</Text>;
                  })}
                </Text>,
              );
            } else {
              segments.push(<Text key={`t${i}`}>{part}</Text>);
            }
          }
        });

        return (
          <View key={item.id || idx} style={[s.row, idx === items.length - 1 ? { borderBottomWidth: 0 } : {}]}>
            <NumberBadge n={idx + 1} s={s} />
            <View style={{ flex: 1, flexDirection: "row", alignItems: "center", flexWrap: "wrap" }}>
              {segments}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function WordSearchBlockPdf({ block, s }: { block: WordSearchBlock; s: S }) {
  const cellSize = 16;
  return (
    <View>
      {block.showWordList && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
          {block.words.map((word, i) => (
            <Text key={i} style={[s.chip, { textTransform: "uppercase" }]}>{word}</Text>
          ))}
        </View>
      )}
      <View style={{ alignItems: "center" }}>
        {block.grid.map((row, ri) => (
          <View key={ri} style={{ flexDirection: "row" }}>
            {row.map((cell, ci) => (
              <View
                key={ci}
                style={{
                  width: cellSize,
                  height: cellSize,
                  borderWidth: 0.5,
                  borderColor: "#e5e7eb",
                  alignItems: "center",
                  justifyContent: "center",
                  borderTopLeftRadius: ri === 0 && ci === 0 ? 3 : 0,
                  borderTopRightRadius: ri === 0 && ci === row.length - 1 ? 3 : 0,
                  borderBottomLeftRadius: ri === block.grid.length - 1 && ci === 0 ? 3 : 0,
                  borderBottomRightRadius: ri === block.grid.length - 1 && ci === row.length - 1 ? 3 : 0,
                }}
              >
                <Text style={{ fontSize: 8, fontWeight: 500, fontFamily: "Asap Condensed" }}>{cell}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

function SortingCategoriesBlockPdf({ block, s, showSolutions = false }: { block: SortingCategoriesBlock; s: S; showSolutions?: boolean }) {
  const shuffledItems = seededShuffle(block.items, block.id);
  const colWidth = `${Math.floor(100 / block.categories.length) - 1}%`;
  // Build item ID → text lookup
  const itemMap: Record<string, string> = {};
  block.items.forEach((item) => { itemMap[item.id] = item.text; });
  return (
    <View>
      {block.instruction && <Text style={s.instruction}>{block.instruction}</Text>}
      {/* Shuffled item chips */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        {shuffledItems.map((item) => (
          <Text key={item.id} style={s.chipBorder}>{item.text}</Text>
        ))}
      </View>
      {/* Category boxes */}
      <View style={{ flexDirection: "row", gap: 8 }}>
        {block.categories.map((cat) => (
          <View key={cat.id} style={{ width: colWidth, borderWidth: 0.5, borderColor: "#e5e7eb", borderRadius: 6, overflow: "hidden" }}>
            <View style={{ backgroundColor: "#f3f4f6", paddingHorizontal: 8, paddingVertical: 4 }}>
              <Text style={{ fontSize: 8, fontWeight: 600 }}>{cat.label}</Text>
            </View>
            <View style={{ minHeight: 60, padding: 6 }}>
              {showSolutions && cat.correctItems.map((itemId) => (
                <Text key={itemId} style={{ fontSize: 7, ...solutionTextStyle, marginBottom: 2 }}>
                  {itemMap[itemId] || itemId}
                </Text>
              ))}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function UnscrambleWordsBlockPdf({ block, s, showSolutions = false }: { block: UnscrambleWordsBlock; s: S; showSolutions?: boolean }) {
  const maxLen = Math.max(...block.words.map((w) => w.word.length), 0);
  const monoWidth = maxLen * 5; // approximate width for monospace

  return (
    <View>
      {block.instruction && <Text style={s.instruction}>{block.instruction}</Text>}
      {block.words.map((item, i) => {
        const scrambled = scrambleWordDeterministic(
          item.word,
          block.keepFirstLetter,
          block.lowercaseAll,
          getSeed(block.id, item.id),
        );
        return (
          <View key={item.id} style={[s.row, i === block.words.length - 1 ? { borderBottomWidth: 0 } : {}]}>
            <NumberBadge n={i + 1} s={s} />
            <Text style={{ fontFamily: "Asap Condensed", fontWeight: 600, width: monoWidth }}>{scrambled}</Text>
            <Text style={{ color: "#6b7280" }}>→</Text>
            {showSolutions ? (
              <Text style={{ flex: 1, ...solutionTextStyle }}>{item.word}</Text>
            ) : (
              <View style={{ flex: 1, borderBottomWidth: 0.5, borderBottomColor: "#9ca3af50", borderBottomStyle: "dashed", height: 14 }} />
            )}
          </View>
        );
      })}
    </View>
  );
}

function FixSentencesBlockPdf({ block, s, showSolutions = false }: { block: FixSentencesBlock; s: S; showSolutions?: boolean }) {
  return (
    <View>
      {block.instruction && <Text style={s.instruction}>{block.instruction}</Text>}
      {block.sentences.map((item, i) => {
        const parts = item.sentence.split(" | ");
        const shuffled = seededShuffle(parts, item.id);
        return (
          <View key={item.id} style={{ paddingVertical: 4 }} wrap={false}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
              <View style={{ marginTop: 3 }}>
                <NumberBadge n={i + 1} s={s} />
              </View>
              <View style={{ flex: 1 }}>
                {/* Scrambled chips */}
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
                  {shuffled.map((part, pi) => (
                    <Text
                      key={pi}
                      style={{
                        paddingHorizontal: 6,
                        paddingVertical: 3,
                        borderRadius: 4,
                        borderWidth: 0.5,
                        borderColor: "#e5e7eb",
                        backgroundColor: "#f3f4f6",
                        fontSize: 8,
                        fontWeight: 500,
                      }}
                    >
                      {part}
                    </Text>
                  ))}
                </View>
                {/* Writing line or solution */}
                {showSolutions ? (
                  <Text style={{ marginTop: 6, ...solutionTextStyle, fontSize: 8 }}>{parts.join(" ")}</Text>
                ) : (
                  <View style={{ marginTop: 6, height: 14, borderBottomWidth: 0.5, borderBottomColor: "#9ca3af50", borderBottomStyle: "dashed" }} />
                )}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function CompleteSentencesBlockPdf({ block, s }: { block: CompleteSentencesBlock; s: S }) {
  return (
    <View>
      {block.instruction && <Text style={s.instruction}>{block.instruction}</Text>}
      {block.sentences.map((item, i) => (
        <View key={item.id} style={{ paddingVertical: 4 }} wrap={false}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
            <View style={{ marginTop: 3 }}>
              <NumberBadge n={i + 1} s={s} />
            </View>
            <View style={{ flex: 1 }}>
              <Text>{item.beginning}</Text>
              <View style={{ marginTop: 6, height: 14, borderBottomWidth: 0.5, borderBottomColor: "#9ca3af50", borderBottomStyle: "dashed" }} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

function VerbTableBlockPdf({
  block,
  s,
  primaryColor,
}: {
  block: VerbTableBlock;
  s: S;
  primaryColor: string;
}) {
  const renderRows = (rows: typeof block.singularRows) => {
    return rows.map((row, i) => {
      const showConj = row.showOverride === "show" || (row.showOverride === null && block.showConjugations);
      const showConj2 = block.splitConjugation
        ? (row.showOverride2 === "show" || (row.showOverride2 === null && block.showConjugations))
        : false;

      return (
        <View key={row.id} style={[s.row, i === rows.length - 1 ? { borderBottomWidth: 0 } : {}]}>
          <Text style={{ width: "15%", fontSize: "0.7em" as unknown as number, color: "#6b7280", textTransform: "uppercase" }}>{row.person}</Text>
          {row.detail && <Text style={{ width: "15%", fontSize: "0.7em" as unknown as number, color: "#6b7280" }}>{row.detail}</Text>}
          <Text style={{ width: row.detail ? "15%" : "30%", fontWeight: 700 }}>{row.pronoun}</Text>
          <View style={{ width: block.splitConjugation ? "27.5%" : "55%" }}>
            {showConj ? (
              <Text style={{ fontWeight: 700, color: primaryColor }}>{row.conjugation}</Text>
            ) : (
              <View style={{ backgroundColor: "#f3f4f6", borderRadius: 2, height: 12, minWidth: 60 }} />
            )}
          </View>
          {block.splitConjugation && (
            <View style={{ width: "27.5%" }}>
              {showConj2 ? (
                <Text style={{ fontWeight: 700, color: primaryColor }}>{row.conjugation2 || ""}</Text>
              ) : (
                <View style={{ backgroundColor: "#f3f4f6", borderRadius: 2, height: 12, minWidth: 60 }} />
              )}
            </View>
          )}
        </View>
      );
    });
  };

  return (
    <View>
      {/* Verb header */}
      <View style={{ borderBottomWidth: 1.5, borderBottomColor: primaryColor, paddingVertical: 4, marginBottom: 4 }}>
        <Text style={{ fontWeight: 700, color: primaryColor }}>{block.verb}</Text>
      </View>
      {/* Singular */}
      <View style={{ paddingVertical: 2, borderBottomWidth: 0.5, borderBottomColor: "#e5e7eb" }}>
        <Text style={{ color: "#6b7280", fontWeight: 700, textTransform: "uppercase", fontSize: 7 }}>Singular</Text>
      </View>
      {renderRows(block.singularRows)}
      {/* Plural */}
      <View style={{ paddingVertical: 2, borderBottomWidth: 0.5, borderBottomColor: "#e5e7eb", marginTop: 4 }}>
        <Text style={{ color: "#6b7280", fontWeight: 700, textTransform: "uppercase", fontSize: 7 }}>Plural</Text>
      </View>
      {renderRows(block.pluralRows)}
    </View>
  );
}

function ColumnsBlockPdf({
  block,
  s,
  baseFontSize,
  imageMap,
  primaryColor,
  showSolutions = false,
}: {
  block: ColumnsBlock;
  s: S;
  baseFontSize: number;
  imageMap: Record<string, string>;
  primaryColor: string;
  showSolutions?: boolean;
}) {
  const cols = block.columns || 2;
  const colWidth = `${Math.floor(100 / cols) - 1}%`;
  return (
    <View style={{ flexDirection: "row", gap: 10 }} wrap={false}>
      {(block.children || []).map((colBlocks, ci) => (
        <View key={ci} style={{ width: colWidth }}>
          {colBlocks.map((child, bi) => (
            <View key={child.id} style={bi < colBlocks.length - 1 ? s.blockGap : {}}>
              <BlockPdf
                block={child}
                s={s}
                baseFontSize={baseFontSize}
                imageMap={imageMap}
                primaryColor={primaryColor}
                showSolutions={showSolutions}
              />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

// ─── Block Dispatcher ───────────────────────────────────────

function BlockPdf({
  block,
  s,
  baseFontSize,
  imageMap,
  primaryColor,
  showSolutions = false,
}: {
  block: WorksheetBlock;
  s: S;
  baseFontSize: number;
  imageMap: Record<string, string>;
  primaryColor: string;
  showSolutions?: boolean;
}) {
  switch (block.type) {
    case "heading":
      return <HeadingBlockPdf block={block} s={s} />;
    case "text":
      return <TextBlockPdf block={block} s={s} baseFontSize={baseFontSize} imageMap={imageMap} />;
    case "image":
      return <ImageBlockPdf block={block} imageMap={imageMap} />;
    case "image-cards":
      return <ImageCardsBlockPdf block={block} s={s} imageMap={imageMap} />;
    case "text-cards":
      return <TextCardsBlockPdf block={block} s={s} />;
    case "spacer":
      return <SpacerBlockPdf block={block} />;
    case "divider":
      return <DividerBlockPdf block={block} />;
    case "multiple-choice":
      return <MultipleChoiceBlockPdf block={block} s={s} showSolutions={showSolutions} />;
    case "fill-in-blank":
      return <FillInBlankBlockPdf block={block} s={s} baseFontSize={baseFontSize} showSolutions={showSolutions} />;
    case "matching":
      return <MatchingBlockPdf block={block} s={s} showSolutions={showSolutions} />;
    case "glossary":
      return <GlossaryBlockPdf block={block} s={s} />;
    case "open-response":
      return <OpenResponseBlockPdf block={block} s={s} />;
    case "word-bank":
      return <WordBankBlockPdf block={block} s={s} />;
    case "number-line":
      return <NumberLineBlockPdf block={block} s={s} />;
    case "true-false-matrix":
      return <TrueFalseMatrixBlockPdf block={block} s={s} showSolutions={showSolutions} />;
    case "article-training":
      return <ArticleTrainingBlockPdf block={block} s={s} showSolutions={showSolutions} />;
    case "order-items":
      return <OrderItemsBlockPdf block={block} s={s} showSolutions={showSolutions} />;
    case "inline-choices":
      return <InlineChoicesBlockPdf block={block} s={s} baseFontSize={baseFontSize} showSolutions={showSolutions} />;
    case "word-search":
      return <WordSearchBlockPdf block={block} s={s} />;
    case "sorting-categories":
      return <SortingCategoriesBlockPdf block={block} s={s} showSolutions={showSolutions} />;
    case "unscramble-words":
      return <UnscrambleWordsBlockPdf block={block} s={s} showSolutions={showSolutions} />;
    case "fix-sentences":
      return <FixSentencesBlockPdf block={block} s={s} showSolutions={showSolutions} />;
    case "complete-sentences":
      return <CompleteSentencesBlockPdf block={block} s={s} />;
    case "verb-table":
      return <VerbTableBlockPdf block={block} s={s} primaryColor={primaryColor} />;
    case "columns":
      return <ColumnsBlockPdf block={block} s={s} baseFontSize={baseFontSize} imageMap={imageMap} primaryColor={primaryColor} showSolutions={showSolutions} />;
    default:
      return null;
  }
}

// ─── Main Document Component ────────────────────────────────

function WorksheetPdf({
  title,
  worksheetId,
  blocks,
  settings,
  brandFonts,
  brandSettings,
  logoDataUri,
  imageMap,
  showSolutions = false,
}: {
  title: string;
  worksheetId: string;
  blocks: WorksheetBlock[];
  settings: WorksheetSettings;
  brandFonts: BrandFonts;
  brandSettings: BrandSettings;
  logoDataUri: string;
  imageMap: Record<string, string>;
  showSolutions?: boolean;
}) {
  const s = createStyles(settings, brandFonts);
  const baseFontSize = settings.fontSize * 0.75;
  const primaryColor = brandFonts.primaryColor;

  // Template variable replacements
  const now = new Date();
  const year = now.getFullYear();
  const dateStr = now.toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const vars = {
    worksheetId,
    organization: brandSettings.organization || "",
    teacher: brandSettings.teacher || "",
  };
  const headerText = replaceVars(stripHtml(brandSettings.headerRight || ""), vars);

  // Use brandSettings footer values or fall back to hardcoded defaults
  const footerLeft = brandSettings.footerLeft
    ? replaceVars(stripHtml(brandSettings.footerLeft), vars)
    : `© ${year} lingostar | Marcel Allenspach\nAlle Rechte vorbehalten`;
  const footerCenter = brandSettings.footerCenter
    ? replaceVars(stripHtml(brandSettings.footerCenter), vars)
    : ""; // page numbers handled via render prop fallback
  const footerRight = brandSettings.footerRight
    ? replaceVars(stripHtml(brandSettings.footerRight), vars)
    : `${worksheetId.toUpperCase()}\n${dateStr}`;

  // Filter visible blocks (both + print)
  const visibleBlocks = blocks.filter(
    (b) => b.visibility === "both" || b.visibility === "print",
  );

  return (
    <Document title={title} author={brandSettings.organization || "arbeitsblatt"}>
      <Page
        size={settings.pageSize === "a4" ? "A4" : "LETTER"}
        orientation={settings.orientation}
        style={s.page}
      >
        {/* ─── Fixed Header ─── */}
        {settings.showHeader && (
          <View style={s.header} fixed>
            <Text style={s.headerText}>{headerText}</Text>
            {logoDataUri ? (
              <Image src={logoDataUri} style={s.headerLogo} />
            ) : null}
          </View>
        )}

        {/* ─── Fixed Footer ─── */}
        {settings.showFooter && (
          <View style={s.footer} fixed>
            <Text style={s.footerText}>{footerLeft}</Text>
            <Text
              style={s.footerCenter}
              render={({ pageNumber, totalPages }) => {
                // Replace {current_page} and {no_of_pages} in footerCenter
                let text = footerCenter;
                text = text.replace(/\{current_page\}/g, String(pageNumber));
                text = text.replace(/\{no_of_pages\}/g, String(totalPages));
                // If no template vars but footerCenter is present, show it as-is
                // If footerCenter is empty, show default page numbers
                if (!text && !footerCenter) {
                  return `${pageNumber} / ${totalPages}`;
                }
                return text;
              }}
            />
            <Text style={s.footerRight}>{footerRight}</Text>
          </View>
        )}

        {/* ─── Solutions badge (fixed, top-left, every page — aligned with header/logo Y) ─── */}
        {showSolutions && (
          <View
            fixed
            style={{
              position: "absolute",
              top: mm(15),
              left: mm(settings.margins.left + 5),
            }}
          >
            <View style={{ backgroundColor: "#dcfce7", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, borderWidth: 0.5, borderColor: "#86efac" }}>
              <Text style={{ fontSize: 7, fontWeight: 600, color: "#166534" }}>Lösung</Text>
            </View>
          </View>
        )}

        {/* ─── Body Content ─── */}
        {visibleBlocks.map((block, i) => (
          <View key={block.id} style={i < visibleBlocks.length - 1 ? s.blockGap : {}}>
            <BlockPdf
              block={block}
              s={s}
              baseFontSize={baseFontSize}
              imageMap={imageMap}
              primaryColor={primaryColor}
              showSolutions={showSolutions}
            />
          </View>
        ))}
      </Page>
    </Document>
  );
}

// ─── POST Handler ───────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  const { id } = await params;
  const locale = req.nextUrl.searchParams.get("locale") as "DE" | "CH" | "NEUTRAL" | null;
  const isSwiss = locale === "CH";
  const showSolutions = req.nextUrl.searchParams.get("solutions") === "1";

  const worksheet = await prisma.worksheet.findFirst({
    where: { id, userId } as Parameters<typeof prisma.worksheet.findFirst>[0] extends { where?: infer W } ? W : never,
  });
  if (!worksheet) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    // Parse settings
    const rawSettings = worksheet.settings as Record<string, unknown> | null;
    const brand = ((rawSettings?.brand as string) || "edoomio") as Brand;
    const brandFonts = BRAND_FONTS[brand];
    const defaultBrandSettings = DEFAULT_BRAND_SETTINGS[brand];

    const settings: WorksheetSettings = {
      ...DEFAULT_SETTINGS,
      ...rawSettings,
      brand,
      fontFamily: rawSettings?.fontFamily as string || brandFonts.bodyFont,
      brandSettings: {
        ...defaultBrandSettings,
        ...(rawSettings?.brandSettings as Partial<BrandSettings> || {}),
      },
    };

    const brandSettings = settings.brandSettings;

    // Parse blocks
    const blocksData = worksheet.blocks as unknown;
    const blocks: WorksheetBlock[] = Array.isArray(blocksData)
      ? (blocksData as WorksheetBlock[])
      : [];

    // Prepare logo
    let logoDataUri = "";
    if (settings.showHeader && brandSettings.logo) {
      logoDataUri = await readLogoAsPngDataUri(brandSettings.logo, 200);
    }

    // Collect all image URLs and compress them
    const imageUrls = new Set<string>();
    for (const block of blocks) {
      if (block.type === "image" && block.src) imageUrls.add(block.src);
      if (block.type === "text" && block.imageSrc) imageUrls.add(block.imageSrc);
      if (block.type === "image-cards") {
        for (const item of block.items) {
          if (item.src) imageUrls.add(item.src);
        }
      }
      if (block.type === "columns") {
        for (const col of block.children || []) {
          for (const child of col) {
            if (child.type === "image" && child.src) imageUrls.add(child.src);
            if (child.type === "text" && child.imageSrc) imageUrls.add(child.imageSrc);
          }
        }
      }
    }

    const imageMap: Record<string, string> = {};
    await Promise.all(
      Array.from(imageUrls).map(async (url) => {
        imageMap[url] = await compressImage(url);
      }),
    );

    // Apply ß → ss replacement for Swiss locale, then layer manual CH overrides
    const pdfTitle = isSwiss ? replaceEszett(worksheet.title) : worksheet.title;
    let pdfBlocks = isSwiss ? replaceEszett(blocks) : blocks;
    const pdfSettings = isSwiss ? replaceEszett(settings) : settings;
    const pdfBrandSettings = isSwiss ? replaceEszett(brandSettings) : brandSettings;

    // Apply manual CH overrides on top of automatic ß→ss replacement
    if (isSwiss && settings.chOverrides) {
      pdfBlocks = applyChOverrides(pdfBlocks, settings.chOverrides);
    }

    console.log(
      `[Worksheet PDF v2] Generating react-pdf for "${pdfTitle}" (${pdfBlocks.length} blocks, brand=${brand}, locale=${locale || "DE"}, solutions=${showSolutions})`,
    );

    const buffer = Buffer.from(
      await renderToBuffer(
        <WorksheetPdf
          title={pdfTitle}
          worksheetId={id}
          blocks={pdfBlocks}
          settings={pdfSettings}
          brandFonts={brandFonts}
          brandSettings={pdfBrandSettings}
          logoDataUri={logoDataUri}
          imageMap={imageMap}
          showSolutions={showSolutions}
        />,
      ),
    );

    const safeTitle = worksheet.title
      .replace(/[\u2013\u2014]/g, "-")
      .replace(/[^\x20-\x7E]/g, "_");

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeTitle}.pdf"`,
      },
    });
  } catch (error) {
    console.error("[Worksheet PDF v2] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `PDF generation failed: ${message}` },
      { status: 500 },
    );
  }
}
