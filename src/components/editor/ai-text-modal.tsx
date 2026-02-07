"use client";

import React, { useState } from "react";
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
import {
  Sparkles, ChevronRight, ChevronLeft, Loader2, Check,
  User, Users,
} from "lucide-react";

type Step = "topic" | "text-type" | "level" | "address" | "generating" | "done";
type ReaderAddress = "direkt-sie" | "neutral-man";

const TEXT_TYPES = [
  { value: "Sachtext", label: "Expository", desc: "Informational text" },
  { value: "Nachricht", label: "News", desc: "Short news report" },
  { value: "Bericht", label: "Report", desc: "Detailed account" },
  { value: "Porträt", label: "Portrait", desc: "Person profile" },
  { value: "Interview", label: "Interview", desc: "Q & A format" },
  { value: "Kommentar", label: "Commentary", desc: "Opinion piece (B1+)" },
  { value: "Blog", label: "Blog", desc: "Personal blog post" },
  { value: "Erzählung", label: "Narrative", desc: "Storytelling" },
  { value: "Dialog", label: "Dialogue", desc: "Conversation" },
];

const LEVELS = [
  { value: "A1.1", label: "A1.1", desc: "90–140 words, 3 paragraphs", color: "bg-green-100 text-green-800 border-green-300" },
  { value: "A1.2", label: "A1.2", desc: "130–180 words, 3–4 paragraphs", color: "bg-green-100 text-green-800 border-green-300" },
  { value: "A2.1", label: "A2.1", desc: "170–240 words, 4 paragraphs", color: "bg-blue-100 text-blue-800 border-blue-300" },
  { value: "A2.2", label: "A2.2", desc: "220–320 words, 4–5 paragraphs", color: "bg-blue-100 text-blue-800 border-blue-300" },
  { value: "B1.1", label: "B1.1", desc: "300–420 words, 5 paragraphs", color: "bg-amber-100 text-amber-800 border-amber-300" },
  { value: "B1.2", label: "B1.2", desc: "380–520 words, 5–6 paragraphs", color: "bg-amber-100 text-amber-800 border-amber-300" },
];

interface GeneratedText {
  titel: string;
  teaser: string;
  absaetze: string[];
  glossar: { lemma: string; erklaerung: string }[];
}

export function AiTextModal({
  open,
  onOpenChange,
  blockId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blockId: string;
}) {
  const { dispatch } = useEditor();
  const [step, setStep] = useState<Step>("topic");
  const [topic, setTopic] = useState("");
  const [textType, setTextType] = useState<string | null>(null);
  const [level, setLevel] = useState<string | null>(null);
  const [address, setAddress] = useState<ReaderAddress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GeneratedText | null>(null);

  const reset = () => {
    setStep("topic");
    setTopic("");
    setTextType(null);
    setLevel(null);
    setAddress(null);
    setError(null);
    setResult(null);
  };

  const handleClose = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

  const handleGenerate = async () => {
    setStep("generating");
    setError(null);
    try {
      const res = await fetch("/api/ai/generate-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thema: topic,
          textsorte: textType,
          niveau: level,
          leseransprache: address,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Generation failed");
      }
      setResult(data);
      setStep("done");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Generation failed");
      setStep("address");
    }
  };

  const handleApply = () => {
    if (!result) return;

    // Build HTML content from the structured response
    const parts: string[] = [];
    // Title as h2
    parts.push(`<h2>${result.titel}</h2>`);
    // Teaser as italic paragraph
    parts.push(`<p><em>${result.teaser}</em></p>`);
    // Body paragraphs
    for (const absatz of result.absaetze) {
      parts.push(`<p>${absatz}</p>`);
    }
    // Glossar as a mini section
    if (result.glossar.length > 0) {
      parts.push(`<hr>`);
      parts.push(`<p><strong>Glossar</strong></p>`);
      const glossarItems = result.glossar
        .map((g) => `<strong>${g.lemma}</strong> – ${g.erklaerung}`)
        .join("<br>");
      parts.push(`<p>${glossarItems}</p>`);
    }

    const html = parts.join("");

    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: blockId,
        updates: { content: html },
      },
    });
    handleClose(false);
  };

  const canProceedFromTopic = topic.trim().length >= 2;
  const canProceedFromTextType = textType !== null;
  const canProceedFromLevel = level !== null;
  const canProceedFromAddress = address !== null;

  const stepLabels = ["Topic", "Text Type", "Level", "Address", "Result"];
  const stepOrder: Step[] = ["topic", "text-type", "level", "address", "done"];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            AI Generate Reading Text
          </DialogTitle>
          <DialogDescription>
            {step === "topic" && "What topic should the text cover?"}
            {step === "text-type" && "Which text type should be generated?"}
            {step === "level" && "What language level should the text target?"}
            {step === "address" && "How should the reader be addressed?"}
            {step === "generating" && "Generating text…"}
            {step === "done" && "Review and apply the generated text."}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        {step !== "generating" && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground px-1">
            {stepLabels.map((label, i) => {
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
          {/* ─── Step 1: Topic ─── */}
          {step === "topic" && (
            <div className="space-y-3 py-2">
              <div className="space-y-2">
                <Label htmlFor="topic" className="text-sm">Topic</Label>
                <Input
                  id="topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. hospital admission, library, apartment search…"
                  autoFocus
                />
                <p className="text-[10px] text-muted-foreground">
                  Keyword or short description of the topic
                </p>
              </div>
            </div>
          )}

          {/* ─── Step 2: Text Type ─── */}
          {step === "text-type" && (
            <div className="grid grid-cols-3 gap-2">
              {TEXT_TYPES.map((tt) => (
                <button
                  key={tt.value}
                  type="button"
                  onClick={() => setTextType(tt.value)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all hover:shadow-sm text-center
                    ${textType === tt.value ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40"}`}
                >
                  <p className="font-medium text-xs">{tt.label}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">{tt.desc}</p>
                </button>
              ))}
            </div>
          )}

          {/* ─── Step 3: Level ─── */}
          {step === "level" && (
            <div className="grid grid-cols-2 gap-2">
              {LEVELS.map((lv) => (
                <button
                  key={lv.value}
                  type="button"
                  onClick={() => setLevel(lv.value)}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all hover:shadow-sm
                    ${level === lv.value ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40"}`}
                >
                  <span className={`px-2 py-1 rounded text-xs font-bold border ${lv.color}`}>
                    {lv.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{lv.desc}</span>
                </button>
              ))}
            </div>
          )}

          {/* ─── Step 4: Reader Address ─── */}
          {step === "address" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAddress("direkt-sie")}
                  className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all hover:shadow-sm
                    ${address === "direkt-sie" ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40"}`}
                >
                  <User className="h-8 w-8 text-primary/70" />
                  <div className="text-center">
                    <p className="font-medium text-sm">Direct (Sie)</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      «Sie können…», «Bringen Sie…»
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setAddress("neutral-man")}
                  className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all hover:shadow-sm
                    ${address === "neutral-man" ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40"}`}
                >
                  <Users className="h-8 w-8 text-primary/70" />
                  <div className="text-center">
                    <p className="font-medium text-sm">Neutral (man)</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      «Man kann…», «Man bringt…»
                    </p>
                  </div>
                </button>
              </div>
              {error && (
                <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">
                  {error}
                </div>
              )}
              {/* Summary of choices */}
              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                <p className="text-[10px] font-medium text-muted-foreground">Summary</p>
                <div className="flex flex-wrap gap-2">
                  <span className="text-[10px] bg-background border rounded px-2 py-0.5">Topic: {topic}</span>
                  <span className="text-[10px] bg-background border rounded px-2 py-0.5">Type: {textType}</span>
                  <span className="text-[10px] bg-background border rounded px-2 py-0.5">Level: {level}</span>
                </div>
              </div>
            </div>
          )}

          {/* ─── Generating ─── */}
          {step === "generating" && (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
              <p className="text-sm text-muted-foreground">Generating text at level {level}…</p>
              <p className="text-[10px] text-muted-foreground">This may take a few seconds.</p>
            </div>
          )}

          {/* ─── Done — review ─── */}
          {step === "done" && result && (
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
              {/* Title & teaser */}
              <div>
                <h3 className="text-base font-bold">{result.titel}</h3>
                <p className="text-sm text-muted-foreground italic">{result.teaser}</p>
              </div>
              {/* Body paragraphs */}
              <div className="space-y-2 text-sm leading-relaxed">
                {result.absaetze.map((abs, i) => (
                  <p key={i}>{abs}</p>
                ))}
              </div>
              {/* Glossar */}
              {result.glossar.length > 0 && (
                <div className="border-t pt-2 mt-2">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Glossary</p>
                  <div className="grid grid-cols-1 gap-1">
                    {result.glossar.map((g, i) => (
                      <p key={i} className="text-xs">
                        <strong>{g.lemma}</strong> – <span className="text-muted-foreground">{g.erklaerung}</span>
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          {/* Back button */}
          <div>
            {step === "text-type" && (
              <Button variant="ghost" size="sm" onClick={() => setStep("topic")}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            )}
            {step === "level" && (
              <Button variant="ghost" size="sm" onClick={() => setStep("text-type")}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            )}
            {step === "address" && (
              <Button variant="ghost" size="sm" onClick={() => setStep("level")}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            )}
            {step === "done" && (
              <Button variant="ghost" size="sm" onClick={() => setStep("address")}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Regenerate
              </Button>
            )}
          </div>

          {/* Forward button */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleClose(false)}>
              Cancel
            </Button>

            {step === "topic" && (
              <Button
                size="sm"
                disabled={!canProceedFromTopic}
                onClick={() => setStep("text-type")}
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}

            {step === "text-type" && (
              <Button
                size="sm"
                disabled={!canProceedFromTextType}
                onClick={() => setStep("level")}
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}

            {step === "level" && (
              <Button
                size="sm"
                disabled={!canProceedFromLevel}
                onClick={() => setStep("address")}
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}

            {step === "address" && (
              <Button
                size="sm"
                disabled={!canProceedFromAddress}
                onClick={handleGenerate}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Sparkles className="h-4 w-4 mr-1" /> Generate
              </Button>
            )}

            {step === "done" && (
              <Button size="sm" onClick={handleApply} className="bg-purple-600 hover:bg-purple-700">
                <Check className="h-4 w-4 mr-1" /> Apply
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
