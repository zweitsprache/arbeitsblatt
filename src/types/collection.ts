import { FlashcardDocument } from "./flashcard";

// ─── Collection models ──────────────────────────────────────

export interface FlashcardCollectionSet {
  id: string;
  collectionId: string;
  worksheetId: string;
  order: number;
  addedAt: string;
}

export interface FlashcardCollection {
  id: string;
  userId: string;
  slug: string;
  title: string;
  description: string | null;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  sets?: FlashcardCollectionSet[];
}

export interface FlashcardCollectionWithSets extends FlashcardCollection {
  sets: (FlashcardCollectionSet & {
    worksheet?: FlashcardDocument;
  })[];
}

// ─── API Request/Response types ────────────────────────────

export interface CreateCollectionRequest {
  title: string;
  description?: string;
}

export interface UpdateCollectionRequest {
  title?: string;
  description?: string;
  published?: boolean;
}

export interface AddSetToCollectionRequest {
  worksheetId: string;
}

export interface ReorderSetsRequest {
  sets: Array<{
    id: string;
    order: number;
  }>;
}

export interface CollectionWithWorksheets extends FlashcardCollection {
  sets: Array<
    FlashcardCollectionSet & {
      worksheet: FlashcardDocument;
    }
  >;
}
