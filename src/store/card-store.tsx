"use client";

import React, { createContext, useContext, useReducer, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { authFetch } from "@/lib/auth-fetch";
import {
  CardItem,
  CardSettings,
  DEFAULT_CARD_SETTINGS,
} from "@/types/card";

// ─── State ───────────────────────────────────────────────────
interface CardState {
  worksheetId: string | null;
  title: string;
  slug: string;
  cards: CardItem[];
  settings: CardSettings;
  selectedCardId: string | null;
  isDirty: boolean;
  isSaving: boolean;
  published: boolean;
}

const initialState: CardState = {
  worksheetId: null,
  title: "Untitled Cards",
  slug: "",
  cards: [],
  settings: DEFAULT_CARD_SETTINGS,
  selectedCardId: null,
  isDirty: false,
  isSaving: false,
  published: false,
};

// ─── Actions ─────────────────────────────────────────────────
type CardAction =
  | { type: "LOAD"; payload: { id: string; title: string; slug: string; cards: CardItem[]; settings: CardSettings; published: boolean } }
  | { type: "SET_TITLE"; payload: string }
  | { type: "ADD_CARD"; payload: { card: CardItem; index?: number } }
  | { type: "UPDATE_CARD"; payload: { id: string; updates: Partial<CardItem> } }
  | { type: "REMOVE_CARD"; payload: string }
  | { type: "REORDER_CARDS"; payload: CardItem[] }
  | { type: "SELECT_CARD"; payload: string | null }
  | { type: "UPDATE_SETTINGS"; payload: Partial<CardSettings> }
  | { type: "SET_SAVING"; payload: boolean }
  | { type: "MARK_SAVED" }
  | { type: "SET_PUBLISHED"; payload: boolean };

// ─── Reducer ─────────────────────────────────────────────────
function cardReducer(state: CardState, action: CardAction): CardState {
  switch (action.type) {
    case "LOAD":
      return {
        ...state,
        worksheetId: action.payload.id,
        title: action.payload.title,
        slug: action.payload.slug,
        cards: action.payload.cards,
        settings: { ...DEFAULT_CARD_SETTINGS, ...action.payload.settings },
        published: action.payload.published,
        isDirty: false,
      };

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

    case "REMOVE_CARD":
      return {
        ...state,
        cards: state.cards.filter((c) => c.id !== action.payload),
        selectedCardId:
          state.selectedCardId === action.payload ? null : state.selectedCardId,
        isDirty: true,
      };

    case "REORDER_CARDS":
      return { ...state, cards: action.payload, isDirty: true };

    case "SELECT_CARD":
      return { ...state, selectedCardId: action.payload };

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
interface CardContextValue {
  state: CardState;
  dispatch: React.Dispatch<CardAction>;
  addCard: () => void;
  duplicateCard: (id: string) => void;
  save: () => Promise<void>;
}

const CardContext = createContext<CardContextValue | null>(null);

function createEmptyCard(): CardItem {
  return {
    id: uuidv4(),
    text: "",
  };
}

export function CardProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cardReducer, initialState);

  const addCard = useCallback(() => {
    const card = createEmptyCard();
    dispatch({ type: "ADD_CARD", payload: { card } });
  }, []);

  const duplicateCard = useCallback(
    (id: string) => {
      const card = state.cards.find((c) => c.id === id);
      if (!card) return;
      const idx = state.cards.indexOf(card);
      const newCard: CardItem = {
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
          type: "cards",
          title: state.title,
          blocks: state.cards,
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
            cards: data.blocks as CardItem[],
            settings: data.settings as CardSettings,
            published: data.published,
          },
        });
        const locale = window.location.pathname.split("/")[1] || "de";
        window.history.replaceState(null, "", `/${locale}/editor/cards/${data.id}`);
      }
      dispatch({ type: "MARK_SAVED" });
    } catch (err) {
      console.error("Save failed:", err);
      dispatch({ type: "SET_SAVING", payload: false });
    }
  }, [state.worksheetId, state.title, state.cards, state.settings, state.published]);

  return (
    <CardContext.Provider value={{ state, dispatch, addCard, duplicateCard, save }}>
      {children}
    </CardContext.Provider>
  );
}

export function useCardEditor() {
  const ctx = useContext(CardContext);
  if (!ctx) throw new Error("useCardEditor must be used within CardProvider");
  return ctx;
}
