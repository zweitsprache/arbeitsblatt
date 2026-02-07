"use client";

import React from "react";
import { useTranslations } from "next-intl";
import {
  WorksheetBlock,
  HeadingBlock,
  TextBlock,
  ImageBlock,
  SpacerBlock,
  DividerBlock,
  MultipleChoiceBlock,
  FillInBlankBlock,
  MatchingBlock,
  OpenResponseBlock,
  WordBankBlock,
  NumberLineBlock,
  ColumnsBlock,
  TrueFalseMatrixBlock,
  OrderItemsBlock,
  InlineChoicesBlock,
  WordSearchBlock,
  SortingCategoriesBlock,
  ViewMode,
} from "@/types/worksheet";
import { useEditor } from "@/store/editor-store";
import { RichTextEditor } from "./rich-text-editor";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { Plus, X, Check, GripVertical, Trash2, Copy, Eye, Printer, Monitor, Sparkles, ArrowUpDown } from "lucide-react";
import { AiTrueFalseModal } from "./ai-true-false-modal";
import { AiMcqModal } from "./ai-mcq-modal";
import { AiTextModal } from "./ai-text-modal";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { BlockVisibility } from "@/types/worksheet";

// ─── Heading ─────────────────────────────────────────────────
function HeadingRenderer({ block }: { block: HeadingBlock }) {
  const { dispatch } = useEditor();
  const Tag = `h${block.level}` as keyof React.JSX.IntrinsicElements;
  const sizes = { 1: "text-3xl", 2: "text-2xl", 3: "text-xl" };

  return (
    <Tag
      className={`${sizes[block.level]} font-bold outline-none`}
      contentEditable
      suppressContentEditableWarning
      onBlur={(e) =>
        dispatch({
          type: "UPDATE_BLOCK",
          payload: { id: block.id, updates: { content: e.currentTarget.textContent || "" } },
        })
      }
    >
      {block.content}
    </Tag>
  );
}

// ─── Text ────────────────────────────────────────────────────
function TextRenderer({ block }: { block: TextBlock }) {
  const { dispatch } = useEditor();
  const t = useTranslations("blockRenderer");
  const [showAiModal, setShowAiModal] = React.useState(false);

  return (
    <>
      <div className="relative group/text">
        <RichTextEditor
          content={block.content}
          onChange={(html) =>
            dispatch({
              type: "UPDATE_BLOCK",
              payload: { id: block.id, updates: { content: html } },
            })
          }
          placeholder={t("startTyping")}
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

// ─── Multiple Choice ────────────────────────────────────────
function MultipleChoiceRenderer({
  block,
  interactive,
}: {
  block: MultipleChoiceBlock;
  interactive: boolean;
}) {
  const { dispatch } = useEditor();
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
        onBlur={(e) =>
          !interactive &&
          dispatch({
            type: "UPDATE_BLOCK",
            payload: { id: block.id, updates: { question: e.currentTarget.textContent || "" } },
          })
        }
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
                  const newOptions = [...block.options];
                  newOptions[i] = { ...opt, text: e.currentTarget.textContent || "" };
                  updateOptions(newOptions);
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
    <div className="leading-relaxed">
      {parts.map((part, i) => {
        const match = part.match(/\{\{blank:(.+)\}\}/);
        if (match) {
          return interactive ? (
            <input
              key={i}
              type="text"
              placeholder={t("fillInBlankPlaceholder")}
              className="border-b-2 border-gray-400 bg-transparent px-2 py-0.5 text-center mx-1 focus:outline-none focus:border-primary w-28 inline"
            />
          ) : (
            <span
              key={i}
              className="inline-block border-b-2 border-gray-400 min-w-[80px] px-2 py-0.5 text-center mx-1 text-muted-foreground text-xs"
            >
              {match[1]}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
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
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          {block.pairs.map((pair, i) => (
            <div
              key={pair.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-border"
            >
              <span className="text-xs font-bold text-muted-foreground bg-muted w-6 h-6 rounded flex items-center justify-center shrink-0">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-base flex-1">{pair.left}</span>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          {shuffledRight.map((pair, i) => (
            <div
              key={`right-${pair.id}`}
              className="flex items-center gap-3 p-3 rounded-lg border border-border"
            >
              <span className="text-xs font-bold text-muted-foreground bg-muted w-6 h-6 rounded flex items-center justify-center shrink-0">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="text-base flex-1">{pair.right}</span>
            </div>
          ))}
        </div>
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
      {/* Instruction */}
      <div
        className="font-medium outline-none"
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) =>
          dispatch({
            type: "UPDATE_BLOCK",
            payload: { id: block.id, updates: { instruction: e.currentTarget.textContent || "" } },
          })
        }
      >
        {block.instruction}
      </div>

      {/* Table */}
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="text-left p-2 border-b font-medium text-muted-foreground">{t("statement")}</th>
            <th className="w-16 p-2 border-b text-center font-medium text-muted-foreground">{tc("true")}</th>
            <th className="w-16 p-2 border-b text-center font-medium text-muted-foreground">{tc("false")}</th>
            <th className="w-8 p-2 border-b"></th>
          </tr>
        </thead>
        <tbody>
          {block.statements.map((stmt, stmtIndex) => (
            <tr key={stmt.id} className="group/row border-b last:border-b-0">
              <td className="p-2">
                <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-muted-foreground bg-muted w-6 h-6 rounded flex items-center justify-center shrink-0">
                  {String(stmtIndex + 1).padStart(2, "0")}
                </span>
                <span
                  className="outline-none block flex-1"
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) =>
                    updateStatement(stmt.id, { text: e.currentTarget.textContent || "" })
                  }
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
          ))}
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

// ─── Order Items ────────────────────────────────────────────
function OrderItemsRenderer({
  block,
  interactive,
}: {
  block: OrderItemsBlock;
  interactive: boolean;
}) {
  const { dispatch } = useEditor();
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
        onBlur={(e) =>
          dispatch({
            type: "UPDATE_BLOCK",
            payload: {
              id: block.id,
              updates: { instruction: e.currentTarget.textContent || "" },
            },
          })
        }
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
              onBlur={(e) =>
                updateItem(item.id, {
                  text: e.currentTarget.textContent || "",
                })
              }
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
function InlineChoicesRenderer({
  block,
  interactive,
}: {
  block: InlineChoicesBlock;
  interactive: boolean;
}) {
  const { dispatch } = useEditor();

  // Parse {{choice:opt1|opt2|*correct|opt3}} patterns
  const parts = block.content.split(/(\{\{choice:[^}]+\}\})/g);

  return (
    <div className="leading-relaxed">
      {parts.map((part, i) => {
        const match = part.match(/\{\{choice:(.+)\}\}/);
        if (match) {
          const options = match[1].split("|");
          const correctOption = options.find((o) => o.startsWith("*"));
          return (
            <span key={i} className="inline-flex items-center gap-1 mx-0.5">
              {options.map((opt, oi) => {
                const isCorrect = opt.startsWith("*");
                const label = isCorrect ? opt.slice(1) : opt;
                return (
                  <span key={oi} className="inline-flex items-center">
                    {oi > 0 && <span className="mx-0.5 text-muted-foreground">/</span>}
                    <span
                      className={`inline-flex items-center gap-0.5 ${
                        isCorrect
                          ? "font-semibold text-green-700 bg-green-50 px-1 rounded"
                          : ""
                      }`}
                    >
                      <span
                        className={`inline-block w-3 h-3 rounded-full border-2 shrink-0 ${
                          isCorrect
                            ? "border-green-500 bg-green-500"
                            : "border-muted-foreground/40"
                        }`}
                      />
                      <span>{label}</span>
                    </span>
                  </span>
                );
              })}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </div>
  );
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
        onBlur={(e) =>
          dispatch({
            type: "UPDATE_BLOCK",
            payload: {
              id: block.id,
              updates: { instruction: e.currentTarget.textContent || "" },
            },
          })
        }
      >
        {block.instruction}
      </div>
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${block.categories.length}, 1fr)` }}>
        {block.categories.map((cat) => {
          const catItems = block.items.filter((item) =>
            cat.correctItems.includes(item.id)
          );
          return (
            <div key={cat.id} className="rounded-lg border border-border overflow-hidden">
              <div className="bg-muted px-3 py-2">
                <span
                  className="text-sm font-semibold outline-none block"
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) =>
                    dispatch({
                      type: "UPDATE_BLOCK",
                      payload: {
                        id: block.id,
                        updates: {
                          categories: block.categories.map((c) =>
                            c.id === cat.id
                              ? { ...c, label: e.currentTarget.textContent || "" }
                              : c
                          ),
                        },
                      },
                    })
                  }
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
                      onBlur={(e) =>
                        updateItem(item.id, e.currentTarget.textContent || "")
                      }
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

// ─── Main Block Renderer ────────────────────────────────────
export function BlockRenderer({
  block,
  mode,
}: {
  block: WorksheetBlock;
  mode: ViewMode;
}) {
  const t = useTranslations("blockRenderer");
  const tc = useTranslations("common");
  const interactive = mode === "online";

  switch (block.type) {
    case "heading":
      return <HeadingRenderer block={block} />;
    case "text":
      return <TextRenderer block={block} />;
    case "image":
      return <ImageRenderer block={block} />;
    case "spacer":
      return <SpacerRenderer block={block} />;
    case "divider":
      return <DividerRenderer block={block} />;
    case "multiple-choice":
      return <MultipleChoiceRenderer block={block} interactive={interactive} />;
    case "fill-in-blank":
      return <FillInBlankRenderer block={block} interactive={interactive} />;
    case "matching":
      return <MatchingRenderer block={block} />;
    case "open-response":
      return <OpenResponseRenderer block={block} interactive={interactive} />;
    case "word-bank":
      return <WordBankRenderer block={block} />;
    case "number-line":
      return <NumberLineRenderer block={block} />;
    case "true-false-matrix":
      return <TrueFalseMatrixRenderer block={block} interactive={interactive} />;
    case "order-items":
      return <OrderItemsRenderer block={block} interactive={interactive} />;
    case "inline-choices":
      return <InlineChoicesRenderer block={block} interactive={interactive} />;
    case "word-search":
      return <WordSearchRenderer block={block} />;
    case "sorting-categories":
      return <SortingCategoriesRenderer block={block} />;
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
