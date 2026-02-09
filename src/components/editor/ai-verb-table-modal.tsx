"use client";

import React, { useState } from "react";
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
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Check,
} from "lucide-react";

type Step = "verb" | "tense" | "generating" | "done";
type Tense =
  | "praesens"
  | "praeteritum"
  | "perfekt"
  | "plusquamperfekt"
  | "futur1";

const TWO_PART_TENSES: Tense[] = ["perfekt", "plusquamperfekt"];

interface ConjugationRow {
  person: string;
  detail?: string;
  pronoun: string;
  conjugation: string;
  conjugation2?: string;
}

interface GenerateResult {
  verb: string;
  splitConjugation: boolean;
  singularRows: ConjugationRow[];
  pluralRows: ConjugationRow[];
}

const TENSE_OPTIONS: { value: Tense; labelKey: string; descKey: string }[] = [
  { value: "praesens", labelKey: "tensePraesens", descKey: "tensePraesensDesc" },
  { value: "praeteritum", labelKey: "tensePraeteritum", descKey: "tensePraeteritumDesc" },
  { value: "perfekt", labelKey: "tensePerfekt", descKey: "tensePerfektDesc" },
  { value: "plusquamperfekt", labelKey: "tensePlusquamperfekt", descKey: "tensePlusquamperfektDesc" },
  { value: "futur1", labelKey: "tenseFutur1", descKey: "tenseFutur1Desc" },
];

export function AiVerbTableModal({
  open,
  onOpenChange,
  blockId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blockId: string;
}) {
  const { dispatch } = useEditor();
  const t = useTranslations("aiVerbTable");
  const tc = useTranslations("common");
  const [step, setStep] = useState<Step>("verb");
  const [verb, setVerb] = useState("");
  const [tense, setTense] = useState<Tense | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResult | null>(null);

  const reset = () => {
    setStep("verb");
    setVerb("");
    setTense(null);
    setError(null);
    setResult(null);
  };

  const handleClose = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

  const handleGenerate = async () => {
    if (!tense) return;
    setStep("generating");
    setError(null);
    try {
      const res = await authFetch("/api/ai/generate-verb-table", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verb: verb.trim(), tense }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || tc("generationFailed"));
      }
      setResult(data);
      setStep("done");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : tc("generationFailed"));
      setStep("tense");
    }
  };

  const handleApply = () => {
    if (!result) return;
    const isSplit = result.splitConjugation;
    const singularRows = result.singularRows.map((r) => ({
      id: crypto.randomUUID(),
      person: r.person,
      detail: r.detail,
      pronoun: r.pronoun,
      conjugation: r.conjugation,
      ...(isSplit && r.conjugation2 ? { conjugation2: r.conjugation2 } : {}),
    }));
    const pluralRows = result.pluralRows.map((r) => ({
      id: crypto.randomUUID(),
      person: r.person,
      detail: r.detail,
      pronoun: r.pronoun,
      conjugation: r.conjugation,
      ...(isSplit && r.conjugation2 ? { conjugation2: r.conjugation2 } : {}),
    }));
    dispatch({
      type: "UPDATE_BLOCK",
      payload: {
        id: blockId,
        updates: {
          verb: result.verb,
          splitConjugation: isSplit,
          singularRows,
          pluralRows,
        },
      },
    });
    handleClose(false);
  };

  const canProceedFromVerb = verb.trim().length > 0;
  const canProceedFromTense = tense !== null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            {t("title")}
          </DialogTitle>
          <DialogDescription>
            {step === "verb" && t("stepVerbDesc")}
            {step === "tense" && t("stepTenseDesc")}
            {step === "generating" && t("stepGeneratingDesc")}
            {step === "done" && t("stepReviewDesc")}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        {step !== "generating" && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground px-1">
            {[t("stepVerb"), t("stepTense"), t("stepGenerate")].map(
              (label, i) => {
                const stepOrder: Step[] = ["verb", "tense", "done"];
                const currentIdx = stepOrder.indexOf(step);
                const isActive = i <= currentIdx;
                return (
                  <React.Fragment key={label}>
                    {i > 0 && (
                      <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
                    )}
                    <span
                      className={`${isActive ? "text-foreground font-medium" : ""}`}
                    >
                      {label}
                    </span>
                  </React.Fragment>
                );
              }
            )}
          </div>
        )}

        <div className="min-h-[200px] flex flex-col gap-4 py-2">
          {/* ─── Step 1: Enter verb ─── */}
          {step === "verb" && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="verb-input" className="text-sm">
                  {t("verbLabel")}
                </Label>
                <Input
                  id="verb-input"
                  type="text"
                  value={verb}
                  onChange={(e) => setVerb(e.target.value)}
                  placeholder={t("verbPlaceholder")}
                  className="text-lg"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && canProceedFromVerb) {
                      setStep("tense");
                    }
                  }}
                />
                <p className="text-[10px] text-muted-foreground">
                  {t("verbHelp")}
                </p>
              </div>
            </div>
          )}

          {/* ─── Step 2: Choose tense ─── */}
          {step === "tense" && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {TENSE_OPTIONS.map((opt) => {
                  const isTwoPart = TWO_PART_TENSES.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setTense(opt.value)}
                      className={`flex flex-col items-start gap-1 p-4 rounded-xl border-2 transition-all hover:shadow-sm text-left
                        ${tense === opt.value ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40"}`}
                    >
                      <p className="font-medium text-sm">{t(opt.labelKey)}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {t(opt.descKey)}
                      </p>
                      {isTwoPart && (
                        <span className="text-[10px] text-purple-500 font-medium mt-0.5">
                          {t("twoPartLabel")}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {error && (
                <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* ─── Generating ─── */}
          {step === "generating" && (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
              <p className="text-sm text-muted-foreground">
                {t("generating", { verb: verb.trim() })}
              </p>
            </div>
          )}

          {/* ─── Done — review ─── */}
          {step === "done" && result && (
            <div className="space-y-2">
              <div className="bg-muted/50 rounded-lg p-3 mb-2">
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  {t("verbLabel")}: <span className="text-foreground font-bold">{result.verb}</span>
                </p>
                {tense && (
                  <p className="text-xs text-muted-foreground">
                    {t("tenseLabel")}: <span className="text-foreground">{t(TENSE_OPTIONS.find((o) => o.value === tense)?.labelKey || "")}</span>
                    {result.splitConjugation && (
                      <span className="ml-2 text-purple-500 text-[10px]">({t("twoPartLabel")})</span>
                    )}
                  </p>
                )}
              </div>

              <table className="w-full border-separate border-spacing-0 border border-border rounded-lg overflow-hidden text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="border-b border-r border-border px-2 py-1.5 text-left text-xs font-medium text-muted-foreground">
                      {t("colPerson")}
                    </th>
                    <th className="border-b border-r border-border px-2 py-1.5 text-left text-xs font-medium text-muted-foreground">
                      {t("colPronoun")}
                    </th>
                    <th className={`border-b border-border px-2 py-1.5 text-left text-xs font-medium text-muted-foreground ${result.splitConjugation ? "border-r" : ""}`}>
                      {t("colConjugation")}
                    </th>
                    {result.splitConjugation && (
                      <th className="border-b border-border px-2 py-1.5 text-left text-xs font-medium text-muted-foreground">
                        {t("colConjugation2")}
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-muted/30">
                    <td colSpan={result.splitConjugation ? 4 : 3} className="border-b border-border px-2 py-1 font-bold text-xs text-muted-foreground uppercase tracking-wider">
                      Singular
                    </td>
                  </tr>
                  {result.singularRows.map((row, i) => (
                    <tr key={`s-${i}`}>
                      <td className="border-b border-r border-border px-2 py-1 text-muted-foreground text-xs">
                        {row.person}{row.detail ? ` (${row.detail})` : ""}
                      </td>
                      <td className="border-b border-r border-border px-2 py-1 font-medium">{row.pronoun}</td>
                      <td className={`border-b border-border px-2 py-1 font-bold text-red-500 ${result.splitConjugation ? "border-r" : ""}`}>
                        {row.conjugation}
                      </td>
                      {result.splitConjugation && (
                        <td className="border-b border-border px-2 py-1 font-bold text-red-500">
                          {row.conjugation2 || ""}
                        </td>
                      )}
                    </tr>
                  ))}
                  <tr className="bg-muted/30">
                    <td colSpan={result.splitConjugation ? 4 : 3} className="border-b border-border px-2 py-1 font-bold text-xs text-muted-foreground uppercase tracking-wider">
                      Plural
                    </td>
                  </tr>
                  {result.pluralRows.map((row, i) => (
                    <tr key={`p-${i}`}>
                      <td className="border-b border-r border-border px-2 py-1 text-muted-foreground text-xs">
                        {row.person}{row.detail ? ` (${row.detail})` : ""}
                      </td>
                      <td className="border-b border-r border-border px-2 py-1 font-medium">{row.pronoun}</td>
                      <td className={`border-b border-border px-2 py-1 font-bold text-red-500 ${result.splitConjugation ? "border-r" : ""}`}>
                        {row.conjugation}
                      </td>
                      {result.splitConjugation && (
                        <td className="border-b border-border px-2 py-1 font-bold text-red-500">
                          {row.conjugation2 || ""}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          {/* Back button */}
          <div>
            {step === "tense" && (
              <Button variant="ghost" size="sm" onClick={() => setStep("verb")}>
                <ChevronLeft className="h-4 w-4 mr-1" /> {tc("back")}
              </Button>
            )}
            {step === "done" && (
              <Button variant="ghost" size="sm" onClick={() => setStep("tense")}>
                <ChevronLeft className="h-4 w-4 mr-1" /> {tc("regenerate")}
              </Button>
            )}
          </div>

          {/* Forward button */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleClose(false)}>
              {tc("cancel")}
            </Button>

            {step === "verb" && (
              <Button
                size="sm"
                disabled={!canProceedFromVerb}
                onClick={() => setStep("tense")}
              >
                {tc("next")} <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}

            {step === "tense" && (
              <Button
                size="sm"
                disabled={!canProceedFromTense}
                onClick={handleGenerate}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Sparkles className="h-4 w-4 mr-1" /> {tc("generate")}
              </Button>
            )}

            {step === "done" && (
              <Button
                size="sm"
                onClick={handleApply}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Check className="h-4 w-4 mr-1" /> {t("applyToBlock")}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
