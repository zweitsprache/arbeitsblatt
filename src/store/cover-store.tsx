"use client";

import React, { createContext, useContext, useReducer, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { authFetch } from "@/lib/auth-fetch";
import {
  CoverElement,
  CoverSettings,
  DEFAULT_COVER_SETTINGS,
  createDefaultElements,
} from "@/types/cover";

// ─── State ───────────────────────────────────────────────────
interface CoverState {
  worksheetId: string | null;
  title: string;
  slug: string;
  elements: CoverElement[];
  settings: CoverSettings;
  selectedElementId: string | null;
  isDirty: boolean;
  isSaving: boolean;
  published: boolean;
}

const initialState: CoverState = {
  worksheetId: null,
  title: "Untitled Cover",
  slug: "",
  elements: createDefaultElements(),
  settings: DEFAULT_COVER_SETTINGS,
  selectedElementId: null,
  isDirty: false,
  isSaving: false,
  published: false,
};

// ─── Actions ─────────────────────────────────────────────────
type CoverAction =
  | { type: "LOAD"; payload: { id: string; title: string; slug: string; elements: CoverElement[]; settings: CoverSettings; published: boolean } }
  | { type: "SET_TITLE"; payload: string }
  | { type: "ADD_ELEMENT"; payload: CoverElement }
  | { type: "UPDATE_ELEMENT"; payload: { id: string; updates: Partial<CoverElement> } }
  | { type: "REMOVE_ELEMENT"; payload: string }
  | { type: "REORDER_ELEMENTS"; payload: CoverElement[] }
  | { type: "SELECT_ELEMENT"; payload: string | null }
  | { type: "UPDATE_SETTINGS"; payload: Partial<CoverSettings> }
  | { type: "SET_SAVING"; payload: boolean }
  | { type: "MARK_SAVED" }
  | { type: "SET_PUBLISHED"; payload: boolean };

// ─── Reducer ─────────────────────────────────────────────────
function coverReducer(state: CoverState, action: CoverAction): CoverState {
  switch (action.type) {
    case "LOAD":
      return {
        ...state,
        worksheetId: action.payload.id,
        title: action.payload.title,
        slug: action.payload.slug,
        elements: action.payload.elements,
        settings: { ...DEFAULT_COVER_SETTINGS, ...action.payload.settings },
        published: action.payload.published,
        isDirty: false,
      };

    case "SET_TITLE":
      return { ...state, title: action.payload, isDirty: true };

    case "ADD_ELEMENT":
      return {
        ...state,
        elements: [...state.elements, action.payload],
        selectedElementId: action.payload.id,
        isDirty: true,
      };

    case "UPDATE_ELEMENT":
      return {
        ...state,
        elements: state.elements.map((el) =>
          el.id === action.payload.id
            ? ({ ...el, ...action.payload.updates } as CoverElement)
            : el
        ),
        isDirty: true,
      };

    case "REMOVE_ELEMENT":
      return {
        ...state,
        elements: state.elements.filter((el) => el.id !== action.payload),
        selectedElementId:
          state.selectedElementId === action.payload ? null : state.selectedElementId,
        isDirty: true,
      };

    case "REORDER_ELEMENTS":
      return { ...state, elements: action.payload, isDirty: true };

    case "SELECT_ELEMENT":
      return { ...state, selectedElementId: action.payload };

    case "UPDATE_SETTINGS":
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
interface CoverContextValue {
  state: CoverState;
  dispatch: React.Dispatch<CoverAction>;
  addTextElement: () => void;
  addImageElement: (src: string) => void;
  addRibbon: () => void;
  addFlag: (variant: "DE" | "CH" | "AT") => void;
  duplicateElement: (id: string) => void;
  save: () => Promise<void>;
}

const CoverContext = createContext<CoverContextValue | null>(null);

export function CoverProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(coverReducer, initialState);

  const addTextElement = useCallback(() => {
    const el: CoverElement = {
      id: uuidv4(),
      type: "text",
      text: "Text",
      fontFamily: "Encode Sans",
      fontSize: 28,
      fontWeight: 400,
      color: "#222222",
      textAlign: "left",
      uppercase: false,
      top: 500,
      left: 85,
      width: 0,
    };
    dispatch({ type: "ADD_ELEMENT", payload: el });
  }, []);

  const addImageElement = useCallback((src: string) => {
    const el: CoverElement = {
      id: uuidv4(),
      type: "image",
      src,
      top: 900,
      left: 85,
      width: 227,
      height: 227,
      borderRadius: 6,
      showBorder: false,
      objectFit: "cover",
    };
    dispatch({ type: "ADD_ELEMENT", payload: el });
  }, []);

  const addRibbon = useCallback(() => {
    const el: CoverElement = {
      id: uuidv4(),
      type: "ribbon",
      text: "Label",
      color: "#4A3D55",
      textColor: "#FFFFFF",
      fontSize: 26,
    };
    dispatch({ type: "ADD_ELEMENT", payload: el });
  }, []);

  const addFlag = useCallback((variant: "DE" | "CH" | "AT") => {
    const el: CoverElement = {
      id: uuidv4(),
      type: "flag",
      variant,
      top: 45,
      left: 45,
      width: 72,
    };
    dispatch({ type: "ADD_ELEMENT", payload: el });
  }, []);

  const duplicateElement = useCallback(
    (id: string) => {
      const el = state.elements.find((e) => e.id === id);
      if (!el) return;
      const newEl = { ...JSON.parse(JSON.stringify(el)), id: uuidv4() };
      // Offset position slightly
      if ("top" in newEl) newEl.top += 30;
      if ("left" in newEl) newEl.left += 30;
      dispatch({ type: "ADD_ELEMENT", payload: newEl });
    },
    [state.elements]
  );

  const save = useCallback(async () => {
    dispatch({ type: "SET_SAVING", payload: true });
    try {
      const method = state.worksheetId ? "PUT" : "POST";
      const url = state.worksheetId
        ? `/api/worksheets/${state.worksheetId}`
        : "/api/worksheets";
      const res = await authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "covers",
          title: state.title,
          blocks: state.elements,
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
      if (!state.worksheetId && data.id) {
        dispatch({
          type: "LOAD",
          payload: {
            id: data.id,
            title: data.title,
            slug: data.slug,
            elements: data.blocks as CoverElement[],
            settings: data.settings as CoverSettings,
            published: data.published,
          },
        });
        const locale = window.location.pathname.split("/")[1] || "de";
        window.history.replaceState(null, "", `/${locale}/editor/covers/${data.id}`);
      }
      dispatch({ type: "MARK_SAVED" });
    } catch (err) {
      console.error("Save failed:", err);
      dispatch({ type: "SET_SAVING", payload: false });
    }
  }, [state.worksheetId, state.title, state.elements, state.settings, state.published]);

  return (
    <CoverContext.Provider
      value={{ state, dispatch, addTextElement, addImageElement, addRibbon, addFlag, duplicateElement, save }}
    >
      {children}
    </CoverContext.Provider>
  );
}

export function useCoverEditor() {
  const ctx = useContext(CoverContext);
  if (!ctx) throw new Error("useCoverEditor must be used within CoverProvider");
  return ctx;
}
