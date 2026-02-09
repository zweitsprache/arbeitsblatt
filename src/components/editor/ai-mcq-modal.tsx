"use client";

import React, { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { authFetch } from "@/lib/auth-fetch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useEditor } from "@/store/editor-store";
import { WorksheetBlock } from "@/types/worksheet";
import {
  Sparkles, FileText, PenTool, ChevronRight, ChevronLeft, Loader2, Check,
  Quote, Repeat, ArrowDownNarrowWide, Shuffle,
} from "lucide-react";

type Step = "source" | "select-blocks" | "enter-context" | "style" | "order" | "count" | "generating" | "done";
type StatementStyle = "verbatim" | "paraphrased";
type StatementOrder = "chronological" | "mixed";

interface GeneratedQuestion {
  question: string;
  options: { text: string; isCorrect: boolean }[];
}

/** Extract plain text from a block for AI context */
function extractBlockText(block: WorksheetBlock): string {
  switch (block.type) {
    case "heading":
      return block.content;
    case "text": {
      const tmp = block.content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      return tmp;
    }
    case "columns":
      return block.children
        .flat()
        .map(extractBlockText)
        .filter(Boolean)
        .join("\n");
    default:
      return "";
  }
}

export function AiMcqModal({
  open,
  onOpenChange,
  blockId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blockId: string;
}) {
  const { state, dispatch } = useEditor();
  const t = useTranslations("aiMcq");
  const tc = useTranslations("common");
  const tTf = useTranslations("aiTrueFalse");
  const [step, setStep] = useState<Step>("source");
  const [useExisting, setUseExisting] = useState<boolean | null>(null);
  const [selectedBlockIds, setSelectedBlockIds] = useState<string[]>([]);
  const [customContext, setCustomContext] = useState("");
  const [style, setStyle] = useState<StatementStyle | null>(null);
  const [order, setOrder] = useState<StatementOrder | null>(null);
  const [count, setCount] = useState(3);
  const [optionsPerQuestion, setOptionsPerQuestion] = useState(4);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<GeneratedQuestion[]>([]);

  // Find text-bearing blocks on the worksheet
  const textBlocks = useMemo(() => {
    const found: { id: string; label: string; preview: string }[] = [];
    const scan = (blocks: WorksheetBlock[]) => {
      for (const b of blocks) {
        if (b.type === "heading" || b.type === "text") {
          const text = extractBlockText(b);
          if (text.length > 0) {
            found.push({
              id: b.id,
              label: b.type === "heading" ? `Heading: ${text.slice(0, 60)}` : `Text: ${text.slice(0, 60)}`,
              preview: text.slice(0, 120) + (text.length > 120 ? "…" : ""),
            });
          }
        }
        if (b.type === "columns") {
          for (const col of b.children) {
            scan(col);
          }
        }
      }
    };
    scan(state.blocks);
    return found;
  }, [state.blocks]);

  // Gather context text from selections
  const contextText = useMemo(() => {
    if (useExisting) {
      return selectedBlockIds
        .map((id) => {
          const findBlock = (blocks: WorksheetBlock[]): WorksheetBlock | undefined => {
            for (const b of blocks) {
              if (b.id === id) return b;
              if (b.type === "columns") {
                for (const col of b.children) {
                  const f = findBlock(col);
                  if (f) return f;
                }
              }
            }
            return undefined;
          };
          const b = findBlock(state.blocks);
          return b ? extractBlockText(b) : "";
        })
        .filter(Boolean)
        .join("\n\n");
    }
    return customContext;
  }, [useExisting, selectedBlockIds, customContext, state.blocks]);

  const reset = () => {
    setStep("source");
    setUseExisting(null);
    setSelectedBlockIds([]);
    setCustomContext("");
    setStyle(null);
    setOrder(null);
    setCount(3);
    setOptionsPerQuestion(4);
    setError(null);
    setResults([]);
  };

  const handleClose = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

  const handleGenerate = async () => {
    setStep("generating");
    setError(null);
    try {
      const res = await authFetch("/api/ai/generate-mcq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: contextText,
          count,
          optionsPerQuestion,
          style: style || "paraphrased",
          order: order || "mixed",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || tc("generationFailed"));
      }
      setResults(data.questions);
      setStep("done");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : tc("generationFailed"));
      setStep("count");
    }
  };

  const handleApply = () => {
    // For MCQ, each generated question becomes its own MCQ block
    // The first one replaces the current block, additional ones are added after it
    const currentBlockIndex = state.blocks.findIndex((b) => b.id === blockId);

    results.forEach((q, i) => {
      const options = q.options.map((o) => ({
        id: crypto.randomUUID(),
        text: o.text,
        isCorrect: o.isCorrect,
      }));

      if (i === 0) {
        // Update existing block
        dispatch({
          type: "UPDATE_BLOCK",
          payload: {
            id: blockId,
            updates: {
              question: q.question,
              options,
              allowMultiple: false,
            },
          },
        });
      } else {
        // Add new MCQ blocks after the current one
        dispatch({
          type: "ADD_BLOCK",
          payload: {
            block: {
              id: crypto.randomUUID(),
              type: "multiple-choice",
              visibility: "both",
              question: q.question,
              options,
              allowMultiple: false,
            },
            index: currentBlockIndex + i,
          },
        });
      }
    });

    handleClose(false);
  };

  const toggleBlockSelection = (id: string) => {
    setSelectedBlockIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const canProceedFromSource = useExisting !== null;
  const canProceedFromBlocks = selectedBlockIds.length > 0;
  const canProceedFromContext = customContext.trim().length > 10;
  const canProceedFromStyle = style !== null;
  const canProceedFromOrder = order !== null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            {t("title")}
          </DialogTitle>
          <DialogDescription>
            {step === "source" && t("stepSourceDesc")}
            {step === "select-blocks" && t("stepBlocksDesc")}
            {step === "enter-context" && t("stepContextDesc")}
            {step === "style" && t("stepStyleDesc")}
            {step === "order" && t("stepOrderDesc")}
            {step === "count" && t("stepCountDesc")}
            {step === "generating" && t("stepGeneratingDesc")}
            {step === "done" && t("stepReviewDesc")}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        {step !== "generating" && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground px-1">
            {[tTf("stepSource"), useExisting ? tTf("stepBlocks") : tTf("stepContext"), tTf("stepStyle"), tTf("stepOrder"), tTf("stepCount"), tTf("stepGenerate")].map((label, i) => {
              const stepOrder: Step[] = ["source", useExisting ? "select-blocks" : "enter-context", "style", "order", "count", "done"];
              const currentIdx = stepOrder.indexOf(step);
              const isActive = i <= currentIdx;
              return (
                <React.Fragment key={label}>
                  {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/50" />}
                  <span className={`${isActive ? "text-foreground font-medium" : ""}`}>{label}</span>
                </React.Fragment>
              );
            })}
          </div>
        )}

        <div className="min-h-[200px] flex flex-col gap-4 py-2">
          {/* ─── Step 1: Source ─── */}
          {step === "source" && (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setUseExisting(true)}
                className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all hover:shadow-sm
                  ${useExisting === true ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40"}`}
              >
                <FileText className="h-8 w-8 text-primary/70" />
                <div className="text-center">
                  <p className="font-medium text-sm">{tTf("fromWorksheet")}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {tTf("useExistingBlocks")}
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setUseExisting(false)}
                className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all hover:shadow-sm
                  ${useExisting === false ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40"}`}
              >
                <PenTool className="h-8 w-8 text-primary/70" />
                <div className="text-center">
                  <p className="font-medium text-sm">{tTf("customContext")}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {tTf("pasteYourText")}
                  </p>
                </div>
              </button>
            </div>
          )}

          {/* ─── Step 2a: Select existing blocks ─── */}
          {step === "select-blocks" && (
            <div className="space-y-2">
              {textBlocks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {tTf("noTextBlocks")}
                </p>
              ) : (
                <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
                  {textBlocks.map((tb) => {
                    const selected = selectedBlockIds.includes(tb.id);
                    return (
                      <button
                        key={tb.id}
                        type="button"
                        onClick={() => toggleBlockSelection(tb.id)}
                        className={`w-full text-left p-3 rounded-lg border transition-all
                          ${selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                      >
                        <div className="flex items-start gap-2">
                          <div className={`w-4 h-4 mt-0.5 rounded border-2 flex items-center justify-center shrink-0 transition-colors
                            ${selected ? "bg-primary border-primary" : "border-muted-foreground/30"}`}>
                            {selected && <Check className="h-3 w-3 text-primary-foreground" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-muted-foreground">{tb.label}</p>
                            <p className="text-xs text-muted-foreground/70 truncate">{tb.preview}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ─── Step 2b: Custom context ─── */}
          {step === "enter-context" && (
            <div className="space-y-2">
              <Label className="text-xs">{tTf("contextText")}</Label>
              <textarea
                className="w-full border rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors min-h-[180px]"
                placeholder={t("contextPlaceholder")}
                value={customContext}
                onChange={(e) => setCustomContext(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">
                {tTf("characterCount", { count: customContext.trim().length })}
              </p>
            </div>
          )}

          {/* ─── Step 3: Style ─── */}
          {step === "style" && (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStyle("verbatim")}
                className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all hover:shadow-sm
                  ${style === "verbatim" ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40"}`}
              >
                <Quote className="h-8 w-8 text-primary/70" />
                <div className="text-center">
                  <p className="font-medium text-sm">{tTf("verbatim")}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {tTf("verbatimDesc")}
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setStyle("paraphrased")}
                className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all hover:shadow-sm
                  ${style === "paraphrased" ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40"}`}
              >
                <Repeat className="h-8 w-8 text-primary/70" />
                <div className="text-center">
                  <p className="font-medium text-sm">{tTf("paraphrased")}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {tTf("paraphrasedDesc")}
                  </p>
                </div>
              </button>
            </div>
          )}

          {/* ─── Step 4: Order ─── */}
          {step === "order" && (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setOrder("chronological")}
                className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all hover:shadow-sm
                  ${order === "chronological" ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40"}`}
              >
                <ArrowDownNarrowWide className="h-8 w-8 text-primary/70" />
                <div className="text-center">
                  <p className="font-medium text-sm">{tTf("chronological")}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {tTf("chronologicalDesc")}
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setOrder("mixed")}
                className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all hover:shadow-sm
                  ${order === "mixed" ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40"}`}
              >
                <Shuffle className="h-8 w-8 text-primary/70" />
                <div className="text-center">
                  <p className="font-medium text-sm">{tTf("mixed")}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {tTf("mixedDesc")}
                  </p>
                </div>
              </button>
            </div>
          )}

          {/* ─── Step 5: Count ─── */}
          {step === "count" && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="mcq-count" className="text-sm">{t("numberOfQuestions")}</Label>
                <Input
                  id="mcq-count"
                  type="number"
                  min={1}
                  max={20}
                  value={count}
                  onChange={(e) => setCount(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                  className="w-32"
                />
                <p className="text-[10px] text-muted-foreground">{t("betweenQuestions")}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mcq-options" className="text-sm">{t("optionsPerQuestion")}</Label>
                <div className="flex gap-1">
                  {[2, 3, 4, 5, 6].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setOptionsPerQuestion(n)}
                      className={`h-9 w-9 rounded-md border text-sm font-medium transition-colors
                        ${optionsPerQuestion === n
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border hover:border-primary/40 text-muted-foreground hover:text-foreground"}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              {error && (
                <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">
                  {error}
                </div>
              )}
              {contextText && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-[10px] font-medium text-muted-foreground mb-1">{tTf("contextPreview")}</p>
                  <p className="text-xs text-muted-foreground line-clamp-3">{contextText}</p>
                </div>
              )}
            </div>
          )}

          {/* ─── Generating ─── */}
          {step === "generating" && (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
              <p className="text-sm text-muted-foreground">{t("generatingQuestions", { count })}</p>
            </div>
          )}

          {/* ─── Done — review ─── */}
          {step === "done" && (
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {results.map((q, qi) => (
                <div key={qi} className="rounded-lg border border-border p-3 space-y-1.5">
                  <p className="text-sm font-medium">{qi + 1}. {q.question}</p>
                  <div className="space-y-1 pl-3">
                    {q.options.map((o, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full border text-[10px] font-bold shrink-0
                          ${o.isCorrect ? "bg-green-500 border-green-500 text-white" : "border-muted-foreground/30 text-muted-foreground"}`}>
                          {o.isCorrect ? "✓" : String.fromCharCode(65 + oi)}
                        </span>
                        <span className={`text-xs ${o.isCorrect ? "font-medium" : "text-muted-foreground"}`}>{o.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {results.length > 1 && (
                <p className="text-[10px] text-muted-foreground">
                  {t("firstQuestionUpdate", { count: results.length - 1 })}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          {/* Back button */}
          <div>
            {(step === "select-blocks" || step === "enter-context") && (
              <Button variant="ghost" size="sm" onClick={() => setStep("source")}>
                <ChevronLeft className="h-4 w-4 mr-1" /> {tc("back")}
              </Button>
            )}
            {step === "style" && (
              <Button variant="ghost" size="sm" onClick={() => setStep(useExisting ? "select-blocks" : "enter-context")}>
                <ChevronLeft className="h-4 w-4 mr-1" /> {tc("back")}
              </Button>
            )}
            {step === "order" && (
              <Button variant="ghost" size="sm" onClick={() => setStep("style")}>
                <ChevronLeft className="h-4 w-4 mr-1" /> {tc("back")}
              </Button>
            )}
            {step === "count" && (
              <Button variant="ghost" size="sm" onClick={() => setStep("order")}>
                <ChevronLeft className="h-4 w-4 mr-1" /> {tc("back")}
              </Button>
            )}
            {step === "done" && (
              <Button variant="ghost" size="sm" onClick={() => setStep("count")}>
                <ChevronLeft className="h-4 w-4 mr-1" /> {tc("regenerate")}
              </Button>
            )}
          </div>

          {/* Forward button */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleClose(false)}>
              {tc("cancel")}
            </Button>

            {step === "source" && (
              <Button
                size="sm"
                disabled={!canProceedFromSource}
                onClick={() => setStep(useExisting ? "select-blocks" : "enter-context")}
              >
                {tc("next")} <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}

            {step === "select-blocks" && (
              <Button
                size="sm"
                disabled={!canProceedFromBlocks}
                onClick={() => setStep("style")}
              >
                {tc("next")} <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}

            {step === "enter-context" && (
              <Button
                size="sm"
                disabled={!canProceedFromContext}
                onClick={() => setStep("style")}
              >
                {tc("next")} <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}

            {step === "style" && (
              <Button
                size="sm"
                disabled={!canProceedFromStyle}
                onClick={() => setStep("order")}
              >
                {tc("next")} <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}

            {step === "order" && (
              <Button
                size="sm"
                disabled={!canProceedFromOrder}
                onClick={() => setStep("count")}
              >
                {tc("next")} <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}

            {step === "count" && (
              <Button size="sm" onClick={handleGenerate} className="bg-purple-600 hover:bg-purple-700">
                <Sparkles className="h-4 w-4 mr-1" /> {tc("generate")}
              </Button>
            )}

            {step === "done" && (
              <Button size="sm" onClick={handleApply} className="bg-purple-600 hover:bg-purple-700">
                <Check className="h-4 w-4 mr-1" /> {tTf("applyToBlock")}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
