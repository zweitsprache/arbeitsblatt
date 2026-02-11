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
  // Placeholder for future PDF layout settings
  cardsPerPage: number;
}

export const DEFAULT_FLASHCARD_SETTINGS: FlashcardSettings = {
  cardsPerPage: 8,
};
