"use client";

import React, { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
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
  GridBlock,
  TrueFalseMatrixBlock,
  OrderItemsBlock,
  InlineChoicesBlock,
  migrateInlineChoicesBlock,
  WordSearchBlock,
  SortingCategoriesBlock,
  UnscrambleWordsBlock,
  FixSentencesBlock,
  CompleteSentencesBlock,
  TransformSentencesBlock,
  VerbTableBlock,
  VerbTableRow,
  ArticleTrainingBlock,
  ArticleAnswer,
  ChartBlock,
  NumberedLabelBlock,
  DialogueBlock,
  DialogueSpeakerIcon,
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
  ChecklistBlock,
  ChecklistItem,
  AccordionBlock,
  AccordionItem,
  LogoDividerBlock,
  AiPromptBlock,
  AiToolBlock,
  AudioBlock,
  ScheduleBlock,
  ScheduleItem,
  WebsiteBlock,
  TableBlock,
  BRAND_ICON_LOGOS,
  ViewMode,
} from "@/types/worksheet";
import { useEditor } from "@/store/editor-store";
import { authFetch } from "@/lib/auth-fetch";
import { useUpload } from "@/lib/use-upload";
import { getEffectiveValue, hasChOverride, replaceEszett } from "@/lib/locale-utils";
import { setByPath, getByPath } from "@/lib/locale-utils";
import { RichTextEditor } from "./rich-text-editor";
import { TableEditor } from "./table-editor";
import { MediaBrowserDialog } from "@/components/ui/media-browser-dialog";
import { ImageCropDialog, CropResult } from "@/components/ui/image-crop-dialog";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { Plus, Minus, X, Check, GripVertical, Trash2, Copy, Eye, EyeOff, Printer, Monitor, Sparkles, ArrowUpDown, Upload, ChevronUp, ChevronDown, ChevronsDown, ChevronsUp, Link2, ExternalLink, Mail, Paperclip, FormInput, User, Phone, ListChecks, ListOrdered, ArrowRight, ArrowRightToLine, BadgeAlert, Siren, Goal, Flag, Loader2, Bot, Square } from "lucide-react";
import { AiTrueFalseModal } from "./ai-true-false-modal";
import { AiMcqModal } from "./ai-mcq-modal";
import { AiTextModal } from "./ai-text-modal";
import { AiVerbTableModal } from "./ai-verb-table-modal";
import dynamic from "next/dynamic";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { BlockVisibility } from "@/types/worksheet";

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

function hashPreviewKey(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
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

// ─── Locale-aware inline editing ────────────────────────────

/**
 * Hook for locale-aware inline editing in block renderers.
 * In DE mode, updates go directly to the block via UPDATE_BLOCK.
 * In CH mode, updates are routed to CH overrides so that ß→ss
 * and other CH-specific changes don't contaminate the base DE blocks.
 */
function useLocaleAwareEdit() {
  const { state, dispatch } = useEditor();
  const isChMode = state.localeMode === "CH";

  /**
   * Update a string field in a locale-aware way.
   * @param blockId   - Block ID
   * @param fieldPath - Dot-path field in the block (e.g. "content", "options.2.text")
   * @param value     - New string value
   * @param deUpdate  - Function to execute for the DE-mode update
   */
  const localeUpdate = React.useCallback(
    (blockId: string, fieldPath: string, value: string, deUpdate: () => void) => {
      if (!isChMode) {
        deUpdate();
        return;
      }
      // CH mode → route to override system
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
      const autoReplaced = replaceEszett(baseValue);
      if (value === autoReplaced) {
        dispatch({ type: "CLEAR_CH_OVERRIDE", payload: { blockId, fieldPath } });
      } else {
        dispatch({ type: "SET_CH_OVERRIDE", payload: { blockId, fieldPath, value } });
      }
    },
    [isChMode, state.blocks, dispatch],
  );

  return { isChMode, localeUpdate };
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

function HeadingRenderer({ block }: { block: HeadingBlock }) {
  const { dispatch } = useEditor();
  const { localeUpdate } = useLocaleAwareEdit();
  const Tag = `h${block.level}` as keyof React.JSX.IntrinsicElements;
  const sizes = { 1: "text-3xl", 2: "text-2xl", 3: "text-xl" };

  return (
    <Tag
      className={`${sizes[block.level]} font-bold outline-none`}
      style={block.level === 3 ? { fontWeight: 800 } : undefined}
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

// ─── Text ────────────────────────────────────────────────────
function TextRenderer({ block }: { block: TextBlock }) {
  const { dispatch } = useEditor();
  const { localeUpdate } = useLocaleAwareEdit();
  const t = useTranslations("blockRenderer");
  const [showAiModal, setShowAiModal] = React.useState(false);

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
      onChange={(html) =>
        localeUpdate(block.id, "content", html, () =>
          dispatch({ type: "UPDATE_BLOCK", payload: { id: block.id, updates: { content: html } } })
        )
      }
      placeholder={t("startTyping")}
      floatingElement={imageEl}
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

// ─── Text Snippet (Textbaustein) ─────────────────────────────
function TextSnippetRenderer({ block }: { block: TextSnippetBlock }) {
  const { dispatch } = useEditor();
  const { localeUpdate } = useLocaleAwareEdit();
  const t = useTranslations("blockRenderer");

  return (
    <div className="relative group/text-snippet">
      <div className="border border-dashed border-amber-300 rounded-sm p-3 bg-amber-50/30">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs text-amber-600 font-medium">
            <Copy className="h-3.5 w-3.5" />
            {t("textSnippetLabel")}
          </div>
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
          <span className="text-slate-700">{block.from}</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-slate-400 w-16 shrink-0">{t("emailTo")}</span>
          <span className="text-slate-700">{block.to}</span>
        </div>
        <div className="flex items-baseline gap-2 pt-1 border-t border-slate-100">
          <span className="font-semibold text-slate-400 w-16 shrink-0">{t("emailSubject")}</span>
          <span className="font-semibold" style={isStyled ? { color } : undefined}>{block.subject}</span>
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
              {att.name}
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
                        <Upload className="h-8 w-8 text-primary mb-2" />
                        <span className="text-xs text-primary font-medium">{t("dropImage")}</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-muted-foreground/50 mb-2" />
                        <span className="text-xs text-muted-foreground">{t("dragOrClick")}</span>
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
              <div className={block.showWritingLines ? "px-2 pb-2" : "p-2 text-center text-sm"}>
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
  const brand = state.settings.brand || "edoomio";
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

// ─── Writing Rows ────────────────────────────────────────────
function WritingRowsRenderer({ block }: { block: WritingRowsBlock }) {
  return (
    <div>
      {Array.from({ length: block.rowCount }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 border-b last:border-b-0 py-2">
          <span className="text-xs font-bold text-muted-foreground bg-muted w-6 h-6 rounded flex items-center justify-center shrink-0">
            {String(i + 1).padStart(2, "0")}
          </span>
          <div className="flex-1" style={{ height: 24, borderBottom: '1px dashed var(--color-muted-foreground)', opacity: 1.0 }} />
        </div>
      ))}
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
            <span className="text-xs font-bold text-muted-foreground bg-muted w-6 h-6 rounded flex items-center justify-center shrink-0">
              {String(i + 1).padStart(2, "0")}
            </span>
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
                  localeUpdate(block.id, `options.${i}.text`, value, () => {
                    const newOptions = [...block.options];
                    newOptions[i] = { ...opt, text: value };
                    updateOptions(newOptions);
                  });
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
            onClick={addOption}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            {t("addOption")}
          </button>
          <button
            type="button"
            className="text-xs text-purple-500 hover:text-purple-700 flex items-center gap-1 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setShowAiModal(true);
            }}
          >
            <Sparkles className="h-3 w-3" /> {t("aiGenerate")}
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
  // Parse {{blank:answer}} patterns
  const parts = block.content.split(/(\{\{blank:[^}]+\}\})/g);

  return (
    <div className="leading-relaxed flex flex-wrap items-baseline">
      {parts.map((part, i) => {
        const match = part.match(/\{\{blank:(.+)\}\}/);
        if (match) {
          const raw = match[1];
          const commaIdx = raw.lastIndexOf(",");
          let answer: string;
          let widthMultiplier = 1;
          if (commaIdx !== -1) {
            answer = raw.substring(0, commaIdx).trim();
            const wStr = raw.substring(commaIdx + 1).trim();
            const parsed = Number(wStr);
            if (!isNaN(parsed)) widthMultiplier = parsed;
          } else {
            answer = raw.trim();
          }
          const widthStyle = widthMultiplier === 0
            ? { flex: 1 } as React.CSSProperties
            : { minWidth: `${80 * widthMultiplier}px` } as React.CSSProperties;
          return interactive ? (
            <input
              key={i}
              type="text"
              placeholder={t("fillInBlankPlaceholder")}
              className={`border-b border-dashed border-muted-foreground/30 bg-transparent px-2 py-0.5 text-center mx-1 focus:outline-none focus:border-primary inline`}
              style={widthMultiplier === 0 ? { flex: 1 } : { width: `${112 * widthMultiplier}px` }}
            />
          ) : (
            <span
              key={i}
              className={`inline-block bg-gray-100 rounded px-2 py-0.5 text-center mx-1 text-muted-foreground text-xs`}
              style={widthStyle}
            >
              {answer}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
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
  const t = useTranslations("blockRenderer");
  const activeIdx = state.activeItemIndex;

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
      const matches = item.content.matchAll(/\{\{blank:([^,}]+)/g);
      for (const m of matches) answers.push(m[1].trim());
    }
    return answers;
  }, [block.items, block.showWordBank]);

  return (
    <div>
      {block.showWordBank && wordBankAnswers.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3 p-2 bg-muted/40 rounded-sm">
          {wordBankAnswers.map((word, i) => (
            <span key={i} className="px-2 py-0.5 bg-background border border-border rounded text-sm">
              {word}
            </span>
          ))}
        </div>
      )}
      {block.items.map((item, idx) => {
        // Parse {{blank:answer}} patterns
        const parts = item.content.split(/(\{\{blank:[^}]+\}\})/g);

        return (
          <div
            key={item.id || idx}
            className={`flex items-center gap-3 border-b last:border-b-0 py-2 cursor-pointer rounded-sm transition-colors ${
              !interactive && activeIdx === idx
                ? "bg-blue-50 ring-1 ring-blue-200"
                : "hover:bg-muted/30"
            }`}
            onClick={() => handleRowClick(idx)}
          >
            <span className="text-xs font-bold text-muted-foreground bg-muted w-6 h-6 rounded flex items-center justify-center shrink-0">
              {String(idx + 1).padStart(2, "0")}
            </span>
            <span className="flex-1 leading-relaxed flex flex-wrap items-baseline">
              {parts.map((part, i) => {
                const match = part.match(/\{\{blank:(.+)\}\}/);
                if (match) {
                  const raw = match[1];
                  const commaIdx = raw.lastIndexOf(",");
                  let answer: string;
                  let widthMultiplier = 1;
                  if (commaIdx !== -1) {
                    answer = raw.substring(0, commaIdx).trim();
                    const wStr = raw.substring(commaIdx + 1).trim();
                    const parsed = Number(wStr);
                    if (!isNaN(parsed)) widthMultiplier = parsed;
                  } else {
                    answer = raw.trim();
                  }
                  const widthStyle = widthMultiplier === 0
                    ? { flex: 1 } as React.CSSProperties
                    : { minWidth: `${80 * widthMultiplier}px` } as React.CSSProperties;
                  return interactive ? (
                    <input
                      key={i}
                      type="text"
                      placeholder={t("fillInBlankPlaceholder")}
                      className="border-b border-dashed border-muted-foreground/30 bg-transparent px-2 py-0.5 text-center mx-1 focus:outline-none focus:border-primary inline"
                      style={widthMultiplier === 0 ? { flex: 1 } : { width: `${112 * widthMultiplier}px` }}
                    />
                  ) : (
                    <span
                      key={i}
                      className="inline-block border-b border-dashed border-muted-foreground/30 px-2 py-0.5 text-center mx-1 text-muted-foreground text-xs"
                      style={widthStyle}
                    >
                      {answer}
                    </span>
                  );
                }
                return <span key={i}>{renderTextWithSup(part)}</span>;
              })}
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
function MatchingRenderer({ block }: { block: MatchingBlock }) {
  const shuffledRight = getDeterministicPreviewOrder(
    block.pairs,
    (pair, index) => `${pair.id}:${pair.right}:${index}`
  );

  return (
    <div className="space-y-3">
      <p className="text-base text-muted-foreground">{block.instruction}</p>
      <div className="grid grid-cols-2" style={{ gap: "0 24px" }}>
        <div className="space-y-0">
          {block.pairs.map((pair, i) => (
            <div
              key={pair.id}
              className={`flex items-center gap-3 py-2 border-b ${i === 0 ? "border-t" : ""}`}
            >
              <span className="text-xs font-bold text-muted-foreground bg-muted w-6 h-6 rounded flex items-center justify-center shrink-0">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="flex-1">{pair.left}</span>
            </div>
          ))}
        </div>
        <div className="space-y-0">
          {shuffledRight.map((pair, i) => (
            <div
              key={`right-${pair.id}`}
              className={`flex items-center gap-3 py-2 border-b ${i === 0 ? "border-t" : ""}`}
            >
              <span className="text-xs font-bold text-muted-foreground bg-muted w-6 h-6 rounded flex items-center justify-center shrink-0">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="flex-1">{pair.right}</span>
            </div>
          ))}
        </div>
      </div>
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
      <p className="text-base text-muted-foreground">{block.instruction}</p>
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
  const t = useTranslations("blockRenderer");
  return (
    <div className="border-2 border-dashed border-muted-foreground/30 rounded-sm p-4">
      <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
        {t("wordBank")}
      </p>
      <div className="flex flex-wrap gap-2">
        {block.words.map((word, i) => (
          <span
            key={i}
            className="px-3 py-1 bg-muted rounded-full text-base font-medium"
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
          <div className="w-16 text-center font-medium text-muted-foreground">{block.trueLabel || tc("true")}</div>
          <div className="w-16 text-center font-medium text-muted-foreground">{block.falseLabel || tc("false")}</div>
          <div className="w-8"></div>
        </div>
        <div>
          {(() => {
            const orderedStatements = block.statementOrder
              ? block.statementOrder
                  .map((id) => block.statements.find((s) => s.id === id))
                  .filter((s): s is NonNullable<typeof s> => !!s)
                  .concat(block.statements.filter((s) => !block.statementOrder!.includes(s.id)))
              : block.statements;
            return orderedStatements.map((stmt, stmtIndex) => (
            <div key={stmt.id} className="group/row flex items-center gap-3 py-2 border-b last:border-b-0">
              <div className="flex flex-1 items-center gap-3">
                <span className="text-xs font-bold text-muted-foreground bg-muted w-6 h-6 rounded flex items-center justify-center shrink-0">
                  {String(stmtIndex + 1).padStart(2, "0")}
                </span>
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
              <div className="w-16 flex items-center justify-center">
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
              <div className="w-16 flex items-center justify-center">
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
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="w-8 p-2 border-b"></th>
            {articles.map((a) => (
              <th key={a} className="w-14 p-2 border-b text-center font-medium text-muted-foreground">{a}</th>
            ))}
            <th className="text-left py-2 px-2 border-b font-bold text-foreground">{t("articleNoun")}</th>
            {block.showWritingLine && (
              <th className="text-left py-2 px-2 border-b font-bold text-muted-foreground">{t("articleWritingLine")}</th>
            )}
            <th className="w-8 p-2 border-b"></th>
          </tr>
        </thead>
        <tbody>
          {block.items.map((item, idx) => (
            <tr key={item.id} className="group/row border-b last:border-b-0">
              <td className="p-2 text-center">
                <span className="text-xs font-bold text-muted-foreground bg-muted w-6 h-6 rounded flex items-center justify-center shrink-0">
                  {String(idx + 1).padStart(2, "0")}
                </span>
              </td>
              {articles.map((a) => (
                <td key={a} className="p-2 text-center">
                  <button
                    className={`w-5 h-5 rounded-full border-2 inline-flex items-center justify-center transition-colors
                      ${item.correctArticle === a
                        ? "bg-green-500 border-green-500 text-white"
                        : "border-muted-foreground/30 hover:border-green-400"
                      }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      updateItem(item.id, { correctArticle: a });
                    }}
                  >
                    {item.correctArticle === a && <Check className="h-3 w-3" />}
                  </button>
                </td>
              ))}
              <td className="py-2 px-2">
                <span
                  className="outline-none block flex-1"
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
              </td>
              {block.showWritingLine && (
                <td className="py-2 px-2">
                  <div className="border-b border-muted-foreground/30 h-6 min-w-[100px]" />
                </td>
              )}
              <td className="p-2 text-center">
                <button
                  className="opacity-0 group-hover/row:opacity-100 p-0.5 hover:bg-destructive/10 rounded transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeItem(item.id);
                  }}
                >
                  <X className="h-3 w-3 text-destructive" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex items-center gap-3">
        <button
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          onClick={(e) => {
            e.stopPropagation();
            addItem();
          }}
        >
          <Plus className="h-3 w-3" /> {t("addNoun")}
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
      <div className="space-y-2">
        {sortedItems.map((item, i) => (
          <div
            key={item.id}
            className="flex items-center gap-3 group/item p-3 rounded-sm border border-border"
          >
            <span className="text-xs font-bold text-muted-foreground bg-muted w-6 h-6 rounded flex items-center justify-center shrink-0">
              {String(i + 1).padStart(2, "0")}
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
  const segments: Array<{ type: "text"; value: string } | { type: "choice"; options: string[] }> = [];
  parts.forEach((part) => {
    const match = part.match(/\{\{(?:choice:)?(.+)\}\}/);
    if (match) {
      const rawOptions = match[1].split("|");
      const starIdx = rawOptions.findIndex((o) => o.startsWith("*"));
      const options = starIdx >= 0
        ? [rawOptions[starIdx].slice(1), ...rawOptions.filter((_, idx) => idx !== starIdx).map((o) => o.startsWith("*") ? o.slice(1) : o)]
        : rawOptions;
      segments.push({ type: "choice", options });
    } else {
      segments.push({ type: "text", value: part });
    }
  });
  return segments;
}

/** Reconstruct content string from segments. */
function serializeInlineChoiceSegments(segments: Array<{ type: "text"; value: string } | { type: "choice"; options: string[] }>): string {
  return segments.map((s) => s.type === "choice" ? `{{${s.options.join("|")}}}` : s.value).join("");
}

/** Render a read-only inline choice line (used as fallback / for interactive mode). */
function renderInlineChoiceLine(content: string): React.ReactNode[] {
  const segments = parseInlineChoiceSegments(content);
  let hasTextBefore = false;
  return segments.map((seg, i) => {
    if (seg.type === "choice") {
      const atStart = !hasTextBefore;
      return (
        <span key={i} className="inline-flex items-center gap-1 mx-0.5">
          {seg.options.map((opt, oi) => {
            const isCorrect = oi === 0;
            const label = atStart ? opt.charAt(0).toUpperCase() + opt.slice(1) : opt;
            return (
              <span key={oi} className="inline-flex items-center">
                {oi > 0 && <span className="mx-0.5 text-muted-foreground">/</span>}
                <span
                  className={`inline-flex items-center gap-0.5 font-semibold ${
                    isCorrect
                      ? "font-semibold text-green-700 bg-green-50 px-1 rounded"
                      : ""
                  }`}
                >
                  <span
                    className={`inline-block w-3 h-3 rounded-full border-[1.5px] shrink-0 ${
                      isCorrect
                        ? "border-green-500 bg-green-500"
                        : "border-muted-foreground/40"
                    }`}
                    style={{ position: 'relative', top: 2 }}
                  />
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
}: {
  content: string;
  onChange: (newContent: string) => void;
}) {
  const segments = React.useMemo(() => parseInlineChoiceSegments(content), [content]);
  const segmentsRef = React.useRef(segments);
  segmentsRef.current = segments;

  // Track whether any visible text appeared before each segment
  let hasTextBefore = false;
  const textBefore: boolean[] = [];
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
          return (
            <span
              key={i}
              className="inline-flex items-center gap-1 mx-0.5 cursor-default"
              contentEditable={false}
            >
              {seg.options.map((opt, oi) => {
                const isCorrect = oi === 0;
                const label = atStart ? opt.charAt(0).toUpperCase() + opt.slice(1) : opt;
                return (
                  <span key={oi} className="inline-flex items-center">
                    {oi > 0 && <span className="mx-0.5 text-muted-foreground">/</span>}
                    <span
                      className={`inline-flex items-center gap-0.5 font-semibold ${
                        isCorrect
                          ? "font-semibold text-green-700 bg-green-50 px-1 rounded"
                          : ""
                      }`}
                    >
                      <span
                        className={`inline-block w-3 h-3 rounded-full border-[1.5px] shrink-0 ${
                          isCorrect
                            ? "border-green-500 bg-green-500"
                            : "border-muted-foreground/40"
                        }`}
                        style={{ position: 'relative', top: 2 }}
                      />
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
        <div
          key={item.id || idx}
          className={`flex items-center gap-3 border-b last:border-b-0 py-2 cursor-pointer rounded-sm transition-colors ${
            !interactive && activeIdx === idx
              ? "bg-blue-50 ring-1 ring-blue-200"
              : "hover:bg-muted/30"
          }`}
          onClick={() => handleRowClick(idx)}
        >
          <span className="text-xs font-bold text-muted-foreground bg-muted w-6 h-6 rounded flex items-center justify-center shrink-0">
            {String(idx + 1).padStart(2, "0")}
          </span>
          <span className="flex-1">
            {interactive ? (
              renderInlineChoiceLine(item.content)
            ) : (
              <EditableInlineChoiceLine
                content={item.content}
                onChange={(c) => updateItemContent(idx, c)}
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

// ─── Word Search ────────────────────────────────────────────
function generateWordSearchGrid(
  words: string[],
  cols: number,
  rows: number
): string[][] {
  const grid: string[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => "")
  );

  const directions = [
    [0, 1],   // right
    [1, 0],   // down
    [1, 1],   // diagonal down-right
    [-1, 1],  // diagonal up-right
    [0, -1],  // left
    [1, -1],  // diagonal down-left
  ];

  const upperWords = words.map((w) => w.toUpperCase().replace(/\s+/g, ""));

  for (const word of upperWords) {
    let placed = false;
    let attempts = 0;
    while (!placed && attempts < 100) {
      attempts++;
      const dir = directions[Math.floor(Math.random() * directions.length)];
      const startRow = dir[0] < 0
        ? Math.floor(Math.random() * (rows - word.length)) + word.length - 1
        : Math.floor(Math.random() * (rows - (dir[0] > 0 ? word.length - 1 : 0)));
      const startCol = dir[1] < 0
        ? Math.floor(Math.random() * (cols - word.length)) + word.length - 1
        : Math.floor(Math.random() * (cols - (dir[1] > 0 ? word.length - 1 : 0)));

      let canPlace = true;
      for (let k = 0; k < word.length; k++) {
        const r = startRow + k * dir[0];
        const c = startCol + k * dir[1];
        if (r < 0 || r >= rows || c < 0 || c >= cols) {
          canPlace = false;
          break;
        }
        if (grid[r][c] !== "" && grid[r][c] !== word[k]) {
          canPlace = false;
          break;
        }
      }
      if (canPlace) {
        for (let k = 0; k < word.length; k++) {
          grid[startRow + k * dir[0]][startCol + k * dir[1]] = word[k];
        }
        placed = true;
      }
    }
  }

  // Fill empty cells with random letters
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === "") {
        grid[r][c] = letters[Math.floor(Math.random() * letters.length)];
      }
    }
  }

  return grid;
}

function WordSearchRenderer({ block }: { block: WordSearchBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("blockRenderer");

  const cols = block.gridCols ?? block.gridSize ?? 24;
  const rows = block.gridRows ?? block.gridSize ?? 12;

  // Generate grid if empty
  React.useEffect(() => {
    if (block.grid.length === 0 && block.words.length > 0) {
      const newGrid = generateWordSearchGrid(block.words, cols, rows);
      dispatch({
        type: "UPDATE_BLOCK",
        payload: { id: block.id, updates: { grid: newGrid } },
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const regenerateGrid = () => {
    const newGrid = generateWordSearchGrid(block.words, cols, rows);
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
          <table className="w-full border-separate border-spacing-0">
            <tbody>
              {block.grid.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => {
                    let cornerClass = "";
                    if (ri === 0 && ci === 0) cornerClass = "rounded-tl-sm";
                    if (ri === 0 && ci === row.length - 1) cornerClass = "rounded-tr-lg";
                    if (ri === block.grid.length - 1 && ci === 0) cornerClass = "rounded-bl-lg";
                    if (ri === block.grid.length - 1 && ci === row.length - 1) cornerClass = "rounded-br-lg";
                    return (
                      <td
                        key={ci}
                        className={`text-center text-base font-mono font-semibold select-none border border-border aspect-square ${cornerClass}`}
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
      )}

      {/* Word list */}
      {block.showWordList && (
        <div className="flex flex-wrap gap-2">
          {block.words.map((word, i) => (
            <span
              key={i}
              className="px-2 py-0.5 bg-muted rounded text-xs font-medium uppercase tracking-wide"
            >
              {word}
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

// ─── Sorting Categories ─────────────────────────────────────
function SortingCategoriesRenderer({ block }: { block: SortingCategoriesBlock }) {
  const { dispatch } = useEditor();
  const { localeUpdate } = useLocaleAwareEdit();
  const t = useTranslations("blockRenderer");

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
          const catItems = block.items.filter((item) =>
            cat.correctItems.includes(item.id)
          );
          return (
            <div key={cat.id} className="rounded-sm border border-border overflow-hidden">
              <div className="bg-muted px-3 py-2">
                <span
                  className="font-semibold outline-none block"
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
              <div className="p-2 space-y-1.5 min-h-[60px]">
                {catItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 p-2 rounded border border-border bg-card group/item"
                  >
                    <span
                      contentEditable
                      suppressContentEditableWarning
                      className="text-base outline-none flex-1 border-b border-transparent focus:border-muted-foreground/30 transition-colors"
                      onBlur={(e) => {
                        const value = e.currentTarget.textContent || "";
                        const arrIdx = block.items.findIndex((it) => it.id === item.id);
                        localeUpdate(block.id, `items.${arrIdx}.text`, value, () =>
                          updateItem(item.id, value)
                        );
                      }}
                    >
                      {item.text}
                    </span>
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
                ))}
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

      <div className="space-y-2">
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
              className="flex items-center gap-3 group/item p-3 rounded-sm border border-border"
            >
              <span className="text-xs font-bold text-muted-foreground bg-muted w-6 h-6 rounded flex items-center justify-center shrink-0">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-base tracking-widest text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                {scrambled}
              </span>
              <span className="text-muted-foreground text-xs">→</span>
              <span
                contentEditable
                suppressContentEditableWarning
                className="text-base outline-none flex-1 border-b border-transparent focus:border-muted-foreground/30 transition-colors font-medium text-green-700"
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

// ─── Fix Sentences ──────────────────────────────────────────
function FixSentencesRenderer({ block }: { block: FixSentencesBlock }) {
  const { dispatch } = useEditor();
  const { localeUpdate } = useLocaleAwareEdit();
  const t = useTranslations("blockRenderer");

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

      <div className="space-y-3">
        {block.sentences.map((item, i) => {
          const parts = item.sentence.split(" | ");
          return (
            <div
              key={item.id}
              className="group/item rounded-sm border border-border overflow-hidden"
            >
              <div className="flex items-center gap-3 p-3 bg-muted/30">
                <span className="text-xs font-bold text-muted-foreground bg-muted w-6 h-6 rounded flex items-center justify-center shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex-1 flex flex-wrap gap-1.5">
                  {parts.map((part, pi) => (
                    <span
                      key={pi}
                      className="px-2 py-0.5 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800 font-medium"
                    >
                      {part.trim()}
                    </span>
                  ))}
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
              <div className="px-3 py-2">
                <input
                  type="text"
                  value={item.sentence}
                  onChange={(e) => {
                    const value = e.target.value;
                    const arrIdx = block.sentences.findIndex((s) => s.id === item.id);
                    localeUpdate(block.id, `sentences.${arrIdx}.sentence`, value, () =>
                      updateSentence(item.id, value)
                    );
                  }}
                  className="w-full text-xs text-muted-foreground bg-transparent border-0 outline-none font-mono"
                  placeholder={t("fixSentencePlaceholder")}
                />
              </div>
            </div>
          );
        })}
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
            <span className="text-xs font-bold text-muted-foreground bg-muted w-6 h-6 rounded flex items-center justify-center shrink-0">
              {String(i + 1).padStart(2, "0")}
            </span>
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

// ─── Transform Sentences ────────────────────────────────────
function TransformSentencesRenderer({ block }: { block: TransformSentencesBlock }) {
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
            className="group/item py-2 border-b last:border-b-0"
          >
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-muted-foreground bg-muted w-6 h-6 rounded flex items-center justify-center shrink-0">
                {String(i + 1).padStart(2, "0")}
              </span>
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
            <div className="ml-9 mt-1 border-b border-dashed border-muted-foreground/30 min-h-[14px]" />
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
  const { state, dispatch, duplicateBlock } = useEditor();
  const t = useTranslations("blockRenderer");
  const tc = useTranslations("common");
  const isSelected = state.selectedBlockId === block.id;
  const isVisibleInMode = block.visibility === "both" || block.visibility === mode;
  const VisIcon = colChildVisibilityIcons[block.visibility];

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
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3 w-3 text-muted-foreground" />
        </button>

        {/* Visibility toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="p-0.5 hover:bg-muted rounded"
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
        [&_p:first-child]:-mt-2.5 [&_p:last-child]:mb-0
        ${bgColor || borderColor ? "rounded" : "rounded-sm"}
        ${showBorder ? "border border-dashed" : "border border-transparent"}
        ${isOver ? "border-primary bg-primary/5" : showBorder ? "border-border" : ""}
        ${isEmpty ? "" : ""}`}
      style={
        isOver
          ? undefined
          : {
              ...(bgColor ? { backgroundColor: bgColor } : {}),
              ...(showBorder && borderColor ? { borderColor } : {}),
            }
      }
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
}: {
  blockId: string;
  cellIndex: number;
  children: React.ReactNode;
  isEmpty: boolean;
  row: number;
  col: number;
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

// ─── Dialogue ────────────────────────────────────────────────
function DialogueRenderer({
  block,
  interactive,
}: {
  block: DialogueBlock;
  interactive: boolean;
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
  for (const item of block.items) {
    const matches = item.text.matchAll(/\{\{blank:([^}]+)\}\}/g);
    for (const m of matches) {
      const raw = m[1];
      const answer = raw.includes(",") ? raw.substring(0, raw.lastIndexOf(",")).trim() : raw.trim();
      gapAnswers.push(answer);
    }
  }

  // Render text with gaps
  const renderDialogueText = (text: string) => {
    const parts = text.split(/(\{\{blank:[^}]+\}\})/g);
    return parts.map((part, i) => {
      const match = part.match(/\{\{blank:(.+)\}\}/);
      if (match) {
        const raw = match[1];
        // Parse optional width: {{blank:answer,N}}
        const commaIdx = raw.lastIndexOf(",");
        let answer: string;
        let widthMultiplier = 1;
        if (commaIdx !== -1) {
          answer = raw.substring(0, commaIdx).trim();
          const wStr = raw.substring(commaIdx + 1).trim();
          const parsed = Number(wStr);
          if (!isNaN(parsed)) widthMultiplier = parsed;
        } else {
          answer = raw.trim();
        }
        const widthStyle = widthMultiplier === 0
          ? { flex: 1 } as React.CSSProperties
          : { minWidth: `${80 * widthMultiplier}px` } as React.CSSProperties;
        return interactive ? (
          <input
            key={i}
            type="text"
            placeholder="…"
            className={`border-b border-dashed border-muted-foreground/30 bg-transparent px-2 py-0.5 text-center mx-1 focus:outline-none focus:border-primary inline`}
            style={widthMultiplier === 0 ? { flex: 1 } : { width: `${112 * widthMultiplier}px` }}
          />
        ) : (
          <span
            key={i}
            className={`inline-block border-b border-dashed border-muted-foreground/30 px-2 py-0.5 text-center mx-1 text-muted-foreground text-xs`}
            style={widthStyle}
          >
            {answer}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="space-y-3">
      {block.instruction && (
        <p className="text-base text-muted-foreground">{block.instruction}</p>
      )}
      {/* Word Bank */}
      {block.showWordBank && gapAnswers.length > 0 && (
        <div className="rounded p-3 border border-dashed border-muted-foreground/30">
          <div className="text-xs text-muted-foreground mb-2 font-medium">{t("wordBank")}</div>
          <div className="flex flex-wrap gap-2">
            {getDeterministicPreviewOrder(
              gapAnswers,
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
      {/* Dialogue items */}
      <div className="space-y-0">
        {block.items.map((item, i) => (
          <div key={item.id} className={`flex items-center gap-3 py-2 border-b ${i === 0 ? "border-t" : ""}`}>
            <span className="text-xs font-bold text-muted-foreground bg-muted w-6 h-6 rounded flex items-center justify-center shrink-0">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="text-xs font-bold text-muted-foreground bg-white border border-border box-border w-6 h-6 rounded flex items-center justify-center shrink-0">
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
            <div
              className={`shrink-0 w-[30px] flex items-center justify-center font-bold${!hasBg ? ' bg-primary/10 text-primary' : ''}`}
              style={{
                ...(hasBg ? { backgroundColor: block.bgColor, color: textWhite ? '#fff' : '#000' } : {}),
                borderRadius: hasBg ? `${radius}px 0 0 ${radius}px` : `${radius}px`,
                ...(textBaseSize ? { fontSize: textBaseSize } : {}),
              }}
            >
              {String(block.startNumber + i).padStart(2, '0')}
            </div>
            <div className="numbered-items-richtext flex-1 min-w-0 px-3 py-1.5 text-foreground font-normal">
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
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors ml-11"
      >
        <Plus className="h-3 w-3" /> Add
      </button>
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
    <div className="space-y-1">
      {block.items.map((item, i) => (
        <div key={item.id} className="relative group border border-border rounded-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className="flex items-center gap-2 w-full px-3 py-2.5 text-left bg-muted/40 hover:bg-muted/60 transition-colors"
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
          </button>
          {openIndex === i && (
            <div className="px-3 py-3">
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

      const file = new File([blob], `website-preview-${Date.now()}.png`, {
        type: "image/png",
      });
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

  const removeItem = (index: number) => {
    if (block.items.length <= 1) return;
    updateItems(block.items.filter((_, itemIndex) => itemIndex !== index));
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
                  onClick={() => updateItem(index, { pageBreakAfter: !(item.pageBreakAfter ?? false) })}
                  className={`text-slate-400 hover:text-slate-700 ${item.pageBreakAfter ? "text-slate-700" : ""}`}
                  title={pageBreakLabel}
                >
                  <Printer className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => moveItem(index, "up")}
                  disabled={index === 0}
                  className="text-slate-400 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => moveItem(index, "down")}
                  disabled={index === block.items.length - 1}
                  className="text-slate-400 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  disabled={block.items.length <= 1}
                  className="text-slate-400 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
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
                onClick={dismissBlockedPreview}
                className="px-3 py-1.5 text-sm rounded border border-border hover:bg-muted transition-colors"
              >
                {t("websiteBlockedDiscard")}
              </button>
              <button
                type="button"
                onClick={() => void confirmBlockedPreview()}
                className="px-3 py-1.5 text-sm rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
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
function ScheduleRenderer({ block }: { block: ScheduleBlock }) {
  const { state } = useEditor();
  const primaryColor = state.brandProfile.primaryColor || "#1a1a1a";

  return (
    <StaticScheduleTable
      items={block.items}
      primaryColor={primaryColor}
      showDate={block.showDate ?? false}
      showRoom={block.showRoom ?? false}
      showHeader={block.showHeader ?? false}
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
}: {
  items: ScheduleBlock["items"];
  primaryColor: string;
  showDate: boolean;
  showRoom: boolean;
  showHeader: boolean;
}) {
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
            const { weekday, formatted } = formatScheduleCellDate(item.date);

            return (
              <tr key={item.id}>
                {showDate && <td style={rowCellStyle}>{weekday}</td>}
                {showDate && <td style={rowCellStyle}>{formatted}</td>}
                <td style={rowCellStyle}>{formatScheduleCellTime(item.start)}</td>
                <td style={{ ...rowCellStyle, paddingLeft: 0, paddingRight: 0 }}>–</td>
                <td style={rowCellStyle}>{formatScheduleCellTime(item.end)}</td>
                {showRoom && <td style={rowCellStyle}>{item.room}</td>}
                <td style={{ padding: "4px 8px", lineHeight: "1.35rem", verticalAlign: "top", boxSizing: "border-box" }}>
                  <div style={{ fontWeight: 700 }}>{item.title}</div>
                  {item.description ? <div>{item.description}</div> : null}
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
      <TableEditor
        content={block.content}
        columnWidths={block.columnWidths}
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

  // Apply CH overrides when in CH locale mode
  const block = React.useMemo(() => {
    if (state.localeMode !== "CH") return rawBlock;
    const overrides = state.settings.chOverrides?.[rawBlock.id];
    // First apply automatic ß→ss, then layer manual overrides on top
    let effective = replaceEszett(rawBlock);
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
    case "text":
      return <TextRenderer block={block} />;
    case "image":
      return <ImageRenderer block={block} />;
    case "image-cards":
      return <ImageCardsRenderer block={block} />;
    case "text-cards":
      return <TextCardsRenderer block={block} />;
    case "spacer":
      return <SpacerRenderer block={block} />;
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
    case "multiple-choice":
      return <MultipleChoiceRenderer block={block} interactive={interactive} />;
    case "fill-in-blank":
      return <FillInBlankRenderer block={block} interactive={interactive} />;
    case "fill-in-blank-items":
      return <FillInBlankItemsRenderer block={block} interactive={interactive} />;
    case "matching":
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
    case "article-training":
      return <ArticleTrainingRenderer block={block} interactive={interactive} />;
    case "order-items":
      return <OrderItemsRenderer block={block} interactive={interactive} />;
    case "inline-choices":
      return <InlineChoicesRenderer block={block} interactive={interactive} />;
    case "word-search":
      return <WordSearchRenderer block={block} />;
    case "sorting-categories":
      return <SortingCategoriesRenderer block={block} />;
    case "unscramble-words":
      return <UnscrambleWordsRenderer block={block} />;
    case "fix-sentences":
      return <FixSentencesRenderer block={block} />;
    case "complete-sentences":
      return <CompleteSentencesRenderer block={block} />;
    case "transform-sentences":
      return <TransformSentencesRenderer block={block} />;
    case "verb-table":
      return <VerbTableRenderer block={block} />;
    case "chart":
      return <ChartRenderer block={block} />;
    case "dialogue":
      return <DialogueRenderer block={block} interactive={interactive} />;
    case "numbered-label":
      return <NumberedLabelRenderer block={block} />;
    case "columns":
      return <ColumnsRenderer block={block} mode={mode} />;
    case "grid":
      return <GridRenderer block={block as GridBlock} mode={mode} />;
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
    case "audio":
      return <AudioRenderer block={block as AudioBlock} />;
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
