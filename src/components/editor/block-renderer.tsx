"use client";

import React from "react";
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
  ViewMode,
} from "@/types/worksheet";
import { useEditor } from "@/store/editor-store";
import { RichTextEditor } from "./rich-text-editor";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { Plus, X, Check, GripVertical, Trash2, Copy, Eye, Printer, Monitor, Sparkles } from "lucide-react";
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
          placeholder="Start typing..."
        />
        <button
          type="button"
          onClick={() => setShowAiModal(true)}
          className="absolute -top-2 -right-2 opacity-0 group-hover/text:opacity-100 transition-opacity bg-purple-600 hover:bg-purple-700 text-white rounded-full p-1.5 shadow-md z-10"
          title="AI Generate Reading Text"
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
  if (!block.src) {
    return (
      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center text-muted-foreground text-sm">
        <p>Click to add image URL</p>
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
      <div className="space-y-1.5 pl-1">
        {block.options.map((opt, i) => (
          <div key={opt.id} className="flex items-center gap-2 group">
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
                title={opt.isCorrect ? "Marked as correct" : "Mark as correct"}
              >
                {opt.isCorrect && <Check className="h-3 w-3" />}
              </button>
            )}
            {interactive ? (
              <span className="text-sm">{opt.text}</span>
            ) : (
              <span
                contentEditable
                suppressContentEditableWarning
                className="text-sm outline-none flex-1 border-b border-transparent focus:border-muted-foreground/30 transition-colors"
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
                title="Remove option"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
      </div>
      {!interactive && (
        <div className="flex items-center gap-3 pl-1 mt-1">
          <button
            type="button"
            onClick={addOption}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add option
          </button>
          <button
            type="button"
            className="text-xs text-purple-500 hover:text-purple-700 flex items-center gap-1 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setShowAiModal(true);
            }}
          >
            <Sparkles className="h-3 w-3" /> AI generate
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
              placeholder="________"
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
      <p className="text-sm text-muted-foreground">{block.instruction}</p>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          {block.pairs.map((pair, i) => (
            <div
              key={pair.id}
              className="flex items-center gap-2 p-2 rounded border bg-card"
            >
              <span className="text-xs font-bold text-muted-foreground w-5">
                {i + 1}.
              </span>
              <span className="text-sm">{pair.left}</span>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          {shuffledRight.map((pair, i) => (
            <div
              key={`right-${pair.id}`}
              className="flex items-center gap-2 p-2 rounded border bg-card"
            >
              <span className="text-xs font-bold text-muted-foreground w-5">
                {String.fromCharCode(65 + i)}.
              </span>
              <span className="text-sm">{pair.right}</span>
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
  return (
    <div className="space-y-2">
      <p className="font-medium text-sm">{block.question}</p>
      {interactive ? (
        <textarea
          className="w-full border rounded-md p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          rows={block.lines}
          placeholder="Write your answer here..."
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
    <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-4">
      <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
        Word Bank
      </p>
      <div className="flex flex-wrap gap-2">
        {block.words.map((word, i) => (
          <span
            key={i}
            className="px-3 py-1 bg-muted rounded-full text-sm font-medium"
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
            { id: crypto.randomUUID(), text: "New statement", correctAnswer: true },
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
        className="text-sm font-medium outline-none"
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
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="text-left p-2 border-b font-medium text-muted-foreground">Statement</th>
            <th className="w-16 p-2 border-b text-center font-medium text-muted-foreground">True</th>
            <th className="w-16 p-2 border-b text-center font-medium text-muted-foreground">False</th>
            <th className="w-8 p-2 border-b"></th>
          </tr>
        </thead>
        <tbody>
          {block.statements.map((stmt) => (
            <tr key={stmt.id} className="group/row border-b last:border-b-0">
              <td className="p-2">
                <span
                  className="outline-none block"
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) =>
                    updateStatement(stmt.id, { text: e.currentTarget.textContent || "" })
                  }
                >
                  {stmt.text}
                </span>
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
          <Plus className="h-3 w-3" /> Add statement
        </button>
        <button
          className="text-xs text-purple-500 hover:text-purple-700 flex items-center gap-1 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            setShowAiModal(true);
          }}
        >
          <Sparkles className="h-3 w-3" /> AI generate
        </button>
      </div>
      <AiTrueFalseModal open={showAiModal} onOpenChange={setShowAiModal} blockId={block.id} />
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
            <p className="text-xs">Visible: {block.visibility}</p>
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
          {block.visibility === "print" ? "Print" : "Online"}
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
          {isOver ? "Drop here" : `Column ${colIndex + 1}`}
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
    case "columns":
      return <ColumnsRenderer block={block} mode={mode} />;
    default:
      return (
        <div className="p-4 bg-red-50 text-red-600 rounded text-sm">
          Unknown block type: {(block as WorksheetBlock).type}
        </div>
      );
  }
}
