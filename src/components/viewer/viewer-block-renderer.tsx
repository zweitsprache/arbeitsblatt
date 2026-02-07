"use client";

import React, { useMemo, useState } from "react";
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

// ─── Static blocks ──────────────────────────────────────────

function HeadingView({ block }: { block: HeadingBlock }) {
  const Tag = `h${block.level}` as keyof React.JSX.IntrinsicElements;
  const sizes = { 1: "text-3xl", 2: "text-2xl", 3: "text-xl" };
  return <Tag className={`${sizes[block.level]} font-bold`}>{block.content}</Tag>;
}

function TextView({ block }: { block: TextBlock }) {
  return (
    <div
      className="tiptap max-w-none"
      dangerouslySetInnerHTML={{ __html: block.content }}
    />
  );
}

function ImageView({ block }: { block: ImageBlock }) {
  if (!block.src) return null;
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

function SpacerView({ block }: { block: SpacerBlock }) {
  return <div style={{ height: block.height }} />;
}

function DividerView({ block }: { block: DividerBlock }) {
  return <hr style={{ borderStyle: block.style }} />;
}

// ─── Interactive blocks ─────────────────────────────────────

function MultipleChoiceView({
  block,
  interactive,
  answer,
  onAnswer,
  showResults,
}: {
  block: MultipleChoiceBlock;
  interactive: boolean;
  answer: unknown;
  onAnswer: (value: unknown) => void;
  showResults: boolean;
}) {
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
        {block.options.map((opt) => {
          const isSelected = selected.includes(opt.id);
          const isCorrect = opt.isCorrect;

          let optionClass =
            "flex items-center gap-3 p-3 rounded-lg border transition-colors";

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
              {interactive ? (
                <div
                  className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors
                    ${isSelected ? "border-primary bg-primary" : "border-muted-foreground/40"}`}
                >
                  {isSelected && (
                    <div className="h-2 w-2 rounded-full bg-white" />
                  )}
                </div>
              ) : block.allowMultiple ? (
                <input type="checkbox" disabled className="h-4 w-4 rounded border-gray-300" />
              ) : (
                <input type="radio" name={`mc-${block.id}`} disabled className="h-4 w-4 border-gray-300" />
              )}
              <span className="text-sm flex-1">{opt.text}</span>
              {showResults && isCorrect && (
                <span className="text-xs font-medium text-green-600">✓ Correct</span>
              )}
              {showResults && isSelected && !isCorrect && (
                <span className="text-xs font-medium text-red-600">✗ Incorrect</span>
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
}: {
  block: FillInBlankBlock;
  interactive: boolean;
  answer: unknown;
  onAnswer: (value: unknown) => void;
  showResults: boolean;
}) {
  const blanks = (answer as Record<string, string> | undefined) || {};
  const parts = block.content.split(/(\{\{blank:[^}]+\}\})/g);
  let blankIndex = 0;

  return (
    <div className="leading-loose text-base">
      {parts.map((part, i) => {
        const match = part.match(/\{\{blank:(.+)\}\}/);
        if (match) {
          const correctAnswer = match[1].trim();
          const key = `blank-${blankIndex}`;
          blankIndex++;
          const userValue = blanks[key] || "";
          const isCorrectAnswer =
            showResults && userValue.trim().toLowerCase() === correctAnswer.toLowerCase();
          const isWrong = showResults && userValue.trim() !== "" && !isCorrectAnswer;

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
                  className={`border-b-2 bg-transparent px-2 py-0.5 text-center focus:outline-none w-32 inline transition-colors
                    ${showResults
                      ? isCorrectAnswer
                        ? "border-green-500 text-green-700"
                        : isWrong
                          ? "border-red-500 text-red-700"
                          : "border-muted-foreground/40"
                      : "border-muted-foreground/40 focus:border-primary"}`}
                  placeholder="________"
                />
                {showResults && isWrong && (
                  <span className="block text-xs text-green-600 text-center mt-0.5">
                    {correctAnswer}
                  </span>
                )}
              </span>
            );
          }
          return (
            <span
              key={i}
              className="inline-block border-b-2 border-gray-400 min-w-[80px] px-2 py-0.5 mx-1"
            >
              &nbsp;
            </span>
          );
        }
        return <span key={i}>{part}</span>;
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
}: {
  block: MatchingBlock;
  interactive: boolean;
  answer: unknown;
  onAnswer: (value: unknown) => void;
  showResults: boolean;
}) {
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

  const selections = (answer as Record<string, string> | undefined) || {};

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
    { bg: "bg-amber-100", border: "border-amber-400", badge: "bg-amber-500" },
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

  return (
    <div className="space-y-3">
      {block.instruction && (
        <p className="text-sm text-muted-foreground">{block.instruction}</p>
      )}
      {interactive && !showResults && (
        <p className="text-xs text-muted-foreground">
          {activeLeftId ? "Now click an item on the right to match it." : "Click an item on the left, then click its match on the right."}
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
                className={`w-full flex items-center gap-2 p-3 rounded-lg border transition-all text-left
                  ${borderClass} ${bgClass}
                  ${interactive && !showResults ? "cursor-pointer hover:border-primary/50" : "cursor-default"}`}
              >
                <span className="text-xs font-bold text-muted-foreground w-5 shrink-0">
                  {i + 1}.
                </span>
                <span className="text-sm flex-1">{pair.left}</span>
                {color && !showResults && (
                  <span className={`w-5 h-5 rounded-full ${color.badge} text-white text-[10px] font-bold flex items-center justify-center shrink-0`}>
                    {colorIdx !== undefined ? colorIdx + 1 : ""}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {/* Right side — shuffled answers */}
        <div className="space-y-2">
          {shuffledRight.map((pair) => {
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
                className={`w-full flex items-center gap-2 p-3 rounded-lg border transition-all text-left
                  ${borderClass} ${bgClass}
                  ${interactive && !showResults && activeLeftId ? "cursor-pointer hover:border-primary/50" : "cursor-default"}`}
              >
                <span className="text-sm flex-1">{pair.right}</span>
                {color && !showResults && (
                  <span className={`w-5 h-5 rounded-full ${color.badge} text-white text-[10px] font-bold flex items-center justify-center shrink-0`}>
                    {colorIdx !== undefined ? colorIdx + 1 : ""}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      {showResults && (
        <p className="text-xs text-muted-foreground">
          {block.pairs.filter((p) => selections[p.id] === p.id).length} / {block.pairs.length} correct
        </p>
      )}
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
  return (
    <div className="space-y-2">
      <p className="font-medium text-sm">{block.question}</p>
      {interactive ? (
        <textarea
          className="w-full border rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
          rows={block.lines}
          value={(answer as string) || ""}
          onChange={(e) => onAnswer(e.target.value)}
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

function WordBankView({ block }: { block: WordBankBlock }) {
  return (
    <div className="border-2 border-dashed border-muted-foreground/20 rounded-lg p-4">
      <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
        Word Bank
      </p>
      <div className="flex flex-wrap gap-2">
        {block.words.map((word, i) => (
          <span
            key={i}
            className="px-3 py-1.5 bg-muted rounded-full text-sm font-medium"
          >
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
              <span className="text-xs mt-1 text-muted-foreground">{v}</span>
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

function TrueFalseMatrixView({
  block,
  interactive,
  answer,
  onAnswer,
  showResults,
}: {
  block: TrueFalseMatrixBlock;
  interactive: boolean;
  answer: unknown;
  onAnswer: (value: unknown) => void;
  showResults: boolean;
}) {
  const answers = (answer as Record<string, boolean | null> | undefined) || {};

  const handleSelect = (stmtId: string, value: boolean) => {
    if (!interactive) return;
    onAnswer({ ...answers, [stmtId]: value });
  };

  return (
    <div className="space-y-2">
      {block.instruction && (
        <p className="text-sm font-medium">{block.instruction}</p>
      )}
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="text-left p-2 border-b font-medium text-muted-foreground">Statement</th>
            <th className="w-20 p-2 border-b text-center font-medium text-muted-foreground">True</th>
            <th className="w-20 p-2 border-b text-center font-medium text-muted-foreground">False</th>
          </tr>
        </thead>
        <tbody>
          {block.statements.map((stmt) => {
            const selected = answers[stmt.id];
            const isCorrect = selected === stmt.correctAnswer;

            return (
              <tr key={stmt.id} className="border-b last:border-b-0">
                <td className="p-2">{stmt.text}</td>
                <td className="p-2 text-center">
                  {interactive ? (
                    <button
                      className={`w-6 h-6 rounded-full border-2 inline-flex items-center justify-center transition-colors
                        ${selected === true
                          ? showResults
                            ? stmt.correctAnswer
                              ? "bg-green-500 border-green-500 text-white"
                              : "bg-red-500 border-red-500 text-white"
                            : "bg-primary border-primary text-white"
                          : "border-muted-foreground/30 hover:border-primary/50"
                        }`}
                      onClick={() => handleSelect(stmt.id, true)}
                    >
                      {selected === true && "✓"}
                    </button>
                  ) : (
                    <div className="w-5 h-5 rounded border-2 border-muted-foreground/30 mx-auto" />
                  )}
                </td>
                <td className="p-2 text-center">
                  {interactive ? (
                    <button
                      className={`w-6 h-6 rounded-full border-2 inline-flex items-center justify-center transition-colors
                        ${selected === false
                          ? showResults
                            ? !stmt.correctAnswer
                              ? "bg-green-500 border-green-500 text-white"
                              : "bg-red-500 border-red-500 text-white"
                            : "bg-primary border-primary text-white"
                          : "border-muted-foreground/30 hover:border-primary/50"
                        }`}
                      onClick={() => handleSelect(stmt.id, false)}
                    >
                      {selected === false && "✓"}
                    </button>
                  ) : (
                    <div className="w-5 h-5 rounded border-2 border-muted-foreground/30 mx-auto" />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {showResults && (
        <p className="text-xs text-muted-foreground">
          {block.statements.filter((s) => answers[s.id] === s.correctAnswer).length} / {block.statements.length} correct
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
}: {
  block: ColumnsBlock;
  mode: ViewMode;
  answer: unknown;
  onAnswer: (value: unknown) => void;
  showResults: boolean;
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
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Main Renderer ──────────────────────────────────────────

export function ViewerBlockRenderer({
  block,
  mode,
  answer,
  onAnswer,
  showResults = false,
}: {
  block: WorksheetBlock;
  mode: ViewMode;
  answer?: unknown;
  onAnswer?: (value: unknown) => void;
  showResults?: boolean;
}) {
  const interactive = mode === "online";
  const noop = () => {};

  switch (block.type) {
    case "heading":
      return <HeadingView block={block} />;
    case "text":
      return <TextView block={block} />;
    case "image":
      return <ImageView block={block} />;
    case "spacer":
      return <SpacerView block={block} />;
    case "divider":
      return <DividerView block={block} />;
    case "multiple-choice":
      return (
        <MultipleChoiceView
          block={block}
          interactive={interactive}
          answer={answer}
          onAnswer={onAnswer || noop}
          showResults={showResults}
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
        />
      );
    case "columns":
      return (
        <ColumnsView
          block={block}
          mode={mode}
          answer={answer}
          onAnswer={onAnswer || noop}
          showResults={showResults}
        />
      );
    default:
      return null;
  }
}
