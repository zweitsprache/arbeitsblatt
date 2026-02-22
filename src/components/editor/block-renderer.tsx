"use client";

import React from "react";
import { useTranslations } from "next-intl";
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
  OrderItemsBlock,
  InlineChoicesBlock,
  migrateInlineChoicesBlock,
  WordSearchBlock,
  SortingCategoriesBlock,
  UnscrambleWordsBlock,
  FixSentencesBlock,
  CompleteSentencesBlock,
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
  ViewMode,
} from "@/types/worksheet";
import { useEditor } from "@/store/editor-store";
import { getEffectiveValue, hasChOverride, replaceEszett } from "@/lib/locale-utils";
import { setByPath, getByPath } from "@/lib/locale-utils";
import { RichTextEditor } from "./rich-text-editor";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { Plus, X, Check, GripVertical, Trash2, Copy, Eye, EyeOff, Printer, Monitor, Sparkles, ArrowUpDown, Upload, ChevronUp, ChevronDown } from "lucide-react";
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

// Helper: collect all numbered-label blocks in document order (top-level + inside columns)
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

  return (
    <>
      <div className="relative group/text">
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
        <button
          type="button"
          onClick={() => setShowAiModal(true)}
          className="absolute -top-2 -right-2 opacity-0 group-hover/text:opacity-100 transition-opacity bg-purple-600 hover:bg-purple-700 text-white rounded-full p-1.5 shadow-md z-10"
          title={t("aiGenerateReadingText")}
        >
          <Sparkles className="h-3.5 w-3.5" />
        </button>
      </div>
      <AiTextModal
        open={showAiModal}
        onOpenChange={setShowAiModal}
        blockId={block.id}
      />
    </>
  );
}

// ─── Image ───────────────────────────────────────────────────
function ImageRenderer({ block }: { block: ImageBlock }) {
  const t = useTranslations("blockRenderer");
  if (!block.src) {
    return (
      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center text-muted-foreground text-sm">
        <p>{t("clickToAddImage")}</p>
      </div>
    );
  }
  return (
    <figure>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={block.src}
        alt={block.alt}
        className="max-w-full rounded"
        style={block.width ? { width: block.width } : undefined}
      />
      {block.caption && (
        <figcaption className="text-sm text-muted-foreground mt-1 text-center">
          {block.caption}
        </figcaption>
      )}
    </figure>
  );
}

// ─── Image Cards ─────────────────────────────────────────────
function ImageCardsRenderer({ block }: { block: ImageCardsBlock }) {
  const { dispatch } = useEditor();
  const { localeUpdate } = useLocaleAwareEdit();
  const t = useTranslations("blockRenderer");
  const [uploadingIndex, setUploadingIndex] = React.useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null);

  const handleImageUpload = async (file: File, index: number) => {
    if (!file.type.startsWith("image/")) return;
    setUploadingIndex(index);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (response.ok) {
        const data = await response.json();
        const newItems = [...block.items];
        newItems[index] = { ...newItems[index], src: data.url, alt: file.name };
        dispatch({
          type: "UPDATE_BLOCK",
          payload: { id: block.id, updates: { items: newItems } },
        });
      }
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
            {block.items
              .filter(item => item.text)
              .sort(() => Math.random() - 0.5)
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
        className="w-full py-2 border-2 border-dashed border-muted-foreground/25 rounded-lg text-muted-foreground text-sm hover:border-muted-foreground/50 hover:text-foreground transition-colors flex items-center justify-center gap-2"
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
            {block.items
              .filter(item => item.caption)
              .sort(() => Math.random() - 0.5)
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
        className="w-full py-2 border-2 border-dashed border-muted-foreground/25 rounded-lg text-muted-foreground text-sm hover:border-muted-foreground/50 hover:text-foreground transition-colors flex items-center justify-center gap-2"
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

// ─── Page Break ──────────────────────────────────────────────
function PageBreakRenderer({ block: _block }: { block: PageBreakBlock }) {
  return (
    <div className="relative flex items-center justify-center py-2">
      <div className="absolute inset-x-0 top-1/2 border-t-2 border-dashed border-blue-300" />
      <span className="relative z-10 bg-white px-3 py-0.5 text-xs font-medium text-blue-500 border border-blue-200 rounded-full">
        Seitenumbruch
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
          <div key={opt.id} className="flex items-center gap-3 p-3 rounded-lg border border-border group">
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
        <div className="flex flex-wrap gap-2 mb-3 p-2 bg-muted/40 rounded-md">
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
  // Shuffle right column for display
  const shuffledRight = [...block.pairs].sort(() => Math.random() - 0.5);

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
            {[...wordBankItems]
              .sort(() => Math.random() - 0.5)
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
  return (
    <div className="space-y-3">
      {block.instruction && (
        <p className="text-base text-muted-foreground">{block.instruction}</p>
      )}
      <div className="space-y-0">
        {block.pairs.map((pair) => (
          <div
            key={pair.id}
            className="flex items-start gap-4 py-2 border-b last:border-b-0"
          >
            <span className="text-base font-semibold" style={{ width: "25%", minWidth: "25%", flexShrink: 0 }}>
              {pair.term}
            </span>
            <span className="text-base flex-1">
              {pair.definition}
            </span>
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
          className="w-full border rounded-md p-2 text-base resize-none focus:outline-none focus:ring-2 focus:ring-primary"
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
    <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-4">
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
      {/* Table */}
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="text-left py-2 pr-2 border-b font-bold text-foreground">
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
            </th>
            <th className="w-16 p-2 border-b text-center font-medium text-muted-foreground">{block.trueLabel || tc("true")}</th>
            <th className="w-16 p-2 border-b text-center font-medium text-muted-foreground">{block.falseLabel || tc("false")}</th>
            <th className="w-8 p-2 border-b"></th>
          </tr>
        </thead>
        <tbody>
          {(() => {
            const orderedStatements = block.statementOrder
              ? block.statementOrder
                  .map((id) => block.statements.find((s) => s.id === id))
                  .filter((s): s is NonNullable<typeof s> => !!s)
                  .concat(block.statements.filter((s) => !block.statementOrder!.includes(s.id)))
              : block.statements;
            return orderedStatements.map((stmt, stmtIndex) => (
            <tr key={stmt.id} className="group/row border-b last:border-b-0">
              <td className="py-2 pr-2">
                <div className="flex items-center gap-3">
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
              </td>
              <td className="p-2 text-center">
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
              </td>
              <td className="p-2 text-center">
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
              </td>
              <td className="p-2 text-center">
                <button
                  className="opacity-0 group-hover/row:opacity-100 p-0.5 hover:bg-destructive/10 rounded transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeStatement(stmt.id);
                  }}
                >
                  <X className="h-3 w-3 text-destructive" />
                </button>
              </td>
            </tr>
          ));
          })()}
        </tbody>
      </table>

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
            className="flex items-center gap-3 group/item p-3 rounded-lg border border-border"
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
                    if (ri === 0 && ci === 0) cornerClass = "rounded-tl-lg";
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
            <div key={cat.id} className="rounded-md border border-border overflow-hidden">
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
              className="flex items-center gap-3 group/item p-3 rounded-lg border border-border"
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
              className="group/item rounded-lg border border-border overflow-hidden"
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
        <table className="flex-1 border-separate border-spacing-0 border-2 border-border rounded-lg overflow-hidden" style={{ fontSize: 16 }}>
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
              <td colSpan={colCount} className="border-b border-border px-3 py-2 font-bold uppercase tracking-wider text-muted-foreground rounded-tl-lg rounded-tr-lg" style={{ fontSize: 16 }}>
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
      className={`group/child relative rounded-md border transition-all
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
        className={`absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-background border rounded-md shadow-sm px-1 py-0.5 z-20
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
}: {
  blockId: string;
  colIndex: number;
  children: React.ReactNode;
  isEmpty: boolean;
}) {
  const t = useTranslations("blockRenderer");
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${blockId}-${colIndex}`,
    data: { type: "column-drop", blockId, colIndex },
  });

  return (
    <div
      ref={setNodeRef}
      className={`border border-dashed rounded-md p-3 min-h-[80px] space-y-2 transition-colors
        ${isOver ? "border-primary bg-primary/5" : "border-border"}
        ${isEmpty ? "" : ""}`}
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
            {[...gapAnswers]
              .sort(() => Math.random() - 0.5)
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

  // Compute the ordinal position of this block among all numbered-label blocks
  const allNL = React.useMemo(() => collectNumberedLabelBlocks(state.blocks), [state.blocks]);
  const index = allNL.findIndex((b) => b.id === block.id);
  const displayNumber = String(block.startNumber + (index >= 0 ? index : 0)).padStart(2, "0");

  return (
    <div className="rounded bg-slate-100 px-2 py-1">
      <span className="font-semibold text-slate-800" style={{ paddingLeft: '2em', textIndent: '-2em', display: 'block' }}>
        {block.prefix}{displayNumber}{block.suffix ? `\u2003${block.suffix}` : ''}
      </span>
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
    default:
      return (
        <div className="p-4 bg-red-50 text-red-600 rounded text-sm">
          {t("unknownBlockType", { type: (block as WorksheetBlock).type })}
        </div>
      );
  }
}
