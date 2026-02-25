"use client";

import React, { createContext, useContext, useReducer, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { authFetch } from "@/lib/auth-fetch";
import {
  EBookChapter,
  EBookCoverSettings,
  EBookSettings,
  ContentItemReference,
  PopulatedEBookChapter,
  DEFAULT_EBOOK_SETTINGS,
  DEFAULT_EBOOK_COVER_SETTINGS,
} from "@/types/ebook";

// ─── State ───────────────────────────────────────────────────
interface EBookState {
  ebookId: string | null;
  title: string;
  slug: string;
  chapters: PopulatedEBookChapter[];
  coverSettings: EBookCoverSettings;
  settings: EBookSettings;
  selectedChapterId: string | null;
  isDirty: boolean;
  isSaving: boolean;
  published: boolean;
}

const initialState: EBookState = {
  ebookId: null,
  title: "Untitled E-Book",
  slug: "",
  chapters: [],
  coverSettings: DEFAULT_EBOOK_COVER_SETTINGS,
  settings: DEFAULT_EBOOK_SETTINGS,
  selectedChapterId: null,
  isDirty: false,
  isSaving: false,
  published: false,
};

// ─── Actions ─────────────────────────────────────────────────
type EBookAction =
  | { type: "LOAD_EBOOK"; payload: { id: string; title: string; slug: string; chapters: PopulatedEBookChapter[]; coverSettings: EBookCoverSettings; settings: EBookSettings; published: boolean } }
  | { type: "SET_TITLE"; payload: string }
  | { type: "ADD_CHAPTER"; payload: { title: string } }
  | { type: "UPDATE_CHAPTER"; payload: { id: string; title: string } }
  | { type: "REMOVE_CHAPTER"; payload: string }
  | { type: "REORDER_CHAPTERS"; payload: PopulatedEBookChapter[] }
  | { type: "SELECT_CHAPTER"; payload: string | null }
  | { type: "ADD_ITEM_TO_CHAPTER"; payload: { chapterId: string; item: ContentItemReference } }
  | { type: "REMOVE_ITEM_FROM_CHAPTER"; payload: { chapterId: string; itemId: string } }
  | { type: "REORDER_ITEMS"; payload: { chapterId: string; items: ContentItemReference[] } }
  | { type: "UPDATE_COVER"; payload: Partial<EBookCoverSettings> }
  | { type: "UPDATE_SETTINGS"; payload: Partial<EBookSettings> }
  | { type: "SET_SAVING"; payload: boolean }
  | { type: "MARK_SAVED" }
  | { type: "SET_PUBLISHED"; payload: boolean };

// ─── Reducer ─────────────────────────────────────────────────
function ebookReducer(state: EBookState, action: EBookAction): EBookState {
  switch (action.type) {
    case "LOAD_EBOOK":
      return {
        ...state,
        ebookId: action.payload.id,
        title: action.payload.title,
        slug: action.payload.slug,
        chapters: action.payload.chapters,
        coverSettings: { ...DEFAULT_EBOOK_COVER_SETTINGS, ...action.payload.coverSettings },
        settings: { ...DEFAULT_EBOOK_SETTINGS, ...action.payload.settings },
        published: action.payload.published,
        isDirty: false,
        selectedChapterId: action.payload.chapters[0]?.id ?? null,
      };

    case "SET_TITLE":
      return { ...state, title: action.payload, isDirty: true };

    case "ADD_CHAPTER": {
      const newChapter: PopulatedEBookChapter = {
        id: uuidv4(),
        title: action.payload.title || `Chapter ${state.chapters.length + 1}`,
        items: [],
      };
      return {
        ...state,
        chapters: [...state.chapters, newChapter],
        selectedChapterId: newChapter.id,
        isDirty: true,
      };
    }

    case "UPDATE_CHAPTER":
      return {
        ...state,
        chapters: state.chapters.map((ch) =>
          ch.id === action.payload.id ? { ...ch, title: action.payload.title } : ch
        ),
        isDirty: true,
      };

    case "REMOVE_CHAPTER": {
      const newChapters = state.chapters.filter((ch) => ch.id !== action.payload);
      return {
        ...state,
        chapters: newChapters,
        selectedChapterId:
          state.selectedChapterId === action.payload
            ? (newChapters[0]?.id ?? null)
            : state.selectedChapterId,
        isDirty: true,
      };
    }

    case "REORDER_CHAPTERS":
      return { ...state, chapters: action.payload, isDirty: true };

    case "SELECT_CHAPTER":
      return { ...state, selectedChapterId: action.payload };

    case "ADD_ITEM_TO_CHAPTER":
      return {
        ...state,
        chapters: state.chapters.map((ch) =>
          ch.id === action.payload.chapterId
            ? { ...ch, items: [...ch.items, action.payload.item] }
            : ch
        ),
        isDirty: true,
      };

    case "REMOVE_ITEM_FROM_CHAPTER":
      return {
        ...state,
        chapters: state.chapters.map((ch) =>
          ch.id === action.payload.chapterId
            ? { ...ch, items: ch.items.filter((w) => w.id !== action.payload.itemId) }
            : ch
        ),
        isDirty: true,
      };

    case "REORDER_ITEMS":
      return {
        ...state,
        chapters: state.chapters.map((ch) =>
          ch.id === action.payload.chapterId
            ? { ...ch, items: action.payload.items }
            : ch
        ),
        isDirty: true,
      };

    case "UPDATE_COVER":
      return {
        ...state,
        coverSettings: { ...state.coverSettings, ...action.payload },
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

    case "MARK_SAVED":
      return { ...state, isDirty: false, isSaving: false };

    case "SET_PUBLISHED":
      return { ...state, published: action.payload, isDirty: true };

    default:
      return state;
  }
}

// ─── Convert populated chapters to storage format ────────────
function chaptersToStorage(chapters: PopulatedEBookChapter[]): EBookChapter[] {
  return chapters.map((ch) => ({
    id: ch.id,
    title: ch.title,
    worksheetIds: ch.items.map((w) => w.id),
  }));
}

// ─── Context ─────────────────────────────────────────────────
interface EBookContextValue {
  state: EBookState;
  dispatch: React.Dispatch<EBookAction>;
  addChapter: (title?: string) => void;
  addItemToChapter: (chapterId: string, item: ContentItemReference) => void;
  removeItemFromChapter: (chapterId: string, itemId: string) => void;
  save: () => Promise<void>;
  getSelectedChapter: () => PopulatedEBookChapter | null;
}

const EBookContext = createContext<EBookContextValue | null>(null);

export function EBookProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(ebookReducer, initialState);

  const addChapter = useCallback((title?: string) => {
    dispatch({ type: "ADD_CHAPTER", payload: { title: title || "" } });
  }, []);

  const addItemToChapter = useCallback(
    (chapterId: string, item: ContentItemReference) => {
      dispatch({ type: "ADD_ITEM_TO_CHAPTER", payload: { chapterId, item } });
    },
    []
  );

  const removeItemFromChapter = useCallback(
    (chapterId: string, itemId: string) => {
      dispatch({ type: "REMOVE_ITEM_FROM_CHAPTER", payload: { chapterId, itemId } });
    },
    []
  );

  const getSelectedChapter = useCallback(() => {
    return state.chapters.find((ch) => ch.id === state.selectedChapterId) ?? null;
  }, [state.chapters, state.selectedChapterId]);

  const save = useCallback(async () => {
    dispatch({ type: "SET_SAVING", payload: true });
    try {
      const method = state.ebookId ? "PUT" : "POST";
      const url = state.ebookId ? `/api/ebooks/${state.ebookId}` : "/api/ebooks";
      const res = await authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: state.title,
          chapters: chaptersToStorage(state.chapters),
          coverSettings: state.coverSettings,
          settings: state.settings,
          published: state.published,
        }),
      });
      const data = await res.json();
      if (!state.ebookId && data.id) {
        // For new ebooks, update the URL
        window.history.replaceState(null, "", `/editor/ebook/${data.id}`);
        // Reload the state with the new ID
        dispatch({
          type: "LOAD_EBOOK",
          payload: {
            id: data.id,
            title: data.title,
            slug: data.slug,
            chapters: state.chapters, // Keep populated chapters
            coverSettings: data.coverSettings,
            settings: data.settings,
            published: data.published,
          },
        });
      }
      dispatch({ type: "MARK_SAVED" });
    } catch (err) {
      console.error("Save failed:", err);
      dispatch({ type: "SET_SAVING", payload: false });
    }
  }, [state.ebookId, state.title, state.chapters, state.coverSettings, state.settings, state.published]);

  return (
    <EBookContext.Provider
      value={{
        state,
        dispatch,
        addChapter,
        addItemToChapter,
        removeItemFromChapter,
        save,
        getSelectedChapter,
      }}
    >
      {children}
    </EBookContext.Provider>
  );
}

export function useEBook() {
  const ctx = useContext(EBookContext);
  if (!ctx) throw new Error("useEBook must be used within EBookProvider");
  return ctx;
}
