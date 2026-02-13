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
} from "lucide-react";

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

// ─── Editable Cell ───────────────────────────────────────────────────────────

function EditableCell({ 
  value, 
  onChange, 
  className = "",
  highlight = false,
}: { 
  value: string; 
  onChange: (newValue: string) => void;
  className?: string;
  highlight?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  
  const handleBlur = () => {
    setIsEditing(false);
    if (editValue !== value) {
      onChange(editValue);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      setIsEditing(false);
      if (editValue !== value) {
        onChange(editValue);
      }
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setEditValue(value);
    }
  };
  
  if (isEditing) {
    return (
      <input
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        autoFocus
        className={`w-full bg-transparent outline-none border-b border-blue-400 ${className}`}
      />
    );
  }
  
  return (
    <span 
      onClick={() => {
        setIsEditing(true);
        setEditValue(value);
      }}
      className={`cursor-pointer hover:bg-blue-50 rounded px-0.5 -mx-0.5 ${highlight ? "font-semibold text-pink-700" : ""} ${className}`}
      title="Click to edit"
    >
      {value || <span className="text-slate-300 italic">—</span>}
    </span>
  );
}

// ─── Conjugation Table View ─────────────────────────────────────────────────

interface SingleConjugationTableProps {
  tableData: VerbConjugationTable;
  tableIndex: number;
  settings: { highlightEndings: boolean };
  onCellChange: (
    tableIndex: number,
    personKey: PersonKey,
    tense: VerbTense,
    field: "main" | "prefix" | "reflexive" | "auxiliary" | "partizip",
    value: string
  ) => void;
  onInfinitiveChange: (tableIndex: number, verb: string) => void;
}

function SingleConjugationTable({ tableData, tableIndex, settings, onCellChange, onInfinitiveChange }: SingleConjugationTableProps) {
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
    const handleChange = (tense: VerbTense, field: "main" | "prefix" | "reflexive" | "auxiliary" | "partizip") => 
      (value: string) => onCellChange(tableIndex, personKey, tense, field, value);
    
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
                    <EditableCell 
                      value={aux} 
                      onChange={handleChange(tense, "auxiliary")}
                      highlight={settings.highlightEndings}
                    />
                  </td>
                  <td className={`border border-slate-300 px-2 py-1.5 text-xs ${bgClass}`}>
                    <EditableCell 
                      value={refl} 
                      onChange={handleChange(tense, "reflexive")}
                    />
                  </td>
                  <td className={`border border-slate-300 px-2 py-1.5 text-xs ${bgClass}`}>
                    <EditableCell 
                      value={part} 
                      onChange={handleChange(tense, "partizip")}
                      highlight={settings.highlightEndings}
                    />
                  </td>
                </React.Fragment>
              );
            } else {
              return (
                <React.Fragment key={tense}>
                  <td className={`border border-slate-300 px-2 py-1.5 text-xs ${bgClass}`}>
                    <EditableCell 
                      value={aux} 
                      onChange={handleChange(tense, "auxiliary")}
                      highlight={settings.highlightEndings}
                    />
                  </td>
                  <td className={`border border-slate-300 px-2 py-1.5 text-xs ${bgClass}`}>
                    <EditableCell 
                      value={part} 
                      onChange={handleChange(tense, "partizip")}
                      highlight={settings.highlightEndings}
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
                    <EditableCell 
                      value={main} 
                      onChange={handleChange(tense, "main")}
                      highlight={settings.highlightEndings}
                    />
                  </td>
                  <td className={`border border-slate-300 px-2 py-1.5 text-xs ${bgClass}`}>
                    <EditableCell 
                      value={refl} 
                      onChange={handleChange(tense, "reflexive")}
                    />
                  </td>
                  <td className={`border border-slate-300 px-2 py-1.5 text-xs ${bgClass}`}>
                    <EditableCell 
                      value={prefix} 
                      onChange={handleChange(tense, "prefix")}
                    />
                  </td>
                </React.Fragment>
              );
            } else if (hasSeparablePrefix) {
              // 2 columns: main | prefix
              return (
                <React.Fragment key={tense}>
                  <td className={`border border-slate-300 px-2 py-1.5 text-xs ${bgClass}`}>
                    <EditableCell 
                      value={main} 
                      onChange={handleChange(tense, "main")}
                      highlight={settings.highlightEndings}
                    />
                  </td>
                  <td className={`border border-slate-300 px-2 py-1.5 text-xs ${bgClass}`}>
                    <EditableCell 
                      value={prefix} 
                      onChange={handleChange(tense, "prefix")}
                    />
                  </td>
                </React.Fragment>
              );
            } else if (isReflexive) {
              // 2 columns: main | reflexive
              return (
                <React.Fragment key={tense}>
                  <td className={`border border-slate-300 px-2 py-1.5 text-xs ${bgClass}`}>
                    <EditableCell 
                      value={main} 
                      onChange={handleChange(tense, "main")}
                      highlight={settings.highlightEndings}
                    />
                  </td>
                  <td className={`border border-slate-300 px-2 py-1.5 text-xs ${bgClass}`}>
                    <EditableCell 
                      value={refl} 
                      onChange={handleChange(tense, "reflexive")}
                    />
                  </td>
                </React.Fragment>
              );
            } else {
              // 1 column: main only
              return (
                <td key={tense} className={`border border-slate-300 px-2 py-1.5 text-xs ${bgClass}`}>
                  <EditableCell 
                    value={main} 
                    onChange={handleChange(tense, "main")}
                    highlight={settings.highlightEndings}
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
          <EditableCell 
            value={tableData.input.verb} 
            onChange={(v) => onInfinitiveChange(tableIndex, v)}
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
    dispatch({
      type: "UPDATE_CONJUGATION_CELL",
      payload: { tableIndex, personKey, tense, field, value },
    });
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
  const tables = state.tableData as VerbConjugationTable[];
  
  if (!Array.isArray(tables) || tables.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p className="text-center">{t("noTableYet")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tables.map((table, idx) => (
        <SingleConjugationTable 
          key={idx} 
          tableData={table}
          tableIndex={idx}
          settings={{ highlightEndings: state.settings.highlightEndings }}
          onCellChange={handleCellChange}
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

  const handleDownloadPdf = useCallback(async () => {
    if (!state.documentId) {
      alert(t("saveFirst"));
      return;
    }
    setIsGeneratingPdf(true);
    try {
      const res = await authFetch(`/api/worksheets/${state.documentId}/grammar-table-pdf`, {
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
              onClick={handleDownloadPdf}
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
          setDocument({
            id: data.id,
            title: data.title,
            description: data.description,
            slug: data.slug,
            tableType: data.blocks?.tableType || "adjective-declination",
            input: data.blocks?.input || {
              maskulin: { adjective: "", noun: "" },
              neutrum: { adjective: "", noun: "" },
              feminin: { adjective: "", noun: "" },
              plural: { adjective: "", noun: "" },
            },
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
