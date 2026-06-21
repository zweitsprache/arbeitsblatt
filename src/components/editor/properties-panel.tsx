"use client";

import React from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { authFetch } from "@/lib/auth-fetch";
import { TITLE_DOMAINS } from "@/lib/title-domains";
import { useEditor } from "@/store/editor-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  HeadingBlock,
  TitleBlock,
  NumberedHeadingBlock,
  TextBlock,
  SyllablesBlock,
  ImageBlock,
  ImageCardsBlock,
  ImageTextTableBlock,
  TextCardsBlock,
  SpacerBlock,
  DividerBlock,
  MultipleChoiceBlock,
  OpenResponseBlock,
  FillInBlankBlock,
  FillInBlankItemsBlock,
  FillInBlankItem,
  MatchingBlock,
  TextMatchingBlock,
  PronunciationBlock,
  TwoColumnFillBlock,
  GlossaryBlock,
  WordBankBlock,
  ColumnsBlock,
  GridBlock,
  BoardGameBlock,
  DominoBlock,
  CardPairsBlock,
  FlashcardsBlock,
  AufgabenkartenBlock,
  SyllableCardsBlock,
  TrueFalseMatrixBlock,
  MCQMatrixBlock,
  MCQRowsBlock,
  ArticleTrainingBlock,
  ArticleAnswer,
  OrderItemsBlock,
  InlineChoicesBlock,
  InlineChoiceItem,
  migrateInlineChoicesBlock,
  CrosswordBlock,
  CrosswordItem,
  WordSearchBlock,
  SortingCategoriesBlock,
  SortingCategory,
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
  ChartBlock,
  ChartDataPoint,
  NumberedItemsBlock,
  NumberedSubItemStyle,
  BoxBlock,
  QuartettBlock,
  QuartettItem,
  TabooBlock,
  ChecklistBlock,
  NumberedLabelBlock,
  DialogueBlock,
  DialogueItem,
  DialogueSpeakerIcon,
  LueckenzeilenBlock,
  WorksheetBlock,
  WritingLinesBlock,
  WritingRowsBlock,
  PageBreakBlock,
  EmailSkeletonBlock,
  EmailSkeletonStyle,
  EmailAttachment,
  JobApplicationBlock,
  JobApplicationStyle,
  DosAndDontsBlock,
  TextSnippetBlock,
  TextComparisonBlock,
  AccordionBlock,
  AiPromptBlock,
  AiToolBlock,
  AudioBlock,
  ScheduleBlock,
  ScheduleItem,
  WebsiteBlock,
  TableBlock,
  TableCloudBlock,
  TableStyle,
  FreeFormBlock,
  BlockDisplayOn,
  BlockVisibility,
  Brand,
  BrandOverrides,
  BrandSubProfile,
  DEFAULT_BRAND_SETTINGS,
  TextBlockStyle,
  ImageBlockStyle,
  applyBrandOverrides,
  BLOCK_LIBRARY,
} from "@/types/worksheet";
import { stripSyllableMarkers, syllabifyGermanText } from "@/lib/syllables";
import { resolveWordSearchDirections } from "@/lib/word-search";
import { formatCrosswordItemsText, parseCrosswordItemsText } from "@/lib/crossword";
import { Trash2, Plus, GripVertical, Printer, Globe, Sparkles, ArrowUpDown, Upload, Bold, Italic, X, AlertTriangle, Code2, Check, ChevronUp, ChevronDown, Shuffle, ImagePlus, Loader2, Mail, Bot, BookOpen, Scissors, Download, RefreshCw, Settings, Table2, AlignLeft, AlignCenter, AlignRight, AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd } from "lucide-react";
import { useUpload } from "@/lib/use-upload";
import { MediaBrowserDialog } from "@/components/ui/media-browser-dialog";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { hasChOverride } from "@/lib/locale-utils";
import { countChOverrides } from "@/lib/locale-utils";
import { AiTrueFalseModal } from "./ai-true-false-modal";
import { AiVerbTableModal } from "./ai-verb-table-modal";
import { AiMcqModal } from "./ai-mcq-modal";
import { AiTextModal } from "./ai-text-modal";
import { AiVerbExerciseModal } from "./ai-verb-exercise-modal";
import { BingoCardsPropEditor } from "./BingoCardsPropEditor";
import { RichTextEditor } from "./rich-text-editor";
import { WorksheetTranslationDialog } from "./worksheet-translation-dialog";
import { ImageCropDialog, CropResult } from "@/components/ui/image-crop-dialog";
import { getChoiceGroups, updateChoiceGroup, validateChoices } from "@/lib/inline-choice-utils";
import {
  DIALOGUE_SPEAKER_ICON_OPTIONS,
  DialogueSpeakerIconGlyph,
} from "@/lib/dialogue-icons";
import { getDefaultCardPairItems, getDefaultFlashcardItems } from "@/lib/domino";

// ─── CH Override-aware input wrapper ────────────────────────

/**
 * A text input that supports CH locale overrides.
 * - In DE mode: normal input → dispatches UPDATE_BLOCK
 * - In CH mode: input edits the CH override, shows DE base text reference,
 *   has amber left border + clear button when override exists
 */
function ChInput({
  blockId,
  fieldPath,
  baseValue,
  onBaseChange,
  className,
  placeholder,
  multiline,
}: {
  blockId: string;
  fieldPath: string;
  baseValue: string;
  onBaseChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  multiline?: boolean;
}) {
  const { state, dispatch } = useEditor();
  const t = useTranslations("properties");
  const isDeOverrideMode = state.localeMode === "DE";
  const overrides = state.settings.chOverrides;
  const hasOverride = hasChOverride(blockId, fieldPath, overrides);
  const overrideValue = overrides?.[blockId]?.[fieldPath];
  const effectiveValue = isDeOverrideMode && overrideValue !== undefined ? overrideValue : baseValue;

  if (!isDeOverrideMode) {
    // CH mode: normal/base input
    if (multiline) {
      return (
        <textarea
          value={baseValue}
          onChange={(e) => onBaseChange(e.target.value)}
          className={className || "w-full border rounded-md p-2 text-xs min-h-[80px] resize-y"}
          placeholder={placeholder}
        />
      );
    }
    return (
      <Input
        value={baseValue}
        onChange={(e) => onBaseChange(e.target.value)}
        className={className}
        placeholder={placeholder}
      />
    );
  }

  // DE mode (override layer)
  const handleChange = (value: string) => {
    if (value === baseValue) {
      dispatch({ type: "CLEAR_CH_OVERRIDE", payload: { blockId, fieldPath } });
    } else {
      dispatch({ type: "SET_CH_OVERRIDE", payload: { blockId, fieldPath, value } });
    }
  };

  const clearOverride = () => {
    dispatch({ type: "CLEAR_CH_OVERRIDE", payload: { blockId, fieldPath } });
  };

  const wrapperClass = hasOverride
    ? "w-full border-l-2 border-l-amber-400 pl-1"
    : "w-full";

  const inputEl = multiline ? (
    <textarea
      value={effectiveValue}
      onChange={(e) => handleChange(e.target.value)}
      className={`${className || "w-full border rounded-md p-2 text-xs min-h-[80px] resize-y"} ${hasOverride ? "bg-amber-50/50" : ""}`}
      placeholder={placeholder}
    />
  ) : (
    <div className="flex w-full min-w-0 items-center gap-1">
      <Input
        value={effectiveValue}
        onChange={(e) => handleChange(e.target.value)}
        className={`${className || ""} ${hasOverride ? "bg-amber-50/50" : ""} min-w-0 flex-1`}
        placeholder={placeholder}
      />
      {hasOverride && (
        <button
          type="button"
          onClick={clearOverride}
          className="h-6 w-6 flex items-center justify-center rounded hover:bg-red-50 text-amber-500 hover:text-red-500 shrink-0"
          title={t("chOverrideRemove")}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );

  return (
    <div className={wrapperClass}>
      {inputEl}
      {hasOverride && multiline && (
        <div className="flex justify-end mt-0.5">
          <button
            type="button"
            onClick={clearOverride}
            className="text-[10px] text-amber-500 hover:text-red-500"
          >
            ✕ {t("chOverrideRemove")}
          </button>
        </div>
      )}
      {/* Show CH base text as reference */}
      <p className="text-[10px] text-muted-foreground/60 mt-0.5 truncate" title={baseValue}>
        {"🇨🇭 "}{baseValue.length > 60 ? baseValue.slice(0, 60) + "…" : baseValue}
      </p>
    </div>
  );
}

// ─── Block-specific property editors ────────────────────────

// ─── Text Snippet Props ──────────────────────────────────────
function TextSnippetProps({ block }: { block: TextSnippetBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");
  const tc = useTranslations("common");

  const update = (updates: Partial<TextSnippetBlock>) => {
    dispatch({ type: "UPDATE_BLOCK", payload: { id: block.id, updates } });
  };

  const renderSwitchRow = (
    label: string,
    checked: boolean,
    onCheckedChange: (checked: boolean) => void,
    options?: { withTopDivider?: boolean; withBottomBorder?: boolean }
  ) => (
    <>
      {options?.withTopDivider ? <Separator /> : null}
      <div
        className={`flex h-8 items-center justify-between ${options?.withBottomBorder === false ? "" : "border-b border-border"}`}
      >
        <Label className="text-sm">{label}</Label>
        <Switch checked={checked} onCheckedChange={onCheckedChange} />
      </div>
    </>
  );

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("settings")}</Label>
        <div>
          {renderSwitchRow(
            t("bilingual"),
            block.bilingual ?? false,
            (checked) => update({ bilingual: checked }),
            { withTopDivider: true, withBottomBorder: false }
          )}
        </div>
      </div>
    </div>
  );
}

function HeadingProps({ block }: { block: HeadingBlock | NumberedHeadingBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");
  const tc = useTranslations("common");
  const isNumberedHeading = block.type === "numbered-heading";

  const renderSwitchRow = (
    label: string,
    checked: boolean,
    onCheckedChange: (checked: boolean) => void,
    options?: { withTopDivider?: boolean }
  ) => (
    <>
      {options?.withTopDivider ? <Separator /> : null}
      <div className="flex h-8 items-center justify-between border-b border-border">
        <Label className="text-sm">{label}</Label>
        <Switch checked={checked} onCheckedChange={onCheckedChange} />
      </div>
    </>
  );

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("content")}</Label>
        <ChInput
          blockId={block.id}
          fieldPath="content"
          baseValue={block.content}
          onBaseChange={(v) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { content: v } },
            })
          }
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("level")}</Label>
        <Select
          value={String(block.level)}
          onValueChange={(v) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { level: Number(v) as 1 | 2 | 3 | 4 } },
            })
          }
        >
          <SelectTrigger size="sm" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">{t("heading1")}</SelectItem>
            <SelectItem value="2">{t("heading2")}</SelectItem>
            <SelectItem value="3">{t("heading3")}</SelectItem>
            <SelectItem value="4">{t("heading4")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {isNumberedHeading && (
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("startNumber")}</Label>
          <Input
            type="number"
            min={1}
            value={block.startNumber}
            onChange={(e) =>
              dispatch({
                type: "UPDATE_BLOCK",
                payload: {
                  id: block.id,
                  updates: { startNumber: Math.max(1, Number(e.target.value) || 1) },
                },
              })
            }
          />
        </div>
      )}
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("settings")}</Label>
        <div>
          {renderSwitchRow(
            t("bilingual"),
            block.bilingual ?? false,
            (checked) =>
              dispatch({
                type: "UPDATE_BLOCK",
                payload: { id: block.id, updates: { bilingual: checked } },
              }),
            { withTopDivider: true }
          )}
          {renderSwitchRow(t("skipTranslation"), block.skipTranslation ?? false, (checked) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { skipTranslation: checked } },
            })
          )}
        </div>
      </div>
    </div>
  );
}

function TitleProps({ block }: { block: TitleBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");
  const tc = useTranslations("common");
  const items = block.items.length > 0
    ? block.items.slice(0, 3)
    : [
        { id: "title-line-1", content: "", level: 1 as const },
        { id: "title-line-2", content: "", level: 2 as const },
        { id: "title-line-3", content: "", level: 3 as const },
      ];
  const normalizedItems = Array.from({ length: 3 }, (_, index) => ({
    id: items[index]?.id || `title-line-${index + 1}`,
    content: items[index]?.content || "",
    level: items[index]?.level || ((index + 1) as 1 | 2 | 3),
    style: items[index]?.style,
  }));

  const updateItem = (index: number, updates: Partial<TitleBlock["items"][number]>) => {
    const nextItems = normalizedItems.map((item, itemIndex) =>
      itemIndex === index ? { ...item, ...updates } : item,
    );
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: nextItems } },
    });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2 rounded-md border border-border p-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">
          {t("titleDomain")}
        </Label>
        <Select
          value={block.domain || "__none"}
          onValueChange={(value) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { domain: value === "__none" ? undefined : value } },
            })
          }
        >
          <SelectTrigger size="sm" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none">{t("titleDomainNone")}</SelectItem>
            {TITLE_DOMAINS.map((domain) => (
              <SelectItem key={domain} value={domain}>
                {domain}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {normalizedItems.map((item, index) => (
        <div key={item.id} className="space-y-2 rounded-md border border-border p-2">
          <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">
            {t("titleLine", { number: index + 1 })}
          </Label>
          <ChInput
            blockId={block.id}
            fieldPath={`items.${index}.content`}
            baseValue={item.content}
            onBaseChange={(value) => updateItem(index, { content: value })}
            placeholder={tc("content")}
          />
          <Select
            value={item.style === "h4-normal" || item.style === "body" || item.style === "badges" ? item.style : String(item.level)}
            onValueChange={(value) => {
              if (value === "h4-normal") {
                updateItem(index, { level: 4, style: "h4-normal" });
                return;
              }
              if (value === "body") {
                updateItem(index, { level: 4, style: "body" });
                return;
              }
              if (value === "badges") {
                updateItem(index, { level: 4, style: "badges" });
                return;
              }
              updateItem(index, { level: Number(value) as 1 | 2 | 3 | 4, style: undefined });
            }}
          >
            <SelectTrigger size="sm" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">{t("heading1")}</SelectItem>
              <SelectItem value="2">{t("heading2")}</SelectItem>
              <SelectItem value="3">{t("heading3")}</SelectItem>
              <SelectItem value="4">{t("heading4")}</SelectItem>
              <SelectItem value="h4-normal">{t("heading4Normal")}</SelectItem>
              <SelectItem value="body">{t("bodyText")}</SelectItem>
              <SelectItem value="badges">{t("badges")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ))}
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("settings")}</Label>
        <div className="flex h-8 items-center justify-between border-b border-border">
          <Label className="text-sm">{t("skipTranslation")}</Label>
          <Switch
            checked={block.skipTranslation ?? false}
            onCheckedChange={(checked) =>
              dispatch({
                type: "UPDATE_BLOCK",
                payload: { id: block.id, updates: { skipTranslation: checked } },
              })
            }
          />
        </div>
      </div>
    </div>
  );
}

function ImageProps({ block }: { block: ImageBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");
  const { upload } = useUpload();
  const [isUploading, setIsUploading] = React.useState(false);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [cropSrc, setCropSrc] = React.useState<string | null>(null);
  const [cropOpen, setCropOpen] = React.useState(false);
  const [browserOpen, setBrowserOpen] = React.useState(false);

  const handleFileSelected = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const objectUrl = URL.createObjectURL(file);
    setCropSrc(objectUrl);
    setCropOpen(true);
  };

  const handleCropComplete = async (result: CropResult) => {
    setIsUploading(true);
    try {
      const file = new File([result.blob], "image-block.png", { type: "image/png" });
      const uploadResult = await upload(file);
      dispatch({
        type: "UPDATE_BLOCK",
        payload: { id: block.id, updates: { src: uploadResult.url } },
      });
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setIsUploading(false);
      if (cropSrc) URL.revokeObjectURL(cropSrc);
      URL.revokeObjectURL(result.url);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      handleFileSelected(file);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("imageUrl")}</Label>
        {block.src ? (
          <div className="space-y-2">
            <div className="relative group/img rounded overflow-hidden border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={block.src} alt={block.alt || ""} className="w-full" />
              <button
                type="button"
                onClick={() =>
                  dispatch({
                    type: "UPDATE_BLOCK",
                    payload: { id: block.id, updates: { src: "" } },
                  })
                }
                className="absolute top-1 right-1 opacity-0 group-hover/img:opacity-100 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-opacity"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => setBrowserOpen(true)}
              >
                {t("replaceImage")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <label
              className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors ${
                isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/40"
              }`}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
            >
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelected(file);
                }}
              />
              {isUploading ? (
                <span className="text-xs text-muted-foreground">{t("uploading")}</span>
              ) : (
                <>
                  <Upload className="h-6 w-6 text-muted-foreground/50 mb-1" />
                  <span className="text-xs text-muted-foreground">{t("textImageDragOrClick")}</span>
                </>
              )}
            </label>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={() => setBrowserOpen(true)}
            >
              <ImagePlus className="h-3.5 w-3.5 mr-1" />
              {t("mediaBrowser")}
            </Button>
            <Input
              value={block.src}
              placeholder={t("imageUrlPlaceholder")}
              onChange={(e) =>
                dispatch({
                  type: "UPDATE_BLOCK",
                  payload: { id: block.id, updates: { src: e.target.value } },
                })
              }
            />
          </div>
        )}
      </div>
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("altText")}</Label>
        <Input
          value={block.alt}
          onChange={(e) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { alt: e.target.value } },
            })
          }
        />
      </div>
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("widthPx")}</Label>
        <Input
          type="number"
          value={block.width || ""}
          placeholder={t("auto")}
          onChange={(e) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: {
                id: block.id,
                updates: { width: e.target.value ? Number(e.target.value) : undefined },
              },
            })
          }
        />
      </div>
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("heightPx")}</Label>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => {
              const current = block.height ?? 200;
              const next = Math.max(20, current - 20);
              dispatch({
                type: "UPDATE_BLOCK",
                payload: { id: block.id, updates: { height: next } },
              });
            }}
          >
            −
          </Button>
          <Input
            type="number"
            value={block.height || ""}
            placeholder={t("auto")}
            className="text-center flex-1"
            onChange={(e) =>
              dispatch({
                type: "UPDATE_BLOCK",
                payload: {
                  id: block.id,
                  updates: { height: e.target.value ? Number(e.target.value) : undefined },
                },
              })
            }
          />
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => {
              const current = block.height ?? 200;
              const next = current + 20;
              dispatch({
                type: "UPDATE_BLOCK",
                payload: { id: block.id, updates: { height: next } },
              });
            }}
          >
            +
          </Button>
        </div>
      </div>
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("caption")}</Label>
        <Input
          value={block.caption || ""}
          onChange={(e) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { caption: e.target.value } },
            })
          }
        />
      </div>
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("imageBlockStyle")}</Label>
        <select
          value={block.imageStyle || "standard"}
          onChange={(e) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { imageStyle: e.target.value as ImageBlockStyle } },
            })
          }
          className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="standard">{t("imageBlockStyleStandard")}</option>
          <option value="example">{t("imageBlockStyleExample")}</option>
        </select>
      </div>

      <MediaBrowserDialog
        open={browserOpen}
        onOpenChange={setBrowserOpen}
        onSelectUrl={(url) => {
          dispatch({
            type: "UPDATE_BLOCK",
            payload: { id: block.id, updates: { src: url } },
          });
        }}
        onSelectFile={handleFileSelected}
      />

      <ImageCropDialog
        imageSrc={cropSrc}
        open={cropOpen}
        onOpenChange={(open) => {
          setCropOpen(open);
          if (!open && cropSrc) {
            URL.revokeObjectURL(cropSrc);
            setCropSrc(null);
          }
        }}
        onCropComplete={handleCropComplete}
        title={t("cropImage")}
      />
    </div>
  );
}

function ImageCardsProps({ block }: { block: ImageCardsBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");
  const tc = useTranslations("common");

  const moveItem = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= block.items.length) return;
    const newItems = [...block.items];
    [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: newItems } },
    });
  };

  const updateItem = (index: number, updates: Partial<{ text: string; imageUrl: string }>) => {
    const newItems = [...block.items];
    newItems[index] = { ...newItems[index], ...updates };
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: newItems } },
    });
  };

  const removeItem = (index: number) => {
    const newItems = block.items.filter((_, i) => i !== index);
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: newItems } },
    });
  };

  const addItem = () => {
    const newItems = [
      ...block.items,
      { id: crypto.randomUUID(), src: "", alt: "", text: "" },
    ];
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: newItems } },
    });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("columns")}</Label>
        <Select
          value={String(block.columns)}
          onValueChange={(v) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { columns: Number(v) as 2 | 3 | 4 | 5 } },
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2">2 {tc("columns")}</SelectItem>
            <SelectItem value="3">3 {tc("columns")}</SelectItem>
            <SelectItem value="4">4 {tc("columns")}</SelectItem>
            <SelectItem value="5">5 {tc("columns")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Separator />
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("cards")}</Label>
        {block.items.map((item, i) => (
          <div key={item.id} className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground w-4 shrink-0 text-right">{i + 1}.</span>
            {item.src ? (
              <div className="w-8 h-8 rounded overflow-hidden shrink-0 bg-sky-50">
                <img src={item.src} alt="" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded shrink-0 bg-slate-200 flex items-center justify-center">
                <span className="text-xs text-muted-foreground">—</span>
              </div>
            )}
            <Input
              value={item.text}
              onChange={(e) => updateItem(i, { text: e.target.value })}
              placeholder={t("cardText")}
              className="flex-1 h-8 text-xs"
            />
            <div className="flex flex-col">
              <button
                className="p-0 h-3 text-muted-foreground hover:text-foreground disabled:opacity-30"
                onClick={() => moveItem(i, -1)}
                disabled={i === 0}
              >
                <ArrowUpDown className="h-2.5 w-2.5 rotate-180" />
              </button>
              <button
                className="p-0 h-3 text-muted-foreground hover:text-foreground disabled:opacity-30"
                onClick={() => moveItem(i, 1)}
                disabled={i === block.items.length - 1}
              >
                <ArrowUpDown className="h-2.5 w-2.5" />
              </button>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => removeItem(i)}
              disabled={block.items.length <= 1}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addItem} className="w-full">
          <Plus className="h-3.5 w-3.5 mr-1" /> {t("addCard")}
        </Button>
      </div>
      <Separator />
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("imageAspectRatio")}</Label>
        <div className="flex gap-1">
          {(["16:9", "4:3", "1:1", "3:4", "9:16"] as const).map((ratio) => (
            <Button
              key={ratio}
              variant={(block.imageAspectRatio ?? "1:1") === ratio ? "default" : "outline"}
              size="sm"
              className="flex-1 text-xs px-1"
              onClick={() =>
                dispatch({
                  type: "UPDATE_BLOCK",
                  payload: { id: block.id, updates: { imageAspectRatio: ratio } },
                })
              }
            >
              {ratio}
            </Button>
          ))}
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-sm">{t("imageScale")}</Label>
          <span className="text-xs text-muted-foreground">{block.imageScale ?? 100}%</span>
        </div>
        <Slider
          value={[block.imageScale ?? 100]}
          min={10}
          max={100}
          step={5}
          onValueChange={([value]) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { imageScale: value } },
            })
          }
        />
      </div>
      <Separator />
      <div className="flex items-center justify-between">
        <Label className="text-sm">{t("showWritingLines")}</Label>
        <Switch
          checked={block.showWritingLines ?? false}
          onCheckedChange={(checked) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { showWritingLines: checked } },
            })
          }
        />
      </div>
      {block.showWritingLines && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm">{t("writingLinesCount")}</Label>
            <span className="text-xs text-muted-foreground">{block.writingLinesCount ?? 1}</span>
          </div>
          <Slider
            value={[block.writingLinesCount ?? 1]}
            min={1}
            max={5}
            step={1}
            onValueChange={([value]) =>
              dispatch({
                type: "UPDATE_BLOCK",
                payload: { id: block.id, updates: { writingLinesCount: value } },
              })
            }
          />
        </div>
      )}
      <div className="flex items-center justify-between">
        <Label className="text-sm">{t("showWordBank")}</Label>
        <Switch
          checked={block.showWordBank ?? false}
          onCheckedChange={(checked) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { showWordBank: checked } },
            })
          }
        />
      </div>
    </div>
  );
}

function ImageTextTableProps({ block }: { block: ImageTextTableBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");
  const tc = useTranslations("common");

  const moveItem = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= block.items.length) return;
    const newItems = [...block.items];
    [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: newItems } },
    });
  };

  const updateItem = (index: number, updates: Partial<{ text: string; imageUrl: string }>) => {
    const newItems = [...block.items];
    newItems[index] = { ...newItems[index], ...updates };
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: newItems } },
    });
  };

  const removeItem = (index: number) => {
    const newItems = block.items.filter((_, i) => i !== index);
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: newItems } },
    });
  };

  const addItem = () => {
    const newItems = [
      ...block.items,
      { id: crypto.randomUUID(), src: "", alt: "", text: "" },
    ];
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: newItems } },
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("instruction")}</Label>
        <ChInput
          blockId={block.id}
          fieldPath="instruction"
          baseValue={block.instruction ?? ""}
          onBaseChange={(value) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { instruction: value } },
            })
          }
        />
      </div>
      <Separator />
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("columns")}</Label>
        <Select
          value={String(block.columns)}
          onValueChange={(v) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { columns: Number(v) as 2 | 3 | 4 | 5 } },
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2">2 {tc("columns")}</SelectItem>
            <SelectItem value="3">3 {tc("columns")}</SelectItem>
            <SelectItem value="4">4 {tc("columns")}</SelectItem>
            <SelectItem value="5">5 {tc("columns")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Separator />
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("cards")}</Label>
        {block.items.map((item, i) => (
          <div key={item.id} className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground w-4 shrink-0 text-right">{i + 1}.</span>
            {item.src ? (
              <div className="w-8 h-8 rounded overflow-hidden shrink-0 bg-sky-50">
                <img src={item.src} alt="" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded shrink-0 bg-slate-200 flex items-center justify-center">
                <span className="text-xs text-muted-foreground">—</span>
              </div>
            )}
            <Input
              value={item.text}
              onChange={(e) => updateItem(i, { text: e.target.value })}
              placeholder={t("caption")}
              className="flex-1 h-8 text-xs"
            />
            <div className="flex flex-col">
              <button
                className="p-0 h-3 text-muted-foreground hover:text-foreground disabled:opacity-30"
                onClick={() => moveItem(i, -1)}
                disabled={i === 0}
              >
                <ArrowUpDown className="h-2.5 w-2.5 rotate-180" />
              </button>
              <button
                className="p-0 h-3 text-muted-foreground hover:text-foreground disabled:opacity-30"
                onClick={() => moveItem(i, 1)}
                disabled={i === block.items.length - 1}
              >
                <ArrowUpDown className="h-2.5 w-2.5" />
              </button>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => removeItem(i)}
              disabled={block.items.length <= 1}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addItem} className="w-full">
          <Plus className="h-3.5 w-3.5 mr-1" /> {t("addCard")}
        </Button>
      </div>
      <Separator />
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("imageAspectRatio")}</Label>
        <div className="flex gap-1">
          {(["16:9", "4:3", "1:1", "3:4", "9:16"] as const).map((ratio) => (
            <Button
              key={ratio}
              variant={(block.imageAspectRatio ?? "1:1") === ratio ? "default" : "outline"}
              size="sm"
              className="flex-1 text-xs px-1"
              onClick={() =>
                dispatch({
                  type: "UPDATE_BLOCK",
                  payload: { id: block.id, updates: { imageAspectRatio: ratio } },
                })
              }
            >
              {ratio}
            </Button>
          ))}
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-sm">{t("imageScale")}</Label>
          <span className="text-xs text-muted-foreground">{block.imageScale ?? 100}%</span>
        </div>
        <Slider
          value={[block.imageScale ?? 100]}
          min={10}
          max={100}
          step={5}
          onValueChange={([value]) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { imageScale: value } },
            })
          }
        />
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-sm">{t("showNumbers")}</Label>
        <Switch
          checked={block.showImageNumberBadge !== false}
          onCheckedChange={(checked) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { showImageNumberBadge: checked } },
            })
          }
        />
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-sm">{t("shuffleItems")}</Label>
        <Switch
          checked={block.shuffleItems ?? false}
          onCheckedChange={(checked) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { shuffleItems: checked } },
            })
          }
        />
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-sm">{t("showFirstAsExample")}</Label>
        <Switch
          checked={block.showFirstAsExample ?? false}
          onCheckedChange={(checked) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { showFirstAsExample: checked } },
            })
          }
        />
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-sm">{t("twoWritingColumns")}</Label>
        <Switch
          checked={block.twoWritingColumns ?? false}
          onCheckedChange={(checked) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { twoWritingColumns: checked } },
            })
          }
        />
      </div>
    </div>
  );
}

function TextCardsProps({ block }: { block: TextCardsBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [csvText, setCsvText] = React.useState("");
  const [csvError, setCsvError] = React.useState<string | null>(null);
  const [csvMode, setCsvMode] = React.useState<"replace" | "append">("replace");

  const textAlignmentLabels: Record<"left" | "center" | "right", string> = {
    left: locale === "de" ? "Links" : "Left",
    center: locale === "de" ? "Zentriert" : "Center",
    right: locale === "de" ? "Rechts" : "Right",
  };

  const renderSwitchRow = (
    label: string,
    checked: boolean,
    onCheckedChange: (checked: boolean) => void,
    options?: { withTopDivider?: boolean; withBottomBorder?: boolean }
  ) => (
    <>
      {options?.withTopDivider ? <Separator /> : null}
      <div
        className={`flex h-8 items-center justify-between ${options?.withBottomBorder === false ? "" : "border-b border-border"}`}
      >
        <Label className="text-sm">{label}</Label>
        <Switch checked={checked} onCheckedChange={onCheckedChange} />
      </div>
    </>
  );

  const handleCsvImport = () => {
    setCsvError(null);
    const text = csvText.trim();
    if (!text) return;

    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    const parsed: { text: string; caption: string }[] = [];

    for (const line of lines) {
      const sep = line.includes("\t") ? "\t" : line.includes(";") ? ";" : ",";
      const parts = line.split(sep).map((p) => p.trim());

      if (parts.length >= 2) {
        parsed.push({ text: parts[0], caption: parts.slice(1).join(sep === "\t" ? " " : ", ").trim() });
      } else {
        parsed.push({ text: parts[0], caption: "" });
      }
    }

    if (parsed.length === 0) {
      setCsvError(t("csvNoData"));
      return;
    }

    const newItems = parsed.map((p) => ({
      id: crypto.randomUUID(),
      text: p.text,
      caption: p.caption,
    }));

    const items = csvMode === "append"
      ? [...block.items, ...newItems]
      : newItems;

    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items } },
    });
    setCsvText("");
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= block.items.length) return;
    const newItems = [...block.items];
    [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: newItems } },
    });
  };

  const updateItem = (index: number, updates: Partial<{ text: string; caption: string }>) => {
    const newItems = [...block.items];
    newItems[index] = { ...newItems[index], ...updates };
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: newItems } },
    });
  };

  const removeItem = (index: number) => {
    const newItems = block.items.filter((_, i) => i !== index);
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: newItems } },
    });
  };

  const addItem = () => {
    const newItems = [
      ...block.items,
      { id: crypto.randomUUID(), text: "", caption: "" },
    ];
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: newItems } },
    });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("columns")}</Label>
        <Select
          value={String(block.columns)}
          onValueChange={(v) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { columns: Number(v) as 2 | 3 | 4 } },
            })
          }
        >
          <SelectTrigger size="sm" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2">2 {tc("columns")}</SelectItem>
            <SelectItem value="3">3 {tc("columns")}</SelectItem>
            <SelectItem value="4">4 {tc("columns")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("cards")}</Label>
        {block.items.map((item, i) => (
          <div key={item.id} className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-6 shrink-0 text-left text-xs tabular-nums text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
              <Input
                value={item.text}
                onChange={(e) => updateItem(i, { text: e.target.value })}
                placeholder={t("cardText")}
                className="flex-1 h-8 text-xs"
              />
              <div className="flex w-[56px] shrink-0 items-center justify-end gap-1">
                <div className="flex flex-col">
                  <button
                    className="p-0 h-3 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    onClick={() => moveItem(i, -1)}
                    disabled={i === 0}
                  >
                    <ArrowUpDown className="h-2.5 w-2.5 rotate-180" />
                  </button>
                  <button
                    className="p-0 h-3 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    onClick={() => moveItem(i, 1)}
                    disabled={i === block.items.length - 1}
                  >
                    <ArrowUpDown className="h-2.5 w-2.5" />
                  </button>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => removeItem(i)}
                  disabled={block.items.length <= 1}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-6 shrink-0" />
              <Input
                value={item.caption}
                onChange={(e) => updateItem(i, { caption: e.target.value })}
                placeholder={t("caption")}
                className="flex-1 h-8 text-xs text-muted-foreground"
              />
              <span className="w-[56px] shrink-0" />
            </div>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addItem} className="w-full">
          <Plus className="h-3.5 w-3.5 mr-1" /> {t("addCard")}
        </Button>
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("csvImport")}</Label>
        <textarea
          className="w-full rounded-[4px] !border border-input bg-white px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[80px] resize-y"
          placeholder=""
          value={csvText}
          onChange={(e) => {
            setCsvText(e.target.value);
            setCsvError(null);
          }}
        />
        {csvError && (
          <p className="text-xs text-destructive mt-1">{csvError}</p>
        )}
        <div className="space-y-2 mt-1">
          <Select
            value={csvMode}
            onValueChange={(v) => setCsvMode(v as "replace" | "append")}
          >
            <SelectTrigger size="sm" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="replace">{t("csvReplace")}</SelectItem>
              <SelectItem value="append">{t("csvAppend")}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleCsvImport}
            disabled={!csvText.trim()}
          >
            <Upload className="h-4 w-4 mr-2" />
            {t("csvImportButton")}
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("textSize")}</Label>
        <div className="grid grid-cols-3 gap-1">
          {(["xs", "sm", "base", "lg", "xl", "2xl"] as const).map((size) => (
            <Button
              key={size}
              variant={(block.textSize ?? "base") === size ? "default" : "outline"}
              size="sm"
              className="h-8 min-w-0 px-1 text-sm text-center"
              onClick={() =>
                dispatch({
                  type: "UPDATE_BLOCK",
                  payload: { id: block.id, updates: { textSize: size } },
                })
              }
            >
              {size}
            </Button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("textAlignment")}</Label>
        <div className="grid grid-cols-3 gap-1">
          {(["left", "center", "right"] as const).map((align) => (
            <Button
              key={align}
              variant={(block.textAlign ?? "center") === align ? "default" : "outline"}
              size="sm"
              className="h-8 min-w-0 px-1 text-[11px] text-center"
              onClick={() =>
                dispatch({
                  type: "UPDATE_BLOCK",
                  payload: { id: block.id, updates: { textAlign: align } },
                })
              }
            >
              {textAlignmentLabels[align]}
            </Button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("fontStyle")}</Label>
        <div className="flex gap-1">
          <Button
            variant={block.textBold ? "default" : "outline"}
            size="sm"
            className="h-8 min-w-0 flex-1"
            onClick={() =>
              dispatch({
                type: "UPDATE_BLOCK",
                payload: { id: block.id, updates: { textBold: !block.textBold } },
              })
            }
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            variant={block.textItalic ? "default" : "outline"}
            size="sm"
            className="h-8 min-w-0 flex-1"
            onClick={() =>
              dispatch({
                type: "UPDATE_BLOCK",
                payload: { id: block.id, updates: { textItalic: !block.textItalic } },
              })
            }
          >
            <Italic className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("settings")}</Label>
        <div>
          {renderSwitchRow(
            t("showBorder"),
            block.showBorder ?? true,
            (checked) =>
              dispatch({
                type: "UPDATE_BLOCK",
                payload: { id: block.id, updates: { showBorder: checked } },
              }),
            { withTopDivider: true }
          )}
          {renderSwitchRow(
            t("showWritingLines"),
            block.showWritingLines ?? false,
            (checked) =>
              dispatch({
                type: "UPDATE_BLOCK",
                payload: { id: block.id, updates: { showWritingLines: checked } },
              }),
            { withBottomBorder: !block.showWritingLines }
          )}
          {block.showWritingLines && (
            <div className="space-y-2 border-b border-border py-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">{t("writingLinesCount")}</Label>
                <span className="text-xs text-muted-foreground">{block.writingLinesCount ?? 1}</span>
              </div>
              <Slider
                value={[block.writingLinesCount ?? 1]}
                min={1}
                max={5}
                step={1}
                onValueChange={([value]) =>
                  dispatch({
                    type: "UPDATE_BLOCK",
                    payload: { id: block.id, updates: { writingLinesCount: value } },
                  })
                }
              />
            </div>
          )}
          {renderSwitchRow(
            t("showWordBank"),
            block.showWordBank ?? false,
            (checked) =>
              dispatch({
                type: "UPDATE_BLOCK",
                payload: { id: block.id, updates: { showWordBank: checked } },
              }),
            { withBottomBorder: false }
          )}
        </div>
      </div>
    </div>
  );
}

function PageBreakProps({ block }: { block: PageBreakBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");
  return (
    <div className="flex items-center justify-between">
      <Label className="text-sm">{t("restartPageNumbering")}</Label>
      <Switch
        checked={block.restartPageNumbering ?? false}
        onCheckedChange={(checked) =>
          dispatch({
            type: "UPDATE_BLOCK",
            payload: { id: block.id, updates: { restartPageNumbering: checked } },
          })
        }
      />
    </div>
  );
}

function SpacerProps({ block }: { block: SpacerBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");
  return (
    <div>
      <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("heightPx")}</Label>
      <Input
        type="number"
        value={block.height}
        onChange={(e) =>
          dispatch({
            type: "UPDATE_BLOCK",
            payload: { id: block.id, updates: { height: Number(e.target.value) } },
          })
        }
      />
    </div>
  );
}

function WritingLinesProps({ block }: { block: WritingLinesBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("numberOfLines")}</Label>
        <Input
          type="number"
          min={1}
          max={50}
          value={block.lineCount}
          onChange={(e) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { lineCount: Math.max(1, Math.min(50, Number(e.target.value))) } },
            })
          }
        />
      </div>
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("lineSpacing")}</Label>
        <Slider
          value={[block.lineSpacing]}
          min={16}
          max={48}
          step={2}
          onValueChange={([v]) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { lineSpacing: v } },
            })
          }
        />
        <div className="text-xs text-muted-foreground mt-1 text-right">{block.lineSpacing}px</div>
      </div>
    </div>
  );
}

function WritingRowsProps({ block }: { block: WritingRowsBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");
  return (
    <div>
      <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("numberOfRows")}</Label>
      <Input
        type="number"
        min={1}
        max={50}
        value={block.rowCount}
        onChange={(e) =>
          dispatch({
            type: "UPDATE_BLOCK",
            payload: { id: block.id, updates: { rowCount: Math.max(1, Math.min(50, Number(e.target.value))) } },
          })
        }
      />
    </div>
  );
}

function DividerProps({ block }: { block: DividerBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");
  const tc = useTranslations("common");
  return (
    <div>
      <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("style")}</Label>
      <Select
        value={block.style}
        onValueChange={(v) =>
          dispatch({
            type: "UPDATE_BLOCK",
            payload: { id: block.id, updates: { style: v as "solid" | "dashed" | "dotted" } },
          })
        }
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="solid">{t("solid")}</SelectItem>
          <SelectItem value="dashed">{t("dashed")}</SelectItem>
          <SelectItem value="dotted">{t("dotted")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

function MultipleChoiceProps({ block }: { block: MultipleChoiceBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");
  const tc = useTranslations("common");
  const [showAiModal, setShowAiModal] = React.useState(false);

  const updateOption = (index: number, updates: Partial<{ text: string; isCorrect: boolean }>) => {
    const newOptions = [...block.options];
    newOptions[index] = { ...newOptions[index], ...updates };
    // If setting as correct and not allowMultiple, unset others
    if (updates.isCorrect && !block.allowMultiple) {
      newOptions.forEach((opt, i) => {
        if (i !== index) opt.isCorrect = false;
      });
    }
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { options: newOptions } },
    });
  };

  const addOption = () => {
    const newOptions = [
      ...block.options,
      { id: `opt${Date.now()}`, text: `Option ${String.fromCharCode(65 + block.options.length)}`, isCorrect: false },
    ];
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { options: newOptions } },
    });
  };

  const removeOption = (index: number) => {
    const newOptions = block.options.filter((_, i) => i !== index);
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { options: newOptions } },
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("question")}</Label>
        <ChInput
          blockId={block.id}
          fieldPath="question"
          baseValue={block.question}
          onBaseChange={(v) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { question: v } },
            })
          }
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch
          checked={block.allowMultiple}
          onCheckedChange={(v) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { allowMultiple: v } },
            })
          }
        />
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("allowMultiple")}</Label>
      </div>
      <Separator />
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("options")}</Label>
        {block.options.map((opt, i) => (
          <div key={opt.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={opt.isCorrect}
              onChange={(e) => updateOption(i, { isCorrect: e.target.checked })}
              className="h-3.5 w-3.5"
              title={t("markAsCorrect")}
            />
            <div className="flex-1">
              <ChInput
                blockId={block.id}
                fieldPath={`options.${i}.text`}
                baseValue={opt.text}
                onBaseChange={(v) => updateOption(i, { text: v })}
                className="h-8 text-xs"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => removeOption(i)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addOption} className="w-full">
          <Plus className="h-3.5 w-3.5 mr-1" /> {t("addOption")}
        </Button>
      </div>
      <Separator />
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("aiGeneration")}</Label>
        <p className="text-xs text-muted-foreground mb-2">
          {t("autoGenerate")}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="w-full text-pink-700 border-pink-200 hover:bg-pink-50 hover:text-pink-800"
          onClick={() => setShowAiModal(true)}
        >
          <Sparkles className="h-4 w-4 mr-2" />
          {t("aiGenerate")}
        </Button>
      </div>
      <AiMcqModal open={showAiModal} onOpenChange={setShowAiModal} blockId={block.id} />
    </div>
  );
}

function OpenResponseProps({ block }: { block: OpenResponseBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");
  const tc = useTranslations("common");
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("question")}</Label>
        <ChInput
          blockId={block.id}
          fieldPath="question"
          baseValue={block.question}
          onBaseChange={(v) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { question: v } },
            })
          }
        />
      </div>
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("numberOfLines")}</Label>
        <Input
          type="number"
          min={1}
          max={20}
          value={block.lines}
          onChange={(e) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { lines: Number(e.target.value) } },
            })
          }
        />
      </div>
    </div>
  );
}

function FillInBlankProps({ block }: { block: FillInBlankBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");
  const tc = useTranslations("common");
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("instruction")}</Label>
        <ChInput
          blockId={block.id}
          fieldPath="instruction"
          baseValue={block.instruction ?? ""}
          onBaseChange={(v) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { instruction: v } },
            })
          }
        />
      </div>
      <Separator />
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("content")}</Label>
        <p className="text-xs text-muted-foreground mb-1">
          {t("fillInBlankHelp")}
        </p>
        <ChInput
          blockId={block.id}
          fieldPath="content"
          baseValue={block.content}
          onBaseChange={(v) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { content: v } },
            })
          }
          multiline
        />
      </div>
    </div>
  );
}

function FillInBlankItemsProps({ block }: { block: FillInBlankItemsBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");
  const tc = useTranslations("common");
  const [tableOpen, setTableOpen] = React.useState(false);
  const [csvText, setCsvText] = React.useState("");
  const [csvError, setCsvError] = React.useState<string | null>(null);
  const [csvMode, setCsvMode] = React.useState<"replace" | "append">("replace");

  const items = block.items;

  const updateItems = (nextItems: FillInBlankItem[]) => {
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: nextItems } },
    });
  };

  const updateItem = (index: number, content: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], content };
    updateItems(newItems);
  };

  const addItem = () => {
    const newItem: FillInBlankItem = {
      id: `fib${Date.now()}`,
      content: "{{blank:answer}}",
    };
    updateItems([...items, newItem]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    updateItems(items.filter((_, i) => i !== index));
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= items.length) return;

    const newItems = [...items];
    [newItems[index], newItems[nextIndex]] = [newItems[nextIndex], newItems[index]];

    updateItems(newItems);
  };

  const shuffleItems = () => {
    if (items.length <= 1) return;
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    updateItems(shuffled);
  };

  const handleCsvImport = () => {
    setCsvError(null);
    const text = csvText.trim();
    if (!text) return;

    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length === 0) {
      setCsvError(t("csvNoData"));
      return;
    }

    const newItems = lines.map((line) => ({
      id: `fib${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      content: line.trim(),
    }));

    const finalItems = csvMode === "append"
      ? [...items, ...newItems]
      : newItems;

    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: finalItems } },
    });
    setCsvText("");
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("instruction")}</Label>
        <ChInput
          blockId={block.id}
          fieldPath="instruction"
          baseValue={block.instruction}
          onBaseChange={(v) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { instruction: v } },
            })
          }
        />
      </div>
      <Separator />
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          {t("fillInBlankHelp")}
        </p>
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={item.id} className="rounded-md border border-border p-2">
              <div className="mb-1 flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground bg-muted px-2 h-5 rounded flex items-center justify-center shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex-1" />
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveItem(i, -1)} disabled={i === 0}>
                  <ChevronUp className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveItem(i, 1)} disabled={i === items.length - 1}>
                  <ChevronDown className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeItem(i)} disabled={items.length <= 1}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              <ChInput
                blockId={block.id}
                fieldPath={`items.${i}.content`}
                baseValue={item.content}
                onBaseChange={(v) => updateItem(i, v)}
                className="w-full border rounded-md p-1.5 text-xs min-h-[40px] resize-y font-mono"
                multiline
              />
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={addItem} className="w-full">
          <Plus className="h-3.5 w-3.5 mr-1" /> {t("addSentence")}
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" onClick={shuffleItems} disabled={items.length <= 1}>
            <Shuffle className="h-3.5 w-3.5 mr-1" /> {t("shuffleItems")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setTableOpen(true)}>
            <Table2 className="h-3.5 w-3.5 mr-1" /> {t("fillInBlankItemsEditTable")}
          </Button>
        </div>
      </div>
      <Dialog open={tableOpen} onOpenChange={setTableOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t("fillInBlankItemsTableTitle")}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            <table className="w-full border-separate border-spacing-y-1.5 text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="w-8" />
                  <th className="px-2 pb-1">{tc("content")}</th>
                  <th className="w-24" />
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={item.id} className="align-top">
                    <td className="pt-2 text-center text-xs text-slate-400">{index + 1}</td>
                    <td className="px-1">
                      <ChInput
                        blockId={block.id}
                        fieldPath={`items.${index}.content`}
                        baseValue={item.content}
                        onBaseChange={(value) => updateItem(index, value)}
                        className="min-h-[44px] w-full resize-y rounded-[4px] border border-input bg-white px-2 py-1.5 font-mono text-xs"
                        multiline
                      />
                    </td>
                    <td className="px-1">
                      <div className="flex items-center gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => moveItem(index, -1)}
                          disabled={index === 0}
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => moveItem(index, 1)}
                          disabled={index === items.length - 1}
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => removeItem(index)}
                          disabled={items.length <= 1}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="h-3.5 w-3.5 mr-1" /> {t("addSentence")}
            </Button>
            <Button type="button" size="sm" onClick={() => setTableOpen(false)}>
              {t("done")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Separator />
      <div className="flex items-center justify-between">
        <Label className="text-xs">{t("showWordBank")}</Label>
        <Switch
          checked={block.showWordBank}
          onCheckedChange={(checked) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { showWordBank: checked } },
            })
          }
        />
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-xs">{t("showFirstAsExample")}</Label>
        <Switch
          checked={block.showFirstAsExample ?? false}
          onCheckedChange={(checked) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { showFirstAsExample: checked } },
            })
          }
        />
      </div>
      <Separator />
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("csvImport")}</Label>
        <p className="text-xs text-muted-foreground mb-1">
          {t("fillInBlankItemsCsvHelp")}
        </p>
        <textarea
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[80px] resize-y font-mono"
          placeholder={t("fillInBlankItemsCsvPlaceholder")}
          value={csvText}
          onChange={(e) => {
            setCsvText(e.target.value);
            setCsvError(null);
          }}
        />
        {csvError && (
          <p className="text-xs text-destructive mt-1">{csvError}</p>
        )}
        <div className="flex gap-1 mt-1">
          <Select
            value={csvMode}
            onValueChange={(v) => setCsvMode(v as "replace" | "append")}
          >
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="replace">{t("csvReplace")}</SelectItem>
              <SelectItem value="append">{t("csvAppend")}</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" className="h-8" onClick={handleCsvImport}>{t("csvImportButton")}</Button>
        </div>
      </div>
    </div>
  );
}

function MatchingProps({ block }: { block: MatchingBlock | PronunciationBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");
  const tc = useTranslations("common");
  const isPronunciation = block.type === "pronunciation";
  const [aiPrompt, setAiPrompt] = React.useState("");
  const [aiError, setAiError] = React.useState<string | null>(null);
  const [aiMode, setAiMode] = React.useState<"replace" | "append">("replace");
  const [isGeneratingAi, setIsGeneratingAi] = React.useState(false);
  const [csvText, setCsvText] = React.useState("");
  const [csvError, setCsvError] = React.useState<string | null>(null);
  const [csvMode, setCsvMode] = React.useState<"replace" | "append">("replace");

  const handleAiGenerate = async () => {
    const prompt = aiPrompt.trim();
    if (!prompt || isGeneratingAi) return;

    setAiError(null);
    setIsGeneratingAi(true);

    try {
      const res = await authFetch("/api/ai/generate-matching", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          blockType: block.type,
          existingPairs: block.pairs.slice(0, 8),
          leftHeader: isPronunciation ? block.leftHeader : undefined,
          rightHeader: isPronunciation ? block.rightHeader : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || tc("generationFailed"));
      }

      const generatedPairs = (data.pairs as { left: string; right: string }[]).map((pair, index) => ({
        id: `p${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
        left: pair.left,
        right: pair.right,
      }));

      const pairs = aiMode === "append"
        ? [...block.pairs, ...generatedPairs]
        : generatedPairs;

      dispatch({
        type: "UPDATE_BLOCK",
        payload: {
          id: block.id,
          updates: {
            pairs,
            ...(aiMode === "replace" ? { pairOrder: undefined } : {}),
          },
        },
      });
      setAiPrompt("");
    } catch (err: unknown) {
      setAiError(err instanceof Error ? err.message : tc("generationFailed"));
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleCsvImport = () => {
    setCsvError(null);
    const text = csvText.trim();
    if (!text) return;

    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    const parsed: { left: string; right: string }[] = [];

    for (const line of lines) {
      const sep = line.includes("\t") ? "\t" : line.includes(";") ? ";" : ",";
      const parts = line.split(sep).map((p) => p.trim());

      if (parts.length >= 2) {
        parsed.push({ left: parts[0], right: parts.slice(1).join(sep === "\t" ? " " : ", ").trim() });
      } else if (parts[0]) {
        parsed.push({ left: parts[0], right: "" });
      }
    }

    if (parsed.length === 0) {
      setCsvError(t("csvNoData"));
      return;
    }

    const newPairs = parsed.map((p) => ({
      id: `p${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      left: p.left,
      right: p.right,
    }));

    const pairs = csvMode === "append"
      ? [...block.pairs, ...newPairs]
      : newPairs;

    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { pairs } },
    });
    setCsvText("");
  };

  const orderedPairs = React.useMemo(() => {
    const examplePairId = block.showFirstAsExample ? block.pairs[0]?.id : undefined;
    const examplePair = examplePairId ? block.pairs.find((pair) => pair.id === examplePairId) : undefined;
    const remainingPairs = block.pairs.filter((pair) => pair.id !== examplePairId);
    const orderedRemainingPairs = block.pairOrder
      ? block.pairOrder
          .map((id) => remainingPairs.find((pair) => pair.id === id))
          .filter((pair): pair is NonNullable<typeof pair> => !!pair)
          .concat(remainingPairs.filter((pair) => !block.pairOrder!.includes(pair.id)))
      : remainingPairs;

    return examplePair ? [examplePair, ...orderedRemainingPairs] : orderedRemainingPairs;
  }, [block.pairOrder, block.pairs, block.showFirstAsExample]);

  const updatePair = (pairId: string, updates: Partial<{ left: string; right: string }>) => {
    const index = block.pairs.findIndex((pair) => pair.id === pairId);
    if (index === -1) return;
    const newPairs = [...block.pairs];
    newPairs[index] = { ...newPairs[index], ...updates };
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { pairs: newPairs } },
    });
  };

  const addPair = () => {
    const newPairs = [
      ...block.pairs,
      { id: `p${Date.now()}`, left: t("newItem"), right: t("newMatch") },
    ];
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { pairs: newPairs } },
    });
  };

  const removePair = (pairId: string) => {
    const newPairs = block.pairs.filter((pair) => pair.id !== pairId);
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { pairs: newPairs } },
    });
  };

  const shufflePairs = () => {
    const lockedExampleId = block.showFirstAsExample ? block.pairs[0]?.id : undefined;
    const ids = block.pairs.filter((pair) => pair.id !== lockedExampleId).map((pair) => pair.id);
    const shuffled = [...ids];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { pairOrder: shuffled } },
    });
  };

  const movePair = (pairId: string, direction: -1 | 1) => {
    const lockedExampleId = block.showFirstAsExample ? block.pairs[0]?.id : undefined;
    if (pairId === lockedExampleId) return;

    const movablePairs = orderedPairs.filter((pair) => pair.id !== lockedExampleId);
    const currentIndex = movablePairs.findIndex((pair) => pair.id === pairId);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= movablePairs.length) return;

    const nextPairs = [...movablePairs];
    [nextPairs[currentIndex], nextPairs[nextIndex]] = [nextPairs[nextIndex], nextPairs[currentIndex]];

    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { pairOrder: nextPairs.map((pair) => pair.id) } },
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("instruction")}</Label>
        <ChInput
          blockId={block.id}
          fieldPath="instruction"
          baseValue={block.instruction}
          onBaseChange={(v) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { instruction: v } },
            })
          }
        />
      </div>
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("text")}</Label>
        <textarea
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[88px] resize-y"
          placeholder={t("dialogueTextPlaceholder")}
          value={block.textAboveItems ?? ""}
          onChange={(e) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { textAboveItems: e.target.value } },
            })
          }
        />
      </div>
      {isPronunciation && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("headerLeft")}</Label>
              <ChInput
                blockId={block.id}
                fieldPath="leftHeader"
                baseValue={block.leftHeader ?? ""}
                onBaseChange={(v) =>
                  dispatch({
                    type: "UPDATE_BLOCK",
                    payload: { id: block.id, updates: { leftHeader: v } },
                  })
                }
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("headerRight")}</Label>
              <ChInput
                blockId={block.id}
                fieldPath="rightHeader"
                baseValue={block.rightHeader ?? ""}
                onBaseChange={(v) =>
                  dispatch({
                    type: "UPDATE_BLOCK",
                    payload: { id: block.id, updates: { rightHeader: v } },
                  })
                }
              />
            </div>
          </div>
        </>
      )}
      <Separator />
      <div className="flex items-center justify-between">
        <Label className="text-sm">{t("extendedRows")}</Label>
        <Switch
          checked={block.extendedRows ?? false}
          onCheckedChange={(checked) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { extendedRows: checked } },
            })
          }
        />
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-sm">{t("showWordBank")}</Label>
        <Switch
          checked={block.showWordBank ?? false}
          onCheckedChange={(checked) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { showWordBank: checked } },
            })
          }
        />
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-sm">{t("showFirstAsExample")}</Label>
        <Switch
          checked={block.showFirstAsExample ?? false}
          onCheckedChange={(checked) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { showFirstAsExample: checked } },
            })
          }
        />
      </div>
      <Separator />
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("pairs")}</Label>
        {orderedPairs.map((pair) => {
          const pairIndex = block.pairs.findIndex((currentPair) => currentPair.id === pair.id);
          const lockedExampleId = block.showFirstAsExample ? block.pairs[0]?.id : undefined;
          const movableIndex = orderedPairs.filter((currentPair) => currentPair.id !== lockedExampleId).findIndex((currentPair) => currentPair.id === pair.id);
          const isLockedExample = pair.id === lockedExampleId;
          return (
          <div key={pair.id} className="flex items-center gap-1">
            <div className="flex shrink-0 flex-col">
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-6"
                onClick={() => movePair(pair.id, -1)}
                disabled={isLockedExample || movableIndex <= 0}
              >
                <ChevronUp className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-6"
                onClick={() => movePair(pair.id, 1)}
                disabled={isLockedExample || movableIndex === -1 || movableIndex >= orderedPairs.filter((currentPair) => currentPair.id !== lockedExampleId).length - 1}
              >
                <ChevronDown className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex-1">
              <ChInput
                blockId={block.id}
                fieldPath={`pairs.${pairIndex}.left`}
                baseValue={pair.left}
                onBaseChange={(v) => updatePair(pair.id, { left: v })}
                className="h-8 text-xs"
                placeholder={t("left")}
              />
            </div>
            <span className="text-xs text-muted-foreground">→</span>
            <div className="flex-1">
              <ChInput
                blockId={block.id}
                fieldPath={`pairs.${pairIndex}.right`}
                baseValue={pair.right}
                onBaseChange={(v) => updatePair(pair.id, { right: v })}
                className="h-8 text-xs"
                placeholder={t("right")}
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => removePair(pair.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        );})}
        <Button variant="outline" size="sm" onClick={addPair} className="w-full">
          <Plus className="h-3.5 w-3.5 mr-1" /> {t("addPair")}
        </Button>
        <Button variant="outline" size="sm" onClick={shufflePairs} className="w-full">
          <Shuffle className="h-3.5 w-3.5 mr-1" /> {t("shuffleItems")}
        </Button>
        {block.pairOrder && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={() =>
              dispatch({
                type: "UPDATE_BLOCK",
                payload: { id: block.id, updates: { pairOrder: undefined } },
              })
            }
          >
            {t("resetOrder")}
          </Button>
        )}
      </div>
      <Separator />
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("aiGeneration")}</Label>
        <p className="text-xs text-muted-foreground mb-1">
          {t("aiMatchingHelp")}
        </p>
        <textarea
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[88px] resize-y"
          placeholder={t("aiMatchingPromptPlaceholder")}
          value={aiPrompt}
          onChange={(e) => {
            setAiPrompt(e.target.value);
            setAiError(null);
          }}
        />
        {aiError && (
          <p className="text-xs text-destructive mt-1">{aiError}</p>
        )}
        <div className="flex gap-1 mt-1">
          <Select
            value={aiMode}
            onValueChange={(value) => setAiMode(value as "replace" | "append")}
          >
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="replace">{t("csvReplace")}</SelectItem>
              <SelectItem value="append">{t("csvAppend")}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleAiGenerate}
            disabled={!aiPrompt.trim() || isGeneratingAi}
          >
            {isGeneratingAi ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            {t("aiGenerate")}
          </Button>
        </div>
      </div>
      <Separator />
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("csvImport")}</Label>
        <p className="text-xs text-muted-foreground mb-1">
          {t("csvImportHelp")}
        </p>
        <textarea
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[80px] resize-y"
          placeholder={t("csvImportPlaceholder")}
          value={csvText}
          onChange={(e) => {
            setCsvText(e.target.value);
            setCsvError(null);
          }}
        />
        {csvError && (
          <p className="text-xs text-destructive mt-1">{csvError}</p>
        )}
        <div className="flex gap-1 mt-1">
          <Select
            value={csvMode}
            onValueChange={(v) => setCsvMode(v as "replace" | "append")}
          >
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="replace">{t("csvReplace")}</SelectItem>
              <SelectItem value="append">{t("csvAppend")}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleCsvImport}
            disabled={!csvText.trim()}
          >
            <Upload className="h-4 w-4 mr-2" />
            {t("csvImportButton")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function TextMatchingProps({ block }: { block: TextMatchingBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");
  const tc = useTranslations("common");

  const updateItem = (itemId: string, updates: Partial<TextMatchingBlock["items"][number]>) => {
    const items = block.items.map((item) => item.id === itemId ? { ...item, ...updates } : item);
    dispatch({ type: "UPDATE_BLOCK", payload: { id: block.id, updates: { items } } });
  };

  const addItem = () => {
    const nextNumber = block.items.length + 1;
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          items: [
            ...block.items,
            {
              id: `tm${Date.now()}`,
              text: "",
              content: `<p>${t("newMatch")} ${nextNumber}</p>`,
            },
          ],
        },
      },
    });
  };

  const removeItem = (itemId: string) => {
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: block.items.filter((item) => item.id !== itemId) } },
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("instruction")}</Label>
        <ChInput
          blockId={block.id}
          fieldPath="instruction"
          baseValue={block.instruction}
          onBaseChange={(v) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { instruction: v } },
            })
          }
        />
      </div>
      <Separator />
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("numberOfColumns")}</Label>
        <Select
          value={String(block.columns ?? 3)}
          onValueChange={(value) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { columns: Number(value) as TextMatchingBlock["columns"] } },
            })
          }
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1</SelectItem>
            <SelectItem value="2">2</SelectItem>
            <SelectItem value="3">3</SelectItem>
            <SelectItem value="4">4</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-sm">{t("showFirstAsExample")}</Label>
        <Switch
          checked={block.showFirstAsExample ?? false}
          onCheckedChange={(checked) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { showFirstAsExample: checked } },
            })
          }
        />
      </div>
      <Separator />
      <div className="space-y-3">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("items")}</Label>
        {block.items.map((item, index) => (
          <div key={item.id} className="space-y-2 rounded-md border border-border p-2">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted text-xs font-semibold text-muted-foreground">
                {index + 1}
              </span>
              <ChInput
                blockId={block.id}
                fieldPath={`items.${index}.text`}
                baseValue={item.text ?? ""}
                onBaseChange={(v) => updateItem(item.id, { text: v })}
                className="h-8 text-xs"
                placeholder={t("itemText")}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => removeItem(item.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            <div className="rounded-md border border-input bg-background px-2 py-1">
              <RichTextEditor
                content={item.content ?? ""}
                onChange={(html) => updateItem(item.id, { content: html })}
                placeholder={tc("content")}
                editorClassName="prose prose-sm max-w-none focus:outline-none min-h-[56px] py-1"
              />
            </div>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addItem} className="w-full">
          <Plus className="h-3.5 w-3.5 mr-1" /> {t("newItem")}
        </Button>
      </div>
    </div>
  );
}

function TwoColumnFillProps({ block }: { block: TwoColumnFillBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");
  const tc = useTranslations("common");
  const [csvText, setCsvText] = React.useState("");
  const [csvError, setCsvError] = React.useState<string | null>(null);
  const [csvMode, setCsvMode] = React.useState<"replace" | "append">("replace");

  const handleCsvImport = () => {
    setCsvError(null);
    const text = csvText.trim();
    if (!text) return;

    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    const parsed: { left: string; right: string }[] = [];

    for (const line of lines) {
      const sep = line.includes("\t") ? "\t" : line.includes(";") ? ";" : ",";
      const parts = line.split(sep).map((p) => p.trim());

      if (parts.length >= 2) {
        parsed.push({ left: parts[0], right: parts.slice(1).join(sep === "\t" ? " " : ", ").trim() });
      } else if (parts[0]) {
        parsed.push({ left: parts[0], right: "" });
      }
    }

    if (parsed.length === 0) {
      setCsvError(t("csvNoData"));
      return;
    }

    const newItems = parsed.map((p) => ({
      id: `i${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      left: p.left,
      right: p.right,
    }));

    const items = csvMode === "append"
      ? [...block.items, ...newItems]
      : newItems;

    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items } },
    });
    setCsvText("");
  };

  const updateItem = (index: number, updates: Partial<{ left: string; right: string }>) => {
    const newItems = [...block.items];
    newItems[index] = { ...newItems[index], ...updates };
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: newItems } },
    });
  };

  const addItem = () => {
    const newItems = [
      ...block.items,
      { id: `i${Date.now()}`, left: t("newItem"), right: t("newItem") },
    ];
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: newItems } },
    });
  };

  const removeItem = (index: number) => {
    const newItems = block.items.filter((_, i) => i !== index);
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: newItems } },
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("instruction")}</Label>
        <ChInput
          blockId={block.id}
          fieldPath="instruction"
          baseValue={block.instruction}
          onBaseChange={(v) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { instruction: v } },
            })
          }
        />
      </div>
      <Separator />
      <div className="flex items-center justify-between">
        <Label className="text-sm">{t("fillSide")}</Label>
        <Select
          value={block.fillSide}
          onValueChange={(v) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { fillSide: v as "left" | "right" } },
            })
          }
        >
          <SelectTrigger className="w-[120px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="left">{t("left")}</SelectItem>
            <SelectItem value="right">{t("right")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Separator />
      <div className="flex items-center justify-between">
        <Label className="text-sm">{t("colRatio")}</Label>
        <Select
          value={block.colRatio ?? "1-1"}
          onValueChange={(v) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { colRatio: v as "1-1" | "1-2" | "2-1" } },
            })
          }
        >
          <SelectTrigger className="w-[120px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1-1">1/2 + 1/2</SelectItem>
            <SelectItem value="1-2">1/3 + 2/3</SelectItem>
            <SelectItem value="2-1">2/3 + 1/3</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Separator />
      <div className="flex items-center justify-between">
        <Label className="text-sm">{t("extendedRows")}</Label>
        <Switch
          checked={block.extendedRows ?? false}
          onCheckedChange={(checked) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { extendedRows: checked } },
            })
          }
        />
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-sm">{t("showWordBank")}</Label>
        <Switch
          checked={block.showWordBank ?? false}
          onCheckedChange={(checked) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { showWordBank: checked } },
            })
          }
        />
      </div>
      <Separator />
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("items")}</Label>
        {block.items.map((item, i) => (
          <div key={item.id} className="flex items-center gap-1">
            <div className="flex-1">
              <ChInput
                blockId={block.id}
                fieldPath={`items.${i}.left`}
                baseValue={item.left}
                onBaseChange={(v) => updateItem(i, { left: v })}
                className="h-8 text-xs"
                placeholder={t("left")}
              />
            </div>
            <span className="text-xs text-muted-foreground">→</span>
            <div className="flex-1">
              <ChInput
                blockId={block.id}
                fieldPath={`items.${i}.right`}
                baseValue={item.right}
                onBaseChange={(v) => updateItem(i, { right: v })}
                className="h-8 text-xs"
                placeholder={t("right")}
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => removeItem(i)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addItem} className="w-full">
          <Plus className="h-3.5 w-3.5 mr-1" /> {t("addItem")}
        </Button>
      </div>
      <Separator />
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("csvImport")}</Label>
        <p className="text-xs text-muted-foreground mb-1">
          {t("csvImportHelp")}
        </p>
        <textarea
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[80px] resize-y"
          placeholder={t("csvImportPlaceholder")}
          value={csvText}
          onChange={(e) => {
            setCsvText(e.target.value);
            setCsvError(null);
          }}
        />
        {csvError && (
          <p className="text-xs text-destructive mt-1">{csvError}</p>
        )}
        <div className="flex gap-1 mt-1">
          <Select
            value={csvMode}
            onValueChange={(v) => setCsvMode(v as "replace" | "append")}
          >
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="replace">{t("csvReplace")}</SelectItem>
              <SelectItem value="append">{t("csvAppend")}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleCsvImport}
            disabled={!csvText.trim()}
          >
            <Upload className="h-4 w-4 mr-2" />
            {t("csvImportButton")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function GlossaryProps({ block }: { block: GlossaryBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");
  const tc = useTranslations("common");
  const [csvText, setCsvText] = React.useState("");
  const [csvError, setCsvError] = React.useState<string | null>(null);
  const [csvMode, setCsvMode] = React.useState<"replace" | "append">("replace");

  const handleCsvImport = () => {
    setCsvError(null);
    const text = csvText.trim();
    if (!text) return;

    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    const parsed: { term: string; definition: string; example: string }[] = [];

    for (const line of lines) {
      const sep = line.includes("\t") ? "\t" : line.includes(";") ? ";" : ",";
      const parts = line.split(sep).map((p) => p.trim());

      if (parts.length >= 2) {
        parsed.push({ term: parts[0], definition: parts[1], example: parts[2] ?? "" });
      } else if (parts[0]) {
        parsed.push({ term: parts[0], definition: "", example: "" });
      }
    }

    if (parsed.length === 0) {
      setCsvError(t("csvNoData"));
      return;
    }

    const newPairs = parsed.map((p) => ({
      id: `g${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      term: p.term,
      definition: p.definition,
      example: p.example,
    }));

    const pairs = csvMode === "append"
      ? [...block.pairs, ...newPairs]
      : newPairs;

    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { pairs } },
    });
    setCsvText("");
  };

  const updatePair = (index: number, updates: Partial<{ term: string; definition: string; example: string }>) => {
    const newPairs = [...block.pairs];
    newPairs[index] = { ...newPairs[index], ...updates };
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { pairs: newPairs } },
    });
  };

  const addPair = () => {
    const newPairs = [
      ...block.pairs,
      { id: `g${Date.now()}`, term: t("newItem"), definition: t("newMatch"), example: "" },
    ];
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { pairs: newPairs } },
    });
  };

  const removePair = (index: number) => {
    const newPairs = block.pairs.filter((_, i) => i !== index);
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { pairs: newPairs } },
    });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("instruction")}</Label>
        <ChInput
          blockId={block.id}
          fieldPath="instruction"
          baseValue={block.instruction}
          onBaseChange={(v) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { instruction: v } },
            })
          }
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("glossaryLeftColWidth")}</Label>
        <div className="grid grid-cols-4 gap-1">
          {([25, 33, 50, 66] as const).map((w) => (
            <Button
              key={w}
              variant={(block.leftColWidth ?? 25) === w ? "default" : "outline"}
              size="sm"
              className="h-8 min-w-0 px-1 text-sm"
              onClick={() =>
                dispatch({
                  type: "UPDATE_BLOCK",
                  payload: { id: block.id, updates: { leftColWidth: w } },
                })
              }
            >
              {w}%
            </Button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("glossaryTerms")}</Label>
        {block.pairs.map((pair, i) => (
          <div key={pair.id} className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-6 shrink-0 text-left text-xs tabular-nums text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
              <ChInput
                blockId={block.id}
                fieldPath={`pairs.${i}.term`}
                baseValue={pair.term}
                onBaseChange={(v) => updatePair(i, { term: v })}
                className="h-8 flex-1 text-xs"
                placeholder={t("glossaryTerm")}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => removePair(i)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-6 shrink-0" />
              <ChInput
                blockId={block.id}
                fieldPath={`pairs.${i}.definition`}
                baseValue={pair.definition}
                onBaseChange={(v) => updatePair(i, { definition: v })}
                className="h-8 flex-1 text-xs"
                placeholder={t("glossaryDefinition")}
              />
              <span className="w-7 shrink-0" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-6 shrink-0" />
              <ChInput
                blockId={block.id}
                fieldPath={`pairs.${i}.example`}
                baseValue={pair.example ?? ""}
                onBaseChange={(v) => updatePair(i, { example: v })}
                className="h-8 flex-1 text-xs"
                placeholder={t("glossaryExample")}
              />
              <span className="w-7 shrink-0" />
            </div>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addPair} className="w-full">
          <Plus className="h-3.5 w-3.5 mr-1" /> {t("addPair")}
        </Button>
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("csvImport")}</Label>
        <textarea
          className="w-full rounded-[4px] !border border-input bg-white px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[80px] resize-y"
          placeholder=""
          value={csvText}
          onChange={(e) => {
            setCsvText(e.target.value);
            setCsvError(null);
          }}
        />
        {csvError && (
          <p className="text-xs text-destructive mt-1">{csvError}</p>
        )}
        <div className="space-y-2 mt-1">
          <Select
            value={csvMode}
            onValueChange={(v) => setCsvMode(v as "replace" | "append")}
          >
            <SelectTrigger size="sm" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="replace">{t("csvReplace")}</SelectItem>
              <SelectItem value="append">{t("csvAppend")}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleCsvImport}
            disabled={!csvText.trim()}
          >
            <Upload className="h-4 w-4 mr-2" />
            {t("csvImportButton")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function WordBankProps({ block }: { block: WordBankBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");
  const tc = useTranslations("common");

  const updateWord = (index: number, value: string) => {
    const newWords = [...block.words];
    newWords[index] = value;
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { words: newWords } },
    });
  };

  const addWord = () => {
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { words: [...block.words, t("newWord")] } },
    });
  };

  const removeWord = (index: number) => {
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { words: block.words.filter((_, i) => i !== index) } },
    });
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("words")}</Label>
      {block.words.map((word, i) => (
        <div key={i} className="flex items-center gap-1">
          <Input
            value={word}
            onChange={(e) => updateWord(i, e.target.value)}
            className="flex-1 h-8 text-xs"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => removeWord(i)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addWord} className="w-full">
        <Plus className="h-3.5 w-3.5 mr-1" /> {t("addWord")}
      </Button>
    </div>
  );
}

function ColumnsProps({ block }: { block: ColumnsBlock }) {
  const { state, dispatch } = useEditor();
  const t = useTranslations("properties");

  const normalizedColumnBgColors = Array.from(
    { length: block.columns },
    (_, idx) => block.columnBgColors?.[idx] ?? ""
  );

  const normalizeHex = (color: string): string | null => {
    const trimmed = color.trim();
    if (!trimmed) return null;
    const match = trimmed.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
    if (!match) return null;
    const raw = match[1];
    if (raw.length === 3) {
      return `#${raw
        .split("")
        .map((c) => `${c}${c}`)
        .join("")
        .toUpperCase()}`;
    }
    return `#${raw.toUpperCase()}`;
  };

  const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    const normalized = normalizeHex(hex);
    if (!normalized) return null;
    return {
      r: parseInt(normalized.slice(1, 3), 16),
      g: parseInt(normalized.slice(3, 5), 16),
      b: parseInt(normalized.slice(5, 7), 16),
    };
  };

  const rgbToHex = (r: number, g: number, b: number): string => {
    const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
    return `#${[clamp(r), clamp(g), clamp(b)]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()}`;
  };

  const mixWithWhite = (hex: string, ratio: number): string | null => {
    const rgb = hexToRgb(hex);
    if (!rgb) return null;
    return rgbToHex(
      rgb.r + (255 - rgb.r) * ratio,
      rgb.g + (255 - rgb.g) * ratio,
      rgb.b + (255 - rgb.b) * ratio
    );
  };

  /** Darken a color by mixing with black — used to auto-derive border from bg */
  const darkenColor = (hex: string, ratio: number): string => {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;
    return rgbToHex(rgb.r * (1 - ratio), rgb.g * (1 - ratio), rgb.b * (1 - ratio));
  };

  const buildBrandToneSet = (base: string): string[] => {
    const normalized = normalizeHex(base);
    if (!normalized) return [];
    const steps = [0, 0.08, 0.16, 0.25, 0.35, 0.46, 0.58, 0.72, 0.86, 0.96];
    return steps
      .map((step) => (step === 0 ? normalized : mixWithWhite(normalized, step)))
      .filter((c): c is string => !!c);
  };

  const brandPrimary = state.brandProfile.primaryColor;
  const brandAccent = state.brandProfile.accentColor || state.brandProfile.primaryColor;
  const stoneShades = buildBrandToneSet("#78716C");
  const primaryTones = buildBrandToneSet(brandPrimary);
  const accentTones = buildBrandToneSet(brandAccent);
  const toneRows = [
    { key: "primary", label: t("colorPrimary"), tones: primaryTones },
    { key: "accent", label: t("colorAccent"), tones: accentTones },
    { key: "stone", label: t("colorStone"), tones: stoneShades },
  ];

  const setColumnCount = (count: number) => {
    const newChildren = [...block.children];
    while (newChildren.length < count) {
      newChildren.push([]);
    }
    while (newChildren.length > count) {
      const last = newChildren[newChildren.length - 1];
      if (last.length === 0) {
        newChildren.pop();
      } else {
        const overflow = newChildren.splice(count);
        newChildren[count - 1] = [
          ...newChildren[count - 1],
          ...overflow.flat(),
        ];
        break;
      }
    }

    const newColumnBgColors = Array.from(
      { length: count },
      (_, idx) => block.columnBgColors?.[idx] ?? ""
    );
    const newColumnBorderColors = Array.from(
      { length: count },
      (_, idx) => block.columnBorderColors?.[idx] ?? ""
    );
    const fallbackBorder = block.showBorder ?? true;
    const newColumnBorders = Array.from(
      { length: count },
      (_, idx) => block.columnBorders?.[idx] ?? fallbackBorder
    );

    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          columns: count,
          children: newChildren,
          columnBgColors: newColumnBgColors,
          columnBorderColors: newColumnBorderColors,
          columnBorders: newColumnBorders,
        },
      },
    });
  };

  const normalizedColumnBorders = Array.from(
    { length: block.columns },
    (_, idx) => block.columnBorders?.[idx] ?? (block.showBorder ?? true)
  );

  const updateColumnBorder = (colIndex: number, checked: boolean) => {
    const next = [...normalizedColumnBorders];
    next[colIndex] = checked;
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { columnBorders: next } },
    });
  };

  /** Pick a column color: sets bg to the chosen shade and border to a 25% darker version */
  const updateColumnColor = (colIndex: number, color: string) => {
    const nextBg = [...normalizedColumnBgColors];
    const nextBorder = Array.from(
      { length: block.columns },
      (_, idx) => block.columnBorderColors?.[idx] ?? ""
    );
    nextBg[colIndex] = color;
    nextBorder[colIndex] = color ? darkenColor(color, 0.25) : "";
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: { columnBgColors: nextBg, columnBorderColors: nextBorder },
      },
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("numberOfColumns")}</Label>
        <div className="flex gap-1 mt-1.5">
          {[1, 2, 3, 4].map((n) => (
            <Button
              key={n}
              variant={block.columns === n ? "default" : "outline"}
              size="sm"
              className="flex-1 h-8"
              onClick={() => setColumnCount(n)}
            >
              {n}
            </Button>
          ))}
        </div>
      </div>
      <Separator />
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("columnColors")}</Label>
        {normalizedColumnBgColors.map((color, colIndex) => (
          <div key={colIndex} className="space-y-2 rounded-md border border-slate-200 p-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs min-w-20">{t("columnColor", { index: colIndex + 1 })}</Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{t("showBorder")}</span>
                <Switch
                  checked={normalizedColumnBorders[colIndex]}
                  onCheckedChange={(checked) => updateColumnBorder(colIndex, checked)}
                />
              </div>
            </div>
            <div className="space-y-2">
              {toneRows.map((row) => (
                <div key={`row-${colIndex}-${row.key}`} className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground w-16 shrink-0">{row.label}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {row.tones.map((tone) => (
                      <button
                        key={`${colIndex}-${row.key}-${tone}`}
                        type="button"
                        title={tone}
                        className={`w-7 h-7 rounded border-2 transition-all cursor-pointer ${
                          color?.toLowerCase() === tone.toLowerCase()
                            ? "border-primary scale-110"
                            : "border-border hover:border-primary/50"
                        }`}
                        style={{ backgroundColor: tone }}
                        onClick={() => updateColumnColor(colIndex, tone)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => updateColumnColor(colIndex, "")}
            >
              {t("clearColumnColor")}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function GridProps({ block }: { block: GridBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");

  const resizeGrid = (rows: number, cols: number) => {
    const totalCells = rows * cols;
    const newChildren = Array.from(
      { length: totalCells },
      (_, idx) => block.children[idx] ?? []
    );
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: { rows, cols, children: newChildren },
      },
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("numberOfRows")}</Label>
        <div className="flex gap-1 mt-1.5">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <Button
              key={n}
              variant={block.rows === n ? "default" : "outline"}
              size="sm"
              className="flex-1 h-8"
              onClick={() => resizeGrid(n, block.cols)}
            >
              {n}
            </Button>
          ))}
        </div>
      </div>
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("numberOfColumns")}</Label>
        <div className="flex gap-1 mt-1.5">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <Button
              key={n}
              variant={block.cols === n ? "default" : "outline"}
              size="sm"
              className="flex-1 h-8"
              onClick={() => resizeGrid(block.rows, n)}
            >
              {n}
            </Button>
          ))}
        </div>
      </div>
      <Separator />
      <div>
        <Label className="text-xs">{t("colGap")}</Label>
        <div className="flex items-center gap-2 mt-1">
          <Slider
            min={0}
            max={48}
            step={4}
            value={[block.colGap]}
            onValueChange={([v]) =>
              dispatch({
                type: "UPDATE_BLOCK",
                payload: { id: block.id, updates: { colGap: v } },
              })
            }
          />
          <span className="text-xs text-muted-foreground w-8 text-right">{block.colGap}px</span>
        </div>
      </div>
      <div>
        <Label className="text-xs">{t("rowGap")}</Label>
        <div className="flex items-center gap-2 mt-1">
          <Slider
            min={0}
            max={48}
            step={4}
            value={[block.rowGap]}
            onValueChange={([v]) =>
              dispatch({
                type: "UPDATE_BLOCK",
                payload: { id: block.id, updates: { rowGap: v } },
              })
            }
          />
          <span className="text-xs text-muted-foreground w-8 text-right">{block.rowGap}px</span>
        </div>
      </div>
      <Separator />
      <div>
        <Label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={block.showBorder ?? false}
            onChange={(e) =>
              dispatch({
                type: "UPDATE_BLOCK",
                payload: { id: block.id, updates: { showBorder: e.target.checked } },
              })
            }
            className="w-4 h-4"
          />
          <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">{t("showBorder")}</span>
        </Label>
      </div>
    </div>
  );
}

function BoardGameProps({ block }: { block: BoardGameBlock }) {
  const { state, dispatch } = useEditor();
  const t = useTranslations("properties");
  const tc = useTranslations("common");
  const { upload } = useUpload();
  const [isUploading, setIsUploading] = React.useState(false);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [cropSrc, setCropSrc] = React.useState<string | null>(null);
  const [cropOpen, setCropOpen] = React.useState(false);
  const [browserOpen, setBrowserOpen] = React.useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = React.useState(false);
  const [csvText, setCsvText] = React.useState("");
  const [csvError, setCsvError] = React.useState<string | null>(null);
  const [csvMode, setCsvMode] = React.useState<"replace" | "append">("replace");

  const totalCells = Math.max(1, block.rows * block.cols);
  const cells = Array.from({ length: totalCells }, (_, index) => {
    const existing = block.cells[index];
    return existing ?? { id: `cell-${index + 1}`, text: "", imageUrl: "" };
  });
  const selectedCellIndex = state.activeItemIndex;
  const selectedCell = selectedCellIndex !== null ? cells[selectedCellIndex] : null;
  const selectedDisplayText =
    selectedCellIndex === 0 ? "ZIEL" : selectedCellIndex === 35 ? "START" : selectedCell?.text || "";
  const isSpecialCell = selectedCellIndex === 0 || selectedCellIndex === 35;

  const snakePathIndices = React.useMemo(() => {
    const indices: number[] = [];
    for (let r = block.rows - 1; r >= 0; r--) {
      const isLeftToRight = (block.rows - 1 - r) % 2 === 0;
      const range = isLeftToRight
        ? Array.from({ length: block.cols }, (_, c) => c)
        : Array.from({ length: block.cols }, (_, c) => block.cols - 1 - c);
      for (const c of range) {
        const idx = r * block.cols + c;
        if (idx !== 35 && idx !== 0 && idx < totalCells) {
          indices.push(idx);
        }
      }
    }
    return indices;
  }, [block.rows, block.cols, totalCells]);

  const updateCell = (index: number, updates: Partial<BoardGameBlock["cells"][number]>) => {
    const nextCells = cells.map((cell, cellIndex) => (cellIndex === index ? { ...cell, ...updates } : cell));
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { cells: nextCells } },
    });
  };

  const handleFileSelected = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const objectUrl = URL.createObjectURL(file);
    setCropSrc(objectUrl);
    setCropOpen(true);
  };

  const handleCropComplete = async (result: CropResult) => {
    if (selectedCellIndex === null) return;
    setIsUploading(true);
    try {
      const file = new File([result.blob], `board-game-cell-${selectedCellIndex + 1}.png`, { type: "image/png" });
      const uploadResult = await upload(file);
      updateCell(selectedCellIndex, { imageUrl: uploadResult.url });
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setIsUploading(false);
      if (cropSrc) URL.revokeObjectURL(cropSrc);
      URL.revokeObjectURL(result.url);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      handleFileSelected(file);
    }
  };

  const clearCells = () => {
    const nextCells = block.cells.map((cell) => ({ ...cell, text: "", imageUrl: "" }));
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { cells: nextCells } },
    });
  };

  const shuffleCells = () => {
    const contents = snakePathIndices.map((idx) => ({
      text: cells[idx]?.text ?? "",
      imageUrl: cells[idx]?.imageUrl ?? "",
    }));
    for (let i = contents.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [contents[i], contents[j]] = [contents[j], contents[i]];
    }
    const contentByIndex = new Map<number, { text: string; imageUrl: string }>();
    snakePathIndices.forEach((cellIndex, i) => {
      contentByIndex.set(cellIndex, contents[i]);
    });
    const nextCells = cells.map((cell, index) => {
      const shuffled = contentByIndex.get(index);
      if (!shuffled) return cell;
      return { ...cell, text: shuffled.text, imageUrl: shuffled.imageUrl };
    });
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { cells: nextCells } },
    });
  };

  const handleCsvImport = () => {
    setCsvError(null);
    const text = csvText.trim();
    if (!text) return;

    const parsed = text
      .split(/\r?\n|\t/)
      .map((part) => part.trim())
      .filter((part) => part.length > 0);

    if (parsed.length === 0) {
      setCsvError(t("csvNoData"));
      return;
    }

    // Map parsed lines to snake-path positions. Replace overwrites every numbered cell;
    // append only fills cells that are currently empty (in play order).
    const assignments = new Map<number, string>();
    if (csvMode === "replace") {
      parsed.forEach((value, i) => {
        const cellIndex = snakePathIndices[i];
        if (cellIndex !== undefined) assignments.set(cellIndex, value);
      });
    } else {
      let cursor = 0;
      for (const cellIndex of snakePathIndices) {
        if (cursor >= parsed.length) break;
        const existing = (cells[cellIndex]?.text ?? "").trim();
        if (existing) continue;
        assignments.set(cellIndex, parsed[cursor]);
        cursor += 1;
      }
    }

    const nextCells = cells.map((cell, index) => {
      if (index === 0) return { ...cell, text: "ZIEL" };
      if (index === 35) return { ...cell, text: "START" };
      if (csvMode === "replace") {
        return { ...cell, text: assignments.get(index) ?? "" };
      }
      if (assignments.has(index)) {
        return { ...cell, text: assignments.get(index) ?? "" };
      }
      return cell;
    });

    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { cells: nextCells } },
    });
    setCsvText("");
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("numberOfRows")}</Label>
        <Input value={String(block.rows)} readOnly className="h-8" />
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("numberOfColumns")}</Label>
        <Input value={String(block.cols)} readOnly className="h-8" />
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">
          Selected Cell
        </Label>
        <Input
          readOnly
          value={selectedCellIndex === null ? "Click a cell in the board" : `Cell ${selectedCellIndex + 1}`}
          className="h-8"
        />
      </div>
      {selectedCellIndex !== null && selectedCell ? (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("image")}</Label>
            {selectedCell.imageUrl ? (
              <div className="space-y-2">
                <div className="relative group/img rounded-[4px] overflow-hidden border border-border bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selectedCell.imageUrl} alt={selectedDisplayText || "Board game cell"} className="w-full" />
                  <button
                    type="button"
                    onClick={() => updateCell(selectedCellIndex, { imageUrl: "" })}
                    className="absolute top-1 right-1 opacity-0 group-hover/img:opacity-100 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-opacity"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                <Button variant="outline" size="sm" className="w-full" onClick={() => setBrowserOpen(true)}>
                  {t("replaceImage")}
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <label
                  className={`flex flex-col items-center justify-center rounded-[4px] border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
                    isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/40"
                  }`}
                  onDrop={handleDrop}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                >
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelected(file);
                    }}
                  />
                  {isUploading ? (
                    <span className="text-xs text-muted-foreground">{t("uploading")}</span>
                  ) : (
                    <>
                      <Upload className="mb-1 h-6 w-6 text-muted-foreground/50" />
                      <span className="text-xs text-muted-foreground">{t("textImageDragOrClick")}</span>
                    </>
                  )}
                </label>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setBrowserOpen(true)}
                >
                  <ImagePlus className="h-3.5 w-3.5 mr-1" />
                  {t("mediaBrowser")}
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">
              Text
            </Label>
            <textarea
              value={selectedDisplayText}
              readOnly={isSpecialCell}
              onChange={(e) => updateCell(selectedCellIndex, { text: e.target.value })}
              className="w-full min-h-[90px] rounded-[4px] !border border-input bg-white p-2 text-sm resize-y"
              placeholder="Cell text"
            />
            {isSpecialCell ? (
              <p className="mt-1 text-xs text-muted-foreground">
                START and ZIEL are fixed labels.
              </p>
            ) : null}
          </div>

          <MediaBrowserDialog
            open={browserOpen}
            onOpenChange={setBrowserOpen}
            onSelectUrl={(url) => {
              if (selectedCellIndex === null) return;
              updateCell(selectedCellIndex, { imageUrl: url });
            }}
            onSelectFile={handleFileSelected}
          />

          <ImageCropDialog
            imageSrc={cropSrc}
            open={cropOpen}
            onOpenChange={(open) => {
              setCropOpen(open);
              if (!open && cropSrc) {
                URL.revokeObjectURL(cropSrc);
                setCropSrc(null);
              }
            }}
            onCropComplete={handleCropComplete}
            title={t("cropImage")}
          />
        </div>
      ) : null}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("csvImport")}</Label>
        <p className="text-xs text-muted-foreground">{t("boardGameCsvHelp")}</p>
        <textarea
          className="w-full rounded-[4px] !border border-input bg-white px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[80px] resize-y"
          placeholder={t("boardGameCsvPlaceholder")}
          value={csvText}
          onChange={(e) => {
            setCsvText(e.target.value);
            setCsvError(null);
          }}
        />
        {csvError && (
          <p className="text-xs text-destructive mt-1">{csvError}</p>
        )}
        <div className="space-y-2 mt-1">
          <Select
            value={csvMode}
            onValueChange={(v) => setCsvMode(v as "replace" | "append")}
          >
            <SelectTrigger size="sm" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="replace">{t("csvReplace")}</SelectItem>
              <SelectItem value="append">{t("csvAppend")}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleCsvImport}
            disabled={!csvText.trim()}
          >
            <Upload className="h-4 w-4 mr-2" />
            {t("csvImportButton")}
          </Button>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={shuffleCells}
      >
        <Shuffle className="h-4 w-4 mr-2" />
        {t("shuffleItems")}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => setClearConfirmOpen(true)}
      >
        Clear board
      </Button>

      <Dialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear board?</DialogTitle>
            <DialogDescription>
              This removes all text and images from every board cell.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                clearCells();
                setClearConfirmOpen(false);
              }}
            >
              Clear board
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DominoProps({ block }: { block: DominoBlock }) {
  const { state, dispatch } = useEditor();
  const t = useTranslations("properties");
  const tc = useTranslations("common");
  const { upload } = useUpload();
  const [isUploading, setIsUploading] = React.useState(false);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [cropSrc, setCropSrc] = React.useState<string | null>(null);
  const [cropOpen, setCropOpen] = React.useState(false);
  const [browserOpen, setBrowserOpen] = React.useState(false);
  const [csvText, setCsvText] = React.useState("");
  const [csvError, setCsvError] = React.useState<string | null>(null);
  const [csvMode, setCsvMode] = React.useState<"replace" | "append">("replace");
  const [clearConfirmOpen, setClearConfirmOpen] = React.useState(false);
  const brandSlug = state.brandProfile.slug || state.settings.brand || "edoomio";

  const items = block.items.length > 0
    ? block.items
    : Array.from({ length: 8 }, (_, index) => ({
        id: `domino-item-${index + 1}`,
        text: index === 0 ? "START" : index === 7 ? "ZIEL" : "",
        imageUrl: "",
        speakerIcon: null,
      }));
  const selectedItemIndex = state.activeItemIndex;
  const selectedItem = selectedItemIndex !== null ? items[selectedItemIndex] : null;
  const lastItemIndex = Math.max(0, items.length - 1);
  const selectedDisplayText =
    selectedItemIndex === 0
      ? "START"
      : selectedItemIndex === lastItemIndex
        ? "ZIEL"
        : selectedItem?.text || "";
  const isSpecialItem = selectedItemIndex === 0 || selectedItemIndex === lastItemIndex;

  const buildDominoItems = (middleTexts: string[]) => {
    const normalizedMiddleTexts = [...middleTexts];
    if (normalizedMiddleTexts.length % 2 !== 0) {
      normalizedMiddleTexts.push("");
    }

    return [
      { id: "domino-item-1", text: "START", imageUrl: "", speakerIcon: null },
      ...normalizedMiddleTexts.map((text, index) => ({
        id: `domino-item-${index + 2}`,
        text,
        imageUrl: "",
        speakerIcon: null,
      })),
      {
        id: `domino-item-${normalizedMiddleTexts.length + 2}`,
        text: "ZIEL",
        imageUrl: "",
        speakerIcon: null,
      },
    ];
  };

  const updateItem = (index: number, updates: Partial<DominoBlock["items"][number]>) => {
    const nextItems = items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...updates } : item));
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: nextItems } },
    });
  };

  const renderIcon = (icon: DialogueSpeakerIcon) => {
    return <DialogueSpeakerIconGlyph icon={icon} brandSlug={brandSlug} className="w-4 h-4 inline-block object-contain" />;
  };

  const handleFileSelected = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const objectUrl = URL.createObjectURL(file);
    setCropSrc(objectUrl);
    setCropOpen(true);
  };

  const handleCropComplete = async (result: CropResult) => {
    if (selectedItemIndex === null) return;
    setIsUploading(true);
    try {
      const file = new File([result.blob], `domino-item-${selectedItemIndex + 1}.png`, { type: "image/png" });
      const uploadResult = await upload(file);
      updateItem(selectedItemIndex, { imageUrl: uploadResult.url });
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setIsUploading(false);
      if (cropSrc) URL.revokeObjectURL(cropSrc);
      URL.revokeObjectURL(result.url);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      handleFileSelected(file);
    }
  };

  const clearItems = () => {
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          items: items.map((item, index) => ({
            ...item,
            text: index === 0 ? "START" : index === lastItemIndex ? "ZIEL" : "",
            imageUrl: "",
          })),
        },
      },
    });
  };

  const handleCsvImport = () => {
    setCsvError(null);
    const text = csvText.trim();
    if (!text) return;

    const parsed = text
      .split(/[\t\r\n]+/)
      .map((part) => part.trim())
      .filter((part) => part.length > 0);

    if (parsed.length === 0) {
      setCsvError(t("csvNoData"));
      return;
    }

    const existingMiddleItems = items
      .slice(1, -1)
      .filter((item, index, arr) => {
        const isTrailingFiller =
          index === arr.length - 1 &&
          !item.text?.trim() &&
          !item.imageUrl;
        return !isTrailingFiller;
      })
      .map((item) => item.text || "");

    const nextMiddleTexts = csvMode === "append"
      ? [...existingMiddleItems, ...parsed]
      : parsed;

    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: { items: buildDominoItems(nextMiddleTexts) },
      },
    });
    setCsvText("");
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">
          {t("title")}
        </Label>
        <Input
          value={block.title ?? ""}
          onChange={(e) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { title: e.target.value } },
            })
          }
          placeholder={t("title")}
          className="h-8"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">
          {t("footer")}
        </Label>
        <Input
          value={block.footer ?? ""}
          onChange={(e) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { footer: e.target.value } },
            })
          }
          placeholder={t("footer")}
          className="h-8"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("settings")}</Label>
        <div className="border-y border-slate-200 bg-white">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200">
            <Label className="text-sm text-foreground">{t("shufflePairs")}</Label>
            <Switch
              checked={block.shufflePairs ?? false}
              onCheckedChange={(checked) =>
                dispatch({
                  type: "UPDATE_BLOCK",
                  payload: { id: block.id, updates: { shufflePairs: checked } },
                })
              }
            />
          </div>
          <div className="flex items-center justify-between px-3 py-2">
            <Label className="text-sm text-foreground">{t("showSpeakerIcons")}</Label>
            <Switch
              checked={block.showSpeakerIcons ?? false}
              onCheckedChange={(checked) =>
                dispatch({
                  type: "UPDATE_BLOCK",
                  payload: { id: block.id, updates: { showSpeakerIcons: checked } },
                })
              }
            />
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("textSize")}</Label>
        <div className="flex gap-1">
          {(["s", "m", "l", "xl"] as const).map((size) => (
            <Button
              key={size}
              variant={(block.textSize ?? "m") === size ? "default" : "outline"}
              size="sm"
              className="flex-1 text-xs px-1 uppercase"
              onClick={() =>
                dispatch({
                  type: "UPDATE_BLOCK",
                  payload: { id: block.id, updates: { textSize: size } },
                })
              }
            >
              {size}
            </Button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">
          Selected Item
        </Label>
        <Input
          readOnly
          value={selectedItemIndex === null ? "Click an item in the domino" : `Item ${selectedItemIndex + 1}`}
          className="h-8"
        />
      </div>
      {selectedItemIndex !== null && selectedItem ? (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("image")}</Label>
            {selectedItem.imageUrl ? (
              <div className="space-y-2">
                <div className="relative group/img rounded-[4px] overflow-hidden border border-border bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selectedItem.imageUrl} alt={selectedDisplayText || "Domino item"} className="w-full" />
                  <button
                    type="button"
                    onClick={() => updateItem(selectedItemIndex, { imageUrl: "" })}
                    className="absolute top-1 right-1 opacity-0 group-hover/img:opacity-100 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-opacity"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                <Button variant="outline" size="sm" className="w-full" onClick={() => setBrowserOpen(true)}>
                  {t("replaceImage")}
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <label
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-[4px] border-2 border-dashed p-6 text-center transition-colors ${
                    isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/40"
                  }`}
                  onDrop={handleDrop}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                >
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelected(file);
                    }}
                  />
                  {isUploading ? (
                    <span className="text-xs text-muted-foreground">{t("uploading")}</span>
                  ) : (
                    <>
                      <Upload className="mb-1 h-6 w-6 text-muted-foreground/50" />
                      <span className="text-xs text-muted-foreground">{t("textImageDragOrClick")}</span>
                    </>
                  )}
                </label>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setBrowserOpen(true)}
                >
                  <ImagePlus className="h-3.5 w-3.5 mr-1" />
                  {t("mediaBrowser")}
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">
              Text
            </Label>
            <textarea
              value={selectedDisplayText}
              readOnly={isSpecialItem}
              onChange={(e) => updateItem(selectedItemIndex, { text: e.target.value })}
              className="w-full min-h-[90px] rounded-[4px] !border border-input bg-white p-2 text-sm resize-y"
              placeholder="Item text"
            />
            {isSpecialItem ? (
              <p className="mt-1 text-xs text-muted-foreground">
                START and ZIEL are fixed labels.
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">
              {t("speakerIcon")}
            </Label>
            <Select
              value={selectedItem.speakerIcon ?? "none"}
              onValueChange={(value) => updateItem(selectedItemIndex, { speakerIcon: value === "none" ? null : value as DialogueSpeakerIcon })}
            >
              <SelectTrigger className="h-8">
                <SelectValue>
                  {selectedItem.speakerIcon ? (
                    <span className="flex items-center gap-2">
                      {renderIcon(selectedItem.speakerIcon)}
                      <span className="text-sm capitalize">{selectedItem.speakerIcon}</span>
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">{t("emailStyleNone")}</span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("emailStyleNone")}</SelectItem>
                {DIALOGUE_SPEAKER_ICON_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span className="flex items-center gap-2">
                      {renderIcon(opt.value)}
                      <span>{opt.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <MediaBrowserDialog
            open={browserOpen}
            onOpenChange={setBrowserOpen}
            onSelectUrl={(url) => {
              if (selectedItemIndex === null) return;
              updateItem(selectedItemIndex, { imageUrl: url });
            }}
            onSelectFile={handleFileSelected}
          />

          <ImageCropDialog
            imageSrc={cropSrc}
            open={cropOpen}
            onOpenChange={(open) => {
              setCropOpen(open);
              if (!open && cropSrc) {
                URL.revokeObjectURL(cropSrc);
                setCropSrc(null);
              }
            }}
            onCropComplete={handleCropComplete}
            title={t("cropImage")}
          />
        </div>
      ) : null}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("csvImport")}</Label>
        <textarea
          className="w-full min-h-[110px] rounded-[4px] !border border-input bg-white px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
          placeholder={t("dominoCsvPlaceholder")}
          value={csvText}
          onChange={(e) => {
            setCsvText(e.target.value);
            setCsvError(null);
          }}
        />
        {csvError && (
          <p className="text-xs text-destructive mt-1">{csvError}</p>
        )}
        <div className="space-y-2">
          <Select
            value={csvMode}
            onValueChange={(v) => setCsvMode(v as "replace" | "append")}
          >
            <SelectTrigger className="h-8 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="replace">{t("csvReplace")}</SelectItem>
              <SelectItem value="append">{t("csvAppend")}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="w-full" onClick={handleCsvImport} disabled={!csvText.trim()}>
            {t("csvImportButton")}
          </Button>
        </div>
      </div>
      <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => setClearConfirmOpen(true)}>
        Clear domino
      </Button>

      <Dialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear domino?</DialogTitle>
            <DialogDescription>
              This removes all text and images from every domino item except the fixed START and ZIEL labels.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                clearItems();
                setClearConfirmOpen(false);
              }}
            >
              Clear domino
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CardPairsProps({ block }: { block: CardPairsBlock }) {
  const { state, dispatch } = useEditor();
  const t = useTranslations("properties");
  const { upload } = useUpload();
  const [isUploading, setIsUploading] = React.useState(false);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [cropSrc, setCropSrc] = React.useState<string | null>(null);
  const [cropOpen, setCropOpen] = React.useState(false);
  const [browserOpen, setBrowserOpen] = React.useState(false);
  const [csvText, setCsvText] = React.useState("");
  const [csvError, setCsvError] = React.useState<string | null>(null);
  const [csvMode, setCsvMode] = React.useState<"replace" | "append">("replace");

  const pairingMode = block.pairingMode ?? "same";
  const items = block.items.length > 0 ? block.items : getDefaultCardPairItems();
  const rawSelectedItemIndex = state.activeItemIndex;
  const selectedItemIndex =
    rawSelectedItemIndex === null
      ? null
      : pairingMode === "same"
        ? rawSelectedItemIndex - (rawSelectedItemIndex % 2)
        : rawSelectedItemIndex;
  const selectedItem = selectedItemIndex !== null ? items[selectedItemIndex] : null;
  const selectedDisplayText = selectedItem?.text ?? "";
  const isLinkedBackSelection = pairingMode === "same" && rawSelectedItemIndex !== null && rawSelectedItemIndex % 2 === 1;

  const buildCardPairItems = (texts: string[], nextPairingMode: "same" | "different") => {
    if (nextPairingMode === "same") {
      return texts.flatMap((text, pairIndex) => ([
        {
          id: `card-pair-item-${pairIndex * 2 + 1}`,
          text,
          imageUrl: "",
          speakerIcon: null,
        },
        {
          id: `card-pair-item-${pairIndex * 2 + 2}`,
          text: "",
          imageUrl: "",
          speakerIcon: null,
        },
      ]));
    }

    const normalizedTexts = [...texts];
    if (normalizedTexts.length % 2 !== 0) {
      normalizedTexts.push("");
    }

    return normalizedTexts.map((text, index) => ({
      id: `card-pair-item-${index + 1}`,
      text,
      imageUrl: "",
      speakerIcon: null,
    }));
  };

  const updateItem = (index: number, updates: Partial<CardPairsBlock["items"][number]>) => {
    const nextItems = items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...updates } : item));
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: nextItems } },
    });
  };

  const handleFileSelected = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const objectUrl = URL.createObjectURL(file);
    setCropSrc(objectUrl);
    setCropOpen(true);
  };

  const handleCropComplete = async (result: CropResult) => {
    if (selectedItemIndex === null) return;
    setIsUploading(true);
    try {
      const file = new File([result.blob], `card-pair-item-${selectedItemIndex + 1}.png`, { type: "image/png" });
      const uploadResult = await upload(file);
      updateItem(selectedItemIndex, { imageUrl: uploadResult.url });
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setIsUploading(false);
      if (cropSrc) URL.revokeObjectURL(cropSrc);
      URL.revokeObjectURL(result.url);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      handleFileSelected(file);
    }
  };

  const clearItems = () => {
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          items: items.map((item, itemIndex) => ({
            ...item,
            text: "",
            imageUrl: "",
            speakerIcon: null,
            ...(pairingMode === "same" && itemIndex % 2 === 1 ? { text: "" } : {}),
          })),
        },
      },
    });
  };

  const addPair = () => {
    const nextItems = [
      ...items,
      {
        id: `card-pair-item-${items.length + 1}`,
        text: "",
        imageUrl: "",
        speakerIcon: null,
      },
      {
        id: `card-pair-item-${items.length + 2}`,
        text: "",
        imageUrl: "",
        speakerIcon: null,
      },
    ];

    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: { items: nextItems },
      },
    });
  };

  const handleCsvImport = () => {
    setCsvError(null);
    const text = csvText.trim();
    if (!text) return;

    const parsed = text
      .split("|")
      .map((part) => part.trim())
      .filter((part) => part.length > 0);

    if (parsed.length === 0) {
      setCsvError(t("csvNoData"));
      return;
    }

    const existingItems = pairingMode === "same"
      ? items.filter((_, index) => index % 2 === 0).map((item) => item.text || "")
      : items
        .filter((item, index, arr) => {
          const isTrailingFiller =
            index === arr.length - 1 &&
            !item.text?.trim() &&
            !item.imageUrl;
          return !isTrailingFiller;
        })
        .map((item) => item.text || "");

    const nextTexts = csvMode === "append" ? [...existingItems, ...parsed] : parsed;

    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: { items: buildCardPairItems(nextTexts, pairingMode) },
      },
    });
    setCsvText("");
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">
          {t("title")}
        </Label>
        <Input
          value={block.title ?? ""}
          onChange={(e) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { title: e.target.value } },
            })
          }
          placeholder={t("title")}
        />
      </div>
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">
          {t("footer")}
        </Label>
        <Input
          value={block.footer ?? ""}
          onChange={(e) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { footer: e.target.value } },
            })
          }
          placeholder={t("footer")}
        />
      </div>
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">
          {t("pairingMode")}
        </Label>
        <Select
          value={pairingMode}
          onValueChange={(value) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { pairingMode: value as "same" | "different" } },
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="same">{t("pairingModeSame")}</SelectItem>
            <SelectItem value="different">{t("pairingModeDifferent")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2">
        <Label className="text-sm">{t("shufflePairs")}</Label>
        <Switch
          checked={block.shufflePairs ?? false}
          onCheckedChange={(checked) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { shufflePairs: checked } },
            })
          }
        />
      </div>
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("textSize")}</Label>
        <div className="flex gap-1">
          {(["s", "m", "l", "xl"] as const).map((size) => (
            <Button
              key={size}
              variant={(block.textSize ?? "m") === size ? "default" : "outline"}
              size="sm"
              className="flex-1 text-xs px-1 uppercase"
              onClick={() =>
                dispatch({
                  type: "UPDATE_BLOCK",
                  payload: { id: block.id, updates: { textSize: size } },
                })
              }
            >
              {size}
            </Button>
          ))}
        </div>
      </div>
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">
          Selected Item
        </Label>
        <Input
          readOnly
          value={rawSelectedItemIndex === null ? t("clickCardPairItem") : `Item ${rawSelectedItemIndex + 1}`}
        />
        {isLinkedBackSelection ? (
          <p className="mt-2 text-xs text-muted-foreground">{t("cardPairsLinkedBackHelp", { item: selectedItemIndex !== null ? selectedItemIndex + 1 : 1 })}</p>
        ) : null}
      </div>
      {selectedItemIndex !== null && selectedItem ? (
        <div className="space-y-3 rounded-md border border-slate-200 p-3 bg-white">
          {selectedItem.imageUrl ? (
            <div className="space-y-2">
              <div className="relative group/img rounded overflow-hidden border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selectedItem.imageUrl} alt={selectedDisplayText || "Card pair item"} className="w-full" />
                <button
                  type="button"
                  onClick={() => updateItem(selectedItemIndex, { imageUrl: "" })}
                  className="absolute top-1 right-1 opacity-0 group-hover/img:opacity-100 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-opacity"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
              <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setBrowserOpen(true)}>
                {t("replaceImage")}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <label
                className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors ${
                  isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/40"
                }`}
                onDrop={handleDrop}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
              >
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelected(file);
                  }}
                />
                {isUploading ? (
                  <span className="text-xs text-muted-foreground">{t("uploading")}</span>
                ) : (
                  <>
                    <Upload className="h-6 w-6 text-muted-foreground/50 mb-1" />
                    <span className="text-xs text-muted-foreground">{t("textImageDragOrClick")}</span>
                  </>
                )}
              </label>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => setBrowserOpen(true)}
              >
                <ImagePlus className="h-3.5 w-3.5 mr-1" />
                {t("mediaBrowser")}
              </Button>
            </div>
          )}

          <div>
            <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">
              Text
            </Label>
            <textarea
              value={selectedDisplayText}
              onChange={(e) => updateItem(selectedItemIndex, { text: e.target.value })}
              className="w-full min-h-[90px] rounded-md border border-input bg-background p-2 text-sm resize-y"
              placeholder="Item text"
            />
          </div>

          <MediaBrowserDialog
            open={browserOpen}
            onOpenChange={setBrowserOpen}
            onSelectUrl={(url) => {
              if (selectedItemIndex === null) return;
              updateItem(selectedItemIndex, { imageUrl: url });
            }}
            onSelectFile={handleFileSelected}
          />

          <ImageCropDialog
            imageSrc={cropSrc}
            open={cropOpen}
            onOpenChange={(open) => {
              setCropOpen(open);
              if (!open && cropSrc) {
                URL.revokeObjectURL(cropSrc);
                setCropSrc(null);
              }
            }}
            onCropComplete={handleCropComplete}
            title={t("cropImage")}
          />
        </div>
      ) : null}
      <Separator />
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("csvImport")}</Label>
        <p className="text-xs text-muted-foreground mb-2">
          {pairingMode === "same" ? t("cardPairsCsvImportHelpSame") : t("cardPairsCsvImportHelpDifferent")}
        </p>
        <textarea
          className="w-full min-h-[110px] rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
          placeholder={pairingMode === "same" ? t("cardPairsCsvPlaceholderSame") : t("cardPairsCsvPlaceholderDifferent")}
          value={csvText}
          onChange={(e) => {
            setCsvText(e.target.value);
            setCsvError(null);
          }}
        />
        {csvError && (
          <p className="text-xs text-destructive mt-1">{csvError}</p>
        )}
        <div className="mt-2 flex items-center gap-2">
          <Select
            value={csvMode}
            onValueChange={(v) => setCsvMode(v as "replace" | "append")}
          >
            <SelectTrigger className="h-8 w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="replace">{t("csvReplace")}</SelectItem>
              <SelectItem value="append">{t("csvAppend")}</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" className="h-8" onClick={handleCsvImport} disabled={!csvText.trim()}>
            {t("csvImportButton")}
          </Button>
        </div>
      </div>
      <Button type="button" variant="outline" onClick={addPair}>
        <Plus className="h-3.5 w-3.5 mr-1" /> {t("addPair")}
      </Button>
      <Button type="button" variant="outline" onClick={clearItems}>
        {t("clearCardPairs")}
      </Button>
    </div>
  );
}

function FlashcardsProps({ block }: { block: FlashcardsBlock }) {
  const { state, dispatch } = useEditor();
  const t = useTranslations("properties");
  const { upload } = useUpload();
  const [isUploading, setIsUploading] = React.useState(false);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [cropSrc, setCropSrc] = React.useState<string | null>(null);
  const [cropOpen, setCropOpen] = React.useState(false);
  const [browserOpen, setBrowserOpen] = React.useState(false);
  const [csvText, setCsvText] = React.useState("");
  const [csvError, setCsvError] = React.useState<string | null>(null);
  const [csvMode, setCsvMode] = React.useState<"replace" | "append">("replace");

  const items = block.items.length > 0 ? block.items : getDefaultFlashcardItems();
  const selectedItemIndex = state.activeItemIndex;
  const selectedItem = selectedItemIndex !== null ? items[selectedItemIndex] : null;
  const selectedDisplayText = selectedItem?.text ?? "";

  const buildFlashcardItems = (texts: string[]) => {
    const normalizedTexts = [...texts];
    if (normalizedTexts.length % 2 !== 0) {
      normalizedTexts.push("");
    }

    return normalizedTexts.map((text, index) => ({
      id: `flashcard-item-${index + 1}`,
      text,
      imageUrl: "",
      speakerIcon: null,
    }));
  };

  const updateItem = (index: number, updates: Partial<FlashcardsBlock["items"][number]>) => {
    const nextItems = items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...updates } : item));
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: nextItems } },
    });
  };

  const handleFileSelected = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const objectUrl = URL.createObjectURL(file);
    setCropSrc(objectUrl);
    setCropOpen(true);
  };

  const handleCropComplete = async (result: CropResult) => {
    if (selectedItemIndex === null) return;
    setIsUploading(true);
    try {
      const file = new File([result.blob], `flashcard-item-${selectedItemIndex + 1}.png`, { type: "image/png" });
      const uploadResult = await upload(file);
      updateItem(selectedItemIndex, { imageUrl: uploadResult.url });
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setIsUploading(false);
      if (cropSrc) URL.revokeObjectURL(cropSrc);
      URL.revokeObjectURL(result.url);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      handleFileSelected(file);
    }
  };

  const clearItems = () => {
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          items: items.map((item) => ({
            ...item,
            text: "",
            imageUrl: "",
            speakerIcon: null,
          })),
        },
      },
    });
  };

  const addPair = () => {
    const nextItems = [
      ...items,
      {
        id: `flashcard-item-${items.length + 1}`,
        text: "",
        imageUrl: "",
        speakerIcon: null,
      },
      {
        id: `flashcard-item-${items.length + 2}`,
        text: "",
        imageUrl: "",
        speakerIcon: null,
      },
    ];

    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: { items: nextItems },
      },
    });
  };

  const handleCsvImport = () => {
    setCsvError(null);
    const text = csvText.trim();
    if (!text) return;

    const parsed = text
      .split("|")
      .map((part) => part.trim())
      .filter((part) => part.length > 0);

    if (parsed.length === 0) {
      setCsvError(t("csvNoData"));
      return;
    }

    const existingItems = items
      .filter((item, index, arr) => {
        const isTrailingFiller =
          index === arr.length - 1 &&
          !item.text?.trim() &&
          !item.imageUrl;
        return !isTrailingFiller;
      })
      .map((item) => item.text || "");

    const nextTexts = csvMode === "append" ? [...existingItems, ...parsed] : parsed;

    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: { items: buildFlashcardItems(nextTexts) },
      },
    });
    setCsvText("");
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">
          {t("title")}
        </Label>
        <Input
          value={block.title ?? ""}
          onChange={(e) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { title: e.target.value } },
            })
          }
          placeholder={t("title")}
        />
      </div>
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">
          {t("footer")}
        </Label>
        <Input
          value={block.footer ?? ""}
          onChange={(e) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { footer: e.target.value } },
            })
          }
          placeholder={t("footer")}
        />
      </div>
      <div className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2">
        <Label className="text-sm">{t("shufflePairs")}</Label>
        <Switch
          checked={block.shufflePairs ?? false}
          onCheckedChange={(checked) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { shufflePairs: checked } },
            })
          }
        />
      </div>
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("textSize")}</Label>
        <div className="flex gap-1">
          {(["s", "m", "l", "xl"] as const).map((size) => (
            <Button
              key={size}
              variant={(block.textSize ?? "m") === size ? "default" : "outline"}
              size="sm"
              className="flex-1 text-xs px-1 uppercase"
              onClick={() =>
                dispatch({
                  type: "UPDATE_BLOCK",
                  payload: { id: block.id, updates: { textSize: size } },
                })
              }
            >
              {size}
            </Button>
          ))}
        </div>
      </div>
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">
          Selected Item
        </Label>
        <Input
          readOnly
          value={selectedItemIndex === null ? "Click an item in the flashcards" : `Item ${selectedItemIndex + 1}`}
        />
      </div>
      {selectedItemIndex !== null && selectedItem ? (
        <div className="space-y-3 rounded-md border border-slate-200 p-3 bg-white">
          {selectedItem.imageUrl ? (
            <div className="space-y-2">
              <div className="relative group/img rounded overflow-hidden border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selectedItem.imageUrl} alt={selectedDisplayText || "Flashcard item"} className="w-full" />
                <button
                  type="button"
                  onClick={() => updateItem(selectedItemIndex, { imageUrl: "" })}
                  className="absolute top-1 right-1 opacity-0 group-hover/img:opacity-100 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-opacity"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
              <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setBrowserOpen(true)}>
                {t("replaceImage")}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <label
                className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors ${
                  isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/40"
                }`}
                onDrop={handleDrop}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
              >
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelected(file);
                  }}
                />
                {isUploading ? (
                  <span className="text-xs text-muted-foreground">{t("uploading")}</span>
                ) : (
                  <>
                    <Upload className="h-6 w-6 text-muted-foreground/50 mb-1" />
                    <span className="text-xs text-muted-foreground">{t("textImageDragOrClick")}</span>
                  </>
                )}
              </label>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => setBrowserOpen(true)}
              >
                <ImagePlus className="h-3.5 w-3.5 mr-1" />
                {t("mediaBrowser")}
              </Button>
            </div>
          )}

          <div>
            <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">
              Text
            </Label>
            <textarea
              value={selectedDisplayText}
              onChange={(e) => updateItem(selectedItemIndex, { text: e.target.value })}
              className="w-full min-h-[90px] rounded-md border border-input bg-background p-2 text-sm resize-y"
              placeholder="Item text"
            />
          </div>

          <MediaBrowserDialog
            open={browserOpen}
            onOpenChange={setBrowserOpen}
            onSelectUrl={(url) => {
              if (selectedItemIndex === null) return;
              updateItem(selectedItemIndex, { imageUrl: url });
            }}
            onSelectFile={handleFileSelected}
          />

          <ImageCropDialog
            imageSrc={cropSrc}
            open={cropOpen}
            onOpenChange={(open) => {
              setCropOpen(open);
              if (!open && cropSrc) {
                URL.revokeObjectURL(cropSrc);
                setCropSrc(null);
              }
            }}
            onCropComplete={handleCropComplete}
            title={t("cropImage")}
          />
        </div>
      ) : null}
      <Separator />
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("csvImport")}</Label>
        <p className="text-xs text-muted-foreground mb-2">
          {t("flashcardsCsvImportHelp")}
        </p>
        <textarea
          className="w-full min-h-[110px] rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
          placeholder={t("flashcardsCsvPlaceholder")}
          value={csvText}
          onChange={(e) => {
            setCsvText(e.target.value);
            setCsvError(null);
          }}
        />
        {csvError && (
          <p className="text-xs text-destructive mt-1">{csvError}</p>
        )}
        <div className="mt-2 flex items-center gap-2">
          <Select
            value={csvMode}
            onValueChange={(v) => setCsvMode(v as "replace" | "append")}
          >
            <SelectTrigger className="h-8 w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="replace">{t("csvReplace")}</SelectItem>
              <SelectItem value="append">{t("csvAppend")}</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" className="h-8" onClick={handleCsvImport} disabled={!csvText.trim()}>
            {t("csvImportButton")}
          </Button>
        </div>
      </div>
      <Button type="button" variant="outline" onClick={addPair}>
        <Plus className="h-3.5 w-3.5 mr-1" /> {t("addPair")}
      </Button>
      <Button type="button" variant="outline" onClick={clearItems}>
        Clear flashcards
      </Button>
    </div>
  );
}

function SyllableCardsProps({ block }: { block: SyllableCardsBlock }) {
  const { state, dispatch } = useEditor();
  const t = useTranslations("properties");
  const { upload } = useUpload();
  const [isUploading, setIsUploading] = React.useState(false);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [cropSrc, setCropSrc] = React.useState<string | null>(null);
  const [cropOpen, setCropOpen] = React.useState(false);
  const [browserOpen, setBrowserOpen] = React.useState(false);
  const [csvText, setCsvText] = React.useState("");
  const [csvError, setCsvError] = React.useState<string | null>(null);
  const [csvMode, setCsvMode] = React.useState<"replace" | "append">("replace");

  const items = block.items.length > 0 ? block.items : getDefaultFlashcardItems();
  const selectedItemIndex = state.activeItemIndex;
  const selectedItem = selectedItemIndex !== null ? items[selectedItemIndex] : null;
  const selectedDisplayText = selectedItem?.text ?? "";

  const buildItems = (texts: string[]) => {
    return texts.map((text, index) => ({
      id: `syllable-card-item-${index + 1}`,
      text,
      imageUrl: "",
      speakerIcon: null,
    }));
  };

  const updateItem = (index: number, updates: Partial<SyllableCardsBlock["items"][number]>) => {
    const nextItems = items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...updates } : item));
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: nextItems } },
    });
  };

  const handleFileSelected = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const objectUrl = URL.createObjectURL(file);
    setCropSrc(objectUrl);
    setCropOpen(true);
  };

  const handleCropComplete = async (result: CropResult) => {
    if (selectedItemIndex === null) return;
    setIsUploading(true);
    try {
      const file = new File([result.blob], `syllable-card-item-${selectedItemIndex + 1}.png`, { type: "image/png" });
      const uploadResult = await upload(file);
      updateItem(selectedItemIndex, { imageUrl: uploadResult.url });
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setIsUploading(false);
      if (cropSrc) URL.revokeObjectURL(cropSrc);
      URL.revokeObjectURL(result.url);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      handleFileSelected(file);
    }
  };

  const clearItems = () => {
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          items: items.map((item) => ({
            ...item,
            text: "",
            imageUrl: "",
            speakerIcon: null,
          })),
        },
      },
    });
  };

  const addCard = () => {
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          items: [
            ...items,
            {
              id: `syllable-card-item-${items.length + 1}`,
              text: "",
              imageUrl: "",
              speakerIcon: null,
            },
          ],
        },
      },
    });
  };

  const handleCsvImport = () => {
    setCsvError(null);
    const text = csvText.trim();
    if (!text) return;

    const parsed = text
      .split("|")
      .map((part) => part.trim())
      .filter((part) => part.length > 0);

    if (parsed.length === 0) {
      setCsvError(t("csvNoData"));
      return;
    }

    const existingItems = items.map((item) => item.text || "");
    const nextTexts = csvMode === "append" ? [...existingItems, ...parsed] : parsed;

    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: { items: buildItems(nextTexts) },
      },
    });
    setCsvText("");
  };

  const syllabifySelectedItem = () => {
    if (selectedItemIndex === null) return;
    updateItem(selectedItemIndex, { text: syllabifyGermanText(selectedDisplayText) });
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">
          {t("title")}
        </Label>
        <Input
          value={block.title ?? ""}
          onChange={(e) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { title: e.target.value } },
            })
          }
          placeholder={t("title")}
        />
      </div>
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">
          {t("footer")}
        </Label>
        <Input
          value={block.footer ?? ""}
          onChange={(e) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { footer: e.target.value } },
            })
          }
          placeholder={t("footer")}
        />
      </div>
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("textSize")}</Label>
        <div className="flex gap-1">
          {(["s", "m", "l", "xl"] as const).map((size) => (
            <Button
              key={size}
              variant={(block.textSize ?? "xl") === size ? "default" : "outline"}
              size="sm"
              className="flex-1 text-xs px-1 uppercase"
              onClick={() =>
                dispatch({
                  type: "UPDATE_BLOCK",
                  payload: { id: block.id, updates: { textSize: size } },
                })
              }
            >
              {size}
            </Button>
          ))}
        </div>
      </div>
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">
          {t("selectedItem")}
        </Label>
        <Input readOnly value={selectedItemIndex === null ? t("clickCardToEdit") : `Item ${selectedItemIndex + 1}`} />
      </div>
      {selectedItemIndex !== null && selectedItem ? (
        <div className="space-y-3 rounded-md border border-slate-200 p-3 bg-white">
          {selectedItem.imageUrl ? (
            <div className="space-y-2">
              <div className="relative group/img rounded overflow-hidden border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selectedItem.imageUrl} alt={selectedDisplayText || "Syllable card item"} className="w-full" />
                <button
                  type="button"
                  onClick={() => updateItem(selectedItemIndex, { imageUrl: "" })}
                  className="absolute top-1 right-1 opacity-0 group-hover/img:opacity-100 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-opacity"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
              <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setBrowserOpen(true)}>
                {t("replaceImage")}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <label
                className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors ${
                  isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/40"
                }`}
                onDrop={handleDrop}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
              >
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelected(file);
                  }}
                />
                {isUploading ? (
                  <span className="text-xs text-muted-foreground">{t("uploading")}</span>
                ) : (
                  <>
                    <Upload className="h-6 w-6 text-muted-foreground/50 mb-1" />
                    <span className="text-xs text-muted-foreground">{t("textImageDragOrClick")}</span>
                  </>
                )}
              </label>
              <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setBrowserOpen(true)}>
                <ImagePlus className="h-3.5 w-3.5 mr-1" />
                {t("mediaBrowser")}
              </Button>
            </div>
          )}

          <div>
            <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">
              {t("cardText")}
            </Label>
            <textarea
              value={selectedDisplayText}
              onChange={(e) => updateItem(selectedItemIndex, { text: e.target.value })}
              className="w-full min-h-[90px] rounded-md border border-input bg-background p-2 text-sm resize-y"
              placeholder={t("syllablesPlaceholder")}
            />
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2"
              onClick={syllabifySelectedItem}
              disabled={!stripSyllableMarkers(selectedDisplayText).trim()}
            >
              <Scissors className="h-4 w-4 mr-2" />
              {t("syllabify")}
            </Button>
          </div>

          <MediaBrowserDialog
            open={browserOpen}
            onOpenChange={setBrowserOpen}
            onSelectUrl={(url) => {
              if (selectedItemIndex === null) return;
              updateItem(selectedItemIndex, { imageUrl: url });
            }}
            onSelectFile={handleFileSelected}
          />

          <ImageCropDialog
            imageSrc={cropSrc}
            open={cropOpen}
            onOpenChange={(open) => {
              setCropOpen(open);
              if (!open && cropSrc) {
                URL.revokeObjectURL(cropSrc);
                setCropSrc(null);
              }
            }}
            onCropComplete={handleCropComplete}
            title={t("cropImage")}
          />
        </div>
      ) : null}
      <Separator />
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("csvImport")}</Label>
        <p className="text-xs text-muted-foreground mb-1">{t("syllableCardsCsvHelp")}</p>
        <textarea
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[96px] resize-y"
          placeholder={t("syllableCardsCsvPlaceholder")}
          value={csvText}
          onChange={(e) => {
            setCsvText(e.target.value);
            setCsvError(null);
          }}
        />
        {csvError && <p className="text-xs text-destructive mt-1">{csvError}</p>}
        <div className="flex gap-1 mt-1">
          <Select value={csvMode} onValueChange={(value) => setCsvMode(value as "replace" | "append")}>
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="replace">{t("csvReplace")}</SelectItem>
              <SelectItem value="append">{t("csvAppend")}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="flex-1" onClick={handleCsvImport} disabled={!csvText.trim()}>
            <Upload className="h-4 w-4 mr-2" />
            {t("csvImportButton")}
          </Button>
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={addCard}>
          <Plus className="h-4 w-4 mr-2" />
          {t("addCard")}
        </Button>
        <Button variant="outline" size="sm" className="flex-1" onClick={clearItems}>
          <Trash2 className="h-4 w-4 mr-2" />
          {t("clear")}
        </Button>
      </div>
    </div>
  );
}

function AufgabenkartenProps({ block }: { block: AufgabenkartenBlock }) {
  const { state, dispatch } = useEditor();
  const t = useTranslations("properties");
  const { upload } = useUpload();
  const [isUploading, setIsUploading] = React.useState(false);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [cropSrc, setCropSrc] = React.useState<string | null>(null);
  const [cropOpen, setCropOpen] = React.useState(false);
  const [browserOpen, setBrowserOpen] = React.useState(false);
  const [csvText, setCsvText] = React.useState("");
  const [csvError, setCsvError] = React.useState<string | null>(null);
  const [jsonText, setJsonText] = React.useState("");
  const [jsonError, setJsonError] = React.useState<string | null>(null);
  const [csvMode, setCsvMode] = React.useState<"replace" | "append">("replace");

  const normalizeChunks = (chunks: unknown): string[] => {
    if (Array.isArray(chunks)) {
      return chunks.map((chunk) => (typeof chunk === "string" ? chunk.trim() : "")).filter((chunk) => chunk.length > 0);
    }
    if (typeof chunks === "string") {
      return chunks.split("|").map((chunk) => chunk.trim()).filter((chunk) => chunk.length > 0);
    }
    return [];
  };

  const normalizeItem = (item: Partial<AufgabenkartenBlock["items"][number]>, index: number) => {
    const title = typeof item.title === "string" ? item.title : "";
    const task = typeof item.task === "string"
      ? item.task
      : (typeof item.text === "string" ? item.text : "");
    const chunks = normalizeChunks(item.chunks);

    return {
      id: item.id || `aufgabenkarten-item-${index + 1}`,
      title,
      task,
      chunks,
      text: task,
      imageUrl: item.imageUrl || "",
      speakerIcon: item.speakerIcon ?? null,
    };
  };

  const defaultItems = React.useMemo(
    () => Array.from({ length: 6 }, (_, index) => ({
      id: `aufgabenkarten-item-${index + 1}`,
      title: "",
      task: "",
      chunks: [],
      text: "",
      imageUrl: "",
      speakerIcon: null,
    })),
    [],
  );
  const items = block.items.length > 0 ? block.items.map((item, index) => normalizeItem(item, index)) : defaultItems;
  const selectedItemIndex = state.activeItemIndex;
  const selectedItem = selectedItemIndex !== null ? items[selectedItemIndex] : null;

  const buildItems = (cards: Array<{ title?: string; task?: string; chunks?: string[] }>) => {
    return cards.map((card, index) => normalizeItem({
      id: `aufgabenkarten-item-${index + 1}`,
      title: card.title || "",
      task: card.task || "",
      chunks: card.chunks || [],
      text: card.task || "",
      imageUrl: "",
      speakerIcon: null,
    }, index));
  };

  const updateItem = (index: number, updates: Partial<AufgabenkartenBlock["items"][number]>) => {
    const nextItems = items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...updates } : item));
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: nextItems } },
    });
  };

  const handleFileSelected = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const objectUrl = URL.createObjectURL(file);
    setCropSrc(objectUrl);
    setCropOpen(true);
  };

  const handleCropComplete = async (result: CropResult) => {
    if (selectedItemIndex === null) return;
    setIsUploading(true);
    try {
      const file = new File([result.blob], `aufgabenkarten-item-${selectedItemIndex + 1}.png`, { type: "image/png" });
      const uploadResult = await upload(file);
      updateItem(selectedItemIndex, { imageUrl: uploadResult.url });
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setIsUploading(false);
      if (cropSrc) URL.revokeObjectURL(cropSrc);
      URL.revokeObjectURL(result.url);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      handleFileSelected(file);
    }
  };

  const clearItems = () => {
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          items: items.map((item) => ({
            ...item,
            title: "",
            task: "",
            chunks: [],
            text: "",
            imageUrl: "",
            speakerIcon: null,
          })),
        },
      },
    });
  };

  const addCard = () => {
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          items: [
            ...items,
            {
              id: `aufgabenkarten-item-${items.length + 1}`,
              title: "",
              task: "",
              chunks: [],
              text: "",
              imageUrl: "",
              speakerIcon: null,
            },
          ],
        },
      },
    });
  };

  const splitCsvRows = (input: string) => {
    const rows: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < input.length; i += 1) {
      const char = input[i];
      const next = input[i + 1];

      if (char === '"') {
        if (inQuotes && next === '"') {
          current += '""';
          i += 1;
        } else {
          inQuotes = !inQuotes;
          current += char;
        }
        continue;
      }

      if ((char === "\n" || char === "\r") && !inQuotes) {
        const normalized = current.trim();
        if (normalized) rows.push(normalized);
        current = "";

        if (char === "\r" && next === "\n") {
          i += 1;
        }
        continue;
      }

      current += char;
    }

    const last = current.trim();
    if (last) rows.push(last);
    return rows;
  };

  const parseDelimitedRow = (line: string, delimiter: string) => {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      const next = line[i + 1];

      if (char === '"') {
        if (inQuotes && next === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (char === delimiter && !inQuotes) {
        values.push(current.trim());
        current = "";
        continue;
      }

      current += char;
    }

    values.push(current.trim());
    return values;
  };

  const detectDelimiter = (line: string) => {
    const candidates = [";", "\t", ","];
    let best = ";";
    let bestCount = -1;

    for (const candidate of candidates) {
      const count = parseDelimitedRow(line, candidate).length;
      if (count > bestCount) {
        best = candidate;
        bestCount = count;
      }
    }

    return best;
  };

  const handleCsvImport = () => {
    setCsvError(null);
    setJsonError(null);
    const text = csvText.trim();
    if (!text) return;

    const rows = splitCsvRows(text);
    if (rows.length === 0) {
      setCsvError(t("csvNoData"));
      return;
    }

    const delimiter = detectDelimiter(rows[0]);
    const parsedCards = rows
      .map((row) => parseDelimitedRow(row, delimiter).map((part) => part.trim()))
      .map((columns) => {
        if (columns.length >= 3) {
          return {
            title: columns[0],
            task: columns[1],
            chunks: columns.slice(2).join(delimiter).split("|").map((chunk) => chunk.trim()).filter((chunk) => chunk.length > 0),
          };
        }
        if (columns.length === 2) {
          return {
            title: columns[0],
            task: columns[1],
            chunks: [] as string[],
          };
        }
        return {
          title: "",
          task: columns[0] || "",
          chunks: [] as string[],
        };
      })
      .filter((card) => card.title || card.task || card.chunks.length > 0);

    if (parsedCards.length === 0) {
      setCsvError(t("csvNoData"));
      return;
    }

    const existingCards = items.map((item) => ({
      title: item.title || "",
      task: item.task || item.text || "",
      chunks: normalizeChunks(item.chunks),
    }));
    const nextCards = csvMode === "append" ? [...existingCards, ...parsedCards] : parsedCards;

    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: { items: buildItems(nextCards) },
      },
    });
    setCsvText("");
  };

  const handleJsonImport = () => {
    setCsvError(null);
    setJsonError(null);
    const text = jsonText.trim();
    if (!text) return;

    try {
      const parsed = JSON.parse(text) as unknown;
      const source = Array.isArray(parsed)
        ? parsed
        : (parsed && typeof parsed === "object" && Array.isArray((parsed as { items?: unknown[] }).items)
          ? (parsed as { items: unknown[] }).items
          : null);

      if (!source) {
        setJsonError(t("jsonImportInvalid"));
        return;
      }

      const parsedCards = source
        .map((entry, index) => {
          if (!entry || typeof entry !== "object") return null;
          const card = entry as { title?: unknown; task?: unknown; text?: unknown; chunks?: unknown };
          return {
            title: typeof card.title === "string" ? card.title : "",
            task: typeof card.task === "string" ? card.task : (typeof card.text === "string" ? card.text : ""),
            chunks: normalizeChunks(card.chunks),
            order: index,
          };
        })
        .filter((card): card is { title: string; task: string; chunks: string[]; order: number } => Boolean(card))
        .sort((a, b) => a.order - b.order)
        .map(({ title, task, chunks }) => ({ title, task, chunks }))
        .filter((card) => card.title || card.task || card.chunks.length > 0);

      if (parsedCards.length === 0) {
        setJsonError(t("csvNoData"));
        return;
      }

      const existingCards = items.map((item) => ({
        title: item.title || "",
        task: item.task || item.text || "",
        chunks: normalizeChunks(item.chunks),
      }));
      const nextCards = csvMode === "append" ? [...existingCards, ...parsedCards] : parsedCards;

      dispatch({
        type: "UPDATE_BLOCK",
        payload: {
          id: block.id,
          updates: { items: buildItems(nextCards) },
        },
      });
      setJsonText("");
    } catch {
      setJsonError(t("jsonImportInvalid"));
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">
          {t("title")}
        </Label>
        <Input
          value={block.title ?? ""}
          onChange={(e) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { title: e.target.value } },
            })
          }
          placeholder={t("title")}
        />
      </div>
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">
          {t("aufgabenkartenSubtitle")}
        </Label>
        <Input
          value={block.subtitle ?? ""}
          onChange={(e) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { subtitle: e.target.value } },
            })
          }
          placeholder={t("aufgabenkartenSubtitlePlaceholder")}
        />
      </div>
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("textSize")}</Label>
        <div className="flex gap-1">
          {(["s", "m", "l", "xl"] as const).map((size) => (
            <Button
              key={size}
              variant={(block.textSize ?? "m") === size ? "default" : "outline"}
              size="sm"
              className="flex-1 text-xs px-1 uppercase"
              onClick={() =>
                dispatch({
                  type: "UPDATE_BLOCK",
                  payload: { id: block.id, updates: { textSize: size } },
                })
              }
            >
              {size}
            </Button>
          ))}
        </div>
      </div>
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("textAlignment")}</Label>
        <div className="grid grid-cols-3 gap-1">
          {([
            { value: "left", label: t("alignLeft"), icon: AlignLeft },
            { value: "center", label: t("alignCenter"), icon: AlignCenter },
            { value: "right", label: t("alignRight"), icon: AlignRight },
          ] as const).map(({ value, label, icon: Icon }) => (
            <Button
              key={value}
              variant={(block.textAlign ?? "left") === value ? "default" : "outline"}
              size="sm"
              className="h-8 min-w-0 px-1"
              title={label}
              aria-label={label}
              onClick={() =>
                dispatch({
                  type: "UPDATE_BLOCK",
                  payload: { id: block.id, updates: { textAlign: value } },
                })
              }
            >
              <Icon className="h-4 w-4" />
            </Button>
          ))}
        </div>
      </div>
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("textVerticalAlignment")}</Label>
        <div className="grid grid-cols-3 gap-1">
          {([
            { value: "top", label: t("top"), icon: AlignVerticalJustifyStart },
            { value: "center", label: t("verticalCenter"), icon: AlignVerticalJustifyCenter },
            { value: "bottom", label: t("bottom"), icon: AlignVerticalJustifyEnd },
          ] as const).map(({ value, label, icon: Icon }) => (
            <Button
              key={value}
              variant={(block.textVerticalAlign ?? "top") === value ? "default" : "outline"}
              size="sm"
              className="h-8 min-w-0 px-1"
              title={label}
              aria-label={label}
              onClick={() =>
                dispatch({
                  type: "UPDATE_BLOCK",
                  payload: { id: block.id, updates: { textVerticalAlign: value } },
                })
              }
            >
              <Icon className="h-4 w-4" />
            </Button>
          ))}
        </div>
      </div>
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">
          {t("selectedItem")}
        </Label>
        <Input readOnly value={selectedItemIndex === null ? t("clickCardToEdit") : `Item ${selectedItemIndex + 1}`} />
      </div>
      {selectedItemIndex !== null && selectedItem ? (
        <div className="space-y-3 rounded-md border border-slate-200 p-3 bg-white">
          {selectedItem.imageUrl ? (
            <div className="space-y-2">
              <div className="relative group/img rounded overflow-hidden border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selectedItem.imageUrl} alt={selectedItem.task || selectedItem.title || "Aufgabenkarten item"} className="w-full" />
                <button
                  type="button"
                  onClick={() => updateItem(selectedItemIndex, { imageUrl: "" })}
                  className="absolute top-1 right-1 opacity-0 group-hover/img:opacity-100 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-opacity"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
              <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setBrowserOpen(true)}>
                {t("replaceImage")}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <label
                className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors ${
                  isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/40"
                }`}
                onDrop={handleDrop}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
              >
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelected(file);
                  }}
                />
                {isUploading ? (
                  <span className="text-xs text-muted-foreground">{t("uploading")}</span>
                ) : (
                  <>
                    <Upload className="h-6 w-6 text-muted-foreground/50 mb-1" />
                    <span className="text-xs text-muted-foreground">{t("textImageDragOrClick")}</span>
                  </>
                )}
              </label>
              <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setBrowserOpen(true)}>
                <ImagePlus className="h-3.5 w-3.5 mr-1" />
                {t("mediaBrowser")}
              </Button>
            </div>
          )}

          <div>
            <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">
              {t("aufgabenkartenCardTitle")}
            </Label>
            <Input
              value={selectedItem.title ?? ""}
              onChange={(e) => updateItem(selectedItemIndex, { title: e.target.value })}
              placeholder={t("aufgabenkartenCardTitlePlaceholder")}
            />
          </div>
          <div>
            <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">
              {t("aufgabenkartenCardTask")}
            </Label>
            <textarea
              value={selectedItem.task ?? selectedItem.text ?? ""}
              onChange={(e) => updateItem(selectedItemIndex, { task: e.target.value, text: e.target.value })}
              className="w-full min-h-[90px] rounded-md border border-input bg-background p-2 text-sm resize-y"
              placeholder={t("aufgabenkartenCardTaskPlaceholder")}
            />
          </div>
          <div>
            <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">
              {t("aufgabenkartenCardChunks")}
            </Label>
            <textarea
              value={(selectedItem.chunks ?? []).join("\n")}
              onChange={(e) => updateItem(selectedItemIndex, {
                chunks: e.target.value
                  .split(/\r?\n/)
                  .map((chunk) => chunk.trim())
                  .filter((chunk) => chunk.length > 0),
              })}
              className="w-full min-h-[90px] rounded-md border border-input bg-background p-2 text-sm resize-y"
              placeholder={t("aufgabenkartenCardChunksPlaceholder")}
            />
          </div>

          <MediaBrowserDialog
            open={browserOpen}
            onOpenChange={setBrowserOpen}
            onSelectUrl={(url) => {
              if (selectedItemIndex === null) return;
              updateItem(selectedItemIndex, { imageUrl: url });
            }}
            onSelectFile={handleFileSelected}
          />

          <ImageCropDialog
            imageSrc={cropSrc}
            open={cropOpen}
            onOpenChange={(open) => {
              setCropOpen(open);
              if (!open && cropSrc) {
                URL.revokeObjectURL(cropSrc);
                setCropSrc(null);
              }
            }}
            onCropComplete={handleCropComplete}
            title={t("cropImage")}
          />
        </div>
      ) : null}
      <Separator />
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("csvImport")}</Label>
        <p className="text-xs text-muted-foreground mb-2">{t("aufgabenkartenCsvImportHelp")}</p>
        <textarea
          className="w-full min-h-[110px] rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
          placeholder={t("aufgabenkartenCsvPlaceholder")}
          value={csvText}
          onChange={(e) => {
            setCsvText(e.target.value);
            setCsvError(null);
          }}
        />
        {csvError && <p className="text-xs text-destructive mt-1">{csvError}</p>}
        <div className="mt-2 flex items-center gap-2">
          <Select value={csvMode} onValueChange={(v) => setCsvMode(v as "replace" | "append")}>
            <SelectTrigger className="h-8 w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="replace">{t("csvReplace")}</SelectItem>
              <SelectItem value="append">{t("csvAppend")}</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" className="h-8" onClick={handleCsvImport} disabled={!csvText.trim()}>
            {t("csvImportButton")}
          </Button>
        </div>
      </div>
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("jsonImport")}</Label>
        <p className="text-xs text-muted-foreground mb-2">{t("aufgabenkartenJsonImportHelp")}</p>
        <textarea
          className="w-full min-h-[110px] rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
          placeholder={t("aufgabenkartenJsonPlaceholder")}
          value={jsonText}
          onChange={(e) => {
            setJsonText(e.target.value);
            setJsonError(null);
          }}
        />
        {jsonError && <p className="text-xs text-destructive mt-1">{jsonError}</p>}
        <div className="mt-2 flex items-center gap-2">
          <Select value={csvMode} onValueChange={(v) => setCsvMode(v as "replace" | "append")}>
            <SelectTrigger className="h-8 w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="replace">{t("csvReplace")}</SelectItem>
              <SelectItem value="append">{t("csvAppend")}</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" className="h-8" onClick={handleJsonImport} disabled={!jsonText.trim()}>
            {t("csvImportButton")}
          </Button>
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={addCard}>
          <Plus className="h-4 w-4 mr-2" />
          {t("addCard")}
        </Button>
        <Button variant="outline" size="sm" className="flex-1" onClick={clearItems}>
          <Trash2 className="h-4 w-4 mr-2" />
          {t("clear")}
        </Button>
      </div>
    </div>
  );
}

function TextProps({ block }: { block: TextBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");
  const tc = useTranslations("common");
  const { upload } = useUpload();
  const [showAiModal, setShowAiModal] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [cropSrc, setCropSrc] = React.useState<string | null>(null);
  const [cropOpen, setCropOpen] = React.useState(false);

  const handleFileSelected = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const objectUrl = URL.createObjectURL(file);
    setCropSrc(objectUrl);
    setCropOpen(true);
  };

  const handleCropComplete = async (result: CropResult) => {
    setIsUploading(true);
    try {
      const file = new File([result.blob], "text-image.png", { type: "image/png" });
      const uploadResult = await upload(file);
      dispatch({
        type: "UPDATE_BLOCK",
        payload: { id: block.id, updates: { imageSrc: uploadResult.url } },
      });
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setIsUploading(false);
      if (cropSrc) URL.revokeObjectURL(cropSrc);
      URL.revokeObjectURL(result.url);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      handleFileSelected(file);
    }
  };

  const renderSwitchRow = (
    label: string,
    checked: boolean,
    onCheckedChange: (checked: boolean) => void,
    options?: { withTopDivider?: boolean }
  ) => (
    <>
      {options?.withTopDivider ? <Separator /> : null}
      <div className="flex h-8 items-center justify-between border-b border-border">
        <Label className="text-sm">{label}</Label>
        <Switch checked={checked} onCheckedChange={onCheckedChange} />
      </div>
    </>
  );

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("content")}</Label>
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 text-pink-700 border-pink-200 hover:bg-pink-50 hover:text-pink-800"
          onClick={() => setShowAiModal(true)}
        >
          <Sparkles className="h-3.5 w-3.5" />
          {t("aiGenerateText")}
        </Button>
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("textStyle")}</Label>
        <Select
          value={block.textStyle || "standard"}
          onValueChange={(value) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { textStyle: value as TextBlockStyle } },
            })
          }
        >
          <SelectTrigger size="sm" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="standard">{t("textStyleStandard")}</SelectItem>
            <SelectItem value="example">{t("textStyleExample")}</SelectItem>
            <SelectItem value="example-standard">{t("textStyleExampleStandard")}</SelectItem>
            <SelectItem value="example-improved">{t("textStyleExampleImproved")}</SelectItem>
            <SelectItem value="example-primary">{t("textStyleExamplePrimary")}</SelectItem>
            <SelectItem value="example-secondary">{t("textStyleExampleSecondary")}</SelectItem>
            <SelectItem value="frame">{t("textStyleFrame")}</SelectItem>
            <SelectItem value="frame-primary">{t("textStyleFramePrimary")}</SelectItem>
            <SelectItem value="frame-secondary">{t("textStyleFrameSecondary")}</SelectItem>
            <SelectItem value="fragen">{t("textStyleFragen")}</SelectItem>
            <SelectItem value="hinweis">{t("textStyleHinweis")}</SelectItem>
            <SelectItem value="hinweis-wichtig">{t("textStyleHinweisWichtig")}</SelectItem>
            <SelectItem value="hinweis-alarm">{t("textStyleHinweisAlarm")}</SelectItem>
            <SelectItem value="lernziel">{t("textStyleLernziel")}</SelectItem>
            <SelectItem value="kompetenzziele">{t("textStyleKompetenzziele")}</SelectItem>
            <SelectItem value="handlungsziele">{t("textStyleHandlungsziele")}</SelectItem>
            <SelectItem value="redemittel">{t("textStyleRedemittel")}</SelectItem>
            <SelectItem value="literatur">{t("textStyleLiteratur")}</SelectItem>
            <SelectItem value="metadaten">{t("textStyleMetadaten")}</SelectItem>
            <SelectItem value="rows">{t("textStyleRows")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {(block.textStyle === "example" || block.textStyle === "example-standard" || block.textStyle === "example-improved") && (
        <>
          <div>
            <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("textComment")}</Label>
            <textarea
              value={block.comment || ""}
              onChange={(e) =>
                dispatch({
                  type: "UPDATE_BLOCK",
                  payload: { id: block.id, updates: { comment: e.target.value } },
                })
              }
              placeholder={t("textCommentPlaceholder")}
              className="w-full min-h-[60px] rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y"
              rows={3}
            />
          </div>
        </>
      )}
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("settings")}</Label>
        <div>
          {renderSwitchRow(
            t("bilingual"),
            block.bilingual ?? false,
            (checked) =>
              dispatch({
                type: "UPDATE_BLOCK",
                payload: { id: block.id, updates: { bilingual: checked } },
              }),
            { withTopDivider: true }
          )}
          {renderSwitchRow(t("skipTranslation"), block.skipTranslation ?? false, (checked) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { skipTranslation: checked } },
            })
          )}
          {block.bilingual && (
            <>
              {renderSwitchRow(t("bilingualDivider"), block.bilingualDivider ?? false, (checked) =>
                dispatch({
                  type: "UPDATE_BLOCK",
                  payload: { id: block.id, updates: { bilingualDivider: checked } },
                })
              )}
            </>
          )}
          {renderSwitchRow(t("tightTop"), block.tightTop ?? false, (checked) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { tightTop: checked } },
            })
          )}
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("image")}</Label>
        {block.imageSrc ? (
          <div className="space-y-3">
            <div className="relative group/img rounded overflow-hidden border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={block.imageSrc} alt="" className="w-full" />
              <button
                type="button"
                onClick={() =>
                  dispatch({
                    type: "UPDATE_BLOCK",
                    payload: { id: block.id, updates: { imageSrc: undefined } },
                  })
                }
                className="absolute top-1 right-1 opacity-0 group-hover/img:opacity-100 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-opacity"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">{t("textImageAlign")}</Label>
              <div className="flex gap-1">
                <Button
                  variant={block.imageAlign !== "right" ? "default" : "outline"}
                  size="sm"
                  className="flex-1 h-8 text-xs"
                  onClick={() =>
                    dispatch({
                      type: "UPDATE_BLOCK",
                      payload: { id: block.id, updates: { imageAlign: "left" } },
                    })
                  }
                >
                  {t("alignLeft")}
                </Button>
                <Button
                  variant={block.imageAlign === "right" ? "default" : "outline"}
                  size="sm"
                  className="flex-1 h-8 text-xs"
                  onClick={() =>
                    dispatch({
                      type: "UPDATE_BLOCK",
                      payload: { id: block.id, updates: { imageAlign: "right" } },
                    })
                  }
                >
                  {t("alignRight")}
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">{t("textImageScale")} ({block.imageScale ?? 30}%)</Label>
              <Slider
                value={[block.imageScale ?? 30]}
                min={10}
                max={80}
                step={5}
                onValueChange={([v]) =>
                  dispatch({
                    type: "UPDATE_BLOCK",
                    payload: { id: block.id, updates: { imageScale: v } },
                  })
                }
              />
            </div>
          </div>
        ) : (
          <label
            className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-4 cursor-pointer transition-colors ${
              isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/40"
            }`}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
          >
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelected(file);
              }}
            />
            {isUploading ? (
              <span className="text-xs text-muted-foreground">{t("uploading")}</span>
            ) : (
              <>
                <Upload className="h-6 w-6 text-muted-foreground/50 mb-1" />
                <span className="text-xs text-muted-foreground">{t("textImageDragOrClick")}</span>
              </>
            )}
          </label>
        )}
      </div>
      <AiTextModal
        open={showAiModal}
        onOpenChange={setShowAiModal}
        blockId={block.id}
      />
      <ImageCropDialog
        imageSrc={cropSrc}
        open={cropOpen}
        onOpenChange={(open) => {
          setCropOpen(open);
          if (!open && cropSrc) {
            URL.revokeObjectURL(cropSrc);
            setCropSrc(null);
          }
        }}
        onCropComplete={handleCropComplete}
        title={t("cropImage")}
      />
    </div>
  );
}

function SyllablesProps({ block }: { block: SyllablesBlock }) {
  const { state, dispatch } = useEditor();
  const t = useTranslations("properties");
  const tc = useTranslations("common");
  const overrideValue = state.settings.chOverrides?.[block.id]?.content;
  const effectiveContent = state.localeMode === "DE" && overrideValue !== undefined
    ? overrideValue
    : block.content;

  const updateContent = (content: string) => {
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { content } },
    });
  };

  const handleSyllabify = () => {
    const syllabified = syllabifyGermanText(effectiveContent);
    if (state.localeMode === "DE") {
      if (syllabified === block.content) {
        dispatch({ type: "CLEAR_CH_OVERRIDE", payload: { blockId: block.id, fieldPath: "content" } });
      } else {
        dispatch({ type: "SET_CH_OVERRIDE", payload: { blockId: block.id, fieldPath: "content", value: syllabified } });
      }
      return;
    }
    updateContent(syllabified);
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("content")}</Label>
        <ChInput
          blockId={block.id}
          fieldPath="content"
          baseValue={block.content}
          onBaseChange={updateContent}
          placeholder={t("syllablesPlaceholder")}
          multiline
        />
        <p className="mt-1 text-xs text-muted-foreground">
          {t("syllablesHelp")}
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={handleSyllabify}
        disabled={!stripSyllableMarkers(effectiveContent).trim()}
      >
        <Scissors className="h-4 w-4 mr-2" />
        {t("syllabify")}
      </Button>
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("instruction")}</Label>
        <ChInput
          blockId={block.id}
          fieldPath="instruction"
          baseValue={block.instruction ?? ""}
          onBaseChange={(v) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { instruction: v } },
            })
          }
        />
      </div>
    </div>
  );
}

function TrueFalseMatrixProps({ block }: { block: TrueFalseMatrixBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");
  const tc = useTranslations("common");
  const [showAiModal, setShowAiModal] = React.useState(false);
  const [csvText, setCsvText] = React.useState("");
  const [csvError, setCsvError] = React.useState<string | null>(null);
  const [csvMode, setCsvMode] = React.useState<"replace" | "append">("replace");

  const handleCsvImport = () => {
    setCsvError(null);
    const text = csvText.trim();
    if (!text) return;

    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    const parsed: { text: string; correctAnswer: boolean }[] = [];

    for (const line of lines) {
      // Support both comma and tab (Excel paste) as delimiter
      const sep = line.includes("\t") ? "\t" : ",";
      const parts = line.split(sep).map((p) => p.trim());

      if (parts.length >= 2) {
        const answer = parts[parts.length - 1].toUpperCase();
        const itemText = parts.slice(0, parts.length - 1).join(sep === "\t" ? " " : ", ").trim();
        // R/W = German (Richtig/Falsch), T/F = English (True/False)
        if (["R", "T", "W", "F"].includes(answer)) {
          parsed.push({
            text: itemText,
            correctAnswer: answer === "R" || answer === "T",
          });
        } else {
          // No valid answer column — treat entire line as text
          parsed.push({ text: line.trim(), correctAnswer: true });
        }
      } else {
        // Single column — just the text, default to true
        parsed.push({ text: parts[0], correctAnswer: true });
      }
    }

    if (parsed.length === 0) {
      setCsvError(t("csvNoData"));
      return;
    }

    const newStatements = parsed.map((p, i) => ({
      id: `tf${Date.now()}-${i}`,
      text: p.text,
      correctAnswer: p.correctAnswer,
    }));

    const statements = csvMode === "append"
      ? [...block.statements, ...newStatements]
      : newStatements;

    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: { statements },
      },
    });
    setCsvText("");
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("columnLabels")}</Label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">{t("trueLabelProp")}</Label>
            <Input
              className="h-8 text-xs"
              placeholder={tc("true")}
              value={block.trueLabel || ""}
              onChange={(e) =>
                dispatch({
                  type: "UPDATE_BLOCK",
                  payload: { id: block.id, updates: { trueLabel: e.target.value } },
                })
              }
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">{t("falseLabelProp")}</Label>
            <Input
              className="h-8 text-xs"
              placeholder={tc("false")}
              value={block.falseLabel || ""}
              onChange={(e) =>
                dispatch({
                  type: "UPDATE_BLOCK",
                  payload: { id: block.id, updates: { falseLabel: e.target.value } },
                })
              }
            />
          </div>
        </div>
      </div>
      <Separator />
      <div className="flex items-center gap-2">
        <Switch
          checked={block.showPill !== false}
          onCheckedChange={(v) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { showPill: v } },
            })
          }
        />
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("showTaskLabel")}</Label>
      </div>
      <Separator />
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("statements")}</Label>
        <p className="text-xs text-muted-foreground">
          {t("statementCount", { count: block.statements.length })}
        </p>
      </div>
      <Separator />
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("csvImport")}</Label>
        <p className="text-xs text-muted-foreground mb-1">
          {t("csvImportHelp")}
        </p>
        <textarea
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[80px] resize-y"
          placeholder={t("csvImportPlaceholder")}
          value={csvText}
          onChange={(e) => {
            setCsvText(e.target.value);
            setCsvError(null);
          }}
        />
        {csvError && (
          <p className="text-xs text-destructive mt-1">{csvError}</p>
        )}
        <div className="flex gap-1 mt-1">
          <Select
            value={csvMode}
            onValueChange={(v) => setCsvMode(v as "replace" | "append")}
          >
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="replace">{t("csvReplace")}</SelectItem>
              <SelectItem value="append">{t("csvAppend")}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleCsvImport}
            disabled={!csvText.trim()}
          >
            <Upload className="h-4 w-4 mr-2" />
            {t("csvImportButton")}
          </Button>
        </div>
      </div>
      <Separator />
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("aiGeneration")}</Label>
        <p className="text-xs text-muted-foreground mb-2">
          {t("autoGenerateStatements")}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="w-full text-pink-700 border-pink-200 hover:bg-pink-50 hover:text-pink-800"
          onClick={() => setShowAiModal(true)}
        >
          <Sparkles className="h-4 w-4 mr-2" />
          {t("aiGenerate")}
        </Button>
      </div>
      <Separator />
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("shuffleItems")}</Label>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => {
            const ids = block.statements.map((s) => s.id);
            const shuffled = [...ids];
            for (let i = shuffled.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { statementOrder: shuffled } },
            });
          }}
        >
          <Shuffle className="h-3.5 w-3.5 mr-1" /> {t("shuffleItems")}
        </Button>
        {block.statementOrder && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-1 text-muted-foreground"
            onClick={() => {
              dispatch({
                type: "UPDATE_BLOCK",
                payload: { id: block.id, updates: { statementOrder: undefined } },
              });
            }}
          >
            {t("resetOrder")}
          </Button>
        )}
      </div>
      <AiTrueFalseModal open={showAiModal} onOpenChange={setShowAiModal} blockId={block.id} />
    </div>
  );
}

function MCQMatrixProps({ block }: { block: MCQMatrixBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");
  const tc = useTranslations("common");
  const [wordBankText, setWordBankText] = React.useState((block.wordBank ?? []).join("\n"));

  React.useEffect(() => {
    setWordBankText((block.wordBank ?? []).join("\n"));
  }, [block.wordBank]);

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

  const commitWordBankRows = (value: string) => {
    const wordBank = value
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: { wordBank },
      },
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("instruction")}</Label>
        <ChInput
          blockId={block.id}
          fieldPath="instruction"
          baseValue={block.instruction ?? ""}
          onBaseChange={(value) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { instruction: value } },
            })
          }
        />
      </div>
      <Separator />
      <div className="flex items-center gap-2">
        <Switch
          checked={block.showPill !== false}
          onCheckedChange={(value) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { showPill: value } },
            })
          }
        />
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("showTaskLabel")}</Label>
      </div>
      <Separator />
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("columnLabels")}</Label>
        <div className="space-y-2">
          {block.options.map((option) => (
            <div key={option.id} className="flex items-center gap-2">
              <Input
                className="h-8 text-xs"
                value={option.text}
                onChange={(e) =>
                  updateOptions(block.options.map((item) => (item.id === option.id ? { ...item, text: e.target.value } : item)))
                }
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  if (block.options.length <= 2) return;
                  updateOptions(
                    block.options.filter((item) => item.id !== option.id),
                    block.statements.map((statement) => ({
                      ...statement,
                      correctOptionIds: statement.correctOptionIds.filter((id) => id !== option.id),
                    }))
                  );
                }}
                disabled={block.options.length <= 2}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => {
              if (block.options.length >= 5) return;
              updateOptions([
                ...block.options,
                { id: crypto.randomUUID(), text: `${t("addOption")} ${block.options.length + 1}` },
              ]);
            }}
            disabled={block.options.length >= 5}
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> {t("addOption")} ({block.options.length}/5)
          </Button>
        </div>
      </div>
      <Separator />
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("wordBankItems")}</Label>
        <p className="text-xs text-muted-foreground mb-1">{t("wordBankItemsHelp")}</p>
        <textarea
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[96px] resize-y"
          placeholder={t("wordBankItemsPlaceholder")}
          value={wordBankText}
          onChange={(e) => setWordBankText(e.target.value)}
          onBlur={(e) => commitWordBankRows(e.target.value)}
        />
      </div>
      <Separator />
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("items")}</Label>
        <p className="text-xs text-muted-foreground">{t("statementCount", { count: block.statements.length })}</p>
      </div>
      <Separator />
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("shuffleItems")}</Label>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => {
            const ids = block.statements.map((statement) => statement.id);
            const shuffled = [...ids];
            for (let i = shuffled.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { statementOrder: shuffled } },
            });
          }}
        >
          <Shuffle className="h-3.5 w-3.5 mr-1" /> {t("shuffleItems")}
        </Button>
        {block.statementOrder && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-1 text-muted-foreground"
            onClick={() => {
              dispatch({
                type: "UPDATE_BLOCK",
                payload: { id: block.id, updates: { statementOrder: undefined } },
              });
            }}
          >
            {t("resetOrder")}
          </Button>
        )}
      </div>
      <Separator />
      <div className="flex items-center justify-between">
        <Label className="text-sm">{t("showFirstAsExample")}</Label>
        <Switch
          checked={!!block.showFirstAsExample}
          onCheckedChange={(checked) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { showFirstAsExample: checked } },
            })
          }
        />
      </div>
    </div>
  );
}

function ArticleTrainingProps({ block }: { block: ArticleTrainingBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");
  const tc = useTranslations("common");
  const [csvText, setCsvText] = React.useState("");
  const [csvError, setCsvError] = React.useState<string | null>(null);
  const [csvMode, setCsvMode] = React.useState<"replace" | "append">("replace");

  const renderSwitchRow = (
    label: string,
    checked: boolean,
    onCheckedChange: (checked: boolean) => void,
    options?: { withTopDivider?: boolean; withBottomBorder?: boolean }
  ) => (
    <>
      {options?.withTopDivider ? <Separator /> : null}
      <div
        className={`flex h-8 items-center justify-between ${options?.withBottomBorder === false ? "" : "border-b border-border"}`}
      >
        <Label className="text-sm">{label}</Label>
        <Switch checked={checked} onCheckedChange={onCheckedChange} />
      </div>
    </>
  );

  const handleCsvImport = () => {
    setCsvError(null);
    const text = csvText.trim();
    if (!text) return;

    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    const parsed: { text: string; correctArticle: ArticleAnswer }[] = [];

    for (const line of lines) {
      const sep = line.includes("\t") ? "\t" : ",";
      const parts = line.split(sep).map((p) => p.trim());

      if (parts.length >= 2) {
        const article = parts[0].toLowerCase();
        const noun = parts.slice(1).join(sep === "\t" ? " " : ", ").trim();
        if (["der", "das", "die"].includes(article)) {
          parsed.push({
            text: noun,
            correctArticle: article as ArticleAnswer,
          });
        } else {
          // Try the other way: noun, article
          const articleEnd = parts[parts.length - 1].toLowerCase();
          const nounStart = parts.slice(0, parts.length - 1).join(sep === "\t" ? " " : ", ").trim();
          if (["der", "das", "die"].includes(articleEnd)) {
            parsed.push({
              text: nounStart,
              correctArticle: articleEnd as ArticleAnswer,
            });
          } else {
            parsed.push({ text: line.trim(), correctArticle: "der" });
          }
        }
      } else {
        parsed.push({ text: parts[0], correctArticle: "der" });
      }
    }

    if (parsed.length === 0) {
      setCsvError(t("csvNoData"));
      return;
    }

    const newItems = parsed.map((p, i) => ({
      id: `at${Date.now()}-${i}`,
      text: p.text,
      correctArticle: p.correctArticle,
    }));

    const items = csvMode === "append"
      ? [...block.items, ...newItems]
      : newItems;

    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: { items },
      },
    });
    setCsvText("");
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("instruction")}</Label>
        <ChInput
          blockId={block.id}
          fieldPath="instruction"
          baseValue={block.instruction ?? ""}
          onBaseChange={(v) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { instruction: v } },
            })
          }
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("articleItems")}</Label>
        <p className="text-xs text-muted-foreground">
          {t("articleItemCount", { count: block.items.length })}
        </p>
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("csvImport")}</Label>
        <p className="text-xs text-muted-foreground">
          {t("articleCsvImportHelp")}
        </p>
        <textarea
          className="w-full rounded-[4px] !border border-input bg-white px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[80px] resize-y"
          placeholder={t("articleCsvPlaceholder")}
          value={csvText}
          onChange={(e) => {
            setCsvText(e.target.value);
            setCsvError(null);
          }}
        />
        {csvError && (
          <p className="text-xs text-destructive mt-1">{csvError}</p>
        )}
        <div className="space-y-2 mt-1">
          <Select
            value={csvMode}
            onValueChange={(v) => setCsvMode(v as "replace" | "append")}
          >
            <SelectTrigger size="sm" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="replace">{t("csvReplace")}</SelectItem>
              <SelectItem value="append">{t("csvAppend")}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleCsvImport}
            disabled={!csvText.trim()}
          >
            <Upload className="h-4 w-4 mr-2" />
            {t("csvImportButton")}
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("settings")}</Label>
        <div>
          {renderSwitchRow(
            t("showWritingLine"),
            block.showWritingLine,
            (checked) =>
              dispatch({
                type: "UPDATE_BLOCK",
                payload: { id: block.id, updates: { showWritingLine: checked } },
              }),
            { withTopDivider: true, withBottomBorder: false }
          )}
        </div>
      </div>
    </div>
  );
}

function OrderItemsProps({ block }: { block: OrderItemsBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");
  const tc = useTranslations("common");

  const updateItem = (index: number, updates: Partial<{ text: string }>) => {
    const newItems = [...block.items];
    newItems[index] = { ...newItems[index], ...updates };
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: newItems } },
    });
  };

  const addItem = () => {
    const newItems = [
      ...block.items,
      {
        id: `oi${Date.now()}`,
        text: `Item ${block.items.length + 1}`,
        correctPosition: block.items.length + 1,
      },
    ];
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: newItems } },
    });
  };

  const removeItem = (index: number) => {
    if (block.items.length <= 2) return;
    const newItems = block.items.filter((_, i) => i !== index);
    // Reindex positions
    const reindexed = newItems.map((item, i) => ({
      ...item,
      correctPosition: i + 1,
    }));
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: reindexed } },
    });
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= block.items.length) return;
    const newItems = [...block.items];
    [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
    const reindexed = newItems.map((item, i) => ({
      ...item,
      correctPosition: i + 1,
    }));
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: reindexed } },
    });
  };

  const sortedItems = [...block.items].sort(
    (a, b) => a.correctPosition - b.correctPosition
  );

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("instruction")}</Label>
        <ChInput
          blockId={block.id}
          fieldPath="instruction"
          baseValue={block.instruction}
          onBaseChange={(v) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { instruction: v } },
            })
          }
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch
          checked={block.showPill !== false}
          onCheckedChange={(v) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { showPill: v } },
            })
          }
        />
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("showTaskLabel")}</Label>
      </div>
      <Separator />
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("itemsInOrder")}</Label>
        {sortedItems.map((item, i) => (
          <div key={item.id} className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground w-4 shrink-0 text-right">{i + 1}.</span>
            <div className="flex-1">
              <ChInput
                blockId={block.id}
                fieldPath={`items.${i}.text`}
                baseValue={item.text}
                onBaseChange={(v) => updateItem(i, { text: v })}
                className="h-8 text-xs"
              />
            </div>
            <div className="flex flex-col">
              <button
                className="p-0 h-3 text-muted-foreground hover:text-foreground disabled:opacity-30"
                onClick={() => moveItem(i, -1)}
                disabled={i === 0}
              >
                <ArrowUpDown className="h-2.5 w-2.5 rotate-180" />
              </button>
              <button
                className="p-0 h-3 text-muted-foreground hover:text-foreground disabled:opacity-30"
                onClick={() => moveItem(i, 1)}
                disabled={i === sortedItems.length - 1}
              >
                <ArrowUpDown className="h-2.5 w-2.5" />
              </button>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => removeItem(i)}
              disabled={block.items.length <= 2}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addItem} className="w-full">
          <Plus className="h-3.5 w-3.5 mr-1" /> {t("addItem")}
        </Button>
      </div>
    </div>
  );
}

function InlineChoicesProps({ block }: { block: InlineChoicesBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");
  const tc = useTranslations("common");
  const tt = useTranslations("tableEditor");
  const [showAiModal, setShowAiModal] = React.useState(false);
  const [csvText, setCsvText] = React.useState("");
  const [csvError, setCsvError] = React.useState<string | null>(null);
  const [csvMode, setCsvMode] = React.useState<"replace" | "append">("replace");

  // Migrate legacy content to items on first render
  const items: InlineChoiceItem[] = React.useMemo(
    () => migrateInlineChoicesBlock(block),
    [block]
  );

  // Persist migrated items if block still has old format
  React.useEffect(() => {
    if ((!block.items || block.items.length === 0) && block.content && items.length > 0) {
      dispatch({
        type: "UPDATE_BLOCK",
        payload: { id: block.id, updates: { items, content: undefined } },
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateItem = (index: number, content: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], content };
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: newItems } },
    });
  };

  const addItem = () => {
    const newItem: InlineChoiceItem = {
      id: `ic${Date.now()}`,
      content: "{{correct|wrong1|wrong2}}",
    };
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: [...items, newItem] } },
    });
  };

  const addSpacerRow = () => {
    const newItem: InlineChoiceItem = {
      id: `ic-space-${Date.now()}`,
      content: "",
      isSpacer: true,
    };
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: [...items, newItem] } },
    });
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: { items: items.filter((_, i) => i !== index) },
      },
    });
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= items.length) return;
    const newItems = [...items];
    [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: newItems } },
    });
  };

  const handleCsvImport = () => {
    setCsvError(null);
    const text = csvText.trim();
    if (!text) return;

    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length === 0) {
      setCsvError(t("csvNoData"));
      return;
    }

    const newItems = lines.map((line) => ({
      id: `ic${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      content: line.trim(),
    }));

    const finalItems = csvMode === "append"
      ? [...items, ...newItems]
      : newItems;

    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: finalItems } },
    });
    setCsvText("");
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("instruction")}</Label>
        <ChInput
          blockId={block.id}
          fieldPath="instruction"
          baseValue={block.instruction ?? ""}
          onBaseChange={(v) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { instruction: v } },
            })
          }
        />
      </div>
      <Separator />
      <div className="flex items-center justify-between">
        <Label className="text-xs">{t("shuffleChoices")}</Label>
        <Switch
          checked={block.shuffleChoices !== false}
          onCheckedChange={(checked) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { shuffleChoices: checked } },
            })
          }
        />
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-xs">{t("showFirstAsExample")}</Label>
        <Switch
          checked={block.showFirstAsExample ?? false}
          onCheckedChange={(checked) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { showFirstAsExample: checked } },
            })
          }
        />
      </div>
      <Separator />
      <div className="space-y-2">
        {items.map((item, i) => {
          const warnings = item.isSpacer ? [] : validateChoices(item.content);
          const visibleIndex = items.slice(0, i + 1).filter((entry) => !entry.isSpacer).length;
          return (
            <div key={item.id} className="space-y-2 rounded-md border border-slate-200 bg-white p-2">
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-muted-foreground bg-muted px-2 h-6 rounded inline-flex items-center justify-center shrink-0">
                  {item.isSpacer ? t("spacer") : String(visibleIndex).padStart(2, "0")}
                </span>
                <div className="flex-1" />
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveItem(i, -1)} disabled={i === 0}>
                  <ChevronUp className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveItem(i, 1)} disabled={i === items.length - 1}>
                  <ChevronDown className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeItem(i)} disabled={items.length <= 1}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>

              {item.isSpacer ? (
                <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-muted-foreground">
                  {t("spacerDesc")}
                </div>
              ) : (
                <>
                  <ChInput
                    blockId={block.id}
                    fieldPath={`items.${i}.content`}
                    baseValue={item.content}
                    onBaseChange={(v) => updateItem(i, v)}
                    className="border rounded-md p-1.5 text-xs min-h-[40px] resize-y font-mono w-full"
                    multiline
                  />
                  {warnings.length > 0 && (
                    <div className="space-y-1">
                      {warnings.map((w, wi) => (
                        <div key={wi} className="flex items-center gap-1 text-xs text-amber-600">
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                          <span>{w}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addItem} className="flex-1">
            <Plus className="h-3.5 w-3.5 mr-1" /> {t("addSentence")}
          </Button>
          <Button variant="outline" size="sm" onClick={addSpacerRow} className="flex-1">
            <Plus className="h-3.5 w-3.5 mr-1" /> {tt("addRow")}
          </Button>
        </div>
      </div>
      <Separator />
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("csvImport")}</Label>
        <p className="text-xs text-muted-foreground mb-1">
          {t("csvImportHelpInlineChoices")}
        </p>
        <textarea
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[80px] resize-y font-mono"
          placeholder={t.raw("csvImportPlaceholderInlineChoices") as string}
          value={csvText}
          onChange={(e) => {
            setCsvText(e.target.value);
            setCsvError(null);
          }}
        />
        {csvError && (
          <p className="text-xs text-destructive mt-1">{csvError}</p>
        )}
        <div className="flex gap-1 mt-1">
          <Select
            value={csvMode}
            onValueChange={(v) => setCsvMode(v as "replace" | "append")}
          >
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="replace">{t("csvReplace")}</SelectItem>
              <SelectItem value="append">{t("csvAppend")}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleCsvImport}
            disabled={!csvText.trim()}
          >
            <Upload className="h-4 w-4 mr-2" />
            {t("csvImportButton")}
          </Button>
        </div>
      </div>
      <Separator />
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("aiGeneration")}</Label>
        <p className="text-xs text-muted-foreground mb-2">
          {t("aiVerbExerciseHint")}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="w-full text-pink-700 border-pink-200 hover:bg-pink-50 hover:text-pink-800"
          onClick={() => setShowAiModal(true)}
        >
          <Sparkles className="h-4 w-4 mr-2" />
          {t("aiGenerate")}
        </Button>
      </div>
      <AiVerbExerciseModal open={showAiModal} onOpenChange={setShowAiModal} blockId={block.id} />
    </div>
  );
}

function MCQRowsProps({ block }: { block: MCQRowsBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");
  const tc = useTranslations("common");
  const choicesPerItem = Math.max(2, Math.min(6, Math.round(block.choicesPerItem || 3)));
  const getChoiceLabel = (label: string | undefined, index: number) => {
    const value = (label || "").trim();
    return value.length > 0 ? value : String.fromCharCode(65 + index);
  };

  const updateItems = (items: MCQRowsBlock["items"]) => {
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items } },
    });
  };

  const syncChoiceCount = (nextCount: number) => {
    const clampedCount = Math.max(2, Math.min(6, Math.round(nextCount || 3)));
    const items = block.items.map((item) => {
      const existingChoices = item.choices.slice(0, clampedCount);
      const missingChoices = Array.from({ length: Math.max(0, clampedCount - existingChoices.length) }, (_, index) => ({
        id: crypto.randomUUID(),
        label: String.fromCharCode(65 + existingChoices.length + index),
        text: `${t("choice")} ${existingChoices.length + index + 1}`,
      }));
      const choices = [...existingChoices, ...missingChoices];
      const correctChoiceId = choices.some((choice) => choice.id === item.correctChoiceId)
        ? item.correctChoiceId
        : (choices[0]?.id ?? "");
      return {
        ...item,
        choices,
        correctChoiceId,
      };
    });

    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { choicesPerItem: clampedCount, items } },
    });
  };

  const updateItem = (
    itemId: string,
    updates: Partial<Pick<MCQRowsBlock["items"][number], "text" | "choices" | "correctChoiceId">>
  ) => {
    updateItems(block.items.map((item) => (item.id === itemId ? { ...item, ...updates } : item)));
  };

  const addItem = () => {
    const choices = Array.from({ length: choicesPerItem }, (_, index) => ({
      id: crypto.randomUUID(),
      label: String.fromCharCode(65 + index),
      text: `${t("choice")} ${index + 1}`,
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

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("instruction")}</Label>
        <ChInput
          blockId={block.id}
          fieldPath="instruction"
          baseValue={block.instruction ?? ""}
          onBaseChange={(value) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { instruction: value } },
            })
          }
        />
      </div>

      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("choicesPerItem")}</Label>
        <Input
          type="number"
          min={2}
          max={6}
          value={choicesPerItem}
          onChange={(e) => syncChoiceCount(Number(e.target.value))}
        />
      </div>

      <Separator />

      <div className="space-y-2">
        {block.items.map((item, itemIndex) => (
          <div key={item.id} className="space-y-2 rounded-md border border-slate-200 bg-white p-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground bg-muted px-2 h-6 rounded inline-flex items-center justify-center shrink-0">
                {String(itemIndex + 1).padStart(2, "0")}
              </span>
              <div className="flex-1">
                <ChInput
                  blockId={block.id}
                  fieldPath={`items.${itemIndex}.text`}
                  baseValue={item.text}
                  onBaseChange={(value) => updateItem(item.id, { text: value })}
                  placeholder={t("itemText")}
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  if (block.items.length <= 1) return;
                  updateItems(block.items.filter((currentItem) => currentItem.id !== item.id));
                }}
                disabled={block.items.length <= 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${choicesPerItem}, minmax(0, 1fr))` }}>
              {item.choices.map((choice, choiceIndex) => {
                const isCorrect = item.correctChoiceId === choice.id;
                const choiceLabel = getChoiceLabel(choice.label, choiceIndex);
                return (
                  <div key={choice.id} className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-2">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{t("label")}</Label>
                      <Input
                        className="h-9"
                        value={choiceLabel}
                        onChange={(e) =>
                          updateItem(item.id, {
                            choices: item.choices.map((currentChoice) =>
                              currentChoice.id === choice.id
                                ? { ...currentChoice, label: e.target.value }
                                : currentChoice
                            ),
                          })
                        }
                        placeholder={t("label")}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{t("markAsCorrect")}</Label>
                      <Button
                        type="button"
                        variant="outline"
                        className={`h-9 w-full justify-center ${isCorrect ? "border-green-500 bg-green-50 text-green-700" : ""}`}
                        onClick={() => updateItem(item.id, { correctChoiceId: choice.id })}
                      >
                        {isCorrect ? <Check className="mr-2 h-4 w-4" /> : null}
                        {isCorrect ? t("markedAsCorrect") : t("markAsCorrect")}
                      </Button>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{t("choice")}</Label>
                      <ChInput
                        blockId={block.id}
                        fieldPath={`items.${itemIndex}.choices.${choiceIndex}.text`}
                        baseValue={choice.text}
                        onBaseChange={(value) =>
                          updateItem(item.id, {
                            choices: item.choices.map((currentChoice) =>
                              currentChoice.id === choice.id ? { ...currentChoice, text: value } : currentChoice
                            ),
                          })
                        }
                        placeholder={`${t("choice")} ${choiceIndex + 1}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" className="w-full" onClick={addItem}>
        <Plus className="mr-2 h-4 w-4" /> {t("addItem")}
      </Button>

      <Separator />

      <div className="flex items-center justify-between">
        <Label className="text-sm">{t("showFirstAsExample")}</Label>
        <Switch
          checked={!!block.showFirstAsExample}
          onCheckedChange={(checked) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { showFirstAsExample: checked } },
            })
          }
        />
      </div>
    </div>
  );
}

/** Structured editor for a single choice group's options. */
function ChoiceGroupEditor({
  options,
  onChange,
}: {
  groupIndex: number;
  options: string[];
  onChange: (newOptions: string[]) => void;
}) {
  const t = useTranslations("properties");

  const updateOption = (optIndex: number, value: string) => {
    const newOptions = [...options];
    newOptions[optIndex] = value;
    onChange(newOptions);
  };

  const removeOption = (optIndex: number) => {
    if (options.length <= 2) return;
    const newOptions = options.filter((_, i) => i !== optIndex);
    onChange(newOptions);
  };

  const addOption = () => {
    onChange([...options, ""]);
  };

  const moveOptionToCorrect = (optIndex: number) => {
    if (optIndex === 0) return;
    const newOptions = [...options];
    const [moved] = newOptions.splice(optIndex, 1);
    newOptions.unshift(moved);
    onChange(newOptions);
  };

  const moveOption = (optIndex: number, direction: -1 | 1) => {
    const newIndex = optIndex + direction;
    if (newIndex < 0 || newIndex >= options.length) return;
    const newOptions = [...options];
    [newOptions[optIndex], newOptions[newIndex]] = [newOptions[newIndex], newOptions[optIndex]];
    onChange(newOptions);
  };

  return (
    <div className="space-y-1.5">
      {options.map((opt, oi) => {
        const isCorrect = oi === 0;
        return (
          <div key={oi} className="flex items-center gap-1">
            {/* Correct indicator / make-correct button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={`h-5 w-5 rounded-full border-[1.5px] flex items-center justify-center shrink-0 transition-colors ${
                    isCorrect
                      ? "border-green-500 bg-green-500 text-white"
                      : "border-muted-foreground/30 hover:border-green-400 hover:bg-green-50"
                  }`}
                  onClick={() => moveOptionToCorrect(oi)}
                  disabled={isCorrect}
                >
                  {isCorrect && <Check className="h-2.5 w-2.5" />}
                </button>
              </TooltipTrigger>
              <TooltipContent>{isCorrect ? t("correctAnswer") : t("markAsCorrect")}</TooltipContent>
            </Tooltip>
            {/* Option text input */}
            <Input
              value={opt}
              onChange={(e) => updateOption(oi, e.target.value)}
              className={`h-7 text-xs flex-1 ${isCorrect ? "border-green-200 bg-green-50/50" : ""}`}
              placeholder={isCorrect ? t("correctAnswer") : `${t("option")} ${oi + 1}`}
            />
            {/* Move up/down */}
            <div className="flex flex-col">
              <button
                type="button"
                className="h-3.5 w-4 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30"
                onClick={() => moveOption(oi, -1)}
                disabled={oi === 0}
              >
                <ChevronUp className="h-2.5 w-2.5" />
              </button>
              <button
                type="button"
                className="h-3.5 w-4 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30"
                onClick={() => moveOption(oi, 1)}
                disabled={oi === options.length - 1}
              >
                <ChevronDown className="h-2.5 w-2.5" />
              </button>
            </div>
            {/* Delete */}
            <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={() => removeOption(oi)} disabled={options.length <= 2}>
              <X className="h-2.5 w-2.5" />
            </Button>
          </div>
        );
      })}
      <Button variant="ghost" size="sm" className="w-full h-6 text-xs" onClick={addOption}>
        <Plus className="h-2.5 w-2.5 mr-1" /> {t("addOption")}
      </Button>
    </div>
  );
}

function SortingCategoriesProps({ block }: { block: SortingCategoriesBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");
  const tc = useTranslations("common");
  const [csvText, setCsvText] = React.useState("");
  const [csvError, setCsvError] = React.useState<string | null>(null);
  const [csvMode, setCsvMode] = React.useState<"replace" | "append">("replace");

  const parseCsvLine = (line: string): string[] => {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      const nextChar = line[index + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          index += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (!inQuotes && (char === ";" || char === "," || char === "\t")) {
        values.push(current.trim());
        current = "";
        continue;
      }

      current += char;
    }

    values.push(current.trim());
    return values;
  };

  const handleCsvImport = () => {
    setCsvError(null);
    const text = csvText.trim();
    if (!text) return;

    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      setCsvError(t("csvNoData"));
      return;
    }

    const parsedRows = lines.map(parseCsvLine);
    const maxColumns = Math.max(...parsedRows.map((row) => row.length));

    if (maxColumns > 2) {
      setCsvError(t("sortingCategoriesCsvTooManyColumns"));
      return;
    }

    const categoryIdByLabel = new Map(
      block.categories.map((category) => [category.label.trim().toLocaleLowerCase(), category.id])
    );

    const nextItems = csvMode === "append" ? [...block.items] : [];
    const nextCategories = csvMode === "append"
      ? block.categories.map((cat) => ({ ...cat, correctItems: [...cat.correctItems] }))
      : block.categories.map((cat) => ({ ...cat, correctItems: [] }));

    let importedCount = 0;

    parsedRows.forEach((row, rowIndex) => {
      const itemText = (row[0] ?? "").trim();
      const categoryLabel = (row[1] ?? "").trim();
      if (!itemText || !categoryLabel) return;

      const normalizedCategoryLabel = categoryLabel.toLocaleLowerCase();
      let categoryId = categoryIdByLabel.get(normalizedCategoryLabel);
      if (!categoryId) {
        categoryId = `cat-${Date.now()}-${rowIndex}-${importedCount}`;
        nextCategories.push({
          id: categoryId,
          label: categoryLabel,
          correctItems: [],
        });
        categoryIdByLabel.set(normalizedCategoryLabel, categoryId);
      }

      const categoryIndex = nextCategories.findIndex((category) => category.id === categoryId);
      if (categoryIndex < 0) return;

      const itemId = `si-${Date.now()}-${rowIndex}-${importedCount}`;
      nextItems.push({ id: itemId, text: itemText });
      nextCategories[categoryIndex] = {
        ...nextCategories[categoryIndex],
        correctItems: [...nextCategories[categoryIndex].correctItems, itemId],
      };
      importedCount += 1;
    });

    if (importedCount === 0) {
      setCsvError(t("csvNoData"));
      return;
    }

    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          items: nextItems,
          categories: nextCategories,
        },
      },
    });
    setCsvText("");
  };

  const addCategory = () => {
    const newCat: SortingCategory = {
      id: `cat${Date.now()}`,
      label: `Category ${block.categories.length + 1}`,
      correctItems: [],
    };
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: { categories: [...block.categories, newCat] },
      },
    });
  };

  const removeCategory = (catId: string) => {
    if (block.categories.length <= 2) return;
    const removedCat = block.categories.find((c) => c.id === catId);
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          categories: block.categories.filter((c) => c.id !== catId),
          items: block.items.filter(
            (item) => !removedCat?.correctItems.includes(item.id)
          ),
        },
      },
    });
  };

  const updateCategoryLabel = (catId: string, label: string) => {
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          categories: block.categories.map((c) =>
            c.id === catId ? { ...c, label } : c
          ),
        },
      },
    });
  };

  const addItemToCategory = (catId: string) => {
    const newItem = {
      id: `si${Date.now()}`,
      text: `Item ${block.items.length + 1}`,
    };
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          items: [...block.items, newItem],
          categories: block.categories.map((c) =>
            c.id === catId
              ? { ...c, correctItems: [...c.correctItems, newItem.id] }
              : c
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

  const updateItemText = (itemId: string, text: string) => {
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          items: block.items.map((item) =>
            item.id === itemId ? { ...item, text } : item
          ),
        },
      },
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("instruction")}</Label>
        <ChInput
          blockId={block.id}
          fieldPath="instruction"
          baseValue={block.instruction}
          onBaseChange={(v) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { instruction: v } },
            })
          }
        />
      </div>
      <Separator />
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("csvImport")}</Label>
        <p className="text-xs text-muted-foreground mb-1">
          {t("sortingCategoriesCsvImportHelp")}
        </p>
        <textarea
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[80px] resize-y"
          placeholder={t("sortingCategoriesCsvPlaceholder")}
          value={csvText}
          onChange={(e) => {
            setCsvText(e.target.value);
            setCsvError(null);
          }}
        />
        {csvError && (
          <p className="text-xs text-destructive mt-1">{csvError}</p>
        )}
        <div className="flex gap-1 mt-1">
          <Select
            value={csvMode}
            onValueChange={(value) => setCsvMode(value as "replace" | "append")}
          >
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="replace">{t("csvReplace")}</SelectItem>
              <SelectItem value="append">{t("csvAppend")}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleCsvImport}
            disabled={!csvText.trim()}
          >
            <Upload className="h-4 w-4 mr-2" />
            {t("csvImportButton")}
          </Button>
        </div>
      </div>
      <Separator />
      {block.categories.map((cat, catIndex) => {
        const catItems = block.items.filter((item) =>
          cat.correctItems.includes(item.id)
        );
        return (
          <div key={cat.id} className="space-y-2">
            <div className="flex items-center gap-1.5">
              <div className="flex-1">
                <ChInput
                  blockId={block.id}
                  fieldPath={`categories.${catIndex}.label`}
                  baseValue={cat.label}
                  onBaseChange={(v) => updateCategoryLabel(cat.id, v)}
                  className="h-8 text-xs font-semibold"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => removeCategory(cat.id)}
                disabled={block.categories.length <= 2}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            {catItems.map((item) => (
              <div key={item.id} className="flex items-center gap-1 pl-3">
                <span className="text-xs text-muted-foreground shrink-0">•</span>
                <div className="flex-1">
                  <ChInput
                    blockId={block.id}
                    fieldPath={`items.${block.items.indexOf(item)}.text`}
                    baseValue={item.text}
                    onBaseChange={(v) => updateItemText(item.id, v)}
                    className="h-7 text-xs"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => removeItem(item.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => addItemToCategory(cat.id)}
              className="w-full h-7 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" /> {t("addItem")}
            </Button>
            <Separator />
          </div>
        );
      })}
      <Button variant="outline" size="sm" onClick={addCategory} className="w-full">
        <Plus className="h-3.5 w-3.5 mr-1" /> {t("addCategory")}
      </Button>
      <Separator />
      <div className="flex items-center justify-between">
        <Label className="text-xs">{t("showWritingLines")}</Label>
        <Switch
          checked={block.showWritingLines ?? true}
          onCheckedChange={(v) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { showWritingLines: v } },
            })
          }
        />
      </div>
      {block.categories.length === 2 && (
        <div className="flex items-center justify-between">
          <Label className="text-xs">{t("twoWritingColumnsPerCategory")}</Label>
          <Switch
            checked={!!block.twoColumnCategoryLines}
            onCheckedChange={(v) =>
              dispatch({
                type: "UPDATE_BLOCK",
                payload: { id: block.id, updates: { twoColumnCategoryLines: v } },
              })
            }
          />
        </div>
      )}
      <div className="flex items-center justify-between">
        <Label className="text-xs">{t("colorCode")}</Label>
        <Switch
          checked={!!block.colorCode}
          onCheckedChange={(v) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { colorCode: v } },
            })
          }
        />
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-xs">{t("showFirstAsExample")}</Label>
        <Switch
          checked={!!block.showFirstAsExample}
          onCheckedChange={(v) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { showFirstAsExample: v } },
            })
          }
        />
      </div>
    </div>
  );
}

function WordSearchProps({ block }: { block: WordSearchBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");
  const tc = useTranslations("common");
  const directionKeys = [
    "leftToRight",
    "rightToLeft",
    "upToDown",
    "downToUp",
    "nwToSe",
    "swToNe",
    "neToSw",
    "seToNw",
  ] as const;
  const activeDirections = new Set(resolveWordSearchDirections(block.allowedDirections));

  const updateWord = (index: number, value: string) => {
    const newWords = [...block.words];
    newWords[index] = value;
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { words: newWords } },
    });
  };

  const addWord = () => {
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: { words: [...block.words, "Word"] },
      },
    });
  };

  const removeWord = (index: number) => {
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          words: block.words.filter((_, i) => i !== index),
        },
      },
    });
  };

  const regenerateGrid = () => {
    // Import the generator from block-renderer would cause circular deps,
    // so we trigger re-generation by clearing the grid.
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { grid: [] } },
    });
  };

  const toggleDirection = (direction: (typeof directionKeys)[number], checked: boolean) => {
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          allowedDirections: {
            ...block.allowedDirections,
            [direction]: checked,
          },
          grid: [],
        },
      },
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("instruction")}</Label>
        <ChInput
          blockId={block.id}
          fieldPath="instruction"
          baseValue={block.instruction ?? ""}
          onBaseChange={(v) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { instruction: v } },
            })
          }
        />
      </div>
      <Separator />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("columns")}</Label>
          <Input
            type="number"
            min={4}
            max={40}
            value={block.gridCols ?? block.gridSize ?? 24}
            onChange={(e) =>
              dispatch({
                type: "UPDATE_BLOCK",
                payload: {
                  id: block.id,
                  updates: { gridCols: Number(e.target.value), grid: [] },
                },
              })
            }
            className="h-8 text-xs"
          />
        </div>
        <div>
          <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("rows")}</Label>
          <Input
            type="number"
            min={4}
            max={30}
            value={block.gridRows ?? block.gridSize ?? 12}
            onChange={(e) =>
              dispatch({
                type: "UPDATE_BLOCK",
                payload: {
                  id: block.id,
                  updates: { gridRows: Number(e.target.value), grid: [] },
                },
              })
            }
            className="h-8 text-xs"
          />
        </div>
      </div>
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("rowHeight")}</Label>
        <Input
          type="number"
          min={1.4}
          max={3}
          step={0.1}
          value={String(block.rowHeight ?? 1.9)}
          onChange={(e) => {
            const value = Number(e.target.value);
            dispatch({
              type: "UPDATE_BLOCK",
              payload: {
                id: block.id,
                updates: {
                  rowHeight: Number.isFinite(value) ? Math.max(1.4, Math.min(3, value)) : 1.9,
                },
              },
            });
          }}
          className="h-8 text-xs"
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch
          checked={block.showWordList}
          onCheckedChange={(v) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { showWordList: v } },
            })
          }
        />
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("showWordList")}</Label>
      </div>
      <div className="flex items-center gap-2">
        <Switch
          checked={block.showFirstAsExample ?? false}
          onCheckedChange={(v) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { showFirstAsExample: v } },
            })
          }
        />
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("showFirstAsExample")}</Label>
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("wordSearchDirections")}</Label>
        <div className="grid grid-cols-2 gap-2">
          {directionKeys.map((direction) => {
            const labelKey = `wordSearchDirection${direction.charAt(0).toUpperCase()}${direction.slice(1)}` as const;
            return (
              <label key={direction} className="flex items-center justify-between rounded-md border border-slate-200 px-2 py-1.5 text-xs">
                <span>{t(labelKey)}</span>
                <Switch
                  checked={activeDirections.has(direction)}
                  onCheckedChange={(checked) => toggleDirection(direction, checked)}
                />
              </label>
            );
          })}
        </div>
      </div>
      <Separator />
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("words")}</Label>
        {block.words.map((word, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className="flex-1">
              <ChInput
                blockId={block.id}
                fieldPath={`words.${i}`}
                baseValue={word}
                onBaseChange={(v) => updateWord(i, v)}
                className="h-8 text-xs"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => removeWord(i)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addWord} className="w-full">
          <Plus className="h-3.5 w-3.5 mr-1" /> {t("addWord")}
        </Button>
      </div>
      <Separator />
      <Button
        variant="outline"
        size="sm"
        onClick={regenerateGrid}
        className="w-full"
      >
        <ArrowUpDown className="h-3.5 w-3.5 mr-1" /> {t("regenerateGrid")}
      </Button>
    </div>
  );
}

function CrosswordProps({ block }: { block: CrosswordBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");
  const tc = useTranslations("common");
  const [itemsText, setItemsText] = React.useState(() => formatCrosswordItemsText(block.items));
  const [tableOpen, setTableOpen] = React.useState(false);

  React.useEffect(() => {
    setItemsText(formatCrosswordItemsText(block.items));
  }, [block.items]);

  const commitItemsArray = React.useCallback((items: CrosswordItem[]) => {
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          items,
          grid: [],
          placements: [],
          generationError: null,
        },
      },
    });
  }, [block.id, dispatch]);

  const commitItems = React.useCallback((value: string) => {
    const parsedItems = parseCrosswordItemsText(value).map((item, index) => ({
      id: block.items[index]?.id ?? crypto.randomUUID(),
      answer: item.answer,
      hint: item.hint,
    }));

    commitItemsArray(parsedItems);
  }, [block.items, commitItemsArray]);

  const updateItemField = React.useCallback(
    (index: number, field: "answer" | "hint", value: string) => {
      commitItemsArray(
        block.items.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
      );
    },
    [block.items, commitItemsArray],
  );

  const addItem = React.useCallback(() => {
    commitItemsArray([...block.items, { id: crypto.randomUUID(), answer: "", hint: "" }]);
  }, [block.items, commitItemsArray]);

  const removeItem = React.useCallback(
    (index: number) => {
      commitItemsArray(block.items.filter((_, i) => i !== index));
    },
    [block.items, commitItemsArray],
  );

  const moveItem = React.useCallback(
    (index: number, direction: -1 | 1) => {
      const target = index + direction;
      if (target < 0 || target >= block.items.length) return;
      const next = [...block.items];
      [next[index], next[target]] = [next[target], next[index]];
      commitItemsArray(next);
    },
    [block.items, commitItemsArray],
  );

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("instruction")}</Label>
        <Input
          value={block.instruction ?? ""}
          onChange={(event) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { instruction: event.target.value } },
            })
          }
          className="h-8 text-xs"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("items")}</Label>
        <textarea
          value={itemsText}
          onChange={(event) => setItemsText(event.target.value)}
          onBlur={(event) => commitItems(event.target.value)}
          className="min-h-40 w-full rounded-[4px] !border border-input bg-white px-3 py-2 text-xs shadow-none outline-none"
          placeholder={t("crosswordItemsPlaceholder")}
        />
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setTableOpen(true)}
        >
          <Table2 className="mr-2 h-3.5 w-3.5" /> {t("crosswordEditTable")}
        </Button>
      </div>
      <Dialog open={tableOpen} onOpenChange={setTableOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("crosswordTableTitle")}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {block.items.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">{t("crosswordTableEmpty")}</p>
            ) : (
              <table className="w-full border-separate border-spacing-y-1.5 text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="w-8" />
                    <th className="px-2 pb-1">{t("crosswordAnswer")}</th>
                    <th className="px-2 pb-1">{t("crosswordHint")}</th>
                    <th className="w-20" />
                  </tr>
                </thead>
                <tbody>
                  {block.items.map((item, index) => (
                    <tr key={item.id} className="align-top">
                      <td className="pt-1.5 text-center text-xs text-slate-400">{index + 1}</td>
                      <td className="px-1">
                        <Input
                          value={item.answer}
                          onChange={(event) => updateItemField(index, "answer", event.target.value)}
                          className="h-8 text-sm"
                        />
                      </td>
                      <td className="px-1">
                        <Input
                          value={item.hint}
                          onChange={(event) => updateItemField(index, "hint", event.target.value)}
                          className="h-8 text-sm"
                        />
                      </td>
                      <td className="px-1">
                        <div className="flex items-center gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            disabled={index === 0}
                            onClick={() => moveItem(index, -1)}
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            disabled={index === block.items.length - 1}
                            onClick={() => moveItem(index, 1)}
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-500 hover:text-red-600"
                            onClick={() => removeItem(index)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={addItem}>
            <Plus className="mr-2 h-3.5 w-3.5" /> {t("addWord")}
          </Button>
          <DialogFooter>
            <Button size="sm" onClick={() => setTableOpen(false)}>
              {t("done")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {block.generationError ? (
        <div className="rounded-[4px] border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {block.generationError === "word-too-long"
            ? t("crosswordWordTooLong")
            : block.generationError === "no-layout"
              ? t("crosswordNoLayout")
              : t("generationFailed")}
        </div>
      ) : null}
      {(() => {
        if (block.generationError || block.placements.length === 0) return null;
        const placedIds = new Set(block.placements.map((p) => p.itemId));
        const unplaced = block.items.filter((it) => it.answer.trim().length > 0 && !placedIds.has(it.id));
        if (unplaced.length === 0) return null;
        return (
          <div className="rounded-[4px] border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {t("crosswordUnplaced", { answers: unplaced.map((it) => it.answer).join(", ") })}
          </div>
        );
      })()}
      <div className="flex items-center justify-between">
        <Label className="text-xs">{t("crosswordTwoColumnClues")}</Label>
        <Switch
          checked={!!block.twoColumnClues}
          onCheckedChange={(v) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { twoColumnClues: v } },
            })
          }
        />
      </div>
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() =>
          dispatch({
            type: "UPDATE_BLOCK",
            payload: {
              id: block.id,
              updates: { grid: [], placements: [], generationError: null },
            },
          })
        }
      >
        <RefreshCw className="mr-2 h-3.5 w-3.5" /> {t("regenerateGrid")}
      </Button>
    </div>
  );
}

function UnscrambleWordsProps({ block }: { block: UnscrambleWordsBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");
  const tc = useTranslations("common");

  const updateWord = (index: number, word: string) => {
    const newWords = [...block.words];
    newWords[index] = { ...newWords[index], word };
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { words: newWords } },
    });
  };

  const addWord = () => {
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          words: [...block.words, { id: `uw${Date.now()}`, word: "word" }],
        },
      },
    });
  };

  const removeWord = (index: number) => {
    if (block.words.length <= 1) return;
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: { words: block.words.filter((_, i) => i !== index) },
      },
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("instruction")}</Label>
        <ChInput
          blockId={block.id}
          fieldPath="instruction"
          baseValue={block.instruction}
          onBaseChange={(v) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { instruction: v } },
            })
          }
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch
          checked={block.keepFirstLetter}
          onCheckedChange={(v) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { keepFirstLetter: v } },
            })
          }
        />
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("keepFirstLetter")}</Label>
      </div>
      <div className="flex items-center gap-2">
        <Switch
          checked={block.lowercaseAll}
          onCheckedChange={(v) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { lowercaseAll: v } },
            })
          }
        />
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("lowercaseAll")}</Label>
      </div>
      <div className="flex items-center gap-2">
        <Switch
          checked={block.showPill !== false}
          onCheckedChange={(v) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { showPill: v } },
            })
          }
        />
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("showTaskLabel")}</Label>
      </div>
      <Separator />
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("words")}</Label>
        {block.words.map((item, i) => (
          <div key={item.id} className="flex items-center gap-1">
            <div className="flex-1">
              <ChInput
                blockId={block.id}
                fieldPath={`words.${i}.word`}
                baseValue={item.word}
                onBaseChange={(v) => updateWord(i, v)}
                className="h-8 text-xs"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => removeWord(i)}
              disabled={block.words.length <= 1}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addWord} className="w-full">
          <Plus className="h-3.5 w-3.5 mr-1" /> {t("addWord")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => {
            const ids = block.words.map((w) => w.id);
            const shuffled = [...ids];
            for (let i = shuffled.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { itemOrder: shuffled } },
            });
          }}
        >
          <Shuffle className="h-3.5 w-3.5 mr-1" /> {t("shuffleItems")}
        </Button>
      </div>
    </div>
  );
}

function CorrectSpellingProps({ block }: { block: CorrectSpellingBlock | CorrectNumbersBlock | MissingLettersBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");
  const tc = useTranslations("common");
  const isNumberBlock = block.type === "correct-numbers";
  const legacyDisplayCount = block.displayCount ?? 10;
  const legacyKeepLeftCharacters = "keepFirstLetter" in block && block.keepFirstLetter ? 1 : 0;
  const legacyKeepRightCharacters = "keepLastLetter" in block && block.keepLastLetter ? 1 : 0;
  const keepLeftCharacters = block.keepLeftCharacters ?? legacyKeepLeftCharacters;
  const keepRightCharacters = block.keepRightCharacters ?? legacyKeepRightCharacters;
  const [csvText, setCsvText] = React.useState("");
  const [csvError, setCsvError] = React.useState<string | null>(null);
  const [csvMode, setCsvMode] = React.useState<"replace" | "append">("replace");

  const updateKeepCounts = (updates: { keepLeftCharacters?: number; keepRightCharacters?: number }) => {
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          keepLeftCharacters: updates.keepLeftCharacters ?? keepLeftCharacters,
          keepRightCharacters: updates.keepRightCharacters ?? keepRightCharacters,
          keepFirstLetter: undefined,
          keepLastLetter: undefined,
        },
      },
    });
  };

  const updateWord = (index: number, word: string) => {
    const newWords = [...block.words];
    newWords[index] = { ...newWords[index], word };
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { words: newWords } },
    });
  };

  const addWord = () => {
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          words: [...block.words, { id: `cs${Date.now()}`, word: isNumberBlock ? "074 123 45 67" : "word", displayCount: legacyDisplayCount }],
        },
      },
    });
  };

  const removeWord = (index: number) => {
    if (block.words.length <= 1) return;
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: { words: block.words.filter((_, i) => i !== index) },
      },
    });
  };

  const shuffleWords = () => {
    const lockedExampleId = block.showFirstAsExample ? block.words[0]?.id : undefined;
    const ids = block.words.filter((word) => word.id !== lockedExampleId).map((word) => word.id);
    const shuffled = [...ids];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { itemOrder: shuffled } },
    });
  };

  const handleCsvImport = () => {
    setCsvError(null);
    const lines = csvText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      setCsvError(t("csvNoData"));
      return;
    }

    const importedWords = lines.map((word, index) => ({
      id: `cs${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
      word,
      displayCount: legacyDisplayCount,
    }));

    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          words: csvMode === "append" ? [...block.words, ...importedWords] : importedWords,
          ...(csvMode === "replace" ? { itemOrder: undefined } : {}),
        },
      },
    });
    setCsvText("");
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("instruction")}</Label>
        <ChInput
          blockId={block.id}
          fieldPath="instruction"
          baseValue={block.instruction}
          onBaseChange={(v) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { instruction: v } },
            })
          }
        />
      </div>
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("keepFirstLetter")}</Label>
        <Input
          type="number"
          min={0}
          value={String(keepLeftCharacters)}
          onChange={(e) => {
            const value = Number(e.target.value);
            updateKeepCounts({ keepLeftCharacters: Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0 });
          }}
          className="h-8 text-xs"
        />
      </div>
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("keepLastLetter")}</Label>
        <Input
          type="number"
          min={0}
          value={String(keepRightCharacters)}
          onChange={(e) => {
            const value = Number(e.target.value);
            updateKeepCounts({ keepRightCharacters: Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0 });
          }}
          className="h-8 text-xs"
        />
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-sm">{t("showFirstAsExample")}</Label>
        <Switch
          checked={!!block.showFirstAsExample}
          onCheckedChange={(checked) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { showFirstAsExample: checked } },
            })
          }
        />
      </div>
      {isNumberBlock ? (
        <div className="flex items-center justify-between">
          <Label className="text-sm">{t("equalItemWidth")}</Label>
          <Switch
            checked={!!block.equalItemWidth}
            onCheckedChange={(checked) =>
              dispatch({
                type: "UPDATE_BLOCK",
                payload: { id: block.id, updates: { equalItemWidth: checked } },
              })
            }
          />
        </div>
      ) : null}
      <Separator />
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("csvImport")}</Label>
        <p className="text-xs text-muted-foreground mb-1">
          {t("spellingWordsCsvImportHelp")}
        </p>
        <textarea
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[80px] resize-y"
          placeholder={isNumberBlock ? t("correctNumbersCsvPlaceholder") : t("spellingWordsCsvPlaceholder")}
          value={csvText}
          onChange={(e) => {
            setCsvText(e.target.value);
            setCsvError(null);
          }}
        />
        {csvError && (
          <p className="text-xs text-destructive mt-1">{csvError}</p>
        )}
        <div className="flex gap-1 mt-1">
          <Select
            value={csvMode}
            onValueChange={(value) => setCsvMode(value as "replace" | "append")}
          >
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="replace">{t("csvReplace")}</SelectItem>
              <SelectItem value="append">{t("csvAppend")}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="flex-1" onClick={handleCsvImport} disabled={!csvText.trim()}>
            {t("csvImportButton")}
          </Button>
        </div>
      </div>
      <Separator />
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("words")}</Label>
        {block.words.map((item, i) => (
          <div key={item.id} className="flex items-center gap-1">
            <div className="flex-1">
              <ChInput
                blockId={block.id}
                fieldPath={`words.${i}.word`}
                baseValue={item.word}
                onBaseChange={(v) => updateWord(i, v)}
                className="h-8 text-xs"
              />
            </div>
            <Input
              type="number"
              min={1}
              max={20}
              value={String(item.displayCount ?? legacyDisplayCount)}
              onChange={(e) => {
                const value = Number(e.target.value);
                const nextDisplayCount = Number.isFinite(value) ? Math.max(1, Math.min(20, value)) : legacyDisplayCount;
                const newWords = [...block.words];
                newWords[i] = { ...newWords[i], displayCount: nextDisplayCount };
                dispatch({
                  type: "UPDATE_BLOCK",
                  payload: { id: block.id, updates: { words: newWords } },
                });
              }}
              className="h-8 w-20 text-xs"
              aria-label={t("displayCount")}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => removeWord(i)}
              disabled={block.words.length <= 1}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addWord} className="w-full">
          <Plus className="h-3.5 w-3.5 mr-1" /> {t("addWord")}
        </Button>
        <Button variant="outline" size="sm" onClick={shuffleWords} className="w-full">
          <Shuffle className="h-3.5 w-3.5 mr-1" /> {t("shuffleItems")}
        </Button>
      </div>
    </div>
  );
}

function FixSentencesProps({ block }: { block: FixSentencesBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");
  const tc = useTranslations("common");

  const updateSentence = (index: number, sentence: string) => {
    const newSentences = [...block.sentences];
    newSentences[index] = { ...newSentences[index], sentence };
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { sentences: newSentences } },
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
            { id: `fs${Date.now()}`, sentence: "Part A | Part B | Part C" },
          ],
        },
      },
    });
  };

  const removeSentence = (index: number) => {
    if (block.sentences.length <= 1) return;
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          sentences: block.sentences.filter((_, i) => i !== index),
        },
      },
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("instruction")}</Label>
        <ChInput
          blockId={block.id}
          fieldPath="instruction"
          baseValue={block.instruction}
          onBaseChange={(v) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { instruction: v } },
            })
          }
        />
      </div>
      <Separator />
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("sentences")}</Label>
        <p className="text-xs text-muted-foreground">
          {t("fixSentencesHelp")}
        </p>
        {block.sentences.map((item, i) => (
          <div key={item.id} className="flex items-center gap-1">
            <div className="flex-1">
              <ChInput
                blockId={block.id}
                fieldPath={`sentences.${i}.sentence`}
                baseValue={item.sentence}
                onBaseChange={(v) => updateSentence(i, v)}
                className="h-8 text-xs font-mono"
                placeholder={t("fixSentencePlaceholder")}
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => removeSentence(i)}
              disabled={block.sentences.length <= 1}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addSentence} className="w-full">
          <Plus className="h-3.5 w-3.5 mr-1" /> {t("addSentence")}
        </Button>
      </div>
      <Separator />
      <div className="flex items-center justify-between">
        <Label className="text-sm">{t("showFirstAsExample")}</Label>
        <Switch
          checked={!!block.showFirstAsExample}
          onCheckedChange={(checked) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { showFirstAsExample: checked } },
            })
          }
        />
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-sm">{t("hideSolutionsInSolutionRender")}</Label>
        <Switch
          checked={!!block.hideSolutionsInSolutionRender}
          onCheckedChange={(checked) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { hideSolutionsInSolutionRender: checked } },
            })
          }
        />
      </div>
    </div>
  );
}

function CompleteSentencesProps({ block }: { block: CompleteSentencesBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");
  const tc = useTranslations("common");
  const [csvText, setCsvText] = React.useState("");
  const [csvError, setCsvError] = React.useState<string | null>(null);
  const [csvMode, setCsvMode] = React.useState<"replace" | "append">("replace");

  const handleCsvImport = () => {
    setCsvError(null);
    const text = csvText.trim();
    if (!text) return;

    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length === 0) {
      setCsvError(t("csvNoData"));
      return;
    }

    const newSentences = lines.map((line, i) => ({
      id: `cs${Date.now()}-${i}`,
      beginning: line.trim(),
    }));

    const sentences = csvMode === "append"
      ? [...block.sentences, ...newSentences]
      : newSentences;

    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { sentences } },
    });
    setCsvText("");
  };

  const updateSentence = (index: number, beginning: string) => {
    const newSentences = [...block.sentences];
    newSentences[index] = { ...newSentences[index], beginning };
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { sentences: newSentences } },
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
            { id: `cs${Date.now()}`, beginning: "" },
          ],
        },
      },
    });
  };

  const removeSentence = (index: number) => {
    if (block.sentences.length <= 1) return;
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          sentences: block.sentences.filter((_, i) => i !== index),
        },
      },
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("instruction")}</Label>
        <ChInput
          blockId={block.id}
          fieldPath="instruction"
          baseValue={block.instruction}
          onBaseChange={(v) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { instruction: v } },
            })
          }
        />
      </div>
      <Separator />
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("sentences")}</Label>
        <p className="text-xs text-muted-foreground">
          {t("completeSentencesHelp")}
        </p>
        {block.sentences.map((item, i) => (
          <div key={item.id} className="flex items-center gap-1">
            <div className="flex-1">
              <ChInput
                blockId={block.id}
                fieldPath={`sentences.${i}.beginning`}
                baseValue={item.beginning}
                onBaseChange={(v) => updateSentence(i, v)}
                className="h-8 text-xs"
                placeholder={t("completeSentencePlaceholder")}
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => removeSentence(i)}
              disabled={block.sentences.length <= 1}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addSentence} className="w-full">
          <Plus className="h-3.5 w-3.5 mr-1" /> {t("addSentence")}
        </Button>
      </div>
      <Separator />
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("csvImport")}</Label>
        <p className="text-xs text-muted-foreground mb-1">
          {t("csvImportHelpCompleteSentences")}
        </p>
        <textarea
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[80px] resize-y"
          placeholder={t("csvImportPlaceholderCompleteSentences")}
          value={csvText}
          onChange={(e) => {
            setCsvText(e.target.value);
            setCsvError(null);
          }}
        />
        {csvError && (
          <p className="text-xs text-destructive mt-1">{csvError}</p>
        )}
        <div className="flex gap-1 mt-1">
          <Select
            value={csvMode}
            onValueChange={(v) => setCsvMode(v as "replace" | "append")}
          >
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="replace">{t("csvReplace")}</SelectItem>
              <SelectItem value="append">{t("csvAppend")}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleCsvImport}
            disabled={!csvText.trim()}
          >
            <Upload className="h-4 w-4 mr-2" />
            {t("csvImportButton")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function StartSentencesProps({ block }: { block: StartSentencesBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");
  const tc = useTranslations("common");
  const [csvText, setCsvText] = React.useState("");
  const [csvError, setCsvError] = React.useState<string | null>(null);
  const [csvMode, setCsvMode] = React.useState<"replace" | "append">("replace");

  const handleCsvImport = () => {
    setCsvError(null);
    const text = csvText.trim();
    if (!text) return;

    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length === 0) {
      setCsvError(t("csvNoData"));
      return;
    }

    const newSentences = lines.map((line, i) => {
      const sep = line.includes("\t") ? "\t" : line.includes(";") ? ";" : ",";
      const parts = line.split(sep).map((p) => p.trim());
      return {
        id: `ss${Date.now()}-${i}`,
        beginning: parts[0],
        ...(parts[1] ? { ending: parts[1] } : {}),
      };
    });

    const sentences = csvMode === "append"
      ? [...block.sentences, ...newSentences]
      : newSentences;

    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { sentences } },
    });
    setCsvText("");
  };

  const updateSentence = (index: number, beginning: string) => {
    const newSentences = [...block.sentences];
    newSentences[index] = { ...newSentences[index], beginning };
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { sentences: newSentences } },
    });
  };

  const updateEnding = (index: number, ending: string) => {
    const newSentences = [...block.sentences];
    newSentences[index] = { ...newSentences[index], ending };
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { sentences: newSentences } },
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
            { id: `ss${Date.now()}`, beginning: "" },
          ],
        },
      },
    });
  };

  const removeSentence = (index: number) => {
    if (block.sentences.length <= 1) return;
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          sentences: block.sentences.filter((_, i) => i !== index),
        },
      },
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("instruction")}</Label>
        <ChInput
          blockId={block.id}
          fieldPath="instruction"
          baseValue={block.instruction}
          onBaseChange={(v) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { instruction: v } },
            })
          }
        />
      </div>
      <Separator />
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("sentences")}</Label>
        <p className="text-xs text-muted-foreground">
          {t("startSentencesHelp")}
        </p>
        {block.sentences.map((item, i) => (
          <div key={item.id} className="flex items-start gap-1">
            <div className="flex-1 space-y-1">
              <ChInput
                blockId={block.id}
                fieldPath={`sentences.${i}.beginning`}
                baseValue={item.beginning}
                onBaseChange={(v) => updateSentence(i, v)}
                className="h-8 text-xs"
                placeholder={t("startSentencePlaceholder")}
              />
              <ChInput
                blockId={block.id}
                fieldPath={`sentences.${i}.ending`}
                baseValue={item.ending ?? ""}
                onBaseChange={(v) => updateEnding(i, v)}
                className="h-8 text-xs"
                placeholder={t("startSentenceEndingPlaceholder")}
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => removeSentence(i)}
              disabled={block.sentences.length <= 1}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addSentence} className="w-full">
          <Plus className="h-3.5 w-3.5 mr-1" /> {t("addSentence")}
        </Button>
      </div>
      <Separator />
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("csvImport")}</Label>
        <p className="text-xs text-muted-foreground mb-1">
          {t("csvImportHelpStartSentences")}
        </p>
        <textarea
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[80px] resize-y"
          placeholder={t("csvImportPlaceholderStartSentences")}
          value={csvText}
          onChange={(e) => {
            setCsvText(e.target.value);
            setCsvError(null);
          }}
        />
        {csvError && (
          <p className="text-xs text-destructive mt-1">{csvError}</p>
        )}
        <div className="flex gap-1 mt-1">
          <Select
            value={csvMode}
            onValueChange={(v) => setCsvMode(v as "replace" | "append")}
          >
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="replace">{t("csvReplace")}</SelectItem>
              <SelectItem value="append">{t("csvAppend")}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleCsvImport}
            disabled={!csvText.trim()}
          >
            <Upload className="h-4 w-4 mr-2" />
            {t("csvImportButton")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function TransformSentencesProps({ block }: { block: TransformSentencesBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");
  const tc = useTranslations("common");
  const { upload } = useUpload();
  const [csvText, setCsvText] = React.useState("");
  const [csvError, setCsvError] = React.useState<string | null>(null);
  const [csvMode, setCsvMode] = React.useState<"replace" | "append">("replace");
  const [browserOpen, setBrowserOpen] = React.useState(false);
  const [cropOpen, setCropOpen] = React.useState(false);
  const [cropSrc, setCropSrc] = React.useState<string | null>(null);
  const [activeSentenceIndex, setActiveSentenceIndex] = React.useState<number | null>(null);
  const [uploadingSentenceIndex, setUploadingSentenceIndex] = React.useState<number | null>(null);

  const handleCsvImport = () => {
    setCsvError(null);
    const text = csvText.trim();
    if (!text) return;
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length === 0) {
      setCsvError(t("csvNoData"));
      return;
    }
    const newSentences = lines.map((line, i) => {
      const sep = line.includes("\t") ? "\t" : line.includes(";") ? ";" : ",";
      const parts = line.split(sep).map((p) => p.trim());
      return {
        id: `ts${Date.now()}-${i}`,
        beginning: parts[0],
        ...(parts[1] ? { solution: parts[1] } : {}),
      };
    });
    const sentences = csvMode === "append"
      ? [...block.sentences, ...newSentences]
      : newSentences;
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { sentences } },
    });
    setCsvText("");
  };

  const updateSentence = (index: number, updates: Partial<{ beginning: string; solution: string; src?: string }>) => {
    const newSentences = [...block.sentences];
    newSentences[index] = { ...newSentences[index], ...updates };
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { sentences: newSentences } },
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
            { id: `ts${Date.now()}`, beginning: "" },
          ],
        },
      },
    });
  };

  const removeSentence = (index: number) => {
    if (block.sentences.length <= 1) return;
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          sentences: block.sentences.filter((_, i) => i !== index),
        },
      },
    });
  };

  const moveSentence = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= block.sentences.length) return;
    const newSentences = [...block.sentences];
    [newSentences[index], newSentences[newIndex]] = [newSentences[newIndex], newSentences[index]];
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: { sentences: newSentences },
      },
    });
  };

  const handleFileSelected = (index: number, file: File) => {
    if (!file.type.startsWith("image/")) return;
    const objectUrl = URL.createObjectURL(file);
    setActiveSentenceIndex(index);
    setCropSrc(objectUrl);
    setCropOpen(true);
  };

  const handleCropComplete = async (result: CropResult) => {
    if (activeSentenceIndex === null) {
      URL.revokeObjectURL(result.url);
      return;
    }

    setUploadingSentenceIndex(activeSentenceIndex);
    try {
      const file = new File([result.blob], "transform-sentence-image.png", { type: "image/png" });
      const uploadResult = await upload(file);
      updateSentence(activeSentenceIndex, { src: uploadResult.url });
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setUploadingSentenceIndex(null);
      setActiveSentenceIndex(null);
      if (cropSrc) {
        URL.revokeObjectURL(cropSrc);
      }
      URL.revokeObjectURL(result.url);
      setCropSrc(null);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("instruction")}</Label>
        <ChInput
          blockId={block.id}
          fieldPath="instruction"
          baseValue={block.instruction}
          onBaseChange={(v) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { instruction: v } },
            })
          }
        />
      </div>
      <Separator />
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("sentences")}</Label>
        <p className="text-xs text-muted-foreground">
          {t("transformSentencesHelp")}
        </p>
        {block.sentences.map((item, i) => (
          <div key={item.id} className="space-y-1">
            <div className="flex items-center gap-1">
              <div className="flex-1">
                <ChInput
                  blockId={block.id}
                  fieldPath={`sentences.${i}.beginning`}
                  baseValue={item.beginning}
                  onBaseChange={(v) => updateSentence(i, { beginning: v })}
                  className="h-8 text-xs"
                  placeholder={t("transformSentencePlaceholder")}
                />
              </div>
              <div className="flex flex-col">
                <button
                  className="p-0 h-3 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  onClick={() => moveSentence(i, -1)}
                  disabled={i === 0}
                >
                  <ArrowUpDown className="h-2.5 w-2.5 rotate-180" />
                </button>
                <button
                  className="p-0 h-3 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  onClick={() => moveSentence(i, 1)}
                  disabled={i === block.sentences.length - 1}
                >
                  <ArrowUpDown className="h-2.5 w-2.5" />
                </button>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => removeSentence(i)}
                disabled={block.sentences.length <= 1}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            <div className="pl-1">
              <ChInput
                blockId={block.id}
                fieldPath={`sentences.${i}.solution`}
                baseValue={item.solution ?? ""}
                onBaseChange={(v) => updateSentence(i, { solution: v || undefined })}
                className="h-7 text-xs text-muted-foreground"
                placeholder={t("transformSentenceSolutionPlaceholder")}
              />
            </div>
            <div className="pl-1 space-y-2 rounded-md border border-slate-200 p-2">
              <Label className="text-[11px] font-medium text-slate-600">{t("imageUrl")}</Label>
              {item.src ? (
                <div className="space-y-2">
                  <div className="relative group/img h-20 w-28 overflow-hidden rounded-sm border bg-slate-50">
                    <Image src={item.src} alt="" fill unoptimized className="object-contain p-1" />
                    <button
                      type="button"
                      onClick={() => updateSentence(i, { src: undefined })}
                      className="absolute top-1 right-1 opacity-0 group-hover/img:opacity-100 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-opacity"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="flex gap-1">
                    <label className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleFileSelected(i, file);
                            e.currentTarget.value = "";
                          }
                        }}
                      />
                      <span className="inline-flex h-8 w-full cursor-pointer items-center justify-center rounded-md border border-input bg-background px-3 text-xs font-medium shadow-sm hover:bg-accent hover:text-accent-foreground">
                        {uploadingSentenceIndex === i ? t("uploading") : t("replaceImage")}
                      </span>
                    </label>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => {
                        setActiveSentenceIndex(i);
                        setBrowserOpen(true);
                      }}
                    >
                      <ImagePlus className="h-3.5 w-3.5 mr-1" />
                      {t("mediaBrowser")}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="flex h-20 cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-slate-200 px-3 text-center transition-colors hover:border-slate-300">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleFileSelected(i, file);
                          e.currentTarget.value = "";
                        }
                      }}
                    />
                    {uploadingSentenceIndex === i ? (
                      <span className="text-xs text-muted-foreground">{t("uploading")}</span>
                    ) : (
                      <>
                        <Upload className="h-5 w-5 text-muted-foreground/50 mb-1" />
                        <span className="text-xs text-muted-foreground">{t("textImageDragOrClick")}</span>
                      </>
                    )}
                  </label>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => {
                      setActiveSentenceIndex(i);
                      setBrowserOpen(true);
                    }}
                  >
                    <ImagePlus className="h-3.5 w-3.5 mr-1" />
                    {t("mediaBrowser")}
                  </Button>
                </div>
              )}
              <Input
                value={item.src ?? ""}
                placeholder={t("imageUrlPlaceholder")}
                onChange={(e) => updateSentence(i, { src: e.target.value || undefined })}
                className="h-8 text-xs"
              />
            </div>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addSentence} className="w-full">
          <Plus className="h-3.5 w-3.5 mr-1" /> {t("addSentence")}
        </Button>
      </div>
      <Separator />
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("csvImport")}</Label>
        <p className="text-xs text-muted-foreground mb-1">
          {t("csvImportHelpTransformSentences")}
        </p>
        <textarea
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[80px] resize-y"
          placeholder={t("csvImportPlaceholderTransformSentences")}
          value={csvText}
          onChange={(e) => {
            setCsvText(e.target.value);
            setCsvError(null);
          }}
        />
        {csvError && (
          <p className="text-xs text-destructive mt-1">{csvError}</p>
        )}
        <div className="flex gap-1 mt-1">
          <Select
            value={csvMode}
            onValueChange={(v) => setCsvMode(v as "replace" | "append")}
          >
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="replace">{t("csvReplace")}</SelectItem>
              <SelectItem value="append">{t("csvAppend")}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleCsvImport}
            disabled={!csvText.trim()}
          >
            <Upload className="h-4 w-4 mr-2" />
            {t("csvImportButton")}
          </Button>
        </div>
      </div>
      <Separator />
      <div className="flex items-center justify-between">
        <Label className="text-sm">{t("showFirstAsExample")}</Label>
        <Switch
          checked={!!block.showFirstAsExample}
          onCheckedChange={(checked) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { showFirstAsExample: checked } },
            })
          }
        />
      </div>

      <MediaBrowserDialog
        open={browserOpen}
        onOpenChange={setBrowserOpen}
        onSelectUrl={(url) => {
          if (activeSentenceIndex === null) return;
          updateSentence(activeSentenceIndex, { src: url });
          setBrowserOpen(false);
          setActiveSentenceIndex(null);
        }}
        onSelectFile={(file) => {
          if (activeSentenceIndex === null) return;
          handleFileSelected(activeSentenceIndex, file);
          setBrowserOpen(false);
        }}
      />

      <ImageCropDialog
        imageSrc={cropSrc}
        open={cropOpen}
        onOpenChange={(open) => {
          setCropOpen(open);
          if (!open) {
            if (cropSrc) {
              URL.revokeObjectURL(cropSrc);
            }
            setCropSrc(null);
            setActiveSentenceIndex(null);
          }
        }}
        onCropComplete={handleCropComplete}
        title={t("cropImage")}
      />
    </div>
  );
}

function ReadingComprehensionProps({ block }: { block: ReadingComprehensionBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");
  const tc = useTranslations("common");
  const { upload } = useUpload();
  const [csvText, setCsvText] = React.useState("");
  const [csvError, setCsvError] = React.useState<string | null>(null);
  const [csvMode, setCsvMode] = React.useState<"replace" | "append">("replace");
  const [browserOpen, setBrowserOpen] = React.useState(false);
  const [cropOpen, setCropOpen] = React.useState(false);
  const [cropSrc, setCropSrc] = React.useState<string | null>(null);
  const [activeSentenceIndex, setActiveSentenceIndex] = React.useState<number | null>(null);
  const [uploadingSentenceIndex, setUploadingSentenceIndex] = React.useState<number | null>(null);
  const isTrueFalseLayout = block.layoutType === "true-false";
  const isPrefilledFormLayout = block.layoutType === "prefilled-form";
  const isFormLayout = block.layoutType === "form" || isPrefilledFormLayout;
  const formFieldLabels = block.formFieldLabels && block.formFieldLabels.length > 0 ? block.formFieldLabels : [""];
  const formColumns = String(block.formColumns ?? 2);

  const handleCsvImport = () => {
    setCsvError(null);
    const text = csvText.trim();
    if (!text) return;
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length === 0) {
      setCsvError(t("csvNoData"));
      return;
    }
    const newSentences = lines.map((line, i) => {
      const sep = line.includes("\t") ? "\t" : line.includes(";") ? ";" : ",";
      const parts = line.split(sep).map((p) => p.trim());
      if (isTrueFalseLayout) {
        const answer = (parts[parts.length - 1] || "").toUpperCase();
        const hasAnswer = ["R", "T", "W", "F"].includes(answer);
        return {
          id: `rc${Date.now()}-${i}`,
          question: hasAnswer ? parts.slice(0, -1).join(sep === "\t" ? " " : ", ").trim() : line.trim(),
          beginning: "",
          correctAnswer: answer === "R" || answer === "T",
        };
      }
      return {
        id: `rc${Date.now()}-${i}`,
        question: parts[0] || "",
        beginning: isFormLayout ? "" : (parts[1] || ""),
        ...(isFormLayout
          ? { fieldValues: parts.slice(1, 1 + formFieldLabels.length) }
          : parts[2]
            ? { solution: parts[2] }
            : {}),
      };
    });
    const sentences = csvMode === "append"
      ? [...block.sentences, ...newSentences]
      : newSentences;
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { sentences } },
    });
    setCsvText("");
  };

  const updateSentence = (index: number, updates: Partial<{ question: string; beginning: string; solution: string; src?: string; fieldValues: string[]; correctAnswer: boolean }>) => {
    const newSentences = [...block.sentences];
    newSentences[index] = { ...newSentences[index], ...updates };
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { sentences: newSentences } },
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
            { id: `rc${Date.now()}`, question: "", beginning: "", correctAnswer: true, fieldValues: formFieldLabels.map(() => "") },
          ],
        },
      },
    });
  };

  const updateFieldLabel = (index: number, value: string) => {
    const nextLabels = [...formFieldLabels];
    nextLabels[index] = value;
    const nextSentences = block.sentences.map((item) => {
      const nextValues = [...(item.fieldValues ?? [])];
      while (nextValues.length < nextLabels.length) nextValues.push("");
      return { ...item, fieldValues: nextValues.slice(0, nextLabels.length) };
    });
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { formFieldLabels: nextLabels, sentences: nextSentences } },
    });
  };

  const addFieldLabel = () => {
    const nextLabels = [...formFieldLabels, ""];
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          formFieldLabels: nextLabels,
          sentences: block.sentences.map((item) => ({
            ...item,
            fieldValues: [...(item.fieldValues ?? []), ""],
          })),
        },
      },
    });
  };

  const removeFieldLabel = (index: number) => {
    if (formFieldLabels.length <= 1) return;
    const nextLabels = formFieldLabels.filter((_, i) => i !== index);
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          formFieldLabels: nextLabels,
          sentences: block.sentences.map((item) => ({
            ...item,
            fieldValues: (item.fieldValues ?? []).filter((_, i) => i !== index),
          })),
        },
      },
    });
  };

  const updateFieldValue = (sentenceIndex: number, fieldIndex: number, value: string) => {
    const nextValues = [...(block.sentences[sentenceIndex].fieldValues ?? formFieldLabels.map(() => ""))];
    while (nextValues.length < formFieldLabels.length) nextValues.push("");
    nextValues[fieldIndex] = value;
    updateSentence(sentenceIndex, { fieldValues: nextValues });
  };

  const removeSentence = (index: number) => {
    if (block.sentences.length <= 1) return;
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          sentences: block.sentences.filter((_, i) => i !== index),
        },
      },
    });
  };

  const moveSentence = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= block.sentences.length) return;
    const newSentences = [...block.sentences];
    [newSentences[index], newSentences[newIndex]] = [newSentences[newIndex], newSentences[index]];
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: { sentences: newSentences },
      },
    });
  };

  const handleFileSelected = (index: number, file: File) => {
    if (!file.type.startsWith("image/")) return;
    const objectUrl = URL.createObjectURL(file);
    setActiveSentenceIndex(index);
    setCropSrc(objectUrl);
    setCropOpen(true);
  };

  const handleCropComplete = async (result: CropResult) => {
    if (activeSentenceIndex === null) {
      URL.revokeObjectURL(result.url);
      return;
    }

    setUploadingSentenceIndex(activeSentenceIndex);
    try {
      const file = new File([result.blob], "reading-comprehension-image.png", { type: "image/png" });
      const uploadResult = await upload(file);
      updateSentence(activeSentenceIndex, { src: uploadResult.url });
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setUploadingSentenceIndex(null);
      setActiveSentenceIndex(null);
      if (cropSrc) {
        URL.revokeObjectURL(cropSrc);
      }
      URL.revokeObjectURL(result.url);
      setCropSrc(null);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("instruction")}</Label>
        <ChInput
          blockId={block.id}
          fieldPath="instruction"
          baseValue={block.instruction}
          onBaseChange={(v) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { instruction: v } },
            })
          }
        />
      </div>
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("readingComprehensionType")}</Label>
        <Select
          value={block.layoutType ?? "default"}
          onValueChange={(value) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: {
                id: block.id,
                updates: {
                  layoutType: value as "default" | "form" | "prefilled-form" | "true-false",
                  formFieldLabels: block.formFieldLabels && block.formFieldLabels.length > 0 ? block.formFieldLabels : [""],
                  formColumns: block.formColumns ?? 2,
                  sentences: block.sentences.map((item) => ({
                    ...item,
                    correctAnswer: item.correctAnswer ?? true,
                    fieldValues: item.fieldValues ?? formFieldLabels.map(() => ""),
                  })),
                },
              },
            })
          }
        >
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">{t("readingComprehensionTypeDefault")}</SelectItem>
            <SelectItem value="form">{t("readingComprehensionTypeForm")}</SelectItem>
            <SelectItem value="prefilled-form">{t("readingComprehensionTypePrefilledForm")}</SelectItem>
            <SelectItem value="true-false">{t("readingComprehensionTypeTrueFalse")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-sm">{t("readingComprehensionLetterItemNumbering")}</Label>
        <Switch
          checked={!!block.letterItemNumbering}
          onCheckedChange={(checked) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { letterItemNumbering: checked } },
            })
          }
        />
      </div>
      {block.letterItemNumbering ? (
        <div className="flex items-center justify-between">
          <Label className="text-sm">{t("continueNumbering")}</Label>
          <Switch
            checked={!!block.continueNumbering}
            onCheckedChange={(checked) =>
              dispatch({
                type: "UPDATE_BLOCK",
                payload: { id: block.id, updates: { continueNumbering: checked } },
              })
            }
          />
        </div>
      ) : null}
      {isTrueFalseLayout && (
        <>
          <div>
            <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("readingComprehensionReadingText")}</Label>
            <textarea
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[120px] resize-y"
              value={block.readingText ?? ""}
              placeholder={t("readingComprehensionReadingTextPlaceholder")}
              onChange={(e) =>
                dispatch({
                  type: "UPDATE_BLOCK",
                  payload: { id: block.id, updates: { readingText: e.target.value } },
                })
              }
            />
          </div>
          <div>
            <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("columnLabels")}</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">{t("trueLabelProp")}</Label>
                <Input
                  className="h-8 text-xs"
                  placeholder={tc("true")}
                  value={block.trueLabel || ""}
                  onChange={(e) =>
                    dispatch({
                      type: "UPDATE_BLOCK",
                      payload: { id: block.id, updates: { trueLabel: e.target.value } },
                    })
                  }
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">{t("falseLabelProp")}</Label>
                <Input
                  className="h-8 text-xs"
                  placeholder={tc("false")}
                  value={block.falseLabel || ""}
                  onChange={(e) =>
                    dispatch({
                      type: "UPDATE_BLOCK",
                      payload: { id: block.id, updates: { falseLabel: e.target.value } },
                    })
                  }
                />
              </div>
            </div>
          </div>
        </>
      )}
      <Separator />
      {isFormLayout && (
        <>
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("readingComprehensionFieldLabels")}</Label>
            {formFieldLabels.map((label, index) => (
              <div key={index} className="flex items-center gap-1">
                <Input
                  value={label}
                  onChange={(e) => updateFieldLabel(index, e.target.value)}
                  className="h-8 text-xs"
                  placeholder={`${tc("fieldLabel")} ${index + 1}`}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => removeFieldLabel(index)}
                  disabled={formFieldLabels.length <= 1}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addFieldLabel} className="w-full">
              <Plus className="h-3.5 w-3.5 mr-1" /> {tc("addField")}
            </Button>
          </div>
          <div>
            <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("columns")}</Label>
            <Select
              value={formColumns}
              onValueChange={(value) =>
                dispatch({
                  type: "UPDATE_BLOCK",
                  payload: { id: block.id, updates: { formColumns: Number(value) as 1 | 2 | 3 | 4 } },
                })
              }
            >
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="2">2</SelectItem>
                <SelectItem value="3">3</SelectItem>
                <SelectItem value="4">4</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Separator />
        </>
      )}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("sentences")}</Label>
        <p className="text-xs text-muted-foreground">{t(isTrueFalseLayout ? "readingComprehensionTrueFalseHelp" : isPrefilledFormLayout ? "readingComprehensionPrefilledFormHelp" : isFormLayout ? "readingComprehensionFormHelp" : "readingComprehensionHelp")}</p>
        {block.sentences.map((item, i) => (
          <div key={item.id} className="space-y-1">
            <div className="pl-1">
              <ChInput
                blockId={block.id}
                fieldPath={`sentences.${i}.question`}
                baseValue={item.question}
                onBaseChange={(v) => updateSentence(i, { question: v })}
                className="h-8 text-xs"
                placeholder={tc("question")}
              />
            </div>
            {isTrueFalseLayout ? (
              <>
                <div className="flex items-center gap-1">
                  <div className="flex-1" />
                  <div className="flex items-center gap-1 rounded-md border border-input bg-background p-1">
                    <Button
                      type="button"
                      variant={item.correctAnswer === false ? "ghost" : "secondary"}
                      size="sm"
                      className="h-6 px-2 text-[11px]"
                      onClick={() => updateSentence(i, { correctAnswer: true })}
                    >
                      {tc("true")}
                    </Button>
                    <Button
                      type="button"
                      variant={item.correctAnswer === false ? "secondary" : "ghost"}
                      size="sm"
                      className="h-6 px-2 text-[11px]"
                      onClick={() => updateSentence(i, { correctAnswer: false })}
                    >
                      {tc("false")}
                    </Button>
                  </div>
                  <div className="flex flex-col">
                    <button className="p-0 h-3 text-muted-foreground hover:text-foreground disabled:opacity-30" onClick={() => moveSentence(i, -1)} disabled={i === 0}>
                      <ArrowUpDown className="h-2.5 w-2.5 rotate-180" />
                    </button>
                    <button className="p-0 h-3 text-muted-foreground hover:text-foreground disabled:opacity-30" onClick={() => moveSentence(i, 1)} disabled={i === block.sentences.length - 1}>
                      <ArrowUpDown className="h-2.5 w-2.5" />
                    </button>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeSentence(i)} disabled={block.sentences.length <= 1}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </>
            ) : !isFormLayout ? (
              <>
                <div className="flex items-center gap-1">
                  <div className="flex-1">
                    <ChInput
                      blockId={block.id}
                      fieldPath={`sentences.${i}.beginning`}
                      baseValue={item.beginning}
                      onBaseChange={(v) => updateSentence(i, { beginning: v })}
                      className="h-8 text-xs"
                      placeholder={t("readingComprehensionBeginningPlaceholder")}
                    />
                  </div>
                  <div className="flex flex-col">
                    <button className="p-0 h-3 text-muted-foreground hover:text-foreground disabled:opacity-30" onClick={() => moveSentence(i, -1)} disabled={i === 0}>
                      <ArrowUpDown className="h-2.5 w-2.5 rotate-180" />
                    </button>
                    <button className="p-0 h-3 text-muted-foreground hover:text-foreground disabled:opacity-30" onClick={() => moveSentence(i, 1)} disabled={i === block.sentences.length - 1}>
                      <ArrowUpDown className="h-2.5 w-2.5" />
                    </button>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeSentence(i)} disabled={block.sentences.length <= 1}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <div className="pl-1">
                  <ChInput
                    blockId={block.id}
                    fieldPath={`sentences.${i}.solution`}
                    baseValue={item.solution ?? ""}
                    onBaseChange={(v) => updateSentence(i, { solution: v || undefined })}
                    className="h-7 text-xs text-muted-foreground"
                    placeholder={t("readingComprehensionSolutionPlaceholder")}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="grid gap-2 pl-1" style={{ gridTemplateColumns: `repeat(${Math.min(Number(formColumns), 2)}, minmax(0, 1fr))` }}>
                  {formFieldLabels.map((label, fieldIndex) => (
                    <div key={fieldIndex} className="space-y-1">
                      <Label className="text-[11px] font-medium text-slate-600">{label || `${tc("fieldLabel")} ${fieldIndex + 1}`}</Label>
                      <ChInput
                        blockId={block.id}
                        fieldPath={`sentences.${i}.fieldValues.${fieldIndex}`}
                        baseValue={item.fieldValues?.[fieldIndex] ?? ""}
                        onBaseChange={(v) => updateFieldValue(i, fieldIndex, v)}
                        className="h-8 text-xs"
                        placeholder={t(isPrefilledFormLayout ? "readingComprehensionPrefilledFieldValuePlaceholder" : "readingComprehensionFieldValuePlaceholder")}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <div className="flex-1" />
                  <div className="flex flex-col">
                    <button className="p-0 h-3 text-muted-foreground hover:text-foreground disabled:opacity-30" onClick={() => moveSentence(i, -1)} disabled={i === 0}>
                      <ArrowUpDown className="h-2.5 w-2.5 rotate-180" />
                    </button>
                    <button className="p-0 h-3 text-muted-foreground hover:text-foreground disabled:opacity-30" onClick={() => moveSentence(i, 1)} disabled={i === block.sentences.length - 1}>
                      <ArrowUpDown className="h-2.5 w-2.5" />
                    </button>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeSentence(i)} disabled={block.sentences.length <= 1}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </>
            )}
            <div className="pl-1 space-y-2 rounded-md border border-slate-200 p-2">
              <Label className="text-[11px] font-medium text-slate-600">{t("imageUrl")}</Label>
              {item.src ? (
                <div className="space-y-2">
                  <div className="relative group/img h-20 w-28 overflow-hidden rounded-sm border bg-slate-50">
                    <Image src={item.src} alt="" fill unoptimized className="object-contain p-1" />
                    <button
                      type="button"
                      onClick={() => updateSentence(i, { src: undefined })}
                      className="absolute top-1 right-1 opacity-0 group-hover/img:opacity-100 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-opacity"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="flex gap-1">
                    <label className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleFileSelected(i, file);
                            e.currentTarget.value = "";
                          }
                        }}
                      />
                      <span className="inline-flex h-8 w-full cursor-pointer items-center justify-center rounded-md border border-input bg-background px-3 text-xs font-medium shadow-sm hover:bg-accent hover:text-accent-foreground">
                        {uploadingSentenceIndex === i ? t("uploading") : t("replaceImage")}
                      </span>
                    </label>
                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => {
                      setActiveSentenceIndex(i);
                      setBrowserOpen(true);
                    }}>
                      <ImagePlus className="h-3.5 w-3.5 mr-1" />
                      {t("mediaBrowser")}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="flex h-20 cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-slate-200 px-3 text-center transition-colors hover:border-slate-300">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleFileSelected(i, file);
                          e.currentTarget.value = "";
                        }
                      }}
                    />
                    {uploadingSentenceIndex === i ? (
                      <span className="text-xs text-muted-foreground">{t("uploading")}</span>
                    ) : (
                      <>
                        <Upload className="h-5 w-5 text-muted-foreground/50 mb-1" />
                        <span className="text-xs text-muted-foreground">{t("textImageDragOrClick")}</span>
                      </>
                    )}
                  </label>
                  <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => {
                    setActiveSentenceIndex(i);
                    setBrowserOpen(true);
                  }}>
                    <ImagePlus className="h-3.5 w-3.5 mr-1" />
                    {t("mediaBrowser")}
                  </Button>
                </div>
              )}
              <Input value={item.src ?? ""} placeholder={t("imageUrlPlaceholder")} onChange={(e) => updateSentence(i, { src: e.target.value || undefined })} className="h-8 text-xs" />
            </div>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addSentence} className="w-full">
          <Plus className="h-3.5 w-3.5 mr-1" /> {t("addSentence")}
        </Button>
      </div>
      <Separator />
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("csvImport")}</Label>
        <p className="text-xs text-muted-foreground mb-1">{t(isTrueFalseLayout ? "csvImportHelpReadingComprehensionTrueFalse" : "csvImportHelpReadingComprehension")}</p>
        <textarea
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[80px] resize-y"
          placeholder={t(isTrueFalseLayout ? "csvImportPlaceholderReadingComprehensionTrueFalse" : "csvImportPlaceholderReadingComprehension")}
          value={csvText}
          onChange={(e) => {
            setCsvText(e.target.value);
            setCsvError(null);
          }}
        />
        {csvError && <p className="text-xs text-destructive mt-1">{csvError}</p>}
        <div className="flex gap-1 mt-1">
          <Select value={csvMode} onValueChange={(v) => setCsvMode(v as "replace" | "append")}>
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="replace">{t("csvReplace")}</SelectItem>
              <SelectItem value="append">{t("csvAppend")}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="flex-1" onClick={handleCsvImport} disabled={!csvText.trim()}>
            <Upload className="h-4 w-4 mr-2" />
            {t("csvImportButton")}
          </Button>
        </div>
      </div>
      <Separator />
      <div className="flex items-center justify-between">
        <Label className="text-sm">{t("showFirstAsExample")}</Label>
        <Switch
          checked={!!block.showFirstAsExample}
          onCheckedChange={(checked) => dispatch({
            type: "UPDATE_BLOCK",
            payload: { id: block.id, updates: { showFirstAsExample: checked } },
          })}
        />
      </div>

      <MediaBrowserDialog
        open={browserOpen}
        onOpenChange={setBrowserOpen}
        onSelectUrl={(url) => {
          if (activeSentenceIndex === null) return;
          updateSentence(activeSentenceIndex, { src: url });
          setBrowserOpen(false);
          setActiveSentenceIndex(null);
        }}
        onSelectFile={(file) => {
          if (activeSentenceIndex === null) return;
          handleFileSelected(activeSentenceIndex, file);
          setBrowserOpen(false);
        }}
      />
      <ImageCropDialog
        open={cropOpen}
        imageSrc={cropSrc}
        aspect={4 / 3}
        onOpenChange={(open) => {
          setCropOpen(open);
          if (!open) {
            if (cropSrc) {
              URL.revokeObjectURL(cropSrc);
            }
            setCropSrc(null);
            setActiveSentenceIndex(null);
          }
        }}
        onCropComplete={handleCropComplete}
        title={t("cropImage")}
      />
    </div>
  );
}

function VerbTableProps({ block }: { block: VerbTableBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");
  const [showAiModal, setShowAiModal] = React.useState(false);

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("verbTableVerb")}</Label>
        <Input
          value={block.verb}
          onChange={(e) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { verb: e.target.value } },
            })
          }
          placeholder={t("verbTableVerbPlaceholder")}
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch
          checked={block.splitConjugation ?? false}
          onCheckedChange={(v) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { splitConjugation: v } },
            })
          }
        />
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("splitConjugation")}</Label>
      </div>
      <div className="flex items-center gap-2">
        <Switch
          checked={block.showConjugations ?? false}
          onCheckedChange={(v) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { showConjugations: v } },
            })
          }
        />
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("showConjugations")}</Label>
      </div>
      <div className="flex items-center gap-2">
        <Switch
          checked={block.showInfinitive ?? true}
          onCheckedChange={(v) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { showInfinitive: v } },
            })
          }
        />
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("showInfinitive")}</Label>
      </div>
      {(block.showInfinitive ?? true) && (
        <div>
          <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("infinitiveOverride")}</Label>
          <Input
            value={block.infinitiveOverride ?? ""}
            onChange={(e) =>
              dispatch({
                type: "UPDATE_BLOCK",
                payload: { id: block.id, updates: { infinitiveOverride: e.target.value || undefined } },
              })
            }
            placeholder={t("infinitiveOverridePlaceholder")}
          />
        </div>
      )}
      <Separator />
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("aiGeneration")}</Label>
        <p className="text-xs text-muted-foreground mb-2">
          {t("autoGenerateVerbs")}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="w-full text-pink-700 border-pink-200 hover:bg-pink-50 hover:text-pink-800"
          onClick={() => setShowAiModal(true)}
        >
          <Sparkles className="h-4 w-4 mr-2" />
          {t("aiGenerate")}
        </Button>
      </div>
      <AiVerbTableModal open={showAiModal} onOpenChange={setShowAiModal} blockId={block.id} />
    </div>
  );
}

// ─── Dialogue Props ──────────────────────────────────────────
function DialogueProps({ block }: { block: DialogueBlock }) {
  const { state, dispatch } = useEditor();
  const t = useTranslations("properties");
  const tc = useTranslations("common");
  const brandSlug = state.brandProfile.slug || state.settings.brand || "edoomio";

  const renderSwitchRow = (
    label: string,
    checked: boolean,
    onCheckedChange: (checked: boolean) => void,
    options?: { withTopDivider?: boolean; withBottomBorder?: boolean }
  ) => (
    <>
      {options?.withTopDivider ? <Separator /> : null}
      <div
        className={`flex h-8 items-center justify-between ${options?.withBottomBorder === false ? "" : "border-b border-border"}`}
      >
        <Label className="text-sm">{label}</Label>
        <Switch checked={checked} onCheckedChange={onCheckedChange} />
      </div>
    </>
  );

  const renderIcon = (icon: DialogueSpeakerIcon) => {
    return <DialogueSpeakerIconGlyph icon={icon} brandSlug={brandSlug} className="w-4 h-4 inline-block object-contain" />;
  };

  const updateItem = (index: number, updates: Partial<DialogueItem>) => {
    const newItems = [...block.items];
    newItems[index] = { ...newItems[index], ...updates };
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: newItems } },
    });
  };

  const addItem = () => {
    const lastIcon = block.items.length > 0
      ? block.items[block.items.length - 1].icon
      : "triangle";
    const lastSpeaker = block.items.length > 0
      ? block.items[block.items.length - 1].speaker
      : "A";
    // Alternate between the last two distinct speakers
    const speakers = [...new Set(block.items.map((i) => i.speaker))];
    const nextSpeaker = speakers.length >= 2
      ? (lastSpeaker === speakers[0] ? speakers[1] : speakers[0])
      : String.fromCharCode(65 + speakers.length);
    const icons = [...new Set(block.items.map((i) => i.icon))];
    const lastIcons = block.items.map((i) => i.icon);
    const nextIcon = icons.length >= 2
      ? (lastIcon === icons[0] ? icons[1] : icons[0])
      : (DIALOGUE_SPEAKER_ICON_OPTIONS.find((o) => !icons.includes(o.value))?.value ?? "circle");

    const newItems = [
      ...block.items,
      {
        id: `dl${Date.now()}`,
        speaker: nextSpeaker,
        icon: nextIcon as DialogueSpeakerIcon,
        text: "",
      },
    ];
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: newItems } },
    });
  };

  const removeItem = (index: number) => {
    const newItems = block.items.filter((_, i) => i !== index);
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: newItems } },
    });
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    const newItems = [...block.items];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newItems.length) return;
    [newItems[index], newItems[swapIndex]] = [newItems[swapIndex], newItems[index]];
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: newItems } },
    });
  };

  const addBlankItem = () => {
    const newItems = [
      ...block.items,
      {
        id: `dl${Date.now()}`,
        speaker: "",
        icon: "circle" as DialogueSpeakerIcon,
        text: "",
      },
    ];
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: newItems } },
    });
  };

  const insertBlankItem = (index: number) => {
    const newItems = [...block.items];
    newItems.splice(index + 1, 0, {
      id: `dl${Date.now()}`,
      speaker: "",
      icon: "circle" as DialogueSpeakerIcon,
      text: "",
    });
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: newItems } },
    });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("instruction")}</Label>
        <ChInput
          blockId={block.id}
          fieldPath="instruction"
          baseValue={block.instruction}
          onBaseChange={(v) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { instruction: v } },
            })
          }
        />
      </div>
      {block.showOriginal && (
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("colRatio")}</Label>
          <div className="flex items-center justify-between">
            <Label className="text-sm">{t("colRatio")}</Label>
            <span className="text-xs text-muted-foreground">
              {Math.max(20, Math.min(80, block.originalLeftColWidth ?? (block.originalColumnRatio === "3:2" ? 60 : 50)))}% / {100 - Math.max(20, Math.min(80, block.originalLeftColWidth ?? (block.originalColumnRatio === "3:2" ? 60 : 50)))}%
            </span>
          </div>
          <Slider
            value={[Math.max(20, Math.min(80, block.originalLeftColWidth ?? (block.originalColumnRatio === "3:2" ? 60 : 50)))]}
            min={20}
            max={80}
            step={5}
            onValueChange={([value]) =>
              dispatch({
                type: "UPDATE_BLOCK",
                payload: {
                  id: block.id,
                  updates: {
                    originalLeftColWidth: value,
                    originalColumnRatio: undefined,
                  },
                },
              })
            }
          />
        </div>
      )}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("dialogueItems")}</Label>
        {block.items.map((item, i) => {
          const isBlankItem = !item.speaker && !item.text;

          if (isBlankItem) {
            return (
              <div key={item.id} className="space-y-1.5 border-b border-border pb-2 last:border-b-0 last:pb-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-6 shrink-0 text-left text-xs tabular-nums text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                  <span className="min-w-0 flex-1 text-xs italic text-muted-foreground">{t("blankRow")}</span>
                  <div className="flex shrink-0 items-center gap-1">
                    <div className="flex flex-col">
                      <button
                        className="p-0 h-3 text-muted-foreground hover:text-foreground disabled:opacity-30"
                        onClick={() => moveItem(i, "up")}
                        disabled={i === 0}
                      >
                        <ArrowUpDown className="h-2.5 w-2.5 rotate-180" />
                      </button>
                      <button
                        className="p-0 h-3 text-muted-foreground hover:text-foreground disabled:opacity-30"
                        onClick={() => moveItem(i, "down")}
                        disabled={i === block.items.length - 1}
                      >
                        <ArrowUpDown className="h-2.5 w-2.5" />
                      </button>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => removeItem(i)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => insertBlankItem(i)}
                      title={t("insertBlankItem")}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          }

          return (
          <div key={item.id} className="space-y-1.5 border-b border-border pb-2 last:border-b-0 last:pb-0">
            <div className="flex items-center gap-1.5">
              <span className="w-6 shrink-0 text-left text-xs tabular-nums text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                {(() => {
                  const currentIcon = DIALOGUE_SPEAKER_ICON_OPTIONS.some((opt) => opt.value === item.icon)
                    ? item.icon
                    : "circle";

                  return (
                <Select
                  value={currentIcon}
                  onValueChange={(v) => updateItem(i, { icon: v as DialogueSpeakerIcon })}
                >
                  <SelectTrigger className="h-8 w-[56px] shrink-0 text-xs px-1.5">
                    <SelectValue>
                      <span className="flex items-center justify-center w-full gap-0">
                        {renderIcon(currentIcon)}
                        <span className="sr-only">{currentIcon}</span>
                      </span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {DIALOGUE_SPEAKER_ICON_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className="flex items-center gap-2">
                          {renderIcon(opt.value)}
                          <span className="sr-only">{opt.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                  );
                })()}
                <div className="min-w-0 flex-1">
                  <ChInput
                    blockId={block.id}
                    fieldPath={`items.${i}.speaker`}
                    baseValue={item.speaker}
                    onBaseChange={(v) => updateItem(i, { speaker: v })}
                    className="h-8 w-full text-xs"
                    placeholder={t("dialogueSpeaker")}
                  />
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <div className="flex flex-col">
                  <button
                    className="p-0 h-3 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    onClick={() => moveItem(i, "up")}
                    disabled={i === 0}
                  >
                    <ArrowUpDown className="h-2.5 w-2.5 rotate-180" />
                  </button>
                  <button
                    className="p-0 h-3 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    onClick={() => moveItem(i, "down")}
                    disabled={i === block.items.length - 1}
                  >
                    <ArrowUpDown className="h-2.5 w-2.5" />
                  </button>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => removeItem(i)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => insertBlankItem(i)}
                  title={t("insertBlankItem")}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-6 shrink-0" />
              <ChInput
                blockId={block.id}
                fieldPath={`items.${i}.text`}
                baseValue={item.text}
                onBaseChange={(v) => updateItem(i, { text: v })}
                className="h-8 flex-1 text-xs"
                placeholder={t("dialogueTextPlaceholder")}
              />
            </div>
          </div>
          );
        })}
        <Button variant="outline" size="sm" onClick={addItem} className="w-full">
          <Plus className="h-3.5 w-3.5 mr-1" /> {t("addItem")}
        </Button>
        <Button variant="outline" size="sm" onClick={addBlankItem} className="w-full">
          <Plus className="h-3.5 w-3.5 mr-1" /> {t("addBlankItem")}
        </Button>
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("settings")}</Label>
        <div>
          {renderSwitchRow(
            t("showWordBank"),
            block.showWordBank ?? false,
            (checked) =>
              dispatch({
                type: "UPDATE_BLOCK",
                payload: { id: block.id, updates: { showWordBank: checked } },
              }),
            { withTopDivider: true }
          )}
          {renderSwitchRow(
            t("showOriginal"),
            block.showOriginal ?? false,
            (checked) =>
              dispatch({
                type: "UPDATE_BLOCK",
                payload: { id: block.id, updates: { showOriginal: checked } },
              })
          )}
          {renderSwitchRow(
            t("showSpeakers"),
            block.showSpeakers ?? true,
            (checked) =>
              dispatch({
                type: "UPDATE_BLOCK",
                payload: { id: block.id, updates: { showSpeakers: checked } },
              })
          )}
          {renderSwitchRow(
            t("showFirstAsExample"),
            block.showFirstAsExample ?? false,
            (checked) =>
              dispatch({
                type: "UPDATE_BLOCK",
                payload: { id: block.id, updates: { showFirstAsExample: checked } },
              }),
            { withBottomBorder: false }
          )}
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-sky-800 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("notes")}</Label>
        <p className="text-sm text-muted-foreground">
          {t("dialogueGapHelp")}
        </p>
      </div>
    </div>
  );
}

function LueckenzeilenProps({ block }: { block: LueckenzeilenBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");
  const tc = useTranslations("common");

  const renderSwitchRow = (
    label: string,
    checked: boolean,
    onCheckedChange: (checked: boolean) => void,
    options?: { withTopDivider?: boolean; withBottomBorder?: boolean }
  ) => (
    <>
      {options?.withTopDivider ? <Separator /> : null}
      <div
        className={`flex h-8 items-center justify-between ${options?.withBottomBorder === false ? "" : "border-b border-border"}`}
      >
        <Label className="text-sm">{label}</Label>
        <Switch checked={checked} onCheckedChange={onCheckedChange} />
      </div>
    </>
  );

  const updateItem = (index: number, updates: Partial<LueckenzeilenBlock["items"][number]>) => {
    const newItems = [...block.items];
    newItems[index] = { ...newItems[index], ...updates };
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: newItems } },
    });
  };

  const addItem = () => {
    const newItems = [
      ...block.items,
      {
        id: `lz${Date.now()}`,
        text: "",
      },
    ];
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: newItems } },
    });
  };

  const removeItem = (index: number) => {
    const newItems = block.items.filter((_, i) => i !== index);
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: newItems } },
    });
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    const newItems = [...block.items];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newItems.length) return;
    [newItems[index], newItems[swapIndex]] = [newItems[swapIndex], newItems[index]];
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: newItems } },
    });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("instruction")}</Label>
        <ChInput
          blockId={block.id}
          fieldPath="instruction"
          baseValue={block.instruction}
          onBaseChange={(v) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { instruction: v } },
            })
          }
        />
      </div>
      {block.showOriginal && (
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("colRatio")}</Label>
          <div className="flex items-center justify-between">
            <Label className="text-sm">{t("colRatio")}</Label>
            <span className="text-xs text-muted-foreground">
              {Math.max(20, Math.min(80, block.originalLeftColWidth ?? (block.originalColumnRatio === "3:2" ? 60 : 50)))}% / {100 - Math.max(20, Math.min(80, block.originalLeftColWidth ?? (block.originalColumnRatio === "3:2" ? 60 : 50)))}%
            </span>
          </div>
          <Slider
            value={[Math.max(20, Math.min(80, block.originalLeftColWidth ?? (block.originalColumnRatio === "3:2" ? 60 : 50)))]}
            min={20}
            max={80}
            step={5}
            onValueChange={([value]) =>
              dispatch({
                type: "UPDATE_BLOCK",
                payload: {
                  id: block.id,
                  updates: {
                    originalLeftColWidth: value,
                    originalColumnRatio: undefined,
                  },
                },
              })
            }
          />
        </div>
      )}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("lueckenzeilenItems")}</Label>
        {block.items.map((item, i) => (
          <div key={item.id} className="space-y-1.5 border-b border-border pb-2 last:border-b-0 last:pb-0">
            <div className="flex items-center gap-1.5">
              <span className="w-6 shrink-0 text-left text-xs tabular-nums text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
              <div className="min-w-0 flex-1">
                <ChInput
                  blockId={block.id}
                  fieldPath={`items.${i}.text`}
                  baseValue={item.text}
                  onBaseChange={(v) => updateItem(i, { text: v })}
                  className="h-8 w-full text-xs"
                  placeholder={t("dialogueTextPlaceholder")}
                />
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <div className="flex flex-col">
                  <button
                    className="p-0 h-3 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    onClick={() => moveItem(i, "up")}
                    disabled={i === 0}
                  >
                    <ArrowUpDown className="h-2.5 w-2.5 rotate-180" />
                  </button>
                  <button
                    className="p-0 h-3 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    onClick={() => moveItem(i, "down")}
                    disabled={i === block.items.length - 1}
                  >
                    <ArrowUpDown className="h-2.5 w-2.5" />
                  </button>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => removeItem(i)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addItem} className="w-full">
          <Plus className="h-3.5 w-3.5 mr-1" /> {t("addItem")}
        </Button>
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("settings")}</Label>
        <div>
          {renderSwitchRow(
            t("showWordBank"),
            block.showWordBank ?? false,
            (checked) =>
              dispatch({
                type: "UPDATE_BLOCK",
                payload: { id: block.id, updates: { showWordBank: checked } },
              }),
            { withTopDivider: true }
          )}
          {renderSwitchRow(
            t("showOriginal"),
            block.showOriginal ?? false,
            (checked) =>
              dispatch({
                type: "UPDATE_BLOCK",
                payload: { id: block.id, updates: { showOriginal: checked } },
              })
          )}
          {renderSwitchRow(
            t("showFirstAsExample"),
            block.showFirstAsExample ?? false,
            (checked) =>
              dispatch({
                type: "UPDATE_BLOCK",
                payload: { id: block.id, updates: { showFirstAsExample: checked } },
              }),
            { withBottomBorder: false }
          )}
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-sky-800 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("notes")}</Label>
        <p className="text-sm text-muted-foreground">
          {t("dialogueGapHelp")}
        </p>
      </div>
    </div>
  );
}

// ─── Email Skeleton Props ────────────────────────────────────
function EmailSkeletonProps({ block }: { block: EmailSkeletonBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");
  const tc = useTranslations("common");

  const attachments = block.attachments ?? [];

  const update = (updates: Partial<EmailSkeletonBlock>) => {
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates },
    });
  };

  const addAttachment = () => {
    const newAtt: EmailAttachment = {
      id: `att${Date.now()}`,
      name: "dokument.pdf",
    };
    update({ attachments: [...attachments, newAtt] });
  };

  const updateAttachment = (index: number, name: string) => {
    const newAtts = [...attachments];
    newAtts[index] = { ...newAtts[index], name };
    update({ attachments: newAtts });
  };

  const removeAttachment = (index: number) => {
    update({ attachments: attachments.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("emailStyle")}</Label>
        <Select
          value={block.emailStyle || "none"}
          onValueChange={(v) => update({ emailStyle: v as EmailSkeletonStyle })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t("emailStyleNone")}</SelectItem>
            <SelectItem value="standard">{t("emailStyleStandard")}</SelectItem>
            <SelectItem value="teal">{t("emailStyleTeal")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Separator />
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("emailHeader")}</Label>
        <div className="space-y-2">
          <div>
            <Label className="text-xs text-muted-foreground">{t("emailFrom")}</Label>
            <ChInput
              blockId={block.id}
              fieldPath="from"
              baseValue={block.from}
              onBaseChange={(v) => update({ from: v })}
              placeholder={t("emailFromPlaceholder")}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">{t("emailTo")}</Label>
            <ChInput
              blockId={block.id}
              fieldPath="to"
              baseValue={block.to}
              onBaseChange={(v) => update({ to: v })}
              placeholder={t("emailToPlaceholder")}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">{t("emailSubject")}</Label>
            <ChInput
              blockId={block.id}
              fieldPath="subject"
              baseValue={block.subject}
              onBaseChange={(v) => update({ subject: v })}
              placeholder={t("emailSubjectPlaceholder")}
            />
          </div>
        </div>
      </div>
      <Separator />
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("emailAttachments")}</Label>
        <div className="space-y-2">
          {attachments.map((att, i) => (
            <div key={att.id} className="flex items-center gap-1">
              <ChInput
                blockId={block.id}
                fieldPath={`attachments.${i}.name`}
                baseValue={att.name}
                onBaseChange={(v) => updateAttachment(i, v)}
                placeholder={t("emailAttachmentPlaceholder")}
                className="flex-1 h-8 text-xs"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => removeAttachment(i)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addAttachment} className="w-full">
            <Plus className="h-3.5 w-3.5 mr-1" /> {t("emailAddAttachment")}
          </Button>
        </div>
      </div>
      {(block.emailStyle === "standard" || block.emailStyle === "teal") && (
        <>
          <Separator />
          <div>
            <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("textComment")}</Label>
            <textarea
              value={block.comment || ""}
              onChange={(e) => update({ comment: e.target.value })}
              placeholder={t("textCommentPlaceholder")}
              className="w-full min-h-[60px] rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y"
              rows={3}
            />
          </div>
        </>
      )}
    </div>
  );
}

// ─── Job Application Props ──────────────────────────────────
function JobApplicationProps({ block }: { block: JobApplicationBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");

  const update = (updates: Partial<JobApplicationBlock>) => {
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates },
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("jobStyle")}</Label>
        <Select
          value={block.applicationStyle || "none"}
          onValueChange={(v) => update({ applicationStyle: v as JobApplicationStyle })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t("emailStyleNone")}</SelectItem>
            <SelectItem value="standard">{t("emailStyleStandard")}</SelectItem>
            <SelectItem value="teal">{t("emailStyleTeal")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Separator />
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("jobPersonalData")}</Label>
        <div className="space-y-2">
          <div>
            <Label className="text-xs text-muted-foreground">{t("jobFirstName")}</Label>
            <ChInput
              blockId={block.id}
              fieldPath="firstName"
              baseValue={block.firstName}
              onBaseChange={(v) => update({ firstName: v })}
              placeholder={t("jobFirstNamePlaceholder")}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">{t("jobLastName")}</Label>
            <ChInput
              blockId={block.id}
              fieldPath="applicantName"
              baseValue={block.applicantName}
              onBaseChange={(v) => update({ applicantName: v })}
              placeholder={t("jobLastNamePlaceholder")}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">{t("jobEmail")}</Label>
            <ChInput
              blockId={block.id}
              fieldPath="email"
              baseValue={block.email}
              onBaseChange={(v) => update({ email: v })}
              placeholder={t("jobEmailPlaceholder")}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">{t("jobPhone")}</Label>
            <ChInput
              blockId={block.id}
              fieldPath="phone"
              baseValue={block.phone}
              onBaseChange={(v) => update({ phone: v })}
              placeholder={t("jobPhonePlaceholder")}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">{t("jobPosition")}</Label>
            <ChInput
              blockId={block.id}
              fieldPath="position"
              baseValue={block.position}
              onBaseChange={(v) => update({ position: v })}
              placeholder={t("jobPositionPlaceholder")}
            />
          </div>
        </div>
      </div>
      {(block.applicationStyle === "standard" || block.applicationStyle === "teal") && (
        <>
          <Separator />
          <div>
            <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("textComment")}</Label>
            <textarea
              value={block.comment || ""}
              onChange={(e) => update({ comment: e.target.value })}
              placeholder={t("textCommentPlaceholder")}
              className="w-full min-h-[60px] rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y"
              rows={3}
            />
          </div>
        </>
      )}
    </div>
  );
}

// ─── Properties Panel ────────────────────────────────────────
// ─── Chart Props ─────────────────────────────────────────────
const CHART_COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#818cf8", "#7c3aed", "#4f46e5", "#6d28d9"];

function ChartProps({ block }: { block: ChartBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");
  const [jsonText, setJsonText] = React.useState("");
  const [jsonError, setJsonError] = React.useState<string | null>(null);
  const [jsonMode, setJsonMode] = React.useState<"replace" | "append">("replace");

  const update = (updates: Partial<ChartBlock>) =>
    dispatch({ type: "UPDATE_BLOCK", payload: { id: block.id, updates } });

  const updateDataPoint = (index: number, field: keyof ChartDataPoint, value: string | number) => {
    const newData = [...block.data];
    newData[index] = { ...newData[index], [field]: value };
    update({ data: newData });
  };

  const addDataPoint = () => {
    const newData = [
      ...block.data,
      {
        id: crypto.randomUUID(),
        label: `Item ${block.data.length + 1}`,
        value: Math.round(Math.random() * 80 + 10),
        color: CHART_COLORS[block.data.length % CHART_COLORS.length],
      },
    ];
    update({ data: newData });
  };

  const removeDataPoint = (index: number) => {
    const newData = block.data.filter((_, i) => i !== index);
    update({ data: newData });
  };

  const handleJsonImport = () => {
    setJsonError(null);
    const text = jsonText.trim();
    if (!text) return;

    try {
      const parsed = JSON.parse(text);

      // Accept either an array directly or an object with a "data" key
      const items: unknown[] = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.data) ? parsed.data : null as unknown as unknown[];
      if (!items) {
        setJsonError(t("chartJsonInvalidFormat"));
        return;
      }

      const newData: ChartDataPoint[] = items.map((item: unknown, i: number) => {
        const obj = item as Record<string, unknown>;
        // Support multiple key names for flexibility
        const label = String(obj.label ?? obj.name ?? obj.category ?? obj.key ?? `Item ${i + 1}`);
        const value = Number(obj.value ?? obj.amount ?? obj.count ?? obj.total ?? 0);
        const color = typeof obj.color === "string" ? obj.color : CHART_COLORS[i % CHART_COLORS.length];
        return { id: crypto.randomUUID(), label, value, color };
      });

      if (newData.length === 0) {
        setJsonError(t("csvNoData"));
        return;
      }

      const data = jsonMode === "append" ? [...block.data, ...newData] : newData;
      update({ data });
      setJsonText("");
    } catch {
      setJsonError(t("chartJsonParseError"));
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setJsonText(text);
      setJsonError(null);
    };
    reader.readAsText(file);
    // Reset input so the same file can be re-selected
    e.target.value = "";
  };

  return (
    <div className="space-y-4">
      {/* Chart Type */}
      <div>
        <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px]">{t("chartType")}</div>
        <Select value={block.chartType} onValueChange={(v) => update({ chartType: v as ChartBlock["chartType"] })}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="bar">{t("chartBar")}</SelectItem>
            <SelectItem value="pie">{t("chartPie")}</SelectItem>
            <SelectItem value="line">{t("chartLine")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Display options */}
      <div>
        <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px]">{t("chartDisplay")}</div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs">{t("chartShowLegend")}</Label>
            <Switch checked={block.showLegend} onCheckedChange={(v) => update({ showLegend: v })} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">{t("chartShowValues")}</Label>
            <Switch checked={block.showValues} onCheckedChange={(v) => update({ showValues: v })} />
          </div>
          {block.chartType !== "pie" && (
            <div className="flex items-center justify-between">
              <Label className="text-xs">{t("chartShowGrid")}</Label>
              <Switch checked={block.showGrid} onCheckedChange={(v) => update({ showGrid: v })} />
            </div>
          )}
        </div>
      </div>

      {/* Axis labels (not for pie) */}
      {block.chartType !== "pie" && (
        <>
          <Separator />
          <div>
            <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px]">{t("chartAxes")}</div>
            <div className="space-y-2">
              <div>
                <Label className="text-xs">{t("chartXAxis")}</Label>
                <Input
                  value={block.xAxisLabel || ""}
                  onChange={(e) => update({ xAxisLabel: e.target.value })}
                  placeholder={t("chartXAxisPlaceholder")}
                  className="text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">{t("chartYAxis")}</Label>
                <Input
                  value={block.yAxisLabel || ""}
                  onChange={(e) => update({ yAxisLabel: e.target.value })}
                  placeholder={t("chartYAxisPlaceholder")}
                  className="text-xs"
                />
              </div>
            </div>
          </div>
        </>
      )}

      <Separator />

      {/* Data points */}
      <div>
        <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px]">
          {t("chartData")} ({block.data.length})
        </div>
        <div className="space-y-2">
          {block.data.map((dp, i) => (
            <div key={dp.id} className="flex items-center gap-1.5">
              <input
                type="color"
                value={dp.color || CHART_COLORS[i % CHART_COLORS.length]}
                onChange={(e) => updateDataPoint(i, "color", e.target.value)}
                className="w-6 h-6 rounded border-0 cursor-pointer p-0"
              />
              <Input
                value={dp.label}
                onChange={(e) => updateDataPoint(i, "label", e.target.value)}
                className="text-xs flex-1 min-w-0"
                placeholder={t("chartLabelPlaceholder")}
              />
              <Input
                type="number"
                value={dp.value}
                onChange={(e) => updateDataPoint(i, "value", parseFloat(e.target.value) || 0)}
                className="text-xs w-16"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => removeDataPoint(i)}
                disabled={block.data.length <= 1}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" className="w-full" onClick={addDataPoint}>
            <Plus className="h-3 w-3 mr-1" />
            {t("chartAddDataPoint")}
          </Button>
        </div>
      </div>

      <Separator />

      {/* JSON Import */}
      <div>
        <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px]">{t("chartJsonImport")}</div>
        <p className="text-xs text-muted-foreground mb-1">
          {t("chartJsonImportHelp")}
        </p>
        <textarea
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[80px] resize-y font-mono"
          placeholder={t("chartJsonPlaceholder")}
          value={jsonText}
          onChange={(e) => {
            setJsonText(e.target.value);
            setJsonError(null);
          }}
        />
        {jsonError && (
          <p className="text-xs text-destructive mt-1">{jsonError}</p>
        )}
        <div className="flex gap-1 mt-1">
          <Select
            value={jsonMode}
            onValueChange={(v) => setJsonMode(v as "replace" | "append")}
          >
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="replace">{t("csvReplace")}</SelectItem>
              <SelectItem value="append">{t("csvAppend")}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleJsonImport}
            disabled={!jsonText.trim()}
          >
            <Upload className="h-4 w-4 mr-1" />
            {t("csvImportButton")}
          </Button>
        </div>
        <div className="mt-2">
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileImport}
            />
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2">
              <Upload className="h-3 w-3" />
              {t("chartJsonFileImport")}
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}

const NUMBERED_ITEMS_MAIN_COLORS = [
  { label: "Plum", hex: "#4A3D55" },
  { label: "Mauve", hex: "#7A5550" },
  { label: "Forest", hex: "#3A4F40" },
  { label: "Bark", hex: "#5A4540" },
  { label: "Teal", hex: "#3A6570" },
  { label: "Red", hex: "#990033" },
];

const NUMBERED_ITEMS_PASTEL_COLORS = [
  { label: "Rose", hex: "#F2DDE1" },
  { label: "Peach", hex: "#F2E2D4" },
  { label: "Buttercup", hex: "#F2EDDA" },
  { label: "Mint", hex: "#DAF0DC" },
  { label: "Sky", hex: "#D8E6F2" },
  { label: "Lavender", hex: "#DED6EC" },
  { label: "Lilac", hex: "#EADAEE" },
  { label: "Cloud", hex: "#E4E4EC" },
];

function isMainColor(hex: string) {
  return NUMBERED_ITEMS_MAIN_COLORS.some((c) => c.hex.toLowerCase() === hex.toLowerCase());
}

function NumberedItemsProps({ block }: { block: NumberedItemsBlock }) {
  const { state, dispatch } = useEditor();
  const t = useTranslations("properties");
  const update = (updates: Partial<NumberedItemsBlock>) =>
    dispatch({ type: "UPDATE_BLOCK", payload: { id: block.id, updates } });

  const brandPrimary = state.brandProfile.primaryColor;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm">{t("bilingual")}</Label>
        <Switch
          checked={block.bilingual ?? false}
          onCheckedChange={(checked) => update({ bilingual: checked })}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-sm">{t("skipTranslation")}</Label>
        <Switch
          checked={block.skipTranslation ?? false}
          onCheckedChange={(checked) => update({ skipTranslation: checked })}
        />
      </div>
      <Separator />
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("startNumber")}</Label>
        <Input
          type="number"
          min={0}
          value={block.startNumber}
          onChange={(e) => update({ startNumber: Number(e.target.value) })}
        />
      </div>
      <Separator />
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block mb-1.5">{t("subItemStyle")}</Label>
        <Select
          value={block.subItemStyle ?? "decimal"}
          onValueChange={(v) => update({ subItemStyle: v as NumberedSubItemStyle })}
        >
          <SelectTrigger size="sm" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="decimal">{t("subItemStyleDecimal")}</SelectItem>
            <SelectItem value="letter">{t("subItemStyleLetter")}</SelectItem>
            <SelectItem value="bullet">{t("subItemStyleBullet")}</SelectItem>
            <SelectItem value="plain">{t("subItemStylePlain")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Separator />
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("backgroundColor")}</Label>
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {/* None / transparent */}
            <button
              className={`w-7 h-7 rounded border-2 transition-all cursor-pointer flex items-center justify-center text-[10px] text-muted-foreground ${
                !block.bgColor
                  ? "border-primary scale-110"
                  : "border-border hover:border-primary/50"
              }`}
              style={{ backgroundColor: "#fff" }}
              onClick={() => update({ bgColor: "" })}
            >
              ✕
            </button>
            {/* Brand primary color */}
            <button
              title="Brand Primary"
              className={`w-7 h-7 rounded border-2 transition-all cursor-pointer ring-1 ring-offset-1 ring-transparent ${
                block.bgColor?.toLowerCase() === brandPrimary.toLowerCase()
                  ? "border-primary scale-110"
                  : "border-border hover:border-primary/50"
              }`}
              style={{ backgroundColor: brandPrimary }}
              onClick={() => update({ bgColor: brandPrimary })}
            />
            {NUMBERED_ITEMS_MAIN_COLORS.map((c) => (
              <button
                key={c.hex}
                title={c.label}
                className={`w-7 h-7 rounded border-2 transition-all cursor-pointer ${
                  block.bgColor?.toLowerCase() === c.hex.toLowerCase()
                    ? "border-primary scale-110"
                    : "border-border hover:border-primary/50"
                }`}
                style={{ backgroundColor: c.hex }}
                onClick={() => update({ bgColor: c.hex })}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {NUMBERED_ITEMS_PASTEL_COLORS.map((c) => (
              <button
                key={c.hex}
                title={c.label}
                className={`w-7 h-7 rounded border-2 transition-all cursor-pointer ${
                  block.bgColor?.toLowerCase() === c.hex.toLowerCase()
                    ? "border-primary scale-110"
                    : "border-border hover:border-primary/50"
                }`}
                style={{ backgroundColor: c.hex }}
                onClick={() => update({ bgColor: c.hex })}
              />
            ))}
          </div>
        </div>
      </div>
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("borderRadius")}</Label>
        <Slider
          min={0}
          max={24}
          step={1}
          value={[block.borderRadius ?? 6]}
          onValueChange={([v]) => update({ borderRadius: v })}
        />
        <span className="text-xs text-muted-foreground">{block.borderRadius ?? 6}px</span>
      </div>
    </div>
  );
}

function BoxProps({ block }: { block: BoxBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");
  const tc = useTranslations("common");

  const update = (updates: Partial<BoxBlock>) =>
    dispatch({ type: "UPDATE_BLOCK", payload: { id: block.id, updates } });

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("title")}</Label>
        <ChInput
          blockId={block.id}
          fieldPath="title"
          baseValue={block.title || ""}
          onBaseChange={(v) => update({ title: v })}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-sm">{t("bilingual")}</Label>
        <Switch
          checked={block.bilingual ?? false}
          onCheckedChange={(checked) => update({ bilingual: checked })}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-sm">{t("skipTranslation")}</Label>
        <Switch
          checked={block.skipTranslation ?? false}
          onCheckedChange={(checked) => update({ skipTranslation: checked })}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-sm">{t("boxAddTopGap")}</Label>
        <Switch
          checked={block.addTopBlockGap ?? false}
          onCheckedChange={(checked) => update({ addTopBlockGap: checked })}
        />
      </div>
      <Separator />
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("borderRadius")}</Label>
        <Slider
          min={0}
          max={24}
          step={1}
          value={[block.borderRadius ?? 6]}
          onValueChange={([v]) => update({ borderRadius: v })}
        />
        <span className="text-xs text-muted-foreground">{block.borderRadius ?? 6}px</span>
      </div>
    </div>
  );
}

function QuartettProps({ block }: { block: QuartettBlock }) {
  return <CardListProps block={block} kind="quartett" />;
}

type CardListBlock = QuartettBlock | TabooBlock;

function CardListProps({ block, kind }: { block: CardListBlock; kind: "quartett" | "taboo" }) {
  const { state, dispatch } = useEditor();
  const t = useTranslations("properties");
  const tc = useTranslations("common");
  const [csvText, setCsvText] = React.useState("");
  const [csvError, setCsvError] = React.useState<string | null>(null);
  const [csvMode, setCsvMode] = React.useState<"replace" | "append">("replace");
  const [isExportingCards, setIsExportingCards] = React.useState(false);
  const [generatingStopWordsForItem, setGeneratingStopWordsForItem] = React.useState<number | null>(null);
  const tabooStopWordCount = kind === "taboo" ? ((block as TabooBlock).stopWordCount ?? 4) : 4;
  const update = (updates: Partial<CardListBlock>) =>
    dispatch({ type: "UPDATE_BLOCK", payload: { id: block.id, updates } });

  const normalizeSubitems = React.useCallback((subitems: QuartettItem["subitems"], count: number) => {
    return Array.from({ length: count }, (_, index) => (
      subitems[index] ?? { id: crypto.randomUUID(), content: "" }
    ));
  }, []);

  const labels = kind === "quartett"
    ? {
        title: t("quartettTitle"),
        titlePlaceholder: t("quartettTitlePlaceholder"),
      subtitle: "",
      subtitlePlaceholder: "",
        csvImportHelp: t("quartettCsvImportHelp"),
        csvPlaceholder: t("quartettCsvPlaceholder"),
        exportCards: t("quartettExportCards"),
        exportCardsFailed: t("quartettExportCardsFailed"),
        exportCardsLoading: t("quartettExportCardsLoading"),
        itemTitle: t("quartettItemTitle"),
        itemTitlePlaceholder: t("quartettItemTitlePlaceholder"),
        showFooter: t("quartettShowFooter"),
        showGroupTitle: t("quartettShowGroupTitle"),
        subitemPlaceholder: (index: number) => t("quartettSubitemPlaceholder", { index }),
        subitems: t("quartettSubitems"),
        tooManyColumns: t("quartettCsvTooManyColumns"),
      }
    : {
        title: t("tabooTitle"),
        titlePlaceholder: t("tabooTitlePlaceholder"),
      subtitle: t("tabooSubtitle"),
      subtitlePlaceholder: t("tabooSubtitlePlaceholder"),
        csvImportHelp: t("tabooCsvImportHelp"),
        csvPlaceholder: t("tabooCsvPlaceholder"),
        exportCards: t("tabooExportCards"),
        exportCardsFailed: t("tabooExportCardsFailed"),
        exportCardsLoading: t("tabooExportCardsLoading"),
        generateStopWords: t("tabooGenerateStopWords"),
        generateStopWordsLoading: t("tabooGenerateStopWordsLoading"),
        generateStopWordsMissingWord: t("tabooGenerateStopWordsMissingWord"),
        generateStopWordsFailed: t("tabooGenerateStopWordsFailed"),
        itemTitle: t("tabooItemTitle"),
        itemTitlePlaceholder: t("tabooItemTitlePlaceholder"),
        showFooter: "",
        showGroupTitle: "",
        subitemPlaceholder: (index: number) => t("tabooSubitemPlaceholder", { index }),
        subitems: t("tabooSubitems"),
        tooManyColumns: t("tabooCsvTooManyColumns"),
      };

  const createEmptyCardItem = (title = "") => ({
    id: crypto.randomUUID(),
    title,
    subitems: Array.from({ length: tabooStopWordCount }, () => ({
      id: crypto.randomUUID(),
      content: "",
    })),
  });

  const parseCsvLine = (line: string): string[] => {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      const nextChar = line[index + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          index += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (!inQuotes && (char === ";" || char === "," || char === "\t")) {
        values.push(current.trim());
        current = "";
        continue;
      }

      current += char;
    }

    values.push(current.trim());
    return values;
  };

  const shuffle = <T,>(items: T[]): T[] => {
    const next = [...items];
    for (let index = next.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
    }
    return next;
  };

  const buildItemsFromSingleColumn = (values: string[]) => {
    const randomized = shuffle(values.filter(Boolean));
    const items: CardListBlock["items"] = [];

    for (let index = 0; index < randomized.length; index += 4) {
      const chunk = randomized.slice(index, index + 4);
      const item = createEmptyCardItem();
      item.subitems = item.subitems.map((subitem, subitemIndex) => ({
        ...subitem,
        content: chunk[subitemIndex] ?? "",
      }));
      items.push(item);
    }

    return items;
  };

  const buildTabooItemsFromSingleColumn = (values: string[]) => {
    return values
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => createEmptyCardItem(value));
  };

  const buildItemsFromTwoColumns = (rows: Array<{ title: string; content: string }>) => {
    const grouped = new Map<string, string[]>();
    const order: string[] = [];

    for (const row of rows) {
      const title = row.title.trim();
      const content = row.content.trim();
      if (!content) continue;
      if (!grouped.has(title)) {
        grouped.set(title, []);
        order.push(title);
      }
      grouped.get(title)!.push(content);
    }

    const items: CardListBlock["items"] = [];
    for (const title of order) {
      const contents = grouped.get(title) ?? [];
      const chunkSize = kind === "taboo" ? tabooStopWordCount : 4;
      for (let index = 0; index < contents.length; index += chunkSize) {
        const chunk = contents.slice(index, index + chunkSize);
        const item = createEmptyCardItem(title);
        item.subitems = item.subitems.map((subitem, subitemIndex) => ({
          ...subitem,
          content: chunk[subitemIndex] ?? "",
        }));
        items.push(item);
      }
    }

    return items;
  };

  const buildTabooItemsFromColumns = (rows: string[][]) => {
    return rows
      .map((row) => {
        const word = row[0]?.trim() ?? "";
        if (!word) return null;

        const item = createEmptyCardItem(word);
        item.subitems = item.subitems.map((subitem, subitemIndex) => ({
          ...subitem,
          content: row[subitemIndex + 1]?.trim() ?? "",
        }));
        return item;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  };

  const handleCsvImport = () => {
    setCsvError(null);
    const text = csvText.trim();
    if (!text) return;

    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      setCsvError(t("csvNoData"));
      return;
    }

    const parsedRows = lines.map(parseCsvLine);
    const maxColumns = Math.max(...parsedRows.map((row) => row.length));

    let importedItems: CardListBlock["items"] = [];

    if (maxColumns <= 1) {
      const values = parsedRows.map((row) => row[0] ?? "");
      importedItems = kind === "taboo"
        ? buildTabooItemsFromSingleColumn(values)
        : buildItemsFromSingleColumn(values);
    } else if (maxColumns === 2) {
      importedItems = buildItemsFromTwoColumns(
        parsedRows.map((row) => ({
          title: row[0] ?? "",
          content: row[1] ?? "",
        }))
      );
    } else if (kind === "taboo" && maxColumns === tabooStopWordCount + 1) {
      importedItems = buildTabooItemsFromColumns(parsedRows);
    } else {
      setCsvError(labels.tooManyColumns);
      return;
    }

    if (importedItems.length === 0) {
      setCsvError(t("csvNoData"));
      return;
    }

    update({
      items: csvMode === "append"
        ? [...block.items, ...importedItems]
        : importedItems,
    });
    setCsvText("");
  };

  const updateItem = (itemIndex: number, updates: Partial<CardListBlock["items"][number]>) => {
    const items = [...block.items];
    items[itemIndex] = { ...items[itemIndex], ...updates };
    update({ items });
  };

  const updateSubitem = (itemIndex: number, subitemIndex: number, content: string) => {
    const items = [...block.items];
    const subitems = kind === "taboo"
      ? normalizeSubitems(items[itemIndex].subitems, tabooStopWordCount)
      : [...items[itemIndex].subitems];
    subitems[subitemIndex] = { ...subitems[subitemIndex], content };
    items[itemIndex] = { ...items[itemIndex], subitems };
    update({ items });
  };

  const moveSubitem = (itemIndex: number, subitemIndex: number, direction: -1 | 1) => {
    const targetIndex = subitemIndex + direction;
    const items = [...block.items];
    const subitems = kind === "taboo"
      ? normalizeSubitems(items[itemIndex].subitems, tabooStopWordCount)
      : [...items[itemIndex].subitems];
    if (targetIndex < 0 || targetIndex >= subitems.length) return;
    [subitems[subitemIndex], subitems[targetIndex]] = [subitems[targetIndex], subitems[subitemIndex]];
    items[itemIndex] = { ...items[itemIndex], subitems };
    update({ items });
  };

  const addItem = () => {
    update({
      items: [
        ...block.items,
        createEmptyCardItem(),
      ],
    });
  };

  const removeItem = (itemIndex: number) => {
    if (block.items.length <= 1) return;
    update({ items: block.items.filter((_, index) => index !== itemIndex) });
  };

  const handleGenerateStopWords = async (itemIndex: number) => {
    if (kind !== "taboo") return;

    const word = block.items[itemIndex]?.title?.trim() || "";
    if (!word) {
      alert(labels.generateStopWordsMissingWord);
      return;
    }

    setGeneratingStopWordsForItem(itemIndex);
    try {
      const activeLocale = window.location.pathname.split("/")[1] || "de";
      const response = await authFetch("/api/ai/generate-taboo-stop-words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word,
          stopWordCount: tabooStopWordCount,
          locale: activeLocale,
          worksheetTitle: state.title,
          blockTitle: block.title || "",
        }),
      });

      const data = await response.json() as { error?: string; stopWords?: string[] };
      if (!response.ok) {
        throw new Error(data.error || labels.generateStopWordsFailed);
      }

      const stopWords = Array.isArray(data.stopWords) ? data.stopWords.slice(0, tabooStopWordCount) : [];
      if (stopWords.length !== tabooStopWordCount) {
        throw new Error(labels.generateStopWordsFailed);
      }

      const items = [...block.items];
      const subitems = normalizeSubitems(items[itemIndex].subitems, tabooStopWordCount);
      items[itemIndex] = {
        ...items[itemIndex],
        subitems: subitems.map((subitem, subitemIndex) => ({
          ...subitem,
          content: stopWords[subitemIndex] ?? "",
        })),
      };
      update({ items });
    } catch (error) {
      console.error("[TabooProps] Stop-word generation failed:", error);
      alert(error instanceof Error ? error.message : tc("generationFailed"));
    } finally {
      setGeneratingStopWordsForItem(null);
    }
  };

  const handleExportCards = async () => {
    if (isExportingCards) return;

    setIsExportingCards(true);
    try {
      const activeLocale = window.location.pathname.split("/")[1] || "de";
      const response = await authFetch(`/api/${kind}/export-cards`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          block,
          settings: state.settings,
          brandProfile: state.brandProfile,
          worksheetTitle: state.title,
          worksheetId: state.worksheetId,
          locale: activeLocale,
        }),
      });

      if (!response.ok) {
        let message = labels.exportCardsFailed;
        try {
          const payload = (await response.json()) as { error?: string };
          if (payload.error) message = payload.error;
        } catch {
          // Ignore JSON parsing failures and keep fallback message.
        }
        throw new Error(message);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${(block.title || state.title || `${kind}-cards`)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || `${kind}-cards`}.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(`[${kind.toUpperCase()}Props] Export cards failed:`, error);
      alert(error instanceof Error ? error.message : labels.exportCardsFailed);
    } finally {
      setIsExportingCards(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">
          {labels.title}
        </Label>
        <Input
          value={block.title ?? ""}
          onChange={(e) => update({ title: e.target.value })}
          placeholder={labels.titlePlaceholder}
          className="h-8"
        />
      </div>

      {kind === "taboo" ? (
        <div className="space-y-2">
          <Input
            value={(block as TabooBlock).subtitle ?? ""}
            onChange={(e) => update({ subtitle: e.target.value } as Partial<CardListBlock>)}
            placeholder={labels.subtitlePlaceholder}
            className="h-8"
          />
        </div>
      ) : null}

      {kind === "taboo" ? (
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">
            {t("tabooStopWordCount")}
          </Label>
          <Select
            value={String(tabooStopWordCount)}
            onValueChange={(value) => {
              const count: 4 | 10 = value === "10" ? 10 : 4;
              update({
                stopWordCount: count,
                items: block.items.map((item) => ({
                  ...item,
                  subitems: normalizeSubitems(item.subitems, count),
                })),
              } as Partial<CardListBlock>);
            }}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="4">{t("tabooStopWordCount4")}</SelectItem>
              <SelectItem value="10">{t("tabooStopWordCount10")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {kind === "quartett" ? (
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("settings")}</Label>
          <div className="border-y border-slate-200 bg-white">
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200">
              <Label className="text-sm text-foreground">{labels.showGroupTitle}</Label>
              <Switch
                checked={(block as QuartettBlock).showGroupTitle !== false}
                onCheckedChange={(checked) => update({ showGroupTitle: checked } as Partial<CardListBlock>)}
              />
            </div>
            <div className="flex items-center justify-between px-3 py-2">
              <Label className="text-sm text-foreground">{labels.showFooter}</Label>
              <Switch
                checked={(block as QuartettBlock).showFooter !== false}
                onCheckedChange={(checked) => update({ showFooter: checked } as Partial<CardListBlock>)}
              />
            </div>
          </div>
        </div>
      ) : null}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => void handleExportCards()}
        disabled={isExportingCards}
      >
        {isExportingCards ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Download className="h-4 w-4 mr-2" />
        )}
        {isExportingCards ? labels.exportCardsLoading : labels.exportCards}
      </Button>

      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("csvImport")}</Label>
        <p className="text-xs text-muted-foreground">
          {labels.csvImportHelp}
        </p>
        <textarea
          className="w-full min-h-[100px] resize-y rounded-[4px] !border border-input bg-white px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          placeholder={labels.csvPlaceholder}
          value={csvText}
          onChange={(e) => {
            setCsvText(e.target.value);
            setCsvError(null);
          }}
        />
        {csvError ? <p className="text-xs text-destructive">{csvError}</p> : null}
        <div className="space-y-2">
          <Select
            value={csvMode}
            onValueChange={(value) => setCsvMode(value as "replace" | "append")}
          >
            <SelectTrigger className="h-8 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="replace">{t("csvReplace")}</SelectItem>
              <SelectItem value="append">{t("csvAppend")}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleCsvImport}
            disabled={!csvText.trim()}
          >
            <Upload className="h-4 w-4 mr-2" />
            {t("csvImportButton")}
          </Button>
        </div>
      </div>

      {block.items.map((item, itemIndex) => (
        <div key={item.id} className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-8 shrink-0 text-xs font-semibold text-slate-700 uppercase tracking-wider text-center">
              {String(itemIndex + 1).padStart(2, "0")}
            </span>
            <div className="flex-1 space-y-2">
              <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">
                {labels.itemTitle}
              </Label>
              <Input
                value={item.title ?? ""}
                onChange={(e) => updateItem(itemIndex, { title: e.target.value })}
                placeholder={labels.itemTitlePlaceholder}
                className="h-8"
              />
              {kind === "taboo" ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => void handleGenerateStopWords(itemIndex)}
                  disabled={generatingStopWordsForItem !== null || !item.title?.trim()}
                >
                  {generatingStopWordsForItem === itemIndex ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  {generatingStopWordsForItem === itemIndex ? labels.generateStopWordsLoading : labels.generateStopWords}
                </Button>
              ) : null}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 self-start"
              onClick={() => removeItem(itemIndex)}
              disabled={block.items.length <= 1}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">
              {labels.subitems}
            </Label>
            <div className="space-y-2">
              {(kind === "taboo" ? normalizeSubitems(item.subitems, tabooStopWordCount) : item.subitems).map((subitem, subitemIndex) => (
                <div key={subitem.id} className="flex items-center gap-2">
                  <span className="w-8 shrink-0 text-xs font-medium text-muted-foreground text-center">
                    {String(subitemIndex + 1).padStart(2, "0")}
                  </span>
                  <Input
                    value={subitem.content}
                    onChange={(e) => updateSubitem(itemIndex, subitemIndex, e.target.value)}
                    placeholder={labels.subitemPlaceholder(subitemIndex + 1)}
                    className="h-8"
                  />
                  <div className="flex shrink-0 flex-col">
                    <button
                      type="button"
                      className="flex h-4 w-6 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30"
                      onClick={() => moveSubitem(itemIndex, subitemIndex, -1)}
                      disabled={subitemIndex === 0}
                    >
                      <ChevronUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      className="flex h-4 w-6 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30"
                      onClick={() => moveSubitem(itemIndex, subitemIndex, 1)}
                      disabled={subitemIndex === item.subitems.length - 1}
                    >
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" className="w-full" onClick={addItem}>
        <Plus className="h-4 w-4 mr-2" />
        {t("addItem")}
      </Button>
    </div>
  );
}

function TabooProps({ block }: { block: TabooBlock }) {
  return <CardListProps block={block} kind="taboo" />;
}

function ChecklistProps({ block }: { block: ChecklistBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");
  const [csvText, setCsvText] = React.useState("");
  const [csvError, setCsvError] = React.useState<string | null>(null);
  const [csvMode, setCsvMode] = React.useState<"replace" | "append">("replace");
  const update = (updates: Partial<ChecklistBlock>) =>
    dispatch({ type: "UPDATE_BLOCK", payload: { id: block.id, updates } });

  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const handleCsvImport = () => {
    setCsvError(null);
    const text = csvText.trim();
    if (!text) return;

    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      setCsvError(t("csvNoData"));
      return;
    }

    const importedItems = lines.map((line, index) => ({
      id: `checklist-${Date.now()}-${index}`,
      content: `<p>${escapeHtml(line)}</p>`,
    }));

    update({
      items: csvMode === "append"
        ? [...block.items, ...importedItems]
        : importedItems,
    });
    setCsvText("");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm">{t("bilingual")}</Label>
        <Switch
          checked={block.bilingual ?? false}
          onCheckedChange={(checked) => update({ bilingual: checked })}
        />
      </div>
      <Separator />
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("csvImport")}</Label>
        <p className="text-xs text-muted-foreground mb-1">
          {t("checklistCsvImportHelp")}
        </p>
        <textarea
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[80px] resize-y"
          placeholder={t("checklistCsvPlaceholder")}
          value={csvText}
          onChange={(e) => {
            setCsvText(e.target.value);
            setCsvError(null);
          }}
        />
        {csvError && (
          <p className="text-xs text-destructive mt-1">{csvError}</p>
        )}
        <div className="flex gap-1 mt-1">
          <Select
            value={csvMode}
            onValueChange={(value) => setCsvMode(value as "replace" | "append")}
          >
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="replace">{t("csvReplace")}</SelectItem>
              <SelectItem value="append">{t("csvAppend")}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleCsvImport}
            disabled={!csvText.trim()}
          >
            <Upload className="h-4 w-4 mr-2" />
            {t("csvImportButton")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function AccordionProps({ block }: { block: AccordionBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");
  const update = (updates: Partial<AccordionBlock>) =>
    dispatch({ type: "UPDATE_BLOCK", payload: { id: block.id, updates } });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{t("showNumbers")}</Label>
        <Switch
          checked={block.showNumbers ?? false}
          onCheckedChange={(checked) => update({ showNumbers: checked })}
        />
      </div>
    </div>
  );
}

function NumberedLabelProps({ block }: { block: NumberedLabelBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");
  const update = (updates: Partial<NumberedLabelBlock>) => {
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates },
    });
  };
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("startNumber")}</Label>
        <Input
          type="number"
          min={0}
          value={block.startNumber}
          onChange={(e) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { startNumber: Number(e.target.value) } },
            })
          }
        />
      </div>
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("prefix")}</Label>
        <Input
          value={block.prefix}
          placeholder={t("prefixPlaceholder")}
          onChange={(e) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { prefix: e.target.value } },
            })
          }
        />
      </div>
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("suffix")}</Label>
        <Input
          value={block.suffix}
          placeholder={t("suffixPlaceholder")}
          onChange={(e) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { suffix: e.target.value } },
            })
          }
        />
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-sm">{t("bilingual")}</Label>
        <Switch
          checked={block.bilingual ?? false}
          onCheckedChange={(checked) => update({ bilingual: checked })}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-sm">{t("skipTranslation")}</Label>
        <Switch
          checked={block.skipTranslation ?? false}
          onCheckedChange={(checked) => update({ skipTranslation: checked })}
        />
      </div>
    </div>
  );
}

// ─── Segmentation Props ─────────────────────────────────────
function SegmentationProps({ block }: { block: import("@/types/worksheet").SegmentationBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");
  const updateItem = (index: number, text: string) => {
    const newItems = [...block.items];
    newItems[index] = { ...newItems[index], text };
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: newItems } },
    });
  };

  const addItem = () => {
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          items: [...block.items, { id: crypto.randomUUID(), text: "" }],
        },
      },
    });
  };

  const removeItem = (index: number) => {
    if (block.items.length <= 1) return;
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: { items: block.items.filter((_, itemIndex) => itemIndex !== index) },
      },
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm">Instruction</Label>
        <Input
          value={block.instruction ?? ""}
          onChange={(event) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { instruction: event.target.value } },
            })
          }
          className="mt-1"
        />
      </div>
      <div>
        <Label>Casing</Label>
        <Select
          value={block.casing}
          onValueChange={(val) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { casing: val as import("@/types/worksheet").SegmentationBlock["casing"] } },
            })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default</SelectItem>
            <SelectItem value="uppercase">Uppercase</SelectItem>
            <SelectItem value="lowercase">Lowercase</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>{t("items")}</Label>
        <div className="mt-2 space-y-2">
          {block.items.map((item, index) => (
            <div key={item.id} className="flex items-center gap-2">
              <Input
                value={item.text}
                onChange={(event) => updateItem(index, event.target.value)}
                className="flex-1"
                placeholder={`Item ${index + 1}`}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeItem(index)}
                disabled={block.items.length <= 1}
                className="shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" className="w-full" onClick={addItem}>
            <Plus className="mr-2 h-4 w-4" /> {t("addItem")}
          </Button>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <Label className="text-sm">{t("showFirstAsExample")}</Label>
        <Switch
          checked={block.showFirstAsExample ?? true}
          onCheckedChange={(checked) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { showFirstAsExample: checked } },
            })
          }
        />
      </div>
    </div>
  );
}

function FreeFormProps({ block }: { block: FreeFormBlock }) {
  const { dispatch } = useEditor();
  const tc = useTranslations("common");
  const tr = useTranslations("blockRenderer");

  const update = (updates: Partial<FreeFormBlock>) => {
    dispatch({ type: "UPDATE_BLOCK", payload: { id: block.id, updates } });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">
          {tc("content")}
        </Label>
        <ChInput
          blockId={block.id}
          fieldPath="title"
          baseValue={block.title}
          onBaseChange={(value) => update({ title: value })}
          placeholder={tr("freeFormSceneTitle")}
        />
        <ChInput
          blockId={block.id}
          fieldPath="instruction"
          baseValue={block.instruction ?? ""}
          onBaseChange={(value) => update({ instruction: value })}
          multiline
          placeholder={tr("freeFormEmpty")}
        />
      </div>
    </div>
  );
}

function LetterCodeProps({ block }: { block: LetterCodeBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");
  const tc = useTranslations("common");
  const items = Array.isArray(block.items) ? block.items : [];
  const helperLettersText = (block.helperLetters ?? []).join(", ");
  const [csvText, setCsvText] = React.useState("");
  const [csvError, setCsvError] = React.useState<string | null>(null);
  const [csvMode, setCsvMode] = React.useState<"replace" | "append">("replace");
  const [tableOpen, setTableOpen] = React.useState(false);

  const handleCsvImport = () => {
    setCsvError(null);
    const text = csvText.trim();
    if (!text) return;

    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    const parsed: { word: string; clue: string }[] = [];

    for (const line of lines) {
      const sep = line.includes("\t") ? "\t" : line.includes(";") ? ";" : ",";
      const parts = line.split(sep).map((p) => p.trim());

      if (parts.length >= 2) {
        parsed.push({ word: parts[0], clue: parts.slice(1).join(sep === "\t" ? " " : ", ").trim() });
      } else if (parts[0]) {
        parsed.push({ word: parts[0], clue: "" });
      }
    }

    if (parsed.length === 0) {
      setCsvError(t("csvNoData"));
      return;
    }

    const newItems = parsed.map((p) => ({
      id: crypto.randomUUID(),
      clue: p.clue,
      word: p.word,
    }));

    const nextItems = csvMode === "append" ? [...items, ...newItems] : newItems;

    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: nextItems } },
    });
    setCsvText("");
  };

  const parseHelperLetters = (value: string) => {
    const allowed = new Set(["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "\u00c4", "\u00d6", "\u00dc"]);
    const letters = value
      .toUpperCase()
      .split(/[^A-Z\u00c4\u00d6\u00dc]+/)
      .join("")
      .split("")
      .filter((char) => allowed.has(char));
    return Array.from(new Set(letters));
  };

  const updateItem = (index: number, updates: Partial<LetterCodeBlock["items"][number]>) => {
    const nextItems = items.map((item, itemIndex) =>
      itemIndex === index ? { ...item, ...updates } : item
    );
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: nextItems } },
    });
  };

  const addItem = () => {
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: {
          items: [
            ...items,
            { id: crypto.randomUUID(), clue: "", word: "" },
          ],
        },
      },
    });
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: { items: items.filter((_, itemIndex) => itemIndex !== index) },
      },
    });
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const nextItems = [...items];
    [nextItems[index], nextItems[target]] = [nextItems[target], nextItems[index]];
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: nextItems } },
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("instruction")}</Label>
        <ChInput
          blockId={block.id}
          fieldPath="instruction"
          baseValue={block.instruction ?? ""}
          onBaseChange={(value) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { instruction: value } },
            })
          }
        />
      </div>
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("letterCodeHelperLetters")}</Label>
        <Input
          value={helperLettersText}
          onChange={(e) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { helperLetters: parseHelperLetters(e.target.value) } },
            })
          }
          className="h-8 text-xs"
          placeholder={t("letterCodeHelperLettersPlaceholder")}
        />
      </div>
      <Separator />
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("items")}</Label>
        {items.map((item, index) => (
          <div key={item.id} className="space-y-1 rounded border p-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">{index + 1}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => removeItem(index)}
                disabled={items.length <= 1}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            <ChInput
              blockId={block.id}
              fieldPath={`items.${index}.clue`}
              baseValue={item.clue}
              onBaseChange={(value) => updateItem(index, { clue: value })}
              className="h-8 text-xs"
              placeholder="Clue"
            />
            <ChInput
              blockId={block.id}
              fieldPath={`items.${index}.word`}
              baseValue={item.word}
              onBaseChange={(value) => updateItem(index, { word: value })}
              className="h-8 text-xs"
              placeholder="Word pattern (e.g. HA[U]S)"
            />
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" className="w-full" onClick={addItem}>
          <Plus className="h-3.5 w-3.5 mr-1" /> {t("addItem")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setTableOpen(true)}
        >
          <Table2 className="mr-2 h-3.5 w-3.5" /> {t("crosswordEditTable")}
        </Button>
      </div>
      <Dialog open={tableOpen} onOpenChange={setTableOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("letterCodeTableTitle")}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {items.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">{t("crosswordTableEmpty")}</p>
            ) : (
              <table className="w-full border-separate border-spacing-y-1.5 text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="w-8" />
                    <th className="px-2 pb-1">{t("letterCodeWord")}</th>
                    <th className="px-2 pb-1">{t("letterCodeClue")}</th>
                    <th className="w-20" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={item.id} className="align-top">
                      <td className="pt-1.5 text-center text-xs text-slate-400">{index + 1}</td>
                      <td className="px-1">
                        <Input
                          value={item.word}
                          onChange={(event) => updateItem(index, { word: event.target.value })}
                          className="h-8 text-sm"
                          placeholder="HA[U]S"
                        />
                      </td>
                      <td className="px-1">
                        <Input
                          value={item.clue}
                          onChange={(event) => updateItem(index, { clue: event.target.value })}
                          className="h-8 text-sm"
                        />
                      </td>
                      <td className="px-1">
                        <div className="flex items-center gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            disabled={index === 0}
                            onClick={() => moveItem(index, -1)}
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            disabled={index === items.length - 1}
                            onClick={() => moveItem(index, 1)}
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-500 hover:text-red-600"
                            disabled={items.length <= 1}
                            onClick={() => removeItem(index)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={addItem}>
            <Plus className="mr-2 h-3.5 w-3.5" /> {t("addItem")}
          </Button>
          <DialogFooter>
            <Button size="sm" onClick={() => setTableOpen(false)}>
              {t("done")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Separator />
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("csvImport")}</Label>
        <p className="text-xs text-muted-foreground mb-1">
          {t("csvImportHelp")}
        </p>
        <textarea
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[80px] resize-y"
          placeholder={t("csvImportPlaceholder")}
          value={csvText}
          onChange={(e) => {
            setCsvText(e.target.value);
            setCsvError(null);
          }}
        />
        {csvError && (
          <p className="text-xs text-destructive mt-1">{csvError}</p>
        )}
        <div className="flex gap-1 mt-1">
          <Select
            value={csvMode}
            onValueChange={(v) => setCsvMode(v as "replace" | "append")}
          >
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="replace">{t("csvReplace")}</SelectItem>
              <SelectItem value="append">{t("csvAppend")}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleCsvImport}
            disabled={!csvText.trim()}
          >
            <Upload className="h-4 w-4 mr-2" />
            {t("csvImportButton")}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Cover Images Panel ─────────────────────────────────────

function CoverImagesPanel() {
  const { state, dispatch, access } = useEditor();
  const t = useTranslations("properties");
  const tc = useTranslations("common");
  const tt = useTranslations("toolbar");
  const { upload } = useUpload();
  const [uploadingSlot, setUploadingSlot] = React.useState<number | null>(null);
  const [showBrandSettings, setShowBrandSettings] = React.useState(false);
  const images = state.settings.coverImages ?? [];

  const isDeOverrideMode = state.localeMode === "DE";
  const titleHasOverride = hasChOverride("_worksheet", "title", state.settings.chOverrides);
  const titleOverride = state.settings.chOverrides?._worksheet?.title;
  const displayTitle = isDeOverrideMode && titleOverride !== undefined ? titleOverride : state.title;
  const canEditTitle = access.features.editTitle;
  const canEditWorksheetSettings = access.features.editWorksheetSettings;

  const handleTitleChange = (value: string) => {
    if (isDeOverrideMode) {
      if (value === state.title) {
        dispatch({ type: "CLEAR_CH_OVERRIDE", payload: { blockId: "_worksheet", fieldPath: "title" } });
      } else {
        dispatch({ type: "SET_CH_OVERRIDE", payload: { blockId: "_worksheet", fieldPath: "title", value } });
      }
    } else {
      dispatch({ type: "SET_TITLE", payload: value });
    }
  };

  const resolvedBrand = applyBrandOverrides(state.brandProfile, state.settings.brandOverrides);
  const toLegacyBrandSettings = (
    profile: {
      logo?: string | null;
      iconLogo?: string | null;
      organization?: string | null;
      teacher?: string | null;
      headerRight?: string | null;
      footerLeft?: string | null;
      footerCenter?: string | null;
      footerRight?: string | null;
    },
    updates: Partial<BrandOverrides> = {},
  ) => {
    const merged = { ...profile, ...updates };
    return {
      logo: merged.logo || merged.iconLogo || "",
      organization: merged.organization || "",
      teacher: merged.teacher || "",
      headerRight: merged.headerRight || "",
      footerLeft: merged.footerLeft || "",
      footerCenter: merged.footerCenter || "",
      footerRight: merged.footerRight || "",
    };
  };

  const updateBrandOverrides = (updates: Partial<BrandOverrides>) => {
    dispatch({
      type: "UPDATE_SETTINGS",
      payload: {
        brandOverrides: { ...state.settings.brandOverrides, ...updates },
        brandSettings: toLegacyBrandSettings(resolvedBrand, updates),
      },
    });
  };

  // Crop dialog state
  const [cropSrc, setCropSrc] = React.useState<string | null>(null);
  const [cropSlot, setCropSlot] = React.useState<number>(0);
  const [cropOpen, setCropOpen] = React.useState(false);

  // Media browser state
  const [browserOpen, setBrowserOpen] = React.useState(false);
  const [browserSlot, setBrowserSlot] = React.useState<number>(0);

  // Ensure we always have a 4-element array
  const slots: (string | null)[] = [0, 1, 2, 3].map((i) => images[i] || null);

  const openBrowser = React.useCallback((slot: number) => {
    setBrowserSlot(slot);
    setBrowserOpen(true);
  }, []);

  const handleFileSelected = React.useCallback((slot: number, file: File) => {
    if (!file.type.startsWith("image/")) return;
    const objectUrl = URL.createObjectURL(file);
    setCropSlot(slot);
    setCropSrc(objectUrl);
    setCropOpen(true);
  }, []);

  const handleSelectExisting = React.useCallback((url: string) => {
    const next = [...slots];
    next[browserSlot] = url;
    dispatch({
      type: "UPDATE_SETTINGS",
      payload: { coverImages: next.map((u) => u ?? "") },
    });
  }, [browserSlot, slots, dispatch]);

  const handleBrowserFile = React.useCallback((file: File) => {
    handleFileSelected(browserSlot, file);
  }, [browserSlot, handleFileSelected]);

  const handleCropComplete = React.useCallback(async (result: CropResult) => {
    setUploadingSlot(cropSlot);
    try {
      const file = new File([result.blob], `cover-${cropSlot}.png`, { type: "image/png" });
      const uploadResult = await upload(file);
      const next = [...slots];
      next[cropSlot] = uploadResult.url;
      dispatch({
        type: "UPDATE_SETTINGS",
        payload: { coverImages: next.map((u) => u ?? "") },
      });
    } catch {
      // skip failed
    } finally {
      setUploadingSlot(null);
      if (cropSrc) URL.revokeObjectURL(cropSrc);
      URL.revokeObjectURL(result.url);
    }
  }, [cropSlot, cropSrc, slots, upload, dispatch]);

  const handleRemove = React.useCallback((slot: number) => {
    const next = [...slots];
    next[slot] = null;
    dispatch({
      type: "UPDATE_SETTINGS",
      payload: { coverImages: next.map((u) => u ?? "") },
    });
  }, [slots, dispatch]);

  const handleDrop = React.useCallback((slot: number, e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelected(slot, file);
  }, [handleFileSelected]);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-[4px] block">{t("title")}</Label>
        <div className="flex items-center gap-1">
          <Input
            value={displayTitle}
            onChange={(e) => handleTitleChange(e.target.value)}
            disabled={!canEditTitle}
            className={`h-8 ${
              isDeOverrideMode && titleHasOverride ? "bg-amber-50/50 border-l-2 border-l-amber-400" : ""
            }`}
            placeholder={tt("titlePlaceholder")}
          />
          {isDeOverrideMode && titleHasOverride && (
            <button
              type="button"
              onClick={() => dispatch({ type: "CLEAR_CH_OVERRIDE", payload: { blockId: "_worksheet", fieldPath: "title" } })}
              disabled={!canEditTitle}
              className="h-6 w-6 flex items-center justify-center rounded hover:bg-red-50 text-amber-500 hover:text-red-500 shrink-0"
              title={tt("clearChTitle")}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-[4px] block">{tt("brandSettings")}</Label>
        <div className="flex items-center gap-1">
          <Select
            value={
              state.settings.subProfileId
                ? `${state.settings.brand || "edoomio"}::${state.settings.subProfileId}`
                : state.settings.brand || "edoomio"
            }
            disabled={!canEditWorksheetSettings}
            onValueChange={(value: string) => {
              const [slug, subId] = value.split("::");
              const selectedProfile = state.availableBrands.find((bp) => bp.slug === slug);
              dispatch({
                type: "UPDATE_SETTINGS",
                payload: {
                  brand: slug as Brand,
                  subProfileId: subId || undefined,
                  brandSettings: toLegacyBrandSettings(selectedProfile || DEFAULT_BRAND_SETTINGS[slug] || DEFAULT_BRAND_SETTINGS["edoomio"]),
                },
              });
            }}
          >
            <SelectTrigger size="sm" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {state.availableBrands.length > 0
                ? state.availableBrands.map((bp) => {
                    const subs = bp.subProfiles ?? [];
                    if (subs.length === 0) {
                      return (
                        <SelectItem key={bp.slug} value={bp.slug}>
                          {bp.name}
                        </SelectItem>
                      );
                    }
                    return (
                      <SelectGroup key={bp.slug}>
                        <SelectLabel className="text-xs text-muted-foreground">{bp.name}</SelectLabel>
                        <SelectItem value={bp.slug}>
                          {bp.name}
                        </SelectItem>
                        {subs.map((sp: BrandSubProfile) => (
                          <SelectItem key={sp.id} value={`${bp.slug}::${sp.id}`}>
                            {bp.name} / {sp.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    );
                  })
                : <>
                    <SelectItem value="edoomio">edoomio</SelectItem>
                    <SelectItem value="lingostar">lingostar</SelectItem>
                    <SelectItem value="agi-frauenfeld">AGI Frauenfeld</SelectItem>
                  </>
              }
            </SelectContent>
          </Select>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={!canEditWorksheetSettings}
                onClick={() => setShowBrandSettings(true)}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{tt("brandSettings")}</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-[4px] block">{tt("countryContext")}</Label>
        <div className="flex items-center gap-2">
          <Select
            value={state.localeMode}
            onValueChange={(value) => dispatch({ type: "SET_LOCALE_MODE", payload: value as "DE" | "CH" })}
          >
            <SelectTrigger size="sm" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CH">Schweiz</SelectItem>
              <SelectItem value="DE">Deutschland</SelectItem>
            </SelectContent>
          </Select>
          {countChOverrides(state.settings.chOverrides) > 0 && (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">
              {countChOverrides(state.settings.chOverrides)}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-[4px] block">{tt("translations")}</Label>
        {canEditWorksheetSettings ? (
          <WorksheetTranslationDialog buttonClassName="w-full" />
        ) : (
          <Button variant="outline" size="sm" disabled className="w-full">
            {tt("translations")}
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-[4px] block">{tt("pdfOrientation")}</Label>
        <Select
          value={state.settings.orientation || "portrait"}
          onValueChange={(value) =>
            dispatch({
              type: "UPDATE_SETTINGS",
              payload: { orientation: value as "portrait" | "landscape" | "landscape-canva" },
            })
          }
        >
          <SelectTrigger size="sm" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="portrait">{tt("pdfOrientationPortrait")}</SelectItem>
            <SelectItem value="landscape">{tt("pdfOrientationLandscape")}</SelectItem>
            <SelectItem value="landscape-canva">{tt("pdfOrientationLandscapeCanva")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-[4px] block">{t("coverSubtitle")}</Label>
        <Input
          value={state.settings.coverSubtitle ?? "Arbeitsblatt"}
          onChange={(e) =>
            dispatch({ type: "UPDATE_SETTINGS", payload: { coverSubtitle: e.target.value } })
          }
          placeholder="Arbeitsblatt"
          className="h-8"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-[4px] block">{t("coverImages")}</Label>
        <div className="grid grid-cols-4 gap-2">
          {slots.map((url, i) => (
            <div key={i} className="space-y-1">
              <span className="block text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {String(i + 1).padStart(2, "0")}
              </span>
              {url ? (
                <div className="relative aspect-square overflow-hidden rounded-[4px] border border-border bg-muted group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`${t("coverImage")} ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemove(i)}
                    className="absolute top-0.5 right-0.5 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => openBrowser(i)}
                  onDrop={(e) => handleDrop(i, e)}
                  onDragOver={(e) => e.preventDefault()}
                  className="flex aspect-square w-full cursor-pointer flex-col items-center justify-center rounded-[4px] border-2 border-dashed border-muted-foreground/30 transition-colors hover:border-muted-foreground/50"
                >
                  {uploadingSlot === i ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <ImagePlus className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <MediaBrowserDialog
        open={browserOpen}
        onOpenChange={setBrowserOpen}
        onSelectUrl={handleSelectExisting}
        onSelectFile={handleBrowserFile}
      />

      <ImageCropDialog
        imageSrc={cropSrc}
        open={cropOpen}
        onOpenChange={(open) => {
          setCropOpen(open);
          if (!open && cropSrc) {
            URL.revokeObjectURL(cropSrc);
            setCropSrc(null);
          }
        }}
        onCropComplete={handleCropComplete}
        aspect={1}
      />
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-[4px] block">{tc("settings")}</Label>
        <div className="border-y border-slate-200 bg-white">
          <div className="flex items-center justify-between py-2">
            <Label className="text-sm text-foreground">{t("coverImageBorder")}</Label>
            <Switch
              checked={state.settings.coverImageBorder ?? false}
              onCheckedChange={(v) =>
                dispatch({ type: "UPDATE_SETTINGS", payload: { coverImageBorder: v } })
              }
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-[4px] block">{t("coverInfoText")}</Label>
        <Input
          value={state.settings.coverInfoText ?? ""}
          onChange={(e) =>
            dispatch({ type: "UPDATE_SETTINGS", payload: { coverInfoText: e.target.value } })
          }
          placeholder={t("coverInfoTextPlaceholder")}
          className="h-8"
        />
      </div>

      <Dialog open={showBrandSettings} onOpenChange={setShowBrandSettings}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{tt("brandSettings")} - {state.brandProfile.name || state.settings.brand || "edoomio"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm font-medium">{tt("brandLogo")}</Label>
              <Input
                value={resolvedBrand.logo}
                onChange={(e) => updateBrandOverrides({ logo: e.target.value })}
                placeholder="/logo/my-logo.svg"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">{tt("brandLogoHelp")}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">{tt("organization")}</Label>
              <Input
                value={resolvedBrand.organization}
                onChange={(e) => updateBrandOverrides({ organization: e.target.value })}
                placeholder={tt("organizationPlaceholder")}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">{tt("teacher")}</Label>
              <Input
                value={resolvedBrand.teacher}
                onChange={(e) => updateBrandOverrides({ teacher: e.target.value })}
                placeholder={tt("teacherPlaceholder")}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">{tt("headerRight")}</Label>
              <textarea
                value={resolvedBrand.headerRight}
                onChange={(e) => updateBrandOverrides({ headerRight: e.target.value })}
                placeholder="HTML..."
                className="mt-1 w-full h-16 px-3 py-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="rounded-md bg-muted/50 p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">{tt("availableVariables")}</p>
              <p className="text-xs text-muted-foreground font-mono">
                {"{current_date}"} · {"{current_year}"} · {"{current_page}"} · {"{no_of_pages}"} · {"{organization}"} · {"{teacher}"} · {"{worksheet_uuid}"}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium">{tt("footerLeft")}</Label>
              <textarea
                value={resolvedBrand.footerLeft}
                onChange={(e) => updateBrandOverrides({ footerLeft: e.target.value })}
                placeholder="HTML..."
                className="mt-1 w-full h-16 px-3 py-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">{tt("footerCenter")}</Label>
              <textarea
                value={resolvedBrand.footerCenter}
                onChange={(e) => updateBrandOverrides({ footerCenter: e.target.value })}
                placeholder="HTML..."
                className="mt-1 w-full h-16 px-3 py-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">{tt("footerRight")}</Label>
              <textarea
                value={resolvedBrand.footerRight}
                onChange={(e) => updateBrandOverrides({ footerRight: e.target.value })}
                placeholder="HTML..."
                className="mt-1 w-full h-16 px-3 py-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Dos and Don'ts Props ─────────────────────────────────────
function DosAndDontsProps({ block }: { block: DosAndDontsBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");

  const updateList = (
    list: "dos" | "donts",
    items: DosAndDontsBlock["dos"]
  ) => {
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { [list]: items } },
    });
  };

  const addItem = (list: "dos" | "donts") => {
    updateList(list, [
      ...block[list],
      { id: crypto.randomUUID(), text: "" },
    ]);
  };

  const removeItem = (list: "dos" | "donts", index: number) => {
    if (block[list].length <= 1) return;
    updateList(
      list,
      block[list].filter((_, i) => i !== index)
    );
  };

  const moveItem = (
    list: "dos" | "donts",
    index: number,
    direction: "up" | "down"
  ) => {
    const items = [...block[list]];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= items.length) return;
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
    updateList(list, items);
  };

  const renderSection = (
    list: "dos" | "donts",
    titleField: "dosTitle" | "dontsTitle",
    label: string,
    icon: React.ReactNode
  ) => (
    <div className="space-y-2">
      <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">
        {icon} {label}
      </Label>
      <ChInput
        blockId={block.id}
        fieldPath={titleField}
        baseValue={block[titleField]}
        onBaseChange={(v) =>
          dispatch({
            type: "UPDATE_BLOCK",
            payload: { id: block.id, updates: { [titleField]: v } },
          })
        }
        className="h-8 text-sm"
        placeholder={label}
      />
      {block[list].map((item, i) => (
        <div key={item.id} className="flex items-center gap-1 border rounded p-1.5 bg-white">
          <ChInput
            blockId={block.id}
            fieldPath={`${list}.${i}.text`}
            baseValue={item.text}
            onBaseChange={(v) => {
              const newItems = [...block[list]];
              newItems[i] = { ...newItems[i], text: v };
              updateList(list, newItems);
            }}
            className="h-7 text-xs flex-1"
            placeholder="…"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => moveItem(list, i, "up")}
            disabled={i === 0}
          >
            <ChevronUp className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => moveItem(list, i, "down")}
            disabled={i === block[list].length - 1}
          >
            <ChevronDown className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => removeItem(list, i)}
            disabled={block[list].length <= 1}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={() => addItem(list)}
        className="w-full"
      >
        <Plus className="h-3.5 w-3.5 mr-1" /> {t("addItem")}
      </Button>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm">{t("dosLayout")}</Label>
        <Select
          value={block.layout ?? "horizontal"}
          onValueChange={(v) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { layout: v as "horizontal" | "vertical" } },
            })
          }
        >
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="horizontal">{t("dosHorizontal")}</SelectItem>
            <SelectItem value="vertical">{t("dosVertical")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-sm">{t("dosShowTitles")}</Label>
        <Switch
          checked={block.showTitles !== false}
          onCheckedChange={(checked) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { showTitles: checked } },
            })
          }
        />
      </div>
      <Separator />
      {renderSection(
        "dos",
        "dosTitle",
        "Do",
        <Check className="h-3.5 w-3.5 text-emerald-600" />
      )}
      <Separator />
      {renderSection(
        "donts",
        "dontsTitle",
        "Don't",
        <X className="h-3.5 w-3.5 text-red-500" />
      )}
    </div>
  );
}

// ─── Text Comparison Props ───────────────────────────────────
function TextComparisonProps({ block }: { block: TextComparisonBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("textComment")}</Label>
        <textarea
          value={block.comment || ""}
          onChange={(e) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { comment: e.target.value } },
            })
          }
          placeholder={t("textCommentPlaceholder")}
          className="w-full min-h-[60px] rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y"
          rows={3}
        />
      </div>
    </div>
  );
}

// ─── AI Prompt Props ─────────────────────────────────────────
function AiPromptProps({ block }: { block: AiPromptBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");
  const update = (updates: Partial<AiPromptBlock>) =>
    dispatch({ type: "UPDATE_BLOCK", payload: { id: block.id, updates } });

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("aiPromptDescription")}</Label>
        <Input
          value={block.description}
          onChange={(e) => update({ description: e.target.value })}
          placeholder={t("aiPromptDescriptionPlaceholder")}
        />
      </div>
      <Separator />
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("aiPromptInstructions")}</Label>
        <textarea
          value={block.instructions}
          onChange={(e) => update({ instructions: e.target.value })}
          placeholder={t("aiPromptInstructionsPlaceholder")}
          className="w-full min-h-[60px] p-2 rounded-md border border-slate-200 bg-white text-sm resize-y focus:outline-none focus:ring-2 focus:ring-violet-300"
        />
      </div>
      <Separator />
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("aiPromptVariableName")}</Label>
        <Input
          value={block.variableName}
          onChange={(e) => update({ variableName: e.target.value.replace(/\s/g, "_") })}
          placeholder="stelleninserat"
        />
        <p className="text-xs text-muted-foreground mt-1">{t("aiPromptVariableHint")}</p>
      </div>
      <Separator />
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("aiPromptTemplate")}</Label>
        <textarea
          value={block.prompt}
          onChange={(e) => update({ prompt: e.target.value })}
          placeholder={`Analysiere das folgende Stelleninserat:\n\n{{${block.variableName}}}`}
          className="w-full min-h-[120px] p-2 rounded-md border border-slate-200 bg-white text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-violet-300"
        />
        <p className="text-xs text-muted-foreground mt-1">
          {t("aiPromptTemplateHint", { variable: `{{${block.variableName}}}` })}
        </p>
      </div>
    </div>
  );
}

// ─── AI Tool Props ──────────────────────────────────────────
function AiToolProps({ block }: { block: AiToolBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");
  const [tools, setTools] = React.useState<{ toolKey: string; title: string; description: string; category: string }[]>([]);
  const [loading, setLoading] = React.useState(false);

  const update = (updates: Partial<AiToolBlock>) =>
    dispatch({ type: "UPDATE_BLOCK", payload: { id: block.id, updates } });

  // Fetch published tools
  React.useEffect(() => {
    setLoading(true);
    fetch("/api/ai-tools/registry", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setTools(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSelectTool = (toolKey: string) => {
    const tool = tools.find((t) => t.toolKey === toolKey);
    if (tool) {
      update({
        toolKey: tool.toolKey,
        toolTitle: tool.title,
        toolDescription: tool.description || "",
        latestRunId: "",
      });
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">
          {t("aiToolSelect")}
        </Label>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("aiToolLoading")}
          </div>
        ) : tools.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t("aiToolNoTools")}</p>
        ) : (
          <Select value={block.toolKey || ""} onValueChange={handleSelectTool}>
            <SelectTrigger>
              <SelectValue placeholder={t("aiToolSelectPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {tools.map((tool) => (
                <SelectItem key={tool.toolKey} value={tool.toolKey}>
                  <div className="flex items-center gap-2">
                    <Bot className="h-3.5 w-3.5 text-violet-500" />
                    {tool.title}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {block.toolKey && (
        <>
          <Separator />
          <div>
            <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">
              {t("aiToolTitleOverride")}
            </Label>
            <Input
              value={block.toolTitle}
              onChange={(e) => update({ toolTitle: e.target.value })}
              placeholder={t("aiToolTitlePlaceholder")}
            />
          </div>
          <Separator />
          <div>
            <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">
              {t("aiToolDescriptionOverride")}
            </Label>
            <textarea
              value={block.toolDescription}
              onChange={(e) => update({ toolDescription: e.target.value })}
              placeholder={t("aiToolDescriptionPlaceholder")}
              className="w-full min-h-[60px] p-2 rounded-md border border-slate-200 bg-white text-sm resize-y focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
          </div>
        </>
      )}
    </div>
  );
}

// ─── Audio Properties ────────────────────────────────────────
function AudioProps({ block }: { block: AudioBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");
  const { upload } = useUpload();
  const [isUploading, setIsUploading] = React.useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("audio/")) return;
    setIsUploading(true);
    try {
      const result = await upload(file);
      dispatch({
        type: "UPDATE_BLOCK",
        payload: { id: block.id, updates: { src: result.url } },
      });
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("audioFile")}</Label>
        {block.src ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 rounded border border-slate-200 bg-white p-2 text-xs text-slate-600 truncate">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
              <span className="truncate flex-1">{block.src.split("/").pop()}</span>
              <button
                type="button"
                onClick={() => dispatch({ type: "UPDATE_BLOCK", payload: { id: block.id, updates: { src: "" } } })}
                className="text-red-400 hover:text-red-600 shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <label className="flex flex-col items-center gap-2 rounded-md border-2 border-dashed border-slate-200 p-4 cursor-pointer hover:border-slate-300 transition-colors">
            {isUploading ? (
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            ) : (
              <Upload className="w-5 h-5 text-slate-400" />
            )}
            <span className="text-xs text-slate-500">{isUploading ? t("uploading") : t("audioUploadHint")}</span>
            <input
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </label>
        )}
      </div>
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("audioTitle")}</Label>
        <Input
          value={block.title || ""}
          onChange={(e) => dispatch({ type: "UPDATE_BLOCK", payload: { id: block.id, updates: { title: e.target.value } } })}
          placeholder={t("audioTitlePlaceholder")}
        />
      </div>
    </div>
  );
}

// ─── Schedule Properties ─────────────────────────────────────
function ScheduleProps({ block }: { block: ScheduleBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");
  const tc = useTranslations("common");

  const update = (updates: Partial<ScheduleBlock>) => {
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates },
    });
  };

  const updateItem = (index: number, updates: Partial<ScheduleItem>) => {
    const newItems = [...block.items];
    newItems[index] = { ...newItems[index], ...updates };
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: newItems } },
    });
  };

  const addItem = () => {
    const last = block.items[block.items.length - 1];
    const newItems = [
      ...block.items,
      {
        id: `s${Date.now()}`,
        date: last?.date || "",
        start: last?.end || "09:00",
        end: "",
        room: last?.room || "",
        title: "",
        description: "",
      },
    ];
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: newItems } },
    });
  };

  const removeItem = (index: number) => {
    const newItems = block.items.filter((_, i) => i !== index);
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: newItems } },
    });
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    const newItems = [...block.items];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newItems.length) return;
    [newItems[index], newItems[swapIndex]] = [newItems[swapIndex], newItems[index]];
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: newItems } },
    });
  };

  const renderSwitchRow = (
    label: string,
    checked: boolean,
    onCheckedChange: (checked: boolean) => void,
    options?: { withTopDivider?: boolean; withBottomBorder?: boolean }
  ) => (
    <>
      {options?.withTopDivider ? <Separator /> : null}
      <div
        className={`flex h-8 items-center justify-between ${options?.withBottomBorder === false ? "" : "border-b border-border"}`}
      >
        <Label className="text-sm">{label}</Label>
        <Switch checked={checked} onCheckedChange={onCheckedChange} />
      </div>
    </>
  );

  return (
    <div className="space-y-3 overflow-hidden">
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("scheduleItems")}</Label>
        {block.items.map((item, i) => (
          <div key={item.id} className="space-y-2">
            {(block.showDate ?? false) && (
              <Input
                type="date"
                value={item.date ?? ""}
                onChange={(e) => updateItem(i, { date: e.target.value })}
                className="h-8 text-xs"
              />
            )}
            <div className="flex items-center gap-1.5">
              <span className="w-6 shrink-0 text-left text-xs tabular-nums text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
              <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-1">
                <Input
                  type="time"
                  value={item.start}
                  onChange={(e) => updateItem(i, { start: e.target.value })}
                  placeholder="00:00"
                  className="h-8 min-w-0 text-xs"
                />
                <span className="flex h-8 items-center justify-center text-xs text-muted-foreground">-</span>
                <Input
                  type="time"
                  value={item.end}
                  onChange={(e) => updateItem(i, { end: e.target.value })}
                  placeholder="00:00"
                  className="h-8 min-w-0 text-xs"
                />
              </div>
              <div className="flex w-[40px] shrink-0 items-center justify-end gap-1">
                <div className="flex flex-col">
                  <button
                    className="h-3 p-0 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    onClick={() => moveItem(i, "up")}
                    disabled={i === 0}
                    type="button"
                  >
                    <ArrowUpDown className="h-2.5 w-2.5 rotate-180" />
                  </button>
                  <button
                    className="h-3 p-0 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    onClick={() => moveItem(i, "down")}
                    disabled={i === block.items.length - 1}
                    type="button"
                  >
                    <ArrowUpDown className="h-2.5 w-2.5" />
                  </button>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => removeItem(i)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
            {(block.showRoom ?? false) && (
              <div className="flex items-center gap-1.5">
                <span className="w-6 shrink-0" />
                <ChInput
                  blockId={block.id}
                  fieldPath={`items.${i}.room`}
                  baseValue={item.room ?? ""}
                  onBaseChange={(v) => updateItem(i, { room: v })}
                  className="h-8 flex-1 text-xs"
                  placeholder={t("scheduleRoom")}
                />
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span className="w-6 shrink-0" />
              <ChInput
                blockId={block.id}
                fieldPath={`items.${i}.title`}
                baseValue={item.title}
                onBaseChange={(v) => updateItem(i, { title: v })}
                className="h-8 flex-1 text-xs"
                placeholder={t("scheduleTitlePlaceholder")}
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-6 shrink-0" />
              <ChInput
                blockId={block.id}
                fieldPath={`items.${i}.description`}
                baseValue={item.description}
                onBaseChange={(v) => updateItem(i, { description: v })}
                className="h-8 flex-1 text-xs"
                placeholder={t("scheduleDescription")}
              />
            </div>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addItem} className="w-full">
          <Plus className="h-3.5 w-3.5 mr-1" /> {t("addItem")}
        </Button>
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("settings")}</Label>
        <div>
          {renderSwitchRow(
            t("bilingual"),
            block.bilingual ?? false,
            (checked) => update({ bilingual: checked }),
            { withTopDivider: true }
          )}
          {renderSwitchRow(
            t("showDate"),
            block.showDate ?? false,
            (checked) => update({ showDate: checked })
          )}
          {renderSwitchRow(
            t("showRoom"),
            block.showRoom ?? false,
            (checked) => update({ showRoom: checked })
          )}
          {renderSwitchRow(
            t("showHeader"),
            block.showHeader ?? false,
            (checked) => update({ showHeader: checked }),
            { withBottomBorder: false }
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Website Properties ─────────────────────────────────────
function WebsiteProps({ block }: { block: WebsiteBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");
  const [csvText, setCsvText] = React.useState("");
  const [csvError, setCsvError] = React.useState<string | null>(null);
  const [csvMode, setCsvMode] = React.useState<"replace" | "append">("replace");

  const update = (updates: Partial<WebsiteBlock>) => {
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates },
    });
  };

  const sortItemsByTitle = () => {
    const collator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });
    const sortedItems = [...block.items].sort((a, b) => {
      const titleA = (a.title ?? "").trim();
      const titleB = (b.title ?? "").trim();

      if (!titleA && !titleB) return 0;
      if (!titleA) return 1;
      if (!titleB) return -1;

      return collator.compare(titleA, titleB);
    });

    update({ items: sortedItems });
  };

  const parseDelimitedRow = (line: string, delimiter: string) => {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const next = line[i + 1];

      if (char === '"') {
        if (inQuotes && next === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (char === delimiter && !inQuotes) {
        values.push(current.trim());
        current = "";
        continue;
      }

      current += char;
    }

    values.push(current.trim());
    return values;
  };

  const detectDelimiter = (line: string) => {
    const candidates = [";", "\t", ","];
    let best = ",";
    let bestCount = -1;

    for (const candidate of candidates) {
      const count = parseDelimitedRow(line, candidate).length;
      if (count > bestCount) {
        best = candidate;
        bestCount = count;
      }
    }

    return best;
  };

  const handleCsvImport = () => {
    setCsvError(null);
    const text = csvText.trim();
    if (!text) return;

    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length === 0) {
      setCsvError(t("csvNoData"));
      return;
    }

    const importedItems = lines.map((line, index) => {
      const delimiter = detectDelimiter(line);
      const [title = "", url = "", third = "", ...rest] = parseDelimitedRow(line, delimiter);
      const body = rest.length > 0 ? rest.join(delimiter).trim() : third;
      return {
        id: `website-${Date.now()}-${index}`,
        title,
        url,
        category: body,
        description: "",
        image: "",
        pageBreakAfter: false,
      };
    }).filter((item) => item.title || item.url || item.category);

    if (importedItems.length === 0) {
      setCsvError(t("csvNoData"));
      return;
    }

    update({
      items: csvMode === "append"
        ? [...block.items, ...importedItems]
        : importedItems,
    });
    setCsvText("");
  };

  return (
    <div className="space-y-3 overflow-hidden">
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("websiteBlockTitle")}</Label>
        <ChInput
          blockId={block.id}
          fieldPath="title"
          baseValue={block.title}
          onBaseChange={(value) => update({ title: value })}
          placeholder={t("websiteBlockTitle")}
        />
      </div>
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("level")}</Label>
        <Select
          value={String(block.level)}
          onValueChange={(value) => update({ level: Number(value) as 1 | 2 | 3 })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">{t("heading1")}</SelectItem>
            <SelectItem value="2">{t("heading2")}</SelectItem>
            <SelectItem value="3">{t("heading3")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-sm">{t("bilingual")}</Label>
        <Switch
          checked={block.bilingual ?? false}
          onCheckedChange={(checked) => update({ bilingual: checked })}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-sm">{t("skipTranslation")}</Label>
        <Switch
          checked={block.skipTranslation ?? false}
          onCheckedChange={(checked) => update({ skipTranslation: checked })}
        />
      </div>
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={sortItemsByTitle}
        disabled={block.items.length < 2}
      >
        <ArrowUpDown className="h-4 w-4 mr-2" />
        {t("sortItemsAZ")}
      </Button>
      <Separator />
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("csvImport")}</Label>
        <p className="text-xs text-muted-foreground mb-1">
          {t("websiteCsvImportHelp")}
        </p>
        <textarea
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[96px] resize-y"
          placeholder={t("websiteCsvPlaceholder")}
          value={csvText}
          onChange={(e) => {
            setCsvText(e.target.value);
            setCsvError(null);
          }}
        />
        {csvError && (
          <p className="text-xs text-destructive mt-1">{csvError}</p>
        )}
        <div className="flex gap-1 mt-1">
          <Select
            value={csvMode}
            onValueChange={(value) => setCsvMode(value as "replace" | "append")}
          >
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="replace">{t("csvReplace")}</SelectItem>
              <SelectItem value="append">{t("csvAppend")}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleCsvImport}
            disabled={!csvText.trim()}
          >
            <Upload className="h-4 w-4 mr-2" />
            {t("csvImportButton")}
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full mt-1"
          onClick={sortItemsByTitle}
          disabled={block.items.length < 2}
        >
          <ArrowUpDown className="h-4 w-4 mr-2" />
          {t("sortItemsAZ")}
        </Button>
      </div>
    </div>
  );
}

// ─── Table Properties ────────────────────────────────────────

/** Count columns from the first row of a table HTML string */
function countTableColumns(html: string): number {
  const parser = typeof DOMParser !== "undefined" ? new DOMParser() : null;
  if (!parser) return 0;
  const doc = parser.parseFromString(html, "text/html");
  const firstRow = doc.querySelector("tr");
  if (!firstRow) return 0;
  return firstRow.querySelectorAll("td, th").length;
}

/** Controlled input that uses local state while editing, commits on blur/Enter */
function ColWidthInput({
  index,
  percentage,
  onCommit,
}: {
  index: number;
  percentage: number;
  onCommit: (value: number) => void;
}) {
  const [localVal, setLocalVal] = React.useState(String(percentage));
  const [editing, setEditing] = React.useState(false);

  // Sync from parent when not editing
  React.useEffect(() => {
    if (!editing) setLocalVal(String(percentage));
  }, [percentage, editing]);

  const commit = () => {
    setEditing(false);
    const parsed = parseFloat(localVal);
    if (!isNaN(parsed) && parsed !== percentage) {
      onCommit(parsed);
    } else {
      setLocalVal(String(percentage));
    }
  };

  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] text-muted-foreground whitespace-nowrap">{index + 1}:</span>
      <Input
        type="text"
        inputMode="decimal"
        value={localVal}
        onFocus={(e) => {
          setEditing(true);
          e.target.select();
        }}
        onChange={(e) => {
          setEditing(true);
          // Allow digits and one decimal point
          setLocalVal(e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1"));
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
            (e.target as HTMLInputElement).blur();
          }
          if (e.key === "Escape") {
            setEditing(false);
            setLocalVal(String(percentage));
            (e.target as HTMLInputElement).blur();
          }
        }}
        className="h-7 text-xs text-center px-1"
      />
      <span className="text-[10px] text-muted-foreground">%</span>
    </div>
  );
}

function TableProps({ block }: { block: TableBlock | TableCloudBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");
  const tc = useTranslations("common");

  const tableStyles: { value: TableStyle; label: string }[] = [
    { value: "default", label: t("tableStyleDefault") },
    { value: "striped", label: t("tableStyleStriped") },
    { value: "bordered", label: t("tableStyleBordered") },
    { value: "minimal", label: t("tableStyleMinimal") },
  ];

  const colCount = React.useMemo(() => countTableColumns(block.content), [block.content]);

  // Get current column percentages from block data
  const colPercentages = React.useMemo(() => {
    if (colCount === 0) return [];
    if (block.columnWidths && block.columnWidths.length === colCount) {
      return block.columnWidths;
    }
    // Default: equal distribution
    const equal = Math.round((100 / colCount) * 10) / 10;
    return Array(colCount).fill(equal);
  }, [block.columnWidths, colCount]);

  const total = React.useMemo(() => {
    return Math.round(colPercentages.reduce((s, p) => s + p, 0) * 10) / 10;
  }, [colPercentages]);

  const handlePercentageChange = (colIdx: number, newPercent: number) => {
    const clamped = Math.max(1, Math.min(100, newPercent));
    const newWidths = [...colPercentages];
    newWidths[colIdx] = clamped;

    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { columnWidths: newWidths } },
    });
  };

  const handleResetWidths = () => {
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { columnWidths: undefined } },
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("instruction")}</Label>
        <ChInput
          blockId={block.id}
          fieldPath="instruction"
          baseValue={block.instruction ?? ""}
          onBaseChange={(v) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { instruction: v } },
            })
          }
        />
      </div>

      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{tc("description")}</Label>
        <ChInput
          blockId={block.id}
          fieldPath="description"
          baseValue={block.description ?? ""}
          onBaseChange={(v) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { description: v } },
            })
          }
          multiline
        />
      </div>

      {block.type === "table-cloud" ? (
        <div>
          <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] block">{t("tableCloudRows")}</Label>
          <ChInput
            blockId={block.id}
            fieldPath="cloudRows"
            baseValue={block.cloudRows ?? ""}
            onBaseChange={(v) =>
              dispatch({
                type: "UPDATE_BLOCK",
                payload: { id: block.id, updates: { cloudRows: v } },
              })
            }
            multiline
            placeholder={t("tableCloudRowsPlaceholder")}
          />
          <p className="mt-1 text-[11px] text-muted-foreground">{t("tableCloudRowsHelp")}</p>
        </div>
      ) : null}

      <Separator />

      <div>
        <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px]">
          {t("tableSettings")}
        </div>

        {/* Table Style */}
        <div className="space-y-1.5">
          <Label className="text-xs">{t("tableStyle")}</Label>
          <Select
            value={block.tableStyle ?? "default"}
            onValueChange={(val) =>
              dispatch({
                type: "UPDATE_BLOCK",
                payload: { id: block.id, updates: { tableStyle: val as TableStyle } },
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tableStyles.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Column Widths */}
        {colCount > 0 && (
          <div className="space-y-1.5 mt-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs">{t("tableColumnWidths")}</Label>
              {total !== 100 && (
                <span className="text-[10px] font-medium text-amber-600">
                  {t("tableWidthsTotal")}: {total}%
                </span>
              )}
            </div>
            {/* Visual bar */}
            <div className="flex h-6 rounded-md overflow-hidden border border-slate-200">
              {colPercentages.map((pct, i) => (
                <div
                  key={i}
                  className="flex items-center justify-center text-[10px] font-medium border-r last:border-r-0 border-slate-200 transition-all"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: `hsl(${210 + i * 30}, 60%, ${92 - i * 3}%)`,
                    color: "#475569",
                  }}
                >
                  {pct}%
                </div>
              ))}
            </div>
            {/* Precise inputs */}
            <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.min(colCount, 4)}, 1fr)` }}>
              {colPercentages.map((pct, i) => (
                <ColWidthInput
                  key={i}
                  index={i}
                  percentage={pct}
                  onCommit={(val) => handlePercentageChange(i, val)}
                />
              ))}
            </div>
            {block.columnWidths && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs w-full mt-1"
                onClick={handleResetWidths}
              >
                {t("tableResetWidths")}
              </Button>
            )}
          </div>
        )}

        {/* Caption */}
        <div className="space-y-1.5 mt-3">
          <Label className="text-xs">{t("tableCaption")}</Label>
          <Input
            value={block.caption ?? ""}
            onChange={(e) =>
              dispatch({
                type: "UPDATE_BLOCK",
                payload: { id: block.id, updates: { caption: e.target.value } },
              })
            }
            placeholder={t("tableCaptionPlaceholder")}
          />
        </div>

        {/* First Row as Example */}
        <div className="flex items-center justify-between mt-3">
          <Label className="text-xs">{t("tableFirstRowAsExample")}</Label>
          <Switch
            checked={block.firstRowAsExample ?? false}
            onCheckedChange={(v) =>
              dispatch({
                type: "UPDATE_BLOCK",
                payload: { id: block.id, updates: { firstRowAsExample: v } },
              })
            }
          />
        </div>

        <div className="flex items-center justify-between mt-3">
          <Label className="text-xs">{t("tableHideHeader")}</Label>
          <Switch
            checked={block.hideHeader ?? false}
            onCheckedChange={(v) =>
              dispatch({
                type: "UPDATE_BLOCK",
                payload: { id: block.id, updates: { hideHeader: v } },
              })
            }
          />
        </div>

        <div className="flex items-center justify-between mt-3">
          <Label className="text-xs">{t("skipTranslation")}</Label>
          <Switch
            checked={block.skipTranslation ?? false}
            onCheckedChange={(v) =>
              dispatch({
                type: "UPDATE_BLOCK",
                payload: { id: block.id, updates: { skipTranslation: v } },
              })
            }
          />
        </div>
      </div>
    </div>
  );
}

export function PropertiesPanel() {
  const { state, dispatch } = useEditor();
  const t = useTranslations("properties");
  const tc = useTranslations("common");
  const tb = useTranslations("blocks");

  const selectedBlock = React.useMemo(() => {
    if (!state.selectedBlockId) return undefined;
    for (const b of state.blocks) {
      if (b.id === state.selectedBlockId) return b;
      if (b.type === "columns") {
        for (const col of b.children) {
          for (const child of col) {
            if (child.id === state.selectedBlockId) return child;
          }
        }
      }
      if (b.type === "grid") {
        for (const cell of b.children) {
          for (const child of cell) {
            if (child.id === state.selectedBlockId) return child;
          }
        }
      }
      if (b.type === "accordion") {
        for (const item of b.items) {
          for (const child of item.children) {
            if (child.id === state.selectedBlockId) return child;
          }
        }
      }
    }
    return undefined;
  }, [state.blocks, state.selectedBlockId]);

  const legacyVisibility: BlockVisibility = selectedBlock?.visibility ?? "both";
  const displayOn: BlockDisplayOn = {
    course: selectedBlock?.displayOn?.course ?? true,
    worksheetOnline:
      selectedBlock?.displayOn?.worksheetOnline ??
      (legacyVisibility === "both" ||
      legacyVisibility === "online"),
    worksheetPrint:
      selectedBlock?.displayOn?.worksheetPrint ??
      (legacyVisibility === "both" ||
      legacyVisibility === "print"),
  };

  const selectedBlockName = React.useMemo(() => {
    if (!selectedBlock) return "";
    const def = BLOCK_LIBRARY.find((entry) => entry.type === selectedBlock.type);
    const blockLabel = def ? tb(def.labelKey) : selectedBlock.type;
    return `${blockLabel} | ${selectedBlock.type}`;
  }, [selectedBlock, tb]);

  if (!selectedBlock) {
    return (
      <div className="w-80 pt-4 pb-8">
        <div className="space-y-3 rounded-[4px] border border-border bg-white p-4">
          <CoverImagesPanel />
        </div>
      </div>
    );
  }

  const updateDisplayOn = (next: BlockDisplayOn) => {
    if (!next.course && !next.worksheetOnline && !next.worksheetPrint) return;
    dispatch({
      type: "SET_BLOCK_DISPLAY_ON",
      payload: { id: selectedBlock.id, displayOn: next },
    });
  };

  const renderBlockProps = () => {
    switch (selectedBlock.type) {
      case "heading":
        return <HeadingProps block={selectedBlock} />;
      case "title":
        return <TitleProps block={selectedBlock as TitleBlock} />;
      case "numbered-heading":
        return <HeadingProps block={selectedBlock} />;
      case "segmentation":
        return <SegmentationProps block={selectedBlock as import("@/types/worksheet").SegmentationBlock} />;
      case "free-form":
        return <FreeFormProps block={selectedBlock as FreeFormBlock} />;
      case "image":
        return <ImageProps block={selectedBlock} />;
      case "image-cards":
        return <ImageCardsProps block={selectedBlock} />;
      case "image-text-table":
        return <ImageTextTableProps block={selectedBlock} />;
      case "text-cards":
        return <TextCardsProps block={selectedBlock} />;
      case "spacer":
        return <SpacerProps block={selectedBlock} />;
      case "divider":
        return <DividerProps block={selectedBlock} />;
      case "logo-divider":
        return null;
      case "page-break":
        return <PageBreakProps block={selectedBlock} />;
      case "writing-lines":
        return <WritingLinesProps block={selectedBlock} />;
      case "writing-rows":
        return <WritingRowsProps block={selectedBlock} />;
      case "multiple-choice":
        return <MultipleChoiceProps block={selectedBlock} />;
      case "open-response":
        return <OpenResponseProps block={selectedBlock} />;
      case "fill-in-blank":
        return <FillInBlankProps block={selectedBlock} />;
      case "fill-in-blank-items":
        return <FillInBlankItemsProps block={selectedBlock} />;
      case "matching":
        return <MatchingProps block={selectedBlock} />;
      case "text-matching":
        return <TextMatchingProps block={selectedBlock as TextMatchingBlock} />;
      case "pronunciation":
        return <MatchingProps block={selectedBlock} />;
      case "two-column-fill":
        return <TwoColumnFillProps block={selectedBlock} />;
      case "glossary":
        return <GlossaryProps block={selectedBlock} />;
      case "word-bank":
        return <WordBankProps block={selectedBlock} />;
      case "columns":
        return <ColumnsProps block={selectedBlock} />;
      case "grid":
        return <GridProps block={selectedBlock as GridBlock} />;
      case "domino":
        return <DominoProps block={selectedBlock as DominoBlock} />;
      case "card-pairs":
        return <CardPairsProps block={selectedBlock as CardPairsBlock} />;
      case "flashcards":
        return <FlashcardsProps block={selectedBlock as FlashcardsBlock} />;
      case "aufgabenkarten":
        return <AufgabenkartenProps block={selectedBlock as AufgabenkartenBlock} />;
      case "syllable-cards":
        return <SyllableCardsProps block={selectedBlock as SyllableCardsBlock} />;
      case "board-game":
        return <BoardGameProps block={selectedBlock as BoardGameBlock} />;
      case "bingo-cards":
        return <BingoCardsPropEditor block={selectedBlock as import("@/types/worksheet").BingoCardsBlock} />;
      case "true-false-matrix":
        return <TrueFalseMatrixProps block={selectedBlock} />;
      case "mcq-matrix":
        return <MCQMatrixProps block={selectedBlock} />;
      case "mcq-rows":
        return <MCQRowsProps block={selectedBlock} />;
      case "article-training":
        return <ArticleTrainingProps block={selectedBlock} />;
      case "order-items":
        return <OrderItemsProps block={selectedBlock} />;
      case "inline-choices":
        return <InlineChoicesProps block={selectedBlock} />;
      case "crossword":
        return <CrosswordProps block={selectedBlock} />;
      case "word-search":
        return <WordSearchProps block={selectedBlock} />;
      case "sorting-categories":
        return <SortingCategoriesProps block={selectedBlock} />;
      case "correct-spelling":
      case "correct-numbers":
        return <CorrectSpellingProps block={selectedBlock} />;
      case "missing-letters":
        return <CorrectSpellingProps block={selectedBlock} />;
      case "letter-code":
        return <LetterCodeProps block={selectedBlock as LetterCodeBlock} />;
      case "unscramble-words":
        return <UnscrambleWordsProps block={selectedBlock} />;
      case "fix-sentences":
        return <FixSentencesProps block={selectedBlock} />;
      case "complete-sentences":
        return <CompleteSentencesProps block={selectedBlock} />;
      case "start-sentences":
        return <StartSentencesProps block={selectedBlock} />;
      case "reading-comprehension":
        return <ReadingComprehensionProps block={selectedBlock} />;
      case "transform-sentences":
        return <TransformSentencesProps block={selectedBlock} />;
      case "verb-table":
        return <VerbTableProps block={selectedBlock} />;
      case "chart":
        return <ChartProps block={selectedBlock} />;
      case "dialogue":
        return <DialogueProps block={selectedBlock} />;
      case "lueckenzeilen":
        return <LueckenzeilenProps block={selectedBlock} />;
      case "email-skeleton":
        return <EmailSkeletonProps block={selectedBlock} />;
      case "text-snippet":
        return <TextSnippetProps block={selectedBlock as TextSnippetBlock} />;
      case "job-application":
        return <JobApplicationProps block={selectedBlock as JobApplicationBlock} />;
      case "dos-and-donts":
        return <DosAndDontsProps block={selectedBlock as DosAndDontsBlock} />;
      case "text-comparison":
        return <TextComparisonProps block={selectedBlock as TextComparisonBlock} />;
      case "numbered-items":
        return <NumberedItemsProps block={selectedBlock as NumberedItemsBlock} />;
      case "box":
        return <BoxProps block={selectedBlock as BoxBlock} />;
      case "quartett":
        return <QuartettProps block={selectedBlock as QuartettBlock} />;
      case "taboo":
        return <TabooProps block={selectedBlock as TabooBlock} />;
      case "checklist":
        return <ChecklistProps block={selectedBlock as ChecklistBlock} />;
      case "accordion":
        return <AccordionProps block={selectedBlock as AccordionBlock} />;
      case "ai-prompt":
        return <AiPromptProps block={selectedBlock as AiPromptBlock} />;
      case "ai-tool":
        return <AiToolProps block={selectedBlock as AiToolBlock} />;
      case "table":
        return <TableProps block={selectedBlock as TableBlock} />;
      case "table-cloud":
        return <TableProps block={selectedBlock as TableCloudBlock} />;
      case "audio":
        return <AudioProps block={selectedBlock as AudioBlock} />;
      case "schedule":
        return <ScheduleProps block={selectedBlock as ScheduleBlock} />;
      case "website":
        return <WebsiteProps block={selectedBlock as WebsiteBlock} />;
      case "numbered-label":
        return <NumberedLabelProps block={selectedBlock} />;
      case "text":
        return <TextProps block={selectedBlock} />;
      case "syllables":
        return <SyllablesProps block={selectedBlock as SyllablesBlock} />;
      default:
        return null;
    }
  };

  return (
    <div className="w-80 flex flex-col h-full pt-4 pb-8">
      <div className="flex flex-col h-full bg-white border border-foreground rounded-sm overflow-hidden min-h-0">
      <ScrollArea className="flex-1 overflow-hidden scrollbar-hide">
        <div className="p-4 space-y-4 [&_input]:bg-white [&_input]:shadow-none [&_button[data-slot=select-trigger]]:bg-white [&_button[data-slot=select-trigger]]:shadow-none [&_textarea]:bg-white [&_textarea]:border-0 [&_label.block.mb-2]:rounded-[4px]">
          <div className="text-sm font-semibold text-slate-800 uppercase">{selectedBlockName}</div>

          {/* Visibility */}
          <div>
            <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-sky-50 rounded-[4px] mb-2">{tc("visibility")}</div>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() =>
                      updateDisplayOn({
                        ...displayOn,
                        course: !displayOn.course,
                      })
                    }
                    className={`flex items-center justify-center h-8 flex-1 rounded-[4px] border transition-colors
                      ${displayOn.course
                        ? "bg-white text-slate-700 border-slate-300"
                        : "bg-white text-slate-300 border-slate-200 hover:text-slate-400"}`}
                  >
                    <BookOpen className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Course</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() =>
                      updateDisplayOn({
                        ...displayOn,
                        worksheetPrint: !displayOn.worksheetPrint,
                      })
                    }
                    className={`flex items-center justify-center h-8 flex-1 rounded-[4px] border transition-colors
                      ${displayOn.worksheetPrint
                        ? "bg-white text-slate-700 border-slate-300"
                        : "bg-white text-slate-300 border-slate-200 hover:text-slate-400"}`}
                  >
                    <Printer className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">{tc("print")}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() =>
                      updateDisplayOn({
                        ...displayOn,
                        worksheetOnline: !displayOn.worksheetOnline,
                      })
                    }
                    className={`flex items-center justify-center h-8 flex-1 rounded-[4px] border transition-colors
                      ${displayOn.worksheetOnline
                        ? "bg-white text-slate-700 border-slate-300"
                        : "bg-white text-slate-300 border-slate-200 hover:text-slate-400"}`}
                  >
                    <Globe className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">{tc("web")}</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Block-specific properties */}
          {renderBlockProps()}
        </div>
      </ScrollArea>
      </div>
    </div>
  );
}
