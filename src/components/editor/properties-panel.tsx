"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { useEditor } from "@/store/editor-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  WorksheetBlock,
  BlockVisibility,
} from "@/types/worksheet";
import { Trash2, Plus, GripVertical, Printer, Globe, Sparkles, ArrowUpDown } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { AiTrueFalseModal } from "./ai-true-false-modal";
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
        <Label className="text-xs">{tc("content")}</Label>
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
        <Label className="text-xs">{t("level")}</Label>
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
        <Label className="text-xs">{t("imageUrl")}</Label>
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
        <Label className="text-xs">{t("altText")}</Label>
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
        <Label className="text-xs">{t("widthPx")}</Label>
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
        <Label className="text-xs">{t("caption")}</Label>
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

function SpacerProps({ block }: { block: SpacerBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("properties");
  return (
    <div>
      <Label className="text-xs">{t("heightPx")}</Label>
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
      <Label className="text-xs">{tc("style")}</Label>
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
        <Label className="text-xs">{tc("question")}</Label>
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
        <Label className="text-xs">{t("allowMultiple")}</Label>
      </div>
      <Separator />
      <div className="space-y-2">
        <Label className="text-xs">{tc("options")}</Label>
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
        <Label className="text-xs">{t("aiGeneration")}</Label>
        <p className="text-[10px] text-muted-foreground mb-2">
          {t("autoGenerate")}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="w-full text-purple-600 border-purple-200 hover:bg-purple-50 hover:text-purple-700"
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
        <Label className="text-xs">{tc("question")}</Label>
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
        <Label className="text-xs">{t("numberOfLines")}</Label>
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
        <Label className="text-xs">{tc("content")}</Label>
        <p className="text-[10px] text-muted-foreground mb-1">
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
        <Label className="text-xs">{tc("instruction")}</Label>
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
        <Label className="text-xs">{tc("pairs")}</Label>
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
      <Label className="text-xs">{tc("words")}</Label>
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
        <Label className="text-xs">{t("numberOfColumns")}</Label>
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
        <Label className="text-xs">{tc("content")}</Label>
        <p className="text-[10px] text-muted-foreground">
          {t("editOnCanvas")}
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="w-full gap-2 text-purple-600 border-purple-200 hover:bg-purple-50 hover:text-purple-700"
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
  const t = useTranslations("properties");
  const tc = useTranslations("common");
  const [showAiModal, setShowAiModal] = React.useState(false);

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">{tc("instruction")}</Label>
        <p className="text-[10px] text-muted-foreground">
          {t("editInstructionOnCanvas")}
        </p>
      </div>
      <div>
        <Label className="text-xs">{tc("statements")}</Label>
        <p className="text-[10px] text-muted-foreground">
          {t("statementCount", { count: block.statements.length })}
        </p>
      </div>
      <Separator />
      <div>
        <Label className="text-xs">{t("aiGeneration")}</Label>
        <p className="text-[10px] text-muted-foreground mb-2">
          {t("autoGenerateStatements")}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="w-full text-purple-600 border-purple-200 hover:bg-purple-50 hover:text-purple-700"
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
        <Label className="text-xs">{tc("instruction")}</Label>
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
        <Label className="text-xs">{t("itemsInOrder")}</Label>
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
        <Label className="text-xs">{tc("content")}</Label>
        <p className="text-[10px] text-muted-foreground mb-1">
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
        <Label className="text-xs">{tc("instruction")}</Label>
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
          <Label className="text-xs">{tc("columns")}</Label>
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
          <Label className="text-xs">{tc("rows")}</Label>
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
        <Label className="text-xs">{t("showWordList")}</Label>
      </div>
      <Separator />
      <div className="space-y-2">
        <Label className="text-xs">{tc("words")}</Label>
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
      <div className="w-72 pt-8 pb-8">
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
      case "text":
        return <TextProps block={selectedBlock} />;
      default:
        return null;
    }
  };

  return (
    <div className="w-72 flex flex-col h-full pt-8 pb-8">
      <div className="flex flex-col h-full bg-slate-50 rounded-sm shadow-sm overflow-hidden">
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-semibold capitalize">
          {t("propertiesTitle", { type: selectedBlock.type.replace("-", " ") })}
        </h3>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4 [&_input]:bg-white [&_input]:border-0 [&_input]:shadow-none [&_button[data-slot=select-trigger]]:bg-white [&_button[data-slot=select-trigger]]:border-0 [&_button[data-slot=select-trigger]]:shadow-none [&_textarea]:bg-white [&_textarea]:border-0">
          {/* Visibility */}
          <div>
            <Label className="text-xs mb-2 block">{tc("visibility")}</Label>
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
                    className={`flex items-center justify-center h-9 w-9 rounded-md border transition-colors
                      ${selectedBlock.visibility === "both" || selectedBlock.visibility === "print"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"}`}
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
                    className={`flex items-center justify-center h-9 w-9 rounded-md border transition-colors
                      ${selectedBlock.visibility === "both" || selectedBlock.visibility === "online"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"}`}
                  >
                    <Globe className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">{tc("web")}</TooltipContent>
              </Tooltip>
            </div>
          </div>

          <Separator />

          {/* Block-specific properties */}
          {renderBlockProps()}
        </div>
      </ScrollArea>
      </div>
    </div>
  );
}
