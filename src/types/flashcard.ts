import { ChOverrides } from "./worksheet";

// ─── Flashcard types ─────────────────────────────────────────

export interface FlashcardItem {
  id: string;
  front: FlashcardSide;
  back: FlashcardSide;
}

export interface FlashcardSide {
  text: string;
  image?: string; // URL to uploaded image
  imageAspectRatio?: "16:9" | "4:3" | "1:1" | "3:4" | "9:16";
  imageScale?: number; // 10-100
  textPosition?: "top" | "center" | "bottom";
  textAlign?: "left" | "center" | "right";
  fontSize?: number; // pt size for PDF, default 11
  fontWeight?: "normal" | "bold";
  textColor?: string; // hex color override, default is black
}

export interface FlashcardGlobalTextStyle {
  fontSize: number;
  textAlign: "left" | "center" | "right";
  textColor: string;
}

// ─── Flashcard document ──────────────────────────────────────
export interface FlashcardDocument {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  cards: FlashcardItem[];
  settings: FlashcardSettings;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Flashcard settings ─────────────────────────────────────
export interface FlashcardSettings {
  cardsPerPage: number;
  singleSided: boolean;
  padEmptyCards: boolean;
  globalTextStyle: FlashcardGlobalTextStyle;
  chOverrides?: ChOverrides;
  brandProfileId?: string;
  subProfileId?: string;
}

export const DEFAULT_FLASHCARD_SETTINGS: FlashcardSettings = {
  cardsPerPage: 8,
  globalTextStyle: {
    fontSize: 11,
    textAlign: "center",
    textColor: "#000000",
  },
  singleSided: false,
  padEmptyCards: false,
};
