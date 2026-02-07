"use client";

import React, { useState, useMemo } from "react";
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
import { Sparkles, FileText, PenTool, ChevronRight, ChevronLeft, Loader2, Check, Quote, Repeat, ArrowDownNarrowWide, Shuffle } from "lucide-react";

type Step = "source" | "select-blocks" | "enter-context" | "style" | "order" | "count" | "generating" | "done";
type StatementStyle = "verbatim" | "paraphrased";
type StatementOrder = "chronological" | "mixed";

interface GeneratedStatement {
  text: string;
  correctAnswer: boolean;
}

/** Extract plain text from a block for AI context */
function extractBlockText(block: WorksheetBlock): string {
  switch (block.type) {
    case "heading":
      return block.content;
    case "text": {
      // Strip HTML tags to get plain text
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

export function AiTrueFalseModal({
  open,
  onOpenChange,
  blockId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blockId: string;
}) {
  const { state, dispatch } = useEditor();
  const [step, setStep] = useState<Step>("source");
  const [useExisting, setUseExisting] = useState<boolean | null>(null);
  const [selectedBlockIds, setSelectedBlockIds] = useState<string[]>([]);
  const [customContext, setCustomContext] = useState("");
  const [style, setStyle] = useState<StatementStyle | null>(null);
  const [order, setOrder] = useState<StatementOrder | null>(null);
  const [count, setCount] = useState(5);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<GeneratedStatement[]>([]);

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
    setCount(5);
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
      const res = await fetch("/api/ai/generate-true-false", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: contextText, count, style: style || "paraphrased", order: order || "mixed" }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Generation failed");
      }
      setResults(data.statements);
      setStep("done");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Generation failed");
      setStep("count"); // go back to count step so they can retry
    }
  };

  const handleApply = () => {
    // Apply generated statements to the block
    const statements = results.map((s) => ({
      id: crypto.randomUUID(),
      text: s.text,
      correctAnswer: s.correctAnswer,
    }));
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: blockId,
        updates: { statements },
      },
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
            AI Generate Statements
          </DialogTitle>
          <DialogDescription>
            {step === "source" && "Choose the source for generating true/false statements."}
            {step === "select-blocks" && "Select text blocks to base statements on."}
            {step === "enter-context" && "Paste or type the context for generating statements."}
            {step === "style" && "Should statements use wording from the text or be rephrased?"}
            {step === "order" && "Should statements follow the order of the source text?"}
            {step === "count" && "How many statements should be generated?"}
            {step === "generating" && "Generating statements…"}
            {step === "done" && "Review generated statements before applying."}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        {step !== "generating" && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground px-1">
            {["Source", useExisting ? "Blocks" : "Context", "Style", "Order", "Count", "Generate"].map((label, i) => {
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
                  <p className="font-medium text-sm">From worksheet</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Use existing text blocks
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
                  <p className="font-medium text-sm">Custom context</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Paste your own text
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
                  No text blocks found on the worksheet. Go back and choose custom context.
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
              <Label className="text-xs">Context text</Label>
              <textarea
                className="w-full border rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors min-h-[180px]"
                placeholder="Paste the text or topic that statements should be based on…"
                value={customContext}
                onChange={(e) => setCustomContext(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">
                {customContext.trim().length} characters — minimum 10 required
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
                  <p className="font-medium text-sm">Verbatim</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Use wording directly from the text
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
                  <p className="font-medium text-sm">Paraphrased</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Rephrase in different words
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
                  <p className="font-medium text-sm">Chronological</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Follow the order of the source text
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
                  <p className="font-medium text-sm">Mixed</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Randomize the order
                  </p>
                </div>
              </button>
            </div>
          )}

          {/* ─── Step 5: Count ─── */}
          {step === "count" && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="count" className="text-sm">Number of statements</Label>
                <Input
                  id="count"
                  type="number"
                  min={1}
                  max={20}
                  value={count}
                  onChange={(e) => setCount(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                  className="w-32"
                />
                <p className="text-[10px] text-muted-foreground">Between 1 and 20 statements</p>
              </div>
              {error && (
                <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">
                  {error}
                </div>
              )}
              {contextText && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-[10px] font-medium text-muted-foreground mb-1">Context preview</p>
                  <p className="text-xs text-muted-foreground line-clamp-3">{contextText}</p>
                </div>
              )}
            </div>
          )}

          {/* ─── Generating ─── */}
          {step === "generating" && (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
              <p className="text-sm text-muted-foreground">Generating {count} statements…</p>
            </div>
          )}

          {/* ─── Done — review ─── */}
          {step === "done" && (
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {results.map((s, i) => (
                <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg border border-border">
                  <span className={`mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0
                    ${s.correctAnswer ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {s.correctAnswer ? "T" : "F"}
                  </span>
                  <span className="text-sm">{s.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          {/* Back button */}
          <div>
            {(step === "select-blocks" || step === "enter-context") && (
              <Button variant="ghost" size="sm" onClick={() => setStep("source")}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            )}
            {step === "style" && (
              <Button variant="ghost" size="sm" onClick={() => setStep(useExisting ? "select-blocks" : "enter-context")}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            )}
            {step === "order" && (
              <Button variant="ghost" size="sm" onClick={() => setStep("style")}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            )}
            {step === "count" && (
              <Button variant="ghost" size="sm" onClick={() => setStep("order")}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            )}
            {step === "done" && (
              <Button variant="ghost" size="sm" onClick={() => setStep("count")}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Regenerate
              </Button>
            )}
          </div>

          {/* Forward button */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleClose(false)}>
              Cancel
            </Button>

            {step === "source" && (
              <Button
                size="sm"
                disabled={!canProceedFromSource}
                onClick={() => setStep(useExisting ? "select-blocks" : "enter-context")}
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}

            {step === "select-blocks" && (
              <Button
                size="sm"
                disabled={!canProceedFromBlocks}
                onClick={() => setStep("style")}
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}

            {step === "enter-context" && (
              <Button
                size="sm"
                disabled={!canProceedFromContext}
                onClick={() => setStep("style")}
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}

            {step === "style" && (
              <Button
                size="sm"
                disabled={!canProceedFromStyle}
                onClick={() => setStep("order")}
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}

            {step === "order" && (
              <Button
                size="sm"
                disabled={!canProceedFromOrder}
                onClick={() => setStep("count")}
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}

            {step === "count" && (
              <Button size="sm" onClick={handleGenerate} className="bg-purple-600 hover:bg-purple-700">
                <Sparkles className="h-4 w-4 mr-1" /> Generate
              </Button>
            )}

            {step === "done" && (
              <Button size="sm" onClick={handleApply} className="bg-purple-600 hover:bg-purple-700">
                <Check className="h-4 w-4 mr-1" /> Apply to block
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
