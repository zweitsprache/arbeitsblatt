"use client";

import React, { createContext, useContext, useReducer, useCallback } from "react";
import { authFetch } from "@/lib/auth-fetch";
import {
  FlashcardCollection,
  FlashcardCollectionSet,
  CreateCollectionRequest,
  UpdateCollectionRequest,
} from "@/types/collection";

// ─── State ───────────────────────────────────────────────────
interface CollectionState {
  collections: FlashcardCollection[];
  currentCollection: FlashcardCollection | null;
  isLoading: boolean;
  error: string | null;
  isSaving: boolean;
}

const initialState: CollectionState = {
  collections: [],
  currentCollection: null,
  isLoading: false,
  error: null,
  isSaving: false,
};

// ─── Actions ─────────────────────────────────────────────────
type CollectionAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_SAVING"; payload: boolean }
  | { type: "SET_COLLECTIONS"; payload: FlashcardCollection[] }
  | { type: "SET_CURRENT"; payload: FlashcardCollection | null }
  | { type: "ADD_COLLECTION"; payload: FlashcardCollection }
  | { type: "UPDATE_COLLECTION"; payload: FlashcardCollection }
  | { type: "DELETE_COLLECTION"; payload: string }
  | { type: "ADD_SET_TO_COLLECTION"; payload: { collectionId: string; set: FlashcardCollectionSet } }
  | { type: "REMOVE_SET_FROM_COLLECTION"; payload: { collectionId: string; setId: string } }
  | { type: "REORDER_SETS"; payload: { collectionId: string; sets: FlashcardCollectionSet[] } };

// ─── Reducer ─────────────────────────────────────────────────
function collectionReducer(
  state: CollectionState,
  action: CollectionAction
): CollectionState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };

    case "SET_ERROR":
      return { ...state, error: action.payload };

    case "SET_SAVING":
      return { ...state, isSaving: action.payload };

    case "SET_COLLECTIONS":
      return { ...state, collections: action.payload };

    case "SET_CURRENT":
      return { ...state, currentCollection: action.payload };

    case "ADD_COLLECTION":
      return { ...state, collections: [action.payload, ...state.collections] };

    case "UPDATE_COLLECTION": {
      const updated = state.collections.map((c) =>
        c.id === action.payload.id ? action.payload : c
      );
      const isCurrent = state.currentCollection?.id === action.payload.id;
      return {
        ...state,
        collections: updated,
        currentCollection: isCurrent ? action.payload : state.currentCollection,
      };
    }

    case "DELETE_COLLECTION": {
      const updated = state.collections.filter((c) => c.id !== action.payload);
      const isCurrent = state.currentCollection?.id === action.payload;
      return {
        ...state,
        collections: updated,
        currentCollection: isCurrent ? null : state.currentCollection,
      };
    }

    case "ADD_SET_TO_COLLECTION": {
      if (!state.currentCollection) return state;
      if (state.currentCollection.id !== action.payload.collectionId) return state;

      const updated = {
        ...state.currentCollection,
        sets: [
          ...(state.currentCollection.sets || []),
          action.payload.set,
        ].sort((a, b) => a.order - b.order),
      };

      return {
        ...state,
        currentCollection: updated,
        collections: state.collections.map((c) =>
          c.id === updated.id ? updated : c
        ),
      };
    }

    case "REMOVE_SET_FROM_COLLECTION": {
      if (!state.currentCollection) return state;
      if (state.currentCollection.id !== action.payload.collectionId) return state;

      const updated = {
        ...state.currentCollection,
        sets: (state.currentCollection.sets || []).filter(
          (s) => s.id !== action.payload.setId
        ),
      };

      return {
        ...state,
        currentCollection: updated,
        collections: state.collections.map((c) =>
          c.id === updated.id ? updated : c
        ),
      };
    }

    case "REORDER_SETS": {
      if (!state.currentCollection) return state;
      if (state.currentCollection.id !== action.payload.collectionId) return state;

      const updated = {
        ...state.currentCollection,
        sets: action.payload.sets,
      };

      return {
        ...state,
        currentCollection: updated,
        collections: state.collections.map((c) =>
          c.id === updated.id ? updated : c
        ),
      };
    }

    default:
      return state;
  }
}

// ─── Context ─────────────────────────────────────────────────
interface CollectionContextValue {
  state: CollectionState;
  dispatch: React.Dispatch<CollectionAction>;
  fetchCollections: () => Promise<void>;
  fetchCollection: (id: string) => Promise<void>;
  createCollection: (data: CreateCollectionRequest) => Promise<FlashcardCollection | null>;
  updateCollection: (id: string, data: UpdateCollectionRequest) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
  addSetToCollection: (collectionId: string, worksheetId: string) => Promise<void>;
  removeSetFromCollection: (collectionId: string, worksheetId: string) => Promise<void>;
  reorderSets: (collectionId: string, sets: Array<{ id: string; order: number }>) => Promise<void>;
}

const CollectionContext = createContext<CollectionContextValue | null>(null);

export function CollectionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, dispatch] = useReducer(collectionReducer, initialState);

  const fetchCollections = useCallback(async () => {
    dispatch({ type: "SET_LOADING", payload: true });
    dispatch({ type: "SET_ERROR", payload: null });
    try {
      const res = await authFetch("/api/collections");
      if (!res.ok) {
        throw new Error(`Failed to fetch collections: ${res.status}`);
      }
      const data: FlashcardCollection[] = await res.json();
      dispatch({ type: "SET_COLLECTIONS", payload: data });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      dispatch({ type: "SET_ERROR", payload: message });
      console.error("fetchCollections error:", error);
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, []);

  const fetchCollection = useCallback(async (id: string) => {
    dispatch({ type: "SET_LOADING", payload: true });
    dispatch({ type: "SET_ERROR", payload: null });
    try {
      const res = await authFetch(`/api/collections/${id}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch collection: ${res.status}`);
      }
      const data: FlashcardCollection = await res.json();
      dispatch({ type: "SET_CURRENT", payload: data });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      dispatch({ type: "SET_ERROR", payload: message });
      console.error("fetchCollection error:", error);
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, []);

  const createCollection = useCallback(
    async (data: CreateCollectionRequest): Promise<FlashcardCollection | null> => {
      dispatch({ type: "SET_SAVING", payload: true });
      dispatch({ type: "SET_ERROR", payload: null });
      try {
        const res = await authFetch("/api/collections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || `Failed to create collection: ${res.status}`);
        }
        const collection: FlashcardCollection = await res.json();
        dispatch({ type: "ADD_COLLECTION", payload: collection });
        dispatch({ type: "SET_CURRENT", payload: collection });
        return collection;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        dispatch({ type: "SET_ERROR", payload: message });
        console.error("createCollection error:", error);
        return null;
      } finally {
        dispatch({ type: "SET_SAVING", payload: false });
      }
    },
    []
  );

  const updateCollection = useCallback(async (id: string, data: UpdateCollectionRequest) => {
    dispatch({ type: "SET_SAVING", payload: true });
    dispatch({ type: "SET_ERROR", payload: null });
    try {
      const res = await authFetch(`/api/collections/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || `Failed to update collection: ${res.status}`);
      }
      const collection: FlashcardCollection = await res.json();
      dispatch({ type: "UPDATE_COLLECTION", payload: collection });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      dispatch({ type: "SET_ERROR", payload: message });
      console.error("updateCollection error:", error);
    } finally {
      dispatch({ type: "SET_SAVING", payload: false });
    }
  }, []);

  const deleteCollection = useCallback(async (id: string) => {
    dispatch({ type: "SET_SAVING", payload: true });
    dispatch({ type: "SET_ERROR", payload: null });
    try {
      const res = await authFetch(`/api/collections/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || `Failed to delete collection: ${res.status}`);
      }
      dispatch({ type: "DELETE_COLLECTION", payload: id });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      dispatch({ type: "SET_ERROR", payload: message });
      console.error("deleteCollection error:", error);
    } finally {
      dispatch({ type: "SET_SAVING", payload: false });
    }
  }, []);

  const addSetToCollection = useCallback(
    async (collectionId: string, worksheetId: string) => {
      dispatch({ type: "SET_SAVING", payload: true });
      dispatch({ type: "SET_ERROR", payload: null });
      try {
        const res = await authFetch(`/api/collections/${collectionId}/sets`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ worksheetId }),
        });
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || `Failed to add set: ${res.status}`);
        }
        const set: FlashcardCollectionSet = await res.json();
        dispatch({ type: "ADD_SET_TO_COLLECTION", payload: { collectionId, set } });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        dispatch({ type: "SET_ERROR", payload: message });
        console.error("addSetToCollection error:", error);
      } finally {
        dispatch({ type: "SET_SAVING", payload: false });
      }
    },
    []
  );

  const removeSetFromCollection = useCallback(
    async (collectionId: string, worksheetId: string) => {
      dispatch({ type: "SET_SAVING", payload: true });
      dispatch({ type: "SET_ERROR", payload: null });
      try {
        const res = await authFetch(
          `/api/collections/${collectionId}/sets?worksheetId=${worksheetId}`,
          {
            method: "DELETE",
          }
        );
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || `Failed to remove set: ${res.status}`);
        }
        // Find the set id to remove
        const set = state.currentCollection?.sets?.find(
          (s) => s.worksheetId === worksheetId
        );
        if (set) {
          dispatch({
            type: "REMOVE_SET_FROM_COLLECTION",
            payload: { collectionId, setId: set.id },
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        dispatch({ type: "SET_ERROR", payload: message });
        console.error("removeSetFromCollection error:", error);
      } finally {
        dispatch({ type: "SET_SAVING", payload: false });
      }
    },
    [state.currentCollection?.sets]
  );

  const reorderSets = useCallback(
    async (collectionId: string, sets: Array<{ id: string; order: number }>) => {
      dispatch({ type: "SET_SAVING", payload: true });
      dispatch({ type: "SET_ERROR", payload: null });
      try {
        const res = await authFetch(`/api/collections/${collectionId}/sets`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sets }),
        });
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || `Failed to reorder sets: ${res.status}`);
        }
        const reordered: FlashcardCollectionSet[] = await res.json();
        dispatch({
          type: "REORDER_SETS",
          payload: { collectionId, sets: reordered },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        dispatch({ type: "SET_ERROR", payload: message });
        console.error("reorderSets error:", error);
      } finally {
        dispatch({ type: "SET_SAVING", payload: false });
      }
    },
    []
  );

  const value: CollectionContextValue = {
    state,
    dispatch,
    fetchCollections,
    fetchCollection,
    createCollection,
    updateCollection,
    deleteCollection,
    addSetToCollection,
    removeSetFromCollection,
    reorderSets,
  };

  return (
    <CollectionContext.Provider value={value}>
      {children}
    </CollectionContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────
export function useCollection() {
  const context = useContext(CollectionContext);
  if (!context) {
    throw new Error("useCollection must be used within CollectionProvider");
  }
  return context;
}
