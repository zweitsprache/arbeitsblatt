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
  AdjectiveDeclinationTable,
  VerbConjugationTable,
  DEFAULT_GRAMMAR_TABLE_SETTINGS,
  DEFAULT_DECLINATION_INPUT,
  DEFAULT_CONJUGATION_INPUT,
  PersonKey,
  VerbTense,
} from "@/types/grammar-table";

// ─── State ───────────────────────────────────────────────────
interface GrammarTableState {
  documentId: string | null;
  title: string;
  slug: string;
  tableType: GrammarTableType;
  declinationInput: DeclinationInput;
  conjugationInput: ConjugationInput;
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
      tableData: GrammarTableData | null;
      settings: GrammarTableSettings; 
      published: boolean 
    } }
  | { type: "SET_TITLE"; payload: string }
  | { type: "SET_TABLE_TYPE"; payload: GrammarTableType }
  | { type: "UPDATE_DECLINATION_INPUT"; payload: Partial<DeclinationInput> }
  | { type: "UPDATE_CONJUGATION_INPUT"; payload: Partial<ConjugationInput> }
  | { type: "SET_TABLE_DATA"; payload: GrammarTableData }
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

    case "SET_TABLE_DATA":
      return {
        ...state,
        tableData: action.payload,
        isDirty: true,
      };

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
        
        const updatedPerson = {
          ...personData,
          [tense]: {
            ...personData[tense],
            [field]: value,
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
  generate: () => Promise<void>;
  save: () => Promise<void>;
}

const GrammarTableContext = createContext<GrammarTableContextValue | null>(null);

export function GrammarTableProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(grammarTableReducer, initialState);

  const generate = useCallback(async () => {
    dispatch({ type: "SET_GENERATING", payload: true });
    try {
      // Choose API endpoint based on table type
      const endpoint = state.tableType === "verb-conjugation"
        ? "/api/ai/generate-conjugation-table"
        : "/api/ai/generate-declination-table";
      
      const input = state.tableType === "verb-conjugation"
        ? state.conjugationInput
        : state.declinationInput;

      const res = await authFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        console.error(`Generation failed (${res.status}):`, errText);
        dispatch({ type: "SET_GENERATING", payload: false });
        return;
      }
      const data = await res.json();
      dispatch({ type: "SET_TABLE_DATA", payload: data });
    } catch (err) {
      console.error("Generation failed:", err);
    } finally {
      dispatch({ type: "SET_GENERATING", payload: false });
    }
  }, [state.tableType, state.declinationInput, state.conjugationInput]);

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
  }, [state.documentId, state.title, state.tableType, state.declinationInput, state.conjugationInput, state.tableData, state.settings, state.published]);

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
