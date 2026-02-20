"use client";

import React, { createContext, useContext, useReducer, useCallback } from "react";
import { authFetch } from "@/lib/auth-fetch";
import {
  GrammarTableType,
  GrammarTableSettings,
  GrammarTableInput,
  GrammarTableData,
  DeclinationInput,
  ConjugationInput,
  VerbPrepositionInput,
  AdjectiveDeclinationTable,
  VerbConjugationTable,
  DEFAULT_GRAMMAR_TABLE_SETTINGS,
  DEFAULT_DECLINATION_INPUT,
  DEFAULT_CONJUGATION_INPUT,
  DEFAULT_VERB_PREPOSITION_INPUT,
  PersonKey,
  VerbTense,
  TenseHighlights,
} from "@/types/grammar-table";

// ─── State ───────────────────────────────────────────────────
interface GrammarTableState {
  documentId: string | null;
  title: string;
  slug: string;
  tableType: GrammarTableType;
  declinationInput: DeclinationInput;
  conjugationInput: ConjugationInput;
  verbPrepositionInput: VerbPrepositionInput;
  tableData: GrammarTableData | null;
  settings: GrammarTableSettings;
  isDirty: boolean;
  isSaving: boolean;
  isGenerating: boolean;
  published: boolean;
}

const initialState: GrammarTableState = {
  documentId: null,
  title: "Grammatiktabelle",
  slug: "",
  tableType: "adjective-declination",
  declinationInput: DEFAULT_DECLINATION_INPUT,
  conjugationInput: DEFAULT_CONJUGATION_INPUT,
  verbPrepositionInput: DEFAULT_VERB_PREPOSITION_INPUT,
  tableData: null,
  settings: DEFAULT_GRAMMAR_TABLE_SETTINGS,
  isDirty: false,
  isSaving: false,
  isGenerating: false,
  published: false,
};

// ─── Actions ─────────────────────────────────────────────────
type GrammarTableAction =
  | { type: "LOAD"; payload: { 
      id: string; 
      title: string; 
      slug: string; 
      tableType: GrammarTableType;
      declinationInput?: DeclinationInput;
      conjugationInput?: ConjugationInput;
      verbPrepositionInput?: VerbPrepositionInput;
      tableData: GrammarTableData | null;
      settings: GrammarTableSettings; 
      published: boolean 
    } }
  | { type: "SET_TITLE"; payload: string }
  | { type: "SET_TABLE_TYPE"; payload: GrammarTableType }
  | { type: "UPDATE_DECLINATION_INPUT"; payload: Partial<DeclinationInput> }
  | { type: "UPDATE_CONJUGATION_INPUT"; payload: Partial<ConjugationInput> }
  | { type: "UPDATE_VERB_PREPOSITION_INPUT"; payload: Partial<VerbPrepositionInput> }
  | { type: "SET_TABLE_DATA"; payload: GrammarTableData }
  | { type: "MERGE_TABLE_DATA"; payload: VerbConjugationTable[] }
  | { type: "CLEAR_TABLE_DATA" }
  | { type: "UPDATE_SETTINGS"; payload: Partial<GrammarTableSettings> }
  | { type: "SET_SAVING"; payload: boolean }
  | { type: "SET_GENERATING"; payload: boolean }
  | { type: "MARK_SAVED" }
  | { type: "SET_PUBLISHED"; payload: boolean }
  | { type: "UPDATE_CONJUGATION_CELL"; payload: { 
      tableIndex: number;
      personKey: PersonKey;
      tense: VerbTense;
      field: "main" | "prefix" | "reflexive" | "auxiliary" | "partizip";
      value: string;
    } }
  | { type: "UPDATE_INFINITIVE"; payload: { tableIndex: number; verb: string } }
  | { type: "SET_THIRD_PERSON_SINGULAR_ONLY"; payload: { tableIndex: number; value: boolean } }
  | { type: "SET_THIRD_PERSON_PLURAL_ONLY"; payload: { tableIndex: number; value: boolean } }
  | { type: "UPDATE_CONJUGATION_HIGHLIGHTS"; payload: {
      tableIndex: number;
      personKey: PersonKey;
      tense: VerbTense;
      field: keyof TenseHighlights;
      ranges: [number, number][] | undefined;
    } }
  | { type: "RESET" };

// ─── Reducer ─────────────────────────────────────────────────
function grammarTableReducer(state: GrammarTableState, action: GrammarTableAction): GrammarTableState {
  switch (action.type) {
    case "LOAD":
      return {
        ...state,
        documentId: action.payload.id,
        title: action.payload.title,
        slug: action.payload.slug,
        tableType: action.payload.tableType,
        declinationInput: action.payload.declinationInput || DEFAULT_DECLINATION_INPUT,
        conjugationInput: action.payload.conjugationInput || DEFAULT_CONJUGATION_INPUT,
        verbPrepositionInput: action.payload.verbPrepositionInput || DEFAULT_VERB_PREPOSITION_INPUT,
        tableData: action.payload.tableData,
        settings: { ...DEFAULT_GRAMMAR_TABLE_SETTINGS, ...action.payload.settings },
        published: action.payload.published,
        isDirty: false,
      };

    case "SET_TITLE":
      return { ...state, title: action.payload, isDirty: true };

    case "SET_TABLE_TYPE":
      return {
        ...state,
        tableType: action.payload,
        tableData: null, // Clear table data when changing type
        isDirty: true,
      };

    case "UPDATE_DECLINATION_INPUT":
      return {
        ...state,
        declinationInput: { ...state.declinationInput, ...action.payload },
        isDirty: true,
      };

    case "UPDATE_CONJUGATION_INPUT":
      return {
        ...state,
        conjugationInput: { ...state.conjugationInput, ...action.payload },
        isDirty: true,
      };

    case "UPDATE_VERB_PREPOSITION_INPUT":
      return {
        ...state,
        verbPrepositionInput: { ...state.verbPrepositionInput, ...action.payload },
        isDirty: true,
      };

    case "SET_TABLE_DATA":
      return {
        ...state,
        tableData: action.payload,
        isDirty: true,
      };

    case "MERGE_TABLE_DATA": {
      // Merge new/updated verb tables into existing tableData by infinitive
      const incoming = action.payload;
      if (!incoming.length) return state;
      const existing = (state.tableData as VerbConjugationTable[] | null) ?? [];
      // Build a map of existing tables by normalised infinitive
      const map = new Map<string, VerbConjugationTable>();
      for (const t of existing) {
        map.set(t.input.verb.trim().toLowerCase(), t);
      }
      // Overwrite / insert new tables
      for (const t of incoming) {
        map.set(t.input.verb.trim().toLowerCase(), t);
      }
      // Preserve the order from conjugationInput.verbs
      const verbOrder = (state.conjugationInput?.verbs ?? []).map(v => v.trim().toLowerCase());
      const merged: VerbConjugationTable[] = [];
      const used = new Set<string>();
      for (const v of verbOrder) {
        if (v && map.has(v) && !used.has(v)) {
          merged.push(map.get(v)!);
          used.add(v);
        }
      }
      // Append any tables not in verbOrder (safety net)
      for (const [key, table] of map) {
        if (!used.has(key)) merged.push(table);
      }
      return {
        ...state,
        tableData: merged,
        isDirty: true,
      };
    }

    case "CLEAR_TABLE_DATA":
      return {
        ...state,
        tableData: null,
        isDirty: true,
      };

    case "UPDATE_SETTINGS":
      return {
        ...state,
        settings: { ...state.settings, ...action.payload },
        isDirty: true,
      };

    case "SET_SAVING":
      return { ...state, isSaving: action.payload };

    case "SET_GENERATING":
      return { ...state, isGenerating: action.payload };

    case "MARK_SAVED":
      return { ...state, isDirty: false, isSaving: false };

    case "SET_PUBLISHED":
      return { ...state, published: action.payload, isDirty: true };

    case "UPDATE_CONJUGATION_CELL": {
      // Update a specific cell in a verb conjugation table
      const { tableIndex, personKey, tense, field, value } = action.payload;
      if (!state.tableData || !Array.isArray(state.tableData)) return state;
      
      const tables = state.tableData as VerbConjugationTable[];
      if (tableIndex < 0 || tableIndex >= tables.length) return state;
      
      const updatedTables = tables.map((table, idx) => {
        if (idx !== tableIndex) return table;
        
        const updatedConjugations = { ...table.conjugations };
        const personData = updatedConjugations[personKey];
        if (!personData) return table;
        
        // Clear highlights for this field when text changes
        const existingTense = personData[tense];
        const existingHighlights = existingTense?.highlights;
        let newHighlights: TenseHighlights | undefined;
        if (existingHighlights) {
          const { [field]: _removed, ...rest } = existingHighlights;
          newHighlights = Object.keys(rest).length > 0 ? rest as TenseHighlights : undefined;
        }
        const updatedPerson = {
          ...personData,
          [tense]: {
            ...personData[tense],
            [field]: value,
            highlights: newHighlights,
          },
        };
        
        return {
          ...table,
          conjugations: {
            ...updatedConjugations,
            [personKey]: updatedPerson,
          },
        };
      });
      
      return {
        ...state,
        tableData: updatedTables,
        isDirty: true,
      };
    }

    case "UPDATE_CONJUGATION_HIGHLIGHTS": {
      const { tableIndex, personKey, tense, field, ranges } = action.payload;
      if (!state.tableData || !Array.isArray(state.tableData)) return state;

      const tables = state.tableData as VerbConjugationTable[];
      if (tableIndex < 0 || tableIndex >= tables.length) return state;

      const updatedTables = tables.map((table, idx) => {
        if (idx !== tableIndex) return table;

        const updatedConjugations = { ...table.conjugations };
        const personData = updatedConjugations[personKey];
        if (!personData) return table;

        const existingTense = personData[tense];
        if (!existingTense) return table;

        let newHighlights: TenseHighlights | undefined;
        if (ranges && ranges.length > 0) {
          newHighlights = { ...existingTense.highlights, [field]: ranges };
        } else {
          // Remove this field from highlights
          if (existingTense.highlights) {
            const { [field]: _removed, ...rest } = existingTense.highlights;
            newHighlights = Object.keys(rest).length > 0 ? rest as TenseHighlights : undefined;
          }
        }

        const updatedPerson = {
          ...personData,
          [tense]: {
            ...existingTense,
            highlights: newHighlights,
          },
        };

        return {
          ...table,
          conjugations: {
            ...updatedConjugations,
            [personKey]: updatedPerson,
          },
        };
      });

      return {
        ...state,
        tableData: updatedTables,
        isDirty: true,
      };
    }

    case "UPDATE_INFINITIVE": {
      // Update the infinitive (verb title) of a specific table
      const { tableIndex, verb } = action.payload;
      if (!state.tableData || !Array.isArray(state.tableData)) return state;
      
      const tables = state.tableData as VerbConjugationTable[];
      if (tableIndex < 0 || tableIndex >= tables.length) return state;
      
      const updatedTables = tables.map((table, idx) => {
        if (idx !== tableIndex) return table;
        return {
          ...table,
          input: { ...table.input, verb },
        };
      });
      
      return {
        ...state,
        tableData: updatedTables,
        isDirty: true,
      };
    }

    case "SET_THIRD_PERSON_SINGULAR_ONLY": {
      const { tableIndex, value } = action.payload;
      if (!state.tableData || !Array.isArray(state.tableData)) return state;
      const tables = state.tableData as VerbConjugationTable[];
      if (tableIndex < 0 || tableIndex >= tables.length) return state;
      const updatedTables = tables.map((table, idx) => {
        if (idx !== tableIndex) return table;
        return { ...table, thirdPersonSingularOnly: value, thirdPersonOnly: undefined };
      });
      return { ...state, tableData: updatedTables, isDirty: true };
    }

    case "SET_THIRD_PERSON_PLURAL_ONLY": {
      const { tableIndex, value } = action.payload;
      if (!state.tableData || !Array.isArray(state.tableData)) return state;
      const tables = state.tableData as VerbConjugationTable[];
      if (tableIndex < 0 || tableIndex >= tables.length) return state;
      const updatedTables = tables.map((table, idx) => {
        if (idx !== tableIndex) return table;
        return { ...table, thirdPersonPluralOnly: value, thirdPersonOnly: undefined };
      });
      return { ...state, tableData: updatedTables, isDirty: true };
    }

    case "RESET":
      return initialState;

    default:
      return state;
  }
}

// ─── Context ─────────────────────────────────────────────────
interface GrammarTableContextValue {
  state: GrammarTableState;
  dispatch: React.Dispatch<GrammarTableAction>;
  generate: (forceRegenerate?: string[]) => Promise<void>;
  save: () => Promise<void>;
}

const GrammarTableContext = createContext<GrammarTableContextValue | null>(null);

export function GrammarTableProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(grammarTableReducer, initialState);

  const generate = useCallback(async (forceRegenerate?: string[]) => {
    dispatch({ type: "SET_GENERATING", payload: true });
    try {
      // Choose API endpoint based on table type
      let endpoint: string;
      let requestBody: Record<string, unknown>;

      if (state.tableType === "verb-conjugation") {
        endpoint = "/api/ai/generate-conjugation-table";
        // Collect verbs already in tableData so the API can skip them
        const existingTables = (state.tableData as VerbConjugationTable[] | null) ?? [];
        const existingVerbs = existingTables.map(t => t.input.verb);
        requestBody = {
          input: state.conjugationInput,
          existingVerbs: forceRegenerate?.length ? [] : existingVerbs,
          forceRegenerate: forceRegenerate ?? [],
        };
      } else if (state.tableType === "verb-preposition") {
        endpoint = "/api/ai/generate-preposition-table";
        requestBody = { input: state.verbPrepositionInput };
      } else {
        endpoint = "/api/ai/generate-declination-table";
        requestBody = { input: state.declinationInput };
      }

      const res = await authFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        console.error(`Generation failed (${res.status}):`, errText);
        dispatch({ type: "SET_GENERATING", payload: false });
        return;
      }
      const data = await res.json();

      // Verb-conjugation returns { tables, fromCache, generated, failed }
      if (state.tableType === "verb-conjugation" && data.tables) {
        if (data.tables.length > 0) {
          dispatch({ type: "MERGE_TABLE_DATA", payload: data.tables });
        }
        // Log results for debugging
        if (data.fromCache?.length) console.log(`[Generate] ${data.fromCache.length} from cache`);
        if (data.generated?.length) console.log(`[Generate] ${data.generated.length} AI-generated`);
        if (data.failed?.length) {
          console.error(`[Generate] ${data.failed.length} failed:`, data.failed);
          alert(`Generation failed for: ${data.failed.join(", ")}`);
        }
      } else {
        dispatch({ type: "SET_TABLE_DATA", payload: data });
      }
    } catch (err) {
      console.error("Generation failed:", err);
    } finally {
      dispatch({ type: "SET_GENERATING", payload: false });
    }
  }, [state.tableType, state.declinationInput, state.conjugationInput, state.verbPrepositionInput, state.tableData]);

  const save = useCallback(async () => {
    dispatch({ type: "SET_SAVING", payload: true });
    try {
      const method = state.documentId ? "PUT" : "POST";
      const url = state.documentId
        ? `/api/worksheets/${state.documentId}`
        : "/api/worksheets";
      
      // Store both input types for flexibility
      const res = await authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "grammar-table",
          title: state.title,
          blocks: {
            tableType: state.tableType,
            declinationInput: state.declinationInput,
            conjugationInput: state.conjugationInput,
            verbPrepositionInput: state.verbPrepositionInput,
            tableData: state.tableData,
          },
          settings: state.settings,
          published: state.published,
        }),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        console.error(`Save failed (${res.status}):`, errText);
        dispatch({ type: "SET_SAVING", payload: false });
        return;
      }
      const data = await res.json();
      if (!state.documentId && data.id) {
        dispatch({
          type: "LOAD",
          payload: {
            id: data.id,
            title: data.title,
            slug: data.slug,
            tableType: data.blocks?.tableType || "adjective-declination",
            declinationInput: data.blocks?.declinationInput || DEFAULT_DECLINATION_INPUT,
            conjugationInput: data.blocks?.conjugationInput || DEFAULT_CONJUGATION_INPUT,
            verbPrepositionInput: data.blocks?.verbPrepositionInput || DEFAULT_VERB_PREPOSITION_INPUT,
            tableData: data.blocks?.tableData || null,
            settings: data.settings as GrammarTableSettings,
            published: data.published,
          },
        });
        const locale = window.location.pathname.split("/")[1] || "de";
        window.history.replaceState(null, "", `/${locale}/editor/grammar-tables/${data.id}`);
      }
      dispatch({ type: "MARK_SAVED" });
    } catch (err) {
      console.error("Save failed:", err);
      dispatch({ type: "SET_SAVING", payload: false });
    }
  }, [state.documentId, state.title, state.tableType, state.declinationInput, state.conjugationInput, state.verbPrepositionInput, state.tableData, state.settings, state.published]);

  return (
    <GrammarTableContext.Provider value={{ state, dispatch, generate, save }}>
      {children}
    </GrammarTableContext.Provider>
  );
}

export function useGrammarTable() {
  const ctx = useContext(GrammarTableContext);
  if (!ctx) throw new Error("useGrammarTable must be used within GrammarTableProvider");
  return ctx;
}
