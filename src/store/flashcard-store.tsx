"use client";

import React, { createContext, useContext, useReducer, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { authFetch } from "@/lib/auth-fetch";
import {
  FlashcardItem,
  FlashcardSettings,
  DEFAULT_FLASHCARD_SETTINGS,
} from "@/types/flashcard";

export type FlashcardLocaleMode = "DE" | "CH";

// ─── State ───────────────────────────────────────────────────
interface FlashcardState {
  worksheetId: string | null;
  title: string;
  slug: string;
  cards: FlashcardItem[];
  settings: FlashcardSettings;
  selectedCardId: string | null;
  isDirty: boolean;
  isSaving: boolean;
  published: boolean;
  localeMode: FlashcardLocaleMode;
}

const initialState: FlashcardState = {
  worksheetId: null,
  title: "Untitled Flashcards",
  slug: "",
  cards: [],
  settings: DEFAULT_FLASHCARD_SETTINGS,
  selectedCardId: null,
  isDirty: false,
  isSaving: false,
  published: false,
  localeMode: "DE",
};

// ─── Actions ─────────────────────────────────────────────────
type FlashcardAction =
  | { type: "LOAD"; payload: { id: string; title: string; slug: string; cards: FlashcardItem[]; settings: FlashcardSettings; published: boolean } }
  | { type: "SET_TITLE"; payload: string }
  | { type: "ADD_CARD"; payload: { card: FlashcardItem; index?: number } }
  | { type: "UPDATE_CARD"; payload: { id: string; updates: Partial<FlashcardItem> } }
  | { type: "REMOVE_CARD"; payload: string }
  | { type: "REORDER_CARDS"; payload: FlashcardItem[] }
  | { type: "SELECT_CARD"; payload: string | null }
  | { type: "UPDATE_SETTINGS"; payload: Partial<FlashcardSettings> }
  | { type: "SET_SAVING"; payload: boolean }
  | { type: "MARK_SAVED" }
  | { type: "SET_PUBLISHED"; payload: boolean }
  | { type: "SET_LOCALE_MODE"; payload: FlashcardLocaleMode }
  | { type: "SET_CH_OVERRIDE"; payload: { cardId: string; fieldPath: string; value: string } }
  | { type: "CLEAR_CH_OVERRIDE"; payload: { cardId: string; fieldPath: string } };

// ─── Helpers ─────────────────────────────────────────────────
function isBlankCard(card: FlashcardItem): boolean {
  return !card.front.text && !card.front.image && !card.back.text && !card.back.image;
}

// ─── Reducer ─────────────────────────────────────────────────
function flashcardReducer(state: FlashcardState, action: FlashcardAction): FlashcardState {
  switch (action.type) {
    case "LOAD": {
      const mergedSettings = { ...DEFAULT_FLASHCARD_SETTINGS, ...action.payload.settings };
      const cards = mergedSettings.padEmptyCards
        ? action.payload.cards
        : action.payload.cards.filter((c) => !isBlankCard(c));
      return {
        ...state,
        worksheetId: action.payload.id,
        title: action.payload.title,
        slug: action.payload.slug,
        cards,
        settings: mergedSettings,
        published: action.payload.published,
        isDirty: false,
      };
    }

    case "SET_TITLE":
      return { ...state, title: action.payload, isDirty: true };

    case "ADD_CARD": {
      const { card, index } = action.payload;
      const newCards = [...state.cards];
      if (index !== undefined) {
        newCards.splice(index, 0, card);
      } else {
        newCards.push(card);
      }
      return { ...state, cards: newCards, selectedCardId: card.id, isDirty: true };
    }

    case "UPDATE_CARD":
      return {
        ...state,
        cards: state.cards.map((c) =>
          c.id === action.payload.id ? { ...c, ...action.payload.updates } : c
        ),
        isDirty: true,
      };

    case "REMOVE_CARD": {
      // Also clean up any CH overrides for the removed card
      const existingOverrides = state.settings.chOverrides;
      let newSettings = state.settings;
      if (existingOverrides?.[action.payload]) {
        const cleaned = { ...existingOverrides };
        delete cleaned[action.payload];
        newSettings = {
          ...state.settings,
          chOverrides: Object.keys(cleaned).length > 0 ? cleaned : undefined,
        };
      }
      return {
        ...state,
        cards: state.cards.filter((c) => c.id !== action.payload),
        selectedCardId:
          state.selectedCardId === action.payload ? null : state.selectedCardId,
        settings: newSettings,
        isDirty: true,
      };
    }

    case "REORDER_CARDS":
      return { ...state, cards: action.payload, isDirty: true };

    case "SELECT_CARD":
      return { ...state, selectedCardId: action.payload };

    case "UPDATE_SETTINGS": {
      const newSettings = { ...state.settings, ...action.payload };
      // When padEmptyCards is turned off, strip blank cards from state
      const newCards =
        action.payload.padEmptyCards === false
          ? state.cards.filter((c) => !isBlankCard(c))
          : state.cards;
      return {
        ...state,
        cards: newCards,
        settings: newSettings,
        isDirty: true,
      };
    }

    case "SET_SAVING":
      return { ...state, isSaving: action.payload };

    case "MARK_SAVED":
      return { ...state, isDirty: false, isSaving: false };

    case "SET_PUBLISHED":
      return { ...state, published: action.payload, isDirty: true };

    case "SET_LOCALE_MODE":
      return { ...state, localeMode: action.payload };

    case "SET_CH_OVERRIDE": {
      const { cardId, fieldPath, value } = action.payload;
      const existing = state.settings.chOverrides || {};
      return {
        ...state,
        settings: {
          ...state.settings,
          chOverrides: {
            ...existing,
            [cardId]: {
              ...existing[cardId],
              [fieldPath]: value,
            },
          },
        },
        isDirty: true,
      };
    }

    case "CLEAR_CH_OVERRIDE": {
      const { cardId, fieldPath } = action.payload;
      const existing = state.settings.chOverrides || {};
      const cardOverrides = { ...existing[cardId] };
      delete cardOverrides[fieldPath];
      const newOverrides = { ...existing };
      if (Object.keys(cardOverrides).length === 0) {
        delete newOverrides[cardId];
      } else {
        newOverrides[cardId] = cardOverrides;
      }
      return {
        ...state,
        settings: {
          ...state.settings,
          chOverrides: Object.keys(newOverrides).length > 0 ? newOverrides : undefined,
        },
        isDirty: true,
      };
    }

    default:
      return state;
  }
}

// ─── Context ─────────────────────────────────────────────────
interface FlashcardContextValue {
  state: FlashcardState;
  dispatch: React.Dispatch<FlashcardAction>;
  addCard: () => void;
  duplicateCard: (id: string) => void;
  save: () => Promise<void>;
}

const FlashcardContext = createContext<FlashcardContextValue | null>(null);

function createEmptyCard(): FlashcardItem {
  return {
    id: uuidv4(),
    front: { text: "" },
    back: { text: "" },
  };
}

export function FlashcardProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(flashcardReducer, initialState);

  const addCard = useCallback(() => {
    const card = createEmptyCard();
    dispatch({ type: "ADD_CARD", payload: { card } });
  }, []);

  const duplicateCard = useCallback(
    (id: string) => {
      const card = state.cards.find((c) => c.id === id);
      if (!card) return;
      const idx = state.cards.indexOf(card);
      const newCard: FlashcardItem = {
        ...JSON.parse(JSON.stringify(card)),
        id: uuidv4(),
      };
      dispatch({ type: "ADD_CARD", payload: { card: newCard, index: idx + 1 } });
    },
    [state.cards]
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
          type: "flashcards",
          title: state.title,
          blocks: state.cards, // stored in the blocks JSON column
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
            cards: data.blocks as FlashcardItem[],
            settings: data.settings as FlashcardSettings,
            published: data.published,
          },
        });
        // Preserve locale prefix from current URL
        const locale = window.location.pathname.split("/")[1] || "de";
        window.history.replaceState(null, "", `/${locale}/editor/flashcards/${data.id}`);
      }
      dispatch({ type: "MARK_SAVED" });
    } catch (err) {
      console.error("Save failed:", err);
      dispatch({ type: "SET_SAVING", payload: false });
    }
  }, [state.worksheetId, state.title, state.cards, state.settings, state.published]);

  return (
    <FlashcardContext.Provider value={{ state, dispatch, addCard, duplicateCard, save }}>
      {children}
    </FlashcardContext.Provider>
  );
}

export function useFlashcardEditor() {
  const ctx = useContext(FlashcardContext);
  if (!ctx) throw new Error("useFlashcardEditor must be used within FlashcardProvider");
  return ctx;
}
