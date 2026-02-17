"use client";

import React, { useMemo, useState } from "react";
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
  MatchingBlock,
  GlossaryBlock,
  OpenResponseBlock,
  WordBankBlock,
  NumberLineBlock,
  ColumnsBlock,
  TrueFalseMatrixBlock,
  ArticleTrainingBlock,
  ArticleAnswer,
  OrderItemsBlock,
  InlineChoicesBlock,
  migrateInlineChoicesBlock,
  WordSearchBlock,
  SortingCategoriesBlock,
  UnscrambleWordsBlock,
  FixSentencesBlock,
  VerbTableBlock,
  ViewMode,
} from "@/types/worksheet";
import { useTranslations } from "next-intl";

// ─── Static blocks ──────────────────────────────────────────

function HeadingView({ block }: { block: HeadingBlock }) {
  const Tag = `h${block.level}` as keyof React.JSX.IntrinsicElements;
  const sizes = { 1: "text-xl", 2: "text-xl", 3: "text-lg" };
  return <Tag className={`${sizes[block.level]}`} style={block.level === 1 ? { marginBottom: -4 } : undefined}>{block.content}</Tag>;
}

function TextView({ block }: { block: TextBlock }) {
  const imageEl = block.imageSrc ? (
    <div
      style={{
        float: block.imageAlign === "right" ? "right" : "left",
        width: `${block.imageScale ?? 30}%`,
        margin: block.imageAlign === "right" ? "0 0 8px 12px" : "0 12px 8px 0",
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
    <div style={{ overflow: "hidden" }}>
      {imageEl}
      <div
        className="tiptap max-w-none"
        dangerouslySetInnerHTML={{ __html: block.content }}
      />
    </div>
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

function ImageCardsView({ block }: { block: ImageCardsBlock }) {
  // Shuffle word bank items for display (memoized to maintain consistency)
  const shuffledItems = useMemo(() => {
    if (!block.showWordBank) return [];
    return [...block.items]
      .filter(item => item.text)
      .sort(() => Math.random() - 0.5);
  }, [block.items, block.showWordBank]);

  return (
    <div className="space-y-3">
      {/* Word Bank */}
      {block.showWordBank && shuffledItems.length > 0 && (
        <div className="bg-muted/30 rounded p-3 border border-dashed border-muted-foreground/30">
          <div className="flex flex-wrap gap-2">
            {shuffledItems.map((item) => (
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
        {block.items.map((item) => {
          const [arW, arH] = (block.imageAspectRatio ?? "1:1").split(":").map(Number);
          return (
          <div key={item.id} className="border rounded overflow-hidden bg-card image-card-row">
            {item.src && (
              <div 
                className="overflow-hidden relative mx-auto"
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
              </div>
            )}
            <div className={block.showWritingLines ? "px-2 pb-2" : "p-2 text-center text-sm"}>
              {block.showWritingLines ? (
                <div className="space-y-0.5 pb-1">
                  {Array.from({ length: block.writingLinesCount ?? 1 }).map((_, i) => (
                    <div key={i} className="h-6" style={{ borderBottom: '1px dashed var(--color-muted-foreground)', opacity: 0.3 }} />
                  ))}
                </div>
              ) : (
                item.text && <span>{item.text}</span>
              )}
            </div>
          </div>
        )})}
      </div>
    </div>
  );
}

function TextCardsView({ block }: { block: TextCardsBlock }) {
  const shuffledItems = useMemo(() => {
    if (!block.showWordBank) return [];
    return [...block.items]
      .filter(item => item.text)
      .sort(() => Math.random() - 0.5);
  }, [block.items, block.showWordBank]);

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
      {/* Word Bank */}
      {block.showWordBank && shuffledItems.length > 0 && (
        <div className="bg-muted/30 rounded p-3 border border-dashed border-muted-foreground/30">
          <div className="flex flex-wrap gap-2">
            {shuffledItems.map((item) => (
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
        {block.items.map((item) => (
          <div key={item.id} className={`${block.showBorder ? "border rounded" : ""} overflow-hidden bg-card text-card-row`}>
            <div className={`p-3 ${sizeClasses[block.textSize ?? "base"]} ${alignClasses[block.textAlign ?? "center"]} ${block.textBold ? "font-bold" : ""} ${block.textItalic ? "italic" : ""}`}>
              {item.text && <span>{item.text}</span>}
            </div>
            <div className={block.showWritingLines ? "px-2 pb-2" : "p-2 text-center text-sm"}>
              {block.showWritingLines ? (
                <div className="space-y-0 pb-1">
                  {Array.from({ length: block.writingLinesCount ?? 1 }).map((_, i) => (
                    <div key={i} className="h-6" style={{ borderBottom: '1px dashed var(--color-muted-foreground)', opacity: 0.3 }} />
                  ))}
                </div>
              ) : (
                item.caption && <span>{item.caption}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
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
  const t = useTranslations("viewer");
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
        {block.options.map((opt, i) => {
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
              <span className="text-xs font-bold text-muted-foreground bg-muted w-6 h-6 rounded flex items-center justify-center shrink-0">
                {String(i + 1).padStart(2, "0")}
              </span>
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
              <span className="text-base flex-1">{opt.text}</span>
              {showResults && isCorrect && (
                <span className="text-xs font-medium text-green-600">{t("correctResult")}</span>
              )}
              {showResults && isSelected && !isCorrect && (
                <span className="text-xs font-medium text-red-600">{t("incorrectResult")}</span>
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
  const tb = useTranslations("blockRenderer");
  const blanks = (answer as Record<string, string> | undefined) || {};
  const parts = block.content.split(/(\{\{blank:[^}]+\}\})/g);
  let blankIndex = 0;

  return (
    <div className="leading-loose">
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
                  placeholder={tb("fillInBlankPlaceholder")}
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
              className="bg-gray-100 min-w-[80px] px-2 mx-1"
              style={{ display: 'inline-flex', alignItems: 'center', verticalAlign: 'text-bottom', height: '1.3em', borderRadius: 2 }}
            >
              <span className="text-muted-foreground" style={{ fontSize: '0.65em' }}>
                {String(blankIndex).padStart(2, "0")}
              </span>
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
  const t = useTranslations("viewer");
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
    { bg: "bg-slate-100", border: "border-slate-400", badge: "bg-slate-500" },
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

  // ── Print / non-interactive mode: row-based layout like T/F and Order ──
  if (!interactive) {
    return (
      <div className="space-y-2">
        {block.instruction && (
          <p className="text-muted-foreground">{block.instruction}</p>
        )}
        <div className="grid grid-cols-2" style={{ gap: "0 24px" }}>
          {/* Left column */}
          <div>
            {block.pairs.map((pair, i) => (
              <div
                key={pair.id}
                className="flex items-center gap-3 py-2 border-b last:border-b-0"
              >
                <span
                  style={{ width: 20, height: 20, minWidth: 20, fontSize: 9, lineHeight: '20px', borderRadius: 4, textAlign: 'center', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                  className="font-bold text-muted-foreground bg-muted"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex-1">{pair.left}</span>
                <div className="w-5 h-5 rounded border-2 border-muted-foreground/30 shrink-0" />
              </div>
            ))}
          </div>
          {/* Right column — shuffled */}
          <div>
            {shuffledRight.map((pair, i) => (
              <div
                key={`r-${pair.id}`}
                className="flex items-center gap-3 py-2 border-b last:border-b-0"
              >
                <div className="w-5 h-5 rounded border-2 border-muted-foreground/30 shrink-0" />
                <span className="flex-1">{pair.right}</span>
                <span
                  style={{ width: 20, height: 20, minWidth: 20, fontSize: 9, lineHeight: '20px', borderRadius: 4, textAlign: 'center', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                  className="font-bold text-muted-foreground bg-muted"
                >
                  {String.fromCharCode(65 + i)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Online / interactive mode ──
  return (
    <div className="space-y-3">
      {block.instruction && (
        <p className="text-muted-foreground">{block.instruction}</p>
      )}
      {interactive && !showResults && (
        <p className="text-xs text-muted-foreground">
          {activeLeftId ? t("matchingInstructionActive") : t("matchingInstructionDefault")}
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
                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left
                  ${borderClass} ${bgClass}
                  ${interactive && !showResults ? "cursor-pointer hover:border-primary/40" : "cursor-default"}`}
              >
                <span className="text-xs font-bold text-muted-foreground bg-muted w-6 h-6 rounded flex items-center justify-center shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex-1">{pair.left}</span>
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
          {shuffledRight.map((pair, i) => {
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
                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left
                  ${borderClass} ${bgClass}
                  ${interactive && !showResults && activeLeftId ? "cursor-pointer hover:border-primary/40" : "cursor-default"}`}
              >
                <span className="text-xs font-bold text-muted-foreground bg-muted w-6 h-6 rounded flex items-center justify-center shrink-0">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="flex-1">{pair.right}</span>
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
          {t("resultCount", { correct: block.pairs.filter((p) => selections[p.id] === p.id).length, total: block.pairs.length })}
        </p>
      )}
    </div>
  );
}

function GlossaryView({
  block,
}: {
  block: GlossaryBlock;
}) {
  return (
    <div className="space-y-2">
      {block.instruction && (
        <p className="text-muted-foreground">{block.instruction}</p>
      )}
      <div className="space-y-0">
        {block.pairs.map((pair) => (
          <div
            key={pair.id}
            className="flex items-start gap-4 py-2 border-b last:border-b-0"
          >
            <span className="font-semibold" style={{ width: "25%", minWidth: "25%", flexShrink: 0 }}>
              {pair.term}
            </span>
            <span className="flex-1">
              {pair.definition}
            </span>
          </div>
        ))}
      </div>
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
  const tb = useTranslations("blockRenderer");

  return (
    <div className="space-y-2">
      <p className="font-medium">{block.question}</p>
      {interactive ? (
        <textarea
          className="w-full border rounded-lg p-3 text-base resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
          rows={block.lines}
          value={(answer as string) || ""}
          onChange={(e) => onAnswer(e.target.value)}
          placeholder={tb("writeAnswerHere")}
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
  const tb = useTranslations("blockRenderer");
  return (
    <div className="border-2 border-dashed border-muted-foreground/20 rounded-lg p-4">
      <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
        {tb("wordBank")}
      </p>
      <div className="flex flex-wrap gap-2">
        {block.words.map((word, i) => (
          <span
            key={i}
            className="px-3 py-1.5 bg-muted rounded-full text-base font-medium"
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
  const tc = useTranslations("common");
  const t = useTranslations("viewer");
  const answers = (answer as Record<string, boolean | null> | undefined) || {};

  const handleSelect = (stmtId: string, value: boolean) => {
    if (!interactive) return;
    onAnswer({ ...answers, [stmtId]: value });
  };

  return (
    <div className="space-y-2">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="text-left py-2 pr-2 border-b font-bold text-foreground">{block.statementColumnHeader || ""}</th>
            <th className="w-20 p-2 border-b text-center font-medium text-muted-foreground">{tc("true")}</th>
            <th className="w-20 p-2 border-b text-center font-medium text-muted-foreground">{tc("false")}</th>
          </tr>
        </thead>
        <tbody>
          {block.statements.map((stmt, stmtIndex) => {
            const selected = answers[stmt.id];
            const isCorrect = selected === stmt.correctAnswer;

            return (
              <tr key={stmt.id} className="border-b last:border-b-0">
                <td className="py-2 pr-2">
                  <div className="flex items-center gap-3">
                    <span style={{ width: 20, height: 20, minWidth: 20, fontSize: 9, lineHeight: '20px', borderRadius: 4, textAlign: 'center', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} className="font-bold text-muted-foreground bg-muted">
                      {String(stmtIndex + 1).padStart(2, "0")}
                    </span>
                    <span className="flex-1">{stmt.text}</span>
                  </div>
                </td>
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
          {t("resultCount", { correct: block.statements.filter((s) => answers[s.id] === s.correctAnswer).length, total: block.statements.length })}
        </p>
      )}
    </div>
  );
}

function ArticleTrainingView({
  block,
  interactive,
  answer,
  onAnswer,
  showResults,
}: {
  block: ArticleTrainingBlock;
  interactive: boolean;
  answer: unknown;
  onAnswer: (value: unknown) => void;
  showResults: boolean;
}) {
  const t = useTranslations("viewer");
  const answers = (answer as Record<string, ArticleAnswer | null> | undefined) || {};
  const articles: ArticleAnswer[] = ["der", "das", "die"];

  const handleSelect = (itemId: string, value: ArticleAnswer) => {
    if (!interactive) return;
    onAnswer({ ...answers, [itemId]: value });
  };

  return (
    <div className="space-y-2">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="w-[28px] p-2 border-b"></th>
            {articles.map((a) => (
              <th key={a} className="w-14 p-2 border-b text-center font-medium text-muted-foreground">{a}</th>
            ))}
            <th className="text-left py-2 px-2 border-b font-bold text-foreground"></th>
            {block.showWritingLine && (
              <th className="text-left py-2 px-2 border-b font-bold text-muted-foreground"></th>
            )}
          </tr>
        </thead>
        <tbody>
          {block.items.map((item, idx) => {
            const selected = answers[item.id];
            const isCorrect = selected === item.correctArticle;

            return (
              <tr key={item.id} className="border-b last:border-b-0">
                <td className="p-2 text-center">
                  <span style={{ width: 20, height: 20, minWidth: 20, fontSize: 9, lineHeight: '20px', borderRadius: 4, textAlign: 'center', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} className="font-bold text-muted-foreground bg-muted">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                </td>
                {articles.map((a) => (
                  <td key={a} className="p-2 text-center">
                    {interactive ? (
                      <button
                        className={`w-6 h-6 rounded-full border-2 inline-flex items-center justify-center transition-colors
                          ${selected === a
                            ? showResults
                              ? item.correctArticle === a
                                ? "bg-green-500 border-green-500 text-white"
                                : "bg-red-500 border-red-500 text-white"
                              : "bg-primary border-primary text-white"
                            : "border-muted-foreground/30 hover:border-primary/50"
                          }`}
                        onClick={() => handleSelect(item.id, a)}
                      >
                        {selected === a && "✓"}
                      </button>
                    ) : (
                      <div className="w-5 h-5 rounded border-2 border-muted-foreground/30 mx-auto" />
                    )}
                  </td>
                ))}
                <td className="py-2 px-2">
                  <span className="flex-1">{item.text}</span>
                </td>
                {block.showWritingLine && (
                  <td className="py-2 px-2">
                    <div className="border-b border-muted-foreground/30 h-6 min-w-[100px]" />
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      {showResults && (
        <p className="text-xs text-muted-foreground">
          {t("resultCount", { correct: block.items.filter((item) => answers[item.id] === item.correctArticle).length, total: block.items.length })}
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
  primaryColor,
}: {
  block: ColumnsBlock;
  mode: ViewMode;
  answer: unknown;
  onAnswer: (value: unknown) => void;
  showResults: boolean;
  primaryColor?: string;
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
              primaryColor={primaryColor}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Order Items View ────────────────────────────────────────
function OrderItemsView({
  block,
  interactive,
  answer,
  onAnswer,
  showResults,
}: {
  block: OrderItemsBlock;
  interactive: boolean;
  answer: unknown;
  onAnswer: (value: unknown) => void;
  showResults: boolean;
}) {
  const t = useTranslations("viewer");
  // Answer is an array of item IDs in user-chosen order
  const userOrder = (answer as string[] | undefined) || [];

  // Shuffle items deterministically based on block id for print/initial state
  const shuffledItems = useMemo(() => {
    const arr = [...block.items];
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
  }, [block.items, block.id]);

  // Initialize user order from shuffled if empty
  React.useEffect(() => {
    if (interactive && userOrder.length === 0 && block.items.length > 0) {
      onAnswer(shuffledItems.map((item) => item.id));
    }
  }, [interactive, block.items.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const displayItems =
    userOrder.length > 0
      ? userOrder
          .map((id) => block.items.find((item) => item.id === id))
          .filter(Boolean)
      : shuffledItems;

  const moveItem = (currentIndex: number, direction: -1 | 1) => {
    if (showResults) return;
    const newIndex = currentIndex + direction;
    if (newIndex < 0 || newIndex >= displayItems.length) return;
    const newOrder = [...userOrder];
    [newOrder[currentIndex], newOrder[newIndex]] = [
      newOrder[newIndex],
      newOrder[currentIndex],
    ];
    onAnswer(newOrder);
  };

  return (
    <div className="space-y-2">
      {block.instruction && (
        <p className="font-medium">{block.instruction}</p>
      )}
      <div>
        {displayItems.map((item, i) => {
          if (!item) return null;
          const isCorrectPosition = item.correctPosition === i + 1;
          let borderClass = "";
          let bgClass = "";
          if (showResults) {
            bgClass = isCorrectPosition ? "bg-green-50" : "bg-red-50";
          }

          return (
            <div
              key={item.id}
              className={`flex items-center gap-3 py-2 border-b last:border-b-0 transition-colors ${borderClass} ${bgClass}`}
            >
              {interactive ? (
                <span className="text-xs font-bold text-muted-foreground bg-muted w-6 h-6 rounded flex items-center justify-center shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
              ) : (
                <div className="w-5 h-5 rounded border-2 border-muted-foreground/30 shrink-0" />
              )}
              <span className="flex-1">{item.text}</span>
              {interactive && !showResults && (
                <div className="flex flex-col gap-0.5">
                  <button
                    className="p-0.5 hover:bg-muted rounded disabled:opacity-30"
                    onClick={() => moveItem(i, -1)}
                    disabled={i === 0}
                    aria-label={t("moveUp")}
                  >
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 15l-6-6-6 6"/></svg>
                  </button>
                  <button
                    className="p-0.5 hover:bg-muted rounded disabled:opacity-30"
                    onClick={() => moveItem(i, 1)}
                    disabled={i === displayItems.length - 1}
                    aria-label={t("moveDown")}
                  >
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                  </button>
                </div>
              )}
              {showResults && (
                <span className={`text-xs font-medium ${isCorrectPosition ? "text-green-600" : "text-red-600"}`}>
                  {isCorrectPosition ? "✓" : t("correctPosition", { position: item.correctPosition })}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {showResults && (
        <p className="text-xs text-muted-foreground">
          {t("resultCount", { correct: displayItems.filter(
            (item, i) => item && item.correctPosition === i + 1
          ).length, total: block.items.length })}
        </p>
      )}
    </div>
  );
}

// ─── Inline Choices View ─────────────────────────────────────

/** Render one inline-choices line with interactive/print mode support. */
function renderInlineChoiceViewLine(
  content: string,
  lineKey: string,
  interactive: boolean,
  selections: Record<string, string>,
  onAnswer: (value: unknown) => void,
  showResults: boolean,
  choiceCounter: { value: number }
): React.ReactNode[] {
  const parts = content.split(/(\{\{choice:[^}]+\}\})/g);
  // Track whether any visible text appeared before the current part
  let hasTextBefore = false;
  return parts.map((part, i) => {
    const match = part.match(/\{\{choice:(.+)\}\}/);
    if (match) {
      const options = match[1].split("|");
      const atStart = !hasTextBefore;
      const capitalise = (s: string) => atStart ? s.charAt(0).toUpperCase() + s.slice(1) : s;
      const key = `choice-${choiceCounter.value}`;
      choiceCounter.value++;
      const selectedValue = selections[key] || "";

      const correctLabel = capitalise(options
        .find((o) => o.startsWith("*"))
        ?.slice(1) || "");

      if (interactive) {
        return (
          <span key={`${lineKey}-${i}`} className="inline-flex items-center gap-1 mx-0.5">
            {options.map((opt, oi) => {
              const isCorrectOpt = opt.startsWith("*");
              const label = capitalise(isCorrectOpt ? opt.slice(1) : opt);
              const isSelected = selectedValue === label;

              let btnClass =
                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer transition-colors";
              if (showResults) {
                if (isCorrectOpt) {
                  btnClass += " bg-green-100 text-green-800 font-semibold";
                } else if (isSelected && !isCorrectOpt) {
                  btnClass += " bg-red-100 text-red-800 line-through";
                } else {
                  btnClass += " text-muted-foreground";
                }
              } else if (isSelected) {
                btnClass += " bg-primary/10 text-primary font-semibold";
              } else {
                btnClass += " hover:bg-muted";
              }

              return (
                <span key={oi} className="inline-flex items-center">
                  {oi > 0 && (
                    <span className="mx-0.5 text-muted-foreground">/</span>
                  )}
                  <button
                    type="button"
                    className={btnClass}
                    onClick={() => {
                      if (showResults) return;
                      onAnswer({ ...selections, [key]: label });
                    }}
                    disabled={showResults}
                  >
                    <span
                      className={`inline-block w-3 h-3 rounded-full border-[1.5px] shrink-0 ${
                        isSelected
                          ? "border-primary bg-primary"
                          : "border-muted-foreground/40"
                      }`}
                      style={{ position: 'relative', top: 2 }}
                    />
                    {label}
                  </button>
                </span>
              );
            })}
          </span>
        );
      }

      // Print mode: show squares
      return (
        <span key={`${lineKey}-${i}`} className="mx-0.5">
          {options.map((opt, oi) => {
            const label = capitalise(opt.startsWith("*") ? opt.slice(1) : opt);
            return (
              <span key={oi} style={{ marginRight: oi < options.length - 1 ? 6 : 0 }}>
                <span className="inline-block border-[1.5px] border-muted-foreground/30" style={{ width: 12, height: 12, verticalAlign: '-3px', borderRadius: 2 }} />
                <span className="ml-1 font-semibold">{label}</span>
              </span>
            );
          })}
        </span>
      );
    }
    if (part.trim().length > 0) hasTextBefore = true;
    return <span key={`${lineKey}-${i}`}>{renderTextWithSup(part)}</span>;
  });
}

function InlineChoicesView({
  block,
  interactive,
  answer,
  onAnswer,
  showResults,
}: {
  block: InlineChoicesBlock;
  interactive: boolean;
  answer: unknown;
  onAnswer: (value: unknown) => void;
  showResults: boolean;
}) {
  const selections = (answer as Record<string, string> | undefined) || {};
  const items = migrateInlineChoicesBlock(block);
  const choiceCounter = { value: 0 };

  return (
    <div>
      {items.map((item, idx) => (
        <div key={item.id || idx} className="flex items-center gap-3 border-b last:border-b-0 py-2">
          <span style={{ width: 20, height: 20, minWidth: 20, fontSize: 9, lineHeight: '20px', borderRadius: 4, textAlign: 'center', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} className="font-bold text-muted-foreground bg-muted">
            {String(idx + 1).padStart(2, "0")}
          </span>
          <span className="flex-1">
            {renderInlineChoiceViewLine(
              item.content,
              `line-${idx}`,
              interactive,
              selections,
              onAnswer,
              showResults,
              choiceCounter
            )}
          </span>
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

// ─── Word Search View ────────────────────────────────────────
function WordSearchView({
  block,
  mode,
  interactive,
  answer,
  onAnswer,
}: {
  block: WordSearchBlock;
  mode: ViewMode;
  interactive: boolean;
  answer: unknown;
  onAnswer: (value: unknown) => void;
}) {
  const selectedCells = (answer as string[] | undefined) || [];
  const isPrint = mode === "print";

  const toggleCell = (key: string) => {
    if (!interactive) return;
    const newSelection = selectedCells.includes(key)
      ? selectedCells.filter((k) => k !== key)
      : [...selectedCells, key];
    onAnswer(newSelection);
  };

  if (block.grid.length === 0) return null;

  return (
    <div className="space-y-3">
      {block.showWordList && (
        <div className="flex flex-wrap gap-2">
          {block.words.map((word, i) => (
            <span
              key={i}
              className="px-2 py-0.5 bg-muted rounded font-medium uppercase"
            >
              {word}
            </span>
          ))}
        </div>
      )}
      <div className="w-full">
        <table className="w-full border-separate border-spacing-0">
          <tbody>
            {block.grid.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => {
                  const key = `${ri}-${ci}`;
                  const isSelected = selectedCells.includes(key);
                  const isTop = ri === 0;
                  const isLeft = ci === 0;
                  const isTopLeft = isTop && isLeft;
                  const isTopRight = isTop && ci === row.length - 1;
                  const isBottomLeft = ri === block.grid.length - 1 && isLeft;
                  const isBottomRight = ri === block.grid.length - 1 && ci === row.length - 1;
                  const cellStyle: React.CSSProperties = {
                    borderRight: '1px solid var(--color-border)',
                    borderBottom: '1px solid var(--color-border)',
                    ...(isTop ? { borderTop: '1px solid var(--color-border)' } : {}),
                    ...(isLeft ? { borderLeft: '1px solid var(--color-border)' } : {}),
                    ...(isTopLeft ? { borderTopLeftRadius: 4 } : {}),
                    ...(isTopRight ? { borderTopRightRadius: 4 } : {}),
                    ...(isBottomLeft ? { borderBottomLeftRadius: 4 } : {}),
                    ...(isBottomRight ? { borderBottomRightRadius: 4 } : {}),
                    ...(isPrint ? { fontWeight: 500 } : {}),
                  };
                  return (
                    <td
                      key={ci}
                      className={`text-center text-base font-mono select-none aspect-square transition-colors ${isPrint ? '' : 'font-semibold'}
                        ${interactive ? "cursor-pointer hover:bg-primary/10" : ""}
                        ${isSelected ? "bg-primary/20 text-primary" : ""}`}
                      style={cellStyle}
                      onClick={() => toggleCell(key)}
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
    </div>
  );
}

// ─── Sorting Categories View ────────────────────────────────
// ─── Sorting Categories View ──────────────────────────────
function SortingCategoriesView({
  block,
  interactive,
  answer,
  onAnswer,
  showResults,
}: {
  block: SortingCategoriesBlock;
  interactive: boolean;
  answer: unknown;
  onAnswer: (value: unknown) => void;
  showResults: boolean;
}) {
  const t = useTranslations("viewer");
  const userSorting = (answer as Record<string, string[]> | undefined) || {};
  const [dragItem, setDragItem] = useState<string | null>(null);

  const sortedItemIds = Object.values(userSorting).flat();

  // Deterministic shuffle for initial display
  const shuffledItems = useMemo(() => {
    const arr = [...block.items];
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
  }, [block.items, block.id]);

  const displayUnsorted = shuffledItems.filter(
    (item) => !sortedItemIds.includes(item.id)
  );

  const addToCategory = (catId: string, itemId: string) => {
    if (!interactive || showResults) return;
    const newSorting = { ...userSorting };
    for (const key of Object.keys(newSorting)) {
      newSorting[key] = newSorting[key].filter((id) => id !== itemId);
    }
    newSorting[catId] = [...(newSorting[catId] || []), itemId];
    onAnswer(newSorting);
  };

  const removeFromCategory = (catId: string, itemId: string) => {
    if (!interactive || showResults) return;
    const newSorting = { ...userSorting };
    newSorting[catId] = (newSorting[catId] || []).filter((id) => id !== itemId);
    onAnswer(newSorting);
  };

  const getItemById = (id: string) => block.items.find((item) => item.id === id);

  // Print mode: show all items as chips + empty category boxes
  if (!interactive) {
    return (
      <div className="space-y-3">
        {block.instruction && (
          <p className="font-medium">{block.instruction}</p>
        )}
        <div className="flex flex-wrap gap-2">
          {shuffledItems.map((item) => (
            <span
              key={item.id}
              className="px-3 py-1.5 rounded-lg border border-border text-base"
            >
              {item.text}
            </span>
          ))}
        </div>
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${block.categories.length}, 1fr)` }}>
          {block.categories.map((cat) => (
            <div key={cat.id} className="rounded-lg border border-border overflow-hidden">
              <div className="bg-muted px-3 py-2">
                <span className="text-sm font-semibold">{cat.label}</span>
              </div>
              <div className="p-2 min-h-[100px]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {block.instruction && (
        <p className="font-medium">{block.instruction}</p>
      )}
      {/* Unsorted items */}
      {displayUnsorted.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {displayUnsorted.map((item) => (
            <span
              key={item.id}
              className={`px-3 py-1.5 rounded-lg border border-border text-base cursor-grab transition-colors
                ${dragItem === item.id ? "bg-primary/10 border-primary" : "hover:bg-accent"}`}
              draggable
              onDragStart={() => setDragItem(item.id)}
              onDragEnd={() => setDragItem(null)}
            >
              {item.text}
            </span>
          ))}
        </div>
      )}
      {/* Category boxes */}
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${block.categories.length}, 1fr)` }}>
        {block.categories.map((cat) => {
          const catItemIds = userSorting[cat.id] || [];
          return (
            <div
              key={cat.id}
              className="rounded-lg border border-border overflow-hidden transition-shadow"
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add("ring-2", "ring-primary");
              }}
              onDragLeave={(e) => {
                e.currentTarget.classList.remove("ring-2", "ring-primary");
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove("ring-2", "ring-primary");
                if (dragItem) {
                  addToCategory(cat.id, dragItem);
                  setDragItem(null);
                }
              }}
            >
              <div className="bg-muted px-3 py-2">
                <span className="text-sm font-semibold">{cat.label}</span>
              </div>
              <div className="p-2 space-y-1.5 min-h-[60px]">
                {catItemIds.map((itemId) => {
                  const item = getItemById(itemId);
                  if (!item) return null;
                  const isCorrect = cat.correctItems.includes(item.id);
                  let borderClass = "border-border";
                  let bgClass = "bg-card";
                  if (showResults) {
                    borderClass = isCorrect ? "border-green-500" : "border-red-500";
                    bgClass = isCorrect ? "bg-green-50" : "bg-red-50";
                  }
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center gap-2 p-2 rounded border transition-colors ${borderClass} ${bgClass}`}
                    >
                      <span className="text-base flex-1">{item.text}</span>
                      {!showResults && (
                        <button
                          className="p-0.5 hover:bg-muted rounded text-muted-foreground"
                          onClick={() => removeFromCategory(cat.id, item.id)}
                          aria-label={t("removeFromCategory")}
                        >
                          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                        </button>
                      )}
                      {showResults && (
                        <span className={`text-xs font-medium ${isCorrect ? "text-green-600" : "text-red-600"}`}>
                          {isCorrect ? "✓" : "✗"}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {showResults && (
        <p className="text-xs text-muted-foreground">
          {t("resultCount", { correct: Object.entries(userSorting).reduce((total, [catId, itemIds]) => {
            const cat = block.categories.find((c) => c.id === catId);
            if (!cat) return total;
            return total + itemIds.filter((id) => cat.correctItems.includes(id)).length;
          }, 0), total: block.items.length })}
        </p>
      )}
    </div>
  );
}

// ─── Unscramble Words View ───────────────────────────────
function scrambleWordDeterministic(
  word: string,
  keepFirst: boolean,
  lowercase: boolean,
  seed: number
): string {
  let letters = word.split("");
  let firstLetter = "";
  if (keepFirst && letters.length > 1) {
    firstLetter = letters[0];
    letters = letters.slice(1);
  }
  // Deterministic Fisher-Yates shuffle
  let s = seed;
  for (let i = letters.length - 1; i > 0; i--) {
    s = (s * 16807 + 0) % 2147483647;
    const j = Math.abs(s) % (i + 1);
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }
  let result = keepFirst ? firstLetter + letters.join("") : letters.join("");
  if (lowercase) result = result.toLowerCase();
  return result;
}

function UnscrambleWordsView({
  block,
  mode,
  interactive,
  answer,
  onAnswer,
  showResults,
}: {
  block: UnscrambleWordsBlock;
  mode: ViewMode;
  interactive: boolean;
  answer: unknown;
  onAnswer: (value: unknown) => void;
  showResults: boolean;
}) {
  const t = useTranslations("viewer");
  const tb = useTranslations("blockRenderer");
  const isPrint = mode === "print";
  const userAnswers = (answer as Record<string, string> | undefined) || {};

  // Compute a seed per word based on block id + word id
  const getSeed = (wordId: string) => {
    let seed = 0;
    const combined = block.id + wordId;
    for (let i = 0; i < combined.length; i++) {
      seed = ((seed << 5) - seed + combined.charCodeAt(i)) | 0;
    }
    return Math.abs(seed);
  };

  // Compute max word length for consistent arrow alignment
  const maxWordLength = Math.max(...block.words.map((item) => item.word.length), 0);

  return (
    <div className="space-y-2">
      {block.instruction && (
        <p className="font-medium">{block.instruction}</p>
      )}
      <div>
        {block.words.map((item, i) => {
          const scrambled = scrambleWordDeterministic(
            item.word,
            block.keepFirstLetter,
            block.lowercaseAll,
            getSeed(item.id)
          );
          const userValue = userAnswers[item.id] || "";
          const isCorrect =
            showResults &&
            userValue.trim().toLowerCase() === item.word.toLowerCase();
          const isWrong = showResults && userValue.trim() !== "" && !isCorrect;

          return (
            <div
              key={item.id}
              className={`flex items-center gap-3 py-2 border-b last:border-b-0 transition-colors ${
                showResults
                  ? isCorrect
                    ? "bg-green-50"
                    : isWrong
                      ? "bg-red-50"
                      : ""
                  : ""
              }`}
            >
              <span style={{ width: 20, height: 20, minWidth: 20, fontSize: 9, lineHeight: '20px', borderRadius: 4, textAlign: 'center', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} className="font-bold text-muted-foreground bg-muted shrink-0">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="font-mono font-semibold select-none shrink-0 inline-block text-left" style={{ width: `${maxWordLength * 0.62}em` }}>
                {scrambled}
              </span>
              <span className="text-muted-foreground">→</span>
              {interactive ? (
                <div className="flex-1">
                  <input
                    type="text"
                    value={userValue}
                    disabled={showResults}
                    onChange={(e) =>
                      onAnswer({ ...userAnswers, [item.id]: e.target.value })
                    }
                    className={`w-full border-b-2 bg-transparent px-1 py-0.5 focus:outline-none transition-colors ${
                      showResults
                        ? isCorrect
                          ? "border-green-500 text-green-700"
                          : isWrong
                            ? "border-red-500 text-red-700"
                            : "border-muted-foreground/40"
                        : "border-muted-foreground/40 focus:border-primary"
                    }`}
                    placeholder="..."
                  />
                  {showResults && isWrong && (
                    <span className="text-xs text-green-600 mt-0.5 block">
                      {item.word}
                    </span>
                  )}
                </div>
              ) : (
                <span className="flex-1 inline-block" style={{ borderBottom: '1px dashed var(--color-muted-foreground)', opacity: 0.3, minWidth: 80 }}>
                  &nbsp;
                </span>
              )}
            </div>
          );
        })}
      </div>
      {showResults && (
        <p className="text-xs text-muted-foreground">
          {t("resultCount", {
            correct: block.words.filter(
              (w) =>
                (userAnswers[w.id] || "").trim().toLowerCase() ===
                w.word.toLowerCase()
            ).length,
            total: block.words.length,
          })}
        </p>
      )}
    </div>
  );
}

// ─── Fix Sentences View ─────────────────────────────────
function FixSentencesView({
  block,
  mode,
  interactive,
  answer,
  onAnswer,
  showResults,
}: {
  block: FixSentencesBlock;
  mode: ViewMode;
  interactive: boolean;
  answer: unknown;
  onAnswer: (value: unknown) => void;
  showResults: boolean;
}) {
  const t = useTranslations("viewer");
  const isPrint = mode === "print";
  // answer: Record<sentenceId, string[]> where string[] is user-ordered parts
  const userOrders = (answer as Record<string, string[]> | undefined) || {};

  // Deterministic shuffle based on block id + sentence id
  const getShuffledParts = (sentenceId: string, parts: string[]): string[] => {
    const arr = [...parts];
    let seed = 0;
    const combined = block.id + sentenceId;
    for (let i = 0; i < combined.length; i++) {
      seed = ((seed << 5) - seed + combined.charCodeAt(i)) | 0;
    }
    for (let i = arr.length - 1; i > 0; i--) {
      seed = (seed * 16807 + 0) % 2147483647;
      const j = Math.abs(seed) % (i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // Initialize user orders if empty
  React.useEffect(() => {
    if (interactive) {
      const needsInit = block.sentences.some((s) => !userOrders[s.id]);
      if (needsInit) {
        const newOrders: Record<string, string[]> = { ...userOrders };
        for (const s of block.sentences) {
          if (!newOrders[s.id]) {
            const parts = s.sentence.split(" | ").map((p) => p.trim());
            newOrders[s.id] = getShuffledParts(s.id, parts);
          }
        }
        onAnswer(newOrders);
      }
    }
  }, [interactive, block.sentences.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const movePart = (
    sentenceId: string,
    currentIndex: number,
    direction: -1 | 1
  ) => {
    if (showResults) return;
    const order = [...(userOrders[sentenceId] || [])];
    const newIndex = currentIndex + direction;
    if (newIndex < 0 || newIndex >= order.length) return;
    [order[currentIndex], order[newIndex]] = [
      order[newIndex],
      order[currentIndex],
    ];
    onAnswer({ ...userOrders, [sentenceId]: order });
  };

  return (
    <div className="space-y-2">
      {block.instruction && (
        <p className="font-medium">{block.instruction}</p>
      )}
      <div>
        {block.sentences.map((item, i) => {
          const correctParts = item.sentence.split(" | ").map((p) => p.trim());
          const displayParts = interactive
            ? userOrders[item.id] || getShuffledParts(item.id, correctParts)
            : getShuffledParts(item.id, correctParts);
          const isFullyCorrect =
            showResults &&
            displayParts.length === correctParts.length &&
            displayParts.every((p, idx) => p === correctParts[idx]);

          return (
            <div
              key={item.id}
              className={`py-2 transition-colors ${isPrint ? '' : 'border-b last:border-b-0'} ${
                showResults
                  ? isFullyCorrect
                    ? "bg-green-50"
                    : "bg-red-50"
                  : ""
              }`}
            >
              <div className="flex items-start gap-3">
                <span style={{ width: 20, height: 20, minWidth: 20, fontSize: 9, lineHeight: '20px', borderRadius: 4, textAlign: 'center', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginTop: 4 }} className="font-bold text-muted-foreground bg-muted shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex-1">
                  <div className="flex flex-wrap gap-1.5">
                    {displayParts.map((part, pi) => (
                      <div key={pi} className="flex items-center gap-0.5">
                        {interactive && !showResults && (
                          <div className="flex flex-col gap-0">
                            <button
                              className="p-0 hover:bg-muted rounded disabled:opacity-30"
                              onClick={() => movePart(item.id, pi, -1)}
                              disabled={pi === 0}
                              aria-label={t("moveUp")}
                            >
                              <svg
                                className="h-3 w-3"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path d="M15 18l-6-6 6-6" />
                              </svg>
                            </button>
                            <button
                              className="p-0 hover:bg-muted rounded disabled:opacity-30"
                              onClick={() => movePart(item.id, pi, 1)}
                              disabled={pi === displayParts.length - 1}
                              aria-label={t("moveDown")}
                            >
                              <svg
                                className="h-3 w-3"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path d="M9 6l6 6-6 6" />
                              </svg>
                            </button>
                          </div>
                        )}
                        <span
                          className={`px-2.5 py-1 rounded border text-sm font-medium ${
                            showResults
                              ? part === correctParts[pi]
                                ? "bg-green-100 border-green-300 text-green-800"
                                : "bg-red-100 border-red-300 text-red-800"
                              : "bg-muted border-border"
                          }`}
                        >
                          {part}
                        </span>
                      </div>
                    ))}
                  </div>
                  {isPrint && (
                    <div className="mt-2" style={{ height: '1.8em', borderBottom: '1px dashed var(--color-muted-foreground)', opacity: 0.3 }} />
                  )}
                  {showResults && !isFullyCorrect && (
                    <p className="text-xs text-green-600 mt-2">
                      {correctParts.join(" ")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {showResults && (
        <p className="text-xs text-muted-foreground">
          {t("resultCount", {
            correct: block.sentences.filter((s) => {
              const correctParts = s.sentence.split(" | ").map((p) => p.trim());
              const userParts = userOrders[s.id] || [];
              return (
                userParts.length === correctParts.length &&
                userParts.every((p, idx) => p === correctParts[idx])
              );
            }).length,
            total: block.sentences.length,
          })}
        </p>
      )}
    </div>
  );
}

// ─── Verb Table View ────────────────────────────────────────
function VerbTableView({
  block,
  mode,
  interactive,
  answer,
  onAnswer,
  showResults,
  primaryColor = "#1a1a1a",
}: {
  block: VerbTableBlock;
  mode: ViewMode;
  interactive: boolean;
  answer: unknown;
  onAnswer: (value: unknown) => void;
  showResults: boolean;
  primaryColor?: string;
}) {
  const t = useTranslations("viewer");
  const userAnswers = (answer as Record<string, string> | undefined) || {};
  const isSplit = block.splitConjugation ?? false;
  const showGlobal = block.showConjugations ?? false;
  const isPrint = mode === "print";

  const shouldShowAnswer = (override: "show" | "hide" | null | undefined): boolean => {
    if (override === "show") return true;
    if (override === "hide") return false;
    return showGlobal;
  };

  const handleChange = (rowId: string, field: string, value: string) => {
    if (!interactive || showResults) return;
    onAnswer({ ...userAnswers, [`${rowId}_${field}`]: value });
  };

  const renderRow = (row: VerbTableBlock["singularRows"][0]) => {
    const showConj1 = shouldShowAnswer(row.showOverride);
    const showConj2 = shouldShowAnswer(row.showOverride2);
    const userVal = isSplit
      ? userAnswers[`${row.id}_conjugation`] || ""
      : userAnswers[row.id] || userAnswers[`${row.id}_conjugation`] || "";
    const userVal2 = userAnswers[`${row.id}_conjugation2`] || "";
    const isCorrect = showResults && userVal.trim().toLowerCase() === row.conjugation.trim().toLowerCase();
    const isWrong = showResults && userVal.trim() !== "" && !isCorrect;
    const isCorrect2 = showResults && isSplit && userVal2.trim().toLowerCase() === (row.conjugation2 || "").trim().toLowerCase();
    const isWrong2 = showResults && isSplit && userVal2.trim() !== "" && !isCorrect2;

    return (
      <div key={row.id} className="flex items-center gap-3 py-2 border-b last:border-b-0">
        {/* Person */}
        <span
          className="text-muted-foreground uppercase shrink-0"
          style={{ fontSize: '0.7em', width: '15%' }}
        >
          {row.person}
        </span>
        {/* Detail (formell/informell) */}
        <span
          className="text-muted-foreground shrink-0"
          style={{ fontSize: '0.7em', width: '15%' }}
        >
          {row.detail || ""}
        </span>
        {/* Pronoun */}
        <span className="font-bold shrink-0" style={{ width: '15%' }}>
          {row.pronoun}
        </span>
        {/* Conjugation 1 */}
        <span style={{ width: isSplit ? '27.5%' : '55%' }}>
          {showConj1 ? (
            <span className="font-bold" style={{ color: primaryColor }}>{row.conjugation}</span>
          ) : interactive ? (
            <span>
              <input
                type="text"
                value={userVal}
                onChange={(e) => handleChange(row.id, "conjugation", e.target.value)}
                disabled={showResults}
                className={`w-full border rounded px-2 py-1 outline-none ${
                  showResults
                    ? isCorrect
                      ? "border-green-500 bg-green-50 text-green-700"
                      : isWrong
                        ? "border-red-500 bg-red-50 text-red-700"
                        : "border-border"
                    : "border-border focus:border-primary"
                }`}
                placeholder="…"
              />
              {showResults && isWrong && (
                <span className="text-xs text-green-600 mt-0.5 block">{row.conjugation}</span>
              )}
            </span>
          ) : (
            <span
              className="bg-gray-100 rounded"
              style={{ display: 'inline-block', verticalAlign: 'text-bottom', height: '1.3em', minWidth: '80px' }}
            >
              &nbsp;
            </span>
          )}
        </span>
        {/* Conjugation 2 (split) */}
        {isSplit && (
          <span style={{ width: '27.5%' }}>
            {showConj2 ? (
              <span className="font-bold" style={{ color: primaryColor }}>{row.conjugation2}</span>
            ) : interactive ? (
              <span>
                <input
                  type="text"
                  value={userVal2}
                  onChange={(e) => handleChange(row.id, "conjugation2", e.target.value)}
                  disabled={showResults}
                  className={`w-full border rounded px-2 py-1 outline-none ${
                    showResults
                      ? isCorrect2
                        ? "border-green-500 bg-green-50 text-green-700"
                        : isWrong2
                          ? "border-red-500 bg-red-50 text-red-700"
                          : "border-border"
                      : "border-border focus:border-primary"
                  }`}
                  placeholder="…"
                />
                {showResults && isWrong2 && (
                  <span className="text-xs text-green-600 mt-0.5 block">{row.conjugation2}</span>
                )}
              </span>
            ) : (
              <span
                className="bg-gray-100 rounded"
                style={{ display: 'inline-block', verticalAlign: 'text-bottom', height: '1.3em', minWidth: '80px' }}
              >
                &nbsp;
              </span>
            )}
          </span>
        )}
      </div>
    );
  };

  const allRows = [...block.singularRows, ...block.pluralRows];
  const correctCount = showResults
    ? allRows.reduce((count, r) => {
        const key1 = isSplit ? `${r.id}_conjugation` : r.id;
        const val1 = (userAnswers[key1] || userAnswers[`${r.id}_conjugation`] || "").trim().toLowerCase();
        let c = val1 === r.conjugation.trim().toLowerCase() ? 1 : 0;
        if (isSplit) {
          const val2 = (userAnswers[`${r.id}_conjugation2`] || "").trim().toLowerCase();
          if (val2 === (r.conjugation2 || "").trim().toLowerCase()) c += 1;
        }
        return count + c;
      }, 0)
    : 0;
  const totalCount = isSplit ? allRows.length * 2 : allRows.length;

  return (
    <div>
      {block.verb && (
        <div className="font-bold py-2 border-b" style={{ color: primaryColor, borderColor: primaryColor }}>
          {block.verb}
        </div>
      )}
      <div>
        {/* Singular */}
        <div className="text-muted-foreground font-bold uppercase border-b border-border py-2 flex items-center">
          Singular
        </div>
        {block.singularRows.map((row) => renderRow(row))}
        {/* Plural */}
        <div className="text-muted-foreground font-bold uppercase border-b border-border py-2 flex items-center">
          Plural
        </div>
        {block.pluralRows.map((row) => renderRow(row))}
      </div>
      {showResults && (
        <p className="text-xs text-muted-foreground mt-2">
          {t("resultCount", { correct: correctCount, total: totalCount })}
        </p>
      )}
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
  primaryColor = "#1a1a1a",
}: {
  block: WorksheetBlock;
  mode: ViewMode;
  answer?: unknown;
  onAnswer?: (value: unknown) => void;
  showResults?: boolean;
  primaryColor?: string;
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
    case "image-cards":
      return <ImageCardsView block={block} />;
    case "text-cards":
      return <TextCardsView block={block} />;
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
    case "glossary":
      return (
        <GlossaryView
          block={block}
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
    case "article-training":
      return (
        <ArticleTrainingView
          block={block}
          interactive={interactive}
          answer={answer}
          onAnswer={onAnswer || noop}
          showResults={showResults}
        />
      );
    case "order-items":
      return (
        <OrderItemsView
          block={block}
          interactive={interactive}
          answer={answer}
          onAnswer={onAnswer || noop}
          showResults={showResults}
        />
      );
    case "inline-choices":
      return (
        <InlineChoicesView
          block={block}
          interactive={interactive}
          answer={answer}
          onAnswer={onAnswer || noop}
          showResults={showResults}
        />
      );
    case "word-search":
      return (
        <WordSearchView
          block={block}
          mode={mode}
          interactive={interactive}
          answer={answer}
          onAnswer={onAnswer || noop}
        />
      );
    case "sorting-categories":
      return (
        <SortingCategoriesView
          block={block}
          interactive={interactive}
          answer={answer ?? undefined}
          onAnswer={onAnswer || noop}
          showResults={showResults}
        />
      );
    case "unscramble-words":
      return (
        <UnscrambleWordsView
          block={block}
          mode={mode}
          interactive={interactive}
          answer={answer}
          onAnswer={onAnswer || noop}
          showResults={showResults}
        />
      );
    case "fix-sentences":
      return (
        <FixSentencesView
          block={block}
          mode={mode}
          interactive={interactive}
          answer={answer}
          onAnswer={onAnswer || noop}
          showResults={showResults}
        />
      );
    case "verb-table":
      return (
        <VerbTableView
          block={block}
          mode={mode}
          interactive={interactive}
          answer={answer}
          onAnswer={onAnswer || noop}
          showResults={showResults}
          primaryColor={primaryColor}
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
          primaryColor={primaryColor}
        />
      );
    default:
      return null;
  }
}
