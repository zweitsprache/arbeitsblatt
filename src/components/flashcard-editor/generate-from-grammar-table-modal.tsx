"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TableProperties,
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
  THIRD_PERSON_KEYS,
  VerbModus,
  VERB_MODUS_LABELS,
} from "@/types/grammar-table";
import { FlashcardItem } from "@/types/flashcard";

// ─── Types ───────────────────────────────────────────────────

type Step = "select-table" | "options" | "preview";
type SortOrder = "infinitive" | "tense" | "person";

interface GrammarTableItem {
  id: string;
  title: string;
  tableData: VerbConjugationTable[];
  verbModus: VerbModus;
}

// ─── Helpers ─────────────────────────────────────────────────

/** Render text with {{hl}}…{{/hl}}, {{sup}}…{{/sup}}, and {{verb}} markers as React elements */
function renderHighlightedText(text: string): React.ReactNode[] {
  const parts = text.split(/(\{\{hl\}\}.*?\{\{\/hl\}\}|\{\{sup\}\}.*?\{\{\/sup\}\}|\{\{verb\}\})/);
  return parts.map((part, i) => {
    const hlMatch = part.match(/^\{\{hl\}\}(.*?)\{\{\/hl\}\}$/);
    if (hlMatch) {
      return (
        <span key={i} className="bg-yellow-200 px-px rounded-sm">
          {hlMatch[1]}
        </span>
      );
    }
    const supMatch = part.match(/^\{\{sup\}\}(.*?)\{\{\/sup\}\}$/);
    if (supMatch) {
      return (
        <sup key={i} className="text-[0.65em] text-muted-foreground font-normal">
          {supMatch[1]}
        </sup>
      );
    }
    if (part === "{{verb}}") {
      return <React.Fragment key={i} />;
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

/**
 * Apply character-level highlight ranges to a string using {{hl}}…{{/hl}} markers.
 */
function applyHighlights(text: string, ranges?: [number, number][]): string {
  if (!ranges || ranges.length === 0) return text;
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  let result = "";
  let cursor = 0;
  for (const [start, end] of sorted) {
    if (start > cursor) result += text.slice(cursor, start);
    result += `{{hl}}${text.slice(start, end)}{{/hl}}`;
    cursor = end;
  }
  result += text.slice(cursor);
  return result;
}

/**
 * Get person display label from person key.
 */
function getPersonLabel(personKey: PersonKey): string {
  const row = CONJUGATION_ROWS.find((r) => r.personKey === personKey);
  if (!row) return personKey;
  // For er_sie_es, mark sie with SIN superscript for disambiguation
  if (personKey === "er_sie_es") return "er / sie{{sup}}SIN{{/sup}} / es";
  return row.pronoun;
}

/**
 * Get person info line, e.g. "3. Person Singular" or "2. Person Singular formell".
 */
function getPersonInfoLine(personKey: PersonKey): string {
  const row = CONJUGATION_ROWS.find((r) => r.personKey === personKey);
  if (!row) return "";
  const num = `${row.person}. Person`;
  const section = row.section === "singular" ? "Singular" : "Plural";
  const formality = row.formality === "formell" ? " formell" : "";
  return `${num} ${section}${formality}`;
}

/**
 * For ambiguous pronoun keys, return a superscript suffix marker.
 * sie_pl → PLU, Sie_sg/Sie_pl → FOR.
 */
function getThirdPersonSuffix(personKey: PersonKey): string {
  const row = CONJUGATION_ROWS.find((r) => r.personKey === personKey);
  if (!row) return "";
  if (row.formality === "formell") return "{{sup}}FOR{{/sup}}";
  // Only 3rd person plural needs disambiguation ("sie" vs "Sie")
  if (row.person === "3" && row.section === "plural") return "{{sup}}PLU{{/sup}}";
  return "";
}

/**
 * Assemble the full conjugated form for display on the back of a flashcard.
 *
 * Präsens/Präteritum: [reflexive] [prefix] + main  OR  main + [prefix]
 *   - separable verbs in main clause: prefix goes to the end
 *   - we show: "hole … ab" or simply "hole ab" for compact display
 * Perfekt: auxiliary [reflexive] partizip
 */
function assembleBackText(
  conj: TenseConjugation,
  tense: VerbTense,
  personKey: PersonKey,
  table: VerbConjugationTable
): string {
  const pronoun = getPersonLabel(personKey);
  const suffix = getThirdPersonSuffix(personKey);
  const hl = conj.highlights;
  const verbParts: string[] = [];

  if (tense === "perfekt") {
    if (conj.auxiliary) verbParts.push(applyHighlights(conj.auxiliary, hl?.auxiliary));
    if (conj.reflexive) verbParts.push(applyHighlights(conj.reflexive, hl?.reflexive));
    if (conj.partizip) verbParts.push(applyHighlights(conj.partizip, hl?.partizip));
  } else {
    // Präsens / Präteritum
    if (conj.reflexive) verbParts.push(applyHighlights(conj.reflexive, hl?.reflexive));
    verbParts.push(applyHighlights(conj.main, hl?.main));
    // Separable prefix goes at the end
    if (table.isSeparable && conj.prefix) {
      verbParts.push(applyHighlights(conj.prefix, hl?.prefix));
    }
  }

  return `${pronoun}${suffix} {{verb}}${verbParts.join(" ")}`;
}

/**
 * Generate flashcard items from selected grammar table data.
 */
function generateFlashcards(
  tableData: VerbConjugationTable[],
  selectedVerbs: Record<string, boolean>,
  selectedTenses: Record<VerbTense, boolean>,
  selectedPersons: Record<PersonKey, boolean>,
  sortOrder: SortOrder,
  locale: string,
  verbModus: VerbModus
): FlashcardItem[] {
  const tenseOrder: VerbTense[] = ["praesens", "perfekt", "praeteritum"];
  const personOrder: PersonKey[] = CONJUGATION_ROWS.map((r) => r.personKey);
  const tenseLabels = TENSE_LABELS;

  const cards: {
    verb: string;
    tense: VerbTense;
    tenseIdx: number;
    personKey: PersonKey;
    personIdx: number;
    front: string;
    back: string;
  }[] = [];

  for (const table of tableData) {
    const verb = table.input.verb;
    if (!selectedVerbs[verb]) continue;

    for (const tense of tenseOrder) {
      if (!selectedTenses[tense]) continue;
      const tenseIdx = tenseOrder.indexOf(tense);
      const tenseLabel = tenseLabels[tense][locale === "en" ? "en" : "de"];

      for (const personKey of personOrder) {
        if (!selectedPersons[personKey]) continue;

        // Respect thirdPersonOnly
        if (table.thirdPersonOnly && !THIRD_PERSON_KEYS.includes(personKey)) {
          continue;
        }

        const conj = table.conjugations?.[personKey]?.[tense];
        if (!conj) continue;
        // Perfekt uses partizip; other tenses use main
        const hasData = tense === "perfekt"
          ? !!(conj.partizip?.trim())
          : !!(conj.main?.trim());
        if (!hasData) continue;

        const personLabel = getPersonLabel(personKey);
        const personInfo = getPersonInfoLine(personKey);
        const personIdx = personOrder.indexOf(personKey);

        const modusLabel = VERB_MODUS_LABELS[verbModus][locale === "en" ? "en" : "de"];
        const front = `${verb}\n${tenseLabel} ${modusLabel}\n${personInfo}\n${personLabel} \u2026`;
        const back = assembleBackText(conj, tense, personKey, table);

        cards.push({ verb, tense, tenseIdx, personKey, personIdx, front, back });
      }
    }
  }

  // Sort
  cards.sort((a, b) => {
    switch (sortOrder) {
      case "infinitive":
        return (
          a.verb.localeCompare(b.verb) ||
          a.tenseIdx - b.tenseIdx ||
          a.personIdx - b.personIdx
        );
      case "tense":
        return (
          a.tenseIdx - b.tenseIdx ||
          a.verb.localeCompare(b.verb) ||
          a.personIdx - b.personIdx
        );
      case "person":
        return (
          a.personIdx - b.personIdx ||
          a.verb.localeCompare(b.verb) ||
          a.tenseIdx - b.tenseIdx
        );
      default:
        return 0;
    }
  });

  // When sorting by infinitive, pad each verb group to full pages (9 cards per page)
  // so each verb starts on a fresh page. Skip padding for other sort orders.
  if (sortOrder === "infinitive") {
    const PAGE_SIZE = 9;
    const result: FlashcardItem[] = [];
    let currentVerb: string | null = null;

    for (const c of cards) {
      if (currentVerb !== null && c.verb !== currentVerb) {
        const remainder = result.length % PAGE_SIZE;
        if (remainder !== 0) {
          const blanks = PAGE_SIZE - remainder;
          for (let i = 0; i < blanks; i++) {
            result.push({ id: crypto.randomUUID(), front: { text: "" }, back: { text: "" } });
          }
        }
      }
      currentVerb = c.verb;
      result.push({
        id: crypto.randomUUID(),
        front: { text: c.front },
        back: { text: c.back },
      });
    }
    return result;
  }

  return cards.map((c) => ({
    id: crypto.randomUUID(),
    front: { text: c.front },
    back: { text: c.back },
  }));
}

// ─── Component ───────────────────────────────────────────────

export function GenerateFromGrammarTableModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("flashcardFromGrammarTable");
  const tc = useTranslations("common");
  const router = useRouter();

  // Step state
  const [step, setStep] = useState<Step>("select-table");

  // Table selection
  const [grammarTables, setGrammarTables] = useState<GrammarTableItem[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [isLoadingTables, setIsLoadingTables] = useState(false);

  // Filters
  const [selectedVerbs, setSelectedVerbs] = useState<Record<string, boolean>>({});
  const [selectedTenses, setSelectedTenses] = useState<Record<VerbTense, boolean>>({
    praesens: true,
    perfekt: true,
    praeteritum: true,
  });
  const [selectedPersons, setSelectedPersons] = useState<Record<PersonKey, boolean>>({
    ich: true,
    du: true,
    Sie_sg: true,
    er_sie_es: true,
    wir: true,
    ihr: true,
    Sie_pl: true,
    sie_pl: true,
  });

  // Sort & title
  const [sortOrder, setSortOrder] = useState<SortOrder>("infinitive");
  const [title, setTitle] = useState("");

  // Creating state
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derived: selected table data
  const selectedTable = useMemo(
    () => grammarTables.find((gt) => gt.id === selectedTableId) ?? null,
    [grammarTables, selectedTableId]
  );

  const tableData = selectedTable?.tableData ?? [];

  // Available tenses (only those with data in at least one verb)
  const availableTenses = useMemo(() => {
    const tenses: VerbTense[] = ["praesens", "perfekt", "praeteritum"];
    return tenses.filter((tense) =>
      tableData.some((table) => {
        // Check if at least one person has data for this tense
        return CONJUGATION_ROWS.some((row) => {
          const conj = table.conjugations?.[row.personKey]?.[tense];
          if (!conj) return false;
          // Perfekt uses auxiliary + partizip instead of main
          if (tense === "perfekt") {
            return !!(conj.partizip && conj.partizip.trim());
          }
          return !!(conj.main && conj.main.trim());
        });
      })
    );
  }, [tableData]);

  // When table selection changes, initialize verb filter
  useEffect(() => {
    if (tableData.length > 0) {
      const verbs: Record<string, boolean> = {};
      for (const table of tableData) {
        verbs[table.input.verb] = true;
      }
      setSelectedVerbs(verbs);
      setTitle(t("flashcardTitle", { title: selectedTable?.title ?? "" }));
    }
  }, [selectedTableId, tableData, selectedTable?.title, t]);

  // Determine the locale from the active path
  const locale = typeof window !== "undefined"
    ? window.location.pathname.split("/")[1] || "de"
    : "de";

  // Generated preview cards
  const previewCards = useMemo(() => {
    if (tableData.length === 0) return [];
    return generateFlashcards(
      tableData,
      selectedVerbs,
      selectedTenses,
      selectedPersons,
      sortOrder,
      locale,
      selectedTable?.verbModus ?? "indikativ"
    );
  }, [tableData, selectedVerbs, selectedTenses, selectedPersons, sortOrder, locale, selectedTable?.verbModus]);

  const hasValidSelection = previewCards.length > 0;

  // Non-blank cards for preview display and count
  const visibleCards = useMemo(
    () => previewCards.filter((c) => c.front.text || c.back.text),
    [previewCards]
  );

  // Are all verbs selected?
  const allVerbsSelected = useMemo(() => {
    return tableData.every((t) => selectedVerbs[t.input.verb]);
  }, [tableData, selectedVerbs]);

  // Are all available tenses selected?
  const allTensesSelected = useMemo(() => {
    return availableTenses.every((t) => selectedTenses[t]);
  }, [availableTenses, selectedTenses]);

  // Are all persons selected?
  const allPersons: PersonKey[] = CONJUGATION_ROWS.map((r) => r.personKey);
  const allPersonsSelected = useMemo(() => {
    return allPersons.every((p) => selectedPersons[p]);
  }, [allPersons, selectedPersons]);

  // Fetch grammar tables when dialog opens
  useEffect(() => {
    if (!open) return;
    setIsLoadingTables(true);
    authFetch("/api/worksheets?type=grammar-table")
      .then((res) => res.json())
      .then(
        (
          data: {
            id: string;
            title: string;
            blocks: {
              tableType?: string;
              tableData?: VerbConjugationTable[];
            };
            settings?: { verbModus?: VerbModus };
          }[]
        ) => {
          const verbTables: GrammarTableItem[] = data
            .filter(
              (w) =>
                w.blocks?.tableType === "verb-conjugation" &&
                Array.isArray(w.blocks?.tableData) &&
                w.blocks.tableData.length > 0
            )
            .map((w) => ({
              id: w.id,
              title: w.title,
              tableData: w.blocks.tableData as VerbConjugationTable[],
              verbModus: (w.settings?.verbModus as VerbModus) ?? "indikativ",
            }));
          setGrammarTables(verbTables);
        }
      )
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
        setSelectedTableId(null);
        setSelectedVerbs({});
        setSelectedTenses({
          praesens: true,
          perfekt: true,
          praeteritum: true,
        });
        setSelectedPersons({
          ich: true,
          du: true,
          Sie_sg: true,
          er_sie_es: true,
          wir: true,
          ihr: true,
          Sie_pl: true,
          sie_pl: true,
        });
        setSortOrder("infinitive");
        setTitle("");
        setIsCreating(false);
      }
      onOpenChange(open);
    },
    [onOpenChange]
  );

  // Create flashcards
  const handleCreate = useCallback(async () => {
    if (!hasValidSelection) return;
    setIsCreating(true);
    setError(null);

    try {
      const res = await authFetch("/api/worksheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "flashcards",
          title: title.trim() || t("title"),
          blocks: previewCards,
          settings: { cardsPerPage: 8 },
          published: false,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      handleOpenChange(false);
      router.push(`/editor/flashcards/${data.id}`);
    } catch (err) {
      console.error("Failed to create flashcards:", err);
      setError(err instanceof Error ? err.message : "Failed to create flashcards");
      setIsCreating(false);
    }
  }, [hasValidSelection, previewCards, title, t, handleOpenChange, router]);

  // Step indicators
  const steps: { key: Step; label: string }[] = [
    { key: "select-table", label: t("stepSelectTable") },
    { key: "options", label: t("stepOptions") },
    { key: "preview", label: t("stepCreate") },
  ];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TableProperties className="h-5 w-5" />
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

        {/* Scrollable step content */}
        <div className="flex-1 overflow-y-auto min-h-0">
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
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">
                    {t("noTablesFound")}
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    {t("noTablesHint")}
                  </p>
                </div>
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
                      <div
                        className={`text-xs ${
                          selectedTableId === gt.id
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground"
                        }`}
                      >
                        {gt.tableData.map((v) => v.input.verb).join(", ")} ·{" "}
                        {gt.tableData.length}{" "}
                        {gt.tableData.length === 1 ? "Verb" : "Verben"}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step: Options (Filter & Sort) */}
          {step === "options" && (
            <div className="space-y-5">
              {/* Verb filter */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="font-medium">{t("filterVerbs")}</Label>
                  <button
                    className="text-xs text-primary hover:underline"
                    onClick={() => {
                      const newState: Record<string, boolean> = {};
                      const targetValue = !allVerbsSelected;
                      for (const table of tableData) {
                        newState[table.input.verb] = targetValue;
                      }
                      setSelectedVerbs(newState);
                    }}
                  >
                    {allVerbsSelected ? tc("deselectAll") : t("allVerbs")}
                  </button>
                </div>
                <div className="space-y-2">
                  {tableData.map((table) => (
                    <div key={table.input.verb} className="flex items-center gap-2">
                      <Switch
                        id={`verb-${table.input.verb}`}
                        checked={selectedVerbs[table.input.verb] ?? true}
                        onCheckedChange={(checked) =>
                          setSelectedVerbs((prev) => ({
                            ...prev,
                            [table.input.verb]: checked,
                          }))
                        }
                      />
                      <Label
                        htmlFor={`verb-${table.input.verb}`}
                        className="cursor-pointer text-sm"
                      >
                        {table.input.verb}
                        {table.thirdPersonOnly && (
                          <span className="text-xs text-muted-foreground ml-1">
                            {t("thirdPersonOnly")}
                          </span>
                        )}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tense filter */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="font-medium">{t("filterTenses")}</Label>
                  <button
                    className="text-xs text-primary hover:underline"
                    onClick={() => {
                      const targetValue = !allTensesSelected;
                      setSelectedTenses({
                        praesens: availableTenses.includes("praesens") ? targetValue : false,
                        perfekt: availableTenses.includes("perfekt") ? targetValue : false,
                        praeteritum: availableTenses.includes("praeteritum") ? targetValue : false,
                      });
                    }}
                  >
                    {allTensesSelected ? tc("deselectAll") : t("allTenses")}
                  </button>
                </div>
                <div className="space-y-2">
                  {(["praesens", "perfekt", "praeteritum"] as VerbTense[]).map(
                    (tense) => {
                      const available = availableTenses.includes(tense);
                      return (
                        <div key={tense} className="flex items-center gap-2">
                          <Switch
                            id={`tense-${tense}`}
                            checked={selectedTenses[tense] && available}
                            onCheckedChange={(checked) =>
                              setSelectedTenses((prev) => ({
                                ...prev,
                                [tense]: checked,
                              }))
                            }
                            disabled={!available}
                          />
                          <Label
                            htmlFor={`tense-${tense}`}
                            className={`cursor-pointer text-sm ${
                              !available ? "text-muted-foreground" : ""
                            }`}
                          >
                            {TENSE_LABELS[tense][locale === "en" ? "en" : "de"]}
                          </Label>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>

              {/* Person filter */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="font-medium">{t("filterPersons")}</Label>
                  <button
                    className="text-xs text-primary hover:underline"
                    onClick={() => {
                      const targetValue = !allPersonsSelected;
                      const newState: Record<PersonKey, boolean> = {} as Record<
                        PersonKey,
                        boolean
                      >;
                      for (const p of allPersons) {
                        newState[p] = targetValue;
                      }
                      setSelectedPersons(newState);
                    }}
                  >
                    {allPersonsSelected ? tc("deselectAll") : t("allPersons")}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {CONJUGATION_ROWS.map((row) => (
                    <div key={row.personKey} className="flex items-center gap-2">
                      <Switch
                        id={`person-${row.personKey}`}
                        checked={selectedPersons[row.personKey]}
                        onCheckedChange={(checked) =>
                          setSelectedPersons((prev) => ({
                            ...prev,
                            [row.personKey]: checked,
                          }))
                        }
                      />
                      <Label
                        htmlFor={`person-${row.personKey}`}
                        className="cursor-pointer text-sm"
                      >
                        {row.pronoun}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sort order */}
              <div className="space-y-2">
                <Label className="font-medium">{t("sortBy")}</Label>
                <Select
                  value={sortOrder}
                  onValueChange={(v) => setSortOrder(v as SortOrder)}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="infinitive">
                      {t("sortByInfinitive")}
                    </SelectItem>
                    <SelectItem value="tense">{t("sortByTense")}</SelectItem>
                    <SelectItem value="person">{t("sortByPerson")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Card count */}
              <p className="text-sm text-muted-foreground">
                {t("cardCount", { count: previewCards.length })}
              </p>

              {!hasValidSelection && (
                <p className="text-sm text-destructive">
                  {t("noValidSelection")}
                </p>
              )}
            </div>
          )}

          {/* Step: Preview & Create */}
          {step === "preview" && (
            <div className="space-y-3">
              {/* Title input */}
              <div className="space-y-2">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("titlePlaceholder")}
                />
              </div>

              <p className="text-sm text-muted-foreground">
                {t("cardCount", { count: visibleCards.length })}
              </p>

              {/* Preview list */}
              <div className="max-h-72 overflow-y-auto space-y-2 border rounded-md p-3">
                {visibleCards.map((card, i) => (
                  <div
                    key={card.id}
                    className="text-sm border-b last:border-0 pb-2 last:pb-0"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-muted-foreground font-mono text-xs mt-0.5 min-w-[2rem] text-right">
                        {i + 1}.
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-muted-foreground whitespace-pre-line">
                          {card.front.text.split("\n").map((line, j) => (
                            <span key={j} className={j === 0 ? "font-semibold" : ""}>
                              {j > 0 && <br />}
                              {line}
                            </span>
                          ))}
                        </p>
                        <p className="font-semibold text-green-700">
                          {renderHighlightedText(card.back.text)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          )}
        </div>

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
            {step === "preview" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep("options")}
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
              {t("cancel")}
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
                onClick={() => setStep("preview")}
                disabled={!hasValidSelection}
                className="gap-2"
              >
                {t("preview")}
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}

            {step === "preview" && (
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={isCreating || !hasValidSelection}
                className="gap-2"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("creating")}
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    {t("create")}
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
