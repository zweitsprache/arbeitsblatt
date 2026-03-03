"use client";

import React, { createContext, useContext, useReducer, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { authFetch } from "@/lib/auth-fetch";
import {
  AiToolField,
  AiToolSettings,
  AiToolDocument,
  DEFAULT_AI_TOOL_SETTINGS,
} from "@/types/ai-tool";

// ─── State ───────────────────────────────────────────────────
interface AiToolState {
  toolId: string | null;
  title: string;
  slug: string;
  description: string;
  fields: AiToolField[];
  promptTemplate: string;
  settings: AiToolSettings;
  published: boolean;
  isDirty: boolean;
  isSaving: boolean;
}

const initialState: AiToolState = {
  toolId: null,
  title: "Untitled AI Tool",
  slug: "",
  description: "",
  fields: [],
  promptTemplate: "",
  settings: DEFAULT_AI_TOOL_SETTINGS,
  published: false,
  isDirty: false,
  isSaving: false,
};

// ─── Actions ─────────────────────────────────────────────────
type AiToolAction =
  | { type: "LOAD_TOOL"; payload: AiToolDocument }
  | { type: "SET_TITLE"; payload: string }
  | { type: "SET_DESCRIPTION"; payload: string }
  | { type: "SET_PROMPT_TEMPLATE"; payload: string }
  | { type: "ADD_FIELD"; payload: AiToolField }
  | { type: "UPDATE_FIELD"; payload: { id: string; updates: Partial<AiToolField> } }
  | { type: "REMOVE_FIELD"; payload: string }
  | { type: "REORDER_FIELDS"; payload: AiToolField[] }
  | { type: "SET_SETTINGS"; payload: Partial<AiToolSettings> }
  | { type: "SET_SAVING"; payload: boolean }
  | { type: "MARK_SAVED" }
  | { type: "SET_PUBLISHED"; payload: boolean };

// ─── Reducer ─────────────────────────────────────────────────
function aiToolReducer(state: AiToolState, action: AiToolAction): AiToolState {
  switch (action.type) {
    case "LOAD_TOOL":
      return {
        ...state,
        toolId: action.payload.id,
        title: action.payload.title,
        slug: action.payload.slug,
        description: action.payload.description || "",
        fields: action.payload.fields,
        promptTemplate: action.payload.promptTemplate,
        settings: { ...DEFAULT_AI_TOOL_SETTINGS, ...action.payload.settings },
        published: action.payload.published,
        isDirty: false,
        isSaving: false,
      };

    case "SET_TITLE":
      return { ...state, title: action.payload, isDirty: true };

    case "SET_DESCRIPTION":
      return { ...state, description: action.payload, isDirty: true };

    case "SET_PROMPT_TEMPLATE":
      return { ...state, promptTemplate: action.payload, isDirty: true };

    case "ADD_FIELD":
      return {
        ...state,
        fields: [...state.fields, action.payload],
        isDirty: true,
      };

    case "UPDATE_FIELD":
      return {
        ...state,
        fields: state.fields.map((f) =>
          f.id === action.payload.id ? { ...f, ...action.payload.updates } : f
        ),
        isDirty: true,
      };

    case "REMOVE_FIELD":
      return {
        ...state,
        fields: state.fields.filter((f) => f.id !== action.payload),
        isDirty: true,
      };

    case "REORDER_FIELDS":
      return { ...state, fields: action.payload, isDirty: true };

    case "SET_SETTINGS":
      return {
        ...state,
        settings: { ...state.settings, ...action.payload },
        isDirty: true,
      };

    case "SET_SAVING":
      return { ...state, isSaving: action.payload };

    case "MARK_SAVED":
      return { ...state, isDirty: false, isSaving: false };

    case "SET_PUBLISHED":
      return { ...state, published: action.payload, isDirty: true };

    default:
      return state;
  }
}

// ─── Context ─────────────────────────────────────────────────
interface AiToolContextValue {
  state: AiToolState;
  dispatch: React.Dispatch<AiToolAction>;
  save: () => Promise<void>;
  addField: (type: AiToolField["type"]) => void;
}

const AiToolContext = createContext<AiToolContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────
export function AiToolProvider({
  children,
  initialData,
}: {
  children: React.ReactNode;
  initialData?: AiToolDocument;
}) {
  const [state, dispatch] = useReducer(aiToolReducer, initialState, (init) => {
    if (initialData) {
      return {
        ...init,
        toolId: initialData.id,
        title: initialData.title,
        slug: initialData.slug,
        description: initialData.description || "",
        fields: initialData.fields,
        promptTemplate: initialData.promptTemplate,
        settings: { ...DEFAULT_AI_TOOL_SETTINGS, ...initialData.settings },
        published: initialData.published,
      };
    }
    return init;
  });

  const save = useCallback(async () => {
    dispatch({ type: "SET_SAVING", payload: true });
    try {
      const body = {
        title: state.title,
        description: state.description,
        fields: state.fields,
        promptTemplate: state.promptTemplate,
        settings: state.settings,
        published: state.published,
      };

      if (state.toolId) {
        // Update existing
        const res = await authFetch(`/api/ai-tools/${state.toolId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Failed to save");
        dispatch({ type: "MARK_SAVED" });
      } else {
        // Create new
        const res = await authFetch("/api/ai-tools", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Failed to create");
        const data = await res.json();
        dispatch({
          type: "LOAD_TOOL",
          payload: {
            ...data,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          },
        });
      }
    } catch (error) {
      console.error("Save AI tool error:", error);
      dispatch({ type: "SET_SAVING", payload: false });
    }
  }, [state]);

  const addField = useCallback(
    (type: AiToolField["type"]) => {
      const id = uuidv4();
      const fieldNumber = state.fields.length + 1;
      const newField: AiToolField = {
        id,
        type,
        label: `Field ${fieldNumber}`,
        variableName: `field_${fieldNumber}`,
        placeholder: "",
        required: false,
        ...(type === "select" || type === "radio"
          ? {
              options: [
                { id: uuidv4(), label: "Option 1", value: "option_1" },
                { id: uuidv4(), label: "Option 2", value: "option_2" },
              ],
            }
          : {}),
        ...(type === "number" ? { min: 0, max: 100 } : {}),
      };
      dispatch({ type: "ADD_FIELD", payload: newField });
    },
    [state.fields.length]
  );

  return (
    <AiToolContext.Provider value={{ state, dispatch, save, addField }}>
      {children}
    </AiToolContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────
export function useAiTool() {
  const ctx = useContext(AiToolContext);
  if (!ctx) throw new Error("useAiTool must be used within AiToolProvider");
  return ctx;
}
