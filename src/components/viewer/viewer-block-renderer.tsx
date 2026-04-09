"use client";

import React, { useMemo, useState } from "react";
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
  FillInBlankItemsBlock,
  MatchingBlock,
  TwoColumnFillBlock,
  GlossaryBlock,
  OpenResponseBlock,
  WordBankBlock,
  NumberLineBlock,
  ColumnsBlock,
  TrueFalseMatrixBlock,
  ArticleTrainingBlock,
  ArticleAnswer,
  OrderItemsBlock,
  InlineChoicesBlock,
  migrateInlineChoicesBlock,
  WordSearchBlock,
  SortingCategoriesBlock,
  UnscrambleWordsBlock,
  FixSentencesBlock,
  CompleteSentencesBlock,
  VerbTableBlock,
  ChartBlock,
  NumberedLabelBlock,
  DialogueBlock,
  PageBreakBlock,
  WritingLinesBlock,
  WritingRowsBlock,
  TextSnippetBlock,
  EmailSkeletonBlock,
  JobApplicationBlock,
  DosAndDontsBlock,
  TextComparisonBlock,
  NumberedItemsBlock,
  ChecklistBlock,
  AccordionBlock,
  LogoDividerBlock,
  AiPromptBlock,
  AiToolBlock,
  AudioBlock,
  ScheduleBlock,
  WebsiteBlock,
  TableBlock,
  BRAND_ICON_LOGOS,
  BRAND_FONTS,
  Brand,
  ViewMode,
} from "@/types/worksheet";
import { ThumbsUp, ThumbsDown, ArrowRight, BadgeAlert, Siren, Goal, Flag, Sparkles, Loader2, Bot, FormInput, Plus, Minus, ChevronsDown, ChevronsUp, Copy, ClipboardCheck, MessageCircle, CircleHelp } from "lucide-react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { prepareTiptapHtml, stripOuterP } from "@/lib/print-html-normalize";
import { ToolWorkflowShell } from "@/ai-tools/components/tool-workflow-shell";
import s from "./viewer-blocks.module.css";

/** Safe lookup for BRAND_FONTS — falls back to edoomio if brand slug not in static map */
function getBrandFonts(brand: string) {
  return BRAND_FONTS[brand] || BRAND_FONTS["edoomio"];
}

const TASK_BLOCK_TYPES = new Set(["true-false-matrix", "order-items", "unscramble-words"]);
const NUMBER_BADGE_CLASS = "flex h-5 w-5 min-w-5 items-center justify-center rounded-[3px] bg-slate-100 text-slate-700 ring-1 ring-slate-100 font-bold leading-none text-cv-micro";
const CONTROL_BOX_CLASS = `inline-flex items-center justify-center shrink-0 ${s.controlBox}`;
const CONTROL_BOX_FILLED_CLASS = `${CONTROL_BOX_CLASS} ${s.controlBoxFilled}`;

/** Deterministic pseudo-random order for stable render output across re-renders/PDF generation. */
function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function deterministicShuffle<T>(items: T[], seedKey: string): T[] {
  const out = [...items];
  const rand = mulberry32(hashString(seedKey));
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ─── German marker helper ────────────────────────────────────
/** Parse {{de:…}} markers and render the German text in italic */
function renderDeMarkers(text: string): React.ReactNode {
  const parts = text.split(/(\{\{de:.*?\}\})/g);
  if (parts.length === 1) return text;
  return parts.map((part, i) => {
    const m = part.match(/^\{\{de:(.*?)\}\}$/);
    if (m) {
      return (
        <em key={i} className="not-italic font-semibold">
          «{m[1]}»
        </em>
      );
    }
    return part;
  });
}

// ─── Task pill + container ───────────────────────────────────
function colorWithAlpha(color: string, alpha: number): string {
  const clamped = Math.max(0, Math.min(1, alpha));
  const a = Math.round(clamped * 255);
  const hexA = a.toString(16).padStart(2, "0");
  const short = color.match(/^#([0-9a-fA-F]{3})$/);
  if (short) {
    const [r, g, b] = short[1].split("");
    return `#${r}${r}${g}${g}${b}${b}${hexA}`;
  }
  const full = color.match(/^#([0-9a-fA-F]{6})$/);
  if (full) {
    return `${color}${hexA}`;
  }
  return color;
}

function TaskContainer({
  showPill,
  taskNumber,
  lessonLabel,
  instruction,
  instructionStyle,
  children,
  accentColor,
}: {
  showPill: boolean;
  taskNumber?: number;
  lessonLabel?: string;
  instruction?: string;
  instructionStyle?: React.CSSProperties;
  children: React.ReactNode;
  accentColor?: string | null;
}) {
  const headerBg = accentColor || "#F9F6ED";
  const headerText = accentColor ? "#ffffff" : "inherit";
  const panelBg = "#ffffff";
  const panelBorder = accentColor || "#F9F6ED";
  return (
    <div>
      {(showPill || instruction) && (
        <div className="flex items-end gap-3">
          {showPill && (
          <div
            className="py-1 px-3 text-xs font-semibold rounded-t-sm text-center uppercase flex items-center justify-center"
            style={{ backgroundColor: headerBg, color: headerText }}
          >
            AUFGABE{taskNumber != null ? ` ${lessonLabel ? `${lessonLabel}.` : ""}${String(taskNumber).padStart(2, "0")}` : ""}
          </div>
          )}
          {instruction && (
            <p
              className="font-normal pb-1"
              style={{
                color: accentColor || "var(--color-primary)",
                ...(instructionStyle || {}),
              }}
            >
              {instruction}
            </p>
          )}
        </div>
      )}
      <div
        className={`p-4 border-2 ${showPill ? "rounded-b-lg rounded-tr-lg" : "rounded-lg"}`}
        style={{ backgroundColor: panelBg, borderColor: panelBorder }}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Handwriting helper ──────────────────────────────────────
/** Check whether a string contains ++…++ handwriting markers */
function hasHandwriting(text: string): boolean {
  return /\+\+.+?\+\+/.test(text);
}
/** Parse ++text++ markers and render as handwriting-styled spans */
function renderHandwriting(text: string): React.ReactNode {
  const parts = text.split(/(\+\+.*?\+\+)/g);
  if (parts.length === 1) return text;
  return parts.map((part, i) => {
    if (part.startsWith("++") && part.endsWith("++")) {
      const inner = part.slice(2, -2);
      return (
        <span
          key={i}
          className={`text-blue-500 ${s.handwriting}`}
        >
          {inner}
        </span>
      );
    }
    return part;
  });
}

// ─── Static blocks ──────────────────────────────────────────

// Helper: collect all numbered-label blocks in document order (top-level + inside columns/accordion)
function collectNumberedLabelBlocks(blocks: WorksheetBlock[]): { id: string; startNumber: number }[] {
  const result: { id: string; startNumber: number }[] = [];
  for (const b of blocks) {
    if (b.type === "numbered-label") result.push({ id: b.id, startNumber: b.startNumber });
    if (b.type === "columns") {
      for (const col of b.children) {
        for (const child of col) {
          if (child.type === "numbered-label") result.push({ id: child.id, startNumber: child.startNumber });
        }
      }
    }
    if (b.type === "accordion") {
      for (const item of b.items) {
        for (const child of item.children) {
          if (child.type === "numbered-label") result.push({ id: child.id, startNumber: child.startNumber });
        }
      }
    }
  }
  return result;
}

function NumberedLabelView({ block, originalBlock, allBlocks, primaryColor = "#1a1a1a" }: { block: NumberedLabelBlock; originalBlock?: NumberedLabelBlock; allBlocks?: WorksheetBlock[]; primaryColor?: string }) {
  let displayNumber: string;
  if (allBlocks) {
    const all = collectNumberedLabelBlocks(allBlocks);
    const idx = all.findIndex((b) => b.id === block.id);
    displayNumber = String(block.startNumber + (idx >= 0 ? idx : 0)).padStart(2, "0");
  } else {
    displayNumber = String(block.startNumber).padStart(2, "0");
  }

  const buildLabel = ({
    prefix,
    suffix,
    withNumber,
    withSuffixGap,
  }: {
    prefix: string;
    suffix: string;
    withNumber: boolean;
    withSuffixGap: boolean;
  }) => `${prefix}${withNumber ? displayNumber : ""}${suffix ? `${withSuffixGap ? "\u2003" : ""}${suffix}` : ""}`;

  const currentLabel = buildLabel({
    prefix: block.prefix,
    suffix: block.suffix,
    withNumber: true,
    withSuffixGap: true,
  });
  const translatedLabelNoNumber = buildLabel({
    prefix: block.prefix,
    suffix: block.suffix,
    withNumber: false,
    withSuffixGap: false,
  });
  const originalLabel = originalBlock
    ? buildLabel({
        prefix: originalBlock.prefix,
        suffix: originalBlock.suffix,
        withNumber: true,
        withSuffixGap: true,
      })
    : undefined;
  const isBilingual = !!block.bilingual && !!originalLabel && originalLabel !== currentLabel;

  return (
    <div className="rounded px-2 py-1" style={{ backgroundColor: `${primaryColor}14` }}>
      {isBilingual ? (
        <span className={s.numberedLabel} style={{ color: primaryColor }}>
          <span style={{ fontWeight: 700 }}>{originalLabel}</span>
          <span style={{ fontWeight: 400 }}> | </span>
          <span style={{ fontWeight: 400 }}>{translatedLabelNoNumber}</span>
        </span>
      ) : (
        <span className={`font-semibold ${s.numberedLabel}`} style={{ color: primaryColor }}>
          {currentLabel}
        </span>
      )}
    </div>
  );
}

function HeadingView({ block, originalBlock, brand, headlineFont, headingWeights, isNonLatin, translationScale, primaryColor }: { block: HeadingBlock; originalBlock?: HeadingBlock; brand?: Brand; headlineFont?: string; headingWeights?: { h1: number; h2: number; h3: number }; isNonLatin?: boolean; translationScale?: number; primaryColor?: string }) {
  const Tag = `h${block.level}` as keyof React.JSX.IntrinsicElements;
  const sizes = { 1: "text-cv-3xl", 2: "text-cv-2xl", 3: "text-cv-xl" };
  const brandFonts = getBrandFonts(brand || "edoomio");
  const resolvedHeadlineFont = headlineFont || brandFonts.headlineFont;
  const resolvedHeadingWeight = headingWeights?.[`h${block.level}` as "h1" | "h2" | "h3"] ?? brandFonts.headlineWeight;
  const style: React.CSSProperties = {
    ...(block.level === 1 ? { marginBottom: -4 } : {}),
    ...(resolvedHeadlineFont ? { fontFamily: resolvedHeadlineFont } : {}),
    fontWeight: resolvedHeadingWeight,
    color: primaryColor,
  };
  const isBilingual = block.bilingual && originalBlock && originalBlock.content !== block.content;
  if (isBilingual) {
    const scale = translationScale ?? (isNonLatin ? 0.9 : undefined);
    return (
      <Tag className={sizes[block.level]} style={style}>
        <span style={{ ...(resolvedHeadlineFont ? { fontFamily: resolvedHeadlineFont } : {}), fontWeight: resolvedHeadingWeight }}>{originalBlock.content}</span>
        <span style={{ fontWeight: 400 }}> | </span>
        <span style={{ ...(scale ? { fontSize: `${scale}em` } : {}), fontWeight: 400 }}>{block.content}</span>
      </Tag>
    );
  }
  return <Tag className={sizes[block.level]} style={style}>{block.content}</Tag>;
}

function TextView({ block, originalBlock, mode, bodyFont, originalBodyFont, bodyFontSize, isNonLatin, translationScale, primaryColor = "#1a1a1a" }: { block: TextBlock; originalBlock?: TextBlock; mode: ViewMode; bodyFont?: string; originalBodyFont?: string; bodyFontSize?: string; isNonLatin?: boolean; translationScale?: number; primaryColor?: string }) {
  const isExample = block.textStyle === "example";
  const isExampleStandard = block.textStyle === "example-standard";
  const isExampleImproved = block.textStyle === "example-improved";
  const hasExampleBox = isExample || isExampleStandard || isExampleImproved;

  const isHinweis = block.textStyle === "hinweis";
  const isHinweisWichtig = block.textStyle === "hinweis-wichtig";
  const isHinweisAlarm = block.textStyle === "hinweis-alarm";
  const isLernziel = block.textStyle === "lernziel";
  const isKompetenzziele = block.textStyle === "kompetenzziele";
  const isHandlungsziele = block.textStyle === "handlungsziele";
  const isFragen = block.textStyle === "fragen";
  const isRedemittel = block.textStyle === "redemittel";
  const hasHinweisBox = isHinweis || isHinweisWichtig || isHinweisAlarm || isLernziel;
  const isRows = block.textStyle === "rows" || isKompetenzziele || isHandlungsziele || isRedemittel || isFragen;
  const isMetadaten = block.textStyle === "metadaten";
  const isStandard = block.textStyle === "standard" || !block.textStyle;

  // Inline SVG icon for the "rows" style — replaces CSS background-image/::before entirely.
  // background-image (even on real elements, not just ::before) is NOT rendered by Chromium's PDF engine.
  // Inline <svg> elements ARE rendered correctly.
  // Lucide line-dot-right-horizontal icon injected into each <li> as a real inline SVG element.
  // CSS background-image on ::before is not rendered by Chromium's PDF engine.
  const LI_BULLET_SVG = `<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="position:absolute;left:-1.75rem;top:var(--li-icon-top,0.95em);transform:translateY(-50%);pointer-events:none;"><path d="M3 12L15 12"/><circle cx="18" cy="12" r="3"/></svg>`;
  const injectLiIcons = (html: string): string => {
    if (!html.includes("<li")) return html;
    return html.replace(/<li(\b[^>]*)?>/gi, (_, attrs) => `<li${attrs ?? ""}>${LI_BULLET_SVG}`);
  };

  const RowsIconSvg = () => {
    const p = { width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
    if (isKompetenzziele) return <svg {...p}><path d="M22 12A10 10 0 1 1 12 2"/><path d="M22 2 12 12"/><path d="M16 2h6v6"/></svg>;
    if (isHandlungsziele) return <svg {...p}><path d="M17 12H3"/><path d="m11 18 6-6-6-6"/><path d="M21 5v14"/></svg>;
    if (isFragen) return <CircleHelp size={14} strokeWidth={2.5} />;
    if (isRedemittel) return <MessageCircle size={14} strokeWidth={2.5} />;
    return <svg {...p}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>;
  };

  // Bilingual: show 2-column layout when block is marked bilingual, a translation is active,
  // and the original content differs from the translated content
  const isBilingual = block.bilingual && originalBlock && originalBlock.content !== block.content;
  const showBilingualDivider = block.bilingualDivider === true;
  const resolvedBodyFont = bodyFont || "inherit";
  const resolvedOriginalBodyFont = originalBodyFont || resolvedBodyFont;
  const baseTextStyle: React.CSSProperties = {
    ...(resolvedBodyFont !== "inherit" ? { fontFamily: resolvedBodyFont } : {}),
    ...(bodyFontSize ? { fontSize: bodyFontSize } : {}),
  };
  // Font override for the original (German) column in bilingual mode — ensures brand font for Latin text
  const originalFontStyle: React.CSSProperties | undefined = isBilingual
    ? {
        ...(resolvedOriginalBodyFont !== "inherit" ? { fontFamily: resolvedOriginalBodyFont } : {}),
        ...(bodyFontSize ? { fontSize: bodyFontSize } : {}),
      }
    : undefined;
  // Reduce font size for non-Latin translated text (e.g. Cyrillic renders visually larger at same pt size)
  const effectiveScale = translationScale ?? (isNonLatin ? 0.9 : undefined);
  const translatedFontStyle: React.CSSProperties | undefined = isBilingual
    ? { ...baseTextStyle, ...(effectiveScale ? { fontSize: `${effectiveScale}em` } : {}) }
    : undefined;
  const bilingualGrid: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
    gap: "0 1em",
    position: "relative",
  };
  const renderBilingualGrid = (
    left: React.ReactNode,
    right: React.ReactNode,
    style?: React.CSSProperties,
    options?: { showDivider?: boolean }
  ) => (
    <div style={{ ...bilingualGrid, ...style }}>
      {options?.showDivider !== false && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: "50%",
            width: 1,
            transform: "translateX(-0.5px)",
            backgroundColor: "#e2e8f0",
            pointerEvents: "none",
          }}
        />
      )}
      {left}
      {right}
    </div>
  );

  const imageEl = block.imageSrc ? (
    <div
      style={{
        float: block.imageAlign === "right" ? "right" : "left",
        width: `${block.imageScale ?? 30}%`,
        margin: block.imageAlign === "right" ? "4px 0 8px 12px" : "4px 12px 8px 0",
        flexShrink: 0,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={block.imageSrc}
        alt=""
        className="w-full rounded-sm"
      />
    </div>
  ) : null;

  /** Render a single column of tiptap content (used for both original and translated) */
  const renderContent = (html: string) => {
    const processed = injectLiIcons(prepareTiptapHtml(html));
    return (
      <div
        className={`tiptap max-w-none ${hasExampleBox || hasHinweisBox ? s.tiptapFlush : ""}`}
        dangerouslySetInnerHTML={{ __html: processed }}
      />
    );
  };

  /** Split HTML into individual paragraph strings */
  const splitParagraphs = (html: string): string[] => {
    const prepared = prepareTiptapHtml(html);
    const matches = prepared.match(/<p[^>]*>.*?<\/p>/gi);
    return matches || [prepared];
  };

  /** Split rows content into row fragments, treating both <p> and <li> as rows.
   *  Normalises <li> fragments into <p> snippets so each list item becomes one row. */
  const splitRowItems = (html: string): string[] => {
    const prepared = prepareTiptapHtml(html);
    const rows = Array.from(prepared.matchAll(/<li\b[^>]*>[\s\S]*?<\/li>|<p\b[^>]*>[\s\S]*?<\/p>/gi), (m) => m[0]);
    if (rows.length === 0) return [prepared];

    return rows.map((row) => {
      if (!/^<li\b/i.test(row)) return row;
      const liInner = row.replace(/^<li\b[^>]*>/i, "").replace(/<\/li>$/i, "").trim();
      if (/^<p\b/i.test(liInner)) return liInner;
      return `<p>${liInner}</p>`;
    });
  };

  /** Wrap content in bilingual 2-column grid if active */
  const wrapBilingual = (translatedHtml: string, originalHtml?: string) => {
    if (!isBilingual || !originalHtml) return renderContent(translatedHtml);

    // For rows style: render paragraph-by-paragraph aligned rows
    if (isRows) {
      const originalParas = splitRowItems(originalHtml);
      const translatedParas = splitRowItems(translatedHtml);
      const maxLen = Math.max(originalParas.length, translatedParas.length);
      const cellBase: React.CSSProperties = {
        padding: "0.375rem 0.75rem 0.375rem 1.75rem",
        position: "relative",
        borderBottom: "1px solid #d1d5db",
        lineHeight: "1.35em",
      };
      return renderBilingualGrid(
        Array.from({ length: maxLen }, (_, i) => (
            <React.Fragment key={i}>
              <div style={{ ...cellBase, ...originalFontStyle, ...(i === 0 ? { borderTop: "1px solid #d1d5db" } : {}) }}>
                <div style={{ position: "absolute", left: 0, top: "calc(0.375rem + 0.7em)", transform: "translateY(-50%)" }}><RowsIconSvg /></div>
                <div className="tiptap max-w-none tiptap-compact" dangerouslySetInnerHTML={{ __html: originalParas[i] || "" }} />
              </div>
              <div style={{ ...cellBase, ...translatedFontStyle, ...(i === 0 ? { borderTop: "1px solid #d1d5db" } : {}) }}>
                <div style={{ position: "absolute", left: 0, top: "calc(0.375rem + 0.7em)", transform: "translateY(-50%)" }}><RowsIconSvg /></div>
                <div className="tiptap max-w-none tiptap-compact" dangerouslySetInnerHTML={{ __html: translatedParas[i] || "" }} />
              </div>
            </React.Fragment>
          )),
        null,
        undefined,
        { showDivider: showBilingualDivider },
      );
    }

    // For standard style bilingual: paragraph-by-paragraph aligned rows without cell padding
    if (isStandard) {
      // Keep full list structure in both columns when <li> is present.
      // Splitting into standalone <p> rows strips <ul>/<li> context and drops list icons.
      const hasListRows = /<li\b/i.test(originalHtml) || /<li\b/i.test(translatedHtml);
      if (hasListRows) {
        return renderBilingualGrid(
          <div style={originalFontStyle}>{renderContent(originalHtml)}</div>,
          <div className="tiptap-bilingual-translated" style={translatedFontStyle}>{renderContent(translatedHtml)}</div>,
          undefined,
          { showDivider: showBilingualDivider },
        );
      }

      const originalParas = splitParagraphs(originalHtml);
      const translatedParas = splitParagraphs(translatedHtml);
      const maxLen = Math.max(originalParas.length, translatedParas.length);
      const hasMultipleRows = maxLen > 1;
      const rowPadding = hasMultipleRows ? "0.25em" : "0";
      return renderBilingualGrid(Array.from({ length: maxLen }, (_, i) => (
            <React.Fragment key={i}>
              <div className="tiptap-compact" style={{ paddingTop: rowPadding, paddingBottom: rowPadding, ...originalFontStyle }}>
                <div className="tiptap max-w-none tiptap-compact" dangerouslySetInnerHTML={{ __html: originalParas[i] || "" }} />
              </div>
              <div className="tiptap-compact" style={{ paddingTop: rowPadding, paddingBottom: rowPadding, ...translatedFontStyle }}>
                <div className="tiptap max-w-none tiptap-compact" dangerouslySetInnerHTML={{ __html: translatedParas[i] || "" }} />
              </div>
            </React.Fragment>
          )), null, undefined, { showDivider: showBilingualDivider });
    }

    return renderBilingualGrid(
      <div style={originalFontStyle}>{renderContent(originalHtml)}</div>,
      <div className="tiptap-bilingual-translated" style={translatedFontStyle}>{renderContent(translatedHtml)}</div>,
      baseTextStyle,
      { showDivider: showBilingualDivider },
    );
  };

  if (isLernziel) {
    const showStacked = isBilingual && originalBlock;
    const isOnline = mode === "online";
    return (
      <div
        className={isOnline ? "flex gap-0 font-semibold border rounded-[5px] overflow-hidden" : "flex gap-0 font-semibold border rounded-sm overflow-hidden"}
        style={{
          borderColor: primaryColor,
          color: primaryColor,
          ...(isOnline ? {} : { backgroundColor: `${primaryColor}10` }),
        }}
      >
        <div
          className={isOnline ? "shrink-0 w-8 flex items-center justify-center" : "shrink-0 w-10 flex items-center justify-center"}
          style={{ backgroundColor: primaryColor }}
        >
          <Flag className={isOnline ? "h-4 w-4" : "h-5 w-5"} style={{ color: "#ffffff" }} />
        </div>
        <div
          className="flex-1 min-w-0 px-6 py-2"
          style={{
            ...baseTextStyle,
            ...(isOnline ? {} : { backgroundColor: colorWithAlpha(primaryColor, 0.08) }),
          }}
        >
          {imageEl}
          {showStacked ? (
            <div>
              <div style={baseTextStyle}>{renderContent(originalBlock.content)}</div>
              <div style={{ borderTop: `1px solid ${primaryColor}30`, marginTop: "0.25rem", paddingTop: "0.25rem", fontWeight: 400, ...translatedFontStyle }}>{renderContent(block.content)}</div>
            </div>
          ) : (
            renderContent(block.content)
          )}
        </div>
      </div>
    );
  }

  if (isMetadaten) {
    return (
      <div className={s.textPlain} style={{ marginBottom: "-1.5rem", ...baseTextStyle, color: primaryColor }}>
        {renderContent(block.content)}
      </div>
    );
  }

  if (!hasExampleBox && !hasHinweisBox) {
    // For rows style (non-bilingual): render paragraph-by-paragraph with real DOM icon divs.
    // CSS ::before background-image is not rendered by Chromium's PDF engine.
    if (isRows && !isBilingual) {
      const paras = splitRowItems(block.content);
      return (
        <div className={s.textPlain} style={baseTextStyle}>
          {imageEl}
          {paras.map((para, i) => (
            <div
              key={i}
              style={{
                padding: "0.375rem 0 0.375rem 1.75rem",
                position: "relative",
                borderBottom: "1px solid #d1d5db",
                lineHeight: "1.35em",
                ...(i === 0 ? { borderTop: "1px solid #d1d5db" } : {}),
                breakInside: "avoid" as const,
                pageBreakInside: "avoid" as const,
              }}
            >
              <div style={{ position: "absolute", left: 0, top: "calc(0.375rem + 0.7em)", transform: "translateY(-50%)", width: 14, height: 14 }}>
                <RowsIconSvg />
              </div>
              <div className="tiptap max-w-none tiptap-compact" dangerouslySetInnerHTML={{ __html: para }} />
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className={s.textPlain} style={baseTextStyle}>
        {imageEl}
        {wrapBilingual(block.content, originalBlock?.content)}
      </div>
    );
  }

  if (hasHinweisBox) {
    const hinweisConfig = isHinweisAlarm
      ? { color: "#990033", bg: "#99003308", border: "#990033", icon: <Siren className="h-5 w-5" style={{ color: "#990033" }} /> }
      : isHinweisWichtig
      ? { color: "#0369a1", bg: "#0369a108", border: "#0369a1", icon: <BadgeAlert className="h-5 w-5" style={{ color: "#0369a1" }} /> }
      : isLernziel
      ? { color: "#166534", bg: "transparent", border: "#166534", icon: <Goal className="h-5 w-5" style={{ color: "#166534" }} /> }
      : { color: "#475569", bg: "#47556908", border: "#475569", icon: <ArrowRight className="h-5 w-5" style={{ color: "#475569" }} /> };

    // For alarm/wichtig in bilingual mode, render each language as a full hint box
    // so both columns include icon + block frame consistently.
    const useFullBilingualHintBoxes =
      isBilingual && !!originalBlock && (isHinweisWichtig || isHinweisAlarm);
    const bilingualHintIconStyle: React.CSSProperties | undefined =
      isBilingual ? { paddingLeft: "0.75rem", width: "2.1rem" } : undefined;

    if (useFullBilingualHintBoxes) {
      return renderBilingualGrid(
          <div
            className={s.hintBox}
            style={{ "--block-color": hinweisConfig.border, "--block-bg": hinweisConfig.bg } as React.CSSProperties}
          >
            <div className={s.hintIcon} style={bilingualHintIconStyle}>
              {hinweisConfig.icon}
            </div>
            <div className={s.hintBody}>
              {imageEl}
              {renderContent(originalBlock.content)}
            </div>
          </div>,
          <div
            className={s.hintBox}
            style={{ "--block-color": hinweisConfig.border, "--block-bg": hinweisConfig.bg } as React.CSSProperties}
          >
            <div className={s.hintIcon} style={bilingualHintIconStyle}>
              {hinweisConfig.icon}
            </div>
            <div className={s.hintBody}>
              {imageEl}
              <div className="tiptap-bilingual-translated" style={translatedFontStyle}>{renderContent(block.content)}</div>
            </div>
          </div>,
          undefined,
          { showDivider: showBilingualDivider }
      );
    }

    return (
      <div
        className={s.hintBox}
        style={{ "--block-color": hinweisConfig.border, "--block-bg": hinweisConfig.bg } as React.CSSProperties}
      >
        <div className={s.hintIcon} style={bilingualHintIconStyle}>
          {hinweisConfig.icon}
        </div>
        <div className={s.hintBody}>
          {imageEl}
          {wrapBilingual(block.content, originalBlock?.content)}
        </div>
      </div>
    );
  }

  const borderTextColor = isExampleStandard ? "#990033" : isExampleImproved ? "#3A4F40" : "#475569";

  if (isExample) {
    return (
      <div>
        <div
          className={s.exampleBox}
          style={{
            "--block-color": borderTextColor,
            "--example-radius": mode === "online" ? "5px" : "4px",
            "--example-padding": mode === "online" ? "0.5rem 1rem" : "0.75rem 1rem",
            fontFamily: resolvedBodyFont,
            ...(bodyFontSize ? { fontSize: bodyFontSize } : {}),
          } as React.CSSProperties}
        >
          {imageEl}
          {wrapBilingual(block.content, originalBlock?.content)}
        </div>
        {block.comment && (
          <div className={s.commentBox} style={{ "--block-color": borderTextColor, fontFamily: resolvedBodyFont, ...(bodyFontSize ? { fontSize: bodyFontSize } : {}) } as React.CSSProperties}>
            {renderDeMarkers(block.comment)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div
        className={`${s.exampleSplit} ${isExampleStandard ? s.exampleSplitStandard : s.exampleSplitImproved}`}
        style={{
          "--block-color": borderTextColor,
          "--example-radius": mode === "online" ? "5px" : "4px",
          "--example-icon-width": mode === "online" ? "2rem" : "2.5rem",
          fontFamily: resolvedBodyFont,
          ...(bodyFontSize ? { fontSize: bodyFontSize } : {}),
        } as React.CSSProperties}
      >
        <div className={s.exampleSplitIcon} aria-hidden="true">
          {isExampleStandard ? <ThumbsDown className="h-4 w-4" /> : <ThumbsUp className="h-4 w-4" />}
        </div>
        <div className={s.exampleSplitBody}>
          {imageEl}
          {wrapBilingual(block.content, originalBlock?.content)}
        </div>
      </div>
      {block.comment && (
        <div className={s.commentBox} style={{ "--block-color": borderTextColor, fontFamily: resolvedBodyFont, ...(bodyFontSize ? { fontSize: bodyFontSize } : {}) } as React.CSSProperties}>
          {renderDeMarkers(block.comment)}
        </div>
      )}
    </div>
  );
}

// ─── Email Skeleton View ─────────────────────────────────────
function EmailSkeletonView({ block }: { block: EmailSkeletonBlock }) {
  const t = useTranslations("blockRenderer");

  const attachments = block.attachments ?? [];
  const style = block.emailStyle ?? "none";
  const isStyled = style === "standard" || style === "teal";
  const color = style === "teal" ? "#3A4F40" : style === "standard" ? "#475569" : undefined;
  const pillColor = style === "teal" ? "#3A4F40" : style === "standard" ? "#990033" : undefined;

  return (
    <div>
      {isStyled && (
        <div className="flex">
          <div
            className={`py-1 text-xs font-semibold text-white rounded-t-sm text-center uppercase flex items-center justify-center ${s.pill}`}
            style={{ "--block-color": pillColor } as React.CSSProperties}
          >
            {style === "standard" ? <ThumbsDown className="h-4 w-4" /> : <ThumbsUp className="h-4 w-4" />}
          </div>
        </div>
      )}
      <div
        className={`border border-dashed overflow-hidden bg-white ${isStyled ? "rounded-sm rounded-tl-none" : "rounded-sm"}`}
        style={{ borderColor: isStyled ? color : "#475569" }}
      >
        <div className={s.emailMeta}>
          <div className={s.emailMetaRow}>
            <div className={s.emailMetaLabel}>{t("emailTo")}</div>
            <div className={s.emailMetaValue}>{block.to}</div>
          </div>
          <div className={s.emailMetaRow}>
            <div className={s.emailMetaLabel}>{t("emailSubject")}</div>
            <div className={s.emailMetaValue}>{block.subject}</div>
          </div>
        </div>

        <div className={s.emailBody}>
          <div className="tiptap max-w-none" dangerouslySetInnerHTML={{ __html: prepareTiptapHtml(block.body) }} />
        </div>

      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50 flex flex-wrap gap-2">
          {attachments.map((att) => (
            <div key={att.id} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-slate-200 bg-white text-xs text-slate-600">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
              {att.name}
            </div>
          ))}
        </div>
      )}
      </div>
      {isStyled && block.comment && (
        <div className={s.commentBox} style={{ "--block-color": color } as React.CSSProperties}>{renderDeMarkers(block.comment)}</div>
      )}
    </div>
  );
}

// ─── Job Application View ────────────────────────────────────
function JobApplicationView({ block }: { block: JobApplicationBlock }) {
  const t = useTranslations("blockRenderer");

  const style = block.applicationStyle ?? "none";
  const isStyled = style === "standard" || style === "teal";
  const color = style === "teal" ? "#3A4F40" : style === "standard" ? "#990033" : undefined;

  return (
    <div>
      {isStyled && (
        <div className="flex">
          <div
            className={`py-1 text-xs font-semibold text-white rounded-t-sm text-center uppercase flex items-center justify-center ${s.pill}`}
            style={{ "--block-color": color } as React.CSSProperties}
          >
            {style === "standard" ? <ThumbsDown className="h-4 w-4" /> : <ThumbsUp className="h-4 w-4" />}
          </div>
        </div>
      )}
      <div
        className={`border border-dashed overflow-hidden bg-white ${s.blockShadow} ${isStyled ? "rounded-sm rounded-tl-none" : "rounded-sm"}`}
        style={{ borderColor: isStyled ? color : "#475569" }}
      >
        {/* Form header — icon only, same style as email toolbar */}
        <div
          className={`flex items-center gap-2 px-4 py-2 border-b ${isStyled ? "" : "bg-slate-50 border-slate-200"}`}
          style={isStyled ? { backgroundColor: `${color}0D`, borderColor: `${color}4D` } : undefined}
        >
          <FormInput className={`h-4 w-4 ${isStyled ? s.emailIcon : ""}`} style={isStyled ? { "--block-color": color } as React.CSSProperties : undefined} />
        </div>

        {/* Form fields */}
        <div className="email-skeleton-fields px-4 pt-3 pb-4 space-y-1.5">
          <div className="flex items-center gap-4">
            <span className="font-semibold text-slate-400 w-24 shrink-0">{t("jobPosition")}</span>
            <div className="flex-1 rounded-sm border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-700 flex items-center justify-between">
              <span>{block.position}</span>
              <svg className="h-4 w-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" /></svg>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-semibold text-slate-400 w-24 shrink-0">{t("jobFirstName")}</span>
            <div className="flex-1 rounded-sm border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-700">{block.firstName}</div>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-semibold text-slate-400 w-24 shrink-0">{t("jobLastName")}</span>
            <div className="flex-1 rounded-sm border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-700">{block.applicantName}</div>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-semibold text-slate-400 w-24 shrink-0">{t("jobEmail")}</span>
            <div className="flex-1 rounded-sm border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-700">{block.email}</div>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-semibold text-slate-400 w-24 shrink-0">{t("jobPhone")}</span>
            <div className="flex-1 rounded-sm border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-700">{block.phone}</div>
          </div>
          <div className="flex items-start gap-4">
            <span className="font-semibold text-slate-400 w-24 shrink-0 pt-1.5">{t("jobMessage")}</span>
            <div className="flex-1 rounded-sm border border-slate-200 bg-slate-50 px-3 py-1.5">
              <div className="tiptap max-w-none" dangerouslySetInnerHTML={{ __html: prepareTiptapHtml(block.message) }} />
            </div>
          </div>
        </div>
      </div>
      {isStyled && block.comment && (
        <div className={s.commentBox} style={{ "--block-color": color } as React.CSSProperties}>{renderDeMarkers(block.comment)}</div>
      )}
    </div>
  );
}

/** Split Tiptap HTML into items on snippet separators.
 * Accepts both explicit <hr data-snippet-break> and legacy/plain <hr>.
 */
function splitSnippetItems(html: string): string[] {
  const parts = html.split(/<hr(?:\s[^>]*)?>/gi);
  return parts.map((s) => s.trim()).filter(Boolean);
}

function TextSnippetView({ block, mode }: { block: TextSnippetBlock; mode: ViewMode }) {
  const t = useTranslations("viewer");
  const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null);
  const isPrint = mode === "print";

  const deItems = splitSnippetItems(block.content);
  const trItems = block.translatedContent
    ? splitSnippetItems(block.translatedContent)
    : [];
  const showBilingual = !!block.bilingual && !!block.translatedContent;
  const count = showBilingual
    ? Math.max(deItems.length, trItems.length)
    : deItems.length;

  const handleCopy = async (html: string, index: number) => {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;
    const plainText = tempDiv.textContent || tempDiv.innerText || "";
    try {
      await navigator.clipboard.writeText(plainText);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = plainText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  };

  if (showBilingual) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: count }).map((_, i) => {
          const deHtml = deItems[i] ?? "";
          const trHtml = trItems[i] ?? "";
          return (
            <div key={i} className="snippet-item-row grid grid-cols-2 gap-4 items-stretch">
              <div className={`snippet-item-card relative flex flex-col border border-slate-200 rounded-sm p-4 bg-slate-50/50 ${s.snippetCard}`}>
                <div
                  className={`tiptap max-w-none flex-1 ${s.tiptapFlush} ${!isPrint ? "pr-6" : ""}`}
                  dangerouslySetInnerHTML={{ __html: prepareTiptapHtml(deHtml) }}
                />
                {!isPrint && (
                  <button
                    type="button"
                    onClick={() => handleCopy(deHtml, i)}
                    className="absolute bottom-2 right-2 text-slate-400 hover:text-slate-600 transition-colors"
                    title={t("copyToClipboard")}
                  >
                    {copiedIndex === i ? (
                      <ClipboardCheck className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
              <div className={`snippet-item-card flex flex-col border border-slate-200 rounded-sm p-4 bg-white ${s.snippetCard}`}>
                <div
                  className={`tiptap max-w-none flex-1 ${s.tiptapFlush}`}
                  dangerouslySetInnerHTML={{ __html: prepareTiptapHtml(trHtml) }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {deItems.map((html, i) => (
        <div
          key={i}
          className={`snippet-item-card relative flex flex-col border border-slate-200 rounded-sm p-4 bg-slate-50/50 ${!isPrint ? "group hover:bg-slate-50 transition-colors" : ""} ${s.snippetCard}`}
        >
          <div
            className={`tiptap max-w-none flex-1 ${s.tiptapFlush} ${!isPrint ? "pr-6" : ""}`}
            dangerouslySetInnerHTML={{ __html: prepareTiptapHtml(html) }}
          />
          {!isPrint && (
            <button
              type="button"
              onClick={() => handleCopy(html, i)}
              className="absolute bottom-2 right-2 text-slate-400 hover:text-slate-600 transition-colors"
              title={t("copyToClipboard")}
            >
              {copiedIndex === i ? (
                <ClipboardCheck className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function ImageView({ block }: { block: ImageBlock }) {
  if (!block.src) return null;
  const isExample = block.imageStyle === "example";
  return (
    <figure className={isExample ? `border border-dashed rounded-sm p-3 ${s.styledBorder}` : undefined}
      style={isExample ? { "--block-color": "#475569" } as React.CSSProperties : undefined}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={block.src}
        alt={block.alt}
        className="max-w-full rounded-sm mx-auto block"
        style={{
          ...(block.width ? { width: block.width } : {}),
          ...(block.height ? { height: block.height, objectFit: "contain" as const } : {}),
        }}
      />
      {block.caption && (
        <figcaption className="text-muted-foreground mt-1 text-center">
          {block.caption}
        </figcaption>
      )}
    </figure>
  );
}

function ImageCardsView({ block }: { block: ImageCardsBlock }) {
  // Shuffle word bank items for display (memoized to maintain consistency)
  const shuffledItems = useMemo(() => {
    if (!block.showWordBank) return [];
    return deterministicShuffle(
      block.items.filter((item) => item.text),
      `image-cards:${block.id}`
    );
  }, [block.id, block.items, block.showWordBank]);

  return (
    <div className="space-y-3">
      {/* Word Bank */}
      {block.showWordBank && shuffledItems.length > 0 && (
        <div className="rounded p-3 border border-dashed border-muted-foreground/30">
          <div className="flex flex-wrap gap-2">
            {shuffledItems.map((item) => (
              <span key={item.id} className="px-2 py-0.5 bg-background rounded border">
                {item.text}
              </span>
            ))}
          </div>
        </div>
      )}
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${block.columns}, 1fr)` }}
      >
        {block.items.map((item) => {
          const [arW, arH] = (block.imageAspectRatio ?? "1:1").split(":").map(Number);
          return (
          <div key={item.id} className="border rounded overflow-hidden bg-card image-card-row">
            {item.src && (
              <div 
                className="overflow-hidden relative mx-auto"
                style={{ 
                  width: `${block.imageScale ?? 100}%`,
                  aspectRatio: `${arW} / ${arH}` 
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.src}
                  alt={item.alt}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>
            )}
            <div className={block.showWritingLines ? "px-2 pb-2" : "p-2 text-center"}>
              {block.showWritingLines ? (
                <div className="space-y-0.5 pb-1">
                  {Array.from({ length: block.writingLinesCount ?? 1 }).map((_, i) => (
                    <div key={i} className="h-6" style={{ borderBottom: '1px dashed var(--color-muted-foreground)', opacity: 1.0 }} />
                  ))}
                </div>
              ) : (
                item.text && <span>{item.text}</span>
              )}
            </div>
          </div>
        )})}
      </div>
    </div>
  );
}

function TextCardsView({ block }: { block: TextCardsBlock }) {
  const shuffledItems = useMemo(() => {
    if (!block.showWordBank) return [];
    return deterministicShuffle(
      block.items.filter((item) => item.text),
      `text-cards:${block.id}`
    );
  }, [block.id, block.items, block.showWordBank]);

  const sizeClasses: Record<string, string> = {
    xs: "text-cv-xs",
    sm: "text-cv-sm",
    base: "text-cv-base",
    lg: "text-cv-lg",
    xl: "text-cv-xl",
    "2xl": "text-cv-2xl",
  };

  const alignClasses: Record<string, string> = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  };

  return (
    <div className="space-y-3">
      {/* Word Bank */}
      {block.showWordBank && shuffledItems.length > 0 && (
        <div className="rounded p-3 border border-dashed border-muted-foreground/30">
          <div className="flex flex-wrap gap-2">
            {shuffledItems.map((item) => (
              <span key={item.id} className="px-2 py-0.5 bg-background rounded border">
                {item.caption}
              </span>
            ))}
          </div>
        </div>
      )}
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${block.columns}, 1fr)` }}
      >
        {block.items.map((item) => (
          <div key={item.id} className={`${block.showBorder ? "border rounded" : ""} overflow-hidden bg-card text-card-row`}>
            <div className={`p-3 ${sizeClasses[block.textSize ?? "base"]} ${alignClasses[block.textAlign ?? "center"]} ${block.textBold ? "font-bold" : ""} ${block.textItalic ? "italic" : ""}`}>
              {item.text && <span>{item.text}</span>}
            </div>
            <div className={block.showWritingLines ? "px-2 pb-2" : "p-2 text-center"}>
              {block.showWritingLines ? (
                <div className="space-y-0 pb-1">
                  {Array.from({ length: block.writingLinesCount ?? 1 }).map((_, i) => (
                    <div key={i} className="h-6" style={{ borderBottom: '1px dashed var(--color-muted-foreground)', opacity: 1.0 }} />
                  ))}
                </div>
              ) : (
                item.caption && <span>{item.caption}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SpacerView({ block }: { block: SpacerBlock }) {
  return <div style={{ height: block.height }} />;
}

function DividerView({ block }: { block: DividerBlock }) {
  return <hr style={{ borderStyle: block.style }} />;
}

function LogoDividerView({ block, brand = "edoomio" }: { block: LogoDividerBlock; brand?: Brand }) {
  const logoSrc = BRAND_ICON_LOGOS[brand];
  return (
    <div className="flex items-center justify-center py-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoSrc}
        alt=""
        style={{ width: 24, height: 24 }}
        className="opacity-30"
      />
    </div>
  );
}

function PageBreakView({ block: _block }: { block: PageBreakBlock }) {
  return <div style={{ breakAfter: "page", pageBreakAfter: "always" }} />;
}

function WritingLinesView({ block }: { block: WritingLinesBlock }) {
  return (
    <div>
      {Array.from({ length: block.lineCount }).map((_, i) => (
        <div
          key={i}
          style={{ height: block.lineSpacing, borderBottom: '1px dashed var(--color-muted-foreground)', opacity: 1.0 }}
        />
      ))}
    </div>
  );
}

function WritingRowsView({ block }: { block: WritingRowsBlock }) {
  return (
    <div>
      {Array.from({ length: block.rowCount }).map((_, i) => (
        <div
          key={i}
          className="flex items-center border-b last:border-b-0"
          style={{ gap: 12, paddingTop: 8, paddingBottom: 8 }}
        >
          <span className={NUMBER_BADGE_CLASS}>
            {String(i + 1).padStart(2, "0")}
          </span>
          <div className="flex-1" style={{ height: 24, borderBottom: '1px dashed var(--color-muted-foreground)', opacity: 1.0 }} />
        </div>
      ))}
    </div>
  );
}

// ─── Interactive blocks ─────────────────────────────────────

function MultipleChoiceView({
  block,
  interactive,
  answer,
  onAnswer,
  showResults,
  showSolutions = false,
}: {
  block: MultipleChoiceBlock;
  interactive: boolean;
  answer: unknown;
  onAnswer: (value: unknown) => void;
  showResults: boolean;
  showSolutions?: boolean;
}) {
  const t = useTranslations("viewer");
  const selected = (answer as string[] | undefined) || [];

  const handleSelect = (optId: string) => {
    if (!interactive || showResults) return;
    if (block.allowMultiple) {
      const next = selected.includes(optId)
        ? selected.filter((id) => id !== optId)
        : [...selected, optId];
      onAnswer(next);
    } else {
      onAnswer([optId]);
    }
  };

  return (
    <div className="space-y-3">
      <p className="font-medium">{block.question}</p>
      <div className="space-y-2">
        {block.options.map((opt, i) => {
          const isSelected = selected.includes(opt.id);
          const isCorrect = opt.isCorrect;

          let optionClass =
            "flex items-center gap-3 p-3 rounded border transition-colors";

          if (showResults) {
            if (isCorrect) {
              optionClass += " border-green-500 bg-green-50";
            } else if (isSelected && !isCorrect) {
              optionClass += " border-red-500 bg-red-50";
            } else {
              optionClass += " border-border";
            }
          } else if (interactive) {
            optionClass += isSelected
              ? " border-primary bg-primary/5"
              : " border-border hover:border-primary/40 cursor-pointer";
          } else {
            optionClass += " border-border";
          }

          return (
            <div
              key={opt.id}
              className={optionClass}
              onClick={() => handleSelect(opt.id)}
              role={interactive ? "button" : undefined}
              tabIndex={interactive && !showResults ? 0 : undefined}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleSelect(opt.id);
                }
              }}
            >
              <span className="text-cv-xs font-bold text-muted-foreground bg-muted w-6 h-6 rounded flex items-center justify-center shrink-0">
                {String(i + 1).padStart(2, "0")}
              </span>
              {interactive ? (
                <div
                  className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors
                    ${isSelected ? "border-primary bg-primary" : "border-muted-foreground/40"}`}
                >
                  {isSelected && (
                    <div className="h-2 w-2 rounded-full bg-white" />
                  )}
                </div>
              ) : showSolutions && isCorrect ? (
                <div className={CONTROL_BOX_FILLED_CLASS} />
              ) : (
                <div className={CONTROL_BOX_CLASS} />
              )}
              <span className={`flex-1${showSolutions && isCorrect ? ' text-green-800 font-semibold' : ''}`}>{opt.text}</span>
              {showResults && isCorrect && (
                <span className="text-cv-xs font-medium text-green-600">{t("correctResult")}</span>
              )}
              {showResults && isSelected && !isCorrect && (
                <span className="text-cv-xs font-medium text-red-600">{t("incorrectResult")}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FillInBlankView({
  block,
  interactive,
  answer,
  onAnswer,
  showResults,
  showSolutions = false,
}: {
  block: FillInBlankBlock;
  interactive: boolean;
  answer: unknown;
  onAnswer: (value: unknown) => void;
  showResults: boolean;
  showSolutions?: boolean;
}) {
  const tb = useTranslations("blockRenderer");
  const blanks = (answer as Record<string, string> | undefined) || {};
  const parts = block.content.split(/(\{\{blank:[^}]+\}\})/g);
  let blankIndex = 0;

  return (
    <div className="leading-loose flex flex-wrap items-baseline">
      {parts.map((part, i) => {
        const match = part.match(/\{\{blank:(.+)\}\}/);
        if (match) {
          const raw = match[1];
          const commaIdx = raw.lastIndexOf(",");
          let correctAnswer: string;
          let widthMultiplier = 1;
          if (commaIdx !== -1) {
            correctAnswer = raw.substring(0, commaIdx).trim();
            const wStr = raw.substring(commaIdx + 1).trim();
            const parsed = Number(wStr);
            if (!isNaN(parsed)) widthMultiplier = parsed;
          } else {
            correctAnswer = raw.trim();
          }
          const key = `blank-${blankIndex}`;
          blankIndex++;
          const userValue = blanks[key] || "";
          const isCorrectAnswer =
            showResults && userValue.trim().toLowerCase() === correctAnswer.toLowerCase();
          const isWrong = showResults && userValue.trim() !== "" && !isCorrectAnswer;
          const widthStyle = widthMultiplier === 0 ? { flex: 1 } as React.CSSProperties : { minWidth: `${80 * widthMultiplier}px` } as React.CSSProperties;

          if (interactive) {
            return (
              <span key={i} className="inline-block relative mx-1">
                <input
                  type="text"
                  value={userValue}
                  disabled={showResults}
                  onChange={(e) =>
                    onAnswer({ ...blanks, [key]: e.target.value })
                  }
                  className={`border-b border-dashed border-muted-foreground/30 bg-transparent px-2 py-0.5 text-center focus:outline-none inline transition-colors
                    ${showResults
                      ? isCorrectAnswer
                        ? "border-green-500 text-green-700"
                        : isWrong
                          ? "border-red-500 text-red-700"
                          : "border-muted-foreground/40"
                      : "border-muted-foreground/40 focus:border-primary"}`}
                  style={widthMultiplier === 0 ? { flex: 1 } : { width: `${112 * widthMultiplier}px` }}
                  placeholder={tb("fillInBlankPlaceholder")}
                />
                {showResults && isWrong && (
                  <span className="block text-cv-xs text-green-600 text-center mt-0.5">
                    {correctAnswer}
                  </span>
                )}
              </span>
            );
          }
          if (showSolutions) {
            return (
              <span
                key={i}
                className="bg-green-100 text-green-800 font-semibold px-2 mx-1"
                style={{ display: 'inline-flex', alignItems: 'center', verticalAlign: 'text-bottom', height: '1.3em', borderRadius: 4 }}
              >
                {correctAnswer}
              </span>
            );
          }
          return (
            <span
              key={i}
              className="bg-gray-100 px-2 mx-1"
              style={{ display: 'inline-flex', alignItems: 'center', verticalAlign: 'text-bottom', height: '1.3em', borderRadius: 4, ...(widthMultiplier === 0 ? { flex: 1 } : { minWidth: `${80 * widthMultiplier}px` }) }}
            >
              <span className="text-muted-foreground" style={{ fontSize: '0.65em' }}>
                {String(blankIndex).padStart(2, "0")}
              </span>
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </div>
  );
}

function FillInBlankItemsView({
  block,
  interactive,
  answer,
  onAnswer,
  showResults,
  showSolutions = false,
  mode = "online",
}: {
  block: FillInBlankItemsBlock;
  interactive: boolean;
  answer: unknown;
  onAnswer: (value: unknown) => void;
  showResults: boolean;
  showSolutions?: boolean;
  mode?: ViewMode;
}) {
  const tb = useTranslations("blockRenderer");
  const blanks = (answer as Record<string, string> | undefined) || {};
  const isPrint = mode === "print";

  // Extract answers for word bank
  const wordBankAnswers = useMemo(() => {
    if (!block.showWordBank) return [];
    const answers: string[] = [];
    for (const item of block.items) {
      const matches = item.content.matchAll(/\{\{blank:([^,}]+)/g);
      for (const m of matches) answers.push(m[1].trim());
    }
    // Shuffle based on block id (deterministic)
    const arr = [...answers];
    let seed = 0;
    for (let i = 0; i < block.id.length; i++) {
      seed = ((seed << 5) - seed + block.id.charCodeAt(i)) | 0;
    }
    for (let i = arr.length - 1; i > 0; i--) {
      seed = (seed * 16807 + 0) % 2147483647;
      const j = Math.abs(seed) % (i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [block.items, block.showWordBank, block.id]);

  return (
    <div>
      {block.showWordBank && wordBankAnswers.length > 0 && (
        <div className="flex flex-wrap mb-3 p-2 bg-muted/40 rounded-sm" style={{ gap: 8 }}>
          {wordBankAnswers.map((word, i) => (
            <span key={i} className="px-2 py-0.5 bg-background border border-border rounded text-cv-sm">
              {word}
            </span>
          ))}
        </div>
      )}
      {block.items.map((item, idx) => {
        const parts = item.content.split(/(\{\{blank:[^}]+\}\})/g);
        let blankInItem = 0;

        return (
          <div
            key={item.id || idx}
            className="flex items-center border-b last:border-b-0"
            style={{ gap: 12, paddingTop: 8, paddingBottom: 8 }}
          >
            <span className={NUMBER_BADGE_CLASS}>
              {String(idx + 1).padStart(2, "0")}
            </span>
            <span className="flex-1 leading-relaxed flex flex-wrap items-baseline">
              {parts.map((part, i) => {
                const match = part.match(/\{\{blank:(.+)\}\}/);
                if (match) {
                  const raw = match[1];
                  const commaIdx = raw.lastIndexOf(",");
                  let correctAnswer: string;
                  let widthMultiplier = 1;
                  if (commaIdx !== -1) {
                    correctAnswer = raw.substring(0, commaIdx).trim();
                    const wStr = raw.substring(commaIdx + 1).trim();
                    const parsed = Number(wStr);
                    if (!isNaN(parsed)) widthMultiplier = parsed;
                  } else {
                    correctAnswer = raw.trim();
                  }
                  const key = `blank-${idx}-${blankInItem}`;
                  blankInItem++;
                  const userValue = blanks[key] || "";
                  const isCorrectAnswer =
                    showResults && userValue.trim().toLowerCase() === correctAnswer.toLowerCase();
                  const isWrong = showResults && userValue.trim() !== "" && !isCorrectAnswer;
                  const widthStyle = widthMultiplier === 0
                    ? { flex: 1 } as React.CSSProperties
                    : { minWidth: `${80 * widthMultiplier}px` } as React.CSSProperties;

                  if (interactive) {
                    return (
                      <span key={i} className="inline-block relative mx-1">
                        <input
                          type="text"
                          value={userValue}
                          disabled={showResults}
                          onChange={(e) =>
                            onAnswer({ ...blanks, [key]: e.target.value })
                          }
                          className={`border-b border-dashed border-muted-foreground/30 bg-transparent px-2 py-0.5 text-center focus:outline-none inline transition-colors
                            ${showResults
                              ? isCorrectAnswer
                                ? "border-green-500 text-green-700"
                                : isWrong
                                  ? "border-red-500 text-red-700"
                                  : "border-muted-foreground/40"
                              : "border-muted-foreground/40 focus:border-primary"}`}
                          style={widthMultiplier === 0 ? { flex: 1 } : { width: `${112 * widthMultiplier}px` }}
                          placeholder={tb("fillInBlankPlaceholder")}
                        />
                        {showResults && isWrong && (
                          <span className="block text-cv-xs text-green-600 text-center mt-0.5">
                            {correctAnswer}
                          </span>
                        )}
                      </span>
                    );
                  }
                  if (showSolutions) {
                    return (
                      <span
                        key={i}
                        className="bg-green-100 text-green-800 font-semibold px-2 mx-1"
                        style={{ display: 'inline', verticalAlign: 'baseline', borderRadius: 4 }}
                      >
                        {correctAnswer}
                      </span>
                    );
                  }
                  return (
                    <span
                      key={i}
                      className="bg-gray-100 mx-1 border-b border-muted-foreground/30"
                      style={{ display: 'inline-block', verticalAlign: 'baseline', borderRadius: 2, ...(widthMultiplier === 0 ? { flex: 1 } : { minWidth: `${80 * widthMultiplier}px` }) }}
                    >
                      &nbsp;
                    </span>
                  );
                }
                return <span key={i}>{renderTextWithSup(part)}</span>;
              })}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function MatchingView({
  block,
  interactive,
  answer,
  onAnswer,
  showResults,
  showSolutions = false,
}: {
  block: MatchingBlock;
  interactive: boolean;
  answer: unknown;
  onAnswer: (value: unknown) => void;
  showResults: boolean;
  showSolutions?: boolean;
}) {
  const t = useTranslations("viewer");
  const [activeLeftId, setActiveLeftId] = useState<string | null>(null);

  // Stable shuffle based on block id (deterministic)
  const shuffledRight = useMemo(() => {
    const arr = [...block.pairs];
    let seed = 0;
    for (let i = 0; i < block.id.length; i++) {
      seed = ((seed << 5) - seed + block.id.charCodeAt(i)) | 0;
    }
    for (let i = arr.length - 1; i > 0; i--) {
      seed = (seed * 16807 + 0) % 2147483647;
      const j = Math.abs(seed) % (i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [block.pairs, block.id]);

  const selections = useMemo<Record<string, string>>(
    () => (answer as Record<string, string> | undefined) || {},
    [answer]
  );

  // Reverse map: rightId → leftId
  const rightToLeft = useMemo(() => {
    const map: Record<string, string> = {};
    for (const [leftId, rightId] of Object.entries(selections)) {
      map[rightId] = leftId;
    }
    return map;
  }, [selections]);

  // Colors for matched pairs
  const matchColors = [
    { bg: "bg-blue-100", border: "border-blue-400", badge: "bg-blue-500" },
    { bg: "bg-purple-100", border: "border-purple-400", badge: "bg-purple-500" },
    { bg: "bg-slate-100", border: "border-slate-400", badge: "bg-slate-500" },
    { bg: "bg-teal-100", border: "border-teal-400", badge: "bg-teal-500" },
    { bg: "bg-pink-100", border: "border-pink-400", badge: "bg-pink-500" },
    { bg: "bg-indigo-100", border: "border-indigo-400", badge: "bg-indigo-500" },
    { bg: "bg-orange-100", border: "border-orange-400", badge: "bg-orange-500" },
    { bg: "bg-emerald-100", border: "border-emerald-400", badge: "bg-emerald-500" },
  ];

  // Assign a color index to each matched left id
  const colorAssignments = useMemo(() => {
    const map: Record<string, number> = {};
    let idx = 0;
    for (const pair of block.pairs) {
      if (selections[pair.id]) {
        map[pair.id] = idx % matchColors.length;
        idx++;
      }
    }
    return map;
  }, [selections, block.pairs, matchColors.length]);

  const handleLeftClick = (leftId: string) => {
    if (!interactive) return;
    if (activeLeftId === leftId) {
      setActiveLeftId(null); // deselect
    } else {
      setActiveLeftId(leftId);
    }
  };

  const handleRightClick = (rightId: string) => {
    if (!interactive || !activeLeftId) return;
    // If this right item was already matched to another left, clear that
    const newSelections = { ...selections };
    for (const [lId, rId] of Object.entries(newSelections)) {
      if (rId === rightId) delete newSelections[lId];
    }
    newSelections[activeLeftId] = rightId;
    setActiveLeftId(null);
    onAnswer(newSelections);
  };

  // ── Print / non-interactive mode: row-based layout like T/F and Order ──
  if (!interactive) {
    return (
      <div className="space-y-2">
        {block.instruction && (
          <p className="text-muted-foreground">{block.instruction}</p>
        )}
        <div className="grid grid-cols-2" style={{ gap: "0 24px" }}>
          {/* Left column */}
          <div>
            {block.pairs.map((pair, i) => (
              <div
                key={pair.id}
                className={`flex items-center gap-3 ${block.extendedRows ? "py-1" : "py-2"} border-b ${i === 0 ? "border-t" : ""}`}
                style={block.extendedRows ? { minHeight: "3.5rem" } : undefined}
              >
                <span className="text-cv-xs font-bold text-muted-foreground bg-muted w-6 h-6 rounded flex items-center justify-center shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex-1">{pair.left}</span>
                {showSolutions ? (
                  <span
                    className="w-5 h-5 rounded-sm bg-green-500 text-white text-cv-micro font-bold flex items-center justify-center shrink-0"
                  >
                    {(() => { const idx = shuffledRight.findIndex(sp => sp.id === pair.id); return String.fromCharCode(65 + idx); })()}
                  </span>
                ) : (
                  <div className="w-5 h-5 rounded border-2 border-muted-foreground/30 shrink-0" />
                )}
              </div>
            ))}
          </div>
          {/* Right column — shuffled */}
          <div>
            {shuffledRight.map((pair, i) => (
              <div
                key={`r-${pair.id}`}
                className={`flex items-center gap-3 ${block.extendedRows ? "py-1" : "py-2"} border-b ${i === 0 ? "border-t" : ""}`}
                style={block.extendedRows ? { minHeight: "3.5rem" } : undefined}
              >
                {showSolutions ? (
                  <span className="w-5 h-5 rounded-sm bg-green-500 text-white text-cv-micro font-bold flex items-center justify-center shrink-0">
                    {(() => { const idx = block.pairs.findIndex(p => p.id === pair.id); return String(idx + 1).padStart(2, "0"); })()}
                  </span>
                ) : (
                  <div className="w-5 h-5 rounded border-2 border-muted-foreground/30 shrink-0" />
                )}
                <span className="flex-1">{pair.right}</span>
                <span className="text-cv-xs font-bold text-muted-foreground bg-muted w-6 h-6 rounded flex items-center justify-center shrink-0">
                  {String.fromCharCode(65 + i)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Online / interactive mode ──
  return (
    <div className="space-y-3">
      {block.instruction && (
        <p className="text-muted-foreground">{block.instruction}</p>
      )}
      {interactive && !showResults && (
        <p className="text-cv-xs text-muted-foreground">
          {activeLeftId ? t("matchingInstructionActive") : t("matchingInstructionDefault")}
        </p>
      )}
      <div className="grid grid-cols-2 gap-4">
        {/* Left side */}
        <div className="space-y-2">
          {block.pairs.map((pair, i) => {
            const isMatched = !!selections[pair.id];
            const isActive = activeLeftId === pair.id;
            const colorIdx = colorAssignments[pair.id];
            const color = colorIdx !== undefined ? matchColors[colorIdx] : null;
            const isCorrect = selections[pair.id] === pair.id;

            let borderClass = "border-border";
            let bgClass = "";
            if (showResults && isMatched) {
              borderClass = isCorrect ? "border-green-500" : "border-red-500";
              bgClass = isCorrect ? "bg-green-50" : "bg-red-50";
            } else if (isActive) {
              borderClass = "border-primary ring-2 ring-primary/30";
              bgClass = "bg-primary/5";
            } else if (color) {
              borderClass = color.border;
              bgClass = color.bg;
            }

            return (
              <button
                type="button"
                key={pair.id}
                onClick={() => handleLeftClick(pair.id)}
                disabled={!interactive || showResults}
                className={`w-full flex items-center gap-3 p-3 rounded border transition-all text-left
                  ${borderClass} ${bgClass}
                  ${interactive && !showResults ? "cursor-pointer hover:border-primary/40" : "cursor-default"}`}
              >
                <span className="text-cv-xs font-bold text-muted-foreground bg-muted w-6 h-6 rounded flex items-center justify-center shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex-1">{pair.left}</span>
                {color && !showResults && (
                  <span className={`w-5 h-5 rounded-full ${color.badge} text-white text-cv-micro font-bold flex items-center justify-center shrink-0`}>
                    {colorIdx !== undefined ? colorIdx + 1 : ""}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {/* Right side — shuffled answers */}
        <div className="space-y-2">
          {shuffledRight.map((pair, i) => {
            const matchedByLeftId = rightToLeft[pair.id];
            const isMatched = !!matchedByLeftId;
            const colorIdx = matchedByLeftId ? colorAssignments[matchedByLeftId] : undefined;
            const color = colorIdx !== undefined ? matchColors[colorIdx] : null;

            let borderClass = "border-border";
            let bgClass = "";
            if (showResults && isMatched) {
              const isCorrect = matchedByLeftId === pair.id;
              borderClass = isCorrect ? "border-green-500" : "border-red-500";
              bgClass = isCorrect ? "bg-green-50" : "bg-red-50";
            } else if (color) {
              borderClass = color.border;
              bgClass = color.bg;
            }

            return (
              <button
                type="button"
                key={`r-${pair.id}`}
                onClick={() => handleRightClick(pair.id)}
                disabled={!interactive || showResults || !activeLeftId}
                className={`w-full flex items-center gap-3 p-3 rounded border transition-all text-left
                  ${borderClass} ${bgClass}
                  ${interactive && !showResults && activeLeftId ? "cursor-pointer hover:border-primary/40" : "cursor-default"}`}
              >
                <span className="text-cv-xs font-bold text-muted-foreground bg-muted w-6 h-6 rounded flex items-center justify-center shrink-0">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="flex-1">{pair.right}</span>
                {color && !showResults && (
                  <span className={`w-5 h-5 rounded-full ${color.badge} text-white text-cv-micro font-bold flex items-center justify-center shrink-0`}>
                    {colorIdx !== undefined ? colorIdx + 1 : ""}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      {showResults && (
        <p className="text-cv-xs text-muted-foreground">
          {t("resultCount", { correct: block.pairs.filter((p) => selections[p.id] === p.id).length, total: block.pairs.length })}
        </p>
      )}
    </div>
  );
}

function TwoColumnFillView({
  block,
  interactive,
  answer,
  onAnswer,
  showSolutions = false,
}: {
  block: TwoColumnFillBlock;
  interactive: boolean;
  answer: unknown;
  onAnswer: (value: unknown) => void;
  showSolutions?: boolean;
}) {
  const answers = (answer as Record<string, string> | undefined) || {};

  const handleChange = (itemId: string, value: string) => {
    if (!interactive) return;
    onAnswer({ ...answers, [itemId]: value });
  };

  // Collect fill-side values for word bank (shuffled)
  const shuffledWordBank = useMemo(() => {
    if (!block.showWordBank) return [];
    return deterministicShuffle(
      block.items
      .map((item) => (block.fillSide === "left" ? item.left : item.right))
      .filter(Boolean),
      `two-column-fill:${block.id}:${block.fillSide}`
    );
  }, [block.id, block.items, block.showWordBank, block.fillSide]);

  // Column ratio → grid-template-columns
  const gridCols = block.colRatio === "1-2" ? "1fr 2fr"
    : block.colRatio === "2-1" ? "2fr 1fr"
    : "1fr 1fr";

  // Print / non-interactive mode
  if (!interactive) {
    return (
      <div className="space-y-2">
        {block.instruction && (
          <p className="text-muted-foreground">{block.instruction}</p>
        )}
        {/* Word Bank */}
        {block.showWordBank && shuffledWordBank.length > 0 && (
          <div className="rounded p-3 border border-dashed border-muted-foreground/30">
            <div className="flex flex-wrap gap-2">
              {shuffledWordBank.map((text, i) => (
                <span key={i} className="px-2 py-0.5 bg-background rounded border">
                  {text}
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="grid" style={{ gridTemplateColumns: gridCols, gap: "0 24px" }}>
          {block.items.map((item, i) => (
            <React.Fragment key={item.id}>
              {/* Left cell */}
              <div
                className={`flex items-center gap-3 ${block.extendedRows ? "py-1" : "py-2"} border-b ${i === 0 ? "border-t" : ""}`}
                style={block.extendedRows ? { minHeight: "3.5rem" } : undefined}
              >
                {block.fillSide === "left" ? (
                  hasHandwriting(item.left) ? (
                    <span className="flex-1">{renderHandwriting(item.left)}</span>
                  ) : showSolutions ? (
                    <span className="flex-1 text-green-600 font-medium">{item.left}</span>
                  ) : (
                    <span className="flex-1 border-b border-dashed border-muted-foreground/30" style={{ minHeight: "1.5em" }}>&nbsp;</span>
                  )
                ) : (
                  <span className="flex-1">{item.left}</span>
                )}
              </div>
              {/* Right cell */}
              <div
                className={`flex items-center gap-3 ${block.extendedRows ? "py-1" : "py-2"} border-b ${i === 0 ? "border-t" : ""}`}
                style={block.extendedRows ? { minHeight: "3.5rem" } : undefined}
              >
                {block.fillSide === "right" ? (
                  hasHandwriting(item.right) ? (
                    <span className="flex-1">{renderHandwriting(item.right)}</span>
                  ) : showSolutions ? (
                    <span className="flex-1 text-green-600 font-medium">{item.right}</span>
                  ) : (
                    <span className="flex-1 border-b border-dashed border-muted-foreground/30" style={{ minHeight: "1.5em" }}>&nbsp;</span>
                  )
                ) : (
                  <span className="flex-1">{item.right}</span>
                )}
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  }

  // Online / interactive mode
  return (
    <div className="space-y-3">
      {block.instruction && (
        <p className="text-muted-foreground">{block.instruction}</p>
      )}
      {/* Word Bank */}
      {block.showWordBank && shuffledWordBank.length > 0 && (
        <div className="rounded p-3 border border-dashed border-muted-foreground/30">
          <div className="flex flex-wrap gap-2">
            {shuffledWordBank.map((text, i) => (
              <span key={i} className="px-2 py-0.5 bg-background rounded border">
                {text}
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="grid" style={{ gridTemplateColumns: gridCols, gap: "0 24px" }}>
        {block.items.map((item, i) => (
          <React.Fragment key={item.id}>
            {/* Left cell */}
            <div
              className={`flex items-center gap-3 ${block.extendedRows ? "py-1" : "py-2"} border-b ${i === 0 ? "border-t" : ""}`}
              style={block.extendedRows ? { minHeight: "3.5rem" } : undefined}
            >
              {block.fillSide === "left" ? (
                hasHandwriting(item.left) ? (
                  <span className="flex-1">{renderHandwriting(item.left)}</span>
                ) : (
                  <input
                    type="text"
                    className="flex-1 border-b border-dashed border-muted-foreground/40 bg-transparent outline-none text-cv-sm px-1 py-0.5 focus:border-primary"
                    value={answers[item.id] || ""}
                    onChange={(e) => handleChange(item.id, e.target.value)}
                    placeholder="…"
                  />
                )
              ) : (
                <span className="flex-1">{item.left}</span>
              )}
            </div>
            {/* Right cell */}
            <div
              className={`flex items-center gap-3 ${block.extendedRows ? "py-1" : "py-2"} border-b ${i === 0 ? "border-t" : ""}`}
              style={block.extendedRows ? { minHeight: "3.5rem" } : undefined}
            >
              {block.fillSide === "right" ? (
                hasHandwriting(item.right) ? (
                  <span className="flex-1">{renderHandwriting(item.right)}</span>
                ) : (
                  <input
                    type="text"
                    className="flex-1 border-b border-dashed border-muted-foreground/40 bg-transparent outline-none text-cv-sm px-1 py-0.5 focus:border-primary"
                    value={answers[item.id] || ""}
                    onChange={(e) => handleChange(item.id, e.target.value)}
                    placeholder="…"
                  />
                )
              ) : (
                <span className="flex-1">{item.right}</span>
              )}
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function GlossaryView({
  block,
  brand,
  bodyFont,
  isNonLatin,
  translationScale,
}: {
  block: GlossaryBlock;
  brand?: Brand;
  bodyFont?: string;
  isNonLatin?: boolean;
  translationScale?: number;
}) {
  const colWidth = `${block.leftColWidth ?? 25}%`;
  const brandFonts = getBrandFonts(brand || "edoomio");
  const resolvedBodyFont = bodyFont || brandFonts.bodyFont;
  const termStyle: React.CSSProperties = isNonLatin ? { fontFamily: resolvedBodyFont } : {};
  const scale = translationScale ?? (isNonLatin ? 0.9 : undefined);
  const defStyle: React.CSSProperties = scale ? { fontSize: `${scale}em` } : {};
  return (
    <div className={`space-y-2 ${s.glossary}`}>
      {block.instruction && (
        <p className="text-muted-foreground">{block.instruction}</p>
      )}
      <div className="space-y-0 border-t">
        {block.pairs.map((pair) => (
          <div
            key={pair.id}
            className="glossary-row flex items-start gap-4 py-1 border-b"
          >
            <span className={`font-medium ${s.glossaryTerm}`} style={{ width: colWidth, minWidth: colWidth, ...termStyle }}>
              {pair.term}
            </span>
            <span className="flex-1" style={defStyle}>
              {pair.definition}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function OpenResponseView({
  block,
  interactive,
  answer,
  onAnswer,
}: {
  block: OpenResponseBlock;
  interactive: boolean;
  answer: unknown;
  onAnswer: (value: unknown) => void;
}) {
  const tb = useTranslations("blockRenderer");

  return (
    <div className="space-y-2">
      <p className="font-medium">{block.question}</p>
      {interactive ? (
        <textarea
          className="w-full border rounded p-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
          rows={block.lines}
          value={(answer as string) || ""}
          onChange={(e) => onAnswer(e.target.value)}
          placeholder={tb("writeAnswerHere")}
        />
      ) : (
        <div className="space-y-0">
          {Array.from({ length: block.lines }).map((_, i) => (
            <div key={i} className="border-b border-gray-300 h-8" />
          ))}
        </div>
      )}
    </div>
  );
}

function WordBankView({ block }: { block: WordBankBlock }) {
  const tb = useTranslations("blockRenderer");
  return (
    <div className="border-2 border-dashed border-muted-foreground/20 rounded p-4">
      <p className="text-cv-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
        {tb("wordBank")}
      </p>
      <div className="flex flex-wrap gap-2">
        {block.words.map((word, i) => (
          <span key={i} className={s.wordChip}>
            {word}
          </span>
        ))}
      </div>
    </div>
  );
}

function NumberLineView({ block }: { block: NumberLineBlock }) {
  const ticks: number[] = [];
  for (let v = block.min; v <= block.max; v += block.step) {
    ticks.push(v);
  }
  return (
    <div className="py-4">
      <div className="relative mx-6">
        <div className="h-0.5 bg-foreground w-full" />
        <div className="flex justify-between -mt-2">
          {ticks.map((v) => (
            <div key={v} className="flex flex-col items-center">
              <div className="h-3 w-0.5 bg-foreground" />
              <span className="text-cv-xs mt-1 text-muted-foreground">{v}</span>
            </div>
          ))}
        </div>
        {block.markers.map((m, i) => {
          const pct = ((m - block.min) / (block.max - block.min)) * 100;
          return (
            <div
              key={i}
              className="absolute -top-2 w-3 h-3 rounded-full bg-primary border-2 border-background"
              style={{ left: `${pct}%`, transform: "translateX(-50%)" }}
              title={`${m}`}
            />
          );
        })}
      </div>
    </div>
  );
}

/** Render {{blank}} placeholders as visual gaps inside T/F statement text (matching fill-in-blank style) */
function renderTfBlanks(text: string): React.ReactNode {
  if (!text.includes("{{blank}}")) return text;
  const parts = text.split("{{blank}}");
  return parts.flatMap((part, i) =>
    i < parts.length - 1
      ? [part, <span key={i} className="bg-gray-100 px-2 mx-1" style={{ display: 'inline-flex', alignItems: 'center', verticalAlign: 'text-bottom', height: '1.3em', borderRadius: 4, minWidth: 80 }}>&nbsp;</span>]
      : [part]
  );
}

function TrueFalseMatrixView({
  block,
  interactive,
  showSolutions = false,
  showPill = true,
  taskNumber,
  lessonLabel,
  brand,
  bodyFont,
  bodyFontSize,
  isNonLatin = false,
  accentColor,
}: {
  block: TrueFalseMatrixBlock;
  interactive: boolean;
  answer: unknown;
  onAnswer: (value: unknown) => void;
  showResults: boolean;
  showSolutions?: boolean;
  showPill?: boolean;
  taskNumber?: number;
  lessonLabel?: string;
  brand?: Brand;
  bodyFont?: string;
  bodyFontSize?: string;
  isNonLatin?: boolean;
  accentColor?: string | null;
}) {
  const tc = useTranslations("common");
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const fontFamily = bodyFont || "inherit";

  const handleSelect = (stmtId: string, value: boolean) => {
    if (stmtId in answers) return; // already answered
    setAnswers((prev) => ({ ...prev, [stmtId]: value }));
  };

  return (
    <TaskContainer
      showPill={showPill}
      taskNumber={taskNumber}
      lessonLabel={lessonLabel}
      instruction={block.instruction || "Kreuzen Sie die richtige Antwort an."}
      instructionStyle={bodyFontSize ? { fontSize: bodyFontSize } : undefined}
      accentColor={accentColor}
    >
      <div className="space-y-2 text-cv-sm" style={{ fontFamily, ...(bodyFontSize ? { fontSize: bodyFontSize } : {}) }}>
      <div>
        <div className="flex items-center gap-3 py-2 border-b">
          <div className="flex-1 font-bold text-foreground">{block.statementColumnHeader || ""}</div>
          <div className="w-20 text-center font-medium text-muted-foreground text-xs uppercase">{block.trueLabel || tc("true")}</div>
          <div className="w-20 text-center font-medium text-muted-foreground text-xs uppercase">{block.falseLabel || tc("false")}</div>
        </div>
        <div>
          {(() => {
            const orderedStatements = block.statementOrder
              ? block.statementOrder
                  .map((id) => block.statements.find((s) => s.id === id))
                  .filter((s): s is NonNullable<typeof s> => !!s)
                  .concat(block.statements.filter((s) => !block.statementOrder!.includes(s.id)))
              : block.statements;
            return orderedStatements.map((stmt, stmtIndex) => {
            const hasAnswered = stmt.id in answers;
            const selected = hasAnswered ? answers[stmt.id] : undefined;
            const isCorrect = hasAnswered && selected === stmt.correctAnswer;

            const getOptionClass = (optionValue: boolean) => {
              if (!hasAnswered) return "border-muted-foreground/30 hover:border-primary/50";
              if (selected === optionValue) {
                return isCorrect
                  ? `${s.controlBoxFilled}`
                  : "border-red-500 bg-red-500 text-white";
              }
              if (stmt.correctAnswer === optionValue) {
                return "border-blue-500 bg-blue-500 text-white";
              }
              return "border-muted-foreground/30";
            };

            return (
              <div key={stmt.id} className="flex items-center gap-3 py-2 border-b last:border-b-0">
                <span className={`${NUMBER_BADGE_CLASS} shrink-0`}>
                  {String(stmtIndex + 1).padStart(2, "0")}
                </span>
                <span className="flex-1">{renderTfBlanks(stmt.text)}</span>
                <div className="w-20 flex items-center justify-center">
                  {showSolutions && !interactive ? (
                    stmt.correctAnswer ? (
                      <div className={CONTROL_BOX_FILLED_CLASS} />
                    ) : (
                      <div className={CONTROL_BOX_CLASS} />
                    )
                  ) : (
                    <button
                      className={`${CONTROL_BOX_CLASS} transition-colors ${getOptionClass(true)}`}
                      onClick={() => handleSelect(stmt.id, true)}
                      disabled={hasAnswered}
                    />
                  )}
                </div>
                <div className="w-20 flex items-center justify-center">
                  {showSolutions && !interactive ? (
                    !stmt.correctAnswer ? (
                      <div className={CONTROL_BOX_FILLED_CLASS} />
                    ) : (
                      <div className={CONTROL_BOX_CLASS} />
                    )
                  ) : (
                    <button
                      className={`${CONTROL_BOX_CLASS} transition-colors ${getOptionClass(false)}`}
                      onClick={() => handleSelect(stmt.id, false)}
                      disabled={hasAnswered}
                    />
                  )}
                </div>
              </div>
            );
          });
          })()}
        </div>
      </div>
    </div>
    </TaskContainer>
  );
}

function ArticleTrainingView({
  block,
  interactive,
  answer,
  onAnswer,
  showResults,
  showSolutions = false,
}: {
  block: ArticleTrainingBlock;
  interactive: boolean;
  answer: unknown;
  onAnswer: (value: unknown) => void;
  showResults: boolean;
  showSolutions?: boolean;
}) {
  const t = useTranslations("viewer");
  const answers = (answer as Record<string, ArticleAnswer | null> | undefined) || {};
  const articles: ArticleAnswer[] = ["der", "das", "die"];

  const handleSelect = (itemId: string, value: ArticleAnswer) => {
    if (!interactive) return;
    onAnswer({ ...answers, [itemId]: value });
  };

  return (
    <div className="space-y-2">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="w-[28px] p-2 border-b"></th>
            {articles.map((a) => (
              <th key={a} className="w-14 p-2 border-b text-center font-medium text-muted-foreground">{a}</th>
            ))}
            <th className="text-left py-2 px-2 border-b font-bold text-foreground"></th>
            {block.showWritingLine && (
              <th className="text-left py-2 px-2 border-b font-bold text-muted-foreground"></th>
            )}
          </tr>
        </thead>
        <tbody>
          {block.items.map((item, idx) => {
            const selected = answers[item.id];
            const isCorrect = selected === item.correctArticle;

            return (
              <tr key={item.id} className="border-b last:border-b-0">
                <td className="p-2 text-center">
                  <span className={NUMBER_BADGE_CLASS}>
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                </td>
                {articles.map((a) => (
                  <td key={a} className="p-2 text-center">
                    {interactive ? (
                      <button
                        className={`${CONTROL_BOX_CLASS} inline-flex transition-colors
                          ${selected === a
                            ? showResults
                              ? item.correctArticle === a
                                ? s.controlBoxFilled
                                : "border-red-500 bg-red-500 text-white"
                              : "border-primary bg-primary text-white"
                            : "border-muted-foreground/30 hover:border-primary/50"
                          }`}
                        onClick={() => handleSelect(item.id, a)}
                      >
                        {selected === a && "✓"}
                      </button>
                    ) : showSolutions && item.correctArticle === a ? (
                      <div className={`${CONTROL_BOX_FILLED_CLASS} mx-auto`} />
                    ) : (
                      <div className={`${CONTROL_BOX_CLASS} mx-auto`} />
                    )}
                  </td>
                ))}
                <td className="py-2 px-2">
                  <span className="flex-1">{item.text}</span>
                </td>
                {block.showWritingLine && (
                  <td className="py-2 px-2">
                    {showSolutions ? (
                      <span className="text-green-800 font-semibold text-cv-sm">{item.correctArticle} {item.text}</span>
                    ) : (
                      <div className="border-b border-muted-foreground/30 h-6 min-w-[100px]" />
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      {showResults && (
        <p className="text-cv-xs text-muted-foreground">
          {t("resultCount", { correct: block.items.filter((item) => answers[item.id] === item.correctArticle).length, total: block.items.length })}
        </p>
      )}
    </div>
  );
}

function ColumnsView({
  block,
  mode,
  answer,
  onAnswer,
  showResults,
  showSolutions = false,
  primaryColor,
  allBlocks,
  brand = "edoomio",
}: {
  block: ColumnsBlock;
  mode: ViewMode;
  answer: unknown;
  onAnswer: (value: unknown) => void;
  showResults: boolean;
  showSolutions?: boolean;
  primaryColor?: string;
  allBlocks?: WorksheetBlock[];
  brand?: Brand;
}) {
  const answers = (answer as Record<string, unknown> | undefined) || {};
  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: `repeat(${block.columns}, 1fr)` }}
    >
      {block.children.map((col, colIndex) => (
        <div key={colIndex} className="space-y-4">
          {col.map((childBlock) => (
            <ViewerBlockRenderer
              key={childBlock.id}
              block={childBlock}
              mode={mode}
              answer={answers[childBlock.id]}
              onAnswer={(value) =>
                onAnswer({ ...answers, [childBlock.id]: value })
              }
              showResults={showResults}
              showSolutions={showSolutions}
              primaryColor={primaryColor}
              allBlocks={allBlocks}
              brand={brand}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Order Items View ────────────────────────────────────────
function OrderItemsView({
  block,
  mode,
  interactive,
  answer,
  onAnswer,
  showResults,
  showSolutions = false,
  showPill = true,
  taskNumber,
  lessonLabel,
}: {
  block: OrderItemsBlock;
  mode: ViewMode;
  interactive: boolean;
  answer: unknown;
  onAnswer: (value: unknown) => void;
  showResults: boolean;
  showSolutions?: boolean;
  showPill?: boolean;
  taskNumber?: number;
  lessonLabel?: string;
}) {
  const t = useTranslations("viewer");
  const isPrint = mode === "print";
  // Local state for when no external answer/onAnswer is provided (e.g. course viewer)
  const [localOrder, setLocalOrder] = React.useState<string[]>([]);
  const externalOrder = (answer as string[] | undefined) || [];
  const userOrder = answer !== undefined ? externalOrder : localOrder;
  const handleAnswer = (val: unknown) => {
    if (answer !== undefined) {
      onAnswer(val);
    } else {
      setLocalOrder(val as string[]);
    }
  };

  // Shuffle items deterministically based on block id for print/initial state
  const shuffledItems = useMemo(() => {
    const arr = [...block.items];
    let seed = 0;
    for (let i = 0; i < block.id.length; i++) {
      seed = ((seed << 5) - seed + block.id.charCodeAt(i)) | 0;
    }
    for (let i = arr.length - 1; i > 0; i--) {
      seed = (seed * 16807 + 0) % 2147483647;
      const j = Math.abs(seed) % (i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [block.items, block.id]);

  // Initialize user order from shuffled if empty
  React.useEffect(() => {
    if (!isPrint && userOrder.length === 0 && block.items.length > 0) {
      handleAnswer(shuffledItems.map((item) => item.id));
    }
  }, [isPrint, block.items.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const displayItems =
    userOrder.length > 0
      ? userOrder
          .map((id) => block.items.find((item) => item.id === id))
          .filter(Boolean)
      : shuffledItems;

  const moveItem = (currentIndex: number, direction: -1 | 1) => {
    const newIndex = currentIndex + direction;
    if (newIndex < 0 || newIndex >= displayItems.length) return;
    const order = userOrder.length > 0 ? [...userOrder] : shuffledItems.map((item) => item.id);
    [order[currentIndex], order[newIndex]] = [
      order[newIndex],
      order[currentIndex],
    ];
    handleAnswer(order);
  };

  return (
    <TaskContainer showPill={showPill} taskNumber={taskNumber} lessonLabel={lessonLabel}>
    <div className="space-y-2 text-cv-sm">
      {block.instruction && (
        <p className="font-medium">{block.instruction}</p>
      )}
      <div>
        {displayItems.map((item, i) => {
          if (!item) return null;
          const isCorrect = item.correctPosition === i + 1;

          return (
            <div
              key={item.id}
              className="flex items-center gap-3 py-2 border-b last:border-b-0"
            >
              <span className={`${NUMBER_BADGE_CLASS} shrink-0`}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className={`flex-1 ${isCorrect ? "text-green-700" : ""}`}>{item.text}</span>
              {!isPrint && (
                <div className="flex items-center gap-1">
                  <button
                    className="p-1 hover:bg-muted rounded disabled:opacity-30"
                    onClick={() => moveItem(i, -1)}
                    disabled={i === 0}
                    aria-label={t("moveUp")}
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 15l-6-6-6 6"/></svg>
                  </button>
                  <button
                    className="p-1 hover:bg-muted rounded disabled:opacity-30"
                    onClick={() => moveItem(i, 1)}
                    disabled={i === displayItems.length - 1}
                    aria-label={t("moveDown")}
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
    </TaskContainer>
  );
}

// ─── Inline Choices View ─────────────────────────────────────

/** Simple numeric hash for deterministic shuffle seeds. */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    hash = ((hash << 5) - hash + c) | 0;
  }
  return hash;
}

/** Deterministic Fisher-Yates shuffle using a simple LCG PRNG. */
function seededShuffleArr<T>(arr: T[], seed: number): { item: T; originalIndex: number }[] {
  const indexed = arr.map((item, i) => ({ item, originalIndex: i }));
  let s = seed;
  const random = () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
  for (let i = indexed.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [indexed[i], indexed[j]] = [indexed[j], indexed[i]];
  }
  return indexed;
}

/** Render one inline-choices line with interactive/print mode support. */
function renderInlineChoiceViewLine(
  content: string,
  lineKey: string,
  interactive: boolean,
  selections: Record<string, string>,
  onAnswer: (value: unknown) => void,
  showResults: boolean,
  choiceCounter: { value: number },
  showSolutions = false,
): React.ReactNode[] {
  const parts = content.split(/(\{\{(?:choice:)?[^}]+\}\})/g);
  // Track whether any visible text appeared before the current part
  let hasTextBefore = false;
  return parts.map((part, i) => {
    const match = part.match(/\{\{(?:choice:)?(.+)\}\}/);
    if (match) {
      const rawOptions = match[1].split("|");
      const atStart = !hasTextBefore;
      const capitalise = (s: string) => atStart ? s.charAt(0).toUpperCase() + s.slice(1) : s;
      const key = `choice-${choiceCounter.value}`;
      choiceCounter.value++;
      const selectedValue = selections[key] || "";

      // Normalise: if any option has *, move it to first; otherwise first = correct
      const starIdx = rawOptions.findIndex((o) => o.startsWith("*"));
      const options = starIdx >= 0
        ? [rawOptions[starIdx].slice(1), ...rawOptions.filter((_, idx) => idx !== starIdx).map((o) => o.startsWith("*") ? o.slice(1) : o)]
        : rawOptions;
      // options[0] is always correct now

      // Deterministic shuffle for display so students can't exploit position
      const seed = hashCode(`${lineKey}-${i}`);
      const shuffled = seededShuffleArr(options, seed);

      if (interactive) {
        return (
          <span key={`${lineKey}-${i}`} className="inline-flex items-center gap-1 mx-0.5">
            {shuffled.map((sh, oi) => {
              const isCorrectOpt = sh.originalIndex === 0;
              const label = capitalise(sh.item);
              const isSelected = selectedValue === label;

              let btnClass =
                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer transition-colors";
              if (showResults) {
                if (isCorrectOpt) {
                  btnClass += " bg-green-100 text-green-800 font-semibold";
                } else if (isSelected && !isCorrectOpt) {
                  btnClass += " bg-red-100 text-red-800 line-through";
                } else {
                  btnClass += " text-muted-foreground";
                }
              } else if (isSelected) {
                btnClass += " bg-primary/10 text-primary font-semibold";
              } else {
                btnClass += " hover:bg-muted";
              }

              return (
                <span key={oi} className="inline-flex items-center">
                  {oi > 0 && (
                    <span className="mx-0.5 text-muted-foreground">/</span>
                  )}
                  <button
                    type="button"
                    className={btnClass}
                    onClick={() => {
                      if (showResults) return;
                      onAnswer({ ...selections, [key]: label });
                    }}
                    disabled={showResults}
                  >
                    <span
                      className={`inline-block w-3 h-3 rounded-full border-[1.5px] shrink-0 ${
                        isSelected
                          ? "border-primary bg-primary"
                          : "border-muted-foreground/40"
                      }`}
                      style={{ position: 'relative', top: 2 }}
                    />
                    {label}
                  </button>
                </span>
              );
            })}
          </span>
        );
      }

      // Print mode: show squares (also shuffled for fairness)
      const printShuffled = seededShuffleArr(options, seed);
      return (
        <span key={`${lineKey}-${i}`} style={{ marginLeft: 2, marginRight: 2 }}>
          {printShuffled.map((sh, oi) => {
            const isCorrectOpt = sh.originalIndex === 0;
            const label = capitalise(sh.item);
            const filled = showSolutions && isCorrectOpt;
            return (
              <span key={oi} style={{ marginRight: oi < printShuffled.length - 1 ? 6 : 0 }}>
                <span
                  className="inline-block rounded border-2"
                  style={{
                    width: 20,
                    height: 20,
                    verticalAlign: '-5px',
                    borderColor: filled ? '#16a34a' : 'rgba(115,115,115,0.3)',
                    backgroundColor: filled ? '#16a34a' : 'transparent',
                  }}
                />
                <span
                  className="font-semibold"
                  style={{
                    marginLeft: 3,
                    ...(filled ? { color: '#16a34a' } : {}),
                  }}
                >
                  {label}
                </span>
              </span>
            );
          })}
        </span>
      );
    }
    if (part.trim().length > 0) hasTextBefore = true;
    return <span key={`${lineKey}-${i}`}>{renderTextWithSup(part)}</span>;
  });
}

function InlineChoicesView({
  block,
  interactive,
  answer,
  onAnswer,
  showResults,
  showSolutions = false,
  mode = "online",
}: {
  block: InlineChoicesBlock;
  interactive: boolean;
  answer: unknown;
  onAnswer: (value: unknown) => void;
  showResults: boolean;
  showSolutions?: boolean;
  mode?: ViewMode;
}) {
  const selections = (answer as Record<string, string> | undefined) || {};
  const items = migrateInlineChoicesBlock(block);
  const choiceCounter = { value: 0 };
  const isPrint = mode === "print";

  return (
    <div>
      {items.map((item, idx) => (
        <div
          key={item.id || idx}
          className="flex items-center border-b last:border-b-0"
          style={{ gap: 12, paddingTop: 8, paddingBottom: 8 }}
        >
          <span className={NUMBER_BADGE_CLASS}>
            {String(idx + 1).padStart(2, "0")}
          </span>
          <span className="flex-1">
            {renderInlineChoiceViewLine(
              item.content,
              `line-${idx}`,
              interactive,
              selections,
              onAnswer,
              showResults,
              choiceCounter,
              showSolutions,
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Render text that may contain <sup>...</sup> tags as React elements. */
function renderTextWithSup(text: string): React.ReactNode[] {
  const parts = text.split(/(<sup>[^<]*<\/sup>)/g);
  return parts.map((p, i) => {
    const m = p.match(/^<sup>([^<]*)<\/sup>$/);
    if (m) {
      return (
        <span
          key={i}
          className="text-muted-foreground"
          style={{ fontSize: '0.6em', position: 'relative', top: '-0.5em', marginLeft: 2, lineHeight: 0 }}
        >
          {m[1]}
        </span>
      );
    }
    return <React.Fragment key={i}>{p}</React.Fragment>;
  });
}

// ─── Word Search View ────────────────────────────────────────
function WordSearchView({
  block,
  mode,
  interactive,
  answer,
  onAnswer,
}: {
  block: WordSearchBlock;
  mode: ViewMode;
  interactive: boolean;
  answer: unknown;
  onAnswer: (value: unknown) => void;
}) {
  const selectedCells = (answer as string[] | undefined) || [];
  const isPrint = mode === "print";

  const toggleCell = (key: string) => {
    if (!interactive) return;
    const newSelection = selectedCells.includes(key)
      ? selectedCells.filter((k) => k !== key)
      : [...selectedCells, key];
    onAnswer(newSelection);
  };

  if (block.grid.length === 0) return null;

  return (
    <div className="space-y-3">
      {block.showWordList && (
        <div className="flex flex-wrap gap-2">
          {block.words.map((word, i) => (
            <span
              key={i}
              className="px-2 py-0.5 bg-muted rounded font-medium uppercase"
            >
              {word}
            </span>
          ))}
        </div>
      )}
      <div className="w-full">
        <table className="w-full border-separate border-spacing-0">
          <tbody>
            {block.grid.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => {
                  const key = `${ri}-${ci}`;
                  const isSelected = selectedCells.includes(key);
                  const isTop = ri === 0;
                  const isLeft = ci === 0;
                  const isTopLeft = isTop && isLeft;
                  const isTopRight = isTop && ci === row.length - 1;
                  const isBottomLeft = ri === block.grid.length - 1 && isLeft;
                  const isBottomRight = ri === block.grid.length - 1 && ci === row.length - 1;
                  const cellStyle: React.CSSProperties = {
                    borderRight: '1px solid var(--color-border)',
                    borderBottom: '1px solid var(--color-border)',
                    ...(isTop ? { borderTop: '1px solid var(--color-border)' } : {}),
                    ...(isLeft ? { borderLeft: '1px solid var(--color-border)' } : {}),
                    ...(isTopLeft ? { borderTopLeftRadius: 4 } : {}),
                    ...(isTopRight ? { borderTopRightRadius: 4 } : {}),
                    ...(isBottomLeft ? { borderBottomLeftRadius: 4 } : {}),
                    ...(isBottomRight ? { borderBottomRightRadius: 4 } : {}),
                    ...(isPrint ? { fontWeight: 500 } : {}),
                  };
                  return (
                    <td
                      key={ci}
                      className={`text-center font-mono select-none aspect-square transition-colors ${isPrint ? '' : 'font-semibold'}
                        ${interactive ? "cursor-pointer hover:bg-primary/10" : ""}
                        ${isSelected ? "bg-primary/20 text-primary" : ""}`}
                      style={cellStyle}
                      onClick={() => toggleCell(key)}
                    >
                      {cell}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Sorting Categories View ────────────────────────────────
// ─── Sorting Categories View ──────────────────────────────
function SortingCategoriesView({
  block,
  interactive,
  answer,
  onAnswer,
  showResults,
  showSolutions = false,
}: {
  block: SortingCategoriesBlock;
  interactive: boolean;
  answer: unknown;
  onAnswer: (value: unknown) => void;
  showResults: boolean;
  showSolutions?: boolean;
}) {
  const t = useTranslations("viewer");
  const userSorting = (answer as Record<string, string[]> | undefined) || {};
  const [dragItem, setDragItem] = useState<string | null>(null);

  const sortedItemIds = Object.values(userSorting).flat();

  // Deterministic shuffle for initial display
  const shuffledItems = useMemo(() => {
    const arr = [...block.items];
    let seed = 0;
    for (let i = 0; i < block.id.length; i++) {
      seed = ((seed << 5) - seed + block.id.charCodeAt(i)) | 0;
    }
    for (let i = arr.length - 1; i > 0; i--) {
      seed = (seed * 16807 + 0) % 2147483647;
      const j = Math.abs(seed) % (i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [block.items, block.id]);

  const displayUnsorted = shuffledItems.filter(
    (item) => !sortedItemIds.includes(item.id)
  );

  const addToCategory = (catId: string, itemId: string) => {
    if (!interactive || showResults) return;
    const newSorting = { ...userSorting };
    for (const key of Object.keys(newSorting)) {
      newSorting[key] = newSorting[key].filter((id) => id !== itemId);
    }
    newSorting[catId] = [...(newSorting[catId] || []), itemId];
    onAnswer(newSorting);
  };

  const removeFromCategory = (catId: string, itemId: string) => {
    if (!interactive || showResults) return;
    const newSorting = { ...userSorting };
    newSorting[catId] = (newSorting[catId] || []).filter((id) => id !== itemId);
    onAnswer(newSorting);
  };

  const getItemById = (id: string) => block.items.find((item) => item.id === id);

  // Print mode: show all items as chips + empty category boxes with writing lines
  if (!interactive) {
    // Compute max items per category for writing lines
    const maxItemsPerCat = Math.max(...block.categories.map((cat) => cat.correctItems.length), 0);
    return (
      <div className="space-y-3">
        {block.instruction && (
          <p className="font-medium">{block.instruction}</p>
        )}
        <div className="flex flex-wrap gap-2">
          {shuffledItems.map((item) => (
            <span
              key={item.id}
              className="px-3 py-1 rounded border border-border"
            >
              {item.text}
            </span>
          ))}
        </div>
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${block.categories.length}, 1fr)` }}>
          {block.categories.map((cat) => (
            <div key={cat.id} className="rounded border border-border overflow-hidden">
              <div className="bg-muted px-3 py-2">
                <span className="font-semibold">{cat.label}</span>
              </div>
              <div className="px-2 pt-1 pb-4 min-h-[100px]">
                {showSolutions ? (
                  <div className="space-y-1 pt-1">
                    {cat.correctItems.map((itemId) => {
                      const item = block.items.find((it) => it.id === itemId);
                      return item ? (
                        <div key={itemId} className="text-green-800 font-semibold text-cv-sm">{item.text}</div>
                      ) : null;
                    })}
                  </div>
                ) : (block.showWritingLines ?? true) && maxItemsPerCat > 0 && (
                  <div className="space-y-0.5">
                    {Array.from({ length: maxItemsPerCat }).map((_, i) => (
                      <div key={i} className="h-9" style={{ borderBottom: '1px dashed var(--color-muted-foreground)', opacity: 1.0 }} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {block.instruction && (
        <p className="font-medium">{block.instruction}</p>
      )}
      {/* Unsorted items */}
      {displayUnsorted.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {displayUnsorted.map((item) => (
            <span
              key={item.id}
              className={`px-3 py-1 rounded border border-border cursor-grab transition-colors
                ${dragItem === item.id ? "bg-primary/10 border-primary" : "hover:bg-accent"}`}
              draggable
              onDragStart={() => setDragItem(item.id)}
              onDragEnd={() => setDragItem(null)}
            >
              {item.text}
            </span>
          ))}
        </div>
      )}
      {/* Category boxes */}
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${block.categories.length}, 1fr)` }}>
        {block.categories.map((cat) => {
          const catItemIds = userSorting[cat.id] || [];
          return (
            <div
              key={cat.id}
              className="rounded border border-border overflow-hidden transition-shadow"
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add("ring-2", "ring-primary");
              }}
              onDragLeave={(e) => {
                e.currentTarget.classList.remove("ring-2", "ring-primary");
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove("ring-2", "ring-primary");
                if (dragItem) {
                  addToCategory(cat.id, dragItem);
                  setDragItem(null);
                }
              }}
            >
              <div className="bg-muted px-3 py-2">
                <span className="font-semibold">{cat.label}</span>
              </div>
              <div className="p-2 space-y-1.5 min-h-[60px]">
                {catItemIds.map((itemId) => {
                  const item = getItemById(itemId);
                  if (!item) return null;
                  const isCorrect = cat.correctItems.includes(item.id);
                  let borderClass = "border-border";
                  let bgClass = "bg-card";
                  if (showResults) {
                    borderClass = isCorrect ? "border-green-500" : "border-red-500";
                    bgClass = isCorrect ? "bg-green-50" : "bg-red-50";
                  }
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center gap-2 p-2 rounded border transition-colors ${borderClass} ${bgClass}`}
                    >
                      <span className="flex-1">{item.text}</span>
                      {!showResults && (
                        <button
                          className="p-0.5 hover:bg-muted rounded text-muted-foreground"
                          onClick={() => removeFromCategory(cat.id, item.id)}
                          aria-label={t("removeFromCategory")}
                        >
                          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                        </button>
                      )}
                      {showResults && (
                        <span className={`text-cv-xs font-medium ${isCorrect ? "text-green-600" : "text-red-600"}`}>
                          {isCorrect ? "✓" : "✗"}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {showResults && (
        <p className="text-cv-xs text-muted-foreground">
          {t("resultCount", { correct: Object.entries(userSorting).reduce((total, [catId, itemIds]) => {
            const cat = block.categories.find((c) => c.id === catId);
            if (!cat) return total;
            return total + itemIds.filter((id) => cat.correctItems.includes(id)).length;
          }, 0), total: block.items.length })}
        </p>
      )}
    </div>
  );
}

// ─── Unscramble Words View ───────────────────────────────
function scrambleWordDeterministic(
  word: string,
  keepFirst: boolean,
  lowercase: boolean,
  seed: number
): string {
  let letters = word.replace(/\s+/g, "").split("");
  let firstLetter = "";
  if (keepFirst && letters.length > 1) {
    firstLetter = letters[0];
    letters = letters.slice(1);
  }
  // Deterministic Fisher-Yates shuffle
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

function UnscrambleWordsView({
  block,
  mode,
  interactive,
  answer,
  onAnswer,
  showResults,
  showSolutions = false,
  showPill = true,
  taskNumber,
  lessonLabel,
  brand,
  bodyFont,
  bodyFontSize,
  isNonLatin = false,
  accentColor,
}: {
  block: UnscrambleWordsBlock;
  mode: ViewMode;
  interactive: boolean;
  answer: unknown;
  onAnswer: (value: unknown) => void;
  showResults: boolean;
  showSolutions?: boolean;
  showPill?: boolean;
  taskNumber?: number;
  lessonLabel?: string;
  brand?: Brand;
  bodyFont?: string;
  bodyFontSize?: string;
  isNonLatin?: boolean;
  accentColor?: string | null;
}) {
  const isPrint = mode === "print";
  const fontFamily = bodyFont || "inherit";
  const [localAnswers, setLocalAnswers] = React.useState<Record<string, string>>({});
  const externalAnswers = (answer as Record<string, string> | undefined) || {};
  const userAnswers = answer !== undefined ? externalAnswers : localAnswers;
  const handleAnswer = (val: unknown) => {
    if (answer !== undefined) {
      onAnswer(val);
    } else {
      setLocalAnswers(val as Record<string, string>);
    }
  };

  // Compute a seed per word based on block id + word id
  const getSeed = (wordId: string) => {
    let seed = 0;
    const combined = block.id + wordId;
    for (let i = 0; i < combined.length; i++) {
      seed = ((seed << 5) - seed + combined.charCodeAt(i)) | 0;
    }
    return Math.abs(seed);
  };

  // Compute max word length for consistent arrow alignment
  const maxWordLength = Math.max(...block.words.map((item) => item.word.length), 0);

  // Use persisted itemOrder if available
  const orderedWords = block.itemOrder
    ? block.itemOrder
        .map((id) => block.words.find((w) => w.id === id))
        .filter((w): w is NonNullable<typeof w> => !!w)
        .concat(block.words.filter((w) => !block.itemOrder!.includes(w.id)))
    : block.words;

  return (
    <TaskContainer
      showPill={showPill}
      taskNumber={taskNumber}
      lessonLabel={lessonLabel}
      instruction={block.instruction}
      instructionStyle={bodyFontSize ? { fontSize: bodyFontSize } : undefined}
      accentColor={accentColor}
    >
      <div className="space-y-2 text-cv-sm" style={{ fontFamily, ...(bodyFontSize ? { fontSize: bodyFontSize } : {}) }}>
      <div>
        {orderedWords.map((item, i) => {
          const scrambled = scrambleWordDeterministic(
            item.word,
            block.keepFirstLetter,
            block.lowercaseAll,
            getSeed(item.id)
          );
          const userValue = userAnswers[item.id] || "";
          const hasInput = userValue.trim() !== "";
          const isCorrect =
            hasInput &&
            userValue.trim().toLowerCase() === item.word.toLowerCase();
          const isWrong = hasInput && !isCorrect;

          return (
            <div
              key={item.id}
              className="flex items-center gap-3 py-2 border-b last:border-b-0"
            >
              <span className={`${NUMBER_BADGE_CLASS} shrink-0`}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="select-none shrink-0 inline-block text-left" style={{ width: `${maxWordLength * 0.7}em` }}>
                {scrambled}
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              {isPrint && showSolutions ? (
                <span className="flex-1 text-green-800 font-semibold">{item.word}</span>
              ) : isPrint ? (
                <span className="flex-1 inline-block" style={{ borderBottom: '1px dashed var(--color-muted-foreground)', opacity: 1.0, minWidth: 80 }}>
                  &nbsp;
                </span>
              ) : (
                <div className="flex-1">
                  <input
                    type="text"
                    value={userValue}
                    onChange={(e) =>
                      handleAnswer({ ...userAnswers, [item.id]: e.target.value })
                    }
                    className={`w-full border-b-2 bg-transparent px-1 py-0.5 focus:outline-none transition-colors ${
                      isCorrect
                        ? "border-green-500 text-green-700"
                        : isWrong
                          ? "border-red-500 text-red-700"
                          : "border-muted-foreground/40 focus:border-primary"
                    }`}
                    placeholder="..."
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
    </TaskContainer>
  );
}

// ─── Fix Sentences View ─────────────────────────────────
function FixSentencesView({
  block,
  mode,
  interactive,
  answer,
  onAnswer,
  showResults,
  showSolutions = false,
}: {
  block: FixSentencesBlock;
  mode: ViewMode;
  interactive: boolean;
  answer: unknown;
  onAnswer: (value: unknown) => void;
  showResults: boolean;
  showSolutions?: boolean;
}) {
  const t = useTranslations("viewer");
  const isPrint = mode === "print";
  // answer: Record<sentenceId, string[]> where string[] is user-ordered parts
  const userOrders = (answer as Record<string, string[]> | undefined) || {};

  // Deterministic shuffle based on block id + sentence id
  const getShuffledParts = (sentenceId: string, parts: string[]): string[] => {
    const arr = [...parts];
    let seed = 0;
    const combined = block.id + sentenceId;
    for (let i = 0; i < combined.length; i++) {
      seed = ((seed << 5) - seed + combined.charCodeAt(i)) | 0;
    }
    for (let i = arr.length - 1; i > 0; i--) {
      seed = (seed * 16807 + 0) % 2147483647;
      const j = Math.abs(seed) % (i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // Initialize user orders if empty
  React.useEffect(() => {
    if (interactive) {
      const needsInit = block.sentences.some((s) => !userOrders[s.id]);
      if (needsInit) {
        const newOrders: Record<string, string[]> = { ...userOrders };
        for (const s of block.sentences) {
          if (!newOrders[s.id]) {
            const parts = s.sentence.split(" | ").map((p) => p.trim());
            newOrders[s.id] = getShuffledParts(s.id, parts);
          }
        }
        onAnswer(newOrders);
      }
    }
  }, [interactive, block.sentences.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const movePart = (
    sentenceId: string,
    currentIndex: number,
    direction: -1 | 1
  ) => {
    if (showResults) return;
    const order = [...(userOrders[sentenceId] || [])];
    const newIndex = currentIndex + direction;
    if (newIndex < 0 || newIndex >= order.length) return;
    [order[currentIndex], order[newIndex]] = [
      order[newIndex],
      order[currentIndex],
    ];
    onAnswer({ ...userOrders, [sentenceId]: order });
  };

  return (
    <div className="space-y-2">
      {block.instruction && (
        <p className="font-medium">{block.instruction}</p>
      )}
      <div>
        {block.sentences.map((item, i) => {
          const correctParts = item.sentence.split(" | ").map((p) => p.trim());
          const displayParts = interactive
            ? userOrders[item.id] || getShuffledParts(item.id, correctParts)
            : getShuffledParts(item.id, correctParts);
          const isFullyCorrect =
            showResults &&
            displayParts.length === correctParts.length &&
            displayParts.every((p, idx) => p === correctParts[idx]);

          return (
            <div
              key={item.id}
              className={`py-2 transition-colors ${isPrint ? '' : 'border-b last:border-b-0'} ${
                showResults
                  ? isFullyCorrect
                    ? "bg-green-50"
                    : "bg-red-50"
                  : ""
              }`}
            >
              <div className="flex items-start gap-3">
                <span className={`${NUMBER_BADGE_CLASS} shrink-0 mt-1`}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex-1">
                  <div className="flex flex-wrap gap-1.5">
                    {displayParts.map((part, pi) => (
                      <div key={pi} className="flex items-center gap-0.5">
                        {interactive && !showResults && (
                          <div className="flex flex-col gap-0">
                            <button
                              className="p-0 hover:bg-muted rounded disabled:opacity-30"
                              onClick={() => movePart(item.id, pi, -1)}
                              disabled={pi === 0}
                              aria-label={t("moveUp")}
                            >
                              <svg
                                className="h-3 w-3"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path d="M15 18l-6-6 6-6" />
                              </svg>
                            </button>
                            <button
                              className="p-0 hover:bg-muted rounded disabled:opacity-30"
                              onClick={() => movePart(item.id, pi, 1)}
                              disabled={pi === displayParts.length - 1}
                              aria-label={t("moveDown")}
                            >
                              <svg
                                className="h-3 w-3"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path d="M9 6l6 6-6 6" />
                              </svg>
                            </button>
                          </div>
                        )}
                        <span
                          className={`px-2.5 py-1 rounded border font-medium ${
                            showResults
                              ? part === correctParts[pi]
                                ? "bg-green-100 border-green-300 text-green-800"
                                : "bg-red-100 border-red-300 text-red-800"
                              : "bg-muted border-border"
                          }`}
                        >
                          {part}
                        </span>
                      </div>
                    ))}
                  </div>
                  {isPrint && showSolutions ? (
                    <div className="mt-2 text-green-800 font-semibold text-cv-sm">{correctParts.join(" ")}</div>
                  ) : isPrint ? (
                    <div className="mt-2" style={{ height: '1.8em', borderBottom: '1px dashed var(--color-muted-foreground)', opacity: 1.0 }} />
                  ) : null}
                  {showResults && !isFullyCorrect && (
                    <p className="text-cv-xs text-green-600 mt-2">
                      {correctParts.join(" ")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {showResults && (
        <p className="text-cv-xs text-muted-foreground">
          {t("resultCount", {
            correct: block.sentences.filter((s) => {
              const correctParts = s.sentence.split(" | ").map((p) => p.trim());
              const userParts = userOrders[s.id] || [];
              return (
                userParts.length === correctParts.length &&
                userParts.every((p, idx) => p === correctParts[idx])
              );
            }).length,
            total: block.sentences.length,
          })}
        </p>
      )}
    </div>
  );
}

// ─── Complete Sentences View ───────────────────────────────────
function CompleteSentencesView({
  block,
  mode,
  interactive,
  answer,
  onAnswer,
}: {
  block: CompleteSentencesBlock;
  mode: ViewMode;
  interactive: boolean;
  answer: unknown;
  onAnswer: (value: unknown) => void;
}) {
  const userAnswers = (answer as Record<string, string> | undefined) || {};

  return (
    <div className="space-y-2">
      {block.instruction && (
        <p className="font-medium">{block.instruction}</p>
      )}
      <div>
        {block.sentences.map((item, i) => (
          <div
            key={item.id}
            className="flex items-center gap-3 py-2 border-b last:border-b-0"
          >
            <span className={`${NUMBER_BADGE_CLASS} shrink-0`}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="shrink-0">{item.beginning}</span>
            {interactive ? (
              <input
                type="text"
                value={userAnswers[item.id] || ""}
                onChange={(e) => onAnswer({ ...userAnswers, [item.id]: e.target.value })}
                className="flex-1 border-b border-dashed border-muted-foreground/30 bg-transparent px-2 py-0.5 focus:outline-none focus:border-primary"
              />
            ) : (
              <div className="flex-1 border-b border-dashed border-muted-foreground/30 min-h-[14px]" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Verb Table View ────────────────────────────────────────
function VerbTableView({
  block,
  mode,
  interactive,
  answer,
  onAnswer,
  showResults,
  primaryColor = "#1a1a1a",
}: {
  block: VerbTableBlock;
  mode: ViewMode;
  interactive: boolean;
  answer: unknown;
  onAnswer: (value: unknown) => void;
  showResults: boolean;
  primaryColor?: string;
}) {
  const t = useTranslations("viewer");
  const userAnswers = (answer as Record<string, string> | undefined) || {};
  const isSplit = block.splitConjugation ?? false;
  const showGlobal = block.showConjugations ?? false;
  const isPrint = mode === "print";

  const shouldShowAnswer = (override: "show" | "hide" | null | undefined): boolean => {
    if (override === "show") return true;
    if (override === "hide") return false;
    return showGlobal;
  };

  const handleChange = (rowId: string, field: string, value: string) => {
    if (!interactive || showResults) return;
    onAnswer({ ...userAnswers, [`${rowId}_${field}`]: value });
  };

  const renderRow = (row: VerbTableBlock["singularRows"][0]) => {
    const showConj1 = shouldShowAnswer(row.showOverride);
    const showConj2 = shouldShowAnswer(row.showOverride2);
    const userVal = isSplit
      ? userAnswers[`${row.id}_conjugation`] || ""
      : userAnswers[row.id] || userAnswers[`${row.id}_conjugation`] || "";
    const userVal2 = userAnswers[`${row.id}_conjugation2`] || "";
    const isCorrect = showResults && userVal.trim().toLowerCase() === row.conjugation.trim().toLowerCase();
    const isWrong = showResults && userVal.trim() !== "" && !isCorrect;
    const isCorrect2 = showResults && isSplit && userVal2.trim().toLowerCase() === (row.conjugation2 || "").trim().toLowerCase();
    const isWrong2 = showResults && isSplit && userVal2.trim() !== "" && !isCorrect2;

    return (
      <div key={row.id} className="flex items-center gap-3 py-2 border-b last:border-b-0">
        {/* Person */}
        <span
          className="text-muted-foreground uppercase shrink-0"
          style={{ fontSize: '0.7em', width: '15%' }}
        >
          {row.person}
        </span>
        {/* Detail (formell/informell) */}
        <span
          className="text-muted-foreground shrink-0"
          style={{ fontSize: '0.7em', width: '15%' }}
        >
          {row.detail || ""}
        </span>
        {/* Pronoun */}
        <span className="font-bold shrink-0" style={{ width: '15%' }}>
          {row.pronoun}
        </span>
        {/* Conjugation 1 */}
        <span style={{ width: isSplit ? '27.5%' : '55%' }}>
          {showConj1 ? (
            <span className="font-bold" style={{ color: primaryColor }}>{row.conjugation}</span>
          ) : interactive ? (
            <span>
              <input
                type="text"
                value={userVal}
                onChange={(e) => handleChange(row.id, "conjugation", e.target.value)}
                disabled={showResults}
                className={`w-full border rounded px-2 py-1 outline-none ${
                  showResults
                    ? isCorrect
                      ? "border-green-500 bg-green-50 text-green-700"
                      : isWrong
                        ? "border-red-500 bg-red-50 text-red-700"
                        : "border-border"
                    : "border-border focus:border-primary"
                }`}
                placeholder="…"
              />
              {showResults && isWrong && (
                <span className="text-cv-xs text-green-600 mt-0.5 block">{row.conjugation}</span>
              )}
            </span>
          ) : (
            <span
              className="bg-gray-100 rounded"
              style={{ display: 'inline-block', verticalAlign: 'text-bottom', height: '1.3em', minWidth: '80px' }}
            >
              &nbsp;
            </span>
          )}
        </span>
        {/* Conjugation 2 (split) */}
        {isSplit && (
          <span style={{ width: '27.5%' }}>
            {showConj2 ? (
              <span className="font-bold" style={{ color: primaryColor }}>{row.conjugation2}</span>
            ) : interactive ? (
              <span>
                <input
                  type="text"
                  value={userVal2}
                  onChange={(e) => handleChange(row.id, "conjugation2", e.target.value)}
                  disabled={showResults}
                  className={`w-full border rounded px-2 py-1 outline-none ${
                    showResults
                      ? isCorrect2
                        ? "border-green-500 bg-green-50 text-green-700"
                        : isWrong2
                          ? "border-red-500 bg-red-50 text-red-700"
                          : "border-border"
                      : "border-border focus:border-primary"
                  }`}
                  placeholder="…"
                />
                {showResults && isWrong2 && (
                  <span className="text-cv-xs text-green-600 mt-0.5 block">{row.conjugation2}</span>
                )}
              </span>
            ) : (
              <span
                className="bg-gray-100 rounded"
                style={{ display: 'inline-block', verticalAlign: 'text-bottom', height: '1.3em', minWidth: '80px' }}
              >
                &nbsp;
              </span>
            )}
          </span>
        )}
      </div>
    );
  };

  const allRows = [...block.singularRows, ...block.pluralRows];
  const correctCount = showResults
    ? allRows.reduce((count, r) => {
        const key1 = isSplit ? `${r.id}_conjugation` : r.id;
        const val1 = (userAnswers[key1] || userAnswers[`${r.id}_conjugation`] || "").trim().toLowerCase();
        let c = val1 === r.conjugation.trim().toLowerCase() ? 1 : 0;
        if (isSplit) {
          const val2 = (userAnswers[`${r.id}_conjugation2`] || "").trim().toLowerCase();
          if (val2 === (r.conjugation2 || "").trim().toLowerCase()) c += 1;
        }
        return count + c;
      }, 0)
    : 0;
  const totalCount = isSplit ? allRows.length * 2 : allRows.length;

  return (
    <div>
      {block.verb && (
        <div className="font-bold py-2 border-b" style={{ color: primaryColor, borderColor: primaryColor }}>
          {block.verb}
        </div>
      )}
      <div>
        {/* Singular */}
        <div className="text-muted-foreground font-bold uppercase border-b border-border py-2 flex items-center">
          Singular
        </div>
        {block.singularRows.map((row) => renderRow(row))}
        {/* Plural */}
        <div className="text-muted-foreground font-bold uppercase border-b border-border py-2 flex items-center">
          Plural
        </div>
        {block.pluralRows.map((row) => renderRow(row))}
      </div>
      {showResults && (
        <p className="text-cv-xs text-muted-foreground mt-2">
          {t("resultCount", { correct: correctCount, total: totalCount })}
        </p>
      )}
    </div>
  );
}

// ─── Dialogue View ───────────────────────────────────────────
function DialogueView({
  block,
  interactive,
  answer,
  onAnswer,
  showResults,
  showSolutions = false,
  primaryColor,
}: {
  block: DialogueBlock;
  interactive: boolean;
  answer: Record<string, string>;
  onAnswer: (a: Record<string, string>) => void;
  showResults: boolean;
  showSolutions?: boolean;
  primaryColor: string;
}) {
  const t = useTranslations("blockRenderer");

  const speakerIconMap: Record<string, React.ReactNode> = {
    triangle: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" className="w-3.5 h-3.5">
        <polygon points="12,3 22,21 2,21" />
      </svg>
    ),
    square: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" className="w-3.5 h-3.5">
        <rect x="3" y="3" width="18" height="18" rx="2" />
      </svg>
    ),
    diamond: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" className="w-3.5 h-3.5">
        <polygon points="12,2 22,12 12,22 2,12" />
      </svg>
    ),
    circle: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
        <circle cx="12" cy="12" r="10" />
      </svg>
    ),
  };

  // Collect gap answers for word bank
  const gapAnswers: string[] = [];
  let gapIndex = 0;
  for (const item of block.items) {
    const matches = item.text.matchAll(/\{\{blank:([^}]+)\}\}/g);
    for (const m of matches) {
      const raw = m[1];
      const answer = raw.includes(",") ? raw.substring(0, raw.lastIndexOf(",")).trim() : raw.trim();
      gapAnswers.push(answer);
      gapIndex++;
    }
  }

  // Render text with interactive gaps
  let globalGapIdx = 0;
  const renderDialogueText = (text: string) => {
    const parts = text.split(/(\{\{blank:[^}]+\}\})/g);
    return parts.map((part, i) => {
      const match = part.match(/\{\{blank:(.+)\}\}/);
      if (match) {
        const raw = match[1];
        const commaIdx = raw.lastIndexOf(",");
        let correctAnswer: string;
        let widthMultiplier = 1;
        if (commaIdx !== -1) {
          correctAnswer = raw.substring(0, commaIdx).trim();
          const wStr = raw.substring(commaIdx + 1).trim();
          const parsed = Number(wStr);
          if (!isNaN(parsed)) widthMultiplier = parsed;
        } else {
          correctAnswer = raw.trim();
        }
        const idx = globalGapIdx++;
        const key = `gap-${idx}`;
        const userVal = answer?.[key] ?? "";
        const isCorrect = userVal.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
        const widthStyle = widthMultiplier === 0
          ? { flex: 1 } as React.CSSProperties
          : { minWidth: `${80 * widthMultiplier}px` } as React.CSSProperties;

        return interactive ? (
          <span key={i} className="inline-block mx-1">
            <input
              type="text"
              value={userVal}
              onChange={(e) => onAnswer({ ...answer, [key]: e.target.value })}
              placeholder="…"
              className={`border-b border-dashed border-muted-foreground/30 bg-transparent px-2 py-0.5 text-center focus:outline-none inline ${
                showResults
                  ? isCorrect
                    ? "border-green-500 text-green-700"
                    : "border-red-500 text-red-700"
                  : "border-gray-400 focus:border-primary"
              }`}
              style={widthMultiplier === 0 ? { flex: 1 } : { width: `${112 * widthMultiplier}px` }}
            />
          </span>
        ) : (
          <span
            key={i}
            className={`inline-block px-2 py-0.5 text-center mx-1 ${showSolutions ? "text-green-600 text-cv-xs font-medium" : ""}`}
            style={{ borderBottom: '1px dashed var(--color-muted-foreground)', ...widthStyle }}
          >
            {showSolutions ? correctAnswer : "\u00A0"}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="space-y-3">
      {block.instruction && (
        <p className="text-cv-base text-muted-foreground">{block.instruction}</p>
      )}
      {/* Word Bank */}
      {block.showWordBank && gapAnswers.length > 0 && (
        <div className="rounded p-3 border border-dashed border-muted-foreground/30">
          <div className="flex flex-wrap gap-2">
            {[...gapAnswers]
              .sort(() => Math.random() - 0.5)
              .map((text, i) => (
                <span key={i} className="px-2 py-0.5 bg-background rounded border text-cv-xs">
                  {text}
                </span>
              ))}
          </div>
        </div>
      )}
      {/* Dialogue items */}
      <div className="space-y-0">
        {block.items.map((item, i) => (
          <div key={item.id} className={`flex items-center gap-3 py-2 border-b ${i === 0 ? "border-t" : ""}`}>
            <span className="text-cv-xs font-bold text-muted-foreground bg-muted w-6 h-6 rounded flex items-center justify-center shrink-0">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="text-cv-xs font-bold text-muted-foreground bg-white border border-border box-border w-6 h-6 rounded flex items-center justify-center shrink-0">
              {speakerIconMap[item.icon] || speakerIconMap.circle}
            </span>
            <div className="flex-1 flex flex-wrap items-baseline">
              {renderDialogueText(item.text)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Chart View ──────────────────────────────────────────────
const ChartContent = dynamic(
  () => import("@/components/chart/chart-view").then((m) => m.ChartContent),
  { ssr: false, loading: () => <div className="w-full h-[300px] bg-muted/30 animate-pulse rounded" /> }
);

function ChartView({ block }: { block: ChartBlock }) {
  return (
    <div className="space-y-2">
      {block.title && (
        <p className="text-center font-semibold">{block.title}</p>
      )}
      <ChartContent block={block} />
    </div>
  );
}

// ─── Dos and Don'ts ─────────────────────────────────────────

function DosAndDontsView({ block }: { block: DosAndDontsBlock }) {
  const renderList = (items: DosAndDontsBlock["dos"], title: string) => (
    <div className={s.dosDontsColumn}>
      {block.showTitles !== false && (
        <p className={s.dosDontsTitle}>{title}</p>
      )}
      <ul className={s.lineDotList}>
        {items.map((item) => (
          <li key={item.id} className={s.lineDotListItem}>{item.text}</li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className={`${s.dosDontsWrap} ${block.layout === "vertical" ? s.dosDontsWrapVertical : ""}`}>
      {renderList(block.dos, block.dosTitle)}
      {renderList(block.donts, block.dontsTitle)}
    </div>
  );
}

// ─── Text Comparison (Textvergleich) ─────────────────────────

function TextComparisonView({ block }: { block: TextComparisonBlock }) {
  const chColor = "#3A4F40";
  const deColor = "#990033";

  const renderSide = (
    content: string,
    color: string,
    flagSrc: string,
  ) => (
    <div className="flex-1 min-w-0 flex flex-col">
      <div className="flex">
        <div
          className="py-1 text-xs font-semibold rounded-t-sm text-center uppercase flex items-center justify-center border border-b-0 border-dashed"
          style={{ width: 44, paddingLeft: 12, paddingRight: 12, borderColor: color }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={flagSrc} alt="" className="h-4 w-6 object-cover" />
        </div>
      </div>
      <div
        className={`flex-1 border border-dashed rounded-sm py-3 pr-3 pl-6 rounded-tl-none ${s.styledBorder} ${s.textComparisonBox}`}
        style={{ "--block-color": color } as React.CSSProperties}
      >
        <div
          className="tiptap max-w-none"
          dangerouslySetInnerHTML={{ __html: prepareTiptapHtml(content) }}
        />
      </div>
    </div>
  );

  return (
    <div>
      <div className={s.textComparisonWrap}>
        {renderSide(block.leftContent, chColor, "/flags/ch.svg")}
        {renderSide(block.rightContent, deColor, "/flags/de.svg")}
      </div>
      {block.comment && (
        <div className={s.commentBox} style={{ "--block-color": "#475569" } as React.CSSProperties}>
          {block.comment}
        </div>
      )}
    </div>
  );
}

// ─── Numbered Items ─────────────────────────────────────────

function isDarkColor(hex: string): boolean {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  const toLinear = (c: number) => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const L = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return L < 0.35;
}

function NumberedItemsView({ block, originalBlock, isNonLatin, translationScale }: { block: NumberedItemsBlock; originalBlock?: NumberedItemsBlock; isNonLatin?: boolean; translationScale?: number }) {
  const hasBg = !!block.bgColor;
  const textWhite = hasBg && isDarkColor(block.bgColor!);
  const radius = block.borderRadius ?? 6;
  const isBilingual = block.bilingual && !!originalBlock;
  const effectiveScale = translationScale ?? (isNonLatin ? 0.9 : undefined);

  if (!hasBg) {
    return (
      <div className={s.numberedItemsRows}>
        {block.items.map((item, i) => {
          const originalItem = originalBlock?.items[i];
          const showBilingual = isBilingual && !!originalItem && originalItem.content !== item.content;
          return (
            <div key={item.id} className={s.numberedItemRow}>
              <span className={s.accentBadge}>{String(block.startNumber + i).padStart(2, "0")}</span>
              <div className={`${s.numberedItemContent} tiptap-compact`}>
                {showBilingual ? (
                  <div className="flex-1 min-w-0">
                    <span dangerouslySetInnerHTML={{ __html: stripOuterP(prepareTiptapHtml(originalItem.content)) }} />
                    <span style={{ fontWeight: 400 }}> | </span>
                    <span style={effectiveScale ? { fontSize: `${effectiveScale}em` } : undefined} dangerouslySetInnerHTML={{ __html: stripOuterP(prepareTiptapHtml(item.content)) }} />
                  </div>
                ) : (
                  <div
                    className="tiptap max-w-none"
                    dangerouslySetInnerHTML={{ __html: prepareTiptapHtml(item.content) }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {block.items.map((item, i) => {
        const originalItem = originalBlock?.items[i];
        const showBilingual = isBilingual && !!originalItem && originalItem.content !== item.content;
        return (
          <div
            key={item.id}
            className="flex gap-0 font-semibold tiptap-compact"
            style={hasBg ? {
              backgroundColor: `${block.bgColor}18`,
              borderRadius: `${radius}px`,
              color: block.bgColor,
            } : undefined}
          >
            <div
              className="shrink-0 w-[30px] flex items-center justify-center font-bold"
              style={{
                backgroundColor: hasBg ? block.bgColor : 'var(--color-primary, #1a1a1a)12',
                color: hasBg ? (textWhite ? '#fff' : '#000') : 'var(--color-primary, #1a1a1a)',
                borderRadius: hasBg ? `${radius}px 0 0 ${radius}px` : `${radius}px`,
              }}
            >
              {String(block.startNumber + i).padStart(2, '0')}
            </div>
            {showBilingual ? (
              <div className="flex-1 min-w-0 px-3 py-1.5 tiptap-compact">
                <span dangerouslySetInnerHTML={{ __html: stripOuterP(prepareTiptapHtml(originalItem.content)) }} />
                <span style={{ fontWeight: 400 }}> | </span>
                <span style={effectiveScale ? { fontSize: `${effectiveScale}em` } : undefined} dangerouslySetInnerHTML={{ __html: stripOuterP(prepareTiptapHtml(item.content)) }} />
              </div>
            ) : (
              <div className="flex-1 min-w-0 px-3 py-1.5">
                <div
                  className="tiptap max-w-none"
                  dangerouslySetInnerHTML={{ __html: prepareTiptapHtml(item.content) }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Checklist View ────────────────────────────────────────────
function ChecklistView({
  block,
  originalBlock,
  isNonLatin,
  translationScale,
}: {
  block: ChecklistBlock;
  originalBlock?: ChecklistBlock;
  isNonLatin?: boolean;
  translationScale?: number;
}) {
  const isBilingual = !!block.bilingual && !!originalBlock;
  const effectiveScale = translationScale ?? (isNonLatin ? 0.9 : undefined);

  const renderChecklistColumn = (
    item: ChecklistBlock["items"][number],
    style?: React.CSSProperties,
    options?: { withDivider?: boolean },
  ) => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "20px minmax(0, 1fr)",
        columnGap: "1rem",
        alignItems: "start",
        ...(options?.withDivider
          ? {
              borderLeft: "1px solid #e5e7eb",
              paddingLeft: "1rem",
            }
          : {}),
      }}
    >
      <div className={CONTROL_BOX_CLASS} style={{ marginTop: "0.15rem" }} />
      <div className={`${s.checklistText} tiptap-compact`} style={style}>
        <div
          className="tiptap max-w-none"
          dangerouslySetInnerHTML={{ __html: prepareTiptapHtml(item.content) }}
        />
        {(item.writingLines ?? 0) > 0 && (
          <div className="mt-2 space-y-2">
            {Array.from({ length: item.writingLines! }).map((_, i) => (
              <div key={i} style={{ height: 20, borderBottom: "1px dashed var(--color-muted-foreground)", opacity: 0.5 }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className={s.checklistRows}>
      {block.items.map((item, index) => {
        const originalItem = originalBlock?.items.find((candidate) => candidate.id === item.id);
        const showBilingual = isBilingual && !!originalItem;

        return (
          <div
            key={item.id}
            className={s.checklistRow}
            style={showBilingual
              ? {
                  gridTemplateColumns: "2rem minmax(0, 1fr) minmax(0, 1fr)",
                  alignItems: "start",
                }
              : {
                  gridTemplateColumns: "2rem minmax(0, 1fr)",
                  alignItems: "start",
                }}
          >
            <span className={s.accentBadge}>{String(index + 1).padStart(2, "0")}</span>
            {showBilingual
              ? (
                <>
                  {renderChecklistColumn(originalItem)}
                  {renderChecklistColumn(item, effectiveScale ? { fontSize: `${effectiveScale}em` } : undefined, { withDivider: true })}
                </>
              )
              : renderChecklistColumn(item)}
          </div>
        );
      })}
    </div>
  );
}

// ─── Accordion View ────────────────────────────────────────────
function AccordionView({
  block,
  mode,
  answer,
  onAnswer,
  showResults,
  showSolutions = false,
  primaryColor,
  allBlocks,
  brand = "edoomio",
}: {
  block: AccordionBlock;
  mode: ViewMode;
  answer: unknown;
  onAnswer: (value: unknown) => void;
  showResults: boolean;
  showSolutions?: boolean;
  primaryColor?: string;
  allBlocks?: WorksheetBlock[];
  brand?: Brand;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const answers = (answer as Record<string, unknown> | undefined) || {};

  return (
    <div className="space-y-1">
      {block.items.map((item, i) => (
        <div key={item.id} className="border border-border rounded-sm overflow-hidden course-content">
          <button
            type="button"
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className="flex items-center gap-2 w-full px-3 py-2.5 text-left bg-muted/40 hover:bg-muted/60 transition-colors"
          >
            {block.showNumbers && (
              <span className="shrink-0 font-black">{String(i + 1).padStart(2, '0')}</span>
            )}
            <span className="flex-1 font-medium">{item.title || "\u2026"}</span>
            <span className={s.accordionToggle}>
              {openIndex === i ? (
                <Minus className="h-4 w-4 shrink-0 text-muted-foreground" />
              ) : (
                <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
            </span>
          </button>
          {openIndex === i && (
            <div className="px-5 py-4 space-y-4">
              {(item.children ?? []).map((childBlock) => (
                <ViewerBlockRenderer
                  key={childBlock.id}
                  block={childBlock}
                  mode={mode}
                  answer={answers[childBlock.id]}
                  onAnswer={(value) =>
                    onAnswer({ ...answers, [childBlock.id]: value })
                  }
                  showResults={showResults}
                  showSolutions={showSolutions}
                  primaryColor={primaryColor}
                  allBlocks={allBlocks}
                  brand={brand}
                />
              ))}
              {(item.children ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground italic">{"\u2026"}</p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Audio View ──────────────────────────────────────────────
function AudioView({ block, accentColor, primaryColor, mode }: { block: AudioBlock; accentColor?: string | null; primaryColor: string; mode: ViewMode }) {
  const color = accentColor || primaryColor;
  const isOnline = mode === "online";
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const trackRef = React.useRef<HTMLDivElement>(null);
  const rafRef = React.useRef<number>(0);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  const [muted, setMuted] = useState(false);
  const [slow, setSlow] = useState(false);

  // Poll currentTime via rAF for guaranteed updates
  React.useEffect(() => {
    const tick = () => {
      const a = audioRef.current;
      if (a) {
        setTime(a.currentTime);
        if (a.duration && isFinite(a.duration)) setDur(a.duration);
        if (a.ended && playing) setPlaying(false);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing]);

  const pct = dur > 0 ? (time / dur) * 100 : 0;

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.playbackRate = slow ? 0.85 : 1; a.play().catch(() => {}); setPlaying(true); }
  };

  const toggleSpeed = () => {
    const a = audioRef.current;
    const next = !slow;
    setSlow(next);
    if (a) a.playbackRate = next ? 0.85 : 1;
  };

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = trackRef.current;
    const a = audioRef.current;
    if (!el || !a || dur <= 0) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    a.currentTime = ratio * dur;
    setTime(a.currentTime);
  };

  const fmt = (s: number) => {
    if (!isFinite(s) || isNaN(s)) return "0:00";
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
  };

  if (!block.src) return null;

  return (
    <div className={isOnline ? "h-[45px] flex items-stretch rounded-[5px] overflow-hidden" : "h-[43px] flex items-stretch rounded-sm overflow-hidden"} style={{ borderTop: `1px solid ${color}`, borderRight: `1px solid ${color}`, borderBottom: `1px solid ${color}`, borderLeft: 'none' }}>
      <audio ref={audioRef} src={block.src} preload="auto" muted={muted} />
      <div className="shrink-0 w-8 flex items-stretch">
        <button type="button" onClick={toggle} className="flex h-full w-full items-center justify-center text-white transition-colors" style={{ backgroundColor: color }}>
          {playing ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"/></svg>
          )}
        </button>
      </div>
      <div className="flex items-center gap-4 w-full px-4">
        {block.title && (
          <div className="shrink-0 px-6">
            <span className="text-sm font-medium max-w-[120px] truncate block" style={{ color: color }}>{block.title}</span>
          </div>
        )}
        <div
          ref={trackRef}
          onClick={handleTrackClick}
          className="flex-1 h-[6px] rounded-full cursor-pointer"
          style={{ background: `linear-gradient(to right, ${color} ${pct}%, ${color}22 ${pct}%)` }}
        />
        <span className="text-xs tabular-nums shrink-0" style={{ color: color }}>{fmt(time)} / {fmt(dur)}</span>
        <button type="button" onClick={toggleSpeed} className="shrink-0 p-1 rounded transition-colors" style={{ color: color, opacity: slow ? 1 : 0.35 }}>
          {slow ? <ChevronsDown size={16} /> : <ChevronsUp size={16} />}
        </button>
        <button type="button" onClick={() => setMuted(!muted)} className="transition-colors" style={{ color: color, opacity: muted ? 1 : 0.6 }}>
          {muted ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
          )}
        </button>
      </div>
    </div>
  );
}

function WebsiteView({
  block,
  originalBlock,
  brand,
  headlineFont,
  headingWeights,
  isNonLatin,
  translationScale,
  primaryColor,
}: {
  block: WebsiteBlock;
  originalBlock?: WebsiteBlock;
  brand?: Brand;
  headlineFont?: string;
  headingWeights?: { h1: number; h2: number; h3: number };
  isNonLatin?: boolean;
  translationScale?: number;
  primaryColor?: string;
}) {
  const HeadingTag = (`h${block.level}` as keyof React.JSX.IntrinsicElements);
  const sizes = { 1: "text-cv-3xl", 2: "text-cv-2xl", 3: "text-cv-xl" };
  const brandFonts = getBrandFonts(brand || "edoomio");
  const resolvedHeadlineFont = headlineFont || brandFonts.headlineFont;
  const resolvedHeadingWeight = headingWeights?.[`h${block.level}` as "h1" | "h2" | "h3"] ?? brandFonts.headlineWeight;
  const effectiveScale = translationScale ?? (isNonLatin ? 0.9 : undefined);
  const headingStyle: React.CSSProperties = {
    ...(resolvedHeadlineFont ? { fontFamily: resolvedHeadlineFont } : {}),
    fontWeight: resolvedHeadingWeight,
    color: primaryColor,
  };

  const normalizeExternalUrl = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return "";
    if (/^[a-z]+:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  };

  return (
    <div className="space-y-4">
      {block.title.trim() ? (
        <HeadingTag className={`website-title ${sizes[block.level]}`} style={headingStyle}>
          {block.title}
        </HeadingTag>
      ) : null}

      <div className="website-items space-y-3">
        {block.items.map((item) => {
          const href = normalizeExternalUrl(item.url);
          const originalItem = originalBlock?.items.find((candidate) => candidate.id === item.id);
          const body = item.category || item.description || "";
          const originalBody = originalItem ? (originalItem.category || originalItem.description || "") : "";
          const showBilingualDescription = !!block.bilingual && !!originalItem && originalBody !== body;
          const translatedTextStyle = {
            color: "rgba(15, 23, 42, 0.72)",
            fontWeight: 400,
            ...(effectiveScale ? { fontSize: `${effectiveScale}em` } : {}),
          } satisfies React.CSSProperties;

          return (
            <article
              key={item.id}
              className={`website-item flex min-h-[8rem] items-start gap-4 rounded-sm border bg-white p-4 ${item.aggregator ? "border-dashed border-slate-400" : "border-slate-200"}`}
              style={item.pageBreakAfter ? { breakAfter: "page", pageBreakAfter: "always" } : undefined}
            >
              <div className="aspect-video w-40 shrink-0 self-start overflow-hidden rounded-[4px] border border-slate-200 bg-slate-50">
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image} alt={item.title || "Website image"} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-[11px] text-slate-300">
                    Web
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                {href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-slate-900"
                  >
                    {item.title || href}
                  </a>
                ) : (
                  <div className="font-bold text-slate-900">{item.title}</div>
                )}
                {body ? (
                  showBilingualDescription ? (
                    <div className="mt-2 whitespace-pre-line text-sm font-normal normal-case tracking-normal leading-6 text-slate-900">
                      {originalBody ? <div>{originalBody}</div> : null}
                      {body ? <div style={translatedTextStyle}>{body}</div> : null}
                    </div>
                  ) : (
                    <div className="mt-2 whitespace-pre-line text-sm font-normal normal-case tracking-normal leading-6 text-slate-900">
                      {body}
                    </div>
                  )
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function ScheduleView({
  block,
  originalBlock,
  brand,
  bodyFont,
  isNonLatin,
  translationScale,
  primaryColor = "#1a1a1a",
}: {
  block: ScheduleBlock;
  originalBlock?: ScheduleBlock;
  brand?: Brand;
  bodyFont?: string;
  isNonLatin?: boolean;
  translationScale?: number;
  primaryColor?: string;
}) {
  const brandFonts = getBrandFonts(brand || "edoomio");
  const resolvedBodyFont = bodyFont || brandFonts.bodyFont;
  const wrapStyle: React.CSSProperties = isNonLatin ? { fontFamily: resolvedBodyFont } : {};

  return (
    <div style={wrapStyle}>
      <StaticScheduleTable
        items={block.items}
        originalItems={originalBlock?.items}
        primaryColor={primaryColor}
        showDate={block.showDate ?? false}
        showRoom={block.showRoom ?? false}
        showHeader={block.showHeader ?? false}
        bilingual={block.bilingual ?? false}
        translationScale={translationScale}
        isNonLatin={isNonLatin}
      />
    </div>
  );
}

function formatScheduleCellDate(dateStr: string): { weekday: string; formatted: string } {
  if (!dateStr) return { weekday: "", formatted: "" };
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return { weekday: "", formatted: dateStr };
  const weekday = ["SO", "MO", "DI", "MI", "DO", "FR", "SA"][d.getDay()] || "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return { weekday, formatted: `${dd}.${mm}.${yyyy}` };
}

function formatScheduleCellTime(value: string) {
  return value ? value.replace(":", ".") : "";
}

function StaticScheduleTable({
  items,
  originalItems,
  primaryColor,
  showDate,
  showRoom,
  showHeader,
  bilingual,
  translationScale,
  isNonLatin,
}: {
  items: ScheduleBlock["items"];
  originalItems?: ScheduleBlock["items"];
  primaryColor: string;
  showDate: boolean;
  showRoom: boolean;
  showHeader: boolean;
  bilingual: boolean;
  translationScale?: number;
  isNonLatin?: boolean;
}) {
  const effectiveScale = translationScale ?? (isNonLatin ? 0.9 : undefined);
  const rowCellStyle: React.CSSProperties = {
    whiteSpace: "nowrap",
    padding: "4px 8px",
    lineHeight: "1.35rem",
    verticalAlign: "top",
    boxSizing: "border-box",
  };
  const headerCellStyle: React.CSSProperties = {
    whiteSpace: "nowrap",
    textAlign: "left",
    color: "inherit",
    fontSize: "0.8em",
    fontWeight: 400,
    textTransform: "uppercase",
    lineHeight: "1.35rem",
    height: "2rem",
    verticalAlign: "top",
    boxSizing: "border-box",
  };

  return (
    <>
      <style>{`
        .scheduleNew{width:100%;border-collapse:separate;border-spacing:0;}
        .scheduleNew th,.scheduleNew td{border-bottom:1px solid #ccc;padding:4px 8px;vertical-align:top;box-sizing:border-box;}
        .scheduleNew tbody tr:last-child td{border-bottom:none;}
        .scheduleNew thead tr th{border-top:none;}
        .scheduleNew{border:1px solid #ccc;border-radius:6px;overflow:hidden;}
      `}</style>
      <table className="scheduleNew">
        <colgroup>
          {showDate && <col style={{ width: "1%" }} />}
          {showDate && <col style={{ width: "1%" }} />}
          <col style={{ width: "1%" }} />
          <col style={{ width: "1%" }} />
          <col style={{ width: "1%" }} />
          {showRoom && <col style={{ width: "1%" }} />}
          <col />
        </colgroup>
        {showHeader && (
          <thead>
            <tr>
              {showDate && <th colSpan={2} style={headerCellStyle}>Datum</th>}
              <th colSpan={3} style={headerCellStyle}>Zeit</th>
              {showRoom && <th style={headerCellStyle}>Raum</th>}
              <th style={{ ...headerCellStyle, whiteSpace: "normal" }}>Inhalt</th>
            </tr>
          </thead>
        )}
        <tbody>
          {items.map((item) => {
            const originalItem = originalItems?.find((candidate) => candidate.id === item.id);
            const { weekday, formatted } = formatScheduleCellDate(item.date);
            const showBilingualTitle = bilingual && !!originalItem && originalItem.title !== item.title;
            const showBilingualDescription = bilingual && !!originalItem && originalItem.description !== item.description;
            const bilingualPairStyle = {
              lineHeight: "1.1rem",
            } satisfies React.CSSProperties;
            const translatedTextStyle = {
              color: "rgba(15, 23, 42, 0.72)",
              fontWeight: 400,
              ...(effectiveScale ? { fontSize: `${effectiveScale}em` } : {}),
            } satisfies React.CSSProperties;

            return (
              <tr key={item.id}>
                {showDate && <td style={rowCellStyle}>{weekday}</td>}
                {showDate && <td style={rowCellStyle}>{formatted}</td>}
                <td style={rowCellStyle}>{formatScheduleCellTime(item.start)}</td>
                <td style={{ ...rowCellStyle, paddingLeft: 0, paddingRight: 0 }}>–</td>
                <td style={rowCellStyle}>{formatScheduleCellTime(item.end)}</td>
                {showRoom && <td style={rowCellStyle}>{item.room}</td>}
                <td style={{ padding: "4px 8px", lineHeight: "1.35rem", verticalAlign: "top", boxSizing: "border-box" }}>
                  {showBilingualTitle ? (
                    <div style={{ ...bilingualPairStyle, marginBottom: originalItem.description || item.description ? "2px" : 0 }}>
                      <div style={{ fontWeight: 700 }}>{originalItem.title}</div>
                      <div style={translatedTextStyle}>{item.title}</div>
                    </div>
                  ) : (
                    <div style={{ fontWeight: 700 }}>{item.title}</div>
                  )}
                  {showBilingualDescription ? (
                    <div style={bilingualPairStyle}>
                      {originalItem.description ? <div>{originalItem.description}</div> : null}
                      {item.description ? <div style={translatedTextStyle}>{item.description}</div> : null}
                    </div>
                  ) : item.description ? (
                    <div>{item.description}</div>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}

// ─── AI Prompt View ──────────────────────────────────────────
function AiPromptView({ block }: { block: AiPromptBlock }) {
  const t = useTranslations("viewer");
  const [userInput, setUserInput] = useState(block.userInput || "");
  const [aiResult, setAiResult] = useState(block.aiResult || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!userInput.trim() || !block.prompt.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const finalPrompt = block.prompt.replace(
        new RegExp(`\\{\\{${block.variableName}\\}\\}`, "g"),
        userInput
      );
      const res = await fetch("/api/ai/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: finalPrompt }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setAiResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Instructions */}
      {block.instructions && (
        <p className="text-sm text-slate-600">{block.instructions}</p>
      )}

      {/* Textarea */}
      <textarea
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
        placeholder={t("aiPromptPlaceholder")}
        className="w-full min-h-[120px] p-3 rounded-sm border border-slate-200 bg-white text-sm resize-y focus:outline-none focus:ring-2 focus:ring-violet-300"
      />

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading || !userInput.trim()}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-sm bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {t("aiPromptSubmit")}
      </button>

      {/* Error */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-sm p-2">
          {error}
        </div>
      )}

      {/* Result */}
      {aiResult && (
        <div className="border border-violet-200 rounded-sm p-4 bg-violet-50/30">
          <div className="text-xs text-violet-500 font-medium mb-2">{t("aiPromptResult")}</div>
          <div className="text-sm text-slate-700 whitespace-pre-wrap">{aiResult}</div>
        </div>
      )}
    </div>
  );
}

// ─── Table View ─────────────────────────────────────────────
/** Merge two TipTap table HTMLs so each cell shows original + translated content.
 *  Works via lightweight regex (no DOM) — safe for both SSR and client. */
function mergeBilingualTableHtml(originalHtml: string, translatedHtml: string): string {
  // Collect translated cell contents in document order
  const transCells: string[] = [];
  const cellPat = /(<t[dh]\b[^>]*>)([\s\S]*?)(<\/t[dh]>)/gi;
  let m: RegExpExecArray | null;
  while ((m = cellPat.exec(translatedHtml)) !== null) transCells.push(m[2]);
  if (transCells.length === 0) return originalHtml;

  let idx = 0;
  return originalHtml.replace(
    /(<t[dh]\b[^>]*>)([\s\S]*?)(<\/t[dh]>)/gi,
    (full, openTag, content, closeTag) => {
      const trans = transCells[idx++];
      if (!trans || content.trim() === trans.trim()) return full;
      return `${openTag}${content}<div style="border-top:1px dashed #d1d5db;margin-top:3px;padding-top:3px;color:#6b7280;font-style:italic">${trans}</div>${closeTag}`;
    },
  );
}

function TableView({ block, originalBlock }: { block: TableBlock; originalBlock?: TableBlock }) {
  // Strip TipTap's pixel-based widths from saved HTML
  let html = prepareTiptapHtml(block.content)
    .replace(/<table([^>]*) style="[^"]*width:\s*\d+px[^"]*"/gi, "<table$1")
    .replace(/<col([^>]*) style="[^"]*width:\s*\d+px[^"]*"/gi, "<col$1");

  // Inject <colgroup> for column widths if defined on the block
  if (block.columnWidths && block.columnWidths.length > 0) {
    const colgroup = `<colgroup>${block.columnWidths.map((w) => `<col style="width:${w}%">`).join("")}</colgroup>`;
    if (/<colgroup>/i.test(html)) {
      html = html.replace(/<colgroup>[\s\S]*?<\/colgroup>/i, colgroup);
    } else {
      html = html.replace(/<table([^>]*)>/i, `<table$1>${colgroup}`);
    }
  }

  // Bilingual: merge translated content into each cell when enabled + translation is present
  if (block.bilingual && originalBlock && originalBlock.content !== block.content) {
    const origHtml = prepareTiptapHtml(originalBlock.content)
      .replace(/<table([^>]*) style="[^"]*width:\s*\d+px[^"]*"/gi, "<table$1")
      .replace(/<col([^>]*) style="[^"]*width:\s*\d+px[^"]*"/gi, "<col$1");
    html = mergeBilingualTableHtml(origHtml, html);
  }

  return (
    <div className={`table-block table-style-${block.tableStyle ?? "default"}`}>
      <div
        className="tiptap-table-view"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {block.caption && (
        <p className="text-xs text-muted-foreground text-center mt-1 italic">{block.caption}</p>
      )}
    </div>
  );
}

// ─── AI Tool View ───────────────────────────────────────────
function AiToolView({ block }: { block: AiToolBlock }) {
  return <ToolWorkflowShell block={block} />;
}

// ─── Main Renderer ──────────────────────────────────────────

export function ViewerBlockRenderer({
  block,
  mode,
  answer,
  onAnswer,
  showResults = false,
  showSolutions = false,
  primaryColor = "#1a1a1a",
  accentColor,
  headlineFont,
  headingWeights,
  allBlocks,
  brand = "edoomio",
  bodyFont,
  originalBodyFont,
  bodyFontSize,
  lessonLabel,
  originalBlock,
  isNonLatin = false,
  translationScale,
}: {
  block: WorksheetBlock;
  mode: ViewMode;
  answer?: unknown;
  onAnswer?: (value: unknown) => void;
  showResults?: boolean;
  showSolutions?: boolean;
  primaryColor?: string;
  accentColor?: string | null;
  headlineFont?: string;
  headingWeights?: { h1: number; h2: number; h3: number };
  allBlocks?: WorksheetBlock[];
  brand?: Brand;
  bodyFont?: string;
  originalBodyFont?: string;
  bodyFontSize?: string;
  lessonLabel?: string;
  originalBlock?: WorksheetBlock;
  isNonLatin?: boolean;
  translationScale?: number;
}) {
  const interactive = mode === "online";
  const noop = () => {};

  // Compute sequential task number for blocks with the AUFGABE pill
  const taskNumber = useMemo(() => {
    if (!allBlocks || !TASK_BLOCK_TYPES.has(block.type)) return undefined;
    const showsPill = "showPill" in block ? (block as { showPill?: boolean }).showPill !== false : true;
    if (!showsPill) return undefined;
    let count = 0;
    for (const b of allBlocks) {
      if (!TASK_BLOCK_TYPES.has(b.type)) continue;
      const bShowsPill = "showPill" in b ? (b as { showPill?: boolean }).showPill !== false : true;
      if (!bShowsPill) continue;
      count++;
      if (b.id === block.id) return count;
    }
    return undefined;
  }, [allBlocks, block]);

  switch (block.type) {
    case "heading":
      return <HeadingView block={block} originalBlock={originalBlock as HeadingBlock | undefined} brand={brand} headlineFont={headlineFont} headingWeights={headingWeights} isNonLatin={isNonLatin} translationScale={translationScale} primaryColor={primaryColor} />;
    case "text":
      return <TextView block={block} originalBlock={originalBlock as TextBlock | undefined} mode={mode} bodyFont={bodyFont} originalBodyFont={originalBodyFont} bodyFontSize={bodyFontSize} isNonLatin={isNonLatin} translationScale={translationScale} primaryColor={primaryColor} />;
    case "image":
      return <ImageView block={block} />;
    case "image-cards":
      return <ImageCardsView block={block} />;
    case "text-cards":
      return <TextCardsView block={block} />;
    case "spacer":
      return <SpacerView block={block} />;
    case "divider":
      return <DividerView block={block} />;
    case "logo-divider":
      return <LogoDividerView block={block as LogoDividerBlock} brand={brand} />;
    case "page-break":
      return <PageBreakView block={block} />;
    case "writing-lines":
      return <WritingLinesView block={block} />;
    case "writing-rows":
      return <WritingRowsView block={block} />;
    case "multiple-choice":
      return (
        <MultipleChoiceView
          block={block}
          interactive={interactive}
          answer={answer}
          onAnswer={onAnswer || noop}
          showResults={showResults}
          showSolutions={showSolutions}
        />
      );
    case "fill-in-blank":
      return (
        <FillInBlankView
          block={block}
          interactive={interactive}
          answer={answer}
          onAnswer={onAnswer || noop}
          showResults={showResults}
          showSolutions={showSolutions}
        />
      );
    case "fill-in-blank-items":
      return (
        <FillInBlankItemsView
          block={block}
          interactive={interactive}
          answer={answer}
          onAnswer={onAnswer || noop}
          showResults={showResults}
          showSolutions={showSolutions}
          mode={mode}
        />
      );
    case "matching":
      return (
        <MatchingView
          block={block}
          interactive={interactive}
          answer={answer}
          onAnswer={onAnswer || noop}
          showResults={showResults}
          showSolutions={showSolutions}
        />
      );
    case "two-column-fill":
      return (
        <TwoColumnFillView
          block={block}
          interactive={interactive}
          answer={answer}
          onAnswer={onAnswer || noop}
          showSolutions={showSolutions}
        />
      );
    case "glossary":
      return (
        <GlossaryView
          block={block}
          brand={brand}
          bodyFont={bodyFont}
          isNonLatin={isNonLatin}
          translationScale={translationScale}
        />
      );
    case "open-response":
      return (
        <OpenResponseView
          block={block}
          interactive={interactive}
          answer={answer}
          onAnswer={onAnswer || noop}
        />
      );
    case "word-bank":
      return <WordBankView block={block} />;
    case "number-line":
      return <NumberLineView block={block} />;
    case "true-false-matrix":
      return (
        <TrueFalseMatrixView
          block={block}
          interactive={interactive}
          answer={answer}
          onAnswer={onAnswer || noop}
          showResults={showResults}
          showSolutions={showSolutions}
          showPill={block.showPill !== false}
          taskNumber={taskNumber}
          lessonLabel={lessonLabel}
          brand={brand}
          bodyFont={bodyFont}
          bodyFontSize={bodyFontSize}
          isNonLatin={isNonLatin}
          accentColor={accentColor}
        />
      );
    case "article-training":
      return (
        <ArticleTrainingView
          block={block}
          interactive={interactive}
          answer={answer}
          onAnswer={onAnswer || noop}
          showResults={showResults}
          showSolutions={showSolutions}
        />
      );
    case "order-items":
      return (
        <OrderItemsView
          block={block}
          mode={mode}
          interactive={interactive}
          answer={answer}
          onAnswer={onAnswer || noop}
          showResults={showResults}
          showSolutions={showSolutions}
          showPill={block.showPill !== false}
          taskNumber={taskNumber}
          lessonLabel={lessonLabel}
        />
      );
    case "inline-choices":
      return (
        <InlineChoicesView
          block={block}
          interactive={interactive}
          answer={answer}
          onAnswer={onAnswer || noop}
          showResults={showResults}
          showSolutions={showSolutions}
          mode={mode}
        />
      );
    case "word-search":
      return (
        <WordSearchView
          block={block}
          mode={mode}
          interactive={interactive}
          answer={answer}
          onAnswer={onAnswer || noop}
        />
      );
    case "sorting-categories":
      return (
        <SortingCategoriesView
          block={block}
          interactive={interactive}
          answer={answer ?? undefined}
          onAnswer={onAnswer || noop}
          showResults={showResults}
          showSolutions={showSolutions}
        />
      );
    case "unscramble-words":
      return (
        <UnscrambleWordsView
          block={block}
          mode={mode}
          interactive={interactive}
          answer={answer}
          onAnswer={onAnswer || noop}
          showResults={showResults}
          showSolutions={showSolutions}
          showPill={block.showPill !== false}
          taskNumber={taskNumber}
          lessonLabel={lessonLabel}
          brand={brand}
          bodyFont={bodyFont}
          bodyFontSize={bodyFontSize}
          isNonLatin={isNonLatin}
          accentColor={accentColor}
        />
      );
    case "fix-sentences":
      return (
        <FixSentencesView
          block={block}
          mode={mode}
          interactive={interactive}
          answer={answer}
          onAnswer={onAnswer || noop}
          showResults={showResults}
          showSolutions={showSolutions}
        />
      );
    case "complete-sentences":
      return (
        <CompleteSentencesView
          block={block}
          mode={mode}
          interactive={interactive}
          answer={answer}
          onAnswer={onAnswer || noop}
        />
      );
    case "verb-table":
      return (
        <VerbTableView
          block={block}
          mode={mode}
          interactive={interactive}
          answer={answer}
          onAnswer={onAnswer || noop}
          showResults={showResults}
          primaryColor={primaryColor}
        />
      );
    case "chart":
      return <ChartView block={block} />;
    case "dialogue":
      return (
        <DialogueView
          block={block}
          interactive={interactive}
          answer={answer as Record<string, string>}
          onAnswer={onAnswer || noop}
          showResults={showResults}
          showSolutions={showSolutions}
          primaryColor={primaryColor}
        />
      );
    case "numbered-label":
      return <NumberedLabelView block={block} originalBlock={originalBlock as NumberedLabelBlock | undefined} allBlocks={allBlocks} primaryColor={primaryColor} />;
    case "columns":
      return (
        <ColumnsView
          block={block}
          mode={mode}
          answer={answer}
          onAnswer={onAnswer || noop}
          showResults={showResults}
          showSolutions={showSolutions}
          primaryColor={primaryColor}
          allBlocks={allBlocks}
          brand={brand}
        />
      );
    case "text-snippet":
      return <TextSnippetView block={block as TextSnippetBlock} mode={mode} />;
    case "email-skeleton":
      return <EmailSkeletonView block={block as EmailSkeletonBlock} />;
    case "job-application":
      return <JobApplicationView block={block as JobApplicationBlock} />;
    case "dos-and-donts":
      return <DosAndDontsView block={block as DosAndDontsBlock} />;
    case "text-comparison":
      return <TextComparisonView block={block as TextComparisonBlock} />;
    case "numbered-items":
      return <NumberedItemsView block={block as NumberedItemsBlock} originalBlock={originalBlock as NumberedItemsBlock | undefined} isNonLatin={isNonLatin} translationScale={translationScale} />;
    case "checklist":
      return <ChecklistView block={block as ChecklistBlock} originalBlock={originalBlock as ChecklistBlock | undefined} isNonLatin={isNonLatin} translationScale={translationScale} />;
    case "accordion":
      return (
        <AccordionView
          block={block as AccordionBlock}
          mode={mode}
          answer={answer}
          onAnswer={onAnswer || noop}
          showResults={showResults}
          showSolutions={showSolutions}
          primaryColor={primaryColor}
          allBlocks={allBlocks}
          brand={brand}
        />
      );
    case "ai-prompt":
      return <AiPromptView block={block as AiPromptBlock} />;
    case "ai-tool":
      return <AiToolView block={block as AiToolBlock} />;
    case "table":
      return <TableView block={block as TableBlock} originalBlock={originalBlock as TableBlock | undefined} />;
    case "audio":
      return <AudioView block={block as AudioBlock} accentColor={accentColor} primaryColor={primaryColor} mode={mode} />;
    case "schedule":
      return <ScheduleView block={block as ScheduleBlock} originalBlock={originalBlock as ScheduleBlock | undefined} brand={brand} bodyFont={bodyFont} isNonLatin={isNonLatin} translationScale={translationScale} primaryColor={primaryColor} />;
    case "website":
      return <WebsiteView block={block as WebsiteBlock} originalBlock={originalBlock as WebsiteBlock | undefined} brand={brand} headlineFont={headlineFont} headingWeights={headingWeights} isNonLatin={isNonLatin} translationScale={translationScale} primaryColor={primaryColor} />;
    default:
      return null;
  }
}
