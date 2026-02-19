"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { useEditor } from "@/store/editor-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  HeadingBlock,
  TextBlock,
  ImageBlock,
  ImageCardsBlock,
  TextCardsBlock,
  SpacerBlock,
  DividerBlock,
  MultipleChoiceBlock,
  OpenResponseBlock,
  FillInBlankBlock,
  MatchingBlock,
  TwoColumnFillBlock,
  GlossaryBlock,
  WordBankBlock,
  ColumnsBlock,
  TrueFalseMatrixBlock,
  ArticleTrainingBlock,
  ArticleAnswer,
  OrderItemsBlock,
  InlineChoicesBlock,
  InlineChoiceItem,
  migrateInlineChoicesBlock,
  WordSearchBlock,
  SortingCategoriesBlock,
  SortingCategory,
  UnscrambleWordsBlock,
  FixSentencesBlock,
  VerbTableBlock,
  ChartBlock,
  ChartDataPoint,
  NumberedLabelBlock,
  WorksheetBlock,
  BlockVisibility,
} from "@/types/worksheet";
import { Trash2, Plus, GripVertical, Printer, Globe, Sparkles, ArrowUpDown, Upload, Bold, Italic, X, AlertTriangle, Code2, Check, ChevronUp, ChevronDown, Shuffle, ImagePlus, Loader2 } from "lucide-react";
import { useUpload } from "@/lib/use-upload";
import { MediaBrowserDialog } from "@/components/ui/media-browser-dialog";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { getEffectiveValue, hasChOverride, replaceEszett } from "@/lib/locale-utils";
import { AiTrueFalseModal } from "./ai-true-false-modal";
import { AiVerbTableModal } from "./ai-verb-table-modal";
import { AiMcqModal } from "./ai-mcq-modal";
import { AiTextModal } from "./ai-text-modal";
import { AiVerbExerciseModal } from "./ai-verb-exercise-modal";
import { ImageCropDialog, CropResult } from "@/components/ui/image-crop-dialog";
import { getChoiceGroups, updateChoiceGroup, validateChoices } from "@/lib/inline-choice-utils";

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
  const isChMode = state.localeMode === "CH";
  const overrides = state.settings.chOverrides;
  const hasOverride = hasChOverride(blockId, fieldPath, overrides);
  const effectiveValue = getEffectiveValue(baseValue, blockId, fieldPath, state.localeMode, overrides);

  if (!isChMode) {
    // DE mode: normal input
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

  // CH mode
  const handleChange = (value: string) => {
    // If text matches auto-replaced value, don't store an override
    const autoReplaced = replaceEszett(baseValue);
    if (value === autoReplaced) {
      dispatch({ type: "CLEAR_CH_OVERRIDE", payload: { blockId, fieldPath } });
    } else {
      dispatch({ type: "SET_CH_OVERRIDE", payload: { blockId, fieldPath, value } });
    }
  };

  const clearOverride = () => {
    dispatch({ type: "CLEAR_CH_OVERRIDE", payload: { blockId, fieldPath } });
  };

  const wrapperClass = hasOverride
    ? "border-l-2 border-l-amber-400 pl-1"
    : "";

  const inputEl = multiline ? (
    <textarea
      value={effectiveValue}
      onChange={(e) => handleChange(e.target.value)}
      className={`${className || "w-full border rounded-md p-2 text-xs min-h-[80px] resize-y"} ${hasOverride ? "bg-amber-50/50" : ""}`}
      placeholder={placeholder}
    />
  ) : (
    <div className="flex items-center gap-1">
      <Input
        value={effectiveValue}
        onChange={(e) => handleChange(e.target.value)}
        className={`${className || ""} ${hasOverride ? "bg-amber-50/50" : ""} flex-1`}
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
      {/* Show DE base text as reference */}
      <p className="text-[10px] text-muted-foreground/60 mt-0.5 truncate" title={baseValue}>
        {"🇩🇪 "}{baseValue.length > 60 ? baseValue.slice(0, 60) + "…" : baseValue}
      </p>
    </div>
  );
}

// ─── Block-specific property editors ────────────────────────

function HeadingProps({ block }: { block: HeadingBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");
  const tc = useTranslations("common");
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{tc("content")}</Label>
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
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{t("level")}</Label>
        <Select
          value={String(block.level)}
          onValueChange={(v) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { level: Number(v) as 1 | 2 | 3 } },
            })
          }
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
    </div>
  );
}

function ImageProps({ block }: { block: ImageBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{t("imageUrl")}</Label>
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
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{t("altText")}</Label>
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
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{t("widthPx")}</Label>
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
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{t("caption")}</Label>
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
      { id: crypto.randomUUID(), imageUrl: "", text: "" },
    ];
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { items: newItems } },
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{tc("columns")}</Label>
        <Select
          value={String(block.columns)}
          onValueChange={(v) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { columns: Number(v) as 2 | 3 | 4 } },
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
          </SelectContent>
        </Select>
      </div>
      <Separator />
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{t("cards")}</Label>
        {block.items.map((item, i) => (
          <div key={item.id} className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground w-4 shrink-0 text-right">{i + 1}.</span>
            {item.src ? (
              <div className="w-8 h-8 rounded overflow-hidden shrink-0 bg-slate-100">
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
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{t("imageAspectRatio")}</Label>
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

function TextCardsProps({ block }: { block: TextCardsBlock }) {
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
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{tc("columns")}</Label>
        <Select
          value={String(block.columns)}
          onValueChange={(v) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { columns: Number(v) as 2 | 3 | 4 } },
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
          </SelectContent>
        </Select>
      </div>
      <Separator />
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{t("cards")}</Label>
        {block.items.map((item, i) => (
          <div key={item.id} className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground w-4 shrink-0 text-right">{i + 1}.</span>
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
            <div className="flex items-center gap-1.5">
              <span className="w-4 shrink-0" />
              <Input
                value={item.caption}
                onChange={(e) => updateItem(i, { caption: e.target.value })}
                placeholder={t("caption")}
                className="flex-1 h-7 text-xs text-muted-foreground"
              />
              <span className="w-[38px] shrink-0" />
            </div>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addItem} className="w-full">
          <Plus className="h-3.5 w-3.5 mr-1" /> {t("addCard")}
        </Button>
      </div>
      <Separator />
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{t("csvImport")}</Label>
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
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{t("textSize")}</Label>
        <div className="flex gap-1">
          {(["xs", "sm", "base", "lg", "xl", "2xl"] as const).map((size) => (
            <Button
              key={size}
              variant={(block.textSize ?? "base") === size ? "default" : "outline"}
              size="sm"
              className="flex-1 text-xs px-1"
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
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{t("textAlignment")}</Label>
        <div className="flex gap-1">
          {(["left", "center", "right"] as const).map((align) => (
            <Button
              key={align}
              variant={(block.textAlign ?? "center") === align ? "default" : "outline"}
              size="sm"
              className="flex-1 text-xs px-1"
              onClick={() =>
                dispatch({
                  type: "UPDATE_BLOCK",
                  payload: { id: block.id, updates: { textAlign: align } },
                })
              }
            >
              {t(align)}
            </Button>
          ))}
        </div>
      </div>
      <div className="flex gap-1">
        <Button
          variant={block.textBold ? "default" : "outline"}
          size="sm"
          className="flex-1"
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
          className="flex-1"
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
      <Separator />
      <div className="flex items-center justify-between">
        <Label className="text-sm">{t("showBorder")}</Label>
        <Switch
          checked={block.showBorder ?? true}
          onCheckedChange={(checked) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { showBorder: checked } },
            })
          }
        />
      </div>
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

function SpacerProps({ block }: { block: SpacerBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");
  return (
    <div>
      <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{t("heightPx")}</Label>
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

function DividerProps({ block }: { block: DividerBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");
  const tc = useTranslations("common");
  return (
    <div>
      <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{tc("style")}</Label>
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
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{tc("question")}</Label>
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
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{t("allowMultiple")}</Label>
      </div>
      <Separator />
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{tc("options")}</Label>
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
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{t("aiGeneration")}</Label>
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
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{tc("question")}</Label>
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
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{t("numberOfLines")}</Label>
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
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{tc("content")}</Label>
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

function MatchingProps({ block }: { block: MatchingBlock }) {
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

  const updatePair = (index: number, updates: Partial<{ left: string; right: string }>) => {
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

  const removePair = (index: number) => {
    const newPairs = block.pairs.filter((_, i) => i !== index);
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: block.id, updates: { pairs: newPairs } },
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{tc("instruction")}</Label>
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
      <Separator />
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{tc("pairs")}</Label>
        {block.pairs.map((pair, i) => (
          <div key={pair.id} className="flex items-center gap-1">
            <div className="flex-1">
              <ChInput
                blockId={block.id}
                fieldPath={`pairs.${i}.left`}
                baseValue={pair.left}
                onBaseChange={(v) => updatePair(i, { left: v })}
                className="h-8 text-xs"
                placeholder={t("left")}
              />
            </div>
            <span className="text-xs text-muted-foreground">→</span>
            <div className="flex-1">
              <ChInput
                blockId={block.id}
                fieldPath={`pairs.${i}.right`}
                baseValue={pair.right}
                onBaseChange={(v) => updatePair(i, { right: v })}
                className="h-8 text-xs"
                placeholder={t("right")}
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => removePair(i)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addPair} className="w-full">
          <Plus className="h-3.5 w-3.5 mr-1" /> {t("addPair")}
        </Button>
      </div>
      <Separator />
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{t("csvImport")}</Label>
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
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{tc("instruction")}</Label>
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
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{t("items")}</Label>
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
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{t("csvImport")}</Label>
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
    const parsed: { term: string; definition: string }[] = [];

    for (const line of lines) {
      const sep = line.includes("\t") ? "\t" : line.includes(";") ? ";" : ",";
      const parts = line.split(sep).map((p) => p.trim());

      if (parts.length >= 2) {
        parsed.push({ term: parts[0], definition: parts.slice(1).join(sep === "\t" ? " " : ", ").trim() });
      } else if (parts[0]) {
        parsed.push({ term: parts[0], definition: "" });
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

  const updatePair = (index: number, updates: Partial<{ term: string; definition: string }>) => {
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
      { id: `g${Date.now()}`, term: t("newItem"), definition: t("newMatch") },
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
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{tc("instruction")}</Label>
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
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{t("glossaryTerms")}</Label>
        {block.pairs.map((pair, i) => (
          <div key={pair.id} className="flex items-center gap-1">
            <div className="flex-1">
              <ChInput
                blockId={block.id}
                fieldPath={`pairs.${i}.term`}
                baseValue={pair.term}
                onBaseChange={(v) => updatePair(i, { term: v })}
                className="h-8 text-xs"
                placeholder={t("glossaryTerm")}
              />
            </div>
            <span className="text-xs text-muted-foreground">→</span>
            <div className="flex-1">
              <ChInput
                blockId={block.id}
                fieldPath={`pairs.${i}.definition`}
                baseValue={pair.definition}
                onBaseChange={(v) => updatePair(i, { definition: v })}
                className="h-8 text-xs"
                placeholder={t("glossaryDefinition")}
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => removePair(i)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addPair} className="w-full">
          <Plus className="h-3.5 w-3.5 mr-1" /> {t("addPair")}
        </Button>
      </div>
      <Separator />
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{t("csvImport")}</Label>
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
      <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{tc("words")}</Label>
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
  const { dispatch } = useEditor();
  const t = useTranslations("properties");

  const setColumnCount = (count: number) => {
    // Adjust the children array: keep existing columns, add empty ones or trim
    const newChildren = [...block.children];
    while (newChildren.length < count) {
      newChildren.push([]);
    }
    // Only trim empty trailing columns — keep content
    while (newChildren.length > count) {
      const last = newChildren[newChildren.length - 1];
      if (last.length === 0) {
        newChildren.pop();
      } else {
        // Move orphaned blocks into the last kept column
        const overflow = newChildren.splice(count);
        newChildren[count - 1] = [
          ...newChildren[count - 1],
          ...overflow.flat(),
        ];
        break;
      }
    }
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: { columns: count, children: newChildren },
      },
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{t("numberOfColumns")}</Label>
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
    </div>
  );
}

function TextProps({ block }: { block: TextBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");
  const tc = useTranslations("common");
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
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (response.ok) {
        const data = await response.json();
        dispatch({
          type: "UPDATE_BLOCK",
          payload: { id: block.id, updates: { imageSrc: data.url } },
        });
      }
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
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{tc("content")}</Label>
        <p className="text-xs text-muted-foreground">
          {t("editOnCanvas")}
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="w-full gap-2 text-pink-700 border-pink-200 hover:bg-pink-50 hover:text-pink-800"
        onClick={() => setShowAiModal(true)}
      >
        <Sparkles className="h-3.5 w-3.5" />
        {t("aiGenerateText")}
      </Button>
      <Separator />
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{t("textImage")}</Label>
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
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{tc("statements")}</Label>
        <p className="text-xs text-muted-foreground">
          {t("statementCount", { count: block.statements.length })}
        </p>
      </div>
      <Separator />
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{t("csvImport")}</Label>
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
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{t("aiGeneration")}</Label>
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
      <AiTrueFalseModal open={showAiModal} onOpenChange={setShowAiModal} blockId={block.id} />
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
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{t("articleItems")}</Label>
        <p className="text-xs text-muted-foreground">
          {t("articleItemCount", { count: block.items.length })}
        </p>
      </div>
      <Separator />
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{t("writingLine")}</Label>
        <div className="flex items-center gap-2">
          <Switch
            checked={block.showWritingLine}
            onCheckedChange={(checked) =>
              dispatch({
                type: "UPDATE_BLOCK",
                payload: { id: block.id, updates: { showWritingLine: checked } },
              })
            }
          />
          <span className="text-xs text-muted-foreground">{t("showWritingLine")}</span>
        </div>
      </div>
      <Separator />
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{t("csvImport")}</Label>
        <p className="text-xs text-muted-foreground mb-1">
          {t("articleCsvImportHelp")}
        </p>
        <textarea
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[80px] resize-y"
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
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{tc("instruction")}</Label>
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
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{t("itemsInOrder")}</Label>
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
  const { state, dispatch } = useEditor();
  const t = useTranslations("properties");
  const tc = useTranslations("common");
  const [showAiModal, setShowAiModal] = React.useState(false);
  const [csvText, setCsvText] = React.useState("");
  const [csvError, setCsvError] = React.useState<string | null>(null);
  const [csvMode, setCsvMode] = React.useState<"replace" | "append">("replace");
  const [rawEditIdx, setRawEditIdx] = React.useState<number | null>(null);

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
    // Also persist if migration changed syntax (e.g., {{choice:*...}} → {{...}})
    if (block.items && block.items.length > 0) {
      const migrated = items;
      const needsPersist = block.items.some((orig, i) => migrated[i] && orig.content !== migrated[i].content);
      if (needsPersist) {
        dispatch({
          type: "UPDATE_BLOCK",
          payload: { id: block.id, updates: { items: migrated, content: undefined } },
        });
      }
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
    dispatch({ type: "SET_ACTIVE_ITEM", payload: items.length });
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    const curActive = state.activeItemIndex;
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: block.id,
        updates: { items: items.filter((_, i) => i !== index) },
      },
    });
    // Adjust active index after deletion
    if (curActive !== null) {
      if (index < curActive) {
        dispatch({ type: "SET_ACTIVE_ITEM", payload: curActive - 1 });
      } else if (index === curActive) {
        dispatch({ type: "SET_ACTIVE_ITEM", payload: Math.min(curActive, items.length - 2) });
      }
    }
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

  // Active item index — clamp to valid range
  const activeIdx = state.activeItemIndex !== null && state.activeItemIndex < items.length
    ? state.activeItemIndex
    : null;

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {activeIdx !== null ? (() => {
          const i = activeIdx;
          const item = items[i];
          const choiceGroups = getChoiceGroups(item.content);
          const warnings = validateChoices(item.content);
          const isRawEdit = rawEditIdx === i;
          return (
            <>
              {/* Navigation header: prev / number / next + actions */}
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => dispatch({ type: "SET_ACTIVE_ITEM", payload: i - 1 })} disabled={i === 0}>
                  <ChevronUp className="h-3 w-3" />
                </Button>
                <span className="text-xs font-bold text-muted-foreground bg-muted px-2 h-5 rounded flex items-center justify-center shrink-0">
                  {String(i + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
                </span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => dispatch({ type: "SET_ACTIVE_ITEM", payload: i + 1 })} disabled={i === items.length - 1}>
                  <ChevronDown className="h-3 w-3" />
                </Button>
                <div className="flex-1" />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isRawEdit ? "secondary" : "ghost"}
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setRawEditIdx(isRawEdit ? null : i)}
                    >
                      <Code2 className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t("editRaw")}</TooltipContent>
                </Tooltip>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeItem(i)} disabled={items.length <= 1}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>

              {isRawEdit ? (
                /* Raw syntax textarea */
                <ChInput
                  blockId={block.id}
                  fieldPath={`items.${i}.content`}
                  baseValue={item.content}
                  onBaseChange={(v) => updateItem(i, v)}
                  className="border rounded-md p-1.5 text-xs min-h-[40px] resize-y font-mono"
                  multiline
                />
              ) : (
                /* Structured editing */
                <div className="space-y-2">
                  {choiceGroups.map((options, gi) => (
                    <ChoiceGroupEditor
                      key={gi}
                      groupIndex={gi}
                      options={options}
                      onChange={(newOptions) => {
                        const newContent = updateChoiceGroup(item.content, gi, newOptions);
                        updateItem(i, newContent);
                      }}
                    />
                  ))}

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
                </div>
              )}
            </>
          );
        })() : (
          /* No item selected — prompt user */
          <p className="text-xs text-muted-foreground text-center py-4">
            {t("clickSentenceToEdit")}
          </p>
        )}
        <Button variant="outline" size="sm" onClick={addItem} className="w-full">
          <Plus className="h-3.5 w-3.5 mr-1" /> {t("addSentence")}
        </Button>
      </div>
      <Separator />
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{t("csvImport")}</Label>
        <p className="text-xs text-muted-foreground mb-1">
          {t("csvImportHelpInlineChoices")}
        </p>
        <textarea
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[80px] resize-y font-mono"
          placeholder={t("csvImportPlaceholderInlineChoices")}
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
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{t("aiGeneration")}</Label>
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
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{tc("instruction")}</Label>
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
      {block.categories.map((cat, catIndex) => {
        const catItems = block.items.filter((item) =>
          cat.correctItems.includes(item.id)
        );
        return (
          <div key={cat.id} className="space-y-2">
            <div className="flex items-center gap-1">
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
    </div>
  );
}

function WordSearchProps({ block }: { block: WordSearchBlock }) {
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
      payload: {
        id: block.id,
        updates: { words: [...block.words, "WORD"] },
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

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{tc("columns")}</Label>
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
          <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{tc("rows")}</Label>
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
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{t("showWordList")}</Label>
      </div>
      <Separator />
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{tc("words")}</Label>
        {block.words.map((word, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className="flex-1">
              <ChInput
                blockId={block.id}
                fieldPath={`words.${i}`}
                baseValue={word}
                onBaseChange={(v) => updateWord(i, v.toUpperCase())}
                className="h-8 text-xs uppercase"
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
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{tc("instruction")}</Label>
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
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{t("keepFirstLetter")}</Label>
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
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{t("lowercaseAll")}</Label>
      </div>
      <Separator />
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{tc("words")}</Label>
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
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{tc("instruction")}</Label>
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
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{t("sentences")}</Label>
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
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{t("verbTableVerb")}</Label>
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
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{t("splitConjugation")}</Label>
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
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{t("showConjugations")}</Label>
      </div>
      <Separator />
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{t("aiGeneration")}</Label>
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
        <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md mb-2">{t("chartType")}</div>
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
        <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md mb-2">{t("chartDisplay")}</div>
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
            <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md mb-2">{t("chartAxes")}</div>
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
        <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md mb-2">
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
        <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md mb-2">{t("chartJsonImport")}</div>
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

function NumberedLabelProps({ block }: { block: NumberedLabelBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{t("startNumber")}</Label>
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
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{t("prefix")}</Label>
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
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{t("suffix")}</Label>
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
    </div>
  );
}

// ─── Cover Images Panel ─────────────────────────────────────

function CoverImagesPanel() {
  const { state, dispatch } = useEditor();
  const t = useTranslations("properties");
  const { upload } = useUpload();
  const [uploadingSlot, setUploadingSlot] = React.useState<number | null>(null);
  const images = state.settings.coverImages ?? [];

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
      <div>
        <Label className="text-sm font-medium">{t("coverSubtitle")}</Label>
        <Input
          value={state.settings.coverSubtitle ?? "Arbeitsblatt"}
          onChange={(e) =>
            dispatch({ type: "UPDATE_SETTINGS", payload: { coverSubtitle: e.target.value } })
          }
          placeholder="Arbeitsblatt"
          className="mt-1"
        />
      </div>
      <Label className="text-sm font-medium">{t("coverImages")}</Label>
      <div className="grid grid-cols-4 gap-2">
        {slots.map((url, i) => (
          <div key={i}>
            {url ? (
              <div className="relative aspect-square rounded bg-muted overflow-hidden group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`${t("coverImage")} ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  onClick={() => handleRemove(i)}
                  className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
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
                className="aspect-square rounded border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center cursor-pointer hover:border-muted-foreground/50 transition-colors w-full"
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
      <div className="flex items-center justify-between">
        <Label className="text-sm">{t("coverImageBorder")}</Label>
        <Switch
          checked={state.settings.coverImageBorder ?? false}
          onCheckedChange={(v) =>
            dispatch({ type: "UPDATE_SETTINGS", payload: { coverImageBorder: v } })
          }
        />
      </div>
      <div>
        <Label className="text-sm font-medium">{t("coverInfoText")}</Label>
        <Input
          value={state.settings.coverInfoText ?? ""}
          onChange={(e) =>
            dispatch({ type: "UPDATE_SETTINGS", payload: { coverInfoText: e.target.value } })
          }
          placeholder={t("coverInfoTextPlaceholder")}
          className="mt-1"
        />
      </div>
    </div>
  );
}

export function PropertiesPanel() {
  const { state, dispatch } = useEditor();
  const t = useTranslations("properties");
  const tc = useTranslations("common");

  const selectedBlock = state.blocks.find(
    (b) => b.id === state.selectedBlockId
  );

  if (!selectedBlock) {
    return (
      <div className="w-80 pt-8 pb-8">
        <div className="bg-slate-50 rounded-sm shadow-sm p-4 pt-6">
          <CoverImagesPanel />
        </div>
      </div>
    );
  }

  const renderBlockProps = () => {
    switch (selectedBlock.type) {
      case "heading":
        return <HeadingProps block={selectedBlock} />;
      case "image":
        return <ImageProps block={selectedBlock} />;
      case "image-cards":
        return <ImageCardsProps block={selectedBlock} />;
      case "text-cards":
        return <TextCardsProps block={selectedBlock} />;
      case "spacer":
        return <SpacerProps block={selectedBlock} />;
      case "divider":
        return <DividerProps block={selectedBlock} />;
      case "multiple-choice":
        return <MultipleChoiceProps block={selectedBlock} />;
      case "open-response":
        return <OpenResponseProps block={selectedBlock} />;
      case "fill-in-blank":
        return <FillInBlankProps block={selectedBlock} />;
      case "matching":
        return <MatchingProps block={selectedBlock} />;
      case "two-column-fill":
        return <TwoColumnFillProps block={selectedBlock} />;
      case "glossary":
        return <GlossaryProps block={selectedBlock} />;
      case "word-bank":
        return <WordBankProps block={selectedBlock} />;
      case "columns":
        return <ColumnsProps block={selectedBlock} />;
      case "true-false-matrix":
        return <TrueFalseMatrixProps block={selectedBlock} />;
      case "article-training":
        return <ArticleTrainingProps block={selectedBlock} />;
      case "order-items":
        return <OrderItemsProps block={selectedBlock} />;
      case "inline-choices":
        return <InlineChoicesProps block={selectedBlock} />;
      case "word-search":
        return <WordSearchProps block={selectedBlock} />;
      case "sorting-categories":
        return <SortingCategoriesProps block={selectedBlock} />;
      case "unscramble-words":
        return <UnscrambleWordsProps block={selectedBlock} />;
      case "fix-sentences":
        return <FixSentencesProps block={selectedBlock} />;
      case "verb-table":
        return <VerbTableProps block={selectedBlock} />;
      case "chart":
        return <ChartProps block={selectedBlock} />;
      case "numbered-label":
        return <NumberedLabelProps block={selectedBlock} />;
      case "text":
        return <TextProps block={selectedBlock} />;
      default:
        return null;
    }
  };

  return (
    <div className="w-80 flex flex-col h-full pt-8 pb-8">
      <div className="flex flex-col h-full bg-slate-50 rounded-sm shadow-sm overflow-hidden min-h-0">
      <ScrollArea className="flex-1 overflow-hidden scrollbar-hide">
        <div className="p-4 space-y-4 [&_input]:bg-white [&_input]:border-0 [&_input]:shadow-none [&_button[data-slot=select-trigger]]:bg-white [&_button[data-slot=select-trigger]]:border-0 [&_button[data-slot=select-trigger]]:shadow-none [&_textarea]:bg-white [&_textarea]:border-0">
          {/* Visibility */}
          <div>
            <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md mb-2">{tc("visibility")}</div>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => {
                      const v = selectedBlock.visibility;
                      const showPrint = v === "both" || v === "print";
                      const showOnline = v === "both" || v === "online";
                      // Toggle print: if currently shown, hide it (unless it would hide both)
                      if (showPrint) {
                        dispatch({ type: "SET_BLOCK_VISIBILITY", payload: { id: selectedBlock.id, visibility: showOnline ? "online" : "both" } });
                      } else {
                        dispatch({ type: "SET_BLOCK_VISIBILITY", payload: { id: selectedBlock.id, visibility: showOnline ? "both" : "print" } });
                      }
                    }}
                    className={`flex items-center justify-center h-9 flex-1 rounded-md border transition-colors
                      ${selectedBlock.visibility === "both" || selectedBlock.visibility === "print"
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
                    onClick={() => {
                      const v = selectedBlock.visibility;
                      const showPrint = v === "both" || v === "print";
                      const showOnline = v === "both" || v === "online";
                      // Toggle online: if currently shown, hide it (unless it would hide both)
                      if (showOnline) {
                        dispatch({ type: "SET_BLOCK_VISIBILITY", payload: { id: selectedBlock.id, visibility: showPrint ? "print" : "both" } });
                      } else {
                        dispatch({ type: "SET_BLOCK_VISIBILITY", payload: { id: selectedBlock.id, visibility: showPrint ? "both" : "online" } });
                      }
                    }}
                    className={`flex items-center justify-center h-9 flex-1 rounded-md border transition-colors
                      ${selectedBlock.visibility === "both" || selectedBlock.visibility === "online"
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
