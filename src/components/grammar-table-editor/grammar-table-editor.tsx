"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GrammarTableProvider, useGrammarTable } from "@/store/grammar-table-store";
import {
  GrammarTableDocument,
  GrammarTableType,
  CASE_LABELS,
  GENUS_LABELS,
  TENSE_LABELS,
  TABLE_TYPE_LABELS,
  GrammatikalFall,
  Genus,
  VerbTense,
  AdjectiveDeclinationTable,
  VerbConjugationTable,
  CONJUGATION_ROWS,
  StaticRowDef,
  PersonKey,
  DeclinationInput,
  ConjugationInput,
  TenseHighlights,
} from "@/types/grammar-table";
import { Brand, DEFAULT_BRAND_SETTINGS } from "@/types/worksheet";
import { authFetch } from "@/lib/auth-fetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Save,
  Loader2,
  Sparkles,
  Download,
  Eye,
  Settings2,
  RefreshCw,
  FileText,
  Highlighter,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

// ─── Declination Input Panel ─────────────────────────────────

function DeclinationInputPanel() {
  const { state, dispatch } = useGrammarTable();
  const t = useTranslations("grammarTableEditor");

  const genders: Genus[] = ["maskulin", "neutrum", "feminin", "plural"];

  const handleInputChange = (
    gender: Genus,
    field: "adjective" | "noun",
    value: string
  ) => {
    dispatch({
      type: "UPDATE_DECLINATION_INPUT",
      payload: {
        [gender]: {
          ...state.declinationInput[gender],
          [field]: value,
        },
      },
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold mb-3">{t("inputTitle")}</h3>
        <p className="text-xs text-muted-foreground mb-4">{t("inputDescription")}</p>
      </div>

      {genders.map((gender) => (
        <div key={gender} className="space-y-2 p-3 bg-muted/30 rounded-lg">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {GENUS_LABELS[gender].de}
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder={t("adjective")}
              value={state.declinationInput[gender].adjective}
              onChange={(e) => handleInputChange(gender, "adjective", e.target.value)}
              className="text-sm"
            />
            <Input
              placeholder={t("noun")}
              value={state.declinationInput[gender].noun}
              onChange={(e) => handleInputChange(gender, "noun", e.target.value)}
              className="text-sm"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Conjugation Input Panel ─────────────────────────────────

function ConjugationInputPanel() {
  const { state, dispatch } = useGrammarTable();
  const t = useTranslations("grammarTableEditor");
  const [bulkMode, setBulkMode] = React.useState(false);
  const [bulkText, setBulkText] = React.useState("");

  // Safely get verbs array with fallback
  const verbs = state.conjugationInput?.verbs ?? [""];

  const handleVerbChange = (index: number, value: string) => {
    const newVerbs = [...verbs];
    newVerbs[index] = value;
    dispatch({
      type: "UPDATE_CONJUGATION_INPUT",
      payload: { verbs: newVerbs },
    });
  };

  const addVerb = () => {
    dispatch({
      type: "UPDATE_CONJUGATION_INPUT",
      payload: { verbs: [...verbs, ""] },
    });
  };

  const removeVerb = (index: number) => {
    const newVerbs = verbs.filter((_, i) => i !== index);
    // Keep at least one verb
    if (newVerbs.length === 0) {
      newVerbs.push("");
    }
    dispatch({
      type: "UPDATE_CONJUGATION_INPUT",
      payload: { verbs: newVerbs },
    });
  };

  const handleBulkImport = () => {
    // Parse bulk text: split by commas, newlines, or multiple spaces
    const verbs = bulkText
      .split(/[,\n]+/)
      .map((v) => v.trim())
      .filter((v) => v.length > 0);
    
    if (verbs.length > 0) {
      dispatch({
        type: "UPDATE_CONJUGATION_INPUT",
        payload: { verbs },
      });
      setBulkText("");
      setBulkMode(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold mb-1">{t("verbInputTitle")}</h3>
          <p className="text-xs text-muted-foreground">{t("verbInputDescription")}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setBulkMode(!bulkMode)}
          className="text-xs"
        >
          {bulkMode ? t("singleMode") : t("bulkMode")}
        </Button>
      </div>

      {bulkMode ? (
        <div className="space-y-3">
          <textarea
            placeholder={t("bulkPlaceholder")}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            className="w-full h-32 p-3 text-sm border rounded-lg resize-none bg-background"
          />
          <Button
            variant="default"
            size="sm"
            onClick={handleBulkImport}
            className="w-full"
            disabled={!bulkText.trim()}
          >
            {t("importVerbs")}
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {verbs.map((verb, index) => (
              <div key={index} className="flex gap-2 items-center p-3 bg-muted/30 rounded-lg">
                <div className="flex-1">
                  <Input
                    placeholder={t("verbPlaceholder")}
                    value={verb}
                    onChange={(e) => handleVerbChange(index, e.target.value)}
                    className="text-sm"
                  />
                </div>
                {verbs.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeVerb(index)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  >
                    ×
                  </Button>
                )}
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={addVerb}
            className="w-full"
          >
            + {t("addVerb")}
          </Button>
        </>
      )}
    </div>
  );
}

// ─── Settings Panel ──────────────────────────────────────────

function SettingsPanel() {
  const { state, dispatch } = useGrammarTable();
  const t = useTranslations("grammarTableEditor");

  const simplifiedTenses = state.settings.simplifiedTenses ?? { praesens: true, perfekt: false, praeteritum: false };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">{t("settings")}</h3>
      
      {state.tableType === "adjective-declination" && (
        <>
          <div className="flex items-center justify-between">
            <Label className="text-sm">{t("showNotes")}</Label>
            <Switch
              checked={state.settings.showNotes}
              onCheckedChange={(v) =>
                dispatch({ type: "UPDATE_SETTINGS", payload: { showNotes: v } })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-sm">{t("showPrepositions")}</Label>
            <Switch
              checked={state.settings.showPrepositions}
              onCheckedChange={(v) =>
                dispatch({ type: "UPDATE_SETTINGS", payload: { showPrepositions: v } })
              }
            />
          </div>
        </>
      )}

      <div className="flex items-center justify-between">
        <Label className="text-sm">{t("highlightEndings")}</Label>
        <Switch
          checked={state.settings.highlightEndings}
          onCheckedChange={(v) =>
            dispatch({ type: "UPDATE_SETTINGS", payload: { highlightEndings: v } })
          }
        />
      </div>

      {state.tableType === "verb-conjugation" && (
        <>
          <Separator />
          <div className="flex items-center justify-between">
            <Label className="text-sm">{t("simplified")}</Label>
            <Switch
              checked={state.settings.simplified ?? false}
              onCheckedChange={(v) =>
                dispatch({ type: "UPDATE_SETTINGS", payload: { simplified: v } })
              }
            />
          </div>

          {state.settings.simplified && (
            <div className="space-y-2 pl-2 border-l-2 border-muted">
              <Label className="text-xs text-muted-foreground">{t("simplifiedTenses")}</Label>
              {(["praesens", "perfekt", "praeteritum"] as const).map((tense) => (
                <div key={tense} className="flex items-center justify-between">
                  <Label className="text-sm">{TENSE_LABELS[tense].de}</Label>
                  <Switch
                    checked={simplifiedTenses[tense]}
                    onCheckedChange={(v) =>
                      dispatch({
                        type: "UPDATE_SETTINGS",
                        payload: {
                          simplifiedTenses: { ...simplifiedTenses, [tense]: v },
                        },
                      })
                    }
                  />
                </div>
              ))}
            </div>
          )}

          <Separator />
          <div className="flex items-center justify-between">
            <Label className="text-sm">{t("showIrregularHighlights")}</Label>
            <Switch
              checked={state.settings.showIrregularHighlights ?? false}
              onCheckedChange={(v) =>
                dispatch({ type: "UPDATE_SETTINGS", payload: { showIrregularHighlights: v } })
              }
            />
          </div>
        </>
      )}
    </div>
  );
}

// ─── Declination Table View ──────────────────────────────────

function DeclinationTableView() {
  const { state } = useGrammarTable();
  const t = useTranslations("grammarTableEditor");
  const locale = "de"; // For now, force German for grammar labels

  if (!state.tableData) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p className="text-center">
          {t("noTableYet")}
          <br />
          <span className="text-sm">{t("clickGenerate")}</span>
        </p>
      </div>
    );
  }

  // Cast to AdjectiveDeclinationTable for this view
  const tableData = state.tableData as AdjectiveDeclinationTable;

  const cases: GrammatikalFall[] = ["nominativ", "akkusativ", "dativ", "genitiv"];
  const genders: Genus[] = ["maskulin", "neutrum", "feminin", "plural"];

  // Helper to render a cell with optional highlighting
  const renderCell = (article: string, adjective: string, noun: string) => (
    <>
      <span className="text-slate-500">{article}</span>{" "}
      <span className={state.settings.highlightEndings ? "font-semibold text-pink-700" : ""}>
        {adjective}
      </span>{" "}
      <span>{noun}</span>
    </>
  );

  return (
    <div className="space-y-10">
      {cases.map((caseType) => {
        const caseSection = tableData.cases.find((c) => c.case === caseType);
        if (!caseSection || !caseSection.groups) return null;

        // Calculate total rows for preposition rowspan
        const totalRows = caseSection.groups.reduce(
          (sum, group) => sum + (group.articleRows?.length || 0),
          0
        );

        // Check for prepositions (Akkusativ/Dativ)
        const hasPrepositions = state.settings.showPrepositions && 
          caseSection.prepositions && 
          caseSection.prepositions.length > 0;
        
        // Check for notes (Nominativ/Genitiv)
        const hasNotes = state.settings.showNotes && 
          caseSection.groups.some((g) => g.note);
        
        // Show the last column if we have prepositions OR notes
        const showLastColumn = hasPrepositions || hasNotes;

        let rowCounter = 0;

        return (
          <div key={caseType}>
            <h3 className="text-lg font-bold mb-3">{CASE_LABELS[caseType][locale]}</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm table-fixed">
                <colgroup>
                  {/* 3 columns per gender: article (6%), adjective (6%), noun (7%) */}
                  <col style={{ width: "6%" }} /><col style={{ width: "6%" }} /><col style={{ width: "7%" }} />
                  <col style={{ width: "6%" }} /><col style={{ width: "6%" }} /><col style={{ width: "7%" }} />
                  <col style={{ width: "6%" }} /><col style={{ width: "6%" }} /><col style={{ width: "7%" }} />
                  <col style={{ width: "6%" }} /><col style={{ width: "6%" }} /><col style={{ width: "7%" }} />
                  {showLastColumn && <col style={{ width: "18%" }} />}
                </colgroup>
                <thead>
                  <tr>
                    <th colSpan={3} className="bg-slate-200 border border-slate-300 px-2 py-1.5 text-left font-semibold text-xs">
                      {GENUS_LABELS.maskulin[locale]}
                    </th>
                    <th colSpan={3} className="bg-slate-200 border border-slate-300 px-2 py-1.5 text-left font-semibold text-xs">
                      {GENUS_LABELS.neutrum[locale]}
                    </th>
                    <th colSpan={3} className="bg-slate-200 border border-slate-300 px-2 py-1.5 text-left font-semibold text-xs">
                      {GENUS_LABELS.feminin[locale]}
                    </th>
                    <th colSpan={3} className="bg-slate-200 border border-slate-300 px-2 py-1.5 text-left font-semibold text-xs">
                      {GENUS_LABELS.plural[locale]}
                    </th>
                    {showLastColumn && (
                      <th className="bg-slate-200 border border-slate-300 px-2 py-1.5 text-left font-semibold text-xs">
                        {hasPrepositions ? t("prepositions") : t("notes")}
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {caseSection.groups.map((group, groupIdx) => {
                    if (!group.articleRows || !group.shared) return null;
                    const rowCount = group.articleRows.length;
                    const isFirstGroup = groupIdx === 0;
                    
                    return group.articleRows.map((artRow, artRowIdx) => {
                      const isFirstRowInGroup = artRowIdx === 0;
                      const isGlobalFirstRow = rowCounter === 0;
                      rowCounter++;
                      
                      // Determine if we should show border separator
                      const showSeparator = !isFirstGroup && isFirstRowInGroup;
                      
                      return (
                        <tr 
                          key={`${group.type}-${artRowIdx}`}
                          className={showSeparator ? "border-t-2 border-slate-500" : ""}
                        >
                          {/* Maskulin */}
                          <td className="border border-slate-300 px-2 py-1.5 text-xs">
                            {artRow.maskulin}
                          </td>
                          {isFirstRowInGroup ? (
                            <>
                              <td 
                                rowSpan={rowCount} 
                                className="border border-slate-300 px-2 py-1.5 text-xs align-middle"
                              >
                                <span className={state.settings.highlightEndings ? "font-semibold text-pink-700" : ""}>
                                  {group.shared.maskulin.adjective}
                                </span>
                              </td>
                              <td 
                                rowSpan={rowCount} 
                                className="border border-slate-300 px-2 py-1.5 text-xs align-middle"
                              >
                                {group.shared.maskulin.noun}
                              </td>
                            </>
                          ) : null}
                          
                          {/* Neutrum */}
                          <td className="border border-slate-300 px-2 py-1.5 text-xs">
                            {artRow.neutrum}
                          </td>
                          {isFirstRowInGroup ? (
                            <>
                              <td 
                                rowSpan={rowCount} 
                                className="border border-slate-300 px-2 py-1.5 text-xs align-middle"
                              >
                                <span className={state.settings.highlightEndings ? "font-semibold text-pink-700" : ""}>
                                  {group.shared.neutrum.adjective}
                                </span>
                              </td>
                              <td 
                                rowSpan={rowCount} 
                                className="border border-slate-300 px-2 py-1.5 text-xs align-middle"
                              >
                                {group.shared.neutrum.noun}
                              </td>
                            </>
                          ) : null}
                          
                          {/* Feminin */}
                          <td className="border border-slate-300 px-2 py-1.5 text-xs">
                            {artRow.feminin}
                          </td>
                          {isFirstRowInGroup ? (
                            <>
                              <td 
                                rowSpan={rowCount} 
                                className="border border-slate-300 px-2 py-1.5 text-xs align-middle"
                              >
                                <span className={state.settings.highlightEndings ? "font-semibold text-pink-700" : ""}>
                                  {group.shared.feminin.adjective}
                                </span>
                              </td>
                              <td 
                                rowSpan={rowCount} 
                                className="border border-slate-300 px-2 py-1.5 text-xs align-middle"
                              >
                                {group.shared.feminin.noun}
                              </td>
                            </>
                          ) : null}
                          
                          {/* Plural - more complex due to pluralOverride */}
                          <td className="border border-slate-300 px-2 py-1.5 text-xs">
                            {artRow.plural}
                          </td>
                          {(() => {
                            // For plural, handle overrides
                            if (artRow.pluralOverride) {
                              // This row has its own adjective/noun
                              return (
                                <>
                                  <td className="border border-slate-300 px-2 py-1.5 text-xs align-middle">
                                    <span className={state.settings.highlightEndings ? "font-semibold text-pink-700" : ""}>
                                      {artRow.pluralOverride.adjective}
                                    </span>
                                  </td>
                                  <td className="border border-slate-300 px-2 py-1.5 text-xs align-middle">
                                    {artRow.pluralOverride.noun}
                                  </td>
                                </>
                              );
                            } else if (isFirstRowInGroup) {
                              // Count how many rows don't have pluralOverride
                              const sharedCount = group.articleRows.filter(r => !r.pluralOverride).length;
                              // Check if any subsequent rows have override
                              const hasOverrides = group.articleRows.some(r => r.pluralOverride);
                              const effectiveRowSpan = hasOverrides ? sharedCount : rowCount;
                              
                              return (
                                <>
                                  <td 
                                    rowSpan={effectiveRowSpan} 
                                    className="border border-slate-300 px-2 py-1.5 text-xs align-middle"
                                  >
                                    <span className={state.settings.highlightEndings ? "font-semibold text-pink-700" : ""}>
                                      {group.shared.plural.adjective}
                                    </span>
                                  </td>
                                  <td 
                                    rowSpan={effectiveRowSpan} 
                                    className="border border-slate-300 px-2 py-1.5 text-xs align-middle"
                                  >
                                    {group.shared.plural.noun}
                                  </td>
                                </>
                              );
                            } else if (!group.articleRows.slice(0, artRowIdx).some(r => !r.pluralOverride)) {
                              // If all previous rows had overrides, we need to start new rowspan
                              const remainingNoOverride = group.articleRows.slice(artRowIdx).filter(r => !r.pluralOverride).length;
                              if (remainingNoOverride > 0) {
                                return (
                                  <>
                                    <td 
                                      rowSpan={remainingNoOverride} 
                                      className="border border-slate-300 px-2 py-1.5 text-xs align-middle"
                                    >
                                      <span className={state.settings.highlightEndings ? "font-semibold text-pink-700" : ""}>
                                        {group.shared.plural.adjective}
                                      </span>
                                    </td>
                                    <td 
                                      rowSpan={remainingNoOverride} 
                                      className="border border-slate-300 px-2 py-1.5 text-xs align-middle"
                                    >
                                      {group.shared.plural.noun}
                                    </td>
                                  </>
                                );
                              }
                            }
                            return null;
                          })()}
                          
                          {/* Notes / Prepositions column */}
                          {showLastColumn && isGlobalFirstRow && hasPrepositions && (
                            <td 
                              rowSpan={totalRows}
                              className="border border-slate-300 px-2 py-1.5 text-xs align-top text-slate-600"
                            >
                              {caseSection.prepositionHeading && (
                                <div className="font-bold mb-1">{caseSection.prepositionHeading}</div>
                              )}
                              {caseSection.prepositions?.map((p, i) => (
                                <div key={i} className="mb-1">{p}</div>
                              ))}
                            </td>
                          )}
                          
                          {/* Show notes for this group (nominativ/genitiv) */}
                          {showLastColumn && !hasPrepositions && isFirstRowInGroup && (
                            <td 
                              rowSpan={rowCount}
                              className="border border-slate-300 px-2 py-1.5 text-xs align-top text-slate-500"
                            >
                              {group.note || ''}
                            </td>
                          )}
                        </tr>
                      );
                    });
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Highlight Range Utilities ───────────────────────────────────────────────

/** Merge overlapping/adjacent [start, end) ranges and sort ascending */
function mergeRanges(ranges: [number, number][]): [number, number][] {
  if (ranges.length === 0) return [];
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    if (sorted[i][0] <= last[1]) {
      last[1] = Math.max(last[1], sorted[i][1]);
    } else {
      merged.push(sorted[i]);
    }
  }
  return merged;
}

/** Build a Set of highlighted char indices from ranges */
function hlIndexSet(ranges: [number, number][] | undefined, len: number): Set<number> {
  const s = new Set<number>();
  if (!ranges) return s;
  for (const [start, end] of ranges) {
    for (let i = start; i < end && i < len; i++) s.add(i);
  }
  return s;
}

/** Convert a Set of indices back to merged [start, end) ranges */
function setToRanges(s: Set<number>): [number, number][] {
  if (s.size === 0) return [];
  const sorted = [...s].sort((a, b) => a - b);
  const ranges: [number, number][] = [];
  let start = sorted[0];
  let end = sorted[0] + 1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end) {
      end++;
    } else {
      ranges.push([start, end]);
      start = sorted[i];
      end = sorted[i] + 1;
    }
  }
  ranges.push([start, end]);
  return ranges;
}

// ─── Highlight Edit Modal ────────────────────────────────────────────────────

function HighlightEditModal({
  open,
  onOpenChange,
  value,
  onValueChange,
  highlightRanges,
  onHighlightsChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onValueChange: (v: string) => void;
  highlightRanges?: [number, number][];
  onHighlightsChange: (ranges: [number, number][] | undefined) => void;
}) {
  const [editText, setEditText] = useState(value);
  const [hlSet, setHlSet] = useState<Set<number>>(() => hlIndexSet(highlightRanges, value.length));
  const [isDragging, setIsDragging] = useState(false);
  const [dragAction, setDragAction] = useState<"add" | "remove">("add");
  const [textEdited, setTextEdited] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setEditText(value);
      setHlSet(hlIndexSet(highlightRanges, value.length));
      setTextEdited(false);
    }
  }, [open, value, highlightRanges]);

  // When text changes, highlights become invalid → clear them
  const handleTextChange = (newText: string) => {
    setEditText(newText);
    setTextEdited(newText !== value);
    if (newText !== value) {
      setHlSet(new Set());
    } else {
      // Reverted to original → restore original highlights
      setHlSet(hlIndexSet(highlightRanges, value.length));
    }
  };

  const handleCharMouseDown = (idx: number) => {
    // Determine action: if char is highlighted → remove mode, else → add mode
    const action = hlSet.has(idx) ? "remove" : "add";
    setDragAction(action);
    setIsDragging(true);
    setHlSet((prev) => {
      const next = new Set(prev);
      if (action === "add") next.add(idx);
      else next.delete(idx);
      return next;
    });
  };

  const handleCharMouseEnter = (idx: number) => {
    if (!isDragging) return;
    setHlSet((prev) => {
      const next = new Set(prev);
      if (dragAction === "add") next.add(idx);
      else next.delete(idx);
      return next;
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Listen for mouseup globally to end drag
  useEffect(() => {
    if (!isDragging) return;
    const handler = () => setIsDragging(false);
    window.addEventListener("mouseup", handler);
    return () => window.removeEventListener("mouseup", handler);
  }, [isDragging]);

  const handleSave = () => {
    // Save text changes
    if (editText !== value) {
      onValueChange(editText);
    }
    // Save highlight changes
    const ranges = setToRanges(hlSet);
    onHighlightsChange(ranges.length > 0 ? ranges : undefined);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-sm font-medium">Wert & Hervorhebungen bearbeiten</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Text bearbeiten oder Buchstaben anklicken/ziehen um Hervorhebungen zu setzen.
          </DialogDescription>
        </DialogHeader>

        {/* Text input */}
        <div className="space-y-1.5">
          <Label className="text-xs">Text</Label>
          <Input
            value={editText}
            onChange={(e) => handleTextChange(e.target.value)}
            className="font-mono"
            autoFocus
          />
        </div>

        {/* Character-level highlight toggle */}
        {editText.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5">
              <Highlighter className="h-3 w-3" />
              Hervorhebungen {textEdited && <span className="text-amber-600 text-[10px]">(Text geändert — Hervorhebungen zurückgesetzt)</span>}
            </Label>
            <div
              className="flex flex-wrap gap-0 select-none border rounded-md p-2 bg-muted/30"
              onMouseUp={handleMouseUp}
            >
              {Array.from(editText).map((ch, i) => (
                <span
                  key={i}
                  onMouseDown={(e) => { e.preventDefault(); handleCharMouseDown(i); }}
                  onMouseEnter={() => handleCharMouseEnter(i)}
                  className={`
                    inline-flex items-center justify-center min-w-[1.5em] h-8 text-base font-mono cursor-pointer
                    border transition-colors
                    ${hlSet.has(i)
                      ? "bg-amber-200 border-amber-400 hover:bg-amber-300"
                      : "bg-white border-slate-200 hover:bg-slate-100"
                    }
                    ${ch === " " ? "text-slate-300" : ""}
                    first:rounded-l-sm last:rounded-r-sm
                  `}
                >
                  {ch === " " ? "·" : ch}
                </span>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">
              Klicken oder ziehen um Buchstaben hervorzuheben. Gelb = hervorgehoben (irregulär).
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={handleCancel}>
            Abbrechen
          </Button>
          <Button size="sm" onClick={handleSave}>
            Übernehmen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Highlightable Cell ─────────────────────────────────────────────────────

function HighlightableCell({
  value,
  onChange,
  highlightRanges,
  onHighlightsChange,
  className = "",
  showHighlights = false,
}: {
  value: string;
  onChange: (newValue: string) => void;
  highlightRanges?: [number, number][];
  onHighlightsChange?: (ranges: [number, number][] | undefined) => void;
  className?: string;
  showHighlights?: boolean;
}) {
  const [modalOpen, setModalOpen] = useState(false);

  // Render text with highlight segments
  const renderText = () => {
    if (!value) return <span className="text-slate-300 italic">—</span>;

    if (!showHighlights || !highlightRanges || highlightRanges.length === 0) {
      return <>{value}</>;
    }

    const hlSet_ = hlIndexSet(highlightRanges, value.length);
    const segments: { text: string; highlighted: boolean }[] = [];
    for (let i = 0; i < value.length; i++) {
      const hl = hlSet_.has(i);
      if (segments.length > 0 && segments[segments.length - 1].highlighted === hl) {
        segments[segments.length - 1].text += value[i];
      } else {
        segments.push({ text: value[i], highlighted: hl });
      }
    }

    return (
      <>
        {segments.map((seg, i) =>
          seg.highlighted ? (
            <span key={i} className="bg-amber-200 rounded-sm">{seg.text}</span>
          ) : (
            <span key={i}>{seg.text}</span>
          )
        )}
      </>
    );
  };

  return (
    <>
      <span
        onClick={() => setModalOpen(true)}
        className={`cursor-pointer hover:bg-blue-50 rounded px-0.5 -mx-0.5 ${className}`}
        title="Click to edit"
      >
        {renderText()}
      </span>
      {modalOpen && onHighlightsChange && showHighlights ? (
        <HighlightEditModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          value={value}
          onValueChange={onChange}
          highlightRanges={highlightRanges}
          onHighlightsChange={onHighlightsChange}
        />
      ) : modalOpen ? (
        // Simple inline edit fallback when highlights not enabled
        <SimpleEditModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          value={value}
          onValueChange={onChange}
        />
      ) : null}
    </>
  );
}

/** Simple text-only edit modal (when highlights are disabled) */
function SimpleEditModal({
  open,
  onOpenChange,
  value,
  onValueChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onValueChange: (v: string) => void;
}) {
  const [editText, setEditText] = useState(value);

  useEffect(() => {
    if (open) setEditText(value);
  }, [open, value]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-sm font-medium">Wert bearbeiten</DialogTitle>
          <DialogDescription className="sr-only">Text bearbeiten</DialogDescription>
        </DialogHeader>
        <Input
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          className="font-mono"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (editText !== value) onValueChange(editText);
              onOpenChange(false);
            }
          }}
        />
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button size="sm" onClick={() => {
            if (editText !== value) onValueChange(editText);
            onOpenChange(false);
          }}>
            Übernehmen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Conjugation Table View ─────────────────────────────────────────────────

type ConjFieldName = "main" | "prefix" | "reflexive" | "auxiliary" | "partizip";

interface SingleConjugationTableProps {
  tableData: VerbConjugationTable;
  tableIndex: number;
  showIrregularHighlights: boolean;
  onCellChange: (
    tableIndex: number,
    personKey: PersonKey,
    tense: VerbTense,
    field: ConjFieldName,
    value: string
  ) => void;
  onHighlightsChange: (
    tableIndex: number,
    personKey: PersonKey,
    tense: VerbTense,
    field: keyof TenseHighlights,
    ranges: [number, number][] | undefined
  ) => void;
  onInfinitiveChange: (tableIndex: number, verb: string) => void;
}

function SingleConjugationTable({ tableData, tableIndex, showIrregularHighlights, onCellChange, onHighlightsChange, onInfinitiveChange }: SingleConjugationTableProps) {
  const locale = "de";
  const tenses: VerbTense[] = ["praesens", "perfekt", "praeteritum"];
  
  // Use static row definitions split by section
  const singularRows = CONJUGATION_ROWS.filter(r => r.section === "singular");
  const pluralRows = CONJUGATION_ROWS.filter(r => r.section === "plural");
  
  // Check if verb is separable and/or reflexive
  const hasSeparablePrefix = tableData.isSeparable && !!tableData.separablePrefix;
  const isReflexive = tableData.isReflexive || false;
  
  // Calculate columns per tense:
  // - Perfekt: 2 columns (aux | partizip) or 3 if reflexive (aux | reflexive | partizip)
  // - Präsens/Präteritum:
  //   - 1 column if not separable and not reflexive (main)
  //   - 2 columns if separable XOR reflexive
  //   - 3 columns if separable AND reflexive (main | reflexive | prefix)
  const getColsForTense = (tense: VerbTense) => {
    if (tense === "perfekt") {
      return isReflexive ? 3 : 2;
    }
    if (hasSeparablePrefix && isReflexive) return 3;
    if (hasSeparablePrefix || isReflexive) return 2;
    return 1;
  };
  
  const totalTenseCols = tenses.reduce((sum, t) => sum + getColsForTense(t), 0);
  const totalCols = 3 + totalTenseCols;
  
  // Helper to render a data row using static definition and AI conjugations
  const renderDataRow = (rowDef: StaticRowDef, idx: number) => {
    const personDisplay = `${rowDef.person}. Person`;
    const conjugations = tableData.conjugations?.[rowDef.personKey];
    const personKey = rowDef.personKey;
    
    // Helper to create onChange handler
    const handleChange = (tense: VerbTense, field: ConjFieldName) => 
      (value: string) => onCellChange(tableIndex, personKey, tense, field, value);
    
    // Helper to create onHighlightsChange handler
    const handleHlChange = (tense: VerbTense, field: keyof TenseHighlights) =>
      (ranges: [number, number][] | undefined) => onHighlightsChange(tableIndex, personKey, tense, field, ranges);
    
    return (
      <tr key={idx}>
        <td className="border border-slate-300 px-2 py-1.5 text-[9px]">
          {personDisplay}
        </td>
        <td className="border border-slate-300 px-2 py-1.5 text-[9px] text-slate-500">
          {rowDef.formality || ""}
        </td>
        <td className="border border-slate-300 px-2 py-1.5 text-xs font-medium">
          {rowDef.pronoun}
        </td>
        {tenses.map((tense) => {
          const tenseData = conjugations?.[tense];
          
          // Tense background colors - very light earth tones
          const tenseColors = {
            praesens: "bg-[#fcf9f6]",     // very light warm sand
            perfekt: "bg-[#f9faf8]",      // very light sage
            praeteritum: "bg-[#fef9f2]",  // very light honey
          };
          const bgClass = tenseColors[tense];
          
          if (tense === "perfekt") {
            // Perfekt: aux | partizip OR aux | reflexive | partizip
            const aux = tenseData?.auxiliary || "";
            const refl = tenseData?.reflexive || "";
            const part = tenseData?.partizip || "";
            
            if (isReflexive) {
              return (
                <React.Fragment key={tense}>
                  <td className={`border border-slate-300 px-2 py-1.5 text-xs ${bgClass}`}>
                    <HighlightableCell 
                      value={aux} 
                      onChange={handleChange(tense, "auxiliary")}
                      highlightRanges={tenseData?.highlights?.auxiliary}
                      onHighlightsChange={handleHlChange(tense, "auxiliary")}
                      showHighlights={showIrregularHighlights}
                    />
                  </td>
                  <td className={`border border-slate-300 px-2 py-1.5 text-xs ${bgClass}`}>
                    <HighlightableCell 
                      value={refl} 
                      onChange={handleChange(tense, "reflexive")}
                      highlightRanges={tenseData?.highlights?.reflexive}
                      onHighlightsChange={handleHlChange(tense, "reflexive")}
                      showHighlights={showIrregularHighlights}
                    />
                  </td>
                  <td className={`border border-slate-300 px-2 py-1.5 text-xs ${bgClass}`}>
                    <HighlightableCell 
                      value={part} 
                      onChange={handleChange(tense, "partizip")}
                      highlightRanges={tenseData?.highlights?.partizip}
                      onHighlightsChange={handleHlChange(tense, "partizip")}
                      showHighlights={showIrregularHighlights}
                    />
                  </td>
                </React.Fragment>
              );
            } else {
              return (
                <React.Fragment key={tense}>
                  <td className={`border border-slate-300 px-2 py-1.5 text-xs ${bgClass}`}>
                    <HighlightableCell 
                      value={aux} 
                      onChange={handleChange(tense, "auxiliary")}
                      highlightRanges={tenseData?.highlights?.auxiliary}
                      onHighlightsChange={handleHlChange(tense, "auxiliary")}
                      showHighlights={showIrregularHighlights}
                    />
                  </td>
                  <td className={`border border-slate-300 px-2 py-1.5 text-xs ${bgClass}`}>
                    <HighlightableCell 
                      value={part} 
                      onChange={handleChange(tense, "partizip")}
                      highlightRanges={tenseData?.highlights?.partizip}
                      onHighlightsChange={handleHlChange(tense, "partizip")}
                      showHighlights={showIrregularHighlights}
                    />
                  </td>
                </React.Fragment>
              );
            }
          } else {
            // Präsens or Präteritum
            const main = tenseData?.main || "";
            const refl = tenseData?.reflexive || "";
            const prefix = tenseData?.prefix || "";
            
            if (hasSeparablePrefix && isReflexive) {
              // 3 columns: main | reflexive | prefix
              return (
                <React.Fragment key={tense}>
                  <td className={`border border-slate-300 px-2 py-1.5 text-xs ${bgClass}`}>
                    <HighlightableCell 
                      value={main} 
                      onChange={handleChange(tense, "main")}
                      highlightRanges={tenseData?.highlights?.main}
                      onHighlightsChange={handleHlChange(tense, "main")}
                      showHighlights={showIrregularHighlights}
                    />
                  </td>
                  <td className={`border border-slate-300 px-2 py-1.5 text-xs ${bgClass}`}>
                    <HighlightableCell 
                      value={refl} 
                      onChange={handleChange(tense, "reflexive")}
                      highlightRanges={tenseData?.highlights?.reflexive}
                      onHighlightsChange={handleHlChange(tense, "reflexive")}
                      showHighlights={showIrregularHighlights}
                    />
                  </td>
                  <td className={`border border-slate-300 px-2 py-1.5 text-xs ${bgClass}`}>
                    <HighlightableCell 
                      value={prefix} 
                      onChange={handleChange(tense, "prefix")}
                      highlightRanges={tenseData?.highlights?.prefix}
                      onHighlightsChange={handleHlChange(tense, "prefix")}
                      showHighlights={showIrregularHighlights}
                    />
                  </td>
                </React.Fragment>
              );
            } else if (hasSeparablePrefix) {
              // 2 columns: main | prefix
              return (
                <React.Fragment key={tense}>
                  <td className={`border border-slate-300 px-2 py-1.5 text-xs ${bgClass}`}>
                    <HighlightableCell 
                      value={main} 
                      onChange={handleChange(tense, "main")}
                      highlightRanges={tenseData?.highlights?.main}
                      onHighlightsChange={handleHlChange(tense, "main")}
                      showHighlights={showIrregularHighlights}
                    />
                  </td>
                  <td className={`border border-slate-300 px-2 py-1.5 text-xs ${bgClass}`}>
                    <HighlightableCell 
                      value={prefix} 
                      onChange={handleChange(tense, "prefix")}
                      highlightRanges={tenseData?.highlights?.prefix}
                      onHighlightsChange={handleHlChange(tense, "prefix")}
                      showHighlights={showIrregularHighlights}
                    />
                  </td>
                </React.Fragment>
              );
            } else if (isReflexive) {
              // 2 columns: main | reflexive
              return (
                <React.Fragment key={tense}>
                  <td className={`border border-slate-300 px-2 py-1.5 text-xs ${bgClass}`}>
                    <HighlightableCell 
                      value={main} 
                      onChange={handleChange(tense, "main")}
                      highlightRanges={tenseData?.highlights?.main}
                      onHighlightsChange={handleHlChange(tense, "main")}
                      showHighlights={showIrregularHighlights}
                    />
                  </td>
                  <td className={`border border-slate-300 px-2 py-1.5 text-xs ${bgClass}`}>
                    <HighlightableCell 
                      value={refl} 
                      onChange={handleChange(tense, "reflexive")}
                      highlightRanges={tenseData?.highlights?.reflexive}
                      onHighlightsChange={handleHlChange(tense, "reflexive")}
                      showHighlights={showIrregularHighlights}
                    />
                  </td>
                </React.Fragment>
              );
            } else {
              // 1 column: main only
              return (
                <td key={tense} className={`border border-slate-300 px-2 py-1.5 text-xs ${bgClass}`}>
                  <HighlightableCell 
                    value={main} 
                    onChange={handleChange(tense, "main")}
                    highlightRanges={tenseData?.highlights?.main}
                    onHighlightsChange={handleHlChange(tense, "main")}
                    showHighlights={showIrregularHighlights}
                  />
                </td>
              );
            }
          }
        })}
      </tr>
    );
  };
  
  // Calculate column widths - each tense gets equal share of remaining space
  const col1Width = "6.5%"; // Person
  const col2Width = "6.5%"; // Formality
  const col3Width = "9.5%"; // Pronoun
  const remainingWidth = 77.5; // 100% - 22.5% for base cols
  const tenseWidth = remainingWidth / tenses.length; // Equal width per tense
  
  // Get column widths as array for a tense
  // For 3 columns: Präsens/Präteritum = 50%/25%/25%, Perfekt = 25%/25%/50%
  // For 2 columns: 50%/50%
  // For 1 column: 100%
  const getColWidths = (tense: VerbTense): string[] => {
    const cols = getColsForTense(tense);
    if (cols === 3) {
      if (tense === "perfekt") {
        // aux | reflexive | partizip = 25%/25%/50%
        return [
          `${tenseWidth * 0.25}%`,
          `${tenseWidth * 0.25}%`,
          `${tenseWidth * 0.50}%`,
        ];
      } else {
        // main | reflexive | prefix = 50%/25%/25%
        return [
          `${tenseWidth * 0.50}%`,
          `${tenseWidth * 0.25}%`,
          `${tenseWidth * 0.25}%`,
        ];
      }
    } else if (cols === 2) {
      return [
        `${tenseWidth * 0.50}%`,
        `${tenseWidth * 0.50}%`,
      ];
    } else {
      return [`${tenseWidth}%`];
    }
  };

  return (
    <div className="space-y-4">
      <div className="mb-2">
        <h2 className="text-base font-bold">
          <HighlightableCell 
            value={tableData.input.verb} 
            onChange={(v: string) => onInfinitiveChange(tableIndex, v)}
          />
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <colgroup>
            <col style={{ width: col1Width }} /> {/* Person */}
            <col style={{ width: col2Width }} /> {/* Formalität */}
            <col style={{ width: col3Width }} /> {/* Pronoun */}
            {/* Dynamic columns per tense */}
            {tenses.map((tense) => {
              const widths = getColWidths(tense);
              return widths.map((width, i) => (
                <col key={`${tense}-${i}`} style={{ width }} />
              ));
            })}
          </colgroup>
          <thead>
            <tr>
              <th colSpan={3} className="border border-slate-300 px-2 py-1.5 text-left font-semibold text-xs">
              </th>
              {tenses.map((tense) => (
                <th 
                  key={tense}
                  colSpan={getColsForTense(tense)}
                  className="bg-slate-200 border border-slate-300 px-2 py-1.5 text-left font-semibold text-xs"
                >
                  {TENSE_LABELS[tense][locale]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Singular section */}
            <tr>
              <td colSpan={totalCols} className="border border-slate-300 px-2 py-1 text-[9px] font-bold">
                SINGULAR
              </td>
            </tr>
            {singularRows.map((row, idx) => renderDataRow(row, idx))}
            
            {/* Plural section */}
            <tr>
              <td colSpan={totalCols} className="border border-slate-300 px-2 py-1 text-[9px] font-bold">
                PLURAL
              </td>
            </tr>
            {pluralRows.map((row, idx) => renderDataRow(row, idx))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ConjugationTableView() {
  const { state, dispatch } = useGrammarTable();
  const t = useTranslations("grammarTableEditor");

  const handleCellChange = useCallback((
    tableIndex: number,
    personKey: PersonKey,
    tense: VerbTense,
    field: "main" | "prefix" | "reflexive" | "auxiliary" | "partizip",
    value: string
  ) => {
    // Partizip II is the same for all persons in Perfekt — sync text across all
    if (tense === "perfekt" && field === "partizip") {
      const allPersonKeys: PersonKey[] = ["ich", "du", "Sie_sg", "er_sie_es", "wir", "ihr", "Sie_pl", "sie_pl"];
      for (const pk of allPersonKeys) {
        dispatch({
          type: "UPDATE_CONJUGATION_CELL",
          payload: { tableIndex, personKey: pk, tense, field, value },
        });
      }
    } else {
      dispatch({
        type: "UPDATE_CONJUGATION_CELL",
        payload: { tableIndex, personKey, tense, field, value },
      });
    }
  }, [dispatch]);

  const handleHighlightsChange = useCallback((
    tableIndex: number,
    personKey: PersonKey,
    tense: VerbTense,
    field: keyof TenseHighlights,
    ranges: [number, number][] | undefined
  ) => {
    // Partizip II is the same for all persons in Perfekt — sync highlights across all
    if (tense === "perfekt" && field === "partizip") {
      const allPersonKeys: PersonKey[] = ["ich", "du", "Sie_sg", "er_sie_es", "wir", "ihr", "Sie_pl", "sie_pl"];
      for (const pk of allPersonKeys) {
        dispatch({
          type: "UPDATE_CONJUGATION_HIGHLIGHTS",
          payload: { tableIndex, personKey: pk, tense, field, ranges },
        });
      }
    } else {
      dispatch({
        type: "UPDATE_CONJUGATION_HIGHLIGHTS",
        payload: { tableIndex, personKey, tense, field, ranges },
      });
    }
  }, [dispatch]);

  const handleInfinitiveChange = useCallback((
    tableIndex: number,
    verb: string
  ) => {
    dispatch({
      type: "UPDATE_INFINITIVE",
      payload: { tableIndex, verb },
    });
  }, [dispatch]);

  if (!state.tableData) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p className="text-center">
          {t("noTableYet")}
          <br />
          <span className="text-sm">{t("clickGenerate")}</span>
        </p>
      </div>
    );
  }

  // Cast to VerbConjugationTable[] (array of tables for multiple verbs)
  const tablesUnsorted = state.tableData as VerbConjugationTable[];
  
  if (!Array.isArray(tablesUnsorted) || tablesUnsorted.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p className="text-center">{t("noTableYet")}</p>
      </div>
    );
  }

  // Sort verbs alphabetically by infinitive, keeping track of original indices
  const tables = tablesUnsorted
    .map((table, originalIdx) => ({ table, originalIdx }))
    .sort((a, b) => a.table.input.verb.localeCompare(b.table.input.verb, "de"));

  return (
    <div className="space-y-4">
      {tables.map(({ table, originalIdx }) => (
        <SingleConjugationTable 
          key={originalIdx} 
          tableData={table}
          tableIndex={originalIdx}
          showIrregularHighlights={state.settings.showIrregularHighlights ?? false}
          onCellChange={handleCellChange}
          onHighlightsChange={handleHighlightsChange}
          onInfinitiveChange={handleInfinitiveChange}
        />
      ))}
    </div>
  );
}

// ─── Toolbar ─────────────────────────────────────────────────

function EditorToolbar() {
  const { state, dispatch, generate, save } = useGrammarTable();
  const t = useTranslations("grammarTableEditor");
  const tc = useTranslations("common");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Check if we can generate based on table type
  const canGenerate = state.tableType === "verb-conjugation"
    ? (state.conjugationInput?.verbs ?? []).some(v => v.trim().length > 0)
    : (
        state.declinationInput?.maskulin?.adjective &&
        state.declinationInput?.maskulin?.noun &&
        state.declinationInput?.neutrum?.adjective &&
        state.declinationInput?.neutrum?.noun &&
        state.declinationInput?.feminin?.adjective &&
        state.declinationInput?.feminin?.noun &&
        state.declinationInput?.plural?.adjective &&
        state.declinationInput?.plural?.noun
      );

  const handleDownloadPdf = useCallback(async (engine?: "puppeteer" | "react-pdf") => {
    if (!state.documentId) {
      alert(t("saveFirst"));
      return;
    }
    setIsGeneratingPdf(true);
    try {
      const endpoint = engine === "react-pdf"
        ? `/api/worksheets/${state.documentId}/grammar-table-pdf-v2`
        : `/api/worksheets/${state.documentId}/grammar-table-pdf`;
      const res = await authFetch(endpoint, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json();
        alert(t("pdfFailed", { error: err.error }));
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${state.title || "grammar-table"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF download failed:", err);
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [state.documentId, state.title, t]);

  return (
    <div className="flex items-center justify-between p-4 border-b bg-background">
      <div className="flex items-center gap-4">
        {/* Table type selector */}
        <Select
          value={state.tableType}
          onValueChange={(value: GrammarTableType) =>
            dispatch({ type: "SET_TABLE_TYPE", payload: value })
          }
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="adjective-declination">{TABLE_TYPE_LABELS["adjective-declination"].de}</SelectItem>
            <SelectItem value="verb-conjugation">{TABLE_TYPE_LABELS["verb-conjugation"].de}</SelectItem>
          </SelectContent>
        </Select>

        <Input
          value={state.title}
          onChange={(e) => dispatch({ type: "SET_TITLE", payload: e.target.value })}
          className="text-lg font-semibold w-64"
          placeholder={t("untitledTable")}
        />
        {state.isDirty && (
          <Badge variant="outline" className="text-xs">
            {tc("unsaved")}
          </Badge>
        )}

        {/* Brand selector */}
        <Select
          value={state.settings.brand || "edoomio"}
          onValueChange={(value: string) =>
            dispatch({
              type: "UPDATE_SETTINGS",
              payload: {
                brand: value as Brand,
                brandSettings: DEFAULT_BRAND_SETTINGS[value as Brand],
              },
            })
          }
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="edoomio">edoomio</SelectItem>
            <SelectItem value="lingostar">lingostar</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={generate}
          disabled={!canGenerate || state.isGenerating}
          className="gap-2"
        >
          {state.isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : state.tableData ? (
            <RefreshCw className="h-4 w-4" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {state.tableData ? t("regenerate") : t("generate")}
        </Button>

        <Separator orientation="vertical" className="h-6" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownloadPdf()}
              disabled={isGeneratingPdf || !state.documentId || !state.tableData}
              className="gap-2"
            >
              {isGeneratingPdf ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              {t("downloadPdf")}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {t("downloadPdfTooltip")}
          </TooltipContent>
        </Tooltip>

        {state.tableType === "verb-conjugation" && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownloadPdf("react-pdf")}
                disabled={isGeneratingPdf || !state.documentId || !state.tableData}
                className="gap-2 border-dashed"
              >
                {isGeneratingPdf ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                PDF v2
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              PDF export with react-pdf (test)
            </TooltipContent>
          </Tooltip>
        )}

        <Separator orientation="vertical" className="h-6" />

        <Button
          variant="default"
          size="sm"
          onClick={save}
          disabled={state.isSaving || !state.isDirty}
          className="gap-2"
        >
          {state.isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {tc("save")}
        </Button>
      </div>
    </div>
  );
}

// ─── Main Editor Content ─────────────────────────────────────

function EditorContent() {
  const { state } = useGrammarTable();
  const t = useTranslations("grammarTableEditor");

  return (
    <div className="flex flex-1 min-h-0 h-full">
      {/* Left sidebar: Input form */}
      <div className="w-80 border-r bg-slate-50/50 flex flex-col h-full">
        <ScrollArea className="flex-1 h-full">
          <div className="p-4 space-y-6">
            {state.tableType === "verb-conjugation" ? (
              <ConjugationInputPanel />
            ) : (
              <DeclinationInputPanel />
            )}
            <Separator />
            <SettingsPanel />
          </div>
        </ScrollArea>
      </div>

      {/* Main content: Table preview */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <ScrollArea className="flex-1 h-full">
          <div className="p-8 max-w-5xl mx-auto">
            {state.isGenerating ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mb-4" />
                <p>{t("generating")}</p>
              </div>
            ) : state.tableType === "verb-conjugation" ? (
              <ConjugationTableView />
            ) : (
              <DeclinationTableView />
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

// ─── Main Editor Component ───────────────────────────────────

function GrammarTableEditorInner({ document }: { document?: GrammarTableDocument }) {
  const { dispatch } = useGrammarTable();

  useEffect(() => {
    if (document) {
      // Determine which input type based on tableType
      const isConjugation = document.tableType === "verb-conjugation";
      
      dispatch({
        type: "LOAD",
        payload: {
          id: document.id,
          title: document.title,
          slug: document.slug,
          tableType: document.tableType,
          declinationInput: !isConjugation ? document.input as DeclinationInput : undefined,
          conjugationInput: isConjugation ? document.input as ConjugationInput : undefined,
          tableData: document.tableData,
          settings: document.settings,
          published: document.published,
        },
      });
    }
  }, [document, dispatch]);

  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen overflow-hidden">
        <EditorToolbar />
        <EditorContent />
      </div>
    </TooltipProvider>
  );
}

export function GrammarTableEditor({ documentId }: { documentId?: string }) {
  const [document, setDocument] = useState<GrammarTableDocument | undefined>();
  const [loading, setLoading] = useState(!!documentId);
  const t = useTranslations("common");

  useEffect(() => {
    if (!documentId) return;

    const fetchDocument = async () => {
      try {
        const res = await authFetch(`/api/worksheets/${documentId}`);
        if (res.ok) {
          const data = await res.json();
          // Transform the API response to our document format
          const tableType = data.blocks?.tableType || "adjective-declination";
          const isConj = tableType === "verb-conjugation";
          setDocument({
            id: data.id,
            title: data.title,
            description: data.description,
            slug: data.slug,
            tableType,
            input: isConj
              ? (data.blocks?.conjugationInput || data.blocks?.input || { verbs: [""] })
              : (data.blocks?.declinationInput || data.blocks?.input || {
                  maskulin: { adjective: "", noun: "" },
                  neutrum: { adjective: "", noun: "" },
                  feminin: { adjective: "", noun: "" },
                  plural: { adjective: "", noun: "" },
                }),
            tableData: data.blocks?.tableData || null,
            settings: data.settings || {},
            published: data.published,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          });
        }
      } catch (err) {
        console.error("Failed to fetch document:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [documentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">{t("loading")}</span>
      </div>
    );
  }

  return (
    <GrammarTableProvider>
      <GrammarTableEditorInner document={document} />
    </GrammarTableProvider>
  );
}
