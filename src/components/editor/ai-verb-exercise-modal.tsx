"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { authFetch } from "@/lib/auth-fetch";
import { useEditor } from "@/store/editor-store";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Check,
} from "lucide-react";
import {
  VerbConjugationTable,
  VerbTense,
  TENSE_LABELS,
  PersonKey,
  CONJUGATION_ROWS,
  TenseConjugation,
} from "@/types/grammar-table";

type Step = "select-table" | "options" | "generating" | "review";

const LANGUAGE_LEVELS = ["A1.1", "A1.2", "A2.1", "A2.2", "B1.1", "B1.2"] as const;

interface GrammarTableItem {
  id: string;
  title: string;
  tableData: VerbConjugationTable[];
}

interface GeneratedItem {
  verb: string;
  pronoun: string;
  personKey: PersonKey;
  tense: VerbTense;
  sentence: string;
  correctForm: string;
  distractors: string[];
}

/**
 * Assemble the verb form that goes into the {{choice:}} inline selection.
 * For trennbare Verben in Präsens/Präteritum: only the conjugated part (no prefix),
 * because the prefix is placed separately in the sentence by the AI.
 * For Präsens/Präteritum: reflexive pronouns are NOT included — they belong in the sentence.
 * For Perfekt: auxiliary + reflexive? + partizip (reflexive is part of the verb phrase).
 */
function assembleChoiceForm(conj: TenseConjugation, tense: VerbTense): string {
  const parts: string[] = [];

  if (tense === "perfekt") {
    if (conj.auxiliary) parts.push(conj.auxiliary);
    if (conj.reflexive) parts.push(conj.reflexive);
    if (conj.partizip) parts.push(conj.partizip);
  } else {
    // Präsens / Präteritum — only conjugated stem, NO prefix, NO reflexive
    parts.push(conj.main);
  }

  return parts.join(" ");
}

/**
 * Get the display pronoun for a PersonKey.
 */
function getPronounDisplay(personKey: PersonKey): string {
  const row = CONJUGATION_ROWS.find((r) => r.personKey === personKey);
  return row?.pronoun ?? personKey;
}

/**
 * Collect unique verb forms for all persons in a given verb+tense.
 */
function collectAllForms(
  table: VerbConjugationTable,
  tense: VerbTense
): Map<string, PersonKey[]> {
  const formMap = new Map<string, PersonKey[]>();
  const allPersonKeys: PersonKey[] = [
    "ich", "du", "Sie_sg", "er_sie_es", "wir", "ihr", "Sie_pl", "sie_pl",
  ];

  for (const pk of allPersonKeys) {
    if (table.thirdPersonOnly && pk !== "er_sie_es" && pk !== "sie_pl") continue;
    const conj = table.conjugations?.[pk]?.[tense];
    if (!conj || !conj.main) continue;
    const form = assembleChoiceForm(conj, tense);
    if (!formMap.has(form)) {
      formMap.set(form, []);
    }
    formMap.get(form)!.push(pk);
  }

  return formMap;
}

/**
 * Pick 2 distractors from other person forms of the same verb+tense.
 * Falls back to forms from other tenses if not enough unique distractors.
 */
function pickDistractors(
  table: VerbConjugationTable,
  correctPersonKey: PersonKey,
  tense: VerbTense,
  correctForm: string,
  allTenses: VerbTense[]
): string[] {
  const formMap = collectAllForms(table, tense);
  const candidates: string[] = [];

  for (const [form] of formMap) {
    if (form !== correctForm && form.trim().length > 0) {
      candidates.push(form);
    }
  }

  // Shuffle candidates
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  const distractors = candidates.slice(0, 2);

  // If we don't have enough, try other tenses
  if (distractors.length < 2) {
    for (const otherTense of allTenses) {
      if (otherTense === tense) continue;
      const otherFormMap = collectAllForms(table, otherTense);
      for (const [form] of otherFormMap) {
        if (
          form !== correctForm &&
          form.trim().length > 0 &&
          !distractors.includes(form)
        ) {
          distractors.push(form);
          if (distractors.length >= 2) break;
        }
      }
      if (distractors.length >= 2) break;
    }
  }

  return distractors.slice(0, 2);
}

/**
 * For sentences starting with "Sie" / "sie", add a <sup> tag to disambiguate
 * between 3rd-person-singular, 3rd-person-plural, and formal.
 * Only applied when the personKey is one of the ambiguous "sie" variants.
 */
function addSieDisambiguation(sentence: string, personKey: PersonKey): string {
  const ambiguousKeys: Record<string, string> = {
    er_sie_es: "SINGULAR",
    sie_pl: "PLURAL",
    Sie_sg: "FORMELL",
    Sie_pl: "FORMELL",
  };
  const label = ambiguousKeys[personKey];
  if (!label) return sentence;

  // Check if the sentence starts with Sie/sie (followed by space or non-letter)
  const m = sentence.match(/^(Sie|sie)\b/);
  if (!m) return sentence;

  return m[1] + "<sup>" + label + "</sup>" + sentence.slice(m[0].length);
}

/**
 * Render a text string that may contain <sup>...</sup> tags
 * as React elements with actual <sup> elements.
 */
function renderWithSup(text: string): React.ReactNode[] {
  const parts = text.split(/(<sup>[^<]*<\/sup>)/g);
  return parts.map((p, i) => {
    const supMatch = p.match(/^<sup>([^<]*)<\/sup>$/);
    if (supMatch) {
      return (
        <span
          key={i}
          className="text-muted-foreground"
          style={{ fontSize: '0.6em', position: 'relative', top: '-0.5em', marginLeft: 2, lineHeight: 0 }}
        >
          {supMatch[1]}
        </span>
      );
    }
    return <React.Fragment key={i}>{p}</React.Fragment>;
  });
}

/** Fisher-Yates shuffle. */
function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Build a shuffled list of { verb, pronoun, tense } assignments.
 */
function buildAssignments(
  tables: VerbConjugationTable[],
  tenses: VerbTense[],
  sentencesPerVerb: number
): { verb: string; personKey: PersonKey; tense: VerbTense; table: VerbConjugationTable }[] {
  const assignments: { verb: string; personKey: PersonKey; tense: VerbTense; table: VerbConjugationTable }[] = [];

  for (const table of tables) {
    const availablePersonKeys: PersonKey[] = table.thirdPersonOnly
      ? ["er_sie_es", "sie_pl"]
      : ["ich", "du", "Sie_sg", "er_sie_es", "wir", "ihr", "Sie_pl", "sie_pl"];

    const shuffledPersonKeys = shuffle(availablePersonKeys);

    for (const tense of tenses) {
      for (let i = 0; i < sentencesPerVerb; i++) {
        const personKey = shuffledPersonKeys[i % shuffledPersonKeys.length];
        assignments.push({
          verb: table.input.verb,
          personKey,
          tense,
          table,
        });
      }
    }
  }

  return shuffle(assignments);
}

export function AiVerbExerciseModal({
  open,
  onOpenChange,
  blockId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blockId: string;
}) {
  const { dispatch } = useEditor();
  const t = useTranslations("aiVerbExercise");
  const tc = useTranslations("common");

  // Step state
  const [step, setStep] = useState<Step>("select-table");

  // Table selection
  const [grammarTables, setGrammarTables] = useState<GrammarTableItem[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [isLoadingTables, setIsLoadingTables] = useState(false);

  // Options
  const [selectedTenses, setSelectedTenses] = useState<Record<VerbTense, boolean>>({
    praesens: true,
    perfekt: false,
    praeteritum: false,
  });
  const [level, setLevel] = useState<string>("A1.2");
  const [sentencesPerVerb, setSentencesPerVerb] = useState(1);
  const [contextText, setContextText] = useState("");

  // Results
  const [generatedItems, setGeneratedItems] = useState<GeneratedItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Derived: selected table data
  const selectedTable = useMemo(
    () => grammarTables.find((t) => t.id === selectedTableId) ?? null,
    [grammarTables, selectedTableId]
  );

  const tableData = selectedTable?.tableData ?? [];

  // Available tenses (only those with data in at least one verb)
  const availableTenses = useMemo(() => {
    const tenses: VerbTense[] = ["praesens", "perfekt", "praeteritum"];
    return tenses.filter((tense) =>
      tableData.some((table) => {
        const conj = table.conjugations?.["ich"]?.[tense];
        return conj && conj.main && conj.main.trim().length > 0;
      })
    );
  }, [tableData]);

  const activeTenses = useMemo(
    () =>
      (Object.keys(selectedTenses) as VerbTense[]).filter(
        (t) => selectedTenses[t] && availableTenses.includes(t)
      ),
    [selectedTenses, availableTenses]
  );

  const canGenerate = activeTenses.length > 0 && sentencesPerVerb >= 1;

  // Fetch grammar tables when dialog opens
  useEffect(() => {
    if (!open) return;
    setIsLoadingTables(true);
    authFetch("/api/worksheets?type=grammar-table")
      .then((res) => res.json())
      .then((data: { id: string; title: string; blocks: { tableType?: string; tableData?: VerbConjugationTable[] } }[]) => {
        const verbTables: GrammarTableItem[] = data
          .filter((w) => w.blocks?.tableType === "verb-conjugation" && Array.isArray(w.blocks?.tableData) && w.blocks.tableData.length > 0)
          .map((w) => ({
            id: w.id,
            title: w.title,
            tableData: w.blocks.tableData as VerbConjugationTable[],
          }));
        setGrammarTables(verbTables);
      })
      .catch((err) => {
        console.error("Failed to fetch grammar tables:", err);
        setGrammarTables([]);
      })
      .finally(() => setIsLoadingTables(false));
  }, [open]);

  // Reset state when dialog closes
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setStep("select-table");
        setError(null);
        setGeneratedItems([]);
        setSelectedTableId(null);
        setSelectedTenses({ praesens: true, perfekt: false, praeteritum: false });
        setContextText("");
        setSentencesPerVerb(1);
      }
      onOpenChange(open);
    },
    [onOpenChange]
  );

  // Generate exercise
  const handleGenerate = useCallback(async () => {
    setStep("generating");
    setError(null);

    try {
      const assignments = buildAssignments(tableData, activeTenses, sentencesPerVerb);

      const items = assignments.map((a) => ({
        verb: a.verb,
        pronoun: getPronounDisplay(a.personKey),
        tense: a.tense,
        tenseLabel: TENSE_LABELS[a.tense].de,
        isSeparable: a.table.isSeparable && !!a.table.separablePrefix,
        separablePrefix: a.table.separablePrefix || "",
        isReflexive: a.table.isReflexive || false,
      }));

      const res = await authFetch("/api/ai/generate-verb-exercise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          level,
          context: contextText,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const sentences: { index: number; sentence: string }[] = data.sentences;

      const generated: GeneratedItem[] = [];
      for (let i = 0; i < assignments.length; i++) {
        const a = assignments[i];
        const sentenceData = sentences.find((s) => s.index === i + 1);
        if (!sentenceData) continue;

        const conj = a.table.conjugations?.[a.personKey]?.[a.tense];
        if (!conj) continue;

        const correctForm = assembleChoiceForm(conj, a.tense);
        const distractors = pickDistractors(
          a.table,
          a.personKey,
          a.tense,
          correctForm,
          activeTenses
        );

        generated.push({
          verb: a.verb,
          pronoun: getPronounDisplay(a.personKey),
          personKey: a.personKey,
          tense: a.tense,
          sentence: sentenceData.sentence,
          correctForm,
          distractors,
        });
      }

      setGeneratedItems(generated);
      setStep("review");
    } catch (err) {
      console.error("Verb exercise generation failed:", err);
      setError(err instanceof Error ? err.message : "Generation failed");
      setStep("options");
    }
  }, [tableData, activeTenses, sentencesPerVerb, level, contextText]);

  // Build inline-choices items and apply to block
  const buildInlineChoicesItems = useCallback(() => {
    return generatedItems.map((item, i) => {
      const options = shuffle([
        { text: item.correctForm, correct: true },
        ...item.distractors.map((d) => ({ text: d, correct: false })),
      ]);

      const choiceParts = options
        .map((o) => (o.correct ? `*${o.text}` : o.text))
        .join("|");

      let sentence = item.sentence.replace(
        /___/,
        `{{choice:${choiceParts}}}`
      );

      // Disambiguate sie/Sie at sentence start
      sentence = addSieDisambiguation(sentence, item.personKey);

      return {
        id: `ic${Date.now()}-${i}`,
        content: sentence,
      };
    });
  }, [generatedItems]);

  const handleApply = useCallback(() => {
    const items = buildInlineChoicesItems();
    dispatch({
      type: "UPDATE_BLOCK",
      payload: { id: blockId, updates: { items } },
    });
    handleOpenChange(false);
  }, [buildInlineChoicesItems, blockId, dispatch, handleOpenChange]);

  // Step indicators
  const steps: { key: Step; label: string }[] = [
    { key: "select-table", label: t("stepSelectTable") },
    { key: "options", label: t("stepOptions") },
    { key: "generating", label: t("stepGenerate") },
    { key: "review", label: t("stepReview") },
  ];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            {t("title")}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
          {steps.map((s, i) => (
            <React.Fragment key={s.key}>
              {i > 0 && <ChevronRight className="h-3 w-3" />}
              <span
                className={
                  s.key === step
                    ? "font-semibold text-foreground"
                    : steps.indexOf(s) < steps.findIndex((x) => x.key === step)
                    ? "text-foreground"
                    : ""
                }
              >
                {s.label}
              </span>
            </React.Fragment>
          ))}
        </div>

        {/* Step: Select Table */}
        {step === "select-table" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t("selectTableDescription")}
            </p>
            {isLoadingTables ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : grammarTables.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {t("noTablesFound")}
              </p>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-1 border rounded-md p-2">
                {grammarTables.map((gt) => (
                  <button
                    key={gt.id}
                    onClick={() => setSelectedTableId(gt.id)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      selectedTableId === gt.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    }`}
                  >
                    <div className="font-medium">{gt.title}</div>
                    <div className={`text-xs ${selectedTableId === gt.id ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {gt.tableData.map((v) => v.input.verb).join(", ")} · {gt.tableData.length} {gt.tableData.length === 1 ? "Verb" : "Verben"}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step: Options */}
        {step === "options" && (
          <div className="space-y-4">
            {/* Tense selection */}
            <div className="space-y-2">
              <Label className="font-medium">{t("tenseLabel")}</Label>
              <div className="space-y-2">
                {availableTenses.map((tense) => (
                  <div key={tense} className="flex items-center gap-2">
                    <Switch
                      id={`tense-${tense}`}
                      checked={selectedTenses[tense]}
                      onCheckedChange={(checked) =>
                        setSelectedTenses((prev) => ({ ...prev, [tense]: checked }))
                      }
                    />
                    <Label htmlFor={`tense-${tense}`} className="cursor-pointer text-sm">
                      {TENSE_LABELS[tense].de}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Language level */}
            <div className="space-y-2">
              <Label className="font-medium">{t("levelLabel")}</Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGE_LEVELS.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sentences per verb */}
            <div className="space-y-2">
              <Label className="font-medium">{t("sentencesPerVerb")}</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={3}
                  value={sentencesPerVerb}
                  onChange={(e) =>
                    setSentencesPerVerb(
                      Math.max(1, Math.min(3, parseInt(e.target.value) || 1))
                    )
                  }
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">
                  {t("sentencesPerVerbHint", {
                    total: tableData.length * sentencesPerVerb * activeTenses.length,
                  })}
                </span>
              </div>
            </div>

            {/* Context / theme */}
            <div className="space-y-2">
              <Label className="font-medium">{t("contextLabel")}</Label>
              <textarea
                className="w-full border rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors h-20"
                value={contextText}
                onChange={(e) => setContextText(e.target.value)}
                placeholder={t("contextPlaceholder")}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
        )}

        {/* Step: Generating */}
        {step === "generating" && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <p>{t("generating")}</p>
          </div>
        )}

        {/* Step: Review */}
        {step === "review" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t("reviewDescription", { count: generatedItems.length })}
            </p>
            <div className="max-h-80 overflow-y-auto space-y-2 border rounded-md p-3">
              {generatedItems.map((item, i) => {
                let displaySentence = item.sentence.replace(
                  /___/,
                  `**${item.correctForm}**`
                );
                displaySentence = addSieDisambiguation(displaySentence, item.personKey);
                return (
                  <div
                    key={i}
                    className="text-sm border-b last:border-0 pb-2 last:pb-0"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-muted-foreground font-mono text-xs mt-0.5">
                        {i + 1}.
                      </span>
                      <div>
                        <p>
                          {displaySentence.split("**").map((part, j) =>
                            j % 2 === 1 ? (
                              <span key={j} className="font-semibold text-green-700">
                                {part}
                              </span>
                            ) : (
                              <span key={j}>{renderWithSup(part)}</span>
                            )
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.verb} · {TENSE_LABELS[item.tense].de} ·{" "}
                          {t("choices")}: {item.correctForm},{" "}
                          {item.distractors.join(", ")}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
        )}

        <DialogFooter className="flex justify-between sm:justify-between">
          <div>
            {step === "options" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep("select-table")}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                {tc("back")}
              </Button>
            )}
            {step === "review" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStep("options");
                  setGeneratedItems([]);
                  setError(null);
                }}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                {tc("back")}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenChange(false)}
            >
              {tc("cancel")}
            </Button>

            {step === "select-table" && (
              <Button
                size="sm"
                onClick={() => setStep("options")}
                disabled={!selectedTableId}
                className="gap-2"
              >
                {t("stepOptions")}
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}

            {step === "options" && (
              <Button
                size="sm"
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                {t("generateButton")}
              </Button>
            )}

            {step === "review" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerate}
                  className="gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  {t("regenerate")}
                </Button>
                <Button
                  size="sm"
                  onClick={handleApply}
                  disabled={generatedItems.length === 0}
                  className="gap-2"
                >
                  <Check className="h-4 w-4" />
                  {t("applyToBlock")}
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
