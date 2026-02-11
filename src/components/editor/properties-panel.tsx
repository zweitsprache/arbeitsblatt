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
  WordBankBlock,
  ColumnsBlock,
  TrueFalseMatrixBlock,
  OrderItemsBlock,
  InlineChoicesBlock,
  WordSearchBlock,
  SortingCategoriesBlock,
  SortingCategory,
  UnscrambleWordsBlock,
  FixSentencesBlock,
  VerbTableBlock,
  WorksheetBlock,
  BlockVisibility,
} from "@/types/worksheet";
import { Trash2, Plus, GripVertical, Printer, Globe, Sparkles, ArrowUpDown, Upload, Bold, Italic } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { AiTrueFalseModal } from "./ai-true-false-modal";
import { AiVerbTableModal } from "./ai-verb-table-modal";
import { AiMcqModal } from "./ai-mcq-modal";
import { AiTextModal } from "./ai-text-modal";

// ─── Block-specific property editors ────────────────────────

function HeadingProps({ block }: { block: HeadingBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");
  const tc = useTranslations("common");
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{tc("content")}</Label>
        <Input
          value={block.content}
          onChange={(e) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { content: e.target.value } },
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
        <Input
          value={block.question}
          onChange={(e) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { question: e.target.value } },
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
            <Input
              value={opt.text}
              onChange={(e) => updateOption(i, { text: e.target.value })}
              className="flex-1 h-8 text-xs"
            />
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
        <Input
          value={block.question}
          onChange={(e) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { question: e.target.value } },
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
        <textarea
          value={block.content}
          onChange={(e) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { content: e.target.value } },
            })
          }
          className="w-full border rounded-md p-2 text-xs min-h-[80px] resize-y"
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
        <Input
          value={block.instruction}
          onChange={(e) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { instruction: e.target.value } },
            })
          }
        />
      </div>
      <Separator />
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{tc("pairs")}</Label>
        {block.pairs.map((pair, i) => (
          <div key={pair.id} className="flex items-center gap-1">
            <Input
              value={pair.left}
              onChange={(e) => updatePair(i, { left: e.target.value })}
              className="flex-1 h-8 text-xs"
              placeholder={t("left")}
            />
            <span className="text-xs text-muted-foreground">→</span>
            <Input
              value={pair.right}
              onChange={(e) => updatePair(i, { right: e.target.value })}
              className="flex-1 h-8 text-xs"
              placeholder={t("right")}
            />
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
  const t = useTranslations("properties");
  const tc = useTranslations("common");
  const [showAiModal, setShowAiModal] = React.useState(false);

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
      <AiTextModal
        open={showAiModal}
        onOpenChange={setShowAiModal}
        blockId={block.id}
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
        <Input
          value={block.instruction}
          onChange={(e) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { instruction: e.target.value } },
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
            <Input
              value={item.text}
              onChange={(e) => updateItem(i, { text: e.target.value })}
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
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md block mb-2">{tc("content")}</Label>
        <p className="text-xs text-muted-foreground mb-1">
          {t("inlineChoicesHelp")}
        </p>
        <textarea
          value={block.content}
          onChange={(e) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { content: e.target.value } },
            })
          }
          className="w-full border rounded-md p-2 text-xs min-h-[120px] resize-y font-mono"
        />
      </div>
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
        <Input
          value={block.instruction}
          onChange={(e) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { instruction: e.target.value } },
            })
          }
        />
      </div>
      <Separator />
      {block.categories.map((cat) => {
        const catItems = block.items.filter((item) =>
          cat.correctItems.includes(item.id)
        );
        return (
          <div key={cat.id} className="space-y-2">
            <div className="flex items-center gap-1">
              <Input
                value={cat.label}
                onChange={(e) => updateCategoryLabel(cat.id, e.target.value)}
                className="flex-1 h-8 text-xs font-semibold"
              />
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
                <Input
                  value={item.text}
                  onChange={(e) => updateItemText(item.id, e.target.value)}
                  className="flex-1 h-7 text-xs"
                />
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
            <Input
              value={word}
              onChange={(e) => updateWord(i, e.target.value.toUpperCase())}
              className="flex-1 h-8 text-xs uppercase"
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
        <Input
          value={block.instruction}
          onChange={(e) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { instruction: e.target.value } },
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
            <Input
              value={item.word}
              onChange={(e) => updateWord(i, e.target.value)}
              className="flex-1 h-8 text-xs"
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
        <Input
          value={block.instruction}
          onChange={(e) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { instruction: e.target.value } },
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
            <Input
              value={item.sentence}
              onChange={(e) => updateSentence(i, e.target.value)}
              className="flex-1 h-8 text-xs font-mono"
              placeholder={t("fixSentencePlaceholder")}
            />
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
        <div className="bg-slate-50 rounded-sm shadow-sm p-4 pt-12">
          <p className="text-sm text-muted-foreground text-center mt-8">
            {t("selectBlock")}
          </p>
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
      case "word-bank":
        return <WordBankProps block={selectedBlock} />;
      case "columns":
        return <ColumnsProps block={selectedBlock} />;
      case "true-false-matrix":
        return <TrueFalseMatrixProps block={selectedBlock} />;
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
