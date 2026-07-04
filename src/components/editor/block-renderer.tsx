"use client";

import React, { useState } from "react";
// ─── Segmentation Block ─────────────────────────────────────────────
import rough from "roughjs/bundled/rough.esm.js";
import { useLocale, useTranslations } from "next-intl";
import {
  WorksheetBlock,
  TextBlock,
  SyllablesBlock,
  ImageBlock,
  ImageCardsBlock,
  ImageTextTableBlock,
  TextCardsBlock,
  SpacerBlock,
  GapSpacerBlock,
  DividerBlock,
  MultipleChoiceBlock,
  FillInBlankBlock,
  FillInBlankItemsBlock,
  MatchingBlock,
  TextMatchingBlock,
  PronunciationBlock,
  TwoColumnFillBlock,
  GlossaryBlock,
  OpenResponseBlock,
  WordBankBlock,
  NumberLineBlock,
  TrueFalseMatrixBlock,
  HeadingBlock,
  TitleBlock,
  NumberedHeadingBlock,
  ColumnsBlock,
  GridBlock,
  DominoBlock,
  CardPairsBlock,
  FlashcardsBlock,
  AufgabenkartenBlock,
  BingoCardsBlock,
  SyllableCardsBlock,
  BoardGameBlock,
  MCQMatrixBlock,
  MCQRowsBlock,
  OrderItemsBlock,
  InlineChoicesBlock,
  migrateInlineChoicesBlock,
  CrosswordBlock,
  WordSearchBlock,
  SortingCategoriesBlock,
  CorrectSpellingBlock,
  CorrectNumbersBlock,
  MissingLettersBlock,
  LetterCodeBlock,
  UnscrambleWordsBlock,
  FixSentencesBlock,
  CompleteSentencesBlock,
  StartSentencesBlock,
  ReadingComprehensionBlock,
  TransformSentencesBlock,
  VerbTableBlock,
  VerbTableRow,
  ArticleTrainingBlock,
  ArticleAnswer,
  ChartBlock,
  NumberedLabelBlock,
  DialogueBlock,
  DialogueSpeakerIcon,
  LueckenzeilenBlock,
  PageBreakBlock,
  WritingLinesBlock,
  WritingRowsBlock,
  LinkedBlocksBlock,
  TextSnippetBlock,
  EmailSkeletonBlock,
  JobApplicationBlock,
  DosAndDontsBlock,
  TextComparisonBlock,
  NumberedItemsBlock,
  NumberedItem,
  NumberedSubItemStyle,
  SubjectBlock,
  BoxBlock,
  QuartettBlock,
  TabooBlock,
  ChecklistBlock,
  ChecklistItem,
  AccordionBlock,
  AccordionItem,
  LogoDividerBlock,
  AiPromptBlock,
  AiToolBlock,
  AudioBlock,
  CurriculumBlock,
  ScheduleBlock,
  ScheduleItem,
  WebsiteBlock,
  TableBlock,
  TableCloudBlock,
  SegmentationBlock,
  FreeFormBlock,
  ViewMode,
  applyBrandOverrides,
  resolveBrandLogo,
} from "@/types/worksheet";
import { TriangleAlert } from "lucide-react";
import { useEditor } from "@/store/editor-store";
import { buildCorrectNumbersRow, buildCorrectSpellingRow, buildMissingLettersRow } from "@/lib/correct-spelling";
import { getCardPairDisplayText, getCardPairs, getCardPairItems, getDominoEditorTextClass, getDominoItems, getDominoPairs, getFlashcardDisplayText, getFlashcardItems, getFlashcardPairs } from "@/lib/domino";
import { authFetch } from "@/lib/auth-fetch";
import { useUpload } from "@/lib/use-upload";
import { setByPath, getByPath } from "@/lib/locale-utils";
import { doubleInnerRegularSpaces, getBlankSpacing, getBlankWidthStyle, parseBlankContent, parseBlankToken, renderBlankTokensInText, tripleInnerRegularSpaces } from "@/lib/fill-in-blank";
import { normalizeToHtml } from "@/lib/markdown-to-html";
import { prepareTiptapHtml, stripOuterP } from "@/lib/print-html-normalize";
import { getFontBaselineAdjustment } from "@/lib/font-baseline";
import { getTextMatchingAnswerLetters, getTextMatchingCardItems, getTextMatchingTextItems } from "@/lib/text-matching";
import { RoughExampleCircle, RoughExampleDivider, RoughExampleStrike } from "@/components/ui/rough-example-circle";
import { generateWordSearchGrid } from "@/lib/word-search";
import { generateCrosswordLayout } from "@/lib/crossword";
import { RichTextEditor } from "./rich-text-editor";
import { TableEditor } from "./table-editor";
import { MediaBrowserDialog } from "@/components/ui/media-browser-dialog";
import { ImageCropDialog, CropResult } from "@/components/ui/image-crop-dialog";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { Plus, Minus, X, Check, GripVertical, Trash2, Copy, Eye, EyeOff, Printer, Monitor, Sparkles, ArrowUpDown, Upload, ChevronUp, ChevronDown, ChevronsDown, ChevronsUp, Link2, ExternalLink, Mail, Paperclip, FormInput, User, Phone, ListChecks, ListOrdered, ArrowRight, ArrowRightToLine, BadgeAlert, Siren, Goal, Flag, Loader2, Bot, Square, FileQuestion, ArrowUp, ArrowDown } from "lucide-react";
import { AiTrueFalseModal } from "./ai-true-false-modal";
import { AiMcqModal } from "./ai-mcq-modal";
import { AiTextModal } from "./ai-text-modal";
import { AiVerbTableModal } from "./ai-verb-table-modal";
import { BingoCardsRenderer } from "./BingoCardsRenderer";
import dynamic from "next/dynamic";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { BlockVisibility } from "@/types/worksheet";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FreeFormEditorDialog, FreeFormPreview } from "./free-form-editor-dialog";
import { SyllablesDisplay } from "@/components/worksheet/syllables-display";
import { CrosswordLayout } from "@/components/worksheet/crossword-layout";
import {
  DialogueSpeakerIconGlyph,
} from "@/lib/dialogue-icons";

const EXAMPLE_HANDWRITING_FONT = "var(--worksheet-example-font, var(--font-handwriting)), cursive";

function renderHandwrittenMatrixIndicator(color: string) {
  return (
    <span
      className="inline-flex items-center justify-center shrink-0"
      style={{
        boxSizing: "border-box",
        width: 16,
        height: 16,
        minWidth: 16,
        minHeight: 16,
        borderRadius: 3,
        color,
        boxShadow: "inset 0 0 0 1px currentColor",
        background: "#fff",
        position: "relative",
      }}
    >
      <span
        className="absolute inset-0 flex items-center justify-center leading-none"
        style={{
          fontFamily: EXAMPLE_HANDWRITING_FONT,
          color,
          fontSize: "22px",
          top: "-3px",
        }}
      >
        X
      </span>
    </span>
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
          className="text-blue-500"
          style={{ fontFamily: "var(--font-handwriting)", fontSize: "1.15em" }}
        >
          {inner}
        </span>
      );
    }
    return part;
  });
}

type ReadingComprehensionFieldSegment = {
  prefilled: string;
  solution: string;
  hasCorrection: boolean;
};

function parseReadingComprehensionFieldValue(rawValue: string | undefined) {
  const value = rawValue ?? "";
  const inlinePattern = /(\{\{.*?(?:\|.*?)?\}\})/g;

  if (value.includes("{{") && value.includes("}}")) {
    const segments = value.split(inlinePattern).filter((part) => part.length > 0).map<ReadingComprehensionFieldSegment>((part) => {
      const correctionMatch = part.match(/^\{\{(.*?)\|(.*?)\}\}$/);
      if (correctionMatch) {
        const prefilled = correctionMatch[1].trim();
        const solution = correctionMatch[2].trim();
        return {
          prefilled,
          solution,
          hasCorrection: prefilled.toLowerCase() !== solution.toLowerCase(),
        };
      }

      const deletionMatch = part.match(/^\{\{(.*?)\}\}$/);
      if (deletionMatch) {
        const prefilled = deletionMatch[1].trim();
        return {
          prefilled,
          solution: "",
          hasCorrection: prefilled.length > 0,
        };
      }

      if (!part.includes("{{")) {
        return {
          prefilled: part,
          solution: part,
          hasCorrection: false,
        };
      }

      return {
        prefilled: part,
        solution: part,
        hasCorrection: false,
      };
    });

    return {
      prefilled: segments.map((segment) => segment.prefilled).join(""),
      solution: segments.map((segment) => segment.solution).join(""),
      hasCorrection: segments.some((segment) => segment.hasCorrection),
      inlineSyntax: true,
      segments,
    };
  }

  const [prefilledPart, ...solutionParts] = value.split("|");
  if (solutionParts.length === 0) {
    const normalized = value.trim();
    return {
      prefilled: normalized,
      solution: normalized,
      hasCorrection: false,
      inlineSyntax: false,
      segments: [{ prefilled: normalized, solution: normalized, hasCorrection: false }],
    };
  }

  const prefilled = prefilledPart.trim();
  const solution = solutionParts.join("|").trim();
  return {
    prefilled,
    solution,
    hasCorrection: prefilled.toLowerCase() !== solution.toLowerCase(),
    inlineSyntax: false,
    segments: [{ prefilled, solution, hasCorrection: prefilled.toLowerCase() !== solution.toLowerCase() }],
  };
}

function renderReadingComprehensionCorrectionSegments(
  parsedValue: ReturnType<typeof parseReadingComprehensionFieldValue>,
  correctionColor?: string,
) {
  if (parsedValue.inlineSyntax) {
    const appendedCorrections = parsedValue.segments
      .filter((segment) => segment.hasCorrection && segment.solution)
      .map((segment) => segment.solution);

    return (
      <>
        {parsedValue.segments.map((segment, index) => {
          if (!segment.hasCorrection) {
            return <span key={index}>{segment.prefilled}</span>;
          }

          return <RoughExampleStrike tight tightTop="58%" key={index} style={{ verticalAlign: "-0.18em" }}>{segment.prefilled}</RoughExampleStrike>;
        })}
        {appendedCorrections.length > 0 ? (
          <span className="ml-2" style={correctionColor ? { color: correctionColor } : undefined}>
            {appendedCorrections.join(", ")}
          </span>
        ) : null}
      </>
    );
  }

  return parsedValue.segments.map((segment, index) => {
    if (!segment.hasCorrection) {
      return <span key={index}>{segment.prefilled}</span>;
    }

    return (
      <span key={index} className="inline-flex items-center">
        <RoughExampleStrike tight>{segment.prefilled}</RoughExampleStrike>
        <span className="ml-2" style={correctionColor ? { color: correctionColor } : undefined}>{segment.solution}</span>
      </span>
    );
  });
}

function renderMissingLetterText(text: string, showExampleOnFirstBlank = false): React.ReactNode {
  const parts = text.split(/(\{\{blank\*?(?:,[^:}]+)?(?::[^}]*)?\}\})/g);
  let exampleShown = false;

  return parts.map((part, index) => {
    const token = parseBlankToken(part);
    if (!token) {
      return <span key={index}>{tripleInnerRegularSpaces(part)}</span>;
    }

    const { answer, width } = parseBlankContent(token.raw);
    const spacing = getBlankSpacing(width, token.noSpace, parts[index + 1]);
    const shouldRenderExample = showExampleOnFirstBlank && !exampleShown;
    const blankShellStyle: React.CSSProperties = {
      minHeight: "1.25rem",
      lineHeight: "1.25rem",
      ...getBlankWidthStyle(width, false),
      ...spacing.style,
    };

    if (shouldRenderExample) {
      exampleShown = true;
      return (
        <span
          key={index}
          className={`relative inline-flex rounded-[3px] bg-background/80 align-middle overflow-hidden ${spacing.className}`}
          style={blankShellStyle}
        >
          <span aria-hidden="true" style={{ visibility: "hidden" }}>{answer || "\u00A0"}</span>
          <span
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{
              fontFamily: EXAMPLE_HANDWRITING_FONT,
              fontWeight: 400,
              fontSize: "18px",
              color: "#0097dc",
              lineHeight: 1,
              whiteSpace: "nowrap",
            }}
          >
            {answer}
          </span>
        </span>
      );
    }

    return (
      <span
        key={index}
        aria-hidden="true"
        className={`relative inline-flex rounded-[3px] bg-background/80 align-middle overflow-hidden ${spacing.className}`}
        style={blankShellStyle}
      >
        <span aria-hidden="true" style={{ visibility: "hidden" }}>{answer || "\u00A0"}</span>
        <span className="sr-only">missing letter</span>
      </span>
    );
  });
}

function renderCardTextWithBlanks(text: string, blankClassName: string): React.ReactNode {
  const parts = text.split(/(\{\{blank\*?(?:,[^:}]+)?(?::[^}]*)?\}\})/g);

  return parts.map((part, index) => {
    const token = parseBlankToken(part);
    if (!token) {
      return <span key={index}>{doubleInnerRegularSpaces(part)}</span>;
    }

    const { width } = parseBlankContent(token.raw);
    const spacing = getBlankSpacing(width, token.noSpace, parts[index + 1]);

    return (
      <span
        key={index}
        aria-hidden="true"
        className={`inline-flex rounded-[3px] bg-background/80 align-middle ${blankClassName} ${spacing.className}`.trim()}
        style={{ ...getBlankWidthStyle(width, false), ...spacing.style }}
      >
        <span className="sr-only">blank</span>
      </span>
    );
  });
}

function renderSolvedFlashcardBackText(text: string): React.ReactNode {
  const parts = text.split(/(\{\{blank\*?(?:,[^:}]+)?(?::[^}]*)?\}\})/g);

  return parts.map((part, index) => {
    const token = parseBlankToken(part);
    if (!token) {
      return <span key={index}>{doubleInnerRegularSpaces(part)}</span>;
    }

    const { answer } = parseBlankContent(token.raw);
    return <strong key={index}>{answer}</strong>;
  });
}

function hashPreviewKey(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function normalizeInlineEditableHtml(value: string): string {
  return stripOuterP(normalizeToHtml(value || ""));
}

function InlineHtmlEditable({
  value,
  editable,
  className,
  onCommit,
}: {
  value: string;
  editable: boolean;
  className?: string;
  onCommit: (value: string) => void;
}) {
  const ref = React.useRef<HTMLSpanElement | null>(null);
  const isFocusedRef = React.useRef(false);
  const normalizedValue = React.useMemo(() => normalizeInlineEditableHtml(value), [value]);

  React.useLayoutEffect(() => {
    if (isFocusedRef.current || !ref.current) return;
    if (ref.current.innerHTML !== normalizedValue) {
      ref.current.innerHTML = normalizedValue;
    }
  }, [normalizedValue]);

  return (
    <span
      ref={ref}
      className={className}
      contentEditable={editable}
      suppressContentEditableWarning
      onFocus={() => {
        isFocusedRef.current = true;
      }}
      onBlur={(e) => {
        isFocusedRef.current = false;
        onCommit(normalizeInlineEditableHtml(e.currentTarget.innerHTML || e.currentTarget.textContent || ""));
      }}
    />
  );
}

function getDeterministicPreviewOrder<T>(
  items: T[],
  getKey: (item: T, index: number) => string
): T[] {
  return items
    .map((item, index) => ({
      item,
      index,
      weight: hashPreviewKey(getKey(item, index)),
    }))
    .sort((left, right) => left.weight - right.weight || left.index - right.index)
    .map(({ item }) => item);
}

function getDeterministicPreviewDerangement<T>(
  items: T[],
  getKey: (item: T, index: number) => string,
): T[] {
  const ranked = items
    .map((item, index) => ({
      item,
      index,
      weight: hashPreviewKey(getKey(item, index)),
    }))
    .sort((left, right) => left.weight - right.weight || left.index - right.index);

  const n = ranked.length;
  if (n <= 1) return ranked.map(({ item }) => item);

  for (let shift = 1; shift < n; shift++) {
    const candidate = ranked.map((_, i) => ranked[(i + shift) % n]);
    if (candidate.every((entry, i) => entry.index !== i)) {
      return candidate.map(({ item }) => item);
    }
  }

  // Fallback: deterministic local swaps to remove fixed points.
  const fallback = [...ranked];
  for (let i = 0; i < n; i++) {
    if (fallback[i].index !== i) continue;
    for (let j = i + 1; j < n; j++) {
      if (fallback[j].index !== i && fallback[i].index !== j) {
        [fallback[i], fallback[j]] = [fallback[j], fallback[i]];
        break;
      }
    }
  }

  return fallback.map(({ item }) => item);
}

// ─── Locale-aware inline editing ────────────────────────────

/**
 * Hook for locale-aware inline editing in block renderers.
 * In CH mode, updates go directly to the block via UPDATE_BLOCK.
 * In DE mode, updates are routed to overrides so DE stays non-destructive
 * relative to the CH base content.
 */
function useLocaleAwareEdit() {
  const { state, dispatch } = useEditor();
  const isDeOverrideMode = state.localeMode === "DE";

  /**
   * Update a string field in a locale-aware way.
   * @param blockId   - Block ID
   * @param fieldPath - Dot-path field in the block (e.g. "content", "options.2.text")
   * @param value     - New string value
   * @param baseUpdate - Function to execute for base (CH-mode) update
   */
  const localeUpdate = React.useCallback(
    (blockId: string, fieldPath: string, value: string, baseUpdate: () => void) => {
      if (!isDeOverrideMode) {
        baseUpdate();
        return;
      }
      // DE mode → route to override system
      // Look up the base value from the raw (untransformed) blocks
      let rawBlock: WorksheetBlock | null = null;
      for (const b of state.blocks) {
        if (b.id === blockId) { rawBlock = b; break; }
        if (b.type === "columns") {
          for (const col of b.children) {
            for (const c of col) {
              if (c.id === blockId) { rawBlock = c; break; }
            }
            if (rawBlock) break;
          }
          if (rawBlock) break;
        }
        if (b.type === "accordion") {
          for (const item of b.items) {
            for (const c of item.children) {
              if (c.id === blockId) { rawBlock = c; break; }
            }
            if (rawBlock) break;
          }
          if (rawBlock) break;
        }
      }
      const baseValue = rawBlock ? String(getByPath(rawBlock, fieldPath) ?? "") : "";
      if (value === baseValue) {
        dispatch({ type: "CLEAR_CH_OVERRIDE", payload: { blockId, fieldPath } });
      } else {
        dispatch({ type: "SET_CH_OVERRIDE", payload: { blockId, fieldPath, value } });
      }
    },
    [isDeOverrideMode, state.blocks, dispatch],
  );

  return { isDeOverrideMode, localeUpdate };
}

// ─── Heading ─────────────────────────────────────────────────

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

function collectNumberedHeadingBlocks(blocks: WorksheetBlock[]): { id: string; level: 1 | 2 | 3 | 4; sequence: number }[] {
  const result: { id: string; level: 1 | 2 | 3 | 4; sequence: number }[] = [];
  const counters = [0, 0, 0, 0];

  const visit = (items: WorksheetBlock[]) => {
    for (const block of items) {
      if (block.type === "numbered-heading") {
        const levelIndex = block.level - 1;
        const explicitStart = Math.max(1, Math.floor(block.startNumber ?? 1));
        counters[levelIndex] = counters[levelIndex] === 0
          ? explicitStart
          : Math.max(counters[levelIndex] + 1, explicitStart);
        for (let index = levelIndex + 1; index < counters.length; index += 1) {
          counters[index] = 0;
        }
        result.push({ id: block.id, level: block.level, sequence: counters[levelIndex] });
        continue;
      }
      if (block.type === "columns") {
        for (const column of block.children) visit(column);
        continue;
      }
      if (block.type === "accordion") {
        for (const item of block.items) visit(item.children);
        continue;
      }
      if (block.type === "grid") {
        for (const cell of block.children) visit(cell);
      }
    }
  };

  visit(blocks);
  return result;
}

function toAlphabeticLabel(index: number, uppercase: boolean): string {
  let n = Math.max(1, index);
  let out = "";
  while (n > 0) {
    n -= 1;
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26);
  }
  return uppercase ? out : out.toLowerCase();
}

function formatHeadingNumber(index: number, format: string | null | undefined): string {
  switch (format) {
    case "numbers-leading-zero":
      return String(index).padStart(2, "0");
    case "letters-uppercase":
      return toAlphabeticLabel(index, true);
    case "letters-lowercase":
      return toAlphabeticLabel(index, false);
    case "numbers":
    default:
      return String(index);
  }
}

function formatItemNumberLabel(index: number, format: string | null | undefined): string {
  if (format === "numbers-with-period") return `${index}.`;
  return String(index).padStart(2, "0");
}

function formatMatchingRightLabel(index: number, format: string | null | undefined): string {
  const letter = toAlphabeticLabel(index, false);
  return format === "numbers-with-period" ? `${letter}.` : letter;
}

function ItemNumberBadge({ index, className = "" }: { index: number; className?: string }) {
  const { state } = useEditor();
  const itemNumberFormat = state.brandProfile.itemNumberFormat || "default";
  const isTextOnly = itemNumberFormat === "numbers-with-period";
  const layoutClass = "w-6 h-6 rounded flex items-center justify-center shrink-0";

  return (
    <span
      className={isTextOnly
        ? `${layoutClass} min-w-6 justify-start bg-transparent text-[1em] font-medium leading-none text-muted-foreground tabular-nums ${className}`.trim()
        : `${layoutClass} min-w-6 bg-muted text-xs font-bold text-muted-foreground ${className}`.trim()}
    >
      {formatItemNumberLabel(index, itemNumberFormat)}
    </span>
  );
}

function resolveHeadingOverrideColor(
  override: string | null | undefined,
  primaryColor?: string,
  accentColor?: string | null,
): string | undefined {
  if (override === "primary") return primaryColor;
  if (override === "accent") return accentColor || primaryColor;
  return undefined;
}

const HEADING_CONFIG: Record<number, { fontSize: number; lineHeight: number }> = {
  1: { fontSize: 28, lineHeight: 1.2 },
  2: { fontSize: 24, lineHeight: 1.25 },
  3: { fontSize: 21, lineHeight: 1.3 },
  4: { fontSize: 19, lineHeight: 1.5 },
};

function calculateHeadingMargin(level: number, blockGap: string | null | undefined): string {
  if (!blockGap) return level === 1 ? "-4px" : "1.5rem";
  const config = HEADING_CONFIG[level];
  if (!config) return blockGap;
  const gapPx = parseFloat(blockGap);
  if (Number.isNaN(gapPx)) return blockGap;
  const lineHeightExtraSpace = (config.lineHeight - 1) * config.fontSize;
  const marginPx = gapPx - lineHeightExtraSpace;
  return `${marginPx.toFixed(2)}px`;
}

function resolveHeadingMargins(
  level: number,
  blockGap: string | null | undefined,
): { marginTop: string; marginBottom: string } {
  const headingMargin = calculateHeadingMargin(level, blockGap);
  let marginTop = headingMargin;
  let marginBottom = headingMargin;
  if (level === 1 && blockGap) {
    const config = HEADING_CONFIG[1];
    const gapPx = parseFloat(blockGap);
    if (!Number.isNaN(gapPx)) {
      const lineHeightExtraSpace = (config.lineHeight - 1) * config.fontSize;
      const marginPx = 4 * gapPx - lineHeightExtraSpace;
      marginBottom = `${marginPx.toFixed(2)}px`;
    }
  } else if ((level === 2 || level === 3) && blockGap) {
    const gapPx = parseFloat(blockGap);
    if (!Number.isNaN(gapPx)) {
      const marginPx = 2 * gapPx;
      marginTop = `${marginPx.toFixed(2)}px`;
    }
  }
  return { marginTop, marginBottom };
}

function HeadingRenderer({ block }: { block: HeadingBlock }) {
  const { state, dispatch } = useEditor();
  const { localeUpdate } = useLocaleAwareEdit();
  const Tag = `h${block.level}` as keyof React.JSX.IntrinsicElements;
  const headingConfig = HEADING_CONFIG[block.level];
  const headingSizeKey = `h${block.level}Size` as const;
  const headingFontSize = state.brandProfile[headingSizeKey] || `${headingConfig.fontSize}px`;
  const resolvedHeadingWeightByLevel: Record<1 | 2 | 3 | 4, number> = {
    1: state.brandProfile.h1Weight ?? state.brandProfile.headlineWeight,
    2: state.brandProfile.h2Weight ?? state.brandProfile.headlineWeight,
    3: state.brandProfile.h3Weight ?? state.brandProfile.headlineWeight,
    4: state.brandProfile.h4Weight ?? state.brandProfile.headlineWeight,
  };
  const resolvedHeadingWeight = resolvedHeadingWeightByLevel[block.level];
  const colorKey = `h${block.level}HeadingColor` as const;
  const headingColor = resolveHeadingOverrideColor(
    state.brandProfile[colorKey],
    state.brandProfile.primaryColor,
    state.brandProfile.accentColor,
  );
  const headingMargin = resolveHeadingMargins(block.level, state.brandProfile.blockGap);
  const bottomMarginOverrideKey = `h${block.level}BottomMargin` as const;
  const bottomMargin = state.brandProfile[bottomMarginOverrideKey] || headingMargin.marginBottom;

  return (
    <Tag
      className={`font-bold outline-none`}
      style={{
        fontSize: headingFontSize,
        lineHeight: headingConfig.lineHeight,
        fontWeight: resolvedHeadingWeight,
        marginTop: headingMargin.marginTop,
        marginBottom: bottomMargin,
        ...(headingColor ? { color: headingColor } : {}),
      }}
      contentEditable
      suppressContentEditableWarning
      onBlur={(e) => {
        const value = e.currentTarget.textContent || "";
        localeUpdate(block.id, "content", value, () =>
          dispatch({ type: "UPDATE_BLOCK", payload: { id: block.id, updates: { content: value } } })
        );
      }}
    >
      {block.content}
    </Tag>
  );
}

function TitleRenderer({ block }: { block: TitleBlock }) {
  const { state, dispatch } = useEditor();
  const { localeUpdate } = useLocaleAwareEdit();
  const normalizedItems = Array.from({ length: 3 }, (_, index) => ({
    id: block.items[index]?.id || `title-line-${index + 1}`,
    content: block.items[index]?.content || "",
    level: block.items[index]?.level || ((index + 1) as 1 | 2 | 3),
    style: block.items[index]?.style,
  }));
  const resolvedHeadingWeightByLevel: Record<1 | 2 | 3 | 4, number> = {
    1: state.brandProfile.h1Weight ?? state.brandProfile.headlineWeight,
    2: state.brandProfile.h2Weight ?? state.brandProfile.headlineWeight,
    3: state.brandProfile.h3Weight ?? state.brandProfile.headlineWeight,
    4: state.brandProfile.h4Weight ?? state.brandProfile.headlineWeight,
  };
  const resolvedHeadingSizeByLevel: Record<1 | 2 | 3 | 4, string> = {
    1: state.brandProfile.h1Size || `${HEADING_CONFIG[1].fontSize}px`,
    2: state.brandProfile.h2Size || `${HEADING_CONFIG[2].fontSize}px`,
    3: state.brandProfile.h3Size || `${HEADING_CONFIG[3].fontSize}px`,
    4: state.brandProfile.h4Size || `${HEADING_CONFIG[4].fontSize}px`,
  };
  const renderBadgeRow = (
    badges: string[],
    key: string,
    color: string | undefined,
    marginBottom?: React.CSSProperties["marginBottom"],
    uppercase = false,
  ) => (
    <div
      key={key}
      className="flex min-h-8 flex-wrap items-center gap-2 outline-none"
      style={{
        marginBottom,
        fontFamily: state.brandProfile.bodyFont,
      }}
    >
      {badges.length > 0 ? badges.map((badge, badgeIndex) => (
        <span
          key={`${key}-badge-${badgeIndex}`}
          className="inline-flex items-center rounded-[3px] px-1.5 py-1 text-[10px] font-normal leading-3"
          style={{
            color: color || state.brandProfile.primaryColor,
            backgroundColor: "color-mix(in srgb, currentColor 8%, transparent)",
          }}
        >
          {uppercase ? badge.toUpperCase() : badge}
        </span>
      )) : (
        <span className="text-sm text-muted-foreground">&nbsp;</span>
      )}
    </div>
  );

  const updateItem = (index: number, content: string) => {
    const nextItems = normalizedItems.map((item, itemIndex) =>
      itemIndex === index ? { ...item, content } : item,
    );
    localeUpdate(block.id, `items.${index}.content`, content, () =>
      dispatch({ type: "UPDATE_BLOCK", payload: { id: block.id, updates: { items: nextItems } } })
    );
  };

  return (
    <div className="space-y-0">
      {block.domain ? renderBadgeRow([block.domain], "title-domain", state.brandProfile.primaryColor, 0, true) : null}
      {normalizedItems.map((item, index) => {
        const isBody = item.style === "body";
        const isBadges = item.style === "badges";
        const Tag = (isBody ? "p" : `h${item.level}`) as keyof React.JSX.IntrinsicElements;
        const colorKey = `h${item.level}HeadingColor` as const;
        const headingColor = resolveHeadingOverrideColor(
          state.brandProfile[colorKey],
          state.brandProfile.primaryColor,
          state.brandProfile.accentColor,
        );
        const usesBodyFont = item.style === "h4-normal" || isBody || isBadges;
        if (isBadges) {
          const badges = item.content.split("|").map((part) => part.trim()).filter(Boolean);
          return renderBadgeRow(badges, item.id, headingColor, index < 2 ? 0 : undefined);
        }
        const headingConfig = HEADING_CONFIG[item.level];
        return (
          <Tag
            key={item.id}
            className={`${isBody ? "text-base" : ""} ${usesBodyFont ? "font-normal" : "font-bold"} outline-none`}
            style={{
              marginBottom: index < 2 ? 0 : undefined,
              fontFamily: usesBodyFont ? state.brandProfile.bodyFont : undefined,
              fontWeight: usesBodyFont ? 400 : resolvedHeadingWeightByLevel[item.level],
              ...(isBody
                ? {}
                : {
                    fontSize: resolvedHeadingSizeByLevel[item.level],
                    lineHeight: headingConfig.lineHeight,
                  }),
              ...(headingColor ? { color: headingColor } : {}),
            }}
            contentEditable
            suppressContentEditableWarning
            onBlur={(event) => updateItem(index, event.currentTarget.textContent || "")}
          >
            {item.content}
          </Tag>
        );
      })}
    </div>
  );
}

function NumberedHeadingRenderer({ block }: { block: NumberedHeadingBlock }) {
  const { state, dispatch } = useEditor();
  const { localeUpdate } = useLocaleAwareEdit();
  const Tag = `h${block.level}` as keyof React.JSX.IntrinsicElements;
  const headingConfig = HEADING_CONFIG[block.level];
  const headingSizeKey = `h${block.level}Size` as const;
  const headingFontSize = state.brandProfile[headingSizeKey] || `${headingConfig.fontSize}px`;
  const numberSlotStyle: React.CSSProperties = {
    display: "inline-block",
    width: "1.5rem",
    minWidth: "1.5rem",
    textAlign: "left",
    marginRight: "0.5rem",
    fontVariantNumeric: "tabular-nums",
  };

  const allNumberedHeadings = React.useMemo(() => collectNumberedHeadingBlocks(state.blocks), [state.blocks]);
  const currentHeading = allNumberedHeadings.find((heading) => heading.id === block.id);
  const sequence = currentHeading?.sequence ?? 1;
  const formatKey = (`h${block.level}NumberFormat` as const);
  const format = state.brandProfile[formatKey];
  const headingColorKey = (`h${block.level}HeadingColor` as const);
  const headingNumberColorKey = (`h${block.level}HeadingNumberColor` as const);
  const headingColor = resolveHeadingOverrideColor(
    state.brandProfile[headingColorKey],
    state.brandProfile.primaryColor,
    state.brandProfile.accentColor,
  );
  const headingNumberColor = resolveHeadingOverrideColor(
    state.brandProfile[headingNumberColorKey],
    state.brandProfile.primaryColor,
    state.brandProfile.accentColor,
  );
  const numberLabel = formatHeadingNumber(sequence, format);
  const resolvedHeadingWeightByLevel: Record<1 | 2 | 3 | 4, number> = {
    1: state.brandProfile.h1Weight ?? state.brandProfile.headlineWeight,
    2: state.brandProfile.h2Weight ?? state.brandProfile.headlineWeight,
    3: state.brandProfile.h3Weight ?? state.brandProfile.headlineWeight,
    4: state.brandProfile.h4Weight ?? state.brandProfile.headlineWeight,
  };
  const resolvedHeadingWeight = resolvedHeadingWeightByLevel[block.level];
  const resolvedHeadingNumberWeightByLevel: Record<1 | 2 | 3 | 4, number> = {
    1: state.brandProfile.h1HeadingNumberWeight ?? resolvedHeadingWeightByLevel[1],
    2: state.brandProfile.h2HeadingNumberWeight ?? resolvedHeadingWeightByLevel[2],
    3: state.brandProfile.h3HeadingNumberWeight ?? resolvedHeadingWeightByLevel[3],
    4: state.brandProfile.h4HeadingNumberWeight ?? resolvedHeadingWeightByLevel[4],
  };
  const resolvedHeadingNumberWeight = resolvedHeadingNumberWeightByLevel[block.level];
  const headingMargin = resolveHeadingMargins(block.level, state.brandProfile.blockGap);
  const bottomMarginOverrideKey = `h${block.level}BottomMargin` as const;
  const bottomMargin = state.brandProfile[bottomMarginOverrideKey] || headingMargin.marginBottom;
  const numberStyle: React.CSSProperties = {
    ...numberSlotStyle,
    fontWeight: resolvedHeadingNumberWeight,
    ...(headingNumberColor ? { color: headingNumberColor } : {}),
  };

  return (
    <Tag
      className={`font-bold outline-none`}
      style={{
        fontSize: headingFontSize,
        lineHeight: headingConfig.lineHeight,
        fontWeight: resolvedHeadingWeight,
        marginTop: headingMargin.marginTop,
        marginBottom: bottomMargin,
        ...(headingColor ? { color: headingColor } : {}),
      }}
      contentEditable
      suppressContentEditableWarning
      onBlur={(e) => {
        const contentEl = e.currentTarget.querySelector('[data-numbered-heading-content="true"]');
        const strippedValue = (contentEl?.textContent || "").trim();
        localeUpdate(block.id, "content", strippedValue, () =>
          dispatch({ type: "UPDATE_BLOCK", payload: { id: block.id, updates: { content: strippedValue } } })
        );
      }}
    >
      <span contentEditable={false} style={numberStyle}>{numberLabel}</span>
      <span data-numbered-heading-content="true">{block.content}</span>
    </Tag>
  );
}

// ─── Text ────────────────────────────────────────────────────
function stripTrailingEmptyParagraphs(html: string): string {
  let result = html
    .replace(/(?:\s*<li(?:\s[^>]*)?>\s*(?:<br\s*\/?>|&nbsp;|\u00a0)?\s*<\/li>\s*)+$/gi, "")
    .replace(/(?:\s*<p(?:\s[^>]*)?>\s*(?:<br\s*\/?>|&nbsp;|\u00a0)?\s*<\/p>\s*)+$/gi, "");
  // Clean up orphaned empty <ul> after removing all <li>
  result = result.replace(/<ul[^>]*>\s*<\/ul>\s*$/gi, "");
  return result;
}

function TextRenderer({ block }: { block: TextBlock }) {
  const { state, dispatch } = useEditor();
  const { localeUpdate } = useLocaleAwareEdit();
  const t = useTranslations("blockRenderer");
  const [showAiModal, setShowAiModal] = React.useState(false);
  const bodyFontSize = state.brandProfile.textBaseSize || `${(state.settings.fontSize || 12.5) + 1}px`;

  const isHinweis = block.textStyle === "hinweis";
  const isHinweisWichtig = block.textStyle === "hinweis-wichtig";
  const isHinweisAlarm = block.textStyle === "hinweis-alarm";
  const isLernziel = block.textStyle === "lernziel";
  const isKompetenzziele = block.textStyle === "kompetenzziele";
  const isHandlungsziele = block.textStyle === "handlungsziele";
  const isFragen = block.textStyle === "fragen";
  const isRedemittel = block.textStyle === "redemittel";
  const isLiteratur = block.textStyle === "literatur";
  const hasHinweisBox = isHinweis || isHinweisWichtig || isHinweisAlarm || isLernziel;
  const isRows = block.textStyle === "rows" || isKompetenzziele || isHandlungsziele || isRedemittel || isFragen;
  const rowsClass = isKompetenzziele
    ? "tiptap-rows tiptap-rows-goal"
    : isHandlungsziele
    ? "tiptap-rows tiptap-rows-arrow-right-to-line"
    : isFragen
    ? "tiptap-rows tiptap-rows-circle-help"
    : isRedemittel
    ? "tiptap-rows tiptap-rows-message-circle"
    : isRows
    ? "tiptap-rows"
    : "";

  const hinweisConfig = isHinweisAlarm
    ? { color: "#990033", bg: "#99003308", border: "#990033", icon: <Siren className="h-5 w-5" style={{ color: "#990033" }} /> }
    : isHinweisWichtig
    ? { color: "#0369a1", bg: "#0369a108", border: "#0369a1", icon: <BadgeAlert className="h-5 w-5" style={{ color: "#0369a1" }} /> }
    : isLernziel
    ? { color: "#166534", bg: "transparent", border: "#166534", icon: <Goal className="h-5 w-5" style={{ color: "#166534" }} /> }
    : { color: "#475569", bg: "#47556908", border: "#475569", icon: <ArrowRight className="h-5 w-5" style={{ color: "#475569" }} /> };

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
        className="w-full rounded"
      />
    </div>
  ) : null;

  const richTextEl = (
    <RichTextEditor
      content={block.content}
      onChange={(html) => {
        const normalizedHtml = isRows ? stripTrailingEmptyParagraphs(html) : html;
        localeUpdate(block.id, "content", normalizedHtml, () =>
          dispatch({ type: "UPDATE_BLOCK", payload: { id: block.id, updates: { content: normalizedHtml } } })
        )
      }}
      placeholder={t("startTyping")}
      floatingElement={imageEl}
      bodyFontSize={bodyFontSize}
      wrapperClassName="bg-transparent border-0 rounded-none"
      editingContentClassName={hasHinweisBox ? undefined : "px-3 py-2"}
      editorClassName={
        isRows
          ? "prose prose-sm max-w-none focus:outline-none min-h-[60px]"
          : isLiteratur
            ? "prose prose-sm max-w-none focus:outline-none min-h-[60px] text-[0.9em] tiptap-literatur"
            : "prose prose-sm max-w-none focus:outline-none min-h-[60px]"
      }
    />
  );

  if (isLernziel) {
    return (
      <>
        <div className="relative group/text flex gap-0 border-2 rounded-sm overflow-hidden" style={{ borderColor: "#4A3D55", backgroundColor: "#4A3D5510", color: "#4A3D55" }}>
          <div className="shrink-0 w-10 flex items-center justify-center" style={{ backgroundColor: "#4A3D55" }}>
            <Flag className="h-5 w-5" style={{ color: "#ffffff" }} />
          </div>
          <div className="flex-1 min-w-0 px-3 py-2">
            {richTextEl}
            <button
              type="button"
              onClick={() => setShowAiModal(true)}
              className="absolute -top-2 -right-2 opacity-0 group-hover/text:opacity-100 transition-opacity bg-purple-600 hover:bg-purple-700 text-white rounded-full p-1.5 shadow-md z-10"
              title={t("aiGenerateReadingText")}
            >
              <Sparkles className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <AiTextModal open={showAiModal} onOpenChange={setShowAiModal} blockId={block.id} />
      </>
    );
  }

  return (
    <>
      <div className={`relative group/text ${hasHinweisBox ? "flex gap-0 border-2 rounded-sm" : ""} ${rowsClass}`}
        style={hasHinweisBox ? { borderColor: hinweisConfig.border, backgroundColor: hinweisConfig.bg, color: hinweisConfig.color } : undefined}
      >
        {hasHinweisBox && (
          <div className="shrink-0 w-10 flex items-center justify-center rounded-l-sm">
            {hinweisConfig.icon}
          </div>
        )}
        <div className={hasHinweisBox ? "flex-1 min-w-0 px-3 py-2" : undefined}>
          {richTextEl}
          <button
            type="button"
            onClick={() => setShowAiModal(true)}
            className="absolute -top-2 -right-2 opacity-0 group-hover/text:opacity-100 transition-opacity bg-purple-600 hover:bg-purple-700 text-white rounded-full p-1.5 shadow-md z-10"
            title={t("aiGenerateReadingText")}
          >
            <Sparkles className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <AiTextModal
        open={showAiModal}
        onOpenChange={setShowAiModal}
        blockId={block.id}
      />
    </>
  );
}

function SyllablesRenderer({ block }: { block: SyllablesBlock }) {
  return (
    <div className="rounded-md border border-dashed border-slate-300 bg-white px-4 py-3 text-left text-slate-900">
      <SyllablesDisplay content={block.content} textClassName="text-inherit" />
    </div>
  );
}

// ─── Text Snippet (Textbaustein) ─────────────────────────────
function TextSnippetRenderer({ block }: { block: TextSnippetBlock }) {
  const { dispatch } = useEditor();
  const { localeUpdate } = useLocaleAwareEdit();
  const t = useTranslations("blockRenderer");

  return (
    <div className="relative group/text-snippet">
      <div className="border border-dashed border-amber-300 rounded-sm p-3 bg-amber-50/30">
        <div className="flex items-center gap-1.5 text-xs text-amber-600 font-medium">
          <Copy className="h-3.5 w-3.5" />
          {t("textSnippetLabel")}
        </div>
        <RichTextEditor
          content={block.content}
          onChange={(html) =>
            localeUpdate(block.id, "content", html, () =>
              dispatch({ type: "UPDATE_BLOCK", payload: { id: block.id, updates: { content: html } } })
            )
          }
          placeholder={t("startTyping")}
          snippetBreak
        />
      </div>
    </div>
  );
}

// ─── Email Skeleton ──────────────────────────────────────────
function EmailSkeletonRenderer({ block }: { block: EmailSkeletonBlock }) {
  const { dispatch } = useEditor();
  const { localeUpdate } = useLocaleAwareEdit();
  const t = useTranslations("blockRenderer");

  const attachments = block.attachments ?? [];
  const style = block.emailStyle ?? "none";
  const isStyled = style === "standard" || style === "teal";
  const color = style === "teal" ? "#3A4F40" : style === "standard" ? "#990033" : undefined;
  const pillLabel = style === "teal" ? "Besser" : style === "standard" ? "Standard" : "";

  return (
    <div>
      {isStyled && (
        <div className="flex">
          <div
            className="py-0.5 text-xs font-semibold text-white rounded-t-sm text-center uppercase"
            style={{ backgroundColor: color, width: 110, paddingLeft: 12, paddingRight: 12 }}
          >
            {pillLabel}
          </div>
        </div>
      )}
      <div
        className={`border border-dashed overflow-hidden bg-white shadow-sm ${isStyled ? "rounded-sm rounded-tl-none" : "rounded-sm"}`}
        style={isStyled ? { borderColor: color } : undefined}
      >
        {/* Email toolbar bar */}
        <div
          className={`flex items-center gap-2 px-4 py-2 border-b ${isStyled ? "" : "bg-slate-50 border-slate-200"}`}
          style={isStyled ? { backgroundColor: `${color}0D`, borderColor: `${color}4D` } : undefined}
        >
          <Mail className="h-4 w-4" style={isStyled ? { color } : undefined} />
        </div>

      {/* Email header fields */}
      <div className="px-4 pt-3 pb-2 space-y-1.5 border-b border-slate-100">
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-slate-400 w-16 shrink-0">{t("emailFrom")}</span>
          <span className="text-slate-700" dangerouslySetInnerHTML={{ __html: renderBlankTokensInText(block.from) }} />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-slate-400 w-16 shrink-0">{t("emailTo")}</span>
          <span className="text-slate-700" dangerouslySetInnerHTML={{ __html: renderBlankTokensInText(block.to) }} />
        </div>
        <div className="flex items-baseline gap-2 pt-1 border-t border-slate-100">
          <span
            className="font-semibold flex-1"
            style={isStyled ? { color } : undefined}
            dangerouslySetInnerHTML={{ __html: renderBlankTokensInText(block.subject) }}
          />
        </div>
      </div>

      {/* Email body */}
      <div className="px-4 py-3">
        <RichTextEditor
          content={block.body}
          onChange={(html) =>
            localeUpdate(block.id, "body", html, () =>
              dispatch({ type: "UPDATE_BLOCK", payload: { id: block.id, updates: { body: html } } })
            )
          }
          placeholder={t("startTyping")}
        />
      </div>

      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50 flex flex-wrap gap-2">
          {attachments.map((att) => (
            <div key={att.id} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-slate-200 bg-white text-xs text-slate-600">
              <Paperclip className="h-3 w-3" />
              <span dangerouslySetInnerHTML={{ __html: renderBlankTokensInText(att.name) }} />
            </div>
          ))}
        </div>
      )}
      </div>
      {isStyled && block.comment && (
        <p style={{ color, marginTop: "0.75rem", backgroundColor: "#f8f8f8", padding: "0.5rem 1.25rem", borderRadius: "0.375rem" }}>{block.comment}</p>
      )}
    </div>
  );
}

// ─── Job Application ─────────────────────────────────────────
function JobApplicationRenderer({ block }: { block: JobApplicationBlock }) {
  const { dispatch } = useEditor();
  const { localeUpdate } = useLocaleAwareEdit();
  const t = useTranslations("blockRenderer");

  const style = block.applicationStyle ?? "none";
  const isStyled = style === "standard" || style === "teal";
  const color = style === "teal" ? "#3A4F40" : style === "standard" ? "#990033" : undefined;
  const pillLabel = style === "teal" ? "Besser" : style === "standard" ? "Standard" : "";

  return (
    <div>
      {isStyled && (
        <div className="flex">
          <div
            className="py-0.5 text-xs font-semibold text-white rounded-t-sm text-center uppercase"
            style={{ backgroundColor: color, width: 110, paddingLeft: 12, paddingRight: 12 }}
          >
            {pillLabel}
          </div>
        </div>
      )}
      <div
        className={`border border-dashed overflow-hidden bg-white shadow-sm ${isStyled ? "rounded-sm rounded-tl-none" : "rounded-sm"}`}
        style={{ borderColor: isStyled ? color : "#475569" }}
      >
        {/* Form header — icon only, same style as email toolbar */}
        <div
          className="flex items-center gap-2 px-4 py-2 border-b"
          style={isStyled ? { backgroundColor: `${color}0D`, borderColor: `${color}4D` } : { backgroundColor: "#f8fafc", borderColor: "#e2e8f0" }}
        >
          <FormInput className="h-4 w-4" style={{ color: isStyled ? color : "#475569" }} />
        </div>

        {/* Form fields */}
        <div className="px-4 pt-3 pb-4 space-y-1.5">
          <div className="flex items-center gap-4">
            <span className="font-semibold text-slate-400 w-24 shrink-0 text-sm">{t("jobPosition")}</span>
            <div className="flex-1 rounded-sm border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 flex items-center justify-between">
              <span>{block.position}</span>
              <svg className="h-4 w-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" /></svg>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-semibold text-slate-400 w-24 shrink-0 text-sm">{t("jobFirstName")}</span>
            <div className="flex-1 rounded-sm border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700">{block.firstName}</div>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-semibold text-slate-400 w-24 shrink-0 text-sm">{t("jobLastName")}</span>
            <div className="flex-1 rounded-sm border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700">{block.applicantName}</div>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-semibold text-slate-400 w-24 shrink-0 text-sm">{t("jobEmail")}</span>
            <div className="flex-1 rounded-sm border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700">{block.email}</div>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-semibold text-slate-400 w-24 shrink-0 text-sm">{t("jobPhone")}</span>
            <div className="flex-1 rounded-sm border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700">{block.phone}</div>
          </div>
          <div className="flex items-start gap-4">
            <span className="font-semibold text-slate-400 w-24 shrink-0 text-sm pt-1.5">{t("jobMessage")}</span>
            <div className="flex-1 rounded-sm border border-slate-200 bg-slate-50 px-3 py-1.5">
              <RichTextEditor
                content={block.message}
                onChange={(html) =>
                  localeUpdate(block.id, "message", html, () =>
                    dispatch({ type: "UPDATE_BLOCK", payload: { id: block.id, updates: { message: html } } })
                  )
                }
                placeholder={t("startTyping")}
              />
            </div>
          </div>
        </div>
      </div>
      {isStyled && block.comment && (
        <p style={{ color, marginTop: "0.75rem", backgroundColor: "#f8f8f8", padding: "0.5rem 1.25rem", borderRadius: "0.375rem" }}>{block.comment}</p>
      )}
    </div>
  );
}

// ─── Image ───────────────────────────────────────────────────
function ImageRenderer({ block }: { block: ImageBlock }) {
  const t = useTranslations("blockRenderer");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  if (!block.src) {
    return (
      <div className="border-2 border-dashed border-muted-foreground/25 rounded-sm p-8 text-center text-muted-foreground text-sm">
        <p>{t("clickToAddImage")}</p>
      </div>
    );
  }
  return (
    <>
      <figure>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={block.src}
          alt={block.alt}
          className="max-w-full rounded mx-auto block cursor-zoom-in"
          style={{
            ...(block.width ? { width: block.width } : {}),
            ...(block.height ? { height: block.height, objectFit: "contain" as const } : {}),
          }}
          onClick={() => setLightboxOpen(true)}
        />
        {block.caption && (
          <figcaption className="text-sm text-muted-foreground mt-1 text-center">
            {block.caption}
          </figcaption>
        )}
      </figure>
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 cursor-zoom-out"
          onClick={() => setLightboxOpen(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={block.src}
            alt={block.alt}
            className="max-w-[90vw] max-h-[90vh] rounded object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

// ─── Image Cards ─────────────────────────────────────────────
function ImageCardsRenderer({ block }: { block: ImageCardsBlock }) {
  const { dispatch } = useEditor();
  const { localeUpdate } = useLocaleAwareEdit();
  const t = useTranslations("blockRenderer");
  const { upload } = useUpload();
  const [uploadingIndex, setUploadingIndex] = React.useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null);

  const handleImageUpload = async (file: File, index: number) => {
    if (!file.type.startsWith("image/")) return;
    setUploadingIndex(index);
    try {
      const result = await upload(file);
      const newItems = [...block.items];
      newItems[index] = { ...newItems[index], src: result.url, alt: file.name };
      dispatch({
        type: "UPDATE_BLOCK",
        payload: { id: block.id, updates: { items: newItems } },
      });
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverIndex(null);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      handleImageUpload(file, index);
    }
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverIndex(null);
  };

  const updateItemText = (index: number, text: string) => {
    const newItems = [...block.items];
    newItems[index] = { ...newItems[index], text };
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: newItems } },
    });
  };

  const addCard = () => {
    const newItems = [
      ...block.items,
      { id: crypto.randomUUID(), src: "", alt: "", text: `Caption ${block.items.length + 1}` },
    ];
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: newItems } },
    });
  };

  const removeCard = (index: number) => {
    if (block.items.length <= 1) return;
    const newItems = block.items.filter((_, i) => i !== index);
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: newItems } },
    });
  };

  return (
    <div className="space-y-3">
      {/* Word Bank Preview */}
      {block.showWordBank && block.items.some(item => item.text) && (
        <div className="rounded p-3 border border-dashed border-muted-foreground/30">
          <div className="text-xs text-muted-foreground mb-2 font-medium">{t("wordBank")}</div>
          <div className="flex flex-wrap gap-2">
            {getDeterministicPreviewOrder(
              block.items.filter(item => item.text),
              (item, index) => `${item.id}:${item.text}:${index}`
            )
              .map((item) => (
                <span key={item.id} className="px-2 py-0.5 bg-background rounded border text-xs">
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
        {block.items.map((item, index) => {
          const [arW, arH] = (block.imageAspectRatio ?? "1:1").split(":").map(Number);
          const scale = (block.imageScale ?? 100) / 100;
          return (
          <div key={item.id} className="relative group/card">
            <div
              className={`border rounded overflow-hidden bg-card transition-all ${
                dragOverIndex === index ? "ring-2 ring-primary border-primary" : ""
              }`}
              onDrop={(e) => handleDrop(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
            >
              {item.src ? (
                <div 
                  className="relative overflow-hidden mx-auto"
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
                  <button
                    type="button"
                    onClick={() => {
                      const newItems = [...block.items];
                      newItems[index] = { ...newItems[index], src: "", alt: "" };
                      dispatch({
                        type: "UPDATE_BLOCK",
                        payload: { id: block.id, updates: { items: newItems } },
                      });
                    }}
                    className="absolute top-2 right-2 opacity-0 group-hover/card:opacity-100 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <label 
                  className={`w-full aspect-square flex flex-col items-center justify-center cursor-pointer transition-colors ${
                    dragOverIndex === index ? "bg-primary/10" : "hover:bg-muted/50"
                  }`}
                >
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file, index);
                      }}
                    />
                    {uploadingIndex === index ? (
                      <span className="text-xs text-muted-foreground">{t("uploading")}</span>
                    ) : dragOverIndex === index ? (
                      <>
                        <Upload className="h-8 w-8 text-primary" />
                      </>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-muted-foreground/50" />
                      </>
                    )}
                  </div>
                </label>
              )}
              <div className="p-2">
                <input
                  type="text"
                  value={item.text}
                  onChange={(e) => updateItemText(index, e.target.value)}
                  className={`w-full text-center text-sm bg-transparent border-none outline-none focus:ring-1 focus:ring-primary rounded px-1 ${
                    block.showWritingLines ? "text-muted-foreground" : ""
                  }`}
                  placeholder={block.showWritingLines ? t("answerWord") : t("caption")}
                />
                {block.showWritingLines && (
                  <div className="space-y-0.5 mt-1 pb-2">
                    {Array.from({ length: block.writingLinesCount ?? 1 }).map((_, i) => (
                      <div key={i} className="h-6" style={{ borderBottom: '1px dashed var(--color-muted-foreground)', opacity: 1.0 }} />
                    ))}
                  </div>
                )}
              </div>
            </div>
            {block.items.length > 1 && (
              <button
                type="button"
                onClick={() => removeCard(index)}
                className="absolute -top-2 -right-2 opacity-0 group-hover/card:opacity-100 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-full p-1 shadow transition-opacity"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        )})}
      </div>
      <button
        type="button"
        onClick={addCard}
        className="w-full py-2 border-2 border-dashed border-muted-foreground/25 rounded-sm text-muted-foreground text-sm hover:border-muted-foreground/50 hover:text-foreground transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="h-4 w-4" />
        {t("addCard")}
      </button>
    </div>
  );
}

function ImageTextTableRenderer({ block }: { block: ImageTextTableBlock }) {
  const { dispatch } = useEditor();
  const { localeUpdate } = useLocaleAwareEdit();
  const t = useTranslations("blockRenderer");
  const { upload } = useUpload();
  const [uploadingIndex, setUploadingIndex] = React.useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null);
  const exampleItemId = block.showFirstAsExample ? block.items[0]?.id : undefined;
  const displayItems = React.useMemo(
    () => (block.shuffleItems
      ? getDeterministicPreviewOrder(
          block.items.map((item, index) => ({ item, originalIndex: index })),
          (entry) => `${block.id}:${entry.item.id}:${entry.originalIndex}`,
        )
      : block.items.map((item, index) => ({ item, originalIndex: index }))),
    [block.id, block.items, block.shuffleItems],
  );

  const handleImageUpload = async (file: File, index: number) => {
    if (!file.type.startsWith("image/")) return;
    setUploadingIndex(index);
    try {
      const result = await upload(file);
      const newItems = [...block.items];
      newItems[index] = { ...newItems[index], src: result.url, alt: file.name };
      dispatch({
        type: "UPDATE_BLOCK",
        payload: { id: block.id, updates: { items: newItems } },
      });
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverIndex(null);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      handleImageUpload(file, index);
    }
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverIndex(null);
  };

  const updateItemText = (index: number, text: string) => {
    const newItems = [...block.items];
    newItems[index] = { ...newItems[index], text };
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: newItems } },
    });
  };

  const addCard = () => {
    const newItems = [
      ...block.items,
      { id: crypto.randomUUID(), src: "", alt: "", text: `Caption ${block.items.length + 1}` },
    ];
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: newItems } },
    });
  };

  const removeCard = (index: number) => {
    if (block.items.length <= 1) return;
    const newItems = block.items.filter((_, i) => i !== index);
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: newItems } },
    });
  };

  return (
    <div className="space-y-3">
      {block.instruction && (
        <div
          className="text-sm text-muted-foreground outline-none"
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => {
            const value = e.currentTarget.textContent || "";
            localeUpdate(block.id, "instruction", value, () =>
              dispatch({ type: "UPDATE_BLOCK", payload: { id: block.id, updates: { instruction: value } } })
            );
          }}
        >
          {block.instruction}
        </div>
      )}
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${block.columns}, 1fr)` }}
      >
        {displayItems.map(({ item, originalIndex }) => {
          const [arW, arH] = (block.imageAspectRatio ?? "1:1").split(":").map(Number);
          return (
            <div key={item.id} className="relative group/card">
              <div
                className={`border rounded overflow-hidden bg-card transition-all ${
                  dragOverIndex === originalIndex ? "ring-2 ring-primary border-primary" : ""
                }`}
                onDrop={(e) => handleDrop(e, originalIndex)}
                onDragOver={(e) => handleDragOver(e, originalIndex)}
                onDragLeave={handleDragLeave}
              >
                {item.src ? (
                  <div
                    className="relative overflow-hidden mx-auto"
                    style={{
                      width: `${block.imageScale ?? 100}%`,
                      aspectRatio: `${arW} / ${arH}`,
                    }}
                  >
                    {block.showImageNumberBadge !== false && (
                      <span className="absolute left-0 top-0 z-10 grid h-5 w-5 place-items-center rounded-none rounded-br-md border-r border-b border-border bg-background text-[10px] font-semibold leading-none text-foreground">
                        {originalIndex + 1}
                      </span>
                    )}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.src}
                      alt={item.alt}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newItems = [...block.items];
                        newItems[originalIndex] = { ...newItems[originalIndex], src: "", alt: "" };
                        dispatch({
                          type: "UPDATE_BLOCK",
                          payload: { id: block.id, updates: { items: newItems } },
                        });
                      }}
                      className="absolute top-2 right-2 opacity-0 group-hover/card:opacity-100 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <label
                    className={`w-full aspect-square flex flex-col items-center justify-center cursor-pointer transition-colors ${
                      dragOverIndex === originalIndex ? "bg-primary/10" : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file, originalIndex);
                        }}
                      />
                      {uploadingIndex === originalIndex ? (
                        <span className="text-xs text-muted-foreground">{t("uploading")}</span>
                      ) : dragOverIndex === originalIndex ? (
                        <>
                          <Upload className="h-8 w-8 text-primary" />
                        </>
                      ) : (
                        <>
                          <Upload className="h-8 w-8 text-muted-foreground/50" />
                        </>
                      )}
                    </div>
                  </label>
                )}
                <div className="p-2">
                  <input
                    type="text"
                    value={item.text}
                    onChange={(e) => updateItemText(originalIndex, e.target.value)}
                    className={`w-full text-center text-sm bg-transparent border-none outline-none focus:ring-1 focus:ring-primary rounded px-1 ${item.id === exampleItemId ? "text-[#0097dc]" : ""}`}
                    style={item.id === exampleItemId ? { fontFamily: EXAMPLE_HANDWRITING_FONT, fontSize: "18px" } : undefined}
                    placeholder={t("caption")}
                  />
                </div>
              </div>
              {block.items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeCard(originalIndex)}
                  className="absolute -top-2 -right-2 opacity-0 group-hover/card:opacity-100 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-full p-1 shadow transition-opacity"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div
        className={`rounded border border-dashed border-muted-foreground/30 p-3 ${
          block.twoWritingColumns ? "grid grid-cols-2 gap-x-4 gap-y-2" : "space-y-2"
        }`}
      >
        {block.items.map((item, index) => (
          <div key={item.id} className="grid grid-cols-[auto_1fr] gap-2 items-end">
            <span className="text-sm font-medium text-muted-foreground">{index + 1}.</span>
            <div className="min-w-0">
              {item.id === exampleItemId ? (
                <div
                  className="relative mt-1 min-h-[14px] border-b border-dashed border-muted-foreground/30"
                >
                  <span
                    className="absolute inset-x-0 block leading-none"
                    style={{ bottom: "6px", fontFamily: EXAMPLE_HANDWRITING_FONT, color: "#0097dc", fontSize: "18px" }}
                  >
                    {item.text || t("caption")}
                  </span>
                </div>
              ) : (
                <>
                  <div className="text-sm text-muted-foreground truncate">{item.text || t("caption")}</div>
                  <div className="mt-1 relative min-h-[14px] border-b border-dashed border-muted-foreground/30" />
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addCard}
        className="w-full py-2 border-2 border-dashed border-muted-foreground/25 rounded-sm text-muted-foreground text-sm hover:border-muted-foreground/50 hover:text-foreground transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="h-4 w-4" />
        {t("addCard")}
      </button>
    </div>
  );
}

// ─── Text Cards ──────────────────────────────────────────────
function TextCardsRenderer({ block }: { block: TextCardsBlock }) {
  const { dispatch } = useEditor();
  const { localeUpdate } = useLocaleAwareEdit();
  const t = useTranslations("blockRenderer");

  const updateItemText = (index: number, text: string) => {
    localeUpdate(block.id, `items.${index}.text`, text, () => {
      const newItems = [...block.items];
      newItems[index] = { ...newItems[index], text };
      dispatch({
        type: "UPDATE_BLOCK",
        payload: { id: block.id, updates: { items: newItems } },
      });
    });
  };

  const updateItemCaption = (index: number, caption: string) => {
    localeUpdate(block.id, `items.${index}.caption`, caption, () => {
      const newItems = [...block.items];
      newItems[index] = { ...newItems[index], caption };
      dispatch({
        type: "UPDATE_BLOCK",
        payload: { id: block.id, updates: { items: newItems } },
      });
    });
  };

  const addCard = () => {
    const newItems = [
      ...block.items,
      { id: crypto.randomUUID(), text: `Text ${block.items.length + 1}`, caption: `Caption ${block.items.length + 1}` },
    ];
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: newItems } },
    });
  };

  const removeCard = (index: number) => {
    if (block.items.length <= 1) return;
    const newItems = block.items.filter((_, i) => i !== index);
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: newItems } },
    });
  };

  const sizeClasses: Record<string, string> = {
    xs: "text-xs",
    sm: "text-sm",
    base: "text-base",
    lg: "text-lg",
    xl: "text-xl",
    "2xl": "text-2xl",
  };

  const alignClasses: Record<string, string> = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  };

  return (
    <div className="space-y-3">
      {/* Word Bank Preview */}
      {block.showWordBank && block.items.some(item => item.caption) && (
        <div className="rounded p-3 border border-dashed border-muted-foreground/30">
          <div className="text-xs text-muted-foreground mb-2 font-medium">{t("wordBank")}</div>
          <div className="flex flex-wrap gap-2">
            {getDeterministicPreviewOrder(
              block.items.filter(item => item.caption),
              (item, index) => `${item.id}:${item.caption}:${index}`
            )
              .map((item) => (
                <span key={item.id} className="px-2 py-0.5 bg-background rounded border text-xs">
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
        {block.items.map((item, index) => (
          <div key={item.id} className="relative group/card">
            <div className={`${block.showBorder ? "border rounded" : ""} overflow-hidden bg-card transition-all`}>
              <div className={`p-3 ${sizeClasses[block.textSize ?? "base"]} ${alignClasses[block.textAlign ?? "center"]} ${block.textBold ? "font-bold" : ""} ${block.textItalic ? "italic" : ""}`}>
                <input
                  type="text"
                  value={item.text}
                  onChange={(e) => updateItemText(index, e.target.value)}
                  className={`w-full bg-transparent border-none outline-none focus:ring-1 focus:ring-primary rounded px-1 ${alignClasses[block.textAlign ?? "center"]}`}
                  placeholder={t("cardText")}
                />
              </div>
              <div className={block.showWritingLines ? "px-2 pb-2" : "px-2 py-1 text-center text-sm"}>
                {block.showWritingLines ? (
                  <div className="space-y-0">
                    <input
                      type="text"
                      value={item.caption}
                      onChange={(e) => updateItemCaption(index, e.target.value)}
                      className="w-full text-center text-sm bg-transparent border-none outline-none focus:ring-1 focus:ring-primary rounded px-1 text-muted-foreground mb-1"
                      placeholder={t("answerWord")}
                    />
                    {Array.from({ length: block.writingLinesCount ?? 1 }).map((_, i) => (
                      <div key={i} className="h-6" style={{ borderBottom: '1px dashed var(--color-muted-foreground)', opacity: 1.0 }} />
                    ))}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={item.caption}
                    onChange={(e) => updateItemCaption(index, e.target.value)}
                    className="w-full text-center text-sm bg-transparent border-none outline-none focus:ring-1 focus:ring-primary rounded px-1"
                    placeholder={t("caption")}
                  />
                )}
              </div>
            </div>
            {block.items.length > 1 && (
              <button
                type="button"
                onClick={() => removeCard(index)}
                className="absolute -top-2 -right-2 opacity-0 group-hover/card:opacity-100 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-full p-1 shadow transition-opacity"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addCard}
        className="w-full py-2 border-2 border-dashed border-muted-foreground/25 rounded-sm text-muted-foreground text-sm hover:border-muted-foreground/50 hover:text-foreground transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="h-4 w-4" />
        {t("addCard")}
      </button>
    </div>
  );
}

// ─── Spacer ──────────────────────────────────────────────────
function SpacerRenderer({ block }: { block: SpacerBlock }) {
  return (
    <div
      className="relative bg-muted/30 border border-dashed border-muted-foreground/20 rounded"
      style={{ height: block.height }}
    >
      <span className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
        {block.height}px
      </span>
    </div>
  );
}

function GapSpacerRenderer() {
  return (
    <div className="relative bg-muted/30 border border-dashed border-muted-foreground/20 rounded" style={{ height: 40 }}>
      <span className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
        Gap Spacer
      </span>
    </div>
  );
}

// ─── Divider ─────────────────────────────────────────────────
function DividerRenderer({ block }: { block: DividerBlock }) {
  return (
    <hr
      className="my-2"
      style={{ borderStyle: block.style }}
    />
  );
}

// ─── Logo Divider ────────────────────────────────────────────
function LogoDividerRenderer({ block }: { block: LogoDividerBlock }) {
  const { state } = useEditor();
  const logoSrc = resolveBrandLogo(applyBrandOverrides(state.brandProfile, state.settings.brandOverrides));
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

// ─── Page Break ──────────────────────────────────────────────
function PageBreakRenderer({ block }: { block: PageBreakBlock }) {
  const t = useTranslations("blockRenderer");
  return (
    <div className="relative flex items-center justify-center py-2">
      <div className="absolute inset-x-0 top-1/2 border-t-2 border-dashed border-blue-300" />
      <span className="relative z-10 bg-white px-3 py-0.5 text-xs font-medium text-blue-500 border border-blue-200 rounded-full">
        {t("pageBreak")}{block.restartPageNumbering ? ` · ${t("restartPageNumbering")}` : ""}
      </span>
    </div>
  );
}

// ─── Writing Lines ───────────────────────────────────────────
function WritingLinesRenderer({ block }: { block: WritingLinesBlock }) {
  const negativeTopMargin = block.negativeTopMargin ?? 0;
  return (
    <div style={negativeTopMargin ? { marginTop: `-${negativeTopMargin}px` } : undefined}>
      {Array.from({ length: block.lineCount }).map((_, i) => (
        <div
          key={i}
          style={{ height: block.lineSpacing, borderBottom: '1px dashed var(--color-muted-foreground)', opacity: 1.0 }}
        />
      ))}
    </div>
  );
}

// ─── Writing Rows ────────────────────────────────────────────
function WritingRowsRenderer({ block }: { block: WritingRowsBlock }) {
  return (
    <div>
      {Array.from({ length: block.rowCount }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 border-b last:border-b-0 py-2">
          <ItemNumberBadge index={i + 1} />
          <div className="flex-1" style={{ height: 24, borderBottom: '1px dashed var(--color-muted-foreground)', opacity: 1.0 }} />
        </div>
      ))}
    </div>
  );
}

const LETTER_CODE_ALPHABET = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ", "\u00c4", "\u00d6", "\u00dc"];

function isValidLetterCodeOrder(order: string[] | undefined): order is string[] {
  if (!Array.isArray(order) || order.length !== LETTER_CODE_ALPHABET.length) return false;
  const set = new Set(order);
  return LETTER_CODE_ALPHABET.every((letter) => set.has(letter));
}

function normalizeLetterCodeChar(char: string): string | null {
  const normalized = char.toUpperCase();
  return LETTER_CODE_ALPHABET.includes(normalized) ? normalized : null;
}

function parseLetterCodeWord(pattern: string): Array<{ char: string; prefilled: boolean; space?: boolean }> {
  const tokens: Array<{ char: string; prefilled: boolean; space?: boolean }> = [];
  let index = 0;

  while (index < pattern.length) {
    if (pattern[index] === "[") {
      const closingIndex = pattern.indexOf("]", index + 1);
      const endIndex = closingIndex === -1 ? pattern.length : closingIndex;
      const inner = pattern.slice(index + 1, endIndex);
      for (const char of inner) {
        const normalized = normalizeLetterCodeChar(char);
        if (normalized) tokens.push({ char: normalized, prefilled: true });
      }
      index = closingIndex === -1 ? pattern.length : closingIndex + 1;
      continue;
    }

    if (/\s/.test(pattern[index])) {
      const last = tokens[tokens.length - 1];
      if (tokens.length > 0 && !last?.space) {
        tokens.push({ char: " ", prefilled: false, space: true });
      }
      index += 1;
      continue;
    }

    const normalized = normalizeLetterCodeChar(pattern[index]);
    if (normalized) tokens.push({ char: normalized, prefilled: false });
    index += 1;
  }

  while (tokens.length > 0 && tokens[tokens.length - 1].space) {
    tokens.pop();
  }

  return tokens;
}

function buildLetterCodeNumberMap(order: string[] | undefined): Map<string, number> {
  const effectiveOrder = isValidLetterCodeOrder(order) ? order : LETTER_CODE_ALPHABET;
  return new Map(effectiveOrder.map((letter, index) => [letter, index + 1]));
}

function buildLetterCodeHelperSet(helperLetters: string[] | undefined): Set<string> {
  const set = new Set<string>();
  for (const rawLetter of helperLetters ?? []) {
    const normalized = normalizeLetterCodeChar(rawLetter);
    if (normalized) set.add(normalized);
  }
  return set;
}

function formatLetterCodeNumber(number: number): string {
  return String(number).padStart(2, "0");
}

function LetterCodeRenderer({ block }: { block: LetterCodeBlock }) {
  const { dispatch } = useEditor();
  const { localeUpdate } = useLocaleAwareEdit();
  const instructionText = (block.instruction || "").trim() || "Write the matching letter code in each box.";
  const bankGapPx = 4;
  const cellSizePx = 38;
  const numberMap = React.useMemo(() => buildLetterCodeNumberMap(block.letterOrder), [block.letterOrder]);
  const helperLetters = React.useMemo(() => buildLetterCodeHelperSet(block.helperLetters), [block.helperLetters]);
  const letterByNumber = React.useMemo(() => {
    const map = new Map<number, string>();
    for (const [letter, number] of numberMap.entries()) {
      map.set(number, letter);
    }
    return map;
  }, [numberMap]);
  const parsedItems = React.useMemo(
    () => (block.items ?? []).map((item) => ({ ...item, tokens: parseLetterCodeWord(item.word || "") })),
    [block.items],
  );
  const rows = [
    Array.from({ length: 15 }, (_, index) => index + 1),
    [...Array.from({ length: 14 }, (_, index) => index + 16), null],
  ] as const;

  React.useEffect(() => {
    if (isValidLetterCodeOrder(block.letterOrder)) return;

    const randomized = [...LETTER_CODE_ALPHABET]
      .map((letter) => ({ letter, sortKey: Math.random() }))
      .sort((a, b) => a.sortKey - b.sortKey)
      .map((entry) => entry.letter);

    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { letterOrder: randomized } },
    });
  }, [block.id, block.letterOrder, dispatch]);

  return (
    <div className="space-y-3">
      <p
        className="text-base text-muted-foreground outline-none border-b border-transparent focus:border-muted-foreground/30 transition-colors"
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => {
          const value = e.currentTarget.textContent || "";
          localeUpdate(block.id, "instruction", value, () =>
            dispatch({ type: "UPDATE_BLOCK", payload: { id: block.id, updates: { instruction: value } } })
          );
        }}
      >
        {instructionText}
      </p>
      <div>
        <div className="grid" style={{ gridTemplateColumns: `repeat(15, ${cellSizePx}px)`, justifyContent: "space-between", columnGap: 0, rowGap: `${bankGapPx}px` }}>
          {rows.flatMap((row, rowIndex) =>
            row.map((number, colIndex) => {
              if (number === null) {
                return <div key={`letter-code-empty-${rowIndex}-${colIndex}`} aria-hidden="true" />;
              }

              return (
                <div
                  key={`letter-code-cell-${rowIndex}-${colIndex}`}
                  className="relative border border-border"
                  style={{ width: `${cellSizePx}px`, aspectRatio: "1 / 1" }}
                >
                  <span className="absolute left-0.5 top-0 text-[10px] text-muted-foreground">{formatLetterCodeNumber(number)}</span>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold" style={{ transform: "translateY(3px)" }}>
                    {(() => {
                      const letter = letterByNumber.get(number);
                      return letter && helperLetters.has(letter) ? letter : "";
                    })()}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
      <div>
        <div className="space-y-2">
          {parsedItems.map((item, itemIndex) => (
            <div key={item.id || itemIndex} className="flex items-start gap-3 rounded border border-border/70 px-3 py-2">
              <ItemNumberBadge index={itemIndex + 1} />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex min-h-[20px] items-center">
                  <p className="text-foreground">{item.clue || "-"}</p>
                </div>
                <div className="flex flex-wrap" style={{ gap: `${bankGapPx}px` }}>
                  {item.tokens.map((token, tokenIndex) => {
                    if (token.space) {
                      return (
                        <div
                          key={`${item.id}-${tokenIndex}`}
                          className="shrink-0 border border-border bg-muted"
                          style={{ width: `${cellSizePx}px`, aspectRatio: "1 / 1" }}
                          aria-hidden="true"
                        />
                      );
                    }
                    const number = numberMap.get(token.char);
                    return (
                      <div
                        key={`${item.id}-${tokenIndex}`}
                        className="relative shrink-0 border border-border"
                        style={{ width: `${cellSizePx}px`, aspectRatio: "1 / 1" }}
                      >
                        <span className="absolute left-0.5 top-0 text-[10px] text-muted-foreground">{typeof number === "number" ? formatLetterCodeNumber(number) : "?"}</span>
                        <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold" style={{ transform: "translateY(3px)" }}>
                          {token.prefilled || helperLetters.has(token.char) ? token.char : ""}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function applySegmentationCasing(value: string, casing: SegmentationBlock["casing"]) {
  if (casing === "uppercase") return value.toUpperCase();
  if (casing === "lowercase") return value.toLowerCase();
  return value;
}

function getSegmentationWords(value: string, casing: SegmentationBlock["casing"]) {
  return applySegmentationCasing(value || "", casing)
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function SegmentationRenderer({ block, interactive }: { block: SegmentationBlock; interactive: boolean }) {
  const { state, dispatch } = useEditor();
  const { localeUpdate } = useLocaleAwareEdit();
  const activeIdx = state.activeItemIndex;
  const exampleItemIndex = block.showFirstAsExample === false
    ? -1
    : block.items.findIndex((item) => getSegmentationWords(item.text, block.casing).length > 1);
  const instructionText = (block.instruction || "").trim() || "Split the text with vertical lines.";

  const handleRowClick = React.useCallback(
    (index: number) => {
      if (!interactive) {
        dispatch({ type: "SET_ACTIVE_ITEM", payload: index });
      }
    },
    [dispatch, interactive],
  );

  return (
    <div className="space-y-2">
      <p
        className="text-base text-muted-foreground outline-none border-b border-transparent focus:border-muted-foreground/30 transition-colors"
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => {
          const value = e.currentTarget.textContent || "";
          localeUpdate(block.id, "instruction", value, () =>
            dispatch({ type: "UPDATE_BLOCK", payload: { id: block.id, updates: { instruction: value } } })
          );
        }}
      >
        {instructionText}
      </p>
      {block.items.map((item, index) => {
        const words = getSegmentationWords(item.text, block.casing);
        const showExample = index === exampleItemIndex && words.length > 1;

        return (
          <div
            key={item.id}
            className={`flex items-center gap-3 border-b last:border-b-0 py-2 cursor-pointer rounded-sm transition-colors ${
              !interactive && activeIdx === index
                ? "bg-blue-50 ring-1 ring-blue-200"
                : "hover:bg-muted/30"
            }`}
            onClick={() => handleRowClick(index)}
          >
            <ItemNumberBadge index={index + 1} />
            <span className="flex-1 whitespace-nowrap" style={{ letterSpacing: "0.18em" }}>
              {words.map((word, wordIndex) => (
                <span key={`${item.id}-${wordIndex}`} className="relative">
                  {word}
                  {wordIndex < words.length - 1 ? (
                    showExample && wordIndex === 0 ? <RoughExampleDivider stroke="#0097dc" /> : null
                  ) : null}
                </span>
              ))}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Multiple Choice ────────────────────────────────────────
function MultipleChoiceRenderer({
  block,
  interactive,
}: {
  block: MultipleChoiceBlock;
  interactive: boolean;
}) {
  const { dispatch } = useEditor();
  const { localeUpdate } = useLocaleAwareEdit();
  const t = useTranslations("blockRenderer");
  const [showAiModal, setShowAiModal] = React.useState(false);
  const instructionText = (block.instruction || "").trim() || (block.allowMultiple ? "Choose the correct answers." : "Choose the correct answer.");

  const updateOptions = (newOptions: typeof block.options) => {
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { options: newOptions } },
    });
  };

  const addOption = () => {
    const newOptions = [
      ...block.options,
      { id: crypto.randomUUID(), text: `Option ${block.options.length + 1}`, isCorrect: false },
    ];
    updateOptions(newOptions);
  };

  const removeOption = (index: number) => {
    if (block.options.length <= 2) return;
    const newOptions = block.options.filter((_, i) => i !== index);
    updateOptions(newOptions);
  };

  const toggleCorrect = (index: number) => {
    const newOptions = block.options.map((opt, i) => {
      if (block.allowMultiple) {
        return i === index ? { ...opt, isCorrect: !opt.isCorrect } : opt;
      }
      return { ...opt, isCorrect: i === index };
    });
    updateOptions(newOptions);
  };

  return (
    <div className="space-y-3">
      <p
        className="text-base text-muted-foreground outline-none border-b border-transparent focus:border-muted-foreground/30 transition-colors"
        contentEditable={!interactive}
        suppressContentEditableWarning
        onBlur={(e) => {
          if (interactive) return;
          const value = e.currentTarget.textContent || "";
          localeUpdate(block.id, "instruction", value, () =>
            dispatch({ type: "UPDATE_BLOCK", payload: { id: block.id, updates: { instruction: value } } })
          );
        }}
      >
        {instructionText}
      </p>
      <p
        className="font-medium outline-none border-b border-transparent focus:border-muted-foreground/30 transition-colors"
        contentEditable={!interactive}
        suppressContentEditableWarning
        onBlur={(e) => {
          if (interactive) return;
          const value = e.currentTarget.textContent || "";
          localeUpdate(block.id, "question", value, () =>
            dispatch({ type: "UPDATE_BLOCK", payload: { id: block.id, updates: { question: value } } })
          );
        }}
      >
        {block.question}
      </p>
      <div className="space-y-2">
        {block.options.map((opt, i) => (
          <div key={opt.id} className="flex items-center gap-3 p-3 rounded-sm border border-border group">
            <ItemNumberBadge index={i + 1} />
            {interactive ? (
              block.allowMultiple ? (
                <input type="checkbox" disabled className="h-4 w-4 rounded border-gray-300" />
              ) : (
                <input type="radio" name={`mc-${block.id}`} disabled className="h-4 w-4 border-gray-300" />
              )
            ) : (
              <button
                type="button"
                onClick={() => toggleCorrect(i)}
                className={`flex items-center justify-center h-5 w-5 rounded-full border-2 transition-colors shrink-0
                  ${opt.isCorrect
                    ? "border-green-500 bg-green-500 text-white"
                    : "border-gray-300 hover:border-green-400"}`}
                title={opt.isCorrect ? t("markedAsCorrect") : t("markAsCorrect")}
              >
                {opt.isCorrect && <Check className="h-3 w-3" />}
              </button>
            )}
            {interactive ? (
              <span className="text-base flex-1">{opt.text}</span>
            ) : (
              <span
                contentEditable
                suppressContentEditableWarning
                className="text-base outline-none flex-1 border-b border-transparent focus:border-muted-foreground/30 transition-colors"
                onBlur={(e) => {
                  const value = e.currentTarget.textContent || "";
                  localeUpdate(block.id, `options.${i}.text`, value, () =>
                    updateOptions(block.options.map((item) => (item.id === opt.id ? { ...item, text: value } : item)))
                  );
                }}
              >
                {opt.text}
              </span>
            )}
            {!interactive && (
              <button
                type="button"
                onClick={() => removeOption(i)}
                className={`h-5 w-5 flex items-center justify-center rounded text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0
                  ${block.options.length <= 2 ? "invisible" : "opacity-0 group-hover:opacity-100"}`}
                title={t("removeOption")}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
      </div>
      {!interactive && (
        <div className="flex items-center gap-3 mt-1">
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            onClick={(e) => {
              e.stopPropagation();
              addOption();
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            {t("addOption")}
          </button>
          <button
            type="button"
            className={`text-xs flex items-center gap-1 ${block.options.length >= 5 ? "text-muted-foreground/50 cursor-not-allowed" : "text-muted-foreground hover:text-foreground"}`}
            onClick={(e) => {
              e.stopPropagation();
              addOption();
            }}
            disabled={block.options.length >= 5}
          >
            <Plus className="h-3 w-3" /> {t("addOption")} ({block.options.length}/5)
          </button>
        </div>
      )}
      <AiMcqModal open={showAiModal} onOpenChange={setShowAiModal} blockId={block.id} />
    </div>
  );
}

// ─── Fill in the Blank ──────────────────────────────────────
function FillInBlankRenderer({
  block,
  interactive,
}: {
  block: FillInBlankBlock;
  interactive: boolean;
}) {
  const t = useTranslations("blockRenderer");
  // Parse {{blank:answer}}, {{blank,xl:answer}}, {{blank}}, {{blank*:answer}} patterns
  const parts = block.content.split(/(\{\{blank\*?(?:,[^:}]+)?(?::[^}]*)?\}\})/g);

  return (
    <div className="leading-relaxed flex flex-wrap items-baseline">
      {parts.map((part, i) => {
        const token = parseBlankToken(part);
        if (token) {
          const { answer, width } = parseBlankContent(token.raw);
          const widthStyle = getBlankWidthStyle(width, false);
          const spacing = getBlankSpacing(width, token.noSpace, parts[i + 1]);
          return interactive ? (
            <input
              key={i}
              type="text"
              placeholder={t("fillInBlankPlaceholder")}
              className={`border-b border-dashed border-muted-foreground/30 bg-transparent px-2 py-0.5 text-center ${spacing.className} focus:outline-none focus:ring-1 focus:ring-primary/50 inline`}
              style={{ ...getBlankWidthStyle(width, true), ...spacing.style }}
            />
          ) : (
            <span
              key={i}
              className={`inline-block bg-gray-100 rounded px-2 py-0.5 text-center ${spacing.className} text-muted-foreground text-xs`}
              style={{ ...widthStyle, ...spacing.style }}
            >
              {answer || '\u00A0'}
            </span>
          );
        }
        return <span key={i}>{tripleInnerRegularSpaces(part)}</span>;
      })}
    </div>
  );
}

// ─── Fill-in-blank Items ─────────────────────────────────────
function FillInBlankItemsRenderer({
  block,
  interactive,
}: {
  block: FillInBlankItemsBlock;
  interactive: boolean;
}) {
  const { state, dispatch } = useEditor();
  const { localeUpdate } = useLocaleAwareEdit();
  const t = useTranslations("blockRenderer");
  const activeIdx = state.activeItemIndex;
  const instructionText = (block.instruction || "").trim() || "Complete the sentences.";
  const exampleItem = block.showFirstAsExample ? block.items[0] : undefined;
  const exampleAnswers = React.useMemo(() => {
    if (!exampleItem) return new Set<string>();
    const answers = new Set<string>();
    for (const match of exampleItem.content.matchAll(/\{\{blank\*?(?:,[^:}]+)?(?::[^}]*)?\}\}/g)) {
      const token = parseBlankToken(match[0]);
      const value = token ? parseBlankContent(token.raw).answer.trim() : "";
      if (value) answers.add(value);
    }
    return answers;
  }, [exampleItem]);

  // For mutations, always use the raw (DE) block from the store so we never
  // persist CH-converted text (ß→ss) back into the canonical data.
  const rawBlock = state.blocks.find((b) => b.id === block.id) as FillInBlankItemsBlock | undefined;
  const rawItems = rawBlock ? rawBlock.items : block.items;

  const updateItemContent = React.useCallback(
    (index: number, newContent: string) => {
      const newItems = [...rawItems];
      newItems[index] = { ...newItems[index], content: newContent };
      dispatch({
        type: "UPDATE_BLOCK",
        payload: { id: block.id, updates: { items: newItems } },
      });
    },
    [rawItems, dispatch, block.id],
  );

  const handleRowClick = React.useCallback(
    (index: number) => {
      if (!interactive) {
        dispatch({ type: "SET_ACTIVE_ITEM", payload: index });
      }
    },
    [dispatch, interactive],
  );

  const moveItem = React.useCallback(
    (index: number, direction: -1 | 1) => {
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= rawItems.length) return;
      const newItems = [...rawItems];
      [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
      dispatch({
        type: "UPDATE_BLOCK",
        payload: { id: block.id, updates: { items: newItems } },
      });
      if (activeIdx === index) {
        dispatch({ type: "SET_ACTIVE_ITEM", payload: newIndex });
      }
    },
    [rawItems, dispatch, block.id, activeIdx],
  );

  // Extract answers for word bank
  const wordBankAnswers = React.useMemo(() => {
    if (!block.showWordBank) return [];
    const answers: string[] = [];
    for (const item of block.items) {
      const matches = item.content.matchAll(/\{\{blank\*?(?:,[^:}]+)?(?::[^}]*)?\}\}/g);
      for (const m of matches) {
        const token = parseBlankToken(m[0]);
        const value = token ? parseBlankContent(token.raw).answer.trim() : "";
        if (value) answers.push(value);
      }
    }
    return answers;
  }, [block.items, block.showWordBank]);

  return (
    <div>
      <p
        className="text-base text-muted-foreground outline-none border-b border-transparent focus:border-muted-foreground/30 transition-colors"
        contentEditable={!interactive}
        suppressContentEditableWarning
        onBlur={(e) => {
          if (interactive) return;
          const value = e.currentTarget.textContent || "";
          localeUpdate(block.id, "instruction", value, () =>
            dispatch({ type: "UPDATE_BLOCK", payload: { id: block.id, updates: { instruction: value } } })
          );
        }}
      >
        {instructionText}
      </p>
      {block.showWordBank && wordBankAnswers.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 py-1">
          {wordBankAnswers.map((word, i) => (
            <span
              key={i}
              className="rounded border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground"
              style={undefined}
            >
              {exampleAnswers.has(word) ? <RoughExampleStrike>{word}</RoughExampleStrike> : word}
            </span>
          ))}
        </div>
      )}
      {block.items.map((item, idx) => {
        const isExampleItem = item.id === exampleItem?.id;
        const pipeIndex = item.content.indexOf("|");
        const hasTwoColumnContent = pipeIndex !== -1;
        const itemContentParts = hasTwoColumnContent
          ? [item.content.slice(0, pipeIndex).trimEnd(), item.content.slice(pipeIndex + 1).trimStart()]
          : [item.content];
        const renderItemContent = (content: string, keyPrefix = "item") => {
          // Parse {{blank:answer}}, {{blank,xl:answer}}, {{blank}}, {{blank*:answer}} patterns
          const parts = content.split(/(\{\{blank\*?(?:,[^:}]+)?(?::[^}]*)?\}\})/g);

          return parts.map((part, i) => {
            const token = parseBlankToken(part);
            if (token) {
              const { answer, width } = parseBlankContent(token.raw);
              const widthStyle = getBlankWidthStyle(width, false);
              const spacing = getBlankSpacing(width, token.noSpace, parts[i + 1]);
              if (isExampleItem && answer) {
                return (
                  <span
                    key={`${keyPrefix}-${i}`}
                    className={`relative inline-flex items-center ${spacing.className}`}
                    style={{
                      ...widthStyle,
                      ...spacing.style,
                      verticalAlign: 'middle',
                      minHeight: '1.25rem',
                      lineHeight: '1.25rem',
                      borderRadius: 3,
                      backgroundColor: 'rgb(243 244 246)',
                    }}
                  >
                    <span aria-hidden="true">&nbsp;</span>
                    <span
                      className="absolute inset-x-0 block text-center leading-none"
                      style={{
                        fontFamily: 'var(--font-handwriting), cursive',
                        color: '#0097dc',
                        fontSize: '18px',
                        bottom: '2px',
                      }}
                    >
                      {answer}
                    </span>
                  </span>
                );
              }
              return interactive ? (
                <input
                  key={`${keyPrefix}-${i}`}
                  type="text"
                  placeholder={t("fillInBlankPlaceholder")}
                  className={`h-5 rounded-[3px] border-0 bg-transparent px-2 py-0 text-center leading-5 ${spacing.className} focus:outline-none focus:ring-1 focus:ring-primary/50 inline`}
                  style={{ ...getBlankWidthStyle(width, true), ...spacing.style }}
                />
              ) : (
                <span
                  key={`${keyPrefix}-${i}`}
                  className={`inline-block rounded-[3px] px-2 py-0 text-center leading-5 ${spacing.className} text-muted-foreground text-xs`}
                  style={{ ...widthStyle, ...spacing.style, verticalAlign: 'middle', minHeight: '1.25rem' }}
                >
                  {answer || '\u00A0'}
                </span>
              );
            }
            return <span key={`${keyPrefix}-${i}`}>{renderTextWithSup(tripleInnerRegularSpaces(part))}</span>;
          });
        };

        return (
          <div
            key={item.id || idx}
            className={`flex min-h-[49px] items-center gap-3 cursor-pointer rounded-sm transition-colors ${
              hasTwoColumnContent ? "" : "border-b last:border-b-0"
            } ${
              !interactive && activeIdx === idx
                ? "bg-blue-50 ring-1 ring-blue-200"
                : "hover:bg-muted/30"
            }`}
            onClick={() => handleRowClick(idx)}
          >
            {hasTwoColumnContent ? (
              <div className="grid min-w-0 flex-1 self-stretch grid-cols-[auto_minmax(0,1fr)_1rem_minmax(0,1fr)]">
                <span
                  className={`flex min-h-[49px] items-center border-b pr-3 ${
                    idx === block.items.length - 1 ? "border-b-0" : ""
                  }`}
                >
                  <ItemNumberBadge index={idx + 1} className="h-5 w-5 min-w-5 rounded-[3px] leading-none" />
                </span>
                <span
                  className={`flex min-h-[49px] min-w-0 flex-wrap items-center border-b leading-5 ${
                    idx === block.items.length - 1 ? "border-b-0" : ""
                  }`}
                  style={{ lineHeight: 1 }}
                >
                  {renderItemContent(itemContentParts[0], "col-0")}
                </span>
                <span aria-hidden="true" />
                <span
                  className={`flex min-h-[49px] min-w-0 flex-wrap items-center border-b leading-5 ${
                    idx === block.items.length - 1 ? "border-b-0" : ""
                  }`}
                  style={{ lineHeight: 1 }}
                >
                  {renderItemContent(itemContentParts[1], "col-1")}
                </span>
              </div>
            ) : (
              <>
                <ItemNumberBadge index={idx + 1} className="h-5 w-5 min-w-5 rounded-[3px] leading-none" />
                <span className="flex-1 flex-wrap items-center leading-5" style={{ lineHeight: 1 }}>
                  {renderItemContent(item.content)}
                </span>
              </>
            )}
            {!interactive && (
              <div className="flex flex-col shrink-0" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="h-3.5 w-5 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30"
                  onClick={() => moveItem(idx, -1)}
                  disabled={idx === 0}
                >
                  <ChevronUp className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  className="h-3.5 w-5 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30"
                  onClick={() => moveItem(idx, 1)}
                  disabled={idx === block.items.length - 1}
                >
                  <ChevronDown className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Matching ────────────────────────────────────────────────
function MatchingRenderer({ block }: { block: MatchingBlock | PronunciationBlock }) {
  const { state } = useEditor();
  const itemNumberFormat = state.brandProfile.itemNumberFormat || "default";
  const usePlainTextRightLabels = itemNumberFormat === "numbers-with-period";
  const isPronunciation = block.type === "pronunciation";
  const rowClass = isPronunciation
    ? `flex min-h-[32.5px] items-center gap-3 border-b ${block.extendedRows ? "py-1" : "py-2"}`
    : undefined;
  const rowStyle = isPronunciation && block.extendedRows ? { minHeight: "3.5rem" } : undefined;
  const examplePairId = block.showFirstAsExample ? block.pairs[0]?.id : undefined;
  const orderedPairs = React.useMemo(() => {
    const examplePair = examplePairId ? block.pairs.find((pair) => pair.id === examplePairId) : undefined;
    const remainingPairs = block.pairs.filter((pair) => pair.id !== examplePairId);
    const orderedRemainingPairs = block.pairOrder
      ? block.pairOrder
          .map((id) => remainingPairs.find((pair) => pair.id === id))
          .filter((pair): pair is NonNullable<typeof pair> => !!pair)
          .concat(remainingPairs.filter((pair) => !block.pairOrder!.includes(pair.id)))
      : remainingPairs;

    return examplePair ? [examplePair, ...orderedRemainingPairs] : orderedRemainingPairs;
  }, [block.pairOrder, block.pairs, examplePairId]);
  const shuffledRight = React.useMemo(() => getDeterministicPreviewDerangement(
    orderedPairs,
    (pair, index) => `${pair.id}:${pair.right}:${index}`
  ), [orderedPairs]);
  const exampleAnswers = React.useMemo(() => {
    if (!examplePairId) return new Set<string>();
    const examplePair = block.pairs.find((pair) => pair.id === examplePairId);
    if (!examplePair) return new Set<string>();
    const answer = `${examplePair.left.trim()}${examplePair.right.trim()}`;
    return answer ? new Set([answer]) : new Set<string>();
  }, [block.pairs, examplePairId]);
  const lineContainerRef = React.useRef<HTMLDivElement | null>(null);
  const leftExampleRefs = React.useRef<Record<string, HTMLSpanElement | null>>({});
  const rightExampleRefs = React.useRef<Record<string, HTMLSpanElement | null>>({});
  const [exampleLine, setExampleLine] = React.useState<null | { x1: number; y1: number; x2: number; y2: number }>(null);
  const [exampleSvgSize, setExampleSvgSize] = React.useState({ width: 0, height: 0 });
  const wordBankItems = getDeterministicPreviewOrder(
    block.pairs.map((pair) => ({
      id: pair.id,
      text: `${pair.left.trim()}${pair.right.trim()}`,
    })).filter((item) => item.text),
    (item) => `matching-wordbank:${block.id}:${item.id}:${item.text}`
  );

  React.useLayoutEffect(() => {
    const container = lineContainerRef.current;
    if (!container || !examplePairId) {
      setExampleLine((current) => (current === null ? current : null));
      setExampleSvgSize((current) => (current.width === 0 && current.height === 0 ? current : { width: 0, height: 0 }));
      return;
    }

    const measure = () => {
      const leftAnchor = leftExampleRefs.current[examplePairId];
      const rightAnchor = rightExampleRefs.current[examplePairId];
      if (!leftAnchor || !rightAnchor) {
        setExampleLine(null);
        return;
      }

      const containerRect = container.getBoundingClientRect();
      const leftRect = leftAnchor.getBoundingClientRect();
      const rightRect = rightAnchor.getBoundingClientRect();

      setExampleSvgSize({ width: containerRect.width, height: containerRect.height });
      setExampleLine({
        x1: leftRect.right - containerRect.left,
        y1: leftRect.top - containerRect.top + leftRect.height / 2,
        x2: rightRect.left - containerRect.left,
        y2: rightRect.top - containerRect.top + rightRect.height / 2,
      });
    };

    measure();

    const resizeObserver = new ResizeObserver(() => {
      measure();
    });
    resizeObserver.observe(container);
    window.addEventListener("resize", measure);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [orderedPairs, shuffledRight, examplePairId]);

  return (
    <div className="space-y-3">
      <p className="text-base text-muted-foreground">{block.instruction}</p>
      {block.textAboveItems?.trim() && (
        <p className="text-sm whitespace-pre-line">{block.textAboveItems}</p>
      )}
      {block.showWordBank && wordBankItems.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 py-1">
          {wordBankItems.map((word, i) => (
            <span
              key={i}
              className="rounded border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground"
              style={undefined}
            >
              {exampleAnswers.has(word.text) ? <RoughExampleStrike>{word.text}</RoughExampleStrike> : word.text}
            </span>
          ))}
        </div>
      )}
      <div ref={lineContainerRef} className="relative">
        {examplePairId && exampleLine && (
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
            aria-hidden="true"
            width={exampleSvgSize.width}
            height={exampleSvgSize.height}
            viewBox={`0 0 ${exampleSvgSize.width} ${exampleSvgSize.height}`}
            preserveAspectRatio="none"
          >
            <path
              d={`M ${exampleLine.x1} ${exampleLine.y1} C ${exampleLine.x1 + (exampleLine.x2 - exampleLine.x1) * 0.35} ${exampleLine.y1}, ${exampleLine.x1 + (exampleLine.x2 - exampleLine.x1) * 0.65} ${exampleLine.y2}, ${exampleLine.x2} ${exampleLine.y2}`}
              stroke="#0097dc"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        )}
      <div className="grid grid-cols-2" style={{ gap: "0 24px" }}>
        <div className="space-y-0">
          {isPronunciation && (
            <div className="flex min-h-[32.5px] items-center gap-3 border-y py-2 text-sm font-semibold text-foreground">
              <span className="w-6 shrink-0" />
              <span className="flex-1 text-right">{block.leftHeader ?? ""}</span>
            </div>
          )}
          {orderedPairs.map((pair, i) => (
            <div
              key={pair.id}
              className={rowClass ?? `flex items-center gap-3 py-2 border-b ${i === 0 ? "border-t" : ""}`}
              style={rowStyle}
            >
              <ItemNumberBadge index={i + 1} />
              <span
                ref={pair.id === examplePairId ? (node) => {
                  leftExampleRefs.current[pair.id] = node;
                } : undefined}
                className="flex-1 text-right"
                style={pair.id === examplePairId ? { color: "#0097dc" } : undefined}
              >
                {pair.left}
              </span>
            </div>
          ))}
        </div>
        <div className="space-y-0">
          {isPronunciation && (
            <div className="flex min-h-[32.5px] items-center gap-3 border-y py-2 text-sm font-semibold text-foreground">
              <span className="h-4 w-4 shrink-0" />
              <span className="flex-1">{block.rightHeader ?? ""}</span>
              <span className="w-6 shrink-0" />
            </div>
          )}
          {shuffledRight.map((pair, i) => (
            <div
              key={`right-${pair.id}`}
              className={rowClass ?? `flex items-center gap-3 py-2 border-b ${i === 0 ? "border-t" : ""}`}
              style={rowStyle}
            >
              <div className="h-4 w-4 rounded-[3px] border border-muted-foreground/40 shrink-0" />
              <span
                ref={pair.id === examplePairId ? (node) => {
                  rightExampleRefs.current[pair.id] = node;
                } : undefined}
                className="flex-1"
                style={pair.id === examplePairId ? { color: "#0097dc" } : undefined}
              >
                {pair.right}
              </span>
              <span
                className={usePlainTextRightLabels
                  ? "shrink-0 bg-transparent text-[1em] font-medium leading-none text-muted-foreground tabular-nums"
                  : "text-xs font-bold text-muted-foreground bg-muted w-6 h-6 rounded flex items-center justify-center shrink-0"}
              >
                {formatMatchingRightLabel(i + 1, itemNumberFormat)}
              </span>
            </div>
          ))}
        </div>
      </div>
      </div>
    </div>
  );
}

function TextMatchingRenderer({ block }: { block: TextMatchingBlock }) {
  const textItems = React.useMemo(() => getTextMatchingTextItems(block.items), [block.items]);
  const columns = Math.min(4, Math.max(1, block.columns ?? 3));
  const gridClass = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-2 md:grid-cols-3",
    4: "grid-cols-2 md:grid-cols-4",
  }[columns];
  const cardItems = React.useMemo(
    () => getTextMatchingCardItems(block.id, block.items),
    [block.id, block.items]
  );
  const answerLetterByTextItemId = React.useMemo(
    () => getTextMatchingAnswerLetters(block.id, block.items, (index) => toAlphabeticLabel(index, true)),
    [block.id, block.items]
  );
  const exampleItemId = block.showFirstAsExample ? textItems[0]?.id : undefined;

  return (
    <div className="space-y-8">
      {block.instruction ? <p className="text-base text-muted-foreground">{block.instruction}</p> : null}
      {textItems.length > 0 && (
        <div className="space-y-0">
          {textItems.map((item, index) => (
            <div
              key={item.id}
              className={`flex items-start gap-3 border-b py-2 ${index === 0 ? "border-t" : ""}`}
            >
              <ItemNumberBadge index={index + 1} />
              <span
                className="relative inline-flex h-5 min-w-10 shrink-0 items-center justify-center rounded-[3px] bg-gray-100 px-2 leading-5 align-middle"
                aria-hidden="true"
              >
                <span>&nbsp;</span>
                {item.id === exampleItemId && answerLetterByTextItemId.has(item.id) && (
                  <span
                    className="absolute inset-x-0 block text-center leading-none"
                    style={{
                      fontFamily: "var(--font-handwriting), cursive",
                      color: "#0097dc",
                      fontSize: "18px",
                      bottom: "2px",
                    }}
                  >
                    {answerLetterByTextItemId.get(item.id)}
                  </span>
                )}
              </span>
              <span className="min-w-0 flex-1">{item.text ?? ""}</span>
            </div>
          ))}
        </div>
      )}
      {cardItems.length > 0 && (
        <div className={`grid gap-3 ${gridClass}`}>
          {cardItems.map((item, index) => (
            <div key={item.id} className="relative rounded-md border border-muted-foreground/40 bg-background py-3 pr-3 pl-8 shadow-sm">
              <span className="absolute left-[-1px] top-[-1px] flex h-6 w-6 min-w-6 items-center justify-center rounded-br-md border border-l-0 border-t-0 border-muted-foreground/40 bg-muted text-xs font-bold text-muted-foreground">
                {toAlphabeticLabel(index + 1, true)}
              </span>
              <div
                className="tiptap tiptap-compact max-w-none text-sm"
                dangerouslySetInnerHTML={{ __html: prepareTiptapHtml(item.content ?? "") }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Two-Column Fill ─────────────────────────────────────────
function TwoColumnFillRenderer({ block }: { block: TwoColumnFillBlock }) {
  const t = useTranslations("blockRenderer");

  // Collect fill-side values for word bank
  const wordBankItems = block.items
    .map((item) => (block.fillSide === "left" ? item.left : item.right))
    .filter(Boolean);

  // Column ratio → grid-template-columns
  const gridCols = block.colRatio === "1-2" ? "1fr 2fr"
    : block.colRatio === "2-1" ? "2fr 1fr"
    : "1fr 1fr";

  return (
    <div className="space-y-3">
      {block.instruction ? <p className="text-base text-muted-foreground">{block.instruction}</p> : null}
      {/* Word Bank */}
      {block.showWordBank && wordBankItems.length > 0 && (
        <div className="rounded p-3 border border-dashed border-muted-foreground/30">
          <div className="text-xs text-muted-foreground mb-2 font-medium">{t("wordBank")}</div>
          <div className="flex flex-wrap gap-2">
            {getDeterministicPreviewOrder(
              wordBankItems,
              (text, index) => `${text}:${index}`
            )
              .map((text, i) => (
                <span key={i} className="px-2 py-0.5 bg-background rounded border text-xs">
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
              <ItemNumberBadge index={i + 1} />
              {block.fillSide === "left" ? (
                hasHandwriting(item.left) ? (
                  <span className="flex-1">{renderHandwriting(item.left)}</span>
                ) : (
                  <span className="flex-1 border-b border-dashed border-muted-foreground/40">&nbsp;</span>
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
                  <span className="flex-1 border-b border-dashed border-muted-foreground/40">&nbsp;</span>
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

// ─── Glossary ────────────────────────────────────────────────
function GlossaryRenderer({ block }: { block: GlossaryBlock }) {
  const { dispatch } = useEditor();
  const { localeUpdate } = useLocaleAwareEdit();
  const colWidth = `${block.leftColWidth ?? 25}%`;
  const hasExamples = block.pairs.some((p) => p.example);

  const updatePair = (
    index: number,
    updates: Partial<Pick<GlossaryBlock["pairs"][number], "term" | "definition" | "example">>,
  ) => {
    const pairs = [...block.pairs];
    pairs[index] = { ...pairs[index], ...updates };
    dispatch({ type: "UPDATE_BLOCK", payload: { id: block.id, updates: { pairs } } });
  };

  return (
    <div className="space-y-3">
      {block.instruction && (
        <p
          className="text-base text-muted-foreground outline-none"
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => {
            const value = e.currentTarget.textContent || "";
            localeUpdate(block.id, "instruction", value, () =>
              dispatch({ type: "UPDATE_BLOCK", payload: { id: block.id, updates: { instruction: value } } })
            );
          }}
        >
          {block.instruction}
        </p>
      )}
      <div className="space-y-0 border-t">
        {block.pairs.map((pair, i) => (
          <div
            key={pair.id}
            className="flex items-start gap-4 py-1 border-b"
          >
            <span
              className="text-base font-semibold outline-none"
              style={{ width: colWidth, minWidth: colWidth, flexShrink: 0 }}
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => {
                const value = e.currentTarget.textContent || "";
                localeUpdate(block.id, `pairs.${i}.term`, value, () =>
                  updatePair(i, { term: value })
                );
              }}
            >
              {pair.term}
            </span>
            <span
              className={`text-base ${hasExamples ? "flex-1" : "flex-1"} outline-none`}
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => {
                const value = e.currentTarget.textContent || "";
                localeUpdate(block.id, `pairs.${i}.definition`, value, () =>
                  updatePair(i, { definition: value })
                );
              }}
            >
              {pair.definition}
            </span>
            {hasExamples && (
              <span
                className="text-base flex-1 text-muted-foreground outline-none"
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => {
                  const value = e.currentTarget.textContent || "";
                  localeUpdate(block.id, `pairs.${i}.example`, value, () =>
                    updatePair(i, { example: value })
                  );
                }}
              >
                {pair.example}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Open Response ──────────────────────────────────────────
function OpenResponseRenderer({
  block,
  interactive,
}: {
  block: OpenResponseBlock;
  interactive: boolean;
}) {
  const t = useTranslations("blockRenderer");
  return (
    <div className="space-y-2">
      <p className="font-medium">{block.question}</p>
      {interactive ? (
        <textarea
          className="w-full border rounded-sm p-2 text-base resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          rows={block.lines}
          placeholder={t("writeAnswerHere")}
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

// ─── Word Bank ──────────────────────────────────────────────
function WordBankRenderer({ block }: { block: WordBankBlock }) {
  return (
    <div className="flex min-h-[37px] flex-wrap items-center gap-2 border-b py-2">
      <div className="flex flex-1 flex-wrap gap-2">
        {block.words.map((word, i) => (
          <span
            key={i}
            className="px-3 py-0.5 rounded border border-border text-cv-sm"
          >
            {word}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Number Line ────────────────────────────────────────────
function NumberLineRenderer({ block }: { block: NumberLineBlock }) {
  const { dispatch } = useEditor();
  const ticks: number[] = [];
  for (let v = block.min; v <= block.max; v += block.step) {
    ticks.push(v);
  }

  return (
    <div className="py-4">
      <div className="relative mx-6">
        {/* Line */}
        <div className="h-0.5 bg-foreground w-full" />
        {/* Ticks */}
        <div className="flex justify-between -mt-2">
          {ticks.map((v) => (
            <div key={v} className="flex flex-col items-center">
              <div className="h-3 w-0.5 bg-foreground" />
              <span className="text-xs mt-1 text-muted-foreground">{v}</span>
            </div>
          ))}
        </div>
        {/* Markers */}
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

// ─── True/False Matrix ──────────────────────────────────
function TrueFalseMatrixRenderer({
  block,
  interactive,
}: {
  block: TrueFalseMatrixBlock;
  interactive: boolean;
}) {
  const { dispatch } = useEditor();
  const { localeUpdate } = useLocaleAwareEdit();
  const t = useTranslations("blockRenderer");
  const tc = useTranslations("common");
  const [showAiModal, setShowAiModal] = React.useState(false);
  const trueLabelText = block.trueLabel || tc("true");
  const falseLabelText = block.falseLabel || tc("false");
  const optionColumnWidth = `${Math.max(64, Math.min(160, Math.max(trueLabelText.length, falseLabelText.length) * 8 + 24))}px`;

  const updateStatement = (id: string, updates: Partial<{ text: string; correctAnswer: boolean }>) => {
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          statements: block.statements.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        },
      },
    });
  };

  const addStatement = () => {
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          statements: [
            ...block.statements,
            { id: crypto.randomUUID(), text: t("newStatement"), correctAnswer: true },
          ],
        },
      },
    });
  };

  const removeStatement = (id: string) => {
    if (block.statements.length <= 1) return;
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          statements: block.statements.filter((s) => s.id !== id),
        },
      },
    });
  };

  return (
    <div className="space-y-2">
      {/* Header + Items */}
      <div>
        <div className="flex items-center gap-3 py-2 border-b">
          <div className="flex-1 font-bold text-foreground">
            <span
              className="outline-none block"
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => {
                const value = e.currentTarget.textContent || "";
                localeUpdate(block.id, "statementColumnHeader", value, () =>
                  dispatch({ type: "UPDATE_BLOCK", payload: { id: block.id, updates: { statementColumnHeader: value } } })
                );
              }}
            >
              {block.statementColumnHeader || ""}
            </span>
          </div>
          <div className="shrink-0 text-center font-medium text-muted-foreground" style={{ width: optionColumnWidth }}>{trueLabelText}</div>
          <div className="shrink-0 text-center font-medium text-muted-foreground" style={{ width: optionColumnWidth }}>{falseLabelText}</div>
          <div className="w-8"></div>
        </div>
        <div>
          {(() => {
            const orderedStatements = block.statementOrder
              ? block.statementOrder
                  .map((id) => block.statements.find((statement) => statement.id === id))
                  .filter((statement): statement is NonNullable<typeof statement> => !!statement)
                  .concat(block.statements.filter((statement) => !block.statementOrder!.includes(statement.id)))
              : block.statements;
            return orderedStatements.map((stmt, stmtIndex) => (
            <div key={stmt.id} className="group/row flex items-center gap-3 py-2 border-b last:border-b-0">
              <div className="flex flex-1 items-center gap-3">
                <ItemNumberBadge index={stmtIndex + 1} />
                <span
                  className="outline-none block flex-1"
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => {
                    const value = e.currentTarget.textContent || "";
                    const idx = block.statements.findIndex((s) => s.id === stmt.id);
                    localeUpdate(block.id, `statements.${idx}.text`, value, () =>
                      updateStatement(stmt.id, { text: value })
                    );
                  }}
                >
                  {stmt.text}
                </span>
              </div>
              <div className="shrink-0 flex items-center justify-center" style={{ width: optionColumnWidth }}>
                <button
                  className={`w-5 h-5 rounded-full border-2 inline-flex items-center justify-center transition-colors
                    ${stmt.correctAnswer ? "bg-green-500 border-green-500 text-white" : "border-muted-foreground/30 hover:border-green-400"}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    updateStatement(stmt.id, { correctAnswer: true });
                  }}
                >
                  {stmt.correctAnswer && <Check className="h-3 w-3" />}
                </button>
              </div>
              <div className="shrink-0 flex items-center justify-center" style={{ width: optionColumnWidth }}>
                <button
                  className={`w-5 h-5 rounded-full border-2 inline-flex items-center justify-center transition-colors
                    ${!stmt.correctAnswer ? "bg-red-500 border-red-500 text-white" : "border-muted-foreground/30 hover:border-red-400"}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    updateStatement(stmt.id, { correctAnswer: false });
                  }}
                >
                  {!stmt.correctAnswer && <X className="h-3 w-3" />}
                </button>
              </div>
              <div className="w-8 flex items-center justify-center">
                <button
                  type="button"
                  className="opacity-0 group-hover/row:opacity-100 p-0.5 hover:bg-destructive/10 rounded transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeStatement(stmt.id);
                  }}
                >
                  <X className="h-3 w-3 text-destructive" />
                </button>
              </div>
            </div>
          ));
          })()}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          onClick={(e) => {
            e.stopPropagation();
            addStatement();
          }}
        >
          <Plus className="h-3 w-3" /> {t("addStatement")}
        </button>
        <button
          className="text-xs text-purple-500 hover:text-purple-700 flex items-center gap-1 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            setShowAiModal(true);
          }}
        >
          <Sparkles className="h-3 w-3" /> {t("aiGenerate")}
        </button>
      </div>
      <AiTrueFalseModal open={showAiModal} onOpenChange={setShowAiModal} blockId={block.id} />
    </div>
  );
}

function MCQMatrixRenderer({
  block,
  interactive,
}: {
  block: MCQMatrixBlock;
  interactive: boolean;
}) {
  const { dispatch } = useEditor();
  const { localeUpdate } = useLocaleAwareEdit();
  const t = useTranslations("blockRenderer");
  const instructionText = (block.instruction || "").trim() || "Mark the correct options for each statement.";
  const wordBankItems = (block.wordBank ?? []).map((item) => item.trim()).filter(Boolean);

  const updateStatements = (statements: MCQMatrixBlock["statements"]) => {
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: { statements },
      },
    });
  };

  const updateOptions = (options: MCQMatrixBlock["options"], statements = block.statements) => {
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: { options, statements },
      },
    });
  };

  const updateStatement = (
    id: string,
    updates: Partial<Pick<MCQMatrixBlock["statements"][number], "text" | "afterOptionsText" | "correctOptionIds">>
  ) => {
    updateStatements(block.statements.map((statement) => (statement.id === id ? { ...statement, ...updates } : statement)));
  };

  const addStatement = () => {
    updateStatements([
      ...block.statements,
      { id: crypto.randomUUID(), text: t("newStatement"), afterOptionsText: "", correctOptionIds: [] },
    ]);
  };

  const removeStatement = (id: string) => {
    if (block.statements.length <= 1) return;
    updateStatements(block.statements.filter((statement) => statement.id !== id));
  };

  const addOption = () => {
    if (block.options.length >= 5) return;
    updateOptions([
      ...block.options,
      { id: crypto.randomUUID(), text: `${t("addOption")} ${block.options.length + 1}` },
    ]);
  };

  const removeOption = (optionId: string) => {
    if (block.options.length <= 2) return;
    updateOptions(
      block.options.filter((option) => option.id !== optionId),
      block.statements.map((statement) => ({
        ...statement,
        correctOptionIds: statement.correctOptionIds.filter((id) => id !== optionId),
      }))
    );
  };

  const toggleCorrectOption = (statementId: string, optionId: string) => {
    updateStatements(
      block.statements.map((statement) => {
        if (statement.id !== statementId) return statement;
        const isSelected = statement.correctOptionIds.includes(optionId);
        return {
          ...statement,
          correctOptionIds: isSelected
            ? statement.correctOptionIds.filter((id) => id !== optionId)
            : [...statement.correctOptionIds, optionId],
        };
      })
    );
  };

  const exampleStatementId = block.showFirstAsExample ? block.statements[0]?.id : undefined;
  const orderedStatements = (() => {
    const exampleStatement = exampleStatementId
      ? block.statements.find((statement) => statement.id === exampleStatementId)
      : undefined;
    const remainingStatements = block.statements.filter((statement) => statement.id !== exampleStatementId);
    return exampleStatement ? [exampleStatement, ...remainingStatements] : remainingStatements;
  })();
  const showAfterOptionsColumn = !interactive || orderedStatements.some((statement) => (statement.afterOptionsText || "").trim().length > 0);
  const optionColumnWidth = block.compactOptionColumns ? "w-10" : "w-24";

  return (
    <div className="space-y-3">
      <p
        className="text-base text-muted-foreground outline-none"
        contentEditable={!interactive}
        suppressContentEditableWarning
        onBlur={(e) => {
          if (interactive) return;
          const value = e.currentTarget.textContent || "";
          localeUpdate(block.id, "instruction", value, () =>
            dispatch({ type: "UPDATE_BLOCK", payload: { id: block.id, updates: { instruction: value } } })
          );
        }}
      >
        {instructionText}
      </p>
      {wordBankItems.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 py-1">
          {wordBankItems.map((item, index) => (
            <span key={`${item}-${index}`} className="rounded border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground" style={undefined}>
              {item}
            </span>
          ))}
        </div>
      )}
      <div>
        <div className="flex items-center gap-3 py-2 border-y">
          <div className="flex-1" />
          {block.options.map((option, optionIndex) => (
            <div key={option.id} className={`${optionColumnWidth} flex shrink-0 items-center justify-center gap-1`}>
              <span
                className="outline-none block text-center font-semibold text-foreground text-xs flex-1"
                contentEditable={!interactive}
                suppressContentEditableWarning
                onBlur={(e) => {
                  if (interactive) return;
                  const value = e.currentTarget.textContent || "";
                  localeUpdate(block.id, `options.${optionIndex}.text`, value, () =>
                    updateOptions(block.options.map((item) => (item.id === option.id ? { ...item, text: value } : item)))
                  );
                }}
              >
                {option.text}
              </span>
              {!interactive && (
                <button
                  type="button"
                  className={`p-0.5 rounded hover:bg-destructive/10 ${block.options.length <= 2 ? "invisible" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeOption(option.id);
                  }}
                >
                  <X className="h-3 w-3 text-destructive" />
                </button>
              )}
            </div>
          ))}
          {showAfterOptionsColumn && <div className="w-40" />}
          <div className="w-8" />
        </div>
        <div>
          {orderedStatements.map((statement, statementIndex) => (
            <div key={statement.id} className="group/row flex items-center gap-3 py-2 border-b last:border-b-0">
              <div className="flex flex-1 items-center gap-3">
                <ItemNumberBadge index={statementIndex + 1} />
                <InlineHtmlEditable
                  value={statement.text}
                  editable={!interactive}
                  className="outline-none block flex-1"
                  onCommit={(value) => {
                    if (interactive) return;
                    const statementPosition = block.statements.findIndex((item) => item.id === statement.id);
                    localeUpdate(block.id, `statements.${statementPosition}.text`, value, () =>
                      updateStatement(statement.id, { text: value })
                    );
                  }}
                />
              </div>
              {block.options.map((option) => {
                const isSelected = statement.correctOptionIds.includes(option.id);
                const isExampleRow = statement.id === exampleStatementId;
                return (
                  <div key={option.id} className={`${optionColumnWidth} flex shrink-0 items-center justify-center`}>
                    <button
                      type="button"
                      className="w-5 h-5 rounded-sm border-2 inline-flex items-center justify-center transition-colors border-muted-foreground/30 hover:border-green-400"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCorrectOption(statement.id, option.id);
                      }}
                    >
                      {isSelected ? renderHandwrittenMatrixIndicator(isExampleRow ? "#0097dc" : "#15803d") : null}
                    </button>
                  </div>
                );
              })}
              {showAfterOptionsColumn && (
                <div className="w-40">
                  <InlineHtmlEditable
                    value={statement.afterOptionsText || ""}
                    editable={!interactive}
                    className="outline-none block text-sm"
                    onCommit={(value) => {
                      if (interactive) return;
                      const statementPosition = block.statements.findIndex((item) => item.id === statement.id);
                      localeUpdate(block.id, `statements.${statementPosition}.afterOptionsText`, value, () =>
                        updateStatement(statement.id, { afterOptionsText: value })
                      );
                    }}
                  />
                </div>
              )}
              <div className="w-8 flex items-center justify-center">
                <button
                  type="button"
                  className="opacity-0 group-hover/row:opacity-100 p-0.5 hover:bg-destructive/10 rounded transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeStatement(statement.id);
                  }}
                >
                  <X className="h-3 w-3 text-destructive" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {!interactive && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            onClick={(e) => {
              e.stopPropagation();
              addStatement();
            }}
          >
            <Plus className="h-3 w-3" /> {t("addStatement")}
          </button>
          <button
            type="button"
            className={`text-xs flex items-center gap-1 ${block.options.length >= 5 ? "text-muted-foreground/50 cursor-not-allowed" : "text-muted-foreground hover:text-foreground"}`}
            onClick={(e) => {
              e.stopPropagation();
              addOption();
            }}
            disabled={block.options.length >= 5}
          >
            <Plus className="h-3 w-3" /> {t("addOption")} ({block.options.length}/5)
          </button>
        </div>
      )}
    </div>
  );
}

function MCQRowsRenderer({
  block,
  interactive,
}: {
  block: MCQRowsBlock;
  interactive: boolean;
}) {
  const { dispatch } = useEditor();
  const { localeUpdate } = useLocaleAwareEdit();
  const t = useTranslations("blockRenderer");
  const instructionText = (block.instruction || "").trim() || "Choose the correct option in each row.";
  const exampleItemId = block.showFirstAsExample ? block.items[0]?.id : undefined;
  const choicesPerItem = Math.max(2, Math.min(6, Math.round(block.choicesPerItem || 3)));
  const choiceGridStyle: React.CSSProperties = {
    gridTemplateColumns: `repeat(${choicesPerItem}, minmax(0, 120px))`,
  };
  const getChoiceLabel = React.useCallback((label: string | undefined, index: number) => {
    const value = (label || "").trim();
    return value.length > 0 ? value : String.fromCharCode(65 + index);
  }, []);

  const updateItems = (items: MCQRowsBlock["items"]) => {
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: { items },
      },
    });
  };

  const updateItem = (
    id: string,
    updates: Partial<Pick<MCQRowsBlock["items"][number], "text" | "choices" | "correctChoiceId">>
  ) => {
    updateItems(block.items.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  const addItem = () => {
    const choices = Array.from({ length: choicesPerItem }, (_, index) => ({
      id: crypto.randomUUID(),
      label: String.fromCharCode(65 + index),
      text: `${t("newChoice")} ${index + 1}`,
    }));
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          items: [
            ...block.items,
            {
              id: crypto.randomUUID(),
              text: t("newItem"),
              choices,
              correctChoiceId: choices[0]?.id ?? "",
            },
          ],
        },
      },
    });
  };

  const removeItem = (id: string) => {
    if (block.items.length <= 1) return;
    updateItems(block.items.filter((item) => item.id !== id));
  };

  return (
    <div className="space-y-2">
      <p
        className="text-base text-muted-foreground outline-none border-b border-transparent focus:border-muted-foreground/30 transition-colors"
        contentEditable={!interactive}
        suppressContentEditableWarning
        onBlur={(e) => {
          if (interactive) return;
          const value = e.currentTarget.textContent || "";
          localeUpdate(block.id, "instruction", value, () =>
            dispatch({ type: "UPDATE_BLOCK", payload: { id: block.id, updates: { instruction: value } } })
          );
        }}
      >
        {instructionText}
      </p>

      <div>
        {block.items.map((item, itemIndex) => (
          <div key={item.id} className="group/row flex items-center gap-3 py-2 border-b last:border-b-0">
            <ItemNumberBadge index={itemIndex + 1} />
            <InlineHtmlEditable
              value={item.text}
              editable={!interactive}
              className="outline-none block flex-1 min-w-0"
              onCommit={(value) => {
                if (interactive) return;
                localeUpdate(block.id, `items.${itemIndex}.text`, value, () =>
                  updateItem(item.id, { text: value })
                );
              }}
            />
            <div className="grid shrink-0 gap-2" style={choiceGridStyle}>
              {item.choices.map((choice, choiceIndex) => {
                const isCorrect = item.correctChoiceId === choice.id;
                const isExampleRow = item.id === exampleItemId;
                const choiceLabel = getChoiceLabel(choice.label, choiceIndex);
                return (
                  <div
                    key={choice.id}
                    className={`inline-flex items-center gap-1.5 transition-colors ${
                      isCorrect && !isExampleRow
                        ? "text-green-700"
                        : "text-foreground"
                    }`}
                    style={isCorrect && isExampleRow ? { color: "#0097dc" } : undefined}
                    onClick={(e) => {
                      e.stopPropagation();
                      updateItem(item.id, { correctChoiceId: choice.id });
                    }}
                  >
                    <span className="text-[11px] font-bold uppercase text-muted-foreground">
                      {choiceLabel}
                    </span>
                    {isCorrect
                      ? renderHandwrittenMatrixIndicator(isExampleRow ? "#0097dc" : "#15803d")
                      : renderInlineChoiceIndicator(false, false)}
                    <span
                      className="outline-none block min-w-0 flex-1 text-left font-semibold"
                      contentEditable={!interactive}
                      suppressContentEditableWarning
                      onClick={(e) => e.stopPropagation()}
                      onBlur={(e) => {
                        if (interactive) return;
                        const value = e.currentTarget.textContent || "";
                        localeUpdate(block.id, `items.${itemIndex}.choices.${choiceIndex}.text`, value, () =>
                          updateItem(item.id, {
                            choices: item.choices.map((currentChoice) =>
                              currentChoice.id === choice.id ? { ...currentChoice, text: value } : currentChoice
                            ),
                          })
                        );
                      }}
                    >
                      {choice.text}
                    </span>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              className="opacity-0 group-hover/row:opacity-100 p-0.5 hover:bg-destructive/10 rounded transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                removeItem(item.id);
              }}
            >
              <X className="h-3 w-3 text-destructive" />
            </button>
          </div>
        ))}
      </div>

      {!interactive && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            onClick={(e) => {
              e.stopPropagation();
              addItem();
            }}
          >
            <Plus className="h-3 w-3" /> {t("addItem")}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Article Training ───────────────────────────────────────
function ArticleTrainingRenderer({
  block,
  interactive,
}: {
  block: ArticleTrainingBlock;
  interactive: boolean;
}) {
  const { dispatch } = useEditor();
  const { localeUpdate } = useLocaleAwareEdit();
  const t = useTranslations("blockRenderer");
  const articles: ArticleAnswer[] = ["der", "das", "die"];
  const articleOptionClass =
    "flex h-6 w-6 items-center justify-center rounded-[4px] border text-[11px] font-semibold uppercase transition-colors";

  const updateItem = (id: string, updates: Partial<{ text: string; correctArticle: ArticleAnswer }>) => {
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          items: block.items.map((item) =>
            item.id === id ? { ...item, ...updates } : item
          ),
        },
      },
    });
  };

  const addItem = () => {
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          items: [
            ...block.items,
            { id: crypto.randomUUID(), text: t("newNoun"), correctArticle: "der" as ArticleAnswer },
          ],
        },
      },
    });
  };

  const removeItem = (id: string) => {
    if (block.items.length <= 1) return;
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          items: block.items.filter((item) => item.id !== id),
        },
      },
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 border-b border-border pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <span className="w-6 shrink-0" />
        <div className="flex shrink-0 items-center gap-1.5">
          {articles.map((a) => (
            <span key={a} className="flex h-6 w-6 items-center justify-center">
              {a}
            </span>
          ))}
        </div>
        <span className="flex-1">{t("articleNoun")}</span>
        {block.showWritingLine ? <span className="min-w-[100px] flex-1">{t("articleWritingLine")}</span> : null}
        <span className="w-7 shrink-0" />
      </div>

      <div>
        {block.items.map((item, idx) => (
          <div key={item.id} className="group/row flex items-center gap-3 border-b border-border py-2 last:border-b-0">
            <ItemNumberBadge index={idx + 1} className="shrink-0" />
            <div className="flex shrink-0 items-center gap-1.5">
              {articles.map((a) => (
                <button
                  key={a}
                  className={`${articleOptionClass} ${
                    item.correctArticle === a
                      ? "border-emerald-300 bg-emerald-100 text-emerald-700"
                      : "border-border text-muted-foreground hover:border-emerald-300 hover:text-foreground"
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    updateItem(item.id, { correctArticle: a });
                  }}
                >
                  {item.correctArticle === a ? <Check className="h-3 w-3" /> : null}
                </button>
              ))}
            </div>
            <span
              className="min-w-0 flex-1 rounded-[4px] px-2 py-1 outline-none transition-colors hover:bg-muted/40 focus:bg-muted/60"
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => {
                const value = e.currentTarget.textContent || "";
                const arrIdx = block.items.findIndex((it) => it.id === item.id);
                localeUpdate(block.id, `items.${arrIdx}.text`, value, () =>
                  updateItem(item.id, { text: value })
                );
              }}
            >
              {item.text}
            </span>
            {block.showWritingLine ? (
              <div className="min-w-[100px] flex-1 px-2">
                <div className="h-6 border-b border-muted-foreground/30" />
              </div>
            ) : null}
            <button
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover/row:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                removeItem(item.id);
              }}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          onClick={(e) => {
            e.stopPropagation();
            addItem();
          }}
        >
          <Plus className="h-3 w-3" /> {t("addItem")}
        </button>
      </div>
    </div>
  );
}

// ─── Order Items ────────────────────────────────────────────
function OrderItemsRenderer({
  block,
  interactive,
}: {
  block: OrderItemsBlock;
  interactive: boolean;
}) {
  const { dispatch } = useEditor();
  const { localeUpdate } = useLocaleAwareEdit();
  const t = useTranslations("blockRenderer");

  const updateItem = (id: string, updates: Partial<{ text: string; correctPosition: number }>) => {
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          items: block.items.map((item) =>
            item.id === id ? { ...item, ...updates } : item
          ),
        },
      },
    });
  };

  const addItem = () => {
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          items: [
            ...block.items,
            {
              id: crypto.randomUUID(),
              text: `Item ${block.items.length + 1}`,
              correctPosition: block.items.length + 1,
            },
          ],
        },
      },
    });
  };

  const removeItem = (id: string) => {
    if (block.items.length <= 2) return;
    const filtered = block.items.filter((item) => item.id !== id);
    // Recompute correct positions
    const reindexed = filtered.map((item, i) => ({
      ...item,
      correctPosition: i + 1,
    }));
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: reindexed } },
    });
  };

  // In editor, show items in correct order
  const sortedItems = [...block.items].sort(
    (a, b) => a.correctPosition - b.correctPosition
  );

  return (
    <div className="space-y-2">
      <div
        className="font-medium outline-none"
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => {
          const value = e.currentTarget.textContent || "";
          localeUpdate(block.id, "instruction", value, () =>
            dispatch({ type: "UPDATE_BLOCK", payload: { id: block.id, updates: { instruction: value } } })
          );
        }}
      >
        {block.instruction}
      </div>
      <div>
        {sortedItems.map((item, i) => (
          <div
            key={item.id}
            className="group/item flex h-[37px] items-center gap-3 border-b"
          >
            <span className="h-5 w-5 min-w-5 shrink-0 rounded-[3px] bg-muted text-xs font-bold text-muted-foreground flex items-center justify-center leading-none">
              {String.fromCharCode(97 + i)}
            </span>
            <span
              contentEditable
              suppressContentEditableWarning
              className="text-base outline-none flex-1 border-b border-transparent focus:border-muted-foreground/30 transition-colors"
              onBlur={(e) => {
                const value = e.currentTarget.textContent || "";
                const arrIdx = block.items.findIndex((it) => it.id === item.id);
                localeUpdate(block.id, `items.${arrIdx}.text`, value, () =>
                  updateItem(item.id, { text: value })
                );
              }}
            >
              {item.text}
            </span>
            <button
              className={`opacity-0 group-hover/item:opacity-100 p-0.5 hover:bg-destructive/10 rounded transition-opacity shrink-0
                ${block.items.length <= 2 ? "invisible" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                removeItem(item.id);
              }}
            >
              <X className="h-3 w-3 text-destructive" />
            </button>
          </div>
        ))}
      </div>
      <button
        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
        onClick={(e) => {
          e.stopPropagation();
          addItem();
        }}
      >
        <Plus className="h-3 w-3" /> {t("addItem")}
      </button>
    </div>
  );
}

// ─── Inline Choices ─────────────────────────────────────────

/** Parse inline choice content into alternating text/choice segments. */
function parseInlineChoiceSegments(content: string) {
  const parts = content.split(/(\{\{(?:choice:)?[^}]+\}\})/g);
  const segments: Array<{ type: "text"; value: string } | { type: "choice"; options: string[]; correctIndex: number }> = [];
  parts.forEach((part) => {
    const match = part.match(/\{\{(?:choice:)?(.+)\}\}/);
    if (match) {
      const rawOptions = match[1].split("|");
      const starIdx = rawOptions.findIndex((o) => o.startsWith("*"));
      const options = rawOptions.map((option) => option.startsWith("*") ? option.slice(1) : option);
      segments.push({ type: "choice", options, correctIndex: starIdx >= 0 ? starIdx : 0 });
    } else {
      segments.push({ type: "text", value: part });
    }
  });
  return segments;
}

/** Reconstruct content string from segments. */
function serializeInlineChoiceSegments(segments: Array<{ type: "text"; value: string } | { type: "choice"; options: string[]; correctIndex: number }>): string {
  return segments.map((s) => {
    if (s.type === "choice") {
      const serializedOptions = s.options.map((option, index) =>
        index === s.correctIndex && s.correctIndex !== 0 ? `*${option}` : option,
      );
      return `{{${serializedOptions.join("|")}}}`;
    }
    return s.value;
  }).join("");
}

function renderInlineChoiceIndicator(isCorrect: boolean, isExample: boolean) {
  if (isCorrect) {
    const color = isExample ? '#0097dc' : '#15803d';
    return (
      <span
        className="relative inline-flex items-center justify-center shrink-0"
        style={{
          boxSizing: 'border-box',
          width: 16,
          height: 16,
          minWidth: 16,
          minHeight: 16,
          borderRadius: 3,
          color: 'var(--color-primary)',
          boxShadow: 'inset 0 0 0 1px currentColor',
          background: '#fff',
        }}
      >
        {isCorrect ? (
          <span
            className="absolute inset-0 flex items-center justify-center leading-none"
            style={{
              fontFamily: EXAMPLE_HANDWRITING_FONT,
              color,
              fontSize: '22px',
              top: -3,
            }}
          >
            X
          </span>
        ) : null}
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center justify-center shrink-0"
      style={{
        boxSizing: 'border-box',
        width: 16,
        height: 16,
        minWidth: 16,
        minHeight: 16,
        borderRadius: 3,
        color: 'var(--color-primary)',
        boxShadow: 'inset 0 0 0 1px currentColor',
        background: '#fff',
      }}
    />
  );
}

/** Render a read-only inline choice line (used as fallback / for interactive mode). */
function renderInlineChoiceLine(content: string, showExample = false): React.ReactNode[] {
  const segments = parseInlineChoiceSegments(content);
  let hasTextBefore = false;
  let exampleUsed = false;
  return segments.map((seg, i) => {
    if (seg.type === "choice") {
      const atStart = !hasTextBefore;
      const renderAsExample = showExample && !exampleUsed;
      if (renderAsExample) {
        exampleUsed = true;
        return (
          <span key={i} style={{ marginLeft: 2, marginRight: 2 }}>
            {seg.options.map((opt, oi) => {
              const isCorrect = oi === seg.correctIndex;
              const label = atStart ? opt.charAt(0).toUpperCase() + opt.slice(1) : opt;
              return (
                <span key={oi} style={{ marginRight: oi < seg.options.length - 1 ? 6 : 0 }}>
                  <span style={{ display: 'inline-block', verticalAlign: '-3px' }}>
                    {renderInlineChoiceIndicator(isCorrect, true)}
                  </span>
                  <span className="font-semibold" style={{ marginLeft: 3, ...(isCorrect ? { color: '#0097dc' } : {}) }}>{label}</span>
                </span>
              );
            })}
          </span>
        );
      }
      return (
        <span key={i} className="inline-flex items-center gap-1 mx-0.5">
          {seg.options.map((opt, oi) => {
            const isCorrect = oi === seg.correctIndex;
            const label = atStart ? opt.charAt(0).toUpperCase() + opt.slice(1) : opt;
            return (
              <span key={oi} className="inline-flex items-center">
                {oi > 0 && <span className="mx-0.5 text-muted-foreground">/</span>}
                <span
                  className="inline-flex items-center gap-0.5 font-semibold"
                  style={isCorrect && !showExample ? { color: "#15803d" } : undefined}
                >
                  {renderInlineChoiceIndicator(isCorrect, showExample)}
                  <span>{label}</span>
                </span>
              </span>
            );
          })}
        </span>
      );
    }
    if (seg.value.trim().length > 0) hasTextBefore = true;
    return <span key={i}>{renderTextWithSup(seg.value)}</span>;
  });
}

/** Editable inline choice line — text segments are contentEditable, choice chips are read-only. */
function EditableInlineChoiceLine({
  content,
  onChange,
  showExample = false,
}: {
  content: string;
  onChange: (newContent: string) => void;
  showExample?: boolean;
}) {
  const segments = React.useMemo(() => parseInlineChoiceSegments(content), [content]);
  const segmentsRef = React.useRef(segments);
  segmentsRef.current = segments;

  // Track whether any visible text appeared before each segment
  let hasTextBefore = false;
  const textBefore: boolean[] = [];
  let exampleUsed = false;
  segments.forEach((seg) => {
    textBefore.push(hasTextBefore);
    if (seg.type === "text" && seg.value.trim().length > 0) hasTextBefore = true;
  });

  const handleTextBlur = React.useCallback(
    (textIndex: number, e: React.FocusEvent<HTMLSpanElement>) => {
      const newText = e.currentTarget.textContent || "";
      const segs = segmentsRef.current;
      let ti = 0;
      const updated = segs.map((seg) => {
        if (seg.type === "text") {
          if (ti === textIndex) {
            ti++;
            return { ...seg, value: newText };
          }
          ti++;
        }
        return seg;
      });
      const newContent = serializeInlineChoiceSegments(updated);
      if (newContent !== content) {
        onChange(newContent);
      }
    },
    [content, onChange],
  );

  let textIdx = 0;
  return (
    <>
      {segments.map((seg, i) => {
        if (seg.type === "choice") {
          const atStart = !textBefore[i];
          const renderAsExample = showExample && !exampleUsed;
          if (renderAsExample) {
            exampleUsed = true;
            return (
              <span key={i} style={{ marginLeft: 2, marginRight: 2 }}>
                {seg.options.map((opt, oi) => {
                  const isCorrect = oi === seg.correctIndex;
                  const label = atStart ? opt.charAt(0).toUpperCase() + opt.slice(1) : opt;
                  return (
                    <span key={oi} style={{ marginRight: oi < seg.options.length - 1 ? 6 : 0 }}>
                      <span style={{ display: 'inline-block', verticalAlign: '-3px' }}>
                        {renderInlineChoiceIndicator(isCorrect, true)}
                      </span>
                      <span className="font-semibold" style={{ marginLeft: 3 }}>{label}</span>
                    </span>
                  );
                })}
              </span>
            );
          }
          return (
            <span
              key={i}
              className="inline-flex items-center gap-1 mx-0.5 cursor-default"
              contentEditable={false}
            >
              {seg.options.map((opt, oi) => {
                const isCorrect = oi === seg.correctIndex;
                const label = atStart ? opt.charAt(0).toUpperCase() + opt.slice(1) : opt;
                return (
                  <span key={oi} className="inline-flex items-center">
                    {oi > 0 && <span className="mx-0.5 text-muted-foreground">/</span>}
                    <span
                      className={`inline-flex items-center gap-0.5 font-semibold ${
                        isCorrect && !showExample
                          ? "font-semibold text-green-700"
                          : ""
                      }`}
                    >
                      {renderInlineChoiceIndicator(isCorrect, showExample)}
                      <span>{label}</span>
                    </span>
                  </span>
                );
              })}
            </span>
          );
        }
        const currentTextIdx = textIdx;
        textIdx++;
        return (
          <span
            key={i}
            contentEditable
            suppressContentEditableWarning
            className="outline-none border-b border-transparent focus:border-muted-foreground/30 transition-colors"
            onBlur={(e) => handleTextBlur(currentTextIdx, e)}
          >
            {renderTextWithSup(seg.value)}
          </span>
        );
      })}
    </>
  );
}

function InlineChoicesRenderer({
  block,
  interactive,
}: {
  block: InlineChoicesBlock;
  interactive: boolean;
}) {
  const { state, dispatch } = useEditor();
  const items = migrateInlineChoicesBlock(block);
  const activeIdx = state.activeItemIndex;

  // For mutations, always use the raw (DE) block from the store so we never
  // persist CH-converted text (ß→ss) back into the canonical data.
  const rawBlock = state.blocks.find((b) => b.id === block.id) as InlineChoicesBlock | undefined;
  const rawItems = rawBlock ? migrateInlineChoicesBlock(rawBlock) : items;
  const exampleItemId = block.showFirstAsExample ? items.find((item) => !item.isSpacer)?.id : undefined;

  const updateItemContent = React.useCallback(
    (index: number, newContent: string) => {
      const newItems = [...rawItems];
      newItems[index] = { ...newItems[index], content: newContent };
      dispatch({
        type: "UPDATE_BLOCK",
        payload: { id: block.id, updates: { items: newItems } },
      });
    },
    [rawItems, dispatch, block.id],
  );

  const handleRowClick = React.useCallback(
    (index: number) => {
      if (!interactive) {
        dispatch({ type: "SET_ACTIVE_ITEM", payload: index });
      }
    },
    [dispatch, interactive],
  );

  const moveItem = React.useCallback(
    (index: number, direction: -1 | 1) => {
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= rawItems.length) return;
      const newItems = [...rawItems];
      [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
      dispatch({
        type: "UPDATE_BLOCK",
        payload: { id: block.id, updates: { items: newItems } },
      });
      // Keep the moved item active
      if (activeIdx === index) {
        dispatch({ type: "SET_ACTIVE_ITEM", payload: newIndex });
      }
    },
    [rawItems, dispatch, block.id, activeIdx],
  );

  return (
    <div>
      {items.map((item, idx) => (
        item.isSpacer ? (
          <div
            key={item.id || idx}
            className="flex items-center border-b last:border-b-0"
            style={{ gap: 12, paddingTop: 8, paddingBottom: 8 }}
          >
            <span className="flex-1">&nbsp;</span>
          </div>
        ) : (
          <div
            key={item.id || idx}
            className={`flex items-center gap-3 border-b last:border-b-0 py-2 cursor-pointer rounded-sm transition-colors ${
              !interactive && activeIdx === idx
                ? "bg-blue-50 ring-1 ring-blue-200"
                : "hover:bg-muted/30"
            }`}
            onClick={() => handleRowClick(idx)}
          >
            <ItemNumberBadge index={items.slice(0, idx + 1).filter((entry) => !entry.isSpacer).length} />
            <span className="flex-1">
              {interactive ? (
                renderInlineChoiceLine(item.content, item.id === exampleItemId)
              ) : (
                <EditableInlineChoiceLine
                  content={item.content}
                  onChange={(c) => updateItemContent(idx, c)}
                  showExample={item.id === exampleItemId}
                />
              )}
            </span>
            {!interactive && (
              <div className="flex flex-col shrink-0" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="h-3.5 w-5 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30"
                  onClick={() => moveItem(idx, -1)}
                  disabled={idx === 0}
                >
                  <ChevronUp className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  className="h-3.5 w-5 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30"
                  onClick={() => moveItem(idx, 1)}
                  disabled={idx === items.length - 1}
                >
                  <ChevronDown className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        )
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

function WordSearchRenderer({ block }: { block: WordSearchBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("blockRenderer");

  const cols = block.gridCols ?? block.gridSize ?? 24;
  const rows = block.gridRows ?? block.gridSize ?? 12;
  const rowHeight = block.rowHeight ?? 1.9;

  // Generate grid if empty
  React.useEffect(() => {
    if (block.grid.length === 0 && block.words.length > 0) {
      const newGrid = generateWordSearchGrid(block.words, cols, rows, block.allowedDirections);
      dispatch({
        type: "UPDATE_BLOCK",
        payload: { id: block.id, updates: { grid: newGrid } },
      });
    }
  }, [block.allowedDirections, block.grid.length, block.words, cols, dispatch, rows]);

  const regenerateGrid = () => {
    const newGrid = generateWordSearchGrid(block.words, cols, rows, block.allowedDirections);
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { grid: newGrid } },
    });
  };

  return (
    <div className="space-y-3">
      {/* Grid */}
      {block.grid.length > 0 && (
        <div className="w-full">
          <table className="w-full table-fixed border-separate border-spacing-0">
            <tbody>
              {block.grid.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => {
                    const isSpaceCell = cell === " ";
                    let cornerClass = "";
                    if (ri === 0 && ci === 0) cornerClass = "rounded-tl-sm";
                    if (ri === 0 && ci === row.length - 1) cornerClass = "rounded-tr-lg";
                    if (ri === block.grid.length - 1 && ci === 0) cornerClass = "rounded-bl-lg";
                    if (ri === block.grid.length - 1 && ci === row.length - 1) cornerClass = "rounded-br-lg";
                    return (
                      <td
                        key={ci}
                        className={`p-0 text-center font-mono font-semibold select-none border border-border ${cornerClass}`}
                        style={{
                          height: `${rowHeight}rem`,
                          backgroundColor: isSpaceCell ? "transparent" : undefined,
                        }}
                      >
                        <div className="flex h-full items-center justify-center leading-none">
                          {!isSpaceCell && cell}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Word list */}
      {block.showWordList && (
        <div className="flex flex-wrap gap-2">
          {block.words.map((word, i) => (
            <span
              key={i}
              className="px-2 py-0.5 bg-muted rounded text-xs font-medium uppercase tracking-wide"
              style={block.showFirstAsExample && i === 0 ? { color: "#0097dc" } : undefined}
            >
              {block.showFirstAsExample && i === 0 ? <RoughExampleStrike>{word}</RoughExampleStrike> : word}
            </span>
          ))}
        </div>
      )}

      {/* Regenerate button */}
      <button
        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
        onClick={(e) => {
          e.stopPropagation();
          regenerateGrid();
        }}
      >
        <ArrowUpDown className="h-3 w-3" /> {t("regenerateGrid")}
      </button>
    </div>
  );
}

function CrosswordRenderer({ block, mode }: { block: CrosswordBlock; mode: ViewMode }) {
  const { state, dispatch } = useEditor();
  const t = useTranslations("blockRenderer");
  const isPrint = mode === "print";

  React.useEffect(() => {
    if (block.items.length === 0) return;
    if (block.grid.length > 0 || block.placements.length > 0 || block.generationError) return;

    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: generateCrosswordLayout(block.items) },
    });
  }, [block.generationError, block.grid.length, block.id, block.items, block.placements.length, dispatch]);

  const regenerate = () => {
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: generateCrosswordLayout(block.items, Date.now() ^ Math.floor(Math.random() * 0xffffffff)),
      },
    });
  };

  const placedIds = new Set(block.placements.map((p) => p.itemId));
  const unplacedItems = block.items.filter((it) => it.answer.trim().length > 0 && !placedIds.has(it.id));

  return (
    <div className="space-y-3">
      {block.instruction ? <p className="text-base text-muted-foreground">{block.instruction}</p> : null}
      {block.generationError ? (
        <div className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {block.generationError === "word-too-long"
            ? t("crosswordWordTooLong")
            : block.generationError === "no-layout"
              ? t("crosswordNoLayout")
              : t("generationFailed")}
        </div>
      ) : null}
      {!block.generationError && block.placements.length > 0 && unplacedItems.length > 0 ? (
        <div className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {t("crosswordUnplaced", { answers: unplacedItems.map((it) => it.answer).join(", ") })}
        </div>
      ) : null}
      {block.grid.length > 0 ? (
        <div className="mt-5">
          <CrosswordLayout
            grid={block.grid}
            placements={block.placements}
            showSolutions
            cellSize="30px"
            fixedCellSize
            clueNumberFormat={state.brandProfile.itemNumberFormat || "default"}
            renderClueNumber={(clueNumber) => <ItemNumberBadge index={clueNumber} />}
            clueTextClassName="text-muted-foreground"
            twoColumnClues={!!block.twoColumnClues}
          />
        </div>
      ) : null}
      <button
        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
        onClick={(event) => {
          event.stopPropagation();
          regenerate();
        }}
      >
        <ArrowUpDown className="h-3 w-3" /> {t("regenerateGrid")}
      </button>
    </div>
  );
}

// ─── Sorting Categories ─────────────────────────────────────
function SortingCategoriesRenderer({ block }: { block: SortingCategoriesBlock }) {
  const { dispatch } = useEditor();
  const { localeUpdate } = useLocaleAwareEdit();
  const t = useTranslations("blockRenderer");
  const colorCodeEnabled = !!block.colorCode;
  const useTwoColumnCategoryLines = block.categories.length === 2 && !!block.twoColumnCategoryLines;
  const exampleItem = block.showFirstAsExample ? block.items[0] : undefined;
  const exampleItemId = exampleItem?.id;
  const exampleCategoryId = exampleItem
    ? block.categories.find((cat) => cat.correctItems.includes(exampleItem.id))?.id
    : undefined;

  const categoryPalette = [
    { headerBg: "#F9F1EA", headerText: "#334155", headerBorder: "#F9F1EA", itemBg: "#FCF8F5", itemText: "#334155", itemBorder: "#F9F1EA" },
    { headerBg: "#EDF8EE", headerText: "#334155", headerBorder: "#EDF8EE", itemBg: "#F6FCF7", itemText: "#334155", itemBorder: "#EDF8EE" },
    { headerBg: "#ECF3F9", headerText: "#334155", headerBorder: "#ECF3F9", itemBg: "#F6F9FC", itemText: "#334155", itemBorder: "#ECF3F9" },
    { headerBg: "#F9EEF0", headerText: "#334155", headerBorder: "#F9EEF0", itemBg: "#FCF7F8", itemText: "#334155", itemBorder: "#F9EEF0" },
    { headerBg: "#EFEBF6", headerText: "#334155", headerBorder: "#EFEBF6", itemBg: "#F7F5FB", itemText: "#334155", itemBorder: "#EFEBF6" },
    { headerBg: "#F9F6ED", headerText: "#334155", headerBorder: "#F9F6ED", itemBg: "#FCFBF6", itemText: "#334155", itemBorder: "#F9F6ED" },
    { headerBg: "#F5EDF7", headerText: "#334155", headerBorder: "#F5EDF7", itemBg: "#FAF6FB", itemText: "#334155", itemBorder: "#F5EDF7" },
    { headerBg: "#F2F2F6", headerText: "#334155", headerBorder: "#F2F2F6", itemBg: "#F9F9FB", itemText: "#334155", itemBorder: "#F2F2F6" },
  ] as const;

  const getCategoryTheme = (catId: string) => {
    const catIndex = block.categories.findIndex((cat) => cat.id === catId);
    const index = catIndex >= 0 ? catIndex : 0;
    return categoryPalette[index % categoryPalette.length];
  };

  const splitItemsLeftFirst = <T,>(items: T[]): [T[], T[]] => {
    const leftCount = Math.ceil(items.length / 2);
    return [items.slice(0, leftCount), items.slice(leftCount)];
  };

  const updateItem = (id: string, text: string) => {
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          items: block.items.map((item) =>
            item.id === id ? { ...item, text } : item
          ),
        },
      },
    });
  };

  const addItem = () => {
    const newId = crypto.randomUUID();
    const firstCat = block.categories[0];
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          items: [...block.items, { id: newId, text: `Item ${block.items.length + 1}` }],
          categories: block.categories.map((cat) =>
            cat.id === firstCat.id
              ? { ...cat, correctItems: [...cat.correctItems, newId] }
              : cat
          ),
        },
      },
    });
  };

  const removeItem = (itemId: string) => {
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          items: block.items.filter((item) => item.id !== itemId),
          categories: block.categories.map((cat) => ({
            ...cat,
            correctItems: cat.correctItems.filter((id) => id !== itemId),
          })),
        },
      },
    });
  };

  return (
    <div className="space-y-3">
      <div
        className="font-medium outline-none"
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => {
          const value = e.currentTarget.textContent || "";
          localeUpdate(block.id, "instruction", value, () =>
            dispatch({ type: "UPDATE_BLOCK", payload: { id: block.id, updates: { instruction: value } } })
          );
        }}
      >
        {block.instruction}
      </div>
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${block.categories.length}, 1fr)` }}>
        {block.categories.map((cat) => {
          const catTheme = getCategoryTheme(cat.id);
          const catItems = block.items.filter((item) =>
            cat.correctItems.includes(item.id)
          );
          return (
            <div key={cat.id} className="rounded-sm border border-border overflow-hidden">
              <div
                className="bg-muted flex items-center pl-2.5 pr-2 py-0.5 border-t border-transparent"
                style={colorCodeEnabled
                  ? {
                      backgroundColor: catTheme.headerBg,
                      borderTopColor: catTheme.headerBg,
                      borderBottom: `1px solid ${catTheme.headerBorder}`,
                    }
                  : { backgroundColor: "#f8fafc", borderTopColor: "#f8fafc", borderBottom: "1px solid #f8fafc" }}
              >
                <span
                  className="font-semibold outline-none block"
                  style={colorCodeEnabled ? { color: catTheme.headerText } : undefined}
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => {
                    const value = e.currentTarget.textContent || "";
                    const catIdx = block.categories.findIndex((c) => c.id === cat.id);
                    localeUpdate(block.id, `categories.${catIdx}.label`, value, () =>
                      dispatch({
                        type: "UPDATE_BLOCK",
                        payload: {
                          id: block.id,
                          updates: {
                            categories: block.categories.map((c) =>
                              c.id === cat.id ? { ...c, label: value } : c
                            ),
                          },
                        },
                      })
                    );
                  }}
                >
                  {cat.label}
                </span>
              </div>
              <div className="min-h-[60px]">
                {(() => {
                  const renderedItems = catItems.map((item) => {
                    const isExampleItem = item.id === exampleItemId && cat.id === exampleCategoryId;
                    return (
                      <div
                        key={item.id}
                        className="group/item px-2"
                      >
                        <div className="flex min-h-[37px] items-center gap-3">
                          <div className="relative flex-1 h-8 overflow-hidden border-b border-dashed border-muted-foreground/30">
                            <span
                              contentEditable
                              suppressContentEditableWarning
                              className="absolute inset-x-0 outline-none block leading-none"
                              style={colorCodeEnabled
                                ? {
                                    bottom: isExampleItem ? "6px" : "4px",
                                    color: isExampleItem ? "#0097dc" : catTheme.itemText,
                                    fontFamily: isExampleItem ? EXAMPLE_HANDWRITING_FONT : undefined,
                                    fontSize: isExampleItem ? "18px" : undefined,
                                  }
                                : {
                                    bottom: isExampleItem ? "6px" : "4px",
                                    color: isExampleItem ? "#0097dc" : undefined,
                                    fontFamily: isExampleItem ? EXAMPLE_HANDWRITING_FONT : undefined,
                                    fontSize: isExampleItem ? "18px" : undefined,
                                  }}
                              onBlur={(e) => {
                                const value = e.currentTarget.textContent || "";
                                const arrIdx = block.items.findIndex((w) => w.id === item.id);
                                localeUpdate(block.id, `items.${arrIdx}.text`, value, () =>
                                  updateItem(item.id, value)
                                );
                              }}
                            >
                              {item.text}
                            </span>
                          </div>
                          <button
                            className="opacity-0 group-hover/item:opacity-100 p-0.5 hover:bg-destructive/10 rounded transition-opacity shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeItem(item.id);
                            }}
                          >
                            <X className="h-3 w-3 text-destructive" />
                          </button>
                        </div>
                      </div>
                    );
                  });

                  if (!useTwoColumnCategoryLines) {
                    return renderedItems;
                  }

                  const [leftItems, rightItems] = splitItemsLeftFirst(renderedItems);
                  return (
                    <div className="grid grid-cols-2 gap-x-3">
                      <div>{leftItems}</div>
                      <div>{rightItems}</div>
                    </div>
                  );
                })()}
              </div>
            </div>
          );
        })}
      </div>
      <button
        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
        onClick={(e) => {
          e.stopPropagation();
          addItem();
        }}
      >
        <Plus className="h-3 w-3" /> {t("addItem")}
      </button>
    </div>
  );
}

// ─── Unscramble Words ───────────────────────────────────────
function scrambleWord(word: string, keepFirst: boolean, lowercase: boolean): string {
  let letters = word.replace(/\s+/g, "").split("");
  let firstLetter = "";
  if (keepFirst && letters.length > 1) {
    firstLetter = letters[0];
    letters = letters.slice(1);
  }
  // Simple Fisher-Yates shuffle
  for (let i = letters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }
  let result = keepFirst ? firstLetter + letters.join("") : letters.join("");
  if (lowercase) result = result.toLowerCase();
  return result;
}

function UnscrambleWordsRenderer({ block }: { block: UnscrambleWordsBlock }) {
  const { dispatch } = useEditor();
  const { localeUpdate } = useLocaleAwareEdit();
  const t = useTranslations("blockRenderer");

  const updateWord = (id: string, word: string) => {
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          words: block.words.map((w) =>
            w.id === id ? { ...w, word } : w
          ),
        },
      },
    });
  };

  const addWord = () => {
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          words: [
            ...block.words,
            { id: crypto.randomUUID(), word: "word" },
          ],
        },
      },
    });
  };

  const removeWord = (id: string) => {
    if (block.words.length <= 1) return;
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          words: block.words.filter((w) => w.id !== id),
        },
      },
    });
  };

  return (
    <div className="space-y-3">
      <div
        className="font-medium outline-none"
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => {
          const value = e.currentTarget.textContent || "";
          localeUpdate(block.id, "instruction", value, () =>
            dispatch({ type: "UPDATE_BLOCK", payload: { id: block.id, updates: { instruction: value } } })
          );
        }}
      >
        {block.instruction}
      </div>

      <div>
        {(() => {
          const orderedWords = block.itemOrder
            ? block.itemOrder
                .map((id) => block.words.find((w) => w.id === id))
                .filter((w): w is NonNullable<typeof w> => !!w)
                .concat(block.words.filter((w) => !block.itemOrder!.includes(w.id)))
            : block.words;
          return orderedWords.map((item, i) => {
          const scrambled = scrambleWord(item.word, block.keepFirstLetter, block.lowercaseAll);
          return (
            <div
              key={item.id}
              className="group/item flex h-[37px] items-center gap-3 border-b"
            >
              <ItemNumberBadge index={i + 1} className="h-5 w-5 min-w-5 rounded-[3px] leading-none" />
              <span className="text-base tracking-widest text-muted-foreground">
                {scrambled}
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              <span
                contentEditable
                suppressContentEditableWarning
                className="text-base outline-none border-b border-transparent focus:border-muted-foreground/30 transition-colors font-medium text-green-700"
                onBlur={(e) => {
                  const value = e.currentTarget.textContent || "";
                  const arrIdx = block.words.findIndex((w) => w.id === item.id);
                  localeUpdate(block.id, `words.${arrIdx}.word`, value, () =>
                    updateWord(item.id, value)
                  );
                }}
              >
                {item.word}
              </span>
              <button
                className={`opacity-0 group-hover/item:opacity-100 p-0.5 hover:bg-destructive/10 rounded transition-opacity shrink-0
                  ${block.words.length <= 1 ? "invisible" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  removeWord(item.id);
                }}
              >
                <X className="h-3 w-3 text-destructive" />
              </button>
            </div>
          );
        });
        })()}
      </div>
      <button
        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
        onClick={(e) => {
          e.stopPropagation();
          addWord();
        }}
      >
        <Plus className="h-3 w-3" /> {t("addWord")}
      </button>
    </div>
  );
}

function CorrectSpellingRenderer({ block }: { block: CorrectSpellingBlock | CorrectNumbersBlock | MissingLettersBlock }) {
  const { dispatch } = useEditor();
  const { localeUpdate } = useLocaleAwareEdit();
  const t = useTranslations("blockRenderer");
  const legacyDisplayCount = block.displayCount ?? 10;
  const buildRow = block.type === "missing-letters"
    ? buildMissingLettersRow
    : block.type === "correct-numbers"
      ? buildCorrectNumbersRow
      : buildCorrectSpellingRow;
  const legacyKeepLeftCharacters = "keepFirstLetter" in block && block.keepFirstLetter ? 1 : 0;
  const legacyKeepRightCharacters = "keepLastLetter" in block && block.keepLastLetter ? 1 : 0;
  const keepLeftCharacters = block.keepLeftCharacters ?? legacyKeepLeftCharacters;
  const keepRightCharacters = block.keepRightCharacters ?? legacyKeepRightCharacters;
  const exampleWordId = block.showFirstAsExample ? block.words[0]?.id : undefined;
  const useEqualItemWidth = block.type === "correct-numbers" && !!block.equalItemWidth;

  const orderedWords = React.useMemo(() => {
    const exampleWord = exampleWordId ? block.words.find((word) => word.id === exampleWordId) : undefined;
    const remainingWords = block.words.filter((word) => word.id !== exampleWordId);
    const orderedRemainingWords = block.itemOrder
      ? block.itemOrder
          .map((id) => remainingWords.find((word) => word.id === id))
          .filter((word): word is NonNullable<typeof word> => !!word)
          .concat(remainingWords.filter((word) => !block.itemOrder!.includes(word.id)))
      : remainingWords;

    return exampleWord ? [exampleWord, ...orderedRemainingWords] : orderedRemainingWords;
  }, [block.itemOrder, block.words, exampleWordId]);

  const equalItemWidthCh = React.useMemo(() => {
    if (!useEqualItemWidth) return 0;

    let maxChars = 0;
    for (const item of orderedWords) {
      const displayCount = item.displayCount ?? legacyDisplayCount;
      const variants = buildRow(
        item.word,
        keepLeftCharacters,
        keepRightCharacters,
        `${block.id}:${item.id}`,
        displayCount,
      );
      for (const variant of variants) {
        maxChars = Math.max(maxChars, variant.text.length + 1);
      }
    }

    return Math.max(6, maxChars);
  }, [
    block.id,
    block.type,
    useEqualItemWidth,
    orderedWords,
    legacyDisplayCount,
    keepLeftCharacters,
    keepRightCharacters,
    buildRow,
  ]);

  const updateWord = (id: string, word: string) => {
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          words: block.words.map((item) =>
            item.id === id ? { ...item, word } : item
          ),
        },
      },
    });
  };

  const addWord = () => {
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          words: [
            ...block.words,
            { id: crypto.randomUUID(), word: "word", displayCount: legacyDisplayCount },
          ],
        },
      },
    });
  };

  const removeWord = (id: string) => {
    if (block.words.length <= 1) return;
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          words: block.words.filter((item) => item.id !== id),
        },
      },
    });
  };

  return (
    <div className="space-y-3">
      <div
        className="font-medium outline-none"
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => {
          const value = e.currentTarget.textContent || "";
          localeUpdate(block.id, "instruction", value, () =>
            dispatch({ type: "UPDATE_BLOCK", payload: { id: block.id, updates: { instruction: value } } })
          );
        }}
      >
        {block.instruction}
      </div>

      <div>
        {orderedWords.map((item, i) => {
          const displayCount = item.displayCount ?? legacyDisplayCount;
          const isExampleRow = item.id === exampleWordId;
          const useEqualItemWidth = equalItemWidthCh > 0;
          const variants = buildRow(
            item.word,
            keepLeftCharacters,
            keepRightCharacters,
            `${block.id}:${item.id}`,
            displayCount,
          );
          let exampleGapShown = false;
          let exampleChipShown = false;

          return (
            <div key={item.id} className="group/item flex min-h-[49px] items-center gap-3 border-b">
              <ItemNumberBadge index={i + 1} className="h-5 w-5 min-w-5 rounded-[3px] leading-none" />
              <div className="flex flex-1 flex-wrap items-center gap-2 py-1">
                {variants.map((variant, variantIndex) =>
                  (() => {
                    const isCorrectChoiceBlock = block.type === "correct-spelling" || block.type === "correct-numbers";
                    const showExampleChip =
                      isCorrectChoiceBlock &&
                      isExampleRow &&
                      !exampleChipShown &&
                      variant.isOriginal &&
                      variantIndex !== 0;
                    const showExampleGap =
                      block.type === "missing-letters" &&
                      isExampleRow &&
                      !exampleGapShown &&
                      variant.text.includes("{{blank");

                    if (showExampleChip) {
                      exampleChipShown = true;
                    }

                    if (showExampleGap) {
                      exampleGapShown = true;
                    }

                    const showSolutionCircle =
                      isCorrectChoiceBlock &&
                      variant.isOriginal &&
                      variantIndex !== 0 &&
                      !showExampleChip;
                    const shouldHighlightVariant = isCorrectChoiceBlock ? variantIndex === 0 : variantIndex === 0 || variant.isOriginal;
                    const highlightClass = "border-green-300 bg-green-50 text-green-700";

                    return (
                      <span
                        key={`${item.id}-${variantIndex}`}
                        className={`rounded border px-2 py-0.5 text-xs ${shouldHighlightVariant ? highlightClass : "border-border text-muted-foreground"} ${useEqualItemWidth ? "inline-flex justify-center" : ""}`}
                        style={useEqualItemWidth ? { width: `${equalItemWidthCh}ch` } : undefined}
                      >
                        {block.type === "missing-letters"
                          ? renderMissingLetterText(variant.text, showExampleGap)
                          : showExampleChip
                            ? <RoughExampleCircle>{variant.text}</RoughExampleCircle>
                            : showSolutionCircle
                              ? <RoughExampleCircle stroke="#15803d">{variant.text}</RoughExampleCircle>
                              : variant.text}
                      </span>
                    );
                  })()
                )}
              </div>
              <span
                contentEditable
                suppressContentEditableWarning
                className="text-base outline-none border-b border-transparent focus:border-muted-foreground/30 transition-colors font-medium text-green-700 shrink-0"
                onBlur={(e) => {
                  const value = e.currentTarget.textContent || "";
                  const arrIdx = block.words.findIndex((w) => w.id === item.id);
                  localeUpdate(block.id, `words.${arrIdx}.word`, value, () =>
                    updateWord(item.id, value)
                  );
                }}
              >
                {item.word}
              </span>
              <button
                className={`opacity-0 group-hover/item:opacity-100 p-0.5 hover:bg-destructive/10 rounded transition-opacity shrink-0
                  ${block.words.length <= 1 ? "invisible" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  removeWord(item.id);
                }}
              >
                <X className="h-3 w-3 text-destructive" />
              </button>
            </div>
          );
        })}
      </div>
      <button
        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
        onClick={(e) => {
          e.stopPropagation();
          addWord();
        }}
      >
        <Plus className="h-3 w-3" /> {t("addWord")}
      </button>
    </div>
  );
}

// ─── Fix Sentences ──────────────────────────────────────────
function FixSentencesRenderer({ block }: { block: FixSentencesBlock }) {
  const { dispatch } = useEditor();
  const { localeUpdate } = useLocaleAwareEdit();
  const t = useTranslations("blockRenderer");
  const exampleSentenceId = block.showFirstAsExample ? block.sentences[0]?.id : undefined;

  const updateSentence = (id: string, sentence: string) => {
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          sentences: block.sentences.map((s) =>
            s.id === id ? { ...s, sentence } : s
          ),
        },
      },
    });
  };

  const addSentence = () => {
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          sentences: [
            ...block.sentences,
            { id: crypto.randomUUID(), sentence: "Part A | Part B | Part C" },
          ],
        },
      },
    });
  };

  const removeSentence = (id: string) => {
    if (block.sentences.length <= 1) return;
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          sentences: block.sentences.filter((s) => s.id !== id),
        },
      },
    });
  };

  return (
    <div className="space-y-3">
      <div
        className="font-medium outline-none"
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => {
          const value = e.currentTarget.textContent || "";
          localeUpdate(block.id, "instruction", value, () =>
            dispatch({ type: "UPDATE_BLOCK", payload: { id: block.id, updates: { instruction: value } } })
          );
        }}
      >
        {block.instruction}
      </div>

      <div>
        {block.sentences.map((item, i) => (
          <div key={item.id} className="group/item border-b">
            <div className="flex min-h-[37px] items-center gap-3 py-2">
              <ItemNumberBadge index={i + 1} />
              <span
                className="outline-none block flex-1"
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => {
                  const value = e.currentTarget.textContent || "";
                  localeUpdate(block.id, `sentences.${i}.sentence`, value, () =>
                    updateSentence(item.id, value)
                  );
                }}
              >
                {item.sentence}
              </span>
              <button
                className={`opacity-0 group-hover/item:opacity-100 p-0.5 hover:bg-destructive/10 rounded transition-opacity shrink-0
                  ${block.sentences.length <= 1 ? "invisible" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  removeSentence(item.id);
                }}
              >
                <X className="h-3 w-3 text-destructive" />
              </button>
            </div>
            <div className="mt-1 relative min-h-[14px] border-b border-dashed border-muted-foreground/30">
              {item.id === exampleSentenceId ? (
                <span
                  className="absolute inset-x-0 block leading-none"
                  style={{ bottom: "6px", fontFamily: EXAMPLE_HANDWRITING_FONT, color: "#0097dc", fontSize: "18px" }}
                >
                  {item.sentence.split(" | ").map((part) => part.trim()).join(" ")}
                </span>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      <button
        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
        onClick={(e) => {
          e.stopPropagation();
          addSentence();
        }}
      >
        <Plus className="h-3 w-3" /> {t("addSentence")}
      </button>
    </div>
  );
}

// ─── Complete Sentences ─────────────────────────────────────
function CompleteSentencesRenderer({ block }: { block: CompleteSentencesBlock }) {
  const { dispatch } = useEditor();
  const { localeUpdate } = useLocaleAwareEdit();
  const t = useTranslations("blockRenderer");

  const updateSentence = (id: string, beginning: string) => {
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          sentences: block.sentences.map((s) =>
            s.id === id ? { ...s, beginning } : s
          ),
        },
      },
    });
  };

  const addSentence = () => {
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          sentences: [
            ...block.sentences,
            { id: crypto.randomUUID(), beginning: t("newSentenceBeginning") },
          ],
        },
      },
    });
  };

  const removeSentence = (id: string) => {
    if (block.sentences.length <= 1) return;
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          sentences: block.sentences.filter((s) => s.id !== id),
        },
      },
    });
  };

  return (
    <div className="space-y-3">
      <div
        className="font-medium outline-none"
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => {
          const value = e.currentTarget.textContent || "";
          localeUpdate(block.id, "instruction", value, () =>
            dispatch({ type: "UPDATE_BLOCK", payload: { id: block.id, updates: { instruction: value } } })
          );
        }}
      >
        {block.instruction}
      </div>

      <div>
        {block.sentences.map((item, i) => (
          <div
            key={item.id}
            className="group/item flex items-center gap-3 py-2 border-b last:border-b-0"
          >
            <ItemNumberBadge index={i + 1} />
            <span
              className="outline-none block flex-1"
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => {
                const value = e.currentTarget.textContent || "";
                localeUpdate(block.id, `sentences.${i}.beginning`, value, () =>
                  updateSentence(item.id, value)
                );
              }}
            >
              {item.beginning}
            </span>
            <button
              className={`opacity-0 group-hover/item:opacity-100 p-0.5 hover:bg-destructive/10 rounded transition-opacity shrink-0
                ${block.sentences.length <= 1 ? "invisible" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                removeSentence(item.id);
              }}
            >
              <X className="h-3 w-3 text-destructive" />
            </button>
          </div>
        ))}
      </div>
      <button
        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
        onClick={(e) => {
          e.stopPropagation();
          addSentence();
        }}
      >
        <Plus className="h-3 w-3" /> {t("addSentence")}
      </button>
    </div>
  );
}

// ─── Start Sentences ────────────────────────────────────────
function StartSentencesRenderer({ block }: { block: StartSentencesBlock }) {
  const { dispatch } = useEditor();
  const { localeUpdate } = useLocaleAwareEdit();
  const t = useTranslations("blockRenderer");

  const updateSentence = (id: string, beginning: string) => {
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          sentences: block.sentences.map((s) =>
            s.id === id ? { ...s, beginning } : s
          ),
        },
      },
    });
  };

  const addSentence = () => {
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          sentences: [
            ...block.sentences,
            { id: crypto.randomUUID(), beginning: t("newSentenceBeginning") },
          ],
        },
      },
    });
  };

  const removeSentence = (id: string) => {
    if (block.sentences.length <= 1) return;
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          sentences: block.sentences.filter((s) => s.id !== id),
        },
      },
    });
  };

  return (
    <div className="space-y-3">
      <div
        className="font-medium outline-none"
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => {
          const value = e.currentTarget.textContent || "";
          localeUpdate(block.id, "instruction", value, () =>
            dispatch({ type: "UPDATE_BLOCK", payload: { id: block.id, updates: { instruction: value } } })
          );
        }}
      >
        {block.instruction}
      </div>

      <div>
        {block.sentences.map((item, i) => (
          <div
            key={item.id}
            className="group/item flex items-center gap-3 py-2 border-b last:border-b-0"
          >
            <ItemNumberBadge index={i + 1} />
            <span
              className="outline-none block flex-1"
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => {
                const value = e.currentTarget.textContent || "";
                localeUpdate(block.id, `sentences.${i}.beginning`, value, () =>
                  updateSentence(item.id, value)
                );
              }}
            >
              {item.beginning}
            </span>
            {item.ending && (
              <span className="text-xs text-muted-foreground italic shrink-0">
                {item.ending}
              </span>
            )}
            <button
              className={`opacity-0 group-hover/item:opacity-100 p-0.5 hover:bg-destructive/10 rounded transition-opacity shrink-0
                ${block.sentences.length <= 1 ? "invisible" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                removeSentence(item.id);
              }}
            >
              <X className="h-3 w-3 text-destructive" />
            </button>
          </div>
        ))}
      </div>
      <button
        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
        onClick={(e) => {
          e.stopPropagation();
          addSentence();
        }}
      >
        <Plus className="h-3 w-3" /> {t("addSentence")}
      </button>
    </div>
  );
}

// ─── Transform Sentences ────────────────────────────────────
function TransformSentencesRenderer({ block }: { block: TransformSentencesBlock }) {
  const { dispatch } = useEditor();
  const { localeUpdate } = useLocaleAwareEdit();
  const t = useTranslations("blockRenderer");
  const exampleSentenceId = block.showFirstAsExample ? block.sentences[0]?.id : undefined;

  const updateSentence = (id: string, beginning: string) => {
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          sentences: block.sentences.map((s) =>
            s.id === id ? { ...s, beginning } : s
          ),
        },
      },
    });
  };

  const addSentence = () => {
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          sentences: [
            ...block.sentences,
            { id: crypto.randomUUID(), beginning: "" },
          ],
        },
      },
    });
  };

  const removeSentence = (id: string) => {
    if (block.sentences.length <= 1) return;
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          sentences: block.sentences.filter((s) => s.id !== id),
        },
      },
    });
  };

  return (
    <div className="space-y-3">
      <div
        className="font-medium outline-none"
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => {
          const value = e.currentTarget.textContent || "";
          localeUpdate(block.id, "instruction", value, () =>
            dispatch({ type: "UPDATE_BLOCK", payload: { id: block.id, updates: { instruction: value } } })
          );
        }}
      >
        {block.instruction}
      </div>

      <div>
        {block.sentences.map((item, i) => (
          <div
            key={item.id}
            className={`group/item ${item.src ? "grid grid-cols-[106px_minmax(0,1fr)]" : "block"}`}
          >
            {item.src ? (
              <div className="row-span-2 pr-3 pt-[10px] flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.src}
                  alt=""
                  className="block max-h-full max-w-full h-auto w-auto object-contain"
                  style={{
                    borderRadius: "3px",
                  }}
                />
              </div>
            ) : null}
            <div className="flex items-center gap-3 py-2">
              <ItemNumberBadge index={i + 1} />
              <span
                className="outline-none block flex-1"
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => {
                  const value = e.currentTarget.textContent || "";
                  localeUpdate(block.id, `sentences.${i}.beginning`, value, () =>
                    updateSentence(item.id, value)
                  );
                }}
              >
                {item.beginning}
              </span>
              <button
                className={`opacity-0 group-hover/item:opacity-100 p-0.5 hover:bg-destructive/10 rounded transition-opacity shrink-0
                  ${block.sentences.length <= 1 ? "invisible" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  removeSentence(item.id);
                }}
              >
                <X className="h-3 w-3 text-destructive" />
              </button>
            </div>
            <div className="mt-1 relative min-h-[14px] border-b border-dashed border-muted-foreground/30">
              {item.id === exampleSentenceId && item.solution ? (
                <span
                  className="absolute left-9 text-[1.15em]"
                  style={{ bottom: "6px", fontFamily: "var(--font-handwriting), cursive", color: "#0097dc", fontSize: "18px" }}
                >
                  {item.solution}
                </span>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      <button
        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
        onClick={(e) => {
          e.stopPropagation();
          addSentence();
        }}
      >
        <Plus className="h-3 w-3" /> {t("addSentence")}
      </button>
    </div>
  );
}

function ReadingComprehensionRenderer({ block }: { block: ReadingComprehensionBlock }) {
  const { state, dispatch } = useEditor();
  const { localeUpdate } = useLocaleAwareEdit();
  const t = useTranslations("blockRenderer");
  const tc = useTranslations("common");
  const exampleSentenceId = block.showFirstAsExample ? block.sentences[0]?.id : undefined;
  const useLetterItemNumbering = !!block.letterItemNumbering;
  const isTrueFalseLayout = block.layoutType === "true-false";
  const isPrefilledFormLayout = block.layoutType === "prefilled-form";
  const isFormLayout = block.layoutType === "form" || isPrefilledFormLayout;
  const formFieldLabels = block.formFieldLabels && block.formFieldLabels.length > 0 ? block.formFieldLabels : [""];
  const formColumns = Math.max(1, Math.min(4, block.formColumns ?? 2));
  const trueLabelText = block.trueLabel || tc("true");
  const falseLabelText = block.falseLabel || tc("false");
  const optionColumnWidth = `${Math.max(64, Math.min(160, Math.max(trueLabelText.length, falseLabelText.length) * 8 + 24))}px`;

  const numberingOffsets = React.useMemo(() => {
    if (!useLetterItemNumbering || !block.continueNumbering) {
      return { sentenceOffset: 0, readingTextOffset: 0 };
    }

    const currentIndex = state.blocks.findIndex((candidate) => candidate.id === block.id);
    if (currentIndex <= 0) {
      return { sentenceOffset: 0, readingTextOffset: 0 };
    }

    let sentenceOffset = 0;
    let readingTextOffset = 0;
    for (let index = currentIndex - 1; index >= 0; index -= 1) {
      const previousBlock = state.blocks[index];
      if (previousBlock.type !== "reading-comprehension") {
        break;
      }

      if (!previousBlock.letterItemNumbering) {
        break;
      }

      sentenceOffset += previousBlock.sentences.length;
      if (previousBlock.layoutType === "true-false" && (previousBlock.readingText || "").trim().length > 0) {
        readingTextOffset += 1;
      }
    }

    return { sentenceOffset, readingTextOffset };
  }, [block.continueNumbering, block.id, state.blocks, useLetterItemNumbering]);

  const readingTextNumber = isTrueFalseLayout && (block.readingText || "").trim().length > 0
    ? numberingOffsets.readingTextOffset + 1
    : undefined;

  const renderSentenceIndex = (index: number) => {
    if (!useLetterItemNumbering) {
      return <ItemNumberBadge index={index} />;
    }

    return (
      <span className="w-6 min-w-6 shrink-0 text-[1em] font-medium leading-none text-muted-foreground tabular-nums">
        {`${toAlphabeticLabel(numberingOffsets.sentenceOffset + index, false)}.`}
      </span>
    );
  };

  const updateSentence = (id: string, updates: Partial<{ question: string; beginning: string; correctAnswer: boolean }>) => {
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          sentences: block.sentences.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        },
      },
    });
  };

  const addSentence = () => {
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          sentences: [
            ...block.sentences,
            { id: crypto.randomUUID(), question: "", beginning: "", correctAnswer: true, fieldValues: formFieldLabels.map(() => "") },
          ],
        },
      },
    });
  };

  const removeSentence = (id: string) => {
    if (block.sentences.length <= 1) return;
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          sentences: block.sentences.filter((s) => s.id !== id),
        },
      },
    });
  };

  return (
    <div className="space-y-3">
      <div
        className="font-medium outline-none"
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => {
          const value = e.currentTarget.textContent || "";
          localeUpdate(block.id, "instruction", value, () =>
            dispatch({ type: "UPDATE_BLOCK", payload: { id: block.id, updates: { instruction: value } } })
          );
        }}
      >
        {block.instruction}
      </div>

      {isTrueFalseLayout ? (
        <div className="flex items-baseline gap-2 py-1">
          {useLetterItemNumbering ? (
            <span className="w-6 min-w-6 shrink-0 text-[1em] font-medium leading-none text-muted-foreground tabular-nums">
              {`${readingTextNumber ?? numberingOffsets.readingTextOffset + 1}.`}
            </span>
          ) : null}
          <div
            className={`outline-none whitespace-pre-wrap text-sm leading-5 ${
              (block.readingText || "").trim() ? "text-foreground" : "text-muted-foreground"
            } ${useLetterItemNumbering ? "flex-1" : ""}`}
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => {
              const value = e.currentTarget.textContent || "";
              localeUpdate(block.id, "readingText", value, () =>
                dispatch({ type: "UPDATE_BLOCK", payload: { id: block.id, updates: { readingText: value } } })
              );
            }}
          >
            {(block.readingText || "").trim() ? block.readingText : t("readingComprehensionReadingTextPlaceholder")}
          </div>
        </div>
      ) : null}

      <div>
        {isTrueFalseLayout ? (
          <div>
            <div className="flex items-center gap-3 py-2 border-b">
              <div className="flex-1 font-bold text-foreground" />
              <div className="shrink-0 text-center font-semibold text-foreground" style={{ width: optionColumnWidth }}>{trueLabelText}</div>
              <div className="shrink-0 text-center font-semibold text-foreground" style={{ width: optionColumnWidth }}>{falseLabelText}</div>
              <div className="w-8" />
            </div>
            {block.sentences.map((item, i) => (
              <div
                key={item.id}
                className={`group/item border-b ${item.src ? "grid grid-cols-[106px_minmax(0,1fr)]" : "block"}`}
              >
                {item.src ? (
                  <div className="row-span-2 pr-3 flex items-center justify-center">
                    <img
                      src={item.src}
                      alt=""
                      className="block max-h-full max-w-full h-auto w-auto object-contain"
                      style={{ borderRadius: "3px" }}
                    />
                  </div>
                ) : null}
                <div className="flex items-start gap-2 py-2">
                  {renderSentenceIndex(i + 1)}
                  <div className="flex-1">
                    <div
                      className="font-medium outline-none"
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => {
                        const value = e.currentTarget.textContent || "";
                        localeUpdate(block.id, `sentences.${i}.question`, value, () =>
                          updateSentence(item.id, { question: value })
                        );
                      }}
                    >
                      {item.question}
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center justify-center" style={{ width: optionColumnWidth }}>
                    <button
                      className={`w-5 h-5 rounded-full border-2 inline-flex items-center justify-center transition-colors ${
                        item.correctAnswer !== false ? "bg-green-500 border-green-500 text-white" : "border-muted-foreground/30 hover:border-green-400"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        updateSentence(item.id, { correctAnswer: true });
                      }}
                    >
                      {item.correctAnswer !== false && <Check className="h-3 w-3" />}
                    </button>
                  </div>
                  <div className="shrink-0 flex items-center justify-center" style={{ width: optionColumnWidth }}>
                    <button
                      className={`w-5 h-5 rounded-full border-2 inline-flex items-center justify-center transition-colors ${
                        item.correctAnswer === false ? "bg-red-500 border-red-500 text-white" : "border-muted-foreground/30 hover:border-red-400"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        updateSentence(item.id, { correctAnswer: false });
                      }}
                    >
                      {item.correctAnswer === false && <X className="h-3 w-3" />}
                    </button>
                  </div>
                  <div className="w-8 flex items-center justify-center">
                    <button
                      className={`opacity-0 group-hover/item:opacity-100 p-0.5 hover:bg-destructive/10 rounded transition-opacity ${block.sentences.length <= 1 ? "invisible" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSentence(item.id);
                      }}
                    >
                      <X className="h-3 w-3 text-destructive" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
        {block.sentences.map((item, i) => (
          <div
            key={item.id}
            className={`group/item border-b ${item.src ? "grid grid-cols-[106px_minmax(0,1fr)]" : "block"}`}
          >
            {item.src ? (
              <div className="row-span-2 pr-3 flex items-center justify-center">
                <img
                  src={item.src}
                  alt=""
                  className="block max-h-full max-w-full h-auto w-auto object-contain"
                  style={{ borderRadius: "3px" }}
                />
              </div>
            ) : null}
            <div className={`flex items-start gap-3 ${isFormLayout ? "pt-2 pb-0" : "py-2"}`}>
              {renderSentenceIndex(i + 1)}
              <div className="flex-1 space-y-1">
                <div
                  className="font-medium outline-none"
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => {
                    const value = e.currentTarget.textContent || "";
                    localeUpdate(block.id, `sentences.${i}.question`, value, () =>
                      updateSentence(item.id, { question: value })
                    );
                  }}
                >
                  {item.question}
                </div>
                {!isFormLayout && (
                  <div
                    className="outline-none text-sm text-muted-foreground"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      const value = e.currentTarget.textContent || "";
                      localeUpdate(block.id, `sentences.${i}.beginning`, value, () =>
                        updateSentence(item.id, { beginning: value })
                      );
                    }}
                  >
                    {item.beginning}
                  </div>
                )}
              </div>
              <button
                className={`opacity-0 group-hover/item:opacity-100 p-0.5 hover:bg-destructive/10 rounded transition-opacity shrink-0
                  ${block.sentences.length <= 1 ? "invisible" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  removeSentence(item.id);
                }}
              >
                <X className="h-3 w-3 text-destructive" />
              </button>
            </div>
            {isFormLayout ? (
              <div className="flex gap-3 pb-4 pt-2">
                <div className="w-6 h-6 min-w-6 shrink-0" aria-hidden="true" />
                <div className="flex-1">
                  <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${formColumns}, minmax(0, 1fr))` }}>
                    {formFieldLabels.map((label, fieldIndex) => {
                      const shouldStretchLastField =
                        fieldIndex === formFieldLabels.length - 1 &&
                        formFieldLabels.length % formColumns === 1;
                      const value = item.fieldValues?.[fieldIndex] ?? "";
                      const parsedValue = parseReadingComprehensionFieldValue(value);
                      const previewValue = isPrefilledFormLayout ? (parsedValue.prefilled || parsedValue.solution) : value;
                      const isExample = item.id === exampleSentenceId && fieldIndex === 0 && previewValue.trim() !== "";
                      const renderPrefilledValue = () => (
                        previewValue ? (
                          <span
                            className="absolute inset-0 flex items-center px-2"
                            style={{ color: "currentColor" }}
                          >
                            {previewValue}
                          </span>
                        ) : <span>&nbsp;</span>
                      );
                      return (
                        <div
                          key={fieldIndex}
                          className="space-y-1 min-w-0"
                          style={shouldStretchLastField ? { gridColumn: "1 / -1" } : undefined}
                        >
                          <div className="font-semibold">{label || `Field ${fieldIndex + 1}`}</div>
                          <div className="relative h-7 w-full rounded-[3px] bg-gray-100 px-2 py-0 leading-5 text-muted-foreground text-xs">
                            {isPrefilledFormLayout ? (
                              isExample && parsedValue.hasCorrection ? (
                                <span className="absolute inset-0 flex items-center px-2">
                                  {renderReadingComprehensionCorrectionSegments(parsedValue, "#0097dc")}
                                </span>
                              ) : renderPrefilledValue()
                            ) : isExample ? (
                              <span
                                className="absolute inset-0 flex items-center px-2"
                                style={{ fontFamily: EXAMPLE_HANDWRITING_FONT, color: "#0097dc", fontSize: "18px" }}
                              >
                                {value}
                              </span>
                            ) : <span>&nbsp;</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-1 relative min-h-[14px] border-b border-dashed border-muted-foreground/30">
                {item.id === exampleSentenceId && item.solution ? (
                  <span
                    className="absolute -top-1 left-9 text-[1.15em]"
                    style={{ fontFamily: "var(--font-handwriting), cursive", color: "#0097dc", fontSize: "18px" }}
                  >
                    {item.solution}
                  </span>
                ) : null}
              </div>
            )}
          </div>
        ))}
          </>
        )}
      </div>
      <button
        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
        onClick={(e) => {
          e.stopPropagation();
          addSentence();
        }}
      >
        <Plus className="h-3 w-3" /> {t("addSentence")}
      </button>
    </div>
  );
}

// ─── Verb Table ─────────────────────────────────────────────
function VerbTableRenderer({ block }: { block: VerbTableBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("blockRenderer");
  const [showAiModal, setShowAiModal] = React.useState(false);

  const updateRow = (
    section: "singularRows" | "pluralRows",
    id: string,
    updates: Partial<VerbTableRow>
  ) => {
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          [section]: (block[section] as VerbTableRow[]).map((r) =>
            r.id === id ? { ...r, ...updates } : r
          ),
        },
      },
    });
  };

  const addRow = (section: "singularRows" | "pluralRows") => {
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          [section]: [
            ...block[section],
            {
              id: crypto.randomUUID(),
              person: "Person",
              pronoun: "",
              conjugation: "",
            },
          ],
        },
      },
    });
  };

  const removeRow = (section: "singularRows" | "pluralRows", id: string) => {
    if (block[section].length <= 1) return;
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          [section]: block[section].filter((r) => r.id !== id),
        },
      },
    });
  };

  const isSplit = block.splitConjugation ?? false;
  const showGlobal = block.showConjugations ?? false;
  const colCount = isSplit ? 5 : 4;

  const cycleOverride = (section: "singularRows" | "pluralRows", id: string, field: "showOverride" | "showOverride2") => {
    const row = block[section].find(r => r.id === id);
    if (!row) return;
    const current = row[field];
    // Cycle: null → show → hide → null
    const next = current === null || current === undefined ? "show" : current === "show" ? "hide" : null;
    updateRow(section, id, { [field]: next });
  };

  const getVisibilityIcon = (override: "show" | "hide" | null | undefined, globalShow: boolean) => {
    if (override === "show") return <Eye className="h-3 w-3 text-green-600" />;
    if (override === "hide") return <EyeOff className="h-3 w-3 text-red-600" />;
    // null/undefined = use global
    return globalShow ? <Eye className="h-3 w-3 text-muted-foreground/50" /> : <EyeOff className="h-3 w-3 text-muted-foreground/50" />;
  };

  const renderRows = (section: "singularRows" | "pluralRows", isLast: boolean) => (
    <>
      {block[section].map((row, rowIdx) => {
        const isLastRow = isLast && rowIdx === block[section].length - 1;
        const borderB = isLastRow ? "" : "border-b";
        return (
        <tr key={row.id} className="group/row">
          <td className={`border-r ${borderB} border-border px-3 py-2${isLastRow ? " rounded-bl-lg" : ""}`}>
            <input
              type="text"
              value={row.person}
              onChange={(e) => updateRow(section, row.id, { person: e.target.value })}
              className="w-full text-muted-foreground bg-transparent border-0 outline-none uppercase" style={{ fontSize: 14 }}
              placeholder={t("verbTablePerson")}
            />
          </td>
          <td className={`border-r ${borderB} border-border px-3 py-2`}>
            <input
              type="text"
              value={row.detail || ""}
              onChange={(e) =>
                updateRow(section, row.id, { detail: e.target.value || undefined })
              }
              className="w-full text-muted-foreground bg-transparent border-0 outline-none uppercase" style={{ fontSize: 14 }}
              placeholder="—"
            />
          </td>
          <td className={`border-r ${borderB} border-border px-3 py-2`}>
            <input
              type="text"
              value={row.pronoun}
              onChange={(e) => updateRow(section, row.id, { pronoun: e.target.value })}
              className="w-full font-bold bg-transparent border-0 outline-none" style={{ fontSize: 16 }}
              placeholder={t("verbTablePronoun")}
            />
          </td>
          <td className={`${borderB} border-border px-3 py-2${isSplit ? " border-r" : ""}${isLastRow && !isSplit ? " rounded-br-lg" : ""}`}>
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={row.conjugation}
                onChange={(e) =>
                  updateRow(section, row.id, { conjugation: e.target.value })
                }
                className="flex-1 font-bold text-red-500 bg-transparent border-0 outline-none" style={{ fontSize: 16 }}
                placeholder={t("verbTableConjugation")}
              />
              <button
                type="button"
                onClick={() => cycleOverride(section, row.id, "showOverride")}
                className="p-1 rounded hover:bg-muted/50 transition-colors opacity-50 hover:opacity-100"
                title={row.showOverride === "show" ? "Shown (click to hide)" : row.showOverride === "hide" ? "Hidden (click to use global)" : "Using global (click to show)"}
              >
                {getVisibilityIcon(row.showOverride, showGlobal)}
              </button>
            </div>
          </td>
          {isSplit && (
            <td className={`${borderB} border-border px-3 py-2${isLastRow ? " rounded-br-lg" : ""}`}>
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={row.conjugation2 || ""}
                  onChange={(e) =>
                    updateRow(section, row.id, { conjugation2: e.target.value || undefined })
                  }
                  className="flex-1 font-bold text-red-500 bg-transparent border-0 outline-none" style={{ fontSize: 16 }}
                  placeholder={t("verbTableConjugation")}
                />
                <button
                  type="button"
                  onClick={() => cycleOverride(section, row.id, "showOverride2")}
                  className="p-1 rounded hover:bg-muted/50 transition-colors opacity-50 hover:opacity-100"
                  title={row.showOverride2 === "show" ? "Shown (click to hide)" : row.showOverride2 === "hide" ? "Hidden (click to use global)" : "Using global (click to show)"}
                >
                  {getVisibilityIcon(row.showOverride2, showGlobal)}
                </button>
              </div>
            </td>
          )}
        </tr>
        );
      })}
    </>
  );

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="font-medium text-muted-foreground" style={{ fontSize: 16 }}>{t("verbTableVerb")}:</span>
        <input
          type="text"
          value={block.verb}
          onChange={(e) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { verb: e.target.value } },
            })
          }
          className="font-bold bg-transparent border border-transparent hover:border-border focus:border-primary rounded px-2 py-1 outline-none" style={{ fontSize: 18 }}
          placeholder={t("verbTableVerbPlaceholder")}
        />
      </div>

      <div className="flex">
        <table className="flex-1 border-separate border-spacing-0 border-2 border-border rounded-sm overflow-hidden" style={{ fontSize: 16 }}>
          <colgroup>
            <col style={{ width: "15%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "15%" }} />
            {isSplit ? (
              <>
                <col style={{ width: "27.5%" }} />
                <col style={{ width: "27.5%" }} />
              </>
            ) : (
              <col style={{ width: "55%" }} />
            )}
          </colgroup>
          <tbody>
            <tr className="bg-muted/50">
              <td colSpan={colCount} className="border-b border-border px-3 py-2 font-bold uppercase tracking-wider text-muted-foreground rounded-tl-sm rounded-tr-lg" style={{ fontSize: 16 }}>
                Singular
              </td>
            </tr>
            {renderRows("singularRows", false)}
            <tr className="bg-muted/50">
              <td colSpan={colCount} className="border-b border-border px-3 py-2 font-bold uppercase tracking-wider text-muted-foreground" style={{ fontSize: 16 }}>
                Plural
              </td>
            </tr>
            {renderRows("pluralRows", true)}
          </tbody>
        </table>
        <div className="flex flex-col">
          {/* Singular header spacer */}
          <div style={{ height: 41 }} />
          {block.singularRows.map((row) => (
            <div key={row.id} className="group/del flex items-center" style={{ height: 41 }}>
              <button
                className={`opacity-0 group-hover/del:opacity-100 ml-1 p-0.5 hover:bg-destructive/10 rounded transition-opacity ${
                  block.singularRows.length <= 1 ? "invisible" : ""
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  removeRow("singularRows", row.id);
                }}
              >
                <X className="h-3 w-3 text-destructive" />
              </button>
            </div>
          ))}
          {/* Plural header spacer */}
          <div style={{ height: 41 }} />
          {block.pluralRows.map((row) => (
            <div key={row.id} className="group/del flex items-center" style={{ height: 41 }}>
              <button
                className={`opacity-0 group-hover/del:opacity-100 ml-1 p-0.5 hover:bg-destructive/10 rounded transition-opacity ${
                  block.pluralRows.length <= 1 ? "invisible" : ""
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  removeRow("pluralRows", row.id);
                }}
              >
                <X className="h-3 w-3 text-destructive" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 mt-2">
        <button
          className="text-xs text-purple-500 hover:text-purple-700 flex items-center gap-1 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            setShowAiModal(true);
          }}
        >
          <Sparkles className="h-3 w-3" /> {t("aiGenerate")}
        </button>
      </div>
      <AiVerbTableModal open={showAiModal} onOpenChange={setShowAiModal} blockId={block.id} />
    </div>
  );
}

// ─── Column Child Block (with toolbar) ──────────────────────
const colChildVisibilityIcons = {
  both: Eye,
  print: Printer,
  online: Monitor,
};
const colChildVisibilityCycle: BlockVisibility[] = ["both", "print", "online"];

function ColumnChildBlock({
  block,
  mode,
  parentBlockId,
  colIndex,
}: {
  block: WorksheetBlock;
  mode: ViewMode;
  parentBlockId: string;
  colIndex: number;
}) {
  const { state, access, dispatch, duplicateBlock, moveBlockInContainerByStep } = useEditor();
  const t = useTranslations("blockRenderer");
  const tc = useTranslations("common");
  const isSelected = state.selectedBlockId === block.id;
  const isVisibleInMode = block.visibility === "both" || block.visibility === mode;
  const VisIcon = colChildVisibilityIcons[block.visibility];
  const parentBlock = state.blocks.find((candidate) => candidate.id === parentBlockId);
  const siblingBlocks = parentBlock
    ? parentBlock.type === "columns"
      ? (parentBlock.children[colIndex] ?? [])
      : parentBlock.type === "accordion"
        ? (parentBlock.items[colIndex]?.children ?? [])
        : parentBlock.type === "grid"
          ? (parentBlock.children[colIndex] ?? [])
          : []
    : [];
  const blockIndex = siblingBlocks.findIndex((candidate) => candidate.id === block.id);
  const canMoveUp = blockIndex > 0;
  const canMoveDown = blockIndex >= 0 && blockIndex < siblingBlocks.length - 1;
  const canReorder = access.features.reorderBlocks;
  const canManageVisibility = access.features.manageBlockVisibility;
  const canDuplicate = access.features.duplicateBlocks;
  const canDelete = access.features.deleteBlocks;

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `col-child-${block.id}`,
    data: {
      type: "column-child",
      blockId: block.id,
      parentBlockId,
      colIndex,
    },
  });

  const cycleVisibility = () => {
    const currentIdx = colChildVisibilityCycle.indexOf(block.visibility);
    const nextIdx = (currentIdx + 1) % colChildVisibilityCycle.length;
    dispatch({
      type: "SET_BLOCK_VISIBILITY",
      payload: { id: block.id, visibility: colChildVisibilityCycle[nextIdx] },
    });
  };

  return (
    <div
      ref={setNodeRef}
      className={`group/child relative rounded-sm border transition-all
        ${isDragging ? "opacity-50 shadow-lg z-50" : ""}
        ${isSelected ? "border-primary ring-2 ring-primary/20" : "border-transparent hover:border-border"}
        ${!isVisibleInMode ? "opacity-40" : ""}
      `}
      onClick={(e) => {
        e.stopPropagation();
        dispatch({ type: "SELECT_BLOCK", payload: block.id });
      }}
    >
      {/* Child block toolbar */}
      <div
        className={`absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-background border rounded-sm shadow-sm px-1 py-0.5 z-20
          ${isSelected ? "opacity-100" : "opacity-0 group-hover/child:opacity-100"}
          transition-opacity`}
      >
        {/* Drag handle */}
        <button
          className="p-0.5 hover:bg-muted rounded cursor-grab active:cursor-grabbing"
          disabled={!canReorder}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3 w-3 text-muted-foreground" />
        </button>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="p-0.5 hover:bg-muted rounded disabled:opacity-40 disabled:hover:bg-transparent"
              disabled={!canMoveUp || !canReorder}
              onClick={(e) => {
                e.stopPropagation();
                moveBlockInContainerByStep(block.id, "up");
              }}
            >
              <ArrowUp className="h-3 w-3 text-muted-foreground" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">{t("moveBlockUp")}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="p-0.5 hover:bg-muted rounded disabled:opacity-40 disabled:hover:bg-transparent"
              disabled={!canMoveDown || !canReorder}
              onClick={(e) => {
                e.stopPropagation();
                moveBlockInContainerByStep(block.id, "down");
              }}
            >
              <ArrowDown className="h-3 w-3 text-muted-foreground" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">{t("moveBlockDown")}</p>
          </TooltipContent>
        </Tooltip>

        {/* Visibility toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="p-0.5 hover:bg-muted rounded"
              disabled={!canManageVisibility}
              onClick={(e) => {
                e.stopPropagation();
                cycleVisibility();
              }}
            >
              <VisIcon className="h-3 w-3 text-muted-foreground" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">{t("visibleLabel", { visibility: block.visibility })}</p>
          </TooltipContent>
        </Tooltip>

        {/* Duplicate */}
        <button
          className="p-0.5 hover:bg-muted rounded"
          disabled={!canDuplicate}
          onClick={(e) => {
            e.stopPropagation();
            duplicateBlock(block.id);
          }}
        >
          <Copy className="h-3 w-3 text-muted-foreground" />
        </button>

        {/* Delete */}
        <button
          className="p-0.5 hover:bg-destructive/10 rounded"
          disabled={!canDelete}
          onClick={(e) => {
            e.stopPropagation();
            dispatch({ type: "REMOVE_BLOCK", payload: block.id });
          }}
        >
          <Trash2 className="h-3 w-3 text-destructive" />
        </button>
      </div>

      {/* Visibility badge */}
      {block.visibility !== "both" && (
        <Badge
          variant="secondary"
          className="absolute -top-2 -right-2 text-[10px] px-1.5 py-0 z-20"
        >
          {block.visibility === "print" ? tc("print") : tc("online")}
        </Badge>
      )}

      {/* Content */}
      <div className="p-2">
        <BlockRenderer block={block} mode={mode} />
      </div>
    </div>
  );
}

// ─── Columns ────────────────────────────────────────────────
function DroppableColumn({
  blockId,
  colIndex,
  children,
  isEmpty,
  bgColor,
  showBorder,
  borderColor,
}: {
  blockId: string;
  colIndex: number;
  children: React.ReactNode;
  isEmpty: boolean;
  bgColor?: string;
  showBorder: boolean;
  borderColor?: string;
}) {
  const t = useTranslations("blockRenderer");
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${blockId}-${colIndex}`,
    data: { type: "column-drop", blockId, colIndex },
  });

  return (
    <div
      ref={setNodeRef}
      className={`px-3 py-0 min-h-[80px] space-y-2 transition-colors
        [&_p:first-child]:-mt-2.5
        ${bgColor || borderColor ? "rounded" : "rounded-sm"}
        ${showBorder ? "border border-dashed" : "border border-transparent"}
        ${isOver ? "border-primary bg-primary/5" : showBorder ? "border-border" : ""}
        ${isEmpty ? "" : ""}`}
      style={{
        ...(isOver
          ? undefined
          : {
              ...(bgColor ? { backgroundColor: bgColor } : {}),
              ...(showBorder && borderColor ? { borderColor } : {}),
              ...(showBorder ? { paddingTop: "12px", paddingBottom: "12px" } : {}),
            }),
      }}
    >
      {isEmpty ? (
        <p className={`text-xs text-center py-4 transition-colors ${isOver ? "text-primary opacity-70" : "text-muted-foreground opacity-50"}`}>
          {isOver ? t("dropHere") : t("columnLabel", { index: colIndex + 1 })}
        </p>
      ) : (
        children
      )}
    </div>
  );
}

function ColumnsRenderer({
  block,
  mode,
}: {
  block: ColumnsBlock;
  mode: ViewMode;
}) {
  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: `repeat(${block.columns}, 1fr)` }}
    >
      {block.children.map((col, colIndex) => (
        <DroppableColumn
          key={colIndex}
          blockId={block.id}
          colIndex={colIndex}
          isEmpty={col.length === 0}
          bgColor={block.columnBgColors?.[colIndex]}
          showBorder={block.columnBorders?.[colIndex] ?? (block.showBorder ?? true)}
          borderColor={block.columnBorderColors?.[colIndex]}
        >
          {col.map((childBlock) => (
            <ColumnChildBlock
              key={childBlock.id}
              block={childBlock}
              mode={mode}
              parentBlockId={block.id}
              colIndex={colIndex}
            />
          ))}
        </DroppableColumn>
      ))}
    </div>
  );
}

// ─── Grid ────────────────────────────────────────────────────
function DroppableGridCell({
  blockId,
  cellIndex,
  children,
  isEmpty,
  row,
  col,
  showBorder = false,
}: {
  blockId: string;
  cellIndex: number;
  children: React.ReactNode;
  isEmpty: boolean;
  row: number;
  col: number;
  showBorder?: boolean;
}) {
  const t = useTranslations("blockRenderer");
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${blockId}-${cellIndex}`,
    data: { type: "column-drop", blockId, colIndex: cellIndex },
  });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[40px] space-y-2 transition-colors
        ${isOver ? "bg-primary/5" : ""}`}
      style={showBorder ? { paddingTop: "8px" } : {}}
    >
      {isEmpty ? (
        <p className={`text-xs text-center py-4 transition-colors ${isOver ? "text-primary opacity-70" : "text-muted-foreground opacity-50"}`}>
          {isOver ? t("dropHere") : t("gridCell", { row: row + 1, col: col + 1 })}
        </p>
      ) : (
        children
      )}
    </div>
  );
}

function GridRenderer({
  block,
  mode,
}: {
  block: GridBlock;
  mode: ViewMode;
}) {
  const hasBorder = block.showBorder ?? false;
  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: `repeat(${block.cols}, 1fr)`,
        gridTemplateRows: `repeat(${block.rows}, auto)`,
        columnGap: `${block.colGap}px`,
        rowGap: `${block.rowGap}px`,
      }}
    >
      {block.children.map((cell, cellIndex) => {
        const row = Math.floor(cellIndex / block.cols);
        const col = cellIndex % block.cols;
        return (
          <DroppableGridCell
            key={cellIndex}
            blockId={block.id}
            cellIndex={cellIndex}
            isEmpty={cell.length === 0}
            row={row}
            col={col}
            showBorder={hasBorder}
          >
            {cell.map((childBlock) => (
              <ColumnChildBlock
                key={childBlock.id}
                block={childBlock}
                mode={mode}
                parentBlockId={block.id}
                colIndex={cellIndex}
              />
            ))}
          </DroppableGridCell>
        );
      })}
    </div>
  );
}

function BoardGameRenderer({ block }: { block: BoardGameBlock }) {
  const { state, dispatch } = useEditor();
  const totalCells = Math.max(1, block.rows * block.cols);
  const cellWidthMm = 35;
  const cellHeightMm = 25;
  const cellGapPx = 8;
  const mmToPx = 96 / 25.4;
  const cellWidthPx = cellWidthMm * mmToPx;
  const cellHeightPx = cellHeightMm * mmToPx;
  const boardWidthPx = block.cols * cellWidthPx + Math.max(0, block.cols - 1) * cellGapPx;
  const boardHeightPx = block.rows * cellHeightPx + Math.max(0, block.rows - 1) * cellGapPx;
  const cells = Array.from({ length: totalCells }, (_, index) => {
    const existing = block.cells[index];
    return existing ?? { id: `cell-${index + 1}`, text: "", imageUrl: "" };
  });

  const snakePathIndices: number[] = [35];
  for (let r = block.rows - 1; r >= 0; r--) {
    const isLeftToRight = (block.rows - 1 - r) % 2 === 0;
    if (isLeftToRight) {
      for (let c = 0; c < block.cols; c++) {
        const idx = r * block.cols + c;
        if (idx !== 35 && idx !== 0 && idx < totalCells) {
          snakePathIndices.push(idx);
        }
      }
    } else {
      for (let c = block.cols - 1; c >= 0; c--) {
        const idx = r * block.cols + c;
        if (idx !== 35 && idx !== 0 && idx < totalCells) {
          snakePathIndices.push(idx);
        }
      }
    }
  }

  const snakePathPoints = snakePathIndices
    .map((idx) => {
      const row = Math.floor(idx / block.cols);
      const col = idx % block.cols;
      const x = col * (cellWidthPx + cellGapPx) + cellWidthPx / 2;
      const y = row * (cellHeightPx + cellGapPx) + cellHeightPx / 2;
      return `${x},${y}`;
    })
    .join(" ");

  const getSnakeNumber = (cellIndex: number): number | null => {
    // Skip START (index 35) and ZIEL (index 0)
    if (cellIndex === 35 || cellIndex === 0) return null;
    
    const cols = 5;
    const rows = 8;
    let number = 0;
    
    // Start from bottom row, snake up
    for (let r = rows - 1; r >= 0; r--) {
      const isLeftToRight = (rows - 1 - r) % 2 === 0;
      
      if (isLeftToRight) {
        // Left to right
        for (let c = 0; c < cols; c++) {
          const idx = r * cols + c;
          if (idx !== 35 && idx !== 0) {
            number++;
            if (idx === cellIndex) return number;
          }
        }
      } else {
        // Right to left
        for (let c = cols - 1; c >= 0; c--) {
          const idx = r * cols + c;
          if (idx !== 35 && idx !== 0) {
            number++;
            if (idx === cellIndex) return number;
          }
        }
      }
    }
    return null;
  };

  const selectedCellIndex = state.activeItemIndex;

  return (
    <div
      className="grid relative"
      style={{
        gridTemplateColumns: `repeat(${block.cols}, ${cellWidthMm}mm)`,
        gap: "8px",
        width: "fit-content",
        margin: "0 auto",
      }}
    >
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 h-full w-full"
        viewBox={`0 0 ${boardWidthPx} ${boardHeightPx}`}
        preserveAspectRatio="none"
      >
        <polyline
          points={snakePathPoints}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-foreground/40"
        />
      </svg>
      {cells.map((cell, cellIndex) => {
        const displayText = cellIndex === 0 ? "ZIEL" : cellIndex === 35 ? "START" : cell.text;
        const isSpecial = displayText === "ZIEL" || displayText === "START";
        const snakeNumber = getSnakeNumber(cellIndex);
        const isSelected = selectedCellIndex === cellIndex;
        const cellTextLength = (displayText ?? "").length;
        const cellTextSizeClass = isSpecial
          ? "text-3xl"
          : cellTextLength > 60
            ? "text-[10px]"
            : cellTextLength > 30
              ? "text-[11px]"
              : "text-xs";
        return (
        <button
          key={cell.id || cellIndex}
          type="button"
          onClick={() => dispatch({ type: "SET_ACTIVE_ITEM", payload: cellIndex })}
          className={`relative z-10 rounded-sm border p-2 bg-background flex flex-col text-left transition-colors overflow-hidden ${isSpecial ? "items-center justify-center" : "space-y-2 relative"} ${isSelected ? "border-primary ring-1 ring-primary/40" : "border-border hover:border-primary/50"}`}
          style={{
            width: "35mm",
            height: "25mm",
            boxSizing: "border-box",
            ...(cell.imageUrl && !isSpecial
              ? {
                  backgroundImage: `url(${cell.imageUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                }
              : {}),
          }}
        >
          {isSpecial ? (
            <div className={`font-bold ${cellTextSizeClass} text-center leading-none`}>{displayText}</div>
          ) : (
            <>
              {snakeNumber && <div className="absolute top-1 right-1 text-[9px] text-muted-foreground font-semibold">{snakeNumber}</div>}
              {displayText?.trim() ? (
                <p className={`flex-1 flex items-center justify-center text-center ${cellTextSizeClass} leading-tight whitespace-pre-wrap break-words rounded-sm bg-background/70 px-1 py-1 overflow-hidden`} style={{ wordBreak: 'break-word' }}>
                  {displayText}
                </p>
              ) : null}
            </>
          )}
        </button>
        );
      })}
    </div>
  );
}

function DominoRenderer({ block }: { block: DominoBlock }) {
  const { state, dispatch } = useEditor();
  const items = getDominoItems(block.items);
  const lastItemIndex = Math.max(0, items.length - 1);
  const pairs = getDominoPairs(block);
  const brandSlug = state.brandProfile.slug || state.settings.brand || "edoomio";
  const textClass = getDominoEditorTextClass(block.textSize);
  const title = block.title?.trim();
  const footer = block.footer?.trim();
  const titleColor = resolveHeadingOverrideColor(
    state.brandProfile.h3HeadingColor,
    state.brandProfile.primaryColor,
    state.brandProfile.accentColor,
  );

  const removePair = (itemIndices: number[]) => {
    const nextItems = items.filter((_, index) => !itemIndices.includes(index));
    dispatch({ type: "UPDATE_BLOCK", payload: { id: block.id, updates: { items: nextItems } } });
    if (state.selectedBlockId === block.id) {
      dispatch({ type: "SET_ACTIVE_ITEM", payload: null });
    }
  };

  return (
    <div className="space-y-3" style={{ width: "fit-content", margin: "0 auto" }}>
      {title ? (
        <h3
          className="text-xl text-left"
          style={{
            width: "100%",
            fontWeight: 800,
            fontFamily: state.brandProfile.headlineFont,
            ...(titleColor ? { color: titleColor } : {}),
          }}
        >
          {title}
        </h3>
      ) : null}
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          width: "fit-content",
        }}
      >
        {pairs.map(({ pairIndex, pairLabel, pairItems, itemIndices }) => {
        const canRemovePair = !itemIndices.includes(0) && !itemIndices.includes(lastItemIndex);

        return (
        <div key={`domino-pair-${pairIndex}`} className="group relative">
          <div className="absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
            {pairLabel}
          </div>
          {canRemovePair ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                removePair(itemIndices);
              }}
              className="absolute right-1 top-1 z-20 rounded-full bg-background/95 p-1 text-muted-foreground opacity-0 shadow-sm ring-1 ring-border transition-opacity group-hover:opacity-100 hover:text-red-600"
              title={state.localeMode === "DE" ? "Paar entfernen" : "Remove pair"}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
          <div className="grid grid-cols-2 overflow-hidden rounded-md border border-border bg-background shadow-sm">
            {pairItems.map((item, itemOffset) => {
              const itemIndex = itemIndices[itemOffset] ?? 0;
              const isSelected = state.selectedBlockId === block.id && state.activeItemIndex === itemIndex;
              const displayText = itemIndex === 0 ? "START" : itemIndex === lastItemIndex ? "ZIEL" : item.text;
              const isSpecialItem = itemIndex === 0 || itemIndex === lastItemIndex;
              const showFooter = Boolean(footer) && itemOffset === 0 && itemIndex !== 0;
              return (
                <button
                  key={item.id || itemIndex}
                  type="button"
                  onClick={() => {
                    dispatch({ type: "SELECT_BLOCK", payload: block.id });
                    dispatch({ type: "SET_ACTIVE_ITEM", payload: itemIndex });
                  }}
                  className={`relative flex h-[28mm] w-[36mm] flex-col p-2 text-left transition-colors ${itemOffset === 0 ? "border-r border-border" : ""} ${isSpecialItem ? "items-center justify-center" : "items-center justify-center"} ${isSelected ? "ring-2 ring-inset ring-primary" : "hover:bg-muted/20"}`}
                  style={
                    item.imageUrl
                      ? {
                          backgroundImage: `url(${item.imageUrl})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          backgroundRepeat: "no-repeat",
                        }
                      : undefined
                  }
                >
                  {!item.imageUrl ? (
                    <div className="absolute inset-2 rounded-sm border border-dashed border-border/80 bg-muted/20" />
                  ) : null}
                  {displayText?.trim() ? (
                    <div className={`relative z-10 whitespace-pre-wrap text-center break-words ${isSpecialItem ? "text-3xl font-bold leading-none" : `rounded-sm bg-background/80 py-1 ${textClass}`}`}>
                      {displayText}
                    </div>
                  ) : null}
                  {block.showSpeakerIcons && item.speakerIcon ? (
                    <div className="absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-full bg-background/85 p-1">
                      <DialogueSpeakerIconGlyph icon={item.speakerIcon} brandSlug={brandSlug} className="h-6 w-6 object-contain" />
                    </div>
                  ) : null}
                  {showFooter ? (
                    <div className="absolute left-2 top-1.5 z-10 max-w-[24mm] rounded-sm bg-background/80 px-1 py-0.5 text-left text-[8px] font-medium leading-none text-slate-600">
                      {footer}
                    </div>
                  ) : null}
                </button>
              );
            })}
            {pairItems.length === 1 ? <div className="h-[28mm] w-[36mm] bg-background" /> : null}
          </div>
        </div>
      )})}
      </div>
    </div>
  );
}

function FlashcardsRenderer({ block }: { block: FlashcardsBlock }) {
  const { state, dispatch } = useEditor();
  const items = getFlashcardItems(block.items);
  const pairs = getFlashcardPairs(block);
  const flashcardBlankTokenPattern = /\{\{blank\*?(?:,[^:}]+)?(?::[^}]*)?\}\}/;
  const textClass = getDominoEditorTextClass(block.textSize);
  const title = block.title?.trim();
  const footer = block.footer?.trim();
  const titleColor = resolveHeadingOverrideColor(
    state.brandProfile.h3HeadingColor,
    state.brandProfile.primaryColor,
    state.brandProfile.accentColor,
  );

  const removePair = (itemIndices: number[]) => {
    const nextItems = items.filter((_, index) => !itemIndices.includes(index));
    dispatch({ type: "UPDATE_BLOCK", payload: { id: block.id, updates: { items: nextItems } } });
    if (state.selectedBlockId === block.id) {
      dispatch({ type: "SET_ACTIVE_ITEM", payload: null });
    }
  };

  return (
    <div className="space-y-3" style={{ width: "fit-content", margin: "0 auto" }}>
      {title ? (
        <h3
          className="text-xl text-left"
          style={{
            width: "100%",
            fontWeight: 800,
            fontFamily: state.brandProfile.headlineFont,
            ...(titleColor ? { color: titleColor } : {}),
          }}
        >
          {title}
        </h3>
      ) : null}
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          width: "fit-content",
        }}
      >
        {pairs.map(({ pairIndex, pairLabel, pairItems, itemIndices }) => (
          <div key={`flashcards-pair-${pairIndex}`} className="group relative">
            <div className="absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
              {pairLabel}
            </div>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                removePair(itemIndices);
              }}
              className="absolute right-1 top-1 z-20 rounded-full bg-background/95 p-1 text-muted-foreground opacity-0 shadow-sm ring-1 ring-border transition-opacity group-hover:opacity-100 hover:text-red-600"
              title={state.localeMode === "DE" ? "Paar entfernen" : "Remove pair"}
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <div className="grid grid-cols-2 overflow-hidden rounded-md border border-border bg-background shadow-sm">
              {pairItems.map((item, itemOffset) => {
                const itemIndex = itemIndices[itemOffset] ?? 0;
                const isSelected = state.selectedBlockId === block.id && state.activeItemIndex === itemIndex;
                const displayText = getFlashcardDisplayText(pairItems[0], pairItems[1], itemOffset);
                const isSolvedBackFallback =
                  itemOffset === 1 &&
                  !pairItems[1]?.text?.trim() &&
                  flashcardBlankTokenPattern.test(pairItems[0]?.text ?? "");
                const showFooter = Boolean(footer) && itemOffset === 0;
                return (
                  <button
                    key={item.id || itemIndex}
                    type="button"
                    onClick={() => {
                      dispatch({ type: "SELECT_BLOCK", payload: block.id });
                      dispatch({ type: "SET_ACTIVE_ITEM", payload: itemIndex });
                    }}
                    className={`relative flex h-[28mm] w-[36mm] flex-col p-2 text-left transition-colors ${itemOffset === 0 ? "border-r border-border" : ""} items-center justify-center ${isSelected ? "ring-2 ring-inset ring-primary" : "hover:bg-muted/20"}`}
                    style={
                      item.imageUrl
                        ? {
                            backgroundImage: `url(${item.imageUrl})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                            backgroundRepeat: "no-repeat",
                          }
                        : undefined
                    }
                  >
                    {!item.imageUrl ? (
                      <div className="absolute inset-2 rounded-sm border border-dashed border-border/80 bg-muted/20" />
                    ) : null}
                    {displayText?.trim() ? (
                      <div className={`relative z-10 whitespace-pre-wrap text-center break-words rounded-sm bg-background/80 py-1 ${textClass}`}>
                        {isSolvedBackFallback ? renderSolvedFlashcardBackText(pairItems[0]?.text ?? "") : renderCardTextWithBlanks(displayText, "min-h-[1.05em]")}
                      </div>
                    ) : null}
                    {showFooter ? (
                      <div className="absolute bottom-1.5 left-2 z-10 max-w-[24mm] rounded-sm bg-background/80 px-1 py-0.5 text-left text-[8px] font-medium leading-none text-slate-600">
                        {footer}
                      </div>
                    ) : null}
                  </button>
                );
              })}
              {pairItems.length === 1 ? <div className="h-[28mm] w-[36mm] bg-background" /> : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CardPairsRenderer({ block }: { block: CardPairsBlock }) {
  const { state, dispatch } = useEditor();
  const items = getCardPairItems(block.items);
  const pairs = getCardPairs(block);
  const pairingMode = block.pairingMode ?? "same";
  const textClass = getDominoEditorTextClass(block.textSize);
  const title = block.title?.trim();
  const footer = block.footer?.trim();
  const imageInset = "2.5mm";
  const titleColor = resolveHeadingOverrideColor(
    state.brandProfile.h3HeadingColor,
    state.brandProfile.primaryColor,
    state.brandProfile.accentColor,
  );

  const removePair = (itemIndices: number[]) => {
    const nextItems = items.filter((_, index) => !itemIndices.includes(index));
    dispatch({ type: "UPDATE_BLOCK", payload: { id: block.id, updates: { items: nextItems } } });
    if (state.selectedBlockId === block.id) {
      dispatch({ type: "SET_ACTIVE_ITEM", payload: null });
    }
  };

  return (
    <div className="space-y-3" style={{ width: "fit-content", margin: "0 auto" }}>
      {title ? (
        <h3
          className="text-xl text-left"
          style={{
            width: "100%",
            fontWeight: 800,
            fontFamily: state.brandProfile.headlineFont,
            ...(titleColor ? { color: titleColor } : {}),
          }}
        >
          {title}
        </h3>
      ) : null}
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          width: "fit-content",
        }}
      >
        {pairs.map(({ pairIndex, pairLabel, pairItems, itemIndices }) => {
          const selectedAnchorIndex =
            state.activeItemIndex === null || pairingMode !== "same"
              ? state.activeItemIndex
              : state.activeItemIndex - (state.activeItemIndex % 2);

          return (
            <div key={`card-pairs-pair-${pairIndex}`} className="group relative">
              <div className="absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                {pairLabel}
              </div>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  removePair(itemIndices);
                }}
                className="absolute right-1 top-1 z-20 rounded-full bg-background/95 p-1 text-muted-foreground opacity-0 shadow-sm ring-1 ring-border transition-opacity group-hover:opacity-100 hover:text-red-600"
                title={state.localeMode === "DE" ? "Paar entfernen" : "Remove pair"}
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <div className="grid grid-cols-2 overflow-hidden rounded-md border border-border bg-background shadow-sm">
                {pairItems.map((item, itemOffset) => {
                  const itemIndex = itemIndices[itemOffset] ?? 0;
                  const displayItem = pairingMode === "same" && itemOffset === 1 ? pairItems[0] : item;
                  const isSelected =
                    state.selectedBlockId === block.id && (
                      state.activeItemIndex === itemIndex
                      || (pairingMode === "same" && selectedAnchorIndex === itemIndices[0])
                    );
                  const displayText = getCardPairDisplayText(pairItems[0], pairItems[1], itemOffset, pairingMode);
                  const showFooter = Boolean(footer) && itemOffset === 0;

                  return (
                    <button
                      key={item.id || itemIndex}
                      type="button"
                      onClick={() => {
                        dispatch({ type: "SELECT_BLOCK", payload: block.id });
                        dispatch({ type: "SET_ACTIVE_ITEM", payload: itemIndex });
                      }}
                      className={`relative flex h-[34mm] w-[34mm] flex-col p-2 text-left transition-colors ${itemOffset === 0 ? "border-r border-border" : ""} items-center justify-center ${isSelected ? "ring-2 ring-inset ring-primary" : "hover:bg-muted/20"}`}
                    >
                      {displayItem?.imageUrl ? (
                        <div
                          className="absolute overflow-hidden"
                          style={{
                            inset: imageInset,
                            borderRadius: "1.5mm",
                            backgroundImage: `url(${displayItem.imageUrl})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                            backgroundRepeat: "no-repeat",
                          }}
                        />
                      ) : (
                        <div className="absolute inset-2 rounded-sm border border-dashed border-border/80 bg-muted/20" />
                      )}
                      {displayText?.trim() ? (
                        <div className={`relative z-10 whitespace-pre-wrap text-center break-words bg-background/90 px-1 py-0.5 ${textClass}`} style={{ borderRadius: "1.5mm" }}>
                          {renderCardTextWithBlanks(displayText, "min-h-[1.05em]")}
                        </div>
                      ) : null}
                      {showFooter ? (
                        <div className="absolute left-2 top-1.5 z-10 max-w-[24mm] rounded-sm bg-background/80 px-1 py-0.5 text-left text-[8px] font-medium leading-none text-slate-600">
                          {footer}
                        </div>
                      ) : null}
                    </button>
                  );
                })}
                {pairItems.length === 1 ? <div className="h-[34mm] w-[34mm] bg-background" /> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SyllableCardsRenderer({ block }: { block: SyllableCardsBlock }) {
  const { state, dispatch } = useEditor();
  const items = getFlashcardItems(block.items);
  const textClass = getDominoEditorTextClass(block.textSize);
  const title = block.title?.trim();
  const footer = block.footer?.trim();
  const titleColor = resolveHeadingOverrideColor(
    state.brandProfile.h3HeadingColor,
    state.brandProfile.primaryColor,
    state.brandProfile.accentColor,
  );

  const removeItem = (itemIndex: number) => {
    const nextItems = items.filter((_, index) => index !== itemIndex);
    dispatch({ type: "UPDATE_BLOCK", payload: { id: block.id, updates: { items: nextItems } } });
    if (state.selectedBlockId === block.id) {
      dispatch({ type: "SET_ACTIVE_ITEM", payload: null });
    }
  };

  return (
    <div className="space-y-3" style={{ width: "fit-content", margin: "0 auto" }}>
      {title ? (
        <h3
          className="text-xl text-left"
          style={{
            width: "100%",
            fontWeight: 800,
            fontFamily: state.brandProfile.headlineFont,
            ...(titleColor ? { color: titleColor } : {}),
          }}
        >
          {title}
        </h3>
      ) : null}
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))", width: "fit-content" }}>
        {items.map((item, itemIndex) => {
          const isSelected = state.selectedBlockId === block.id && state.activeItemIndex === itemIndex;
          return (
            <div key={item.id || itemIndex} className="group relative">
              <div className="absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                {itemIndex + 1}
              </div>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  removeItem(itemIndex);
                }}
                className="absolute right-1 top-1 z-20 rounded-full bg-background/95 p-1 text-muted-foreground opacity-0 shadow-sm ring-1 ring-border transition-opacity group-hover:opacity-100 hover:text-red-600"
                title={state.localeMode === "DE" ? "Karte entfernen" : "Remove card"}
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  dispatch({ type: "SELECT_BLOCK", payload: block.id });
                  dispatch({ type: "SET_ACTIVE_ITEM", payload: itemIndex });
                }}
                className={`relative flex h-[28mm] w-[36mm] flex-col items-center justify-center overflow-hidden rounded-md border border-border bg-background px-2 pb-4 pt-2 text-left transition-colors ${isSelected ? "ring-2 ring-inset ring-primary" : "hover:bg-muted/20"}`}
                style={
                  item.imageUrl
                    ? {
                        backgroundImage: `url(${item.imageUrl})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                      }
                    : undefined
                }
              >
                {!item.imageUrl ? <div className="absolute inset-2 rounded-sm border border-dashed border-border/80 bg-muted/20" /> : null}
                {item.text?.trim() ? (
                  <div className={`relative z-10 rounded-sm bg-background/80 px-1 py-1 ${textClass}`}>
                    <SyllablesDisplay content={item.text} textClassName="text-inherit whitespace-pre-wrap text-center break-words" />
                  </div>
                ) : null}
                {footer ? (
                  <div className="absolute bottom-1.5 left-2 z-10 max-w-[24mm] rounded-sm bg-background/80 px-1 py-0.5 text-left text-[8px] font-medium leading-none text-slate-600">
                    {footer}
                  </div>
                ) : null}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AufgabenkartenRenderer({ block }: { block: AufgabenkartenBlock }) {
  const { state, dispatch } = useEditor();
  const items = block.items.length > 0
    ? block.items
    : Array.from({ length: 6 }, (_, index) => ({
        id: `aufgabenkarten-item-${index + 1}`,
        text: "",
        imageUrl: "",
      }));
  const textClass = getDominoEditorTextClass(block.textSize);
  const textAlign = block.textAlign ?? "left";
  const textVerticalAlign = block.textVerticalAlign ?? "top";
  const cardJustifyContent: React.CSSProperties["justifyContent"] = textVerticalAlign === "center" ? "center" : textVerticalAlign === "bottom" ? "flex-end" : "flex-start";
  const title = block.title?.trim();
  const subtitle = block.subtitle?.trim() || "";
  const logoSrc = resolveBrandLogo(applyBrandOverrides(state.brandProfile, state.settings.brandOverrides));
  const titleColor = resolveHeadingOverrideColor(
    state.brandProfile.h3HeadingColor,
    state.brandProfile.primaryColor,
    state.brandProfile.accentColor,
  );

  const removeItem = (itemIndex: number) => {
    const nextItems = items.filter((_, index) => index !== itemIndex);
    dispatch({ type: "UPDATE_BLOCK", payload: { id: block.id, updates: { items: nextItems } } });
    if (state.selectedBlockId === block.id) {
      dispatch({ type: "SET_ACTIVE_ITEM", payload: null });
    }
  };

  const glueEllipsis = (value: string) => value.replace(/\s…/g, "\u00A0…");

  const getCardContent = (item: AufgabenkartenBlock["items"][number]) => {
    const cardTitle = glueEllipsis(item.title?.trim() || "");
    const cardTask = glueEllipsis((item.task ?? item.text ?? "").trim());
    const chunkLine = glueEllipsis((item.chunks ?? []).map((chunk) => chunk.trim()).filter((chunk) => chunk.length > 0).join(" | "));
    return { cardTitle, cardTask, chunkLine };
  };

  return (
    <div className="space-y-3" style={{ width: "fit-content", margin: "0 auto" }}>
      {title ? (
        <h3
          className="text-xl text-left"
          style={{
            width: "100%",
            fontWeight: 800,
            fontFamily: state.brandProfile.headlineFont,
            ...(titleColor ? { color: titleColor } : {}),
          }}
        >
          {title}
        </h3>
      ) : null}
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))", width: "fit-content" }}>
        {items.map((item, itemIndex) => {
          const { cardTitle, cardTask, chunkLine } = getCardContent(item);
          const isSelected = state.selectedBlockId === block.id && state.activeItemIndex === itemIndex;
          const cardStyle: React.CSSProperties = {
            justifyContent: cardJustifyContent,
            ...(item.imageUrl
              ? {
                  backgroundImage: `url(${item.imageUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                }
              : {}),
          };
          return (
            <div key={item.id || itemIndex} className="group relative">
              <div className="absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                {itemIndex + 1}
              </div>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  removeItem(itemIndex);
                }}
                className="absolute right-1 top-1 z-20 rounded-full bg-background/95 p-1 text-muted-foreground opacity-0 shadow-sm ring-1 ring-border transition-opacity group-hover:opacity-100 hover:text-red-600"
                title={state.localeMode === "DE" ? "Karte entfernen" : "Remove card"}
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  dispatch({ type: "SELECT_BLOCK", payload: block.id });
                  dispatch({ type: "SET_ACTIVE_ITEM", payload: itemIndex });
                }}
                className={`relative flex h-[56mm] w-[36mm] flex-col items-stretch overflow-hidden rounded-md border border-border bg-background px-2 pb-8 pt-8 transition-colors ${isSelected ? "ring-2 ring-inset ring-primary" : "hover:bg-muted/20"}`}
                style={cardStyle}
              >
                {logoSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoSrc}
                    alt=""
                    style={{ position: "absolute", top: "4mm", right: "4mm", width: "auto", height: "7mm", objectFit: "contain" }}
                  />
                ) : null}
                {!item.imageUrl ? <div className="absolute inset-2 rounded-sm border border-dashed border-border/80 bg-muted/20" /> : null}
                {cardTitle || cardTask || chunkLine ? (
                  <div
                    className={`aufgabenkarten-card-content relative z-10 w-full rounded-sm bg-background/80 px-1 py-1 ${textClass}`}
                    style={{ textAlign }}
                  >
                    {cardTitle ? <h3>{cardTitle}</h3> : null}
                    {cardTask ? <p>{cardTask}</p> : null}
                    {chunkLine ? <p className="aufgabenkarten-chunks" style={{ color: state.brandProfile.primaryColor }}>{chunkLine}</p> : null}
                  </div>
                ) : null}
                {subtitle ? (
                  <div
                    className="absolute z-10 whitespace-pre-wrap break-words text-muted-foreground"
                    style={{ left: "3mm", bottom: "3mm", maxWidth: "calc(100% - 6mm)", fontSize: "10px", lineHeight: 1.15 }}
                  >
                    {subtitle}
                  </div>
                ) : null}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Dialogue ────────────────────────────────────────────────
function DialogueRenderer({
  block,
  interactive,
}: {
  block: DialogueBlock;
  interactive: boolean;
}) {
  const { state } = useEditor();
  const brandSlug = state.brandProfile.slug || state.settings.brand || "edoomio";
  const originalLeftColWidth = Math.max(
    20,
    Math.min(80, block.originalLeftColWidth ?? (block.originalColumnRatio === "3:2" ? 60 : 50)),
  );
  const originalColumnsStyle: React.CSSProperties = {
    gridTemplateColumns: `minmax(0, ${originalLeftColWidth}fr) minmax(0, ${100 - originalLeftColWidth}fr)`,
  };

  const renderSpeakerIcon = (icon: DialogueSpeakerIcon) => {
    return <DialogueSpeakerIconGlyph icon={icon} brandSlug={brandSlug} className="w-5 h-5 object-contain" />;
  };

  // Collect gap answers for word bank
  const gapAnswers: string[] = [];
  for (const item of block.items) {
    const matches = item.text.matchAll(/\{\{blank\*?(?:,[^:}]+)?(?::[^}]*)?\}\}/g);
    for (const m of matches) {
      const token = parseBlankToken(m[0]);
      const answer = token ? parseBlankContent(token.raw).answer.trim() : "";
      if (answer) gapAnswers.push(answer);
    }
  }
  const exampleAnswers = React.useMemo(() => {
    const exampleItem = block.showFirstAsExample ? block.items[0] : undefined;
    if (!exampleItem) return new Set<string>();
    const answers = new Set<string>();
    for (const match of exampleItem.text.matchAll(/\{\{blank\*?(?:,[^:}]+)?(?::[^}]*)?\}\}/g)) {
      const token = parseBlankToken(match[0]);
      const answer = token ? parseBlankContent(token.raw).answer.trim() : "";
      if (answer) answers.add(answer);
    }
    return answers;
  }, [block.items, block.showFirstAsExample]);

  const renderDialogueText = (text: string, variant: "default" | "original" | "solution", showExampleOnFirstBlank = false) => {
    if (variant === "original") {
      return text.replace(/\{\{blank\*?(?:,[^:}]+)?(?::[^}]*)?\}\}/g, (match) => {
        const token = parseBlankToken(match);
        const { answer } = parseBlankContent(token?.raw || "");
        return answer;
      });
    }

    const parts = text.split(/(\{\{blank\*?(?:,[^:}]+)?(?::[^}]*)?\}\})/g);
    const findAdjacentToken = (startIndex: number, direction: -1 | 1) => {
      for (let cursor = startIndex + direction; cursor >= 0 && cursor < parts.length; cursor += direction) {
        if (parts[cursor] !== "") return parts[cursor];
      }
      return "";
    };
    let exampleShown = false;
    return parts.map((part, i) => {
      const token = parseBlankToken(part);
      if (token) {
        const { answer, width } = parseBlankContent(token.raw);
        const widthStyle = getBlankWidthStyle(width, false);
        const previousPart = findAdjacentToken(i, -1);
        const nextPart = findAdjacentToken(i, 1);
        const previousIsBlank = parseBlankToken(previousPart) !== null;
        const nextIsBlank = parseBlankToken(nextPart) !== null;
        const halfInnerGap = "0.125rem";
        // Check if blank is at start: all parts before it are empty or whitespace-only
        const isAtStart = parts.slice(0, i).every(p => !p.trim());
        const spacing = getBlankSpacing(width, token.noSpace, nextPart);
        // Remove left margin if at start
        let adjustedSpacing = isAtStart && spacing.style
          ? { ...spacing, style: { ...spacing.style, marginLeft: "0" } }
          : spacing;
        if (previousIsBlank || nextIsBlank) {
          const styleFromClass = adjustedSpacing.className === "mx-1"
            ? { marginLeft: "0.25rem", marginRight: "0.25rem" }
            : adjustedSpacing.className === "mr-1"
              ? { marginRight: "0.25rem" }
              : {};
          adjustedSpacing = {
            ...adjustedSpacing,
            className: "",
            style: adjustedSpacing.style
              ? {
                  ...styleFromClass,
                  ...adjustedSpacing.style,
                  ...(previousIsBlank ? { marginLeft: halfInnerGap } : null),
                  ...(nextIsBlank ? { marginRight: "0" } : null),
                }
              : {
                  ...styleFromClass,
                  ...(previousIsBlank ? { marginLeft: halfInnerGap } : null),
                  ...(nextIsBlank ? { marginRight: "0" } : null),
                },
          };
        }
        const shouldRenderExample = showExampleOnFirstBlank && !exampleShown;
        const shouldRenderSolutionOverlay = variant === "solution";
        if (shouldRenderExample) {
          exampleShown = true;
          return (
            <span
              key={i}
              className={`relative inline-block rounded-[3px] bg-gray-100 text-center leading-5 ${adjustedSpacing.className} text-muted-foreground text-xs`}
              style={{ minHeight: "1.25rem", ...widthStyle, ...adjustedSpacing.style }}
            >
              <span aria-hidden="true" style={{ visibility: "hidden" }}>{answer || '\u00A0'}</span>
              <span
                className="flex flex-1 min-w-0 flex-wrap items-center gap-y-1"
                style={{
                  fontFamily: "var(--font-handwriting)",
                  fontWeight: 400,
                  fontSize: "18px",
                  color: "#0097dc",
                  lineHeight: 1,
                  whiteSpace: "nowrap",
                }}
              >
                {answer}
              </span>
            </span>
          );
        }
        if (interactive) {
          return (
          <input
            key={i}
            type="text"
            placeholder="…"
            className={`h-5 rounded-[3px] border-0 bg-transparent px-2 py-0 text-center leading-5 ${adjustedSpacing.className} focus:outline-none focus:ring-1 focus:ring-primary/50 inline`}
          />
          );
        }

        if (shouldRenderSolutionOverlay) {
          return (
            <span
              key={i}
              className={`relative inline-block rounded-[3px] bg-gray-100 text-center leading-5 ${adjustedSpacing.className} text-muted-foreground text-xs`}
              style={{ minHeight: "1.25rem", ...widthStyle, ...adjustedSpacing.style }}
            >
              <span aria-hidden="true" style={{ visibility: "hidden" }}>{answer || '\u00A0'}</span>
              <span
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{
                  fontFamily: "var(--font-handwriting)",
                  fontWeight: 400,
                  fontSize: "18px",
                  color: "#15803d",
                  lineHeight: 1,
                  whiteSpace: "nowrap",
                }}
              >
                {answer}
              </span>
            </span>
          );
        }

        return (
          <span
            key={i}
            className={`inline-block rounded-[3px] bg-gray-100 px-2 py-0 text-center leading-5 ${adjustedSpacing.className} text-muted-foreground text-xs`}
            style={{ minHeight: "1.25rem", ...widthStyle, ...adjustedSpacing.style }}
          >
            {variant === "default" ? (answer || '\u00A0') : '\u00A0'}
          </span>
        );
      }
      return <span key={i}>{part}</span>;;
    });
  };

  return (
    <div>
      {block.instruction && (
        <div className="flex min-h-[37px] items-center gap-3 border-b py-2 font-semibold text-[var(--color-primary)]">
          <span className="h-5 w-5 min-w-5 shrink-0 rounded-[3px] bg-slate-700 text-white flex items-center justify-center text-xs font-bold leading-none">A</span>
          <p>{block.instruction}</p>
        </div>
      )}
      {/* Word Bank */}
      {block.showWordBank && gapAnswers.length > 0 && (
        <div className="flex min-h-[37px] flex-wrap items-center gap-2 border-b py-2">
          <div className="flex flex-1 flex-wrap gap-2">
            {getDeterministicPreviewOrder(
              gapAnswers,
              (text, index) => `${text}:${index}`
            )
              .map((text, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 bg-background rounded border text-[10px]"
                  style={undefined}
                >
                  {exampleAnswers.has(text) ? <RoughExampleStrike>{text}</RoughExampleStrike> : text}
                </span>
              ))}
          </div>
        </div>
      )}
      {/* Dialogue items */}
      <div>
        {block.items.map((item, i) => {
          const prevItem = i > 0 ? block.items[i - 1] : null;
          const isBlankItem = !item.speaker && !item.text;
          const prevIsBlank = !!prevItem && !prevItem.speaker && !prevItem.text;
          const isSameSpeaker = prevItem && !prevIsBlank && prevItem.icon === item.icon;
          // Blank items keep the same row height but carry no number, so real
          // speaker rows stay continuously numbered across the gap.
          const displayNumber =
            block.items.slice(0, i + 1).filter((it) => it.speaker || it.text).length;

          if (isBlankItem) {
            return (
              <div key={item.id} className="min-h-[37px] border-b py-2" />
            );
          }

          return (
          <div key={item.id} className="flex min-h-[37px] items-center gap-3 border-b py-2">
            <ItemNumberBadge index={displayNumber} className="h-5 w-5 min-w-5 rounded-[3px] leading-none" />
            {isSameSpeaker ? (
              <span className="h-5 w-5 min-w-5 shrink-0" />
            ) : (
              <span className="h-5 w-5 min-w-5 shrink-0 text-muted-foreground flex items-center justify-center leading-none">
                {renderSpeakerIcon(item.icon)}
              </span>
            )}
            {block.showSpeakers ? (
              <span className="w-20 shrink-0 font-semibold leading-5">
                {item.speaker || "\u00A0"}
              </span>
            ) : null}
            {block.showOriginal ? (
              <div className="grid flex-1 gap-8 leading-5" style={originalColumnsStyle}>
                <div className="min-w-0">
                  {renderDialogueText(item.text, "default", !!block.showFirstAsExample && i === 0)}
                </div>
                <div className="min-w-0">
                  {renderDialogueText(item.text, "original")}
                </div>
              </div>
            ) : (
              <div className="flex flex-1 flex-wrap items-center leading-5">
                {renderDialogueText(item.text, "default", !!block.showFirstAsExample && i === 0)}
              </div>
            )}
          </div>
          );
        })}
      </div>
    </div>
  );
}

function LueckenzeilenRenderer({
  block,
  interactive,
}: {
  block: LueckenzeilenBlock;
  interactive: boolean;
}) {
  const originalLeftColWidth = Math.max(
    20,
    Math.min(80, block.originalLeftColWidth ?? (block.originalColumnRatio === "3:2" ? 60 : 50)),
  );
  const originalColumnsStyle: React.CSSProperties = {
    gridTemplateColumns: `minmax(0, ${originalLeftColWidth}fr) minmax(0, ${100 - originalLeftColWidth}fr)`,
  };

  const gapAnswers: string[] = [];
  for (const item of block.items) {
    const matches = item.text.matchAll(/\{\{blank\*?(?:,[^:}]+)?(?::[^}]*)?\}\}/g);
    for (const m of matches) {
      const token = parseBlankToken(m[0]);
      const answer = token ? parseBlankContent(token.raw).answer.trim() : "";
      if (answer) gapAnswers.push(answer);
    }
  }
  const exampleAnswers = React.useMemo(() => {
    const exampleItem = block.showFirstAsExample ? block.items[0] : undefined;
    if (!exampleItem) return new Set<string>();
    const answers = new Set<string>();
    for (const match of exampleItem.text.matchAll(/\{\{blank\*?(?:,[^:}]+)?(?::[^}]*)?\}\}/g)) {
      const token = parseBlankToken(match[0]);
      const answer = token ? parseBlankContent(token.raw).answer.trim() : "";
      if (answer) answers.add(answer);
    }
    return answers;
  }, [block.items, block.showFirstAsExample]);

  const renderLineText = (text: string, variant: "default" | "original" | "solution", showExampleOnFirstBlank = false) => {
    if (variant === "original") {
      return text.replace(/\{\{blank\*?(?:,[^:}]+)?(?::[^}]*)?\}\}/g, (match) => {
        const token = parseBlankToken(match);
        const { answer } = parseBlankContent(token?.raw || "");
        return answer;
      });
    }

    const parts = text.split(/(\{\{blank\*?(?:,[^:}]+)?(?::[^}]*)?\}\})/g);
    const findAdjacentToken = (startIndex: number, direction: -1 | 1) => {
      for (let cursor = startIndex + direction; cursor >= 0 && cursor < parts.length; cursor += direction) {
        if (parts[cursor] !== "") return parts[cursor];
      }
      return "";
    };
    let exampleShown = false;
    return parts.map((part, i) => {
      const token = parseBlankToken(part);
      if (token) {
        const { answer, width } = parseBlankContent(token.raw);
        const widthStyle = getBlankWidthStyle(width, false);
        const previousPart = findAdjacentToken(i, -1);
        const nextPart = findAdjacentToken(i, 1);
        const previousIsBlank = parseBlankToken(previousPart) !== null;
        const nextIsBlank = parseBlankToken(nextPart) !== null;
        const halfInnerGap = "0.125rem";
        const isAtStart = parts.slice(0, i).every(p => !p.trim());
        const spacing = getBlankSpacing(width, token.noSpace, nextPart);
        let adjustedSpacing = isAtStart && spacing.style
          ? { ...spacing, style: { ...spacing.style, marginLeft: "0" } }
          : spacing;
        if (previousIsBlank || nextIsBlank) {
          const styleFromClass = adjustedSpacing.className === "mx-1"
            ? { marginLeft: "0.25rem", marginRight: "0.25rem" }
            : adjustedSpacing.className === "mr-1"
              ? { marginRight: "0.25rem" }
              : {};
          adjustedSpacing = {
            ...adjustedSpacing,
            className: "",
            style: adjustedSpacing.style
              ? {
                  ...styleFromClass,
                  ...adjustedSpacing.style,
                  ...(previousIsBlank ? { marginLeft: halfInnerGap } : null),
                  ...(nextIsBlank ? { marginRight: "0" } : null),
                }
              : {
                  ...styleFromClass,
                  ...(previousIsBlank ? { marginLeft: halfInnerGap } : null),
                  ...(nextIsBlank ? { marginRight: "0" } : null),
                },
          };
        }
        const shouldRenderExample = showExampleOnFirstBlank && !exampleShown;
        const shouldRenderSolutionOverlay = variant === "solution";
        if (shouldRenderExample) {
          exampleShown = true;
          return (
            <span
              key={i}
              className={`relative inline-block rounded-[3px] bg-gray-100 text-center leading-5 ${adjustedSpacing.className} text-muted-foreground text-xs`}
              style={{ minHeight: "1.25rem", ...widthStyle, ...adjustedSpacing.style }}
            >
              <span aria-hidden="true" style={{ visibility: "hidden" }}>{answer || '\u00A0'}</span>
              <span
                className="flex flex-1 min-w-0 flex-wrap items-center gap-y-1"
                style={{
                  fontFamily: "var(--font-handwriting)",
                  fontWeight: 400,
                  fontSize: "18px",
                  color: "#0097dc",
                  lineHeight: 1,
                  whiteSpace: "nowrap",
                }}
              >
                {answer}
              </span>
            </span>
          );
        }
        if (interactive) {
          return (
          <input
            key={i}
            type="text"
            placeholder="…"
            className={`h-5 rounded-[3px] border-0 bg-transparent px-2 py-0 text-center leading-5 ${adjustedSpacing.className} focus:outline-none focus:ring-1 focus:ring-primary/50 inline`}
          />
          );
        }

        if (shouldRenderSolutionOverlay) {
          return (
            <span
              key={i}
              className={`relative inline-block rounded-[3px] bg-gray-100 text-center leading-5 ${adjustedSpacing.className} text-muted-foreground text-xs`}
              style={{ minHeight: "1.25rem", ...widthStyle, ...adjustedSpacing.style }}
            >
              <span aria-hidden="true" style={{ visibility: "hidden" }}>{answer || '\u00A0'}</span>
              <span
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{
                  fontFamily: "var(--font-handwriting)",
                  fontWeight: 400,
                  fontSize: "18px",
                  color: "#15803d",
                  lineHeight: 1,
                  whiteSpace: "nowrap",
                }}
              >
                {answer}
              </span>
            </span>
          );
        }

        return (
          <span
            key={i}
            className={`inline-block rounded-[3px] bg-gray-100 px-2 py-0 text-center leading-5 ${adjustedSpacing.className} text-muted-foreground text-xs`}
            style={{ minHeight: "1.25rem", ...widthStyle, ...adjustedSpacing.style }}
          >
            {variant === "default" ? (answer || '\u00A0') : '\u00A0'}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div>
      {block.instruction && (
        <div className="flex min-h-[37px] items-center gap-3 border-b py-2 font-semibold text-[var(--color-primary)]">
          <span className="h-5 w-5 min-w-5 shrink-0 rounded-[3px] bg-slate-700 text-white flex items-center justify-center text-xs font-bold leading-none">A</span>
          <p>{block.instruction}</p>
        </div>
      )}
      {block.showWordBank && gapAnswers.length > 0 && (
        <div className="flex min-h-[37px] flex-wrap items-center gap-2 border-b py-2">
          <div className="flex flex-1 flex-wrap gap-2">
            {getDeterministicPreviewOrder(
              gapAnswers,
              (text, index) => `${text}:${index}`
            )
              .map((text, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 bg-background rounded border text-[10px]"
                  style={undefined}
                >
                  {exampleAnswers.has(text) ? <RoughExampleStrike>{text}</RoughExampleStrike> : text}
                </span>
              ))}
          </div>
        </div>
      )}
      <div>
        {block.items.map((item, i) => (
          <div key={item.id} className="flex min-h-[37px] items-center gap-3 border-b py-2">
            <ItemNumberBadge index={i + 1} className="h-5 w-5 min-w-5 rounded-[3px] leading-none" />
            {block.showOriginal ? (
              <div className="grid flex-1 gap-8 leading-5" style={originalColumnsStyle}>
                <div className="min-w-0">
                  {renderLineText(item.text, "default", !!block.showFirstAsExample && i === 0)}
                </div>
                <div className="min-w-0">
                  {renderLineText(item.text, "original")}
                </div>
              </div>
            ) : (
              <div className="flex flex-1 flex-wrap items-center leading-5">
                {renderLineText(item.text, "default", !!block.showFirstAsExample && i === 0)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Chart ───────────────────────────────────────────────────
const ChartContent = dynamic(
  () => import("@/components/chart/chart-view").then((m) => m.ChartContent),
  { ssr: false, loading: () => <div className="w-full h-[300px] bg-muted/30 animate-pulse rounded" /> }
);

function ChartRenderer({ block }: { block: ChartBlock }) {
  const { dispatch } = useEditor();
  const { localeUpdate } = useLocaleAwareEdit();
  const t = useTranslations("blockRenderer");

  const handleTitleChange = (title: string) => {
    localeUpdate(block.id, "title", title, () =>
      dispatch({ type: "UPDATE_BLOCK", payload: { id: block.id, updates: { title } } })
    );
  };

  return (
    <div className="space-y-2">
      {/* Editable title */}
      <input
        type="text"
        value={block.title || ""}
        onChange={(e) => handleTitleChange(e.target.value)}
        placeholder={t("chartTitlePlaceholder")}
        className="w-full text-center text-lg font-semibold bg-transparent border-none outline-none placeholder:text-muted-foreground/50"
      />
      <ChartContent block={block} />
    </div>
  );
}

// ─── Numbered Label ─────────────────────────────────────────
function NumberedLabelRenderer({ block }: { block: NumberedLabelBlock }) {
  const { state, dispatch } = useEditor();
  const primaryColor = state.brandProfile.primaryColor || "#1a1a1a";

  // Compute the ordinal position of this block among all numbered-label blocks
  const allNL = React.useMemo(() => collectNumberedLabelBlocks(state.blocks), [state.blocks]);
  const index = allNL.findIndex((b) => b.id === block.id);
  const displayNumber = String(block.startNumber + (index >= 0 ? index : 0)).padStart(2, "0");

  return (
    <div className="rounded px-2 py-1" style={{ backgroundColor: `${primaryColor}14` }}>
      <span className="font-semibold" style={{ paddingLeft: '2em', textIndent: '-2em', display: 'block', color: primaryColor }}>
        {block.prefix}{displayNumber}{block.suffix ? `\u2003${block.suffix}` : ''}
      </span>
    </div>
  );
}

// ─── Linked Blocks Renderer ─────────────────────────────────
function LinkedBlocksRenderer({ block }: { block: LinkedBlocksBlock }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-sm border-2 border-dashed border-primary/30 bg-primary/5">
      <div className="h-10 w-10 rounded-sm bg-primary/10 flex items-center justify-center shrink-0">
        <Link2 className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">
          {block.worksheetTitle || "Linked Worksheet"}
        </p>
        <p className="text-xs text-muted-foreground">
          Linked worksheet blocks · /{block.worksheetSlug}
        </p>
      </div>
      <a
        href={`/editor/${block.worksheetId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-sm border hover:bg-muted transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        <ExternalLink className="h-3.5 w-3.5" />
        Edit
      </a>
    </div>
  );
}

// ─── Dos and Don'ts ─────────────────────────────────────────

function DosAndDontsRenderer({ block }: { block: DosAndDontsBlock }) {
  const { dispatch } = useEditor();
  const { localeUpdate } = useLocaleAwareEdit();

  const updateItem = (
    list: "dos" | "donts",
    index: number,
    text: string
  ) => {
    localeUpdate(block.id, `${list}.${index}.text`, text, () => {
      const newItems = [...block[list]];
      newItems[index] = { ...newItems[index], text };
      dispatch({
        type: "UPDATE_BLOCK",
        payload: { id: block.id, updates: { [list]: newItems } },
      });
    });
  };

  const addItem = (list: "dos" | "donts") => {
    const newItems = [
      ...block[list],
      { id: crypto.randomUUID(), text: "" },
    ];
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { [list]: newItems } },
    });
  };

  const removeItem = (list: "dos" | "donts", index: number) => {
    if (block[list].length <= 1) return;
    const newItems = block[list].filter((_, i) => i !== index);
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { [list]: newItems } },
    });
  };

  const renderList = (
    list: "dos" | "donts",
    title: string,
    titleField: "dosTitle" | "dontsTitle",
    color: string,
    icon: React.ReactNode
  ) => (
    <div className={block.layout === "vertical" ? "w-full" : "flex-1 min-w-[200px]"}>
      {block.showTitles !== false && (
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center ${color}`}>
            {icon}
          </div>
          <input
            type="text"
            value={title}
            onChange={(e) => {
              localeUpdate(block.id, titleField, e.target.value, () => {
                dispatch({
                  type: "UPDATE_BLOCK",
                  payload: { id: block.id, updates: { [titleField]: e.target.value } },
                });
              });
            }}
            className="font-semibold text-base bg-transparent border-none outline-none flex-1"
          />
        </div>
      )}
      <div className="space-y-2">
        {block[list].map((item, i) => (
          <div key={item.id} className="flex items-start gap-2 group">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center mt-0.5 shrink-0 ${color}`}>
              {icon}
            </div>
            <input
              type="text"
              value={item.text}
              onChange={(e) => updateItem(list, i, e.target.value)}
              placeholder="…"
              className="flex-1 bg-transparent border-none outline-none border-b border-transparent hover:border-muted-foreground/20 focus:border-primary transition-colors"
            />
            <button
              onClick={() => removeItem(list, i)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <button
          onClick={() => addItem(list)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
        >
          <Plus className="h-3 w-3" /> Add
        </button>
      </div>
    </div>
  );

  return (
    <div className={block.layout === "vertical" ? "flex flex-col gap-6" : "flex gap-6 flex-wrap"}>
      {renderList(
        "dos",
        block.dosTitle,
        "dosTitle",
        "bg-emerald-100 text-emerald-600",
        <Check className="h-3.5 w-3.5" />
      )}
      {renderList(
        "donts",
        block.dontsTitle,
        "dontsTitle",
        "bg-red-100 text-red-500",
        <X className="h-3.5 w-3.5" />
      )}
    </div>
  );
}

// ─── Text Comparison (Textvergleich) ─────────────────────────

function TextComparisonRenderer({ block }: { block: TextComparisonBlock }) {
  const { dispatch } = useEditor();
  const { localeUpdate } = useLocaleAwareEdit();

  const chColor = "#3A4F40";
  const deColor = "#990033";

  const renderSide = (
    side: "left" | "right",
    content: string,
    field: "leftContent" | "rightContent",
    color: string,
    flagSrc: string,
  ) => (
    <div className="flex-1 min-w-0">
      <div className="flex">
        <div
          className="py-1 text-xs font-semibold rounded-t-sm text-center uppercase flex items-center justify-center border border-b-0"
          style={{ width: 44, paddingLeft: 12, paddingRight: 12, borderColor: color }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={flagSrc} alt="" className="h-4 w-6 object-cover" />
        </div>
      </div>
      <div
        className="border border-dashed rounded-sm rounded-tl-none py-3 pr-3 pl-6"
        style={{ borderColor: color, color }}
      >
        <RichTextEditor
          content={content}
          onChange={(html) =>
            localeUpdate(block.id, field, html, () =>
              dispatch({ type: "UPDATE_BLOCK", payload: { id: block.id, updates: { [field]: html } } })
            )
          }
          placeholder="…"
        />
      </div>
    </div>
  );

  return (
    <div className="flex gap-4">
      {renderSide("left", block.leftContent, "leftContent", chColor, "/flags/ch.svg")}
      {renderSide("right", block.rightContent, "rightContent", deColor, "/flags/de.svg")}
    </div>
  );
}

// ─── Numbered Items ─────────────────────────────────────────

/** Returns true if the hex color is dark enough to warrant white text. */
function isDarkColor(hex: string): boolean {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  const toLinear = (c: number) => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const L = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return L < 0.35;
}

function mixColorWithWhite(color: string, whiteRatio: number): string {
  const hex = color.trim();
  const match = hex.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!match) return `color-mix(in srgb, ${color} ${Math.round((1 - whiteRatio) * 100)}%, white)`;

  const raw = match[1].length === 3
    ? match[1].split("").map((char) => `${char}${char}`).join("")
    : match[1];
  const channels = [0, 2, 4].map((start) => parseInt(raw.slice(start, start + 2), 16));
  const mixed = channels.map((channel) => Math.round(channel + (255 - channel) * whiteRatio));
  return `#${mixed.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

// Marker shown for a sub-item given the configured style.
function numberedSubItemMarker(style: NumberedSubItemStyle | undefined, parentLabel: string, subIndex: number): string {
  switch (style) {
    case "letter":
      return `${String.fromCharCode(97 + (subIndex % 26))})`;
    case "bullet":
      return "•";
    case "plain":
      return "";
    case "decimal":
    default:
      return `${parentLabel}.${subIndex + 1}`;
  }
}

function NumberedItemsRenderer({ block }: { block: NumberedItemsBlock }) {
  const { state, dispatch } = useEditor();
  const { localeUpdate } = useLocaleAwareEdit();
  const textBaseSize = state.brandProfile.textBaseSize;

  const updateItem = (index: number, content: string) => {
    localeUpdate(block.id, `items.${index}.content`, content, () => {
      const newItems = [...block.items];
      newItems[index] = { ...newItems[index], content };
      dispatch({
        type: "UPDATE_BLOCK",
        payload: { id: block.id, updates: { items: newItems } },
      });
    });
  };

  const addItem = () => {
    const newItems = [
      ...block.items,
      { id: crypto.randomUUID(), content: "" },
    ];
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: newItems } },
    });
  };

  const removeItem = (index: number) => {
    if (block.items.length <= 1) return;
    const newItems = block.items.filter((_, i) => i !== index);
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: newItems } },
    });
  };

  // ── sub-items ──────────────────────────────────────────────
  const updateSubItem = (parentIndex: number, subIndex: number, content: string) => {
    localeUpdate(block.id, `items.${parentIndex}.subItems.${subIndex}.content`, content, () => {
      const newItems = block.items.map((it) => ({ ...it, subItems: it.subItems ? [...it.subItems] : it.subItems }));
      const subs = [...(newItems[parentIndex].subItems ?? [])];
      subs[subIndex] = { ...subs[subIndex], content };
      newItems[parentIndex] = { ...newItems[parentIndex], subItems: subs };
      dispatch({
        type: "UPDATE_BLOCK",
        payload: { id: block.id, updates: { items: newItems } },
      });
    });
  };

  const addSubItem = (parentIndex: number) => {
    const newItems = block.items.map((it) => ({ ...it }));
    newItems[parentIndex] = {
      ...newItems[parentIndex],
      subItems: [...(newItems[parentIndex].subItems ?? []), { id: crypto.randomUUID(), content: "" }],
    };
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: newItems } },
    });
  };

  const removeSubItem = (parentIndex: number, subIndex: number) => {
    const newItems = block.items.map((it) => ({ ...it }));
    newItems[parentIndex] = {
      ...newItems[parentIndex],
      subItems: (newItems[parentIndex].subItems ?? []).filter((_, i) => i !== subIndex),
    };
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: newItems } },
    });
  };

  // Move a sub-item up/down. At a parent boundary it flows into the
  // adjacent parent item (so sub-items can be moved between items).
  const moveSubItem = (parentIndex: number, subIndex: number, direction: "up" | "down") => {
    const newItems = block.items.map((it) => ({ ...it, subItems: [...(it.subItems ?? [])] }));
    const subs = newItems[parentIndex].subItems!;
    if (direction === "up") {
      if (subIndex > 0) {
        [subs[subIndex - 1], subs[subIndex]] = [subs[subIndex], subs[subIndex - 1]];
      } else if (parentIndex > 0) {
        const [moved] = subs.splice(subIndex, 1);
        newItems[parentIndex - 1].subItems!.push(moved);
      } else {
        return;
      }
    } else {
      if (subIndex < subs.length - 1) {
        [subs[subIndex + 1], subs[subIndex]] = [subs[subIndex], subs[subIndex + 1]];
      } else if (parentIndex < newItems.length - 1) {
        const [moved] = subs.splice(subIndex, 1);
        newItems[parentIndex + 1].subItems!.unshift(moved);
      } else {
        return;
      }
    }
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: newItems } },
    });
  };

  const isFirstSub = (parentIndex: number, subIndex: number) => parentIndex === 0 && subIndex === 0;
  const isLastSub = (parentIndex: number, subIndex: number) =>
    parentIndex === block.items.length - 1 &&
    subIndex === (block.items[parentIndex].subItems?.length ?? 0) - 1;

  const hasBg = !!block.bgColor;
  const textWhite = hasBg && isDarkColor(block.bgColor!);
  const radius = block.borderRadius ?? 6;
  const surfaceBg = hasBg ? `${block.bgColor}${textWhite ? '18' : '40'}` : undefined;
  const primaryColor = state.brandProfile.primaryColor || "#1a1a1a";
  const numberToneBg = mixColorWithWhite(primaryColor, 0.88);
  const rowToneBg = mixColorWithWhite(primaryColor, 0.96);
  const itemGap = block.itemGap ?? 8;

  return (
    <div style={{ display: "grid", gap: `${itemGap}px` }}>
      {block.items.map((item, i) => {
        const parentLabel = String(block.startNumber + i).padStart(2, '0');
        return (
        <div key={item.id} className="space-y-2">
          <div className="relative group">
            <div
              className="flex gap-0"
              style={{
                backgroundColor: hasBg ? surfaceBg : rowToneBg,
                borderRadius: `${radius}px`,
              }}
            >
              <div
                className="shrink-0 w-[30px] flex items-center justify-center font-bold"
                style={{
                  backgroundColor: hasBg ? block.bgColor : numberToneBg,
                  color: hasBg ? (textWhite ? '#fff' : '#000') : primaryColor,
                  borderRadius: hasBg ? `${radius}px 0 0 ${radius}px` : `${radius}px`,
                  ...(textBaseSize ? { fontSize: textBaseSize } : {}),
                }}
              >
                {parentLabel}
              </div>
              <div
                className="numbered-items-richtext flex-1 min-w-0 px-3 py-2.5 text-foreground font-normal bg-white"
                style={{
                  borderRadius: hasBg ? `0 ${radius}px ${radius}px 0` : `${radius}px`,
                  border: "1px solid #e5e7eb",
                  color: primaryColor,
                  paddingTop: "0.875rem",
                  paddingBottom: "0.875rem",
                }}
              >
                <RichTextEditor
                  content={item.content}
                  onChange={(html) => updateItem(i, html)}
                  placeholder="…"
                  editorClassName="tiptap prose prose-sm max-w-none focus:outline-none px-0 py-0 font-normal"
                />
              </div>
            </div>
            <div className="absolute top-1 right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => addSubItem(i)}
                title="Add sub-item"
                className="text-muted-foreground hover:text-foreground"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => removeItem(i)}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          {/* sub-items */}
          {(item.subItems?.length ?? 0) > 0 && (
            <div className="space-y-1.5 pb-1">
              {item.subItems!.map((sub, si) => {
                const marker = numberedSubItemMarker(block.subItemStyle, parentLabel, si);
                return (
                  <div
                    key={sub.id}
                    className="relative group flex items-start gap-2 bg-white border border-border px-2.5 py-1.5"
                    style={{ borderRadius: `${radius}px` }}
                  >
                    {marker && (
                      <span
                        className="shrink-0 text-muted-foreground font-medium pt-1 tabular-nums"
                        style={textBaseSize ? { fontSize: textBaseSize } : undefined}
                      >
                        {marker}
                      </span>
                    )}
                    <div className="numbered-items-richtext flex-1 min-w-0 text-foreground font-normal">
                      <RichTextEditor
                        content={sub.content}
                        onChange={(html) => updateSubItem(i, si, html)}
                        placeholder="…"
                        editorClassName="tiptap prose prose-sm max-w-none focus:outline-none px-0 py-0 text-foreground font-normal"
                      />
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 pt-0.5">
                      <button
                        onClick={() => moveSubItem(i, si, "up")}
                        disabled={isFirstSub(i, si)}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => moveSubItem(i, si, "down")}
                        disabled={isLastSub(i, si)}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => removeSubItem(i, si)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        );
      })}
      <button
        onClick={addItem}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors ml-11"
      >
        <Plus className="h-3 w-3" /> Add
      </button>
    </div>
  );
}

function SubjectRenderer({ block }: { block: SubjectBlock }) {
  const { state, dispatch } = useEditor();
  const { localeUpdate } = useLocaleAwareEdit();
  const textBaseSize = state.brandProfile.textBaseSize;

  const updateItem = (index: number, content: string) => {
    localeUpdate(block.id, `items.${index}.content`, content, () => {
      const newItems = [...block.items];
      newItems[index] = { ...newItems[index], content };
      dispatch({
        type: "UPDATE_BLOCK",
        payload: { id: block.id, updates: { items: newItems } },
      });
    });
  };

  const addItem = () => {
    const newItems = [
      ...block.items,
      { id: crypto.randomUUID(), content: "" },
    ];
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: newItems } },
    });
  };

  const removeItem = (index: number) => {
    if (block.items.length <= 1) return;
    const newItems = block.items.filter((_, i) => i !== index);
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: newItems } },
    });
  };

  const hasBg = !!block.bgColor;
  const textWhite = hasBg && isDarkColor(block.bgColor!);
  const radius = block.borderRadius ?? 6;
  const surfaceBg = hasBg ? `${block.bgColor}${textWhite ? '18' : '40'}` : undefined;

  return (
    <div className="space-y-2">
      {block.items.map((item, i) => (
        <div key={item.id} className="relative group">
          <div
            className="flex gap-0"
            style={hasBg ? {
              backgroundColor: surfaceBg,
              borderRadius: `${radius}px`,
            } : undefined}
          >
            <div className="subject-richtext flex-1 min-w-0 px-3 py-1.5 text-foreground font-normal">
              <RichTextEditor
                content={item.content}
                onChange={(html) => updateItem(i, html)}
                placeholder="…"
                editorClassName="tiptap prose prose-sm max-w-none focus:outline-none px-0 py-0 text-foreground font-normal"
              />
            </div>
          </div>
          <button
            onClick={() => removeItem(i)}
            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <button
        onClick={addItem}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Plus className="h-3 w-3" /> Add
      </button>
    </div>
  );
}

function BoxRenderer({ block }: { block: BoxBlock }) {
  const { state, dispatch } = useEditor();
  const { localeUpdate } = useLocaleAwareEdit();
  const textBaseSize = state.brandProfile.textBaseSize;
  const blockGap = state.brandProfile.blockGap;
  const radius = block.borderRadius ?? 6;

  const updateItem = (index: number, content: string) => {
    localeUpdate(block.id, `items.${index}.content`, content, () => {
      const newItems = [...block.items];
      newItems[index] = { ...newItems[index], content };
      dispatch({
        type: "UPDATE_BLOCK",
        payload: { id: block.id, updates: { items: newItems } },
      });
    });
  };

  const addItem = () => {
    const newItems = [
      ...block.items,
      { id: crypto.randomUUID(), content: "" },
    ];
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: newItems } },
    });
  };

  const removeItem = (index: number) => {
    if (block.items.length <= 1) return;
    const newItems = block.items.filter((_, i) => i !== index);
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: newItems } },
    });
  };

  const title = (block.title || "").trim();

  return (
    <div className="space-y-2">
      <div style={block.addTopBlockGap ? { paddingTop: blockGap || "1.5rem" } : undefined}>
        <div
          className="relative border text-foreground px-3 py-2"
          style={{
            borderRadius: `${radius}px`,
            borderColor: "currentColor",
          }}
        >
        {title ? (
          <div className="absolute -top-2 left-3 bg-white px-2 text-xs font-semibold leading-none" style={textBaseSize ? { fontSize: `calc(${textBaseSize} * 0.85)` } : undefined}>
            {title}
          </div>
        ) : null}
        <div className="space-y-2">
          {block.items.map((item, i) => (
            <div key={item.id} className="relative group">
              <div className="box-richtext min-w-0 pl-2 pr-0 py-1 text-foreground font-normal">
                <RichTextEditor
                  content={item.content}
                  onChange={(html) => updateItem(i, html)}
                  placeholder="…"
                  editorClassName="tiptap prose prose-sm max-w-none focus:outline-none px-0 py-0 text-foreground font-normal"
                />
              </div>
              <button
                onClick={() => removeItem(i)}
                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
        </div>
      </div>
      <button
        onClick={addItem}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Plus className="h-3 w-3" /> Add
      </button>
    </div>
  );
}

function QuartettRenderer({ block }: { block: QuartettBlock }) {
  const showGroupTitle = block.showGroupTitle !== false;
  const showFooter = block.showFooter !== false;
  const cards = block.items.flatMap((item) =>
    item.subitems.map((subitem, highlightIndex) => ({
      id: `${item.id}-${subitem.id}`,
      title: item.title?.trim() || "",
      highlight: subitem.content,
      others: item.subitems
        .filter((_, index) => index !== highlightIndex)
        .map((entry) => entry.content)
        .filter((entry) => entry.trim().length > 0),
    }))
  );
  const blockTitle = block.title?.trim();
  const promptLines = [
    { id: "question", icon: FileQuestion, text: "Hast du… ?" },
    { id: "yes", icon: Plus, text: "Ja, … habe ich. Hier bitte." },
    { id: "no", icon: Minus, text: "Nein, … habe ich nicht." },
  ];
  const reservedTitleHeight = "1.75rem";

  return (
    <div className="space-y-4">
      {blockTitle ? (
        <h3 className="text-lg font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {blockTitle}
        </h3>
      ) : null}
      <div className="grid gap-4 justify-center" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
        {cards.map((card) => (
          <div
            key={card.id}
            className="relative overflow-hidden rounded-md border border-border bg-background p-4"
            style={{ aspectRatio: "58 / 90", minHeight: "220px" }}
          >
            <div
              className="pr-10 text-xs font-semibold tracking-wider text-primary"
              style={{ minHeight: reservedTitleHeight }}
            >
              {showGroupTitle ? card.title : ""}
            </div>
            <div className="space-y-3 pt-3">
              <div className="text-base font-bold leading-snug whitespace-pre-wrap break-words">
                {card.highlight || "..."}
              </div>
              <div className="border-t pt-3 space-y-2 text-base leading-snug text-muted-foreground" style={{ borderTopColor: "currentColor" }}>
                {card.others.map((entry, index) => (
                  <div
                    key={`${card.id}-other-${index}`}
                    className={`whitespace-pre-wrap break-words ${index === 0 ? "" : "border-t border-slate-200 pt-2"}`}
                  >
                    {entry}
                  </div>
                ))}
              </div>
              {showFooter ? (
                <div className="mt-auto w-full pt-3 text-[13px] leading-tight text-muted-foreground">
                  {promptLines.map((line, index) => {
                    const Icon = line.icon;
                    return (
                      <div
                        key={`${card.id}-prompt-${line.id}`}
                        className={`flex items-center justify-start gap-1.5 text-left ${index === 0 ? "" : "border-t border-slate-100 pt-2"}`}
                      >
                        <Icon className="h-3 w-3 shrink-0" />
                        <span>{line.text}</span>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TabooRenderer({ block }: { block: TabooBlock }) {
  const cards = block.items.map((item) => ({
    id: item.id,
    word: item.title?.trim() || "",
    stopWords: item.subitems
      .map((entry) => entry.content)
      .filter((entry) => entry.trim().length > 0),
  }));
  const blockTitle = block.title?.trim();
  const subtitle = block.subtitle?.trim() || "";
  const reservedTitleHeight = "1.75rem";
  const isTenStopWordVariant = block.stopWordCount === 10 || block.items.some((item) => item.subitems.length > 4);
  const cardWidthMm = isTenStopWordVariant ? 80 : 58;
  const columns = isTenStopWordVariant ? 2 : 4;

  return (
    <div className="space-y-4">
      {blockTitle ? (
        <h3 className="text-lg font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {blockTitle}
        </h3>
      ) : null}
      <div
        className="grid gap-4 justify-center"
        style={{ gridTemplateColumns: isTenStopWordVariant ? `repeat(${columns}, ${cardWidthMm}mm)` : "repeat(4, minmax(0, 1fr))" }}
      >
        {cards.map((card) => (
          <div
            key={card.id}
            className="relative overflow-hidden rounded-md border border-border bg-background p-4"
            style={isTenStopWordVariant
              ? { width: `${cardWidthMm}mm`, height: "111mm" }
              : { aspectRatio: "58 / 90", minHeight: "220px" }}
          >
            <div style={{ minHeight: reservedTitleHeight }} />
            <div className="space-y-3 pt-3 pb-6">
              <div className="text-lg font-bold leading-snug whitespace-pre-wrap break-words text-foreground">
                {card.word || "..."}
              </div>
              <div className="border-t pt-3 space-y-2 text-base leading-snug text-muted-foreground" style={{ borderTopColor: "currentColor" }}>
                {card.stopWords.map((entry, index) => (
                  <div
                    key={`${card.id}-stop-${index}`}
                    className={`flex items-start gap-2 whitespace-pre-wrap break-words ${index === 0 ? "" : "border-t border-slate-200 pt-2"}`}
                  >
                    <TriangleAlert className="mt-1 h-4 w-4 shrink-0" style={{ color: "#990000" }} />
                    <span>{entry}</span>
                  </div>
                ))}
              </div>
            </div>
            {subtitle ? (
              <div
                className="absolute text-muted-foreground whitespace-pre-wrap break-words"
                style={{ left: "3mm", bottom: "3mm", maxWidth: "calc(100% - 6mm)", fontSize: "10px", lineHeight: 1.15 }}
              >
                {subtitle}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Checklist block ─────────────────────────────────────────
function ChecklistRenderer({ block }: { block: ChecklistBlock }) {
  const { dispatch } = useEditor();
  const { localeUpdate } = useLocaleAwareEdit();

  const updateItem = (index: number, content: string) => {
    localeUpdate(block.id, `items.${index}.content`, content, () => {
      const newItems = [...block.items];
      newItems[index] = { ...newItems[index], content };
      dispatch({
        type: "UPDATE_BLOCK",
        payload: { id: block.id, updates: { items: newItems } },
      });
    });
  };

  const addItem = () => {
    const newItems = [
      ...block.items,
      { id: crypto.randomUUID(), content: "" } as ChecklistItem,
    ];
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: newItems } },
    });
  };

  const removeItem = (index: number) => {
    if (block.items.length <= 1) return;
    const newItems = block.items.filter((_, i) => i !== index);
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: newItems } },
    });
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    const newItems = [...block.items];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: newItems } },
    });
  };

  const adjustLines = (index: number, delta: number) => {
    const newItems = [...block.items];
    const current = newItems[index].writingLines ?? 0;
    const next = Math.max(0, current + delta);
    newItems[index] = { ...newItems[index], writingLines: next };
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: newItems } },
    });
  };

  return (
    <div className="divide-y divide-border/40">
      {block.items.map((item, i) => (
        <div key={item.id} className="flex items-start gap-2 group py-2">
          <Square className="h-4 w-4 shrink-0 text-muted-foreground" style={{ marginTop: "0.2em" }} />
          <div className="flex-1 min-w-0 tiptap-compact">
            <RichTextEditor
              content={item.content}
              onChange={(html) => updateItem(i, html)}
              placeholder="…"
              editorClassName="prose prose-sm max-w-none focus:outline-none px-0 py-0"
            />
            {(item.writingLines ?? 0) > 0 && (
              <div className="mt-1 space-y-1.5 pointer-events-none">
                {Array.from({ length: item.writingLines! }).map((_, li) => (
                  <div key={li} style={{ height: 20, borderBottom: "1px dashed var(--color-muted-foreground)", opacity: 0.4 }} />
                ))}
              </div>
            )}
          </div>
          {/* hover controls */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">
            <button
              onClick={() => moveItem(i, "up")}
              disabled={i === 0}
              className="text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => moveItem(i, "down")}
              disabled={i === block.items.length - 1}
              className="text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            <span className="text-border/60 select-none text-xs px-0.5">|</span>
            <button
              onClick={() => adjustLines(i, -1)}
              disabled={(item.writingLines ?? 0) === 0}
              className="text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="text-xs text-muted-foreground w-3 text-center tabular-nums">
              {item.writingLines ?? 0}
            </span>
            <button
              onClick={() => adjustLines(i, 1)}
              className="text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            <span className="text-border/60 select-none text-xs px-0.5">|</span>
            <button
              onClick={() => removeItem(i)}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}
      <button
        onClick={addItem}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors pt-2 ml-6"
      >
        <Plus className="h-3 w-3" /> Add
      </button>
    </div>
  );
}

// ─── Accordion block ─────────────────────────────────────────
function AccordionRenderer({ block, mode }: { block: AccordionBlock; mode: ViewMode }) {
  const { dispatch } = useEditor();
  const { localeUpdate } = useLocaleAwareEdit();
  const [openIndex, setOpenIndex] = React.useState<number | null>(0);

  const updateTitle = (index: number, title: string) => {
    localeUpdate(block.id, `items.${index}.title`, title, () => {
      const newItems = [...block.items];
      newItems[index] = { ...newItems[index], title };
      dispatch({
        type: "UPDATE_BLOCK",
        payload: { id: block.id, updates: { items: newItems } },
      });
    });
  };

  const addItem = () => {
    const newItems = [
      ...block.items,
      { id: crypto.randomUUID(), title: "", children: [] as WorksheetBlock[] },
    ];
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: newItems } },
    });
    setOpenIndex(newItems.length - 1);
  };

  const removeItem = (index: number) => {
    if (block.items.length <= 1) return;
    const newItems = block.items.filter((_, i) => i !== index);
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: newItems } },
    });
    if (openIndex === index) setOpenIndex(null);
    else if (openIndex !== null && openIndex > index) setOpenIndex(openIndex - 1);
  };

  return (
    <div className="space-y-0">
      {block.items.map((item, i) => (
        <div key={item.id} className="relative group overflow-hidden">
          <div
            role="button"
            tabIndex={0}
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setOpenIndex(openIndex === i ? null : i);
              }
            }}
            className={`flex h-[37px] w-full items-center gap-2 border-b border-border pl-0 pr-3 text-left ${i === 0 || openIndex === i - 1 ? "border-t" : ""}`.trim()}
          >
            {block.showNumbers && (
              <span className="shrink-0 font-black">{String(i + 1).padStart(2, '0')}</span>
            )}
            <input
              type="text"
              value={item.title}
              onChange={(e) => updateTitle(i, e.target.value)}
              onClick={(e) => e.stopPropagation()}
              placeholder="Title…"
              className="flex-1 bg-transparent border-none outline-none font-medium placeholder:text-muted-foreground/50"
            />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeItem(i); }}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            {openIndex === i ? (
              <Minus className="h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
          </div>
          {openIndex === i && (
            <div className="pl-0 pr-2 py-2">
              <DroppableColumn
                blockId={block.id}
                colIndex={i}
                isEmpty={(item.children ?? []).length === 0}
                showBorder={false}
              >
                {(item.children ?? []).map((childBlock) => (
                  <ColumnChildBlock
                    key={childBlock.id}
                    block={childBlock}
                    mode={mode}
                    parentBlockId={block.id}
                    colIndex={i}
                  />
                ))}
              </DroppableColumn>
            </div>
          )}
        </div>
      ))}
      <button
        onClick={addItem}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors ml-1"
      >
        <Plus className="h-3 w-3" /> Add
      </button>
    </div>
  );
}

// ─── Audio block ─────────────────────────────────────────────
function AudioRenderer({ block }: { block: AudioBlock }) {
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const trackRef = React.useRef<HTMLDivElement>(null);
  const rafRef = React.useRef<number>(0);
  const [playing, setPlaying] = React.useState(false);
  const [time, setTime] = React.useState(0);
  const [dur, setDur] = React.useState(0);
  const [muted, setMuted] = React.useState(false);
  const [slow, setSlow] = React.useState(false);

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

  if (!block.src) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-400">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
        {block.title || "No audio file — upload in properties panel"}
      </div>
    );
  }

  return (
    <div className="h-[47px] flex items-center pl-2 pr-4 border border-slate-200 rounded-lg">
      <audio ref={audioRef} src={block.src} preload="auto" muted={muted} />
      <div className="flex items-center gap-4 w-full">
        <button type="button" onClick={toggle} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-slate-700 text-white hover:bg-slate-800 transition-colors">
          {playing ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"/></svg>
          )}
        </button>
        {block.title && <span className="text-sm font-medium text-slate-700 shrink-0 max-w-[120px] truncate">{block.title}</span>}
        <div
          ref={trackRef}
          onClick={handleTrackClick}
          className="flex-1 h-[6px] rounded-full cursor-pointer"
          style={{ background: `linear-gradient(to right, #334155 ${pct}%, #e2e8f0 ${pct}%)` }}
        />
        <span className="text-xs tabular-nums text-slate-500 shrink-0">{fmt(time)} / {fmt(dur)}</span>
        <button type="button" onClick={toggleSpeed} className={`shrink-0 p-1 rounded transition-colors ${slow ? 'text-slate-700' : 'text-slate-400 hover:text-slate-600'}`}>
          {slow ? <ChevronsDown size={16} /> : <ChevronsUp size={16} />}
        </button>
        <button type="button" onClick={() => setMuted(!muted)} className="text-slate-500 hover:text-slate-700 transition-colors">
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

// ─── Website block ──────────────────────────────────────────
function WebsiteRenderer({ block }: { block: WebsiteBlock }) {
  const { dispatch, state } = useEditor();
  const { localeUpdate } = useLocaleAwareEdit();
  const locale = useLocale();
  const t = useTranslations("properties");
  const { upload } = useUpload();
  const [uploadingIndex, setUploadingIndex] = React.useState<number | null>(null);
  const [browserOpen, setBrowserOpen] = React.useState(false);
  const [browserIndex, setBrowserIndex] = React.useState<number | null>(null);
  const [cropOpen, setCropOpen] = React.useState(false);
  const [cropSrc, setCropSrc] = React.useState<string | null>(null);
  const [cropIndex, setCropIndex] = React.useState<number | null>(null);
  const [capturingIndex, setCapturingIndex] = React.useState<number | null>(null);
  const [blockedPreview, setBlockedPreview] = React.useState<{
    index: number;
    objectUrl: string;
    blob: Blob;
  } | null>(null);

  const HeadingTag = (`h${block.level}` as keyof React.JSX.IntrinsicElements);
  const headingSizes = { 1: "text-cv-3xl", 2: "text-cv-2xl", 3: "text-cv-xl" };
  const primaryColor = state.brandProfile.primaryColor || "#1a1a1a";

  const updateItems = (items: WebsiteBlock["items"]) => {
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items } },
    });
  };

  const updateItem = (index: number, updates: Partial<WebsiteBlock["items"][number]>) => {
    const next = [...block.items];
    next[index] = { ...next[index], ...updates };
    updateItems(next);
  };

  const updateLocaleField = (
    index: number,
    field: "title" | "category" | "description",
    value: string,
  ) => {
    localeUpdate(block.id, `items.${index}.${field}`, value, () => {
      updateItem(index, { [field]: value });
    });
  };

  const normalizeExternalUrl = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return "";
    if (/^[a-z]+:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  };

  const openBrowser = (index: number) => {
    setBrowserIndex(index);
    setBrowserOpen(true);
  };

  const captureWebsitePreview = async (index: number) => {
    const rawUrl = block.items[index]?.url || "";
    const normalizedUrl = normalizeExternalUrl(rawUrl);
    if (!normalizedUrl) return;

    setCapturingIndex(index);
    try {
      const response = await authFetch("/api/website-screenshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalizedUrl }),
      });

      if (!response.ok) {
        let message = "Failed to capture website preview";
        try {
          const data = (await response.json()) as { error?: string };
          if (data?.error) message = data.error;
        } catch {
          // Ignore parse errors and keep fallback message.
        }
        throw new Error(message);
      }

      const isBlocked = response.headers.get("x-screenshot-blocked") === "1";
      const blob = await response.blob();

      if (isBlocked) {
        // Show the captured preview and let the user decide whether to insert it.
        const objectUrl = URL.createObjectURL(blob);
        setBlockedPreview({ index, objectUrl, blob });
        return;
      }
      const file = new File([blob], `website-preview-${Date.now()}.png`, { type: "image/png" });
      const uploadResult = await upload(file);
      updateItem(index, { image: uploadResult.url });
    } catch (error) {
      console.error("Website preview capture failed:", error);
      alert(t("websitePreviewCaptureFailed"));
    } finally {
      setCapturingIndex(null);
    }
  };

  const confirmBlockedPreview = async () => {
    if (!blockedPreview) return;
    const { index, objectUrl, blob } = blockedPreview;
    setBlockedPreview(null);
    setCapturingIndex(index);
    try {
      const file = new File([blob], `website-preview-${Date.now()}.png`, { type: "image/png" });
      const uploadResult = await upload(file);
      updateItem(index, { image: uploadResult.url });
    } catch (error) {
      console.error("Website preview upload failed:", error);
      alert(t("websitePreviewCaptureFailed"));
    } finally {
      URL.revokeObjectURL(objectUrl);
      setCapturingIndex(null);
    }
  };

  const dismissBlockedPreview = () => {
    if (blockedPreview) {
      URL.revokeObjectURL(blockedPreview.objectUrl);
      setBlockedPreview(null);
    }
  };

  const handleFileSelected = (file: File, index: number) => {
    if (!file.type.startsWith("image/")) return;
    const objectUrl = URL.createObjectURL(file);
    setCropIndex(index);
    setCropSrc(objectUrl);
    setCropOpen(true);
  };

  const handleCropComplete = async (result: CropResult) => {
    if (cropIndex === null) {
      URL.revokeObjectURL(result.url);
      return;
    }

    setUploadingIndex(cropIndex);
    try {
      const file = new File([result.blob], `website-${cropIndex}.png`, { type: "image/png" });
      const uploadResult = await upload(file);
      updateItem(cropIndex, { image: uploadResult.url });
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setUploadingIndex(null);
      if (cropSrc) URL.revokeObjectURL(cropSrc);
      URL.revokeObjectURL(result.url);
      setCropSrc(null);
      setCropIndex(null);
    }
  };

  const addItem = () => {
    updateItems([
      ...block.items,
      {
        id: crypto.randomUUID(),
        title: "",
        url: "",
        category: "",
        description: "",
        image: "",
        aggregator: false,
        pageBreakAfter: false,
      },
    ]);
  };

  const removeItem = (id: string) => {
    if (block.items.length <= 1) return;
    updateItems(block.items.filter((item) => item.id !== id));
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= block.items.length) return;
    const next = [...block.items];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    updateItems(next);
  };

  const getBodyValue = (item: WebsiteBlock["items"][number]) => item.category || item.description || "";

  const pageBreakLabel = locale === "de" ? "Seitenumbruch" : "Page break";

  const updateBodyField = (index: number, value: string) => {
    localeUpdate(block.id, `items.${index}.category`, value, () => {
      updateItem(index, { category: value, description: "" });
    });
  };

  return (
    <div className="space-y-4">
      {block.title.trim() ? (
        <HeadingTag className={headingSizes[block.level]} style={{ color: primaryColor }}>
          {block.title}
        </HeadingTag>
      ) : null}

      <div className="grid gap-3">
        {block.items.map((item, index) => {
          const href = normalizeExternalUrl(item.url);

          return (
            <div
              key={item.id}
              className={`group relative rounded-sm border bg-white p-3 ${item.aggregator ? "border-dashed border-slate-400" : "border-slate-200"}`}
              style={item.pageBreakAfter ? { breakAfter: "page", pageBreakAfter: "always" } : undefined}
            >
              <div className="flex items-start gap-3">
                <div className="w-40 shrink-0">
                  {item.image ? (
                    <div className="relative aspect-video overflow-hidden rounded-[2px] border border-slate-200 bg-slate-50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.image} alt={item.title || "Website image"} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => updateItem(index, { image: "" })}
                        className="absolute right-1 top-1 rounded-full bg-black/65 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label className="flex aspect-video cursor-pointer flex-col items-center justify-center rounded-[2px] border border-dashed border-slate-300 bg-slate-50 text-center transition-colors hover:border-slate-400 hover:bg-slate-100">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileSelected(file, index);
                          }}
                        />
                        {uploadingIndex === index ? (
                          <Loader2 className="mb-1 h-4 w-4 animate-spin text-slate-500" />
                        ) : (
                          <Upload className="mb-1 h-4 w-4 text-slate-500" />
                        )}
                        <span className="px-2 text-[11px] text-slate-500">{uploadingIndex === index ? t("uploading") : t("dragOrClick")}</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => openBrowser(index)}
                        className="flex h-7 w-full items-center justify-center rounded-sm border border-slate-200 bg-white px-2 text-[11px] text-slate-600 transition hover:bg-slate-50"
                      >
                        <Upload className="mr-1 h-3.5 w-3.5" />
                        {t("mediaBrowser")}
                      </button>
                      <button
                        type="button"
                        onClick={() => captureWebsitePreview(index)}
                        disabled={!href || capturingIndex === index}
                        className="flex h-7 w-full items-center justify-center rounded-sm border border-slate-200 bg-white px-2 text-[11px] text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {capturingIndex === index ? (
                          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Monitor className="mr-1 h-3.5 w-3.5" />
                        )}
                        {capturingIndex === index ? t("websiteCapturingPreview") : t("websiteCapturePreview")}
                      </button>
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-start gap-1">
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) => updateLocaleField(index, "title", e.target.value)}
                      placeholder={t("websiteTitle")}
                      className="min-w-0 flex-1 border-none bg-transparent px-0 text-base font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:ring-0"
                    />
                    {href ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-0.5 shrink-0 text-slate-400 transition-colors hover:text-slate-700"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : null}
                  </div>

                  <input
                    type="text"
                    value={item.url}
                    onChange={(e) => updateItem(index, { url: e.target.value })}
                    placeholder={t("websiteUrl")}
                    className="h-8 w-full rounded-sm border border-slate-200 bg-white px-2 text-xs text-slate-600 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                  />

                  <textarea
                    value={getBodyValue(item)}
                    onChange={(e) => updateBodyField(index, e.target.value)}
                    placeholder={t("websiteCategory")}
                    className="min-h-[72px] w-full resize-y rounded-sm border border-slate-200 bg-white px-2 py-2 text-sm font-normal normal-case tracking-normal text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                  />

                  <label className="flex items-center gap-2 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={item.aggregator ?? false}
                      onChange={(e) => updateItem(index, { aggregator: e.target.checked })}
                    />
                    <span>{t("websiteAggregator")}</span>
                  </label>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  className={`text-slate-400 hover:text-slate-700 ${item.pageBreakAfter ? "text-slate-700" : ""}`}
                  title={pageBreakLabel}
                >
                  <Printer className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className="text-slate-400 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30"
                  onClick={() => moveItem(index, "up")}
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className="text-slate-400 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30"
                  onClick={() => moveItem(index, "down")}
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className="text-slate-400 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                  onClick={() => removeItem(item.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              {item.pageBreakAfter ? (
                <div className="mt-2 text-[11px] text-muted-foreground">{pageBreakLabel}</div>
              ) : null}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={addItem}
        className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <Plus className="h-3 w-3" /> Add
      </button>

      <MediaBrowserDialog
        open={browserOpen}
        onOpenChange={setBrowserOpen}
        onSelectUrl={(url) => {
          if (browserIndex !== null) {
            updateItem(browserIndex, { image: url });
          }
        }}
        onSelectFile={(file) => {
          if (browserIndex !== null) {
            handleFileSelected(file, browserIndex);
          }
        }}
      />

      <ImageCropDialog
        imageSrc={cropSrc}
        open={cropOpen}
        onOpenChange={(open) => {
          setCropOpen(open);
          if (!open && cropSrc) {
            URL.revokeObjectURL(cropSrc);
            setCropSrc(null);
            setCropIndex(null);
          }
        }}
        onCropComplete={handleCropComplete}
        title={t("cropImage")}
        aspect={16 / 9}
      />

      {/* Blocked-site preview confirmation dialog */}
      {blockedPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg shadow-xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="px-4 pt-4 pb-2">
              <p className="font-semibold text-sm">{t("websiteBlockedTitle")}</p>
              <p className="text-xs text-muted-foreground mt-1">{t("websiteBlockedDescription")}</p>
            </div>
            <div className="px-4 pb-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={blockedPreview.objectUrl}
                alt="Captured preview"
                className="w-full rounded border border-border aspect-video object-cover"
              />
            </div>
            <div className="flex justify-end gap-2 px-4 pb-4">
              <button
                type="button"
                className="px-3 py-1.5 text-sm rounded border border-border hover:bg-muted transition-colors"
                onClick={dismissBlockedPreview}
              >
                {t("websiteBlockedDiscard")}
              </button>
              <button
                type="button"
                className="px-3 py-1.5 text-sm rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                onClick={() => void confirmBlockedPreview()}
              >
                {t("websiteBlockedInsert")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Schedule block ──────────────────────────────────────────
function formatCurriculumDate(value: string) {
  if (!value) return "-";
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

const CURRICULUM_WEEKDAY_SHORT_DE = ["SO", "MO", "DI", "MI", "DO", "FR", "SA"] as const;

function formatCurriculumWeekdayAbbrev(value: string) {
  if (!value) return "-";
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "-";
  return CURRICULUM_WEEKDAY_SHORT_DE[d.getDay()];
}

type CurriculumCsvRow = {
  index: number;
  label: string;
  lesson: string;
  coursebook: string;
  workbook: string;
  vocabulary: string;
  communicativeGoal: string;
  grammarGoal: string;
};

function normalizeCurriculumCsvHeader(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function parseCurriculumCsvRows(rawCsv: string): CurriculumCsvRow[] {
  const lines = rawCsv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].replace(/^\uFEFF/, "").split(";").map(normalizeCurriculumCsvHeader);
  const findColumn = (...names: string[]) => {
    return headers.findIndex((header) => names.some((name) => header === name || header.includes(name)));
  };

  const idxNiveau = findColumn("niveau");
  const idxBand = findColumn("band");
  const idxLektion = findColumn("lektion");
  const idxSchritt = findColumn("schritt");
  const idxKb = findColumn("kb");
  const idxAb = findColumn("ab");
  const idxLws = findColumn("lws");
  const idxKommunikatives = findColumn("kommunikatives", "kommunikativ");
  const idxGrammatik = findColumn("grammatik");

  const cleanCell = (value: string | undefined) => {
    const next = (value ?? "").trim();
    return next === "-" || next === "\u2013" ? "" : next;
  };

  const rows: CurriculumCsvRow[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cells = lines[i].split(";");
    const niveau = cleanCell(cells[idxNiveau]);
    const band = cleanCell(cells[idxBand]);
    const lektion = cleanCell(cells[idxLektion]);
    const schritt = cleanCell(cells[idxSchritt]);
    const kb = cleanCell(cells[idxKb]);
    const ab = cleanCell(cells[idxAb]);
    const lws = cleanCell(cells[idxLws]);
    const kommunikatives = cleanCell(cells[idxKommunikatives]);
    const grammatik = cleanCell(cells[idxGrammatik]);

    if (!lektion && !schritt && !kommunikatives && !grammatik && !kb && !ab && !lws) {
      continue;
    }

    const lessonLabel = [lektion ? `L${lektion}` : "", schritt].filter(Boolean).join(" ").trim();
    const optionLabelParts = [
      niveau || band ? [niveau, band ? `B${band}` : ""].filter(Boolean).join(" ") : "",
      lessonLabel,
      kommunikatives || grammatik || kb || lws || ab,
    ].filter(Boolean);

    rows.push({
      index: rows.length,
      label: optionLabelParts.join(" | "),
      lesson: lessonLabel,
      coursebook: kb,
      workbook: ab,
      vocabulary: lws,
      communicativeGoal: kommunikatives,
      grammarGoal: grammatik,
    });
  }

  return rows;
}

const CURRICULUM_WEEKDAY_LABELS: Record<
  "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday",
  string
> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

function CurriculumRenderer({ block }: { block: CurriculumBlock }) {
  const { dispatch } = useEditor();
  const weekdayOrder = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ] as const;
  const regularCourseWeekdays = block.regularCourseWeekdays ?? ["monday", "tuesday", "wednesday", "thursday", "friday"];
  const offItems = block.offItems ?? [];
  const holidayPeriods = block.holidayPeriods ?? [];
  const lessonPlanFormat = block.lessonPlanFormat ?? "schritte-plus-neu";
  const lessonPlanRows = block.lessonPlanRows ?? [];
  const selectedWeekdays = weekdayOrder.filter((weekday) => regularCourseWeekdays.includes(weekday));

  const [csvRows, setCsvRows] = useState<CurriculumCsvRow[]>([]);
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [editRowIndex, setEditRowIndex] = useState<number | null>(null);
  const [editMode, setEditMode] = useState<"csv" | "custom">("csv");
  const [selectedCsvRowIndices, setSelectedCsvRowIndices] = useState<number[]>([]);
  const [customDraft, setCustomDraft] = useState({
    lesson: "",
    coursebook: "",
    workbook: "",
    vocabulary: "",
    communicativeGoal: "",
    grammarGoal: "",
  });

  const updateLessonPlanRows = (nextRows: typeof lessonPlanRows) => {
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          lessonPlanRows: nextRows,
        },
      },
    });
  };

  const getRowSourceIndices = (row: typeof lessonPlanRows[number]): number[] => {
    if (Array.isArray(row.sourceRowIndices) && row.sourceRowIndices.length > 0) {
      return [...new Set(row.sourceRowIndices)]
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value >= 0)
        .sort((a, b) => a - b);
    }
    if (typeof row.sourceRowIndex === "number" && row.sourceRowIndex >= 0) {
      return [row.sourceRowIndex];
    }
    return [];
  };

  const getRowMaxSourceIndex = (row: typeof lessonPlanRows[number]): number | null => {
    const sourceIndices = getRowSourceIndices(row);
    if (!sourceIndices.length) return null;
    return sourceIndices[sourceIndices.length - 1];
  };

  const hasManualLessonContent = (row: typeof lessonPlanRows[number]) => {
    return Boolean(
      row.lesson ||
      row.coursebook ||
      row.workbook ||
      row.vocabulary ||
      row.communicativeGoal ||
      row.grammarGoal
    );
  };

  const findSuggestedCsvIndexForRow = (rowIndex: number, rows: typeof lessonPlanRows) => {
    if (!csvRows.length) return null;
    for (let i = rowIndex - 1; i >= 0; i -= 1) {
      const maxIndex = getRowMaxSourceIndex(rows[i]);
      if (maxIndex !== null) {
        return Math.min(maxIndex + 1, csvRows.length - 1);
      }
    }
    return 0;
  };

  const buildLessonRowFromCsv = (
    baseRow: typeof lessonPlanRows[number],
    sourceIndex: number,
    options?: { continuationOfRowId?: string }
  ) => {
    const source = csvRows[sourceIndex];
    if (!source) return null;
    return {
      ...baseRow,
      sourceType: "csv" as const,
      sourceRowIndex: sourceIndex,
      sourceRowIndices: [sourceIndex],
      continuationOfRowId: options?.continuationOfRowId,
      lesson: source.lesson,
      coursebook: source.coursebook,
      workbook: source.workbook,
      vocabulary: source.vocabulary,
      communicativeGoal: source.communicativeGoal,
      grammarGoal: source.grammarGoal,
    };
  };

  React.useEffect(() => {
    let cancelled = false;

    const loadCsvRows = async () => {
      setCsvLoading(true);
      setCsvError(null);
      try {
        const response = await fetch("/lw_data/SPN Detailinhalte V1.csv", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const text = await response.text();
        if (cancelled) return;
        setCsvRows(parseCurriculumCsvRows(text));
      } catch {
        if (cancelled) return;
        setCsvRows([]);
        setCsvError("CSV data could not be loaded.");
      } finally {
        if (!cancelled) {
          setCsvLoading(false);
        }
      }
    };

    void loadCsvRows();

    return () => {
      cancelled = true;
    };
  }, []);

  const openLessonEditor = (rowIndex: number) => {
    const row = lessonPlanRows[rowIndex];
    if (!row || row.isOffDay) return;

    const sourceIndices = getRowSourceIndices(row);
    const suggestedIndex = findSuggestedCsvIndexForRow(rowIndex, lessonPlanRows);

    setCustomDraft({
      lesson: row.lesson ?? "",
      coursebook: row.coursebook ?? "",
      workbook: row.workbook ?? "",
      vocabulary: row.vocabulary ?? "",
      communicativeGoal: row.communicativeGoal ?? "",
      grammarGoal: row.grammarGoal ?? "",
    });

    if (row.sourceType === "custom") {
      setEditMode("custom");
      setSelectedCsvRowIndices([]);
    } else {
      setEditMode("csv");
      if (sourceIndices.length) {
        setSelectedCsvRowIndices(sourceIndices);
      } else if (suggestedIndex !== null) {
        setSelectedCsvRowIndices([suggestedIndex]);
      } else {
        setSelectedCsvRowIndices([]);
      }
    }

    setEditRowIndex(rowIndex);
  };

  const closeLessonEditor = () => {
    setEditRowIndex(null);
    setSelectedCsvRowIndices([]);
  };

  const saveLessonEditor = () => {
    if (editRowIndex === null) return;
    const nextRows = [...lessonPlanRows];
    const row = nextRows[editRowIndex];
    if (!row) return;

    if (editMode === "custom") {
      nextRows[editRowIndex] = {
        ...row,
        sourceType: "custom",
        sourceRowIndex: undefined,
        sourceRowIndices: undefined,
        lesson: customDraft.lesson,
        coursebook: customDraft.coursebook,
        workbook: customDraft.workbook,
        vocabulary: customDraft.vocabulary,
        communicativeGoal: customDraft.communicativeGoal,
        grammarGoal: customDraft.grammarGoal,
      };
      updateLessonPlanRows(nextRows);
      closeLessonEditor();
      return;
    }

    const sourceIndices = [...new Set(selectedCsvRowIndices)]
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value >= 0 && value < csvRows.length)
      .sort((a, b) => a - b);

    if (!sourceIndices.length) return;

    const baseRowId = row.continuationOfRowId ?? row.id;

    // Replace previous continuation rows for this base row so re-edit does not keep stacking duplicates.
    let removeFrom = editRowIndex + 1;
    while (
      removeFrom < nextRows.length &&
      nextRows[removeFrom].continuationOfRowId === baseRowId
    ) {
      nextRows.splice(removeFrom, 1);
    }

    const firstCsvRow = buildLessonRowFromCsv(row, sourceIndices[0], { continuationOfRowId: undefined });
    if (!firstCsvRow) return;
    nextRows[editRowIndex] = {
      ...firstCsvRow,
      continuationOfRowId: undefined,
    };

    if (sourceIndices.length > 1) {
      const insertedRows = sourceIndices.slice(1).map((sourceIndex, offset) => {
        const templateRow = {
          ...row,
          id: `${row.id}-c${sourceIndex}-${Date.now()}-${offset}`,
          sourceType: "csv" as const,
          sourceRowIndex: undefined,
          sourceRowIndices: undefined,
          continuationOfRowId: baseRowId,
          isOffDay: false,
          offReason: undefined,
        };
        return buildLessonRowFromCsv(templateRow, sourceIndex, { continuationOfRowId: baseRowId });
      }).filter((item): item is NonNullable<typeof item> => Boolean(item));

      if (insertedRows.length) {
        nextRows.splice(editRowIndex + 1, 0, ...insertedRows);
      }
    }

    const maxSelected = sourceIndices[sourceIndices.length - 1];
    const nextSource = csvRows[maxSelected + 1];
    if (nextSource) {
      const anchorIndex = editRowIndex + sourceIndices.length - 1;
      const nextLessonRowIndex = nextRows.findIndex((item, idx) => idx > anchorIndex && !item.isOffDay);
      if (nextLessonRowIndex !== -1) {
        const nextLessonRow = nextRows[nextLessonRowIndex];
        const isProtectedCustom = nextLessonRow.sourceType === "custom" && hasManualLessonContent(nextLessonRow);
        if (!isProtectedCustom) {
          const proposedRow = buildLessonRowFromCsv(nextLessonRow, maxSelected + 1, {
            continuationOfRowId: nextLessonRow.continuationOfRowId,
          });
          if (proposedRow) {
            nextRows[nextLessonRowIndex] = proposedRow;
          }
        }
      }
    }

    updateLessonPlanRows(nextRows);
    closeLessonEditor();
  };

  const activeRow = editRowIndex === null ? null : lessonPlanRows[editRowIndex] ?? null;
  const suggestedIndex = editRowIndex === null ? null : findSuggestedCsvIndexForRow(editRowIndex, lessonPlanRows);
  const canSaveCsv = editMode === "custom" || selectedCsvRowIndices.length > 0;

  return (
    <div className="rounded-sm border border-slate-300 bg-white p-3 text-sm">
      <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-2">
        <span className="font-semibold text-slate-800">Curriculum</span>
        <span className="text-xs text-slate-500">
          {formatCurriculumDate(block.termStartDate)} - {formatCurriculumDate(block.termEndDate)}
        </span>
      </div>

      <div className="mb-3">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">Regular Course Weekdays</div>
        <div className="flex flex-wrap gap-1">
          {selectedWeekdays.length ? selectedWeekdays.map((weekday) => (
            <span key={weekday} className="rounded-sm border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-700">
              {CURRICULUM_WEEKDAY_LABELS[weekday]}
            </span>
          )) : <span className="text-xs text-slate-500">-</span>}
        </div>
      </div>

      <div className="mb-3">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">Off Days</div>
        <div className="space-y-1">
          {(offItems.length ? offItems : [{ id: "empty", date: "", label: "" }]).map((item) => (
            <div key={item.id} className="grid grid-cols-[72px_1fr] gap-2 rounded-sm border border-slate-200 px-2 py-1">
              <span className="text-xs font-medium text-slate-600" style={{ fontVariantNumeric: "tabular-nums", fontFeatureSettings: '"tnum" 1' }}>{formatCurriculumDate(item.date)}</span>
              <span className="text-xs text-slate-700">{item.label || "-"}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">Holiday Periods</div>
        <div className="space-y-1">
          {(holidayPeriods.length ? holidayPeriods : [{ id: "empty", startDate: "", endDate: "", label: "" }]).map((item, index) => (
            <div key={`${item.id}-${index}`} className="grid grid-cols-[1fr_1fr_1.2fr] gap-2 rounded-sm border border-slate-200 px-2 py-1">
              <span className="text-xs text-slate-600" style={{ fontVariantNumeric: "tabular-nums", fontFeatureSettings: '"tnum" 1' }}>{formatCurriculumDate(item.startDate)}</span>
              <span className="text-xs text-slate-600" style={{ fontVariantNumeric: "tabular-nums", fontFeatureSettings: '"tnum" 1' }}>{formatCurriculumDate(item.endDate)}</span>
              <span className="text-xs text-slate-700">{item.label || "-"}</span>
            </div>
          ))}
        </div>
      </div>

      {lessonPlanFormat === "schritte-plus-neu" ? (
        <div className="mt-3 overflow-x-auto">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">Schritte Plus Neu</div>
          <table className="w-full table-fixed border-collapse text-xs">
            <colgroup>
              <col style={{ width: "2.5rem" }} />
              <col style={{ width: "6ch" }} />
              <col style={{ width: "12ch" }} />
              <col style={{ width: "10ch" }} />
              <col style={{ width: "10ch" }} />
              <col style={{ width: "10ch" }} />
              <col style={{ width: "10ch" }} />
              <col />
              <col />
            </colgroup>
            <thead>
              <tr className="bg-slate-50 text-left text-slate-700">
                <th className="border border-slate-200 px-2 py-1 whitespace-nowrap"></th>
                <th className="border border-slate-200 px-2 py-1 whitespace-nowrap" colSpan={2}>Datum</th>
                <th className="border border-slate-200 px-2 py-1 whitespace-nowrap">Lektion</th>
                <th className="border border-slate-200 px-2 py-1">KB</th>
                <th className="border border-slate-200 px-2 py-1">AB</th>
                <th className="border border-slate-200 px-2 py-1">LWS</th>
                <th className="border border-slate-200 px-2 py-1">Kommunikation</th>
                <th className="border border-slate-200 px-2 py-1">Grammatik</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                let lessonNumber = 0;
                return (lessonPlanRows.length ? lessonPlanRows : []).map((row, rowIndex) => {
                  const lessonNumberLabel = row.isOffDay ? "" : String(++lessonNumber).padStart(2, "0");
                  return (
                    <tr
                      key={row.id}
                      className={row.isOffDay ? "bg-amber-50/60" : "cursor-pointer bg-white hover:bg-sky-50/50"}
                      onClick={() => openLessonEditor(rowIndex)}
                    >
                      <td className="border border-slate-200 px-2 py-1 text-slate-700 whitespace-nowrap" style={{ fontVariantNumeric: "tabular-nums", fontFeatureSettings: '"tnum" 1' }}>{lessonNumberLabel}</td>
                      <td className="border border-slate-200 px-2 py-1 text-slate-700 whitespace-nowrap">{formatCurriculumWeekdayAbbrev(row.date)}</td>
                      <td className="border border-slate-200 px-2 py-1 whitespace-nowrap" style={{ fontVariantNumeric: "tabular-nums", fontFeatureSettings: '"tnum" 1' }}>{formatCurriculumDate(row.date)}</td>
                      <td className="border border-slate-200 px-2 py-1 whitespace-nowrap">{row.lesson ?? ""}</td>
                      <td className="border border-slate-200 px-2 py-1">{row.coursebook}</td>
                      <td className="border border-slate-200 px-2 py-1">{row.workbook}</td>
                      <td className="border border-slate-200 px-2 py-1">{row.vocabulary}</td>
                      <td className="border border-slate-200 px-2 py-1">{row.communicativeGoal}</td>
                      <td className="border border-slate-200 px-2 py-1">{row.grammarGoal}</td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
          <p className="mt-1 text-[11px] text-slate-500">Click a lesson row to assign CSV content or custom content.</p>
        </div>
      ) : null}

      <Dialog open={editRowIndex !== null} onOpenChange={(open) => { if (!open) closeLessonEditor(); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {activeRow ? `Lesson content - ${formatCurriculumDate(activeRow.date)}` : "Lesson content"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Button type="button" variant={editMode === "csv" ? "default" : "outline"} size="sm" onClick={() => setEditMode("csv")}>CSV rows</Button>
              <Button type="button" variant={editMode === "custom" ? "default" : "outline"} size="sm" onClick={() => setEditMode("custom")}>Custom entry</Button>
              {csvLoading ? <span className="text-xs text-slate-500">Loading CSV...</span> : null}
              {csvError ? <span className="text-xs text-rose-600">{csvError}</span> : null}
            </div>

            {editMode === "csv" ? (
              <div className="space-y-2 rounded-sm border border-slate-200 p-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-600">Select one or multiple CSV rows</span>
                  {suggestedIndex !== null && csvRows[suggestedIndex] ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setSelectedCsvRowIndices([suggestedIndex])}
                    >
                      Use suggested: {csvRows[suggestedIndex].label}
                    </Button>
                  ) : null}
                </div>

                <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
                  {csvRows.map((csvRow) => {
                    const isChecked = selectedCsvRowIndices.includes(csvRow.index);
                    return (
                      <label key={csvRow.index} className="flex cursor-pointer items-start gap-2 rounded-sm border border-slate-200 px-2 py-1 hover:bg-slate-50">
                        <input
                          type="checkbox"
                          className="mt-0.5 h-3.5 w-3.5"
                          checked={isChecked}
                          onChange={(event) => {
                            const checked = event.target.checked;
                            setSelectedCsvRowIndices((prev) => {
                              if (checked) {
                                return [...prev, csvRow.index].sort((a, b) => a - b);
                              }
                              return prev.filter((value) => value !== csvRow.index);
                            });
                          }}
                        />
                        <span className="text-xs text-slate-700">{csvRow.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-2 rounded-sm border border-slate-200 p-2">
                <input
                  value={customDraft.lesson}
                  onChange={(event) => setCustomDraft((prev) => ({ ...prev, lesson: event.target.value }))}
                  className="h-8 w-full rounded border border-slate-300 px-2 text-xs"
                  placeholder="Lektion"
                />

                <div className="grid grid-cols-3 gap-2">
                  <input
                    value={customDraft.coursebook}
                    onChange={(event) => setCustomDraft((prev) => ({ ...prev, coursebook: event.target.value }))}
                    className="h-8 w-full rounded border border-slate-300 px-2 text-xs"
                    placeholder="KB"
                  />
                  <input
                    value={customDraft.workbook}
                    onChange={(event) => setCustomDraft((prev) => ({ ...prev, workbook: event.target.value }))}
                    className="h-8 w-full rounded border border-slate-300 px-2 text-xs"
                    placeholder="AB"
                  />
                  <input
                    value={customDraft.vocabulary}
                    onChange={(event) => setCustomDraft((prev) => ({ ...prev, vocabulary: event.target.value }))}
                    className="h-8 w-full rounded border border-slate-300 px-2 text-xs"
                    placeholder="LWS"
                  />
                </div>

                <input
                  value={customDraft.communicativeGoal}
                  onChange={(event) => setCustomDraft((prev) => ({ ...prev, communicativeGoal: event.target.value }))}
                  className="h-8 w-full rounded border border-slate-300 px-2 text-xs"
                  placeholder="Kommunikation"
                />

                <input
                  value={customDraft.grammarGoal}
                  onChange={(event) => setCustomDraft((prev) => ({ ...prev, grammarGoal: event.target.value }))}
                  className="h-8 w-full rounded border border-slate-300 px-2 text-xs"
                  placeholder="Grammatik"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeLessonEditor}>Cancel</Button>
            <Button type="button" onClick={saveLessonEditor} disabled={!canSaveCsv}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ScheduleRenderer({ block }: { block: ScheduleBlock }) {
  const { state } = useEditor();
  const primaryColor = state.brandProfile.primaryColor || "#1a1a1a";
  const baselineAdjustment = getFontBaselineAdjustment(state.brandProfile.bodyFont);

  return (
    <StaticScheduleTable
      items={block.items}
      primaryColor={primaryColor}
      showDate={block.showDate ?? false}
      showRoom={block.showRoom ?? false}
      showHeader={block.showHeader ?? false}
      baselineAdjustment={baselineAdjustment}
    />
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
  primaryColor,
  showDate,
  showRoom,
  showHeader,
  baselineAdjustment,
}: {
  items: ScheduleBlock["items"];
  primaryColor: string;
  showDate: boolean;
  showRoom: boolean;
  showHeader: boolean;
  baselineAdjustment: string;
}) {
  const rowCellStyle: React.CSSProperties = {
    padding: 0,
    verticalAlign: "middle",
    boxSizing: "border-box",
    height: "37px",
    fontVariantNumeric: "tabular-nums",
    fontFeatureSettings: '"tnum" 1',
  };
  const compactRowCellStyle: React.CSSProperties = {
    ...rowCellStyle,
    whiteSpace: "nowrap",
  };
  const timeRowStyle: React.CSSProperties = {
    ...compactRowCellStyle,
    verticalAlign: "top",
  };
  const weekdayStyle: React.CSSProperties = {
    display: "inline-block",
    width: "2.4ch",
    marginRight: "0.75ch",
  };
  const headerCellStyle: React.CSSProperties = {
    whiteSpace: "nowrap",
    textAlign: "left",
    color: primaryColor,
    fontSize: "inherit",
    fontWeight: 700,
    textTransform: "none",
    height: "37px",
    verticalAlign: "middle",
    boxSizing: "border-box",
    padding: 0,
  };
  const cellContentStyle: React.CSSProperties = {
    minHeight: "36px",
    display: "flex",
    alignItems: "center",
    paddingRight: "14px",
    boxSizing: "border-box",
    transform: `translateY(${baselineAdjustment})`,
  };
  const timeCellContentStyle: React.CSSProperties = {
    ...cellContentStyle,
    alignItems: "flex-start",
    paddingTop: "4px",
  };

  return (
    <>
      <style>{`
        .scheduleNew{width:100%;border-collapse:separate;border-spacing:0;}
        .scheduleNew th,.scheduleNew td{border-bottom:1px solid #ccc;padding:0;vertical-align:middle;box-sizing:border-box;}
        .scheduleNew thead th,.scheduleNew tbody td{height:37px;}
        .scheduleNew tbody tr:last-child td{border-bottom:none;}
        .scheduleNew thead tr th{border-top:none;}
        .scheduleNew{border:1px solid #ccc;border-radius:6px;overflow:hidden;}
      `}</style>
      <table className="scheduleNew">
        <colgroup>
          {showDate && <col style={{ width: "1%" }} />}
          <col style={{ width: "1%" }} />
          {showRoom && <col style={{ width: "1%" }} />}
          <col />
        </colgroup>
        {showHeader && (
          <thead>
            <tr>
              {showDate && <th style={headerCellStyle}><div style={cellContentStyle}>Datum</div></th>}
              <th style={headerCellStyle}><div style={cellContentStyle}>Zeit</div></th>
              {showRoom && <th style={headerCellStyle}><div style={{ ...cellContentStyle, paddingRight: "18px" }}>Raum</div></th>}
              <th style={{ ...headerCellStyle, whiteSpace: "normal" }}><div style={cellContentStyle}>Inhalt</div></th>
            </tr>
          </thead>
        )}
        <tbody>
          {items.map((item) => {
            const { weekday, formatted } = formatScheduleCellDate(item.date);

            return (
              <tr key={item.id}>
                {showDate && (
                  <td style={compactRowCellStyle}>
                    <div style={cellContentStyle}>
                      {weekday ? (<>
                        <span style={weekdayStyle}>{weekday}</span>
                        <span>{formatted}</span>
                      </>) : formatted}
                    </div>
                  </td>
                )}
                <td style={timeRowStyle}>
                  <div style={timeCellContentStyle}>{formatScheduleCellTime(item.start)} – {formatScheduleCellTime(item.end)}</div>
                </td>
                {showRoom && <td style={compactRowCellStyle}><div style={{ ...cellContentStyle, paddingRight: "18px" }}>{item.room}</div></td>}
                <td style={rowCellStyle}>
                  <div style={{ ...cellContentStyle, flexDirection: "column", alignItems: "flex-start", justifyContent: "flex-start", width: "100%", minWidth: 0, paddingTop: "4px", paddingBottom: "4px", whiteSpace: "normal", overflowWrap: "anywhere", wordBreak: "break-word" }}>
                    <div style={{ width: "100%", fontWeight: 700, whiteSpace: "pre-line", overflowWrap: "anywhere", wordBreak: "break-word" }}>{item.title}</div>
                    {item.description ? <div style={{ width: "100%", whiteSpace: "pre-line", overflowWrap: "anywhere", wordBreak: "break-word" }}>{item.description}</div> : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}

// ─── AI Prompt block ─────────────────────────────────────────
function AiPromptRenderer({ block }: { block: AiPromptBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("blockRenderer");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async () => {
    if (!block.userInput.trim() || !block.prompt.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const finalPrompt = block.prompt.replace(
        new RegExp(`\\{\\{${block.variableName}\\}\\}`, "g"),
        block.userInput
      );
      const res = await authFetch("/api/ai/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: finalPrompt }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      dispatch({
        type: "UPDATE_BLOCK",
        payload: { id: block.id, updates: { aiResult: data.result } },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-dashed border-violet-300 rounded-sm p-4 bg-violet-50/30 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-1.5 text-xs text-violet-600 font-medium">
        <Sparkles className="h-3.5 w-3.5" />
        {block.description || t("aiPromptLabel")}
      </div>

      {/* Instructions */}
      {block.instructions && (
        <p className="text-sm text-slate-600">{block.instructions}</p>
      )}

      {/* Textarea input */}
      <textarea
        value={block.userInput}
        onChange={(e) =>
          dispatch({
            type: "UPDATE_BLOCK",
            payload: { id: block.id, updates: { userInput: e.target.value } },
          })
        }
        placeholder={t("aiPromptPlaceholder")}
        className="w-full min-h-[100px] p-3 rounded-sm border border-slate-200 bg-white text-sm resize-y focus:outline-none focus:ring-2 focus:ring-violet-300"
      />

      {/* Submit button */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading || !block.userInput.trim()}
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

      {/* AI Result */}
      {block.aiResult && (
        <div className="border border-violet-200 rounded-sm p-3 bg-white">
          <div className="text-xs text-violet-500 font-medium mb-1">{t("aiPromptResult")}</div>
          <div className="text-sm text-slate-700 whitespace-pre-wrap">{block.aiResult}</div>
        </div>
      )}
    </div>
  );
}

// ─── AI Tool Renderer ───────────────────────────────────────
function AiToolRenderer({ block }: { block: AiToolBlock }) {
  const t = useTranslations("blockRenderer");

  return (
    <div className="border border-dashed border-violet-300 rounded-sm p-4 bg-violet-50/30 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-1.5 text-xs text-violet-600 font-medium">
        <Bot className="h-3.5 w-3.5" />
        {t("aiToolLabel")}
      </div>

      {block.toolKey ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-700">
              {block.toolTitle || t("aiToolUntitled")}
            </span>
          </div>
          {block.toolDescription && (
            <p className="text-xs text-muted-foreground">{block.toolDescription}</p>
          )}
          <div className="text-[10px] text-muted-foreground bg-slate-100 rounded px-2 py-1 inline-block font-mono">
            Key: {block.toolKey}
          </div>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground italic">
          {t("aiToolSelectHint")}
        </div>
      )}
    </div>
  );
}

// ─── Table Block Renderer ───────────────────────────────────
function TableBlockRenderer({ block }: { block: TableBlock }) {
  const { dispatch } = useEditor();
  const { localeUpdate } = useLocaleAwareEdit();

  return (
    <div
      className={`table-block table-style-${block.tableStyle ?? "default"} ${
        block.firstRowAsExample ? "table-first-row-example" : ""
      }`}
    >
      {block.instruction && (
        <p className="text-sm text-slate-600 mb-2">{block.instruction}</p>
      )}
      {block.description && (
        <p className="mt-2 mb-2">{block.description}</p>
      )}
      <TableEditor
        content={block.content}
        columnWidths={block.columnWidths}
        hideHeader={block.hideHeader}
        onChange={(html) =>
          localeUpdate(block.id, "content", html, () =>
            dispatch({ type: "UPDATE_BLOCK", payload: { id: block.id, updates: { content: html } } })
          )
        }
      />
      {block.caption && (
        <p className="text-xs text-muted-foreground text-center mt-1 italic">{block.caption}</p>
      )}
    </div>
  );
}

function TableCloudBlockRenderer({ block }: { block: TableCloudBlock }) {
  const { dispatch } = useEditor();
  const { localeUpdate } = useLocaleAwareEdit();
  const t = useTranslations("blockRenderer");

  const cloudRows = React.useMemo(
    () => (block.cloudRows || "")
      .split(/\r?\n/)
      .map((row) => row.trim())
      .filter((row) => row.length > 0)
      .map((row, index) => {
        const marked = row.startsWith("*");
        const text = marked ? row.slice(1).trim() : row;
        return { index, text, marked };
      })
      .filter((entry) => entry.text.length > 0),
    [block.cloudRows],
  );

  const exampleCloudRow = React.useMemo(() => {
    if (!block.firstRowAsExample || cloudRows.length === 0) return null;
    return cloudRows.find((entry) => entry.marked) ?? null;
  }, [block.firstRowAsExample, cloudRows]);

  const remainingCloudRows = React.useMemo(
    () => cloudRows.filter((entry) => entry.index !== exampleCloudRow?.index),
    [cloudRows, exampleCloudRow],
  );

  const randomizedCloudRows = React.useMemo(
    () => getDeterministicPreviewOrder(remainingCloudRows, (entry) => `${block.id}:${entry.text}:${entry.index}`),
    [block.id, remainingCloudRows],
  );

  return (
    <div
      className={`table-block table-style-${block.tableStyle ?? "default"} ${
        block.firstRowAsExample ? "table-first-row-example" : ""
      }`}
    >
      {block.instruction && (
        <p className="text-sm text-slate-600 mb-2">{block.instruction}</p>
      )}
      {randomizedCloudRows.length > 0 || exampleCloudRow ? (
        <div className="mb-2">
          <div className="flex min-h-[37px] flex-wrap items-center gap-2 border-b py-2">
            <div className="flex flex-1 flex-wrap gap-2">
              {exampleCloudRow ? (
                <span className="px-3 py-0.5 rounded border border-border text-cv-sm" style={{ color: "#0097dc" }}>
                  <RoughExampleStrike>{exampleCloudRow.text}</RoughExampleStrike>
                </span>
              ) : null}
              {randomizedCloudRows.map((entry) => (
                <span key={`${entry.text}-${entry.index}`} className="px-3 py-0.5 rounded border border-border text-cv-sm">
                  {entry.text}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : null}
      {block.description && (
        <p className="mt-2 mb-2">{block.description}</p>
      )}
      <TableEditor
        content={block.content}
        columnWidths={block.columnWidths}
        hideHeader={block.hideHeader}
        onChange={(html) =>
          localeUpdate(block.id, "content", html, () =>
            dispatch({ type: "UPDATE_BLOCK", payload: { id: block.id, updates: { content: html } } })
          )
        }
      />
      {block.caption && (
        <p className="text-xs text-muted-foreground text-center mt-1 italic">{block.caption}</p>
      )}
    </div>
  );
}

function FreeFormRenderer({ block }: { block: FreeFormBlock }) {
  const { state, dispatch } = useEditor();
  const t = useTranslations("blockRenderer");
  const [open, setOpen] = React.useState(false);
  const resolvedBrand = React.useMemo(
    () => applyBrandOverrides(state.brandProfile, state.settings.brandOverrides),
    [state.brandProfile, state.settings.brandOverrides],
  );
  const defaultTextFontFamily = resolvedBrand.bodyFont?.trim() || state.settings.fontFamily;

  const updateBlock = React.useCallback((updates: Partial<FreeFormBlock>) => {
    dispatch({ type: "UPDATE_BLOCK", payload: { id: block.id, updates } });
  }, [block.id, dispatch]);

  return (
    <>
      <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {block.instruction ? (
              <p className="text-sm text-slate-600">{block.instruction}</p>
            ) : (
              <p className="text-sm text-slate-500">{t("freeFormEmpty")}</p>
            )}
          </div>
          <Button type="button" variant="outline" onClick={() => setOpen(true)}>
            {t("freeFormEdit")}
          </Button>
        </div>
        <div
          role="button"
          tabIndex={0}
          onClick={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setOpen(true);
            }
          }}
          className="cursor-pointer"
        >
          <FreeFormPreview scene={block.scene} title={block.title} defaultTextFontFamily={defaultTextFontFamily} />
        </div>
      </div>
      <FreeFormEditorDialog
        open={open}
        onOpenChange={setOpen}
        block={block}
        onChange={updateBlock}
      />
    </>
  );
}

// ─── Main Block Renderer ────────────────────────────────────
export function BlockRenderer({
  block: rawBlock,
  mode,
}: {
  block: WorksheetBlock;
  mode: ViewMode;
}) {
  const t = useTranslations("blockRenderer");
  const tc = useTranslations("common");
  const { state } = useEditor();
  const interactive = mode === "online";

  // Apply DE overrides only when in DE locale mode. CH remains base/original.
  const block = React.useMemo(() => {
    if (state.localeMode !== "DE") return rawBlock;
    const overrides = state.settings.chOverrides?.[rawBlock.id];
    let effective = rawBlock;
    if (overrides) {
      for (const [fieldPath, value] of Object.entries(overrides)) {
        effective = setByPath(effective, fieldPath, value) as WorksheetBlock;
      }
    }
    // Preserve the original id/type so block identity isn't affected
    return { ...effective, id: rawBlock.id, type: rawBlock.type } as WorksheetBlock;
  }, [rawBlock, state.localeMode, state.settings.chOverrides]);

  switch (block.type) {
    case "heading":
      return <HeadingRenderer block={block} />;
    case "title":
      return <TitleRenderer block={block as TitleBlock} />;
    case "numbered-heading":
      return <NumberedHeadingRenderer block={block} />;
    case "text":
      return <TextRenderer block={block} />;
    case "syllables":
      return <SyllablesRenderer block={block} />;
    case "image":
      return <ImageRenderer block={block} />;
    case "image-cards":
      return <ImageCardsRenderer block={block} />;
    case "image-text-table":
      return <ImageTextTableRenderer block={block} />;
    case "text-cards":
      return <TextCardsRenderer block={block} />;
    case "spacer":
      return <SpacerRenderer block={block} />;
    case "gap-spacer":
      return <GapSpacerRenderer />;
    case "divider":
      return <DividerRenderer block={block} />;
    case "logo-divider":
      return <LogoDividerRenderer block={block as LogoDividerBlock} />;
    case "page-break":
      return <PageBreakRenderer block={block} />;
    case "writing-lines":
      return <WritingLinesRenderer block={block} />;
    case "writing-rows":
      return <WritingRowsRenderer block={block} />;
    case "segmentation":
      return <SegmentationRenderer block={block} interactive={interactive} />;
    case "free-form":
      return <FreeFormRenderer block={block as FreeFormBlock} />;
    case "multiple-choice":
      return <MultipleChoiceRenderer block={block} interactive={interactive} />;
    case "fill-in-blank":
      return <FillInBlankRenderer block={block} interactive={interactive} />;
    case "fill-in-blank-items":
      return <FillInBlankItemsRenderer block={block} interactive={interactive} />;
    case "matching":
      return <MatchingRenderer block={block} />;
    case "text-matching":
      return <TextMatchingRenderer block={block as TextMatchingBlock} />;
    case "pronunciation":
      return <MatchingRenderer block={block} />;
    case "two-column-fill":
      return <TwoColumnFillRenderer block={block} />;
    case "glossary":
      return <GlossaryRenderer block={block} />;
    case "open-response":
      return <OpenResponseRenderer block={block} interactive={interactive} />;
    case "word-bank":
      return <WordBankRenderer block={block} />;
    case "number-line":
      return <NumberLineRenderer block={block} />;
    case "true-false-matrix":
      return <TrueFalseMatrixRenderer block={block} interactive={interactive} />;
    case "mcq-matrix":
      return <MCQMatrixRenderer block={block} interactive={interactive} />;
    case "mcq-rows":
      return <MCQRowsRenderer block={block} interactive={interactive} />;
    case "article-training":
      return <ArticleTrainingRenderer block={block} interactive={interactive} />;
    case "order-items":
      return <OrderItemsRenderer block={block} interactive={interactive} />;
    case "inline-choices":
      return <InlineChoicesRenderer block={block} interactive={interactive} />;
    case "crossword":
      return <CrosswordRenderer block={block} mode={mode} />;
    case "word-search":
      return <WordSearchRenderer block={block} />;
    case "sorting-categories":
      return <SortingCategoriesRenderer block={block} />;
    case "correct-spelling":
    case "correct-numbers":
    case "missing-letters":
      return <CorrectSpellingRenderer block={block} />;
    case "letter-code":
      return <LetterCodeRenderer block={block} />;
    case "unscramble-words":
      return <UnscrambleWordsRenderer block={block} />;
    case "fix-sentences":
      return <FixSentencesRenderer block={block} />;
    case "complete-sentences":
      return <CompleteSentencesRenderer block={block} />;
    case "start-sentences":
      return <StartSentencesRenderer block={block} />;
    case "transform-sentences":
      return <TransformSentencesRenderer block={block} />;
    case "reading-comprehension":
      return <ReadingComprehensionRenderer block={block} />;
    case "verb-table":
      return <VerbTableRenderer block={block} />;
    case "chart":
      return <ChartRenderer block={block} />;
    case "dialogue":
      return <DialogueRenderer block={block} interactive={interactive} />;
    case "lueckenzeilen":
      return <LueckenzeilenRenderer block={block} interactive={interactive} />;
    case "numbered-label":
      return <NumberedLabelRenderer block={block} />;
    case "columns":
      return <ColumnsRenderer block={block} mode={mode} />;
    case "grid":
      return <GridRenderer block={block as GridBlock} mode={mode} />;
    case "domino":
      return <DominoRenderer block={block as DominoBlock} />;
    case "card-pairs":
      return <CardPairsRenderer block={block as CardPairsBlock} />;
    case "flashcards":
      return <FlashcardsRenderer block={block as FlashcardsBlock} />;
    case "aufgabenkarten":
      return <AufgabenkartenRenderer block={block as AufgabenkartenBlock} />;
    case "syllable-cards":
      return <SyllableCardsRenderer block={block as SyllableCardsBlock} />;
    case "board-game":
      return <BoardGameRenderer block={block as BoardGameBlock} />;
    case "bingo-cards":
      return <BingoCardsRenderer block={block as BingoCardsBlock} mode={mode} />;
    case "linked-blocks":
      return <LinkedBlocksRenderer block={block as LinkedBlocksBlock} />;
    case "text-snippet":
      return <TextSnippetRenderer block={block as TextSnippetBlock} />;
    case "email-skeleton":
      return <EmailSkeletonRenderer block={block as EmailSkeletonBlock} />;
    case "job-application":
      return <JobApplicationRenderer block={block as JobApplicationBlock} />;
    case "dos-and-donts":
      return <DosAndDontsRenderer block={block as DosAndDontsBlock} />;
    case "text-comparison":
      return <TextComparisonRenderer block={block as TextComparisonBlock} />;
    case "numbered-items":
      return <NumberedItemsRenderer block={block as NumberedItemsBlock} />;
    case "subject":
      return <SubjectRenderer block={block as SubjectBlock} />;
    case "box":
      return <BoxRenderer block={block as BoxBlock} />;
    case "quartett":
      return <QuartettRenderer block={block as QuartettBlock} />;
    case "taboo":
      return <TabooRenderer block={block as TabooBlock} />;
    case "checklist":
      return <ChecklistRenderer block={block as ChecklistBlock} />;
    case "accordion":
      return <AccordionRenderer block={block as AccordionBlock} mode={mode} />;
    case "ai-prompt":
      return <AiPromptRenderer block={block as AiPromptBlock} />;
    case "ai-tool":
      return <AiToolRenderer block={block as AiToolBlock} />;
    case "table":
      return <TableBlockRenderer block={block as TableBlock} />;
    case "table-cloud":
      return <TableCloudBlockRenderer block={block as TableCloudBlock} />;
    case "audio":
      return <AudioRenderer block={block as AudioBlock} />;
    case "curriculum":
      return <CurriculumRenderer block={block as CurriculumBlock} />;
    case "schedule":
      return <ScheduleRenderer block={block as ScheduleBlock} />;
    case "website":
      return <WebsiteRenderer block={block as WebsiteBlock} />;
    default:
      return (
        <div className="p-4 bg-red-50 text-red-600 rounded text-sm">
          {t("unknownBlockType", { type: (block as WorksheetBlock).type })}
        </div>
      );
  }
}
