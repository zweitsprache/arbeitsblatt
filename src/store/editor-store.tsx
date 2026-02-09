"use client";

import React, { createContext, useContext, useReducer, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { authFetch } from "@/lib/auth-fetch";
import {
  WorksheetBlock,
  WorksheetSettings,
  ViewMode,
  BlockType,
  BLOCK_LIBRARY,
  DEFAULT_SETTINGS,
  BlockVisibility,
} from "@/types/worksheet";

// ─── State ───────────────────────────────────────────────────
interface EditorState {
  worksheetId: string | null;
  title: string;
  slug: string;
  blocks: WorksheetBlock[];
  settings: WorksheetSettings;
  selectedBlockId: string | null;
  viewMode: ViewMode;
  isDirty: boolean;
  isSaving: boolean;
  published: boolean;
}

const initialState: EditorState = {
  worksheetId: null,
  title: "Untitled Worksheet",
  slug: "",
  blocks: [],
  settings: DEFAULT_SETTINGS,
  selectedBlockId: null,
  viewMode: "print",
  isDirty: false,
  isSaving: false,
  published: false,
};

// ─── Actions ─────────────────────────────────────────────────
type EditorAction =
  | { type: "LOAD_WORKSHEET"; payload: { id: string; title: string; slug: string; blocks: WorksheetBlock[]; settings: WorksheetSettings; published: boolean } }
  | { type: "SET_TITLE"; payload: string }
  | { type: "ADD_BLOCK"; payload: { block: WorksheetBlock; index?: number } }
  | { type: "UPDATE_BLOCK"; payload: { id: string; updates: Partial<WorksheetBlock> } }
  | { type: "REMOVE_BLOCK"; payload: string }
  | { type: "MOVE_BLOCK"; payload: { activeId: string; overId: string; position?: "above" | "below" } }
  | { type: "REORDER_BLOCKS"; payload: WorksheetBlock[] }
  | { type: "SELECT_BLOCK"; payload: string | null }
  | { type: "SET_VIEW_MODE"; payload: ViewMode }
  | { type: "UPDATE_SETTINGS"; payload: Partial<WorksheetSettings> }
  | { type: "SET_BLOCK_VISIBILITY"; payload: { id: string; visibility: BlockVisibility } }
  | { type: "SET_SAVING"; payload: boolean }
  | { type: "MARK_SAVED" }
  | { type: "SET_PUBLISHED"; payload: boolean }
  | { type: "DUPLICATE_IN_COLUMN"; payload: { parentBlockId: string; colIndex: number; block: WorksheetBlock; afterIndex: number } }
  | { type: "MOVE_BLOCK_TO_COLUMN"; payload: { blockId: string; targetParentId: string; targetColIndex: number } }
  | { type: "MOVE_BLOCK_FROM_COLUMN_TO_TOP"; payload: { blockId: string; insertAfterBlockId?: string } }
  | { type: "MOVE_BLOCK_BETWEEN_COLUMNS"; payload: { blockId: string; targetParentId: string; targetColIndex: number } };

// ─── Reducer ─────────────────────────────────────────────────

/** Recursively map over all blocks, including children inside columns */
function deepMapBlocks(
  blocks: WorksheetBlock[],
  fn: (b: WorksheetBlock) => WorksheetBlock
): WorksheetBlock[] {
  return blocks.map((b) => {
    const mapped = fn(b);
    if (mapped.type === "columns") {
      return {
        ...mapped,
        children: mapped.children.map((col) => deepMapBlocks(col, fn)),
      } as WorksheetBlock;
    }
    return mapped;
  });
}

/** Recursively filter blocks — removes from top-level and inside columns */
function deepFilterBlocks(
  blocks: WorksheetBlock[],
  predicate: (b: WorksheetBlock) => boolean
): WorksheetBlock[] {
  return blocks
    .filter(predicate)
    .map((b) => {
      if (b.type === "columns") {
        return {
          ...b,
          children: b.children.map((col) => deepFilterBlocks(col, predicate)),
        } as WorksheetBlock;
      }
      return b;
    });
}

/** Recursively find a block by id (including inside columns) */
function deepFindBlock(
  blocks: WorksheetBlock[],
  id: string
): { block: WorksheetBlock; parentBlockId?: string; colIndex?: number; indexInCol?: number } | null {
  for (const b of blocks) {
    if (b.id === id) return { block: b };
    if (b.type === "columns") {
      for (let ci = 0; ci < b.children.length; ci++) {
        const col = b.children[ci];
        const idx = col.findIndex((c) => c.id === id);
        if (idx !== -1) {
          return { block: col[idx], parentBlockId: b.id, colIndex: ci, indexInCol: idx };
        }
      }
    }
  }
  return null;
}

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "LOAD_WORKSHEET":
      return {
        ...state,
        worksheetId: action.payload.id,
        title: action.payload.title,
        slug: action.payload.slug,
        blocks: action.payload.blocks,
        settings: { ...DEFAULT_SETTINGS, ...action.payload.settings },
        published: action.payload.published,
        isDirty: false,
      };

    case "SET_TITLE":
      return { ...state, title: action.payload, isDirty: true };

    case "ADD_BLOCK": {
      const { block, index } = action.payload;
      const newBlocks = [...state.blocks];
      if (index !== undefined) {
        newBlocks.splice(index, 0, block);
      } else {
        newBlocks.push(block);
      }
      return { ...state, blocks: newBlocks, selectedBlockId: block.id, isDirty: true };
    }

    case "UPDATE_BLOCK":
      return {
        ...state,
        blocks: deepMapBlocks(state.blocks, (b) =>
          b.id === action.payload.id ? { ...b, ...action.payload.updates } as WorksheetBlock : b
        ),
        isDirty: true,
      };

    case "REMOVE_BLOCK":
      return {
        ...state,
        blocks: deepFilterBlocks(state.blocks, (b) => b.id !== action.payload),
        selectedBlockId:
          state.selectedBlockId === action.payload ? null : state.selectedBlockId,
        isDirty: true,
      };

    case "MOVE_BLOCK": {
      const { activeId, overId, position } = action.payload;
      const oldIndex = state.blocks.findIndex((b) => b.id === activeId);
      const newIndex = state.blocks.findIndex((b) => b.id === overId);
      if (oldIndex === -1 || newIndex === -1) return state;
      const newBlocks = [...state.blocks];
      const [moved] = newBlocks.splice(oldIndex, 1);
      // When position is "above", insert before the target; "below" means after
      let insertIndex = newIndex;
      if (position === "below") {
        // After removing the active item, adjust index if it was before the target
        insertIndex = oldIndex < newIndex ? newIndex : newIndex + 1;
      } else {
        // "above" or default: insert at the target position
        insertIndex = oldIndex < newIndex ? newIndex : newIndex;
      }
      newBlocks.splice(insertIndex, 0, moved);
      return { ...state, blocks: newBlocks, isDirty: true };
    }

    case "REORDER_BLOCKS":
      return { ...state, blocks: action.payload, isDirty: true };

    case "SELECT_BLOCK":
      return { ...state, selectedBlockId: action.payload };

    case "SET_VIEW_MODE":
      return { ...state, viewMode: action.payload };

    case "UPDATE_SETTINGS":
      return {
        ...state,
        settings: { ...state.settings, ...action.payload },
        isDirty: true,
      };

    case "SET_BLOCK_VISIBILITY":
      return {
        ...state,
        blocks: deepMapBlocks(state.blocks, (b) =>
          b.id === action.payload.id
            ? { ...b, visibility: action.payload.visibility } as WorksheetBlock
            : b
        ),
        isDirty: true,
      };

    case "SET_SAVING":
      return { ...state, isSaving: action.payload };

    case "MARK_SAVED":
      return { ...state, isDirty: false, isSaving: false };

    case "SET_PUBLISHED":
      return { ...state, published: action.payload, isDirty: true };

    case "DUPLICATE_IN_COLUMN": {
      const { parentBlockId, colIndex, block: newBlock, afterIndex } = action.payload;
      return {
        ...state,
        blocks: state.blocks.map((b) => {
          if (b.id !== parentBlockId || b.type !== "columns") return b;
          const newChildren = [...b.children];
          const newCol = [...newChildren[colIndex]];
          newCol.splice(afterIndex, 0, newBlock);
          newChildren[colIndex] = newCol;
          return { ...b, children: newChildren } as WorksheetBlock;
        }),
        selectedBlockId: newBlock.id,
        isDirty: true,
      };
    }

    case "MOVE_BLOCK_TO_COLUMN": {
      // Move a top-level block into a column
      const { blockId, targetParentId, targetColIndex } = action.payload;
      const blockIndex = state.blocks.findIndex((b) => b.id === blockId);
      if (blockIndex === -1) return state;
      const block = state.blocks[blockIndex];
      // Don't allow dropping a columns block into a column
      if (block.type === "columns") return state;
      const newBlocks = state.blocks.filter((b) => b.id !== blockId);
      return {
        ...state,
        blocks: newBlocks.map((b) => {
          if (b.id !== targetParentId || b.type !== "columns") return b;
          const newChildren = [...b.children];
          newChildren[targetColIndex] = [...newChildren[targetColIndex], block];
          return { ...b, children: newChildren } as WorksheetBlock;
        }),
        isDirty: true,
      };
    }

    case "MOVE_BLOCK_FROM_COLUMN_TO_TOP": {
      // Move a block from inside a column to the top level
      const { blockId, insertAfterBlockId } = action.payload;
      const found = deepFindBlock(state.blocks, blockId);
      if (!found || found.parentBlockId === undefined) return state;
      const block = found.block;
      // Remove from column
      const cleanedBlocks = state.blocks.map((b) => {
        if (b.id !== found.parentBlockId || b.type !== "columns") return b;
        return {
          ...b,
          children: b.children.map((col: WorksheetBlock[]) =>
            col.filter((c) => c.id !== blockId)
          ),
        } as WorksheetBlock;
      });
      // Insert at position
      if (insertAfterBlockId) {
        const insertIdx = cleanedBlocks.findIndex((b) => b.id === insertAfterBlockId);
        if (insertIdx !== -1) {
          cleanedBlocks.splice(insertIdx + 1, 0, block);
        } else {
          cleanedBlocks.push(block);
        }
      } else {
        cleanedBlocks.push(block);
      }
      return { ...state, blocks: cleanedBlocks, isDirty: true };
    }

    case "MOVE_BLOCK_BETWEEN_COLUMNS": {
      // Move a block from one column to another (same or different parent)
      const { blockId, targetParentId, targetColIndex } = action.payload;
      const found = deepFindBlock(state.blocks, blockId);
      if (!found) return state;
      const block = found.block;
      // Remove block from its current location (could be top-level or nested)
      let newBlocks: WorksheetBlock[];
      if (found.parentBlockId !== undefined) {
        // Currently in a column — remove from there
        newBlocks = state.blocks.map((b) => {
          if (b.id !== found.parentBlockId || b.type !== "columns") return b;
          return {
            ...b,
            children: b.children.map((col: WorksheetBlock[]) =>
              col.filter((c) => c.id !== blockId)
            ),
          } as WorksheetBlock;
        });
      } else {
        // Currently top-level
        if (block.type === "columns") return state; // Don't nest columns
        newBlocks = state.blocks.filter((b) => b.id !== blockId);
      }
      // Insert into target column
      return {
        ...state,
        blocks: newBlocks.map((b) => {
          if (b.id !== targetParentId || b.type !== "columns") return b;
          const newChildren = [...b.children];
          newChildren[targetColIndex] = [...newChildren[targetColIndex], block];
          return { ...b, children: newChildren } as WorksheetBlock;
        }),
        isDirty: true,
      };
    }

    default:
      return state;
  }
}

// ─── Context ─────────────────────────────────────────────────
interface EditorContextValue {
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
  addBlock: (type: BlockType, index?: number) => void;
  duplicateBlock: (id: string) => void;
  save: () => Promise<void>;
}

const EditorContext = createContext<EditorContextValue | null>(null);

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(editorReducer, initialState);

  const addBlock = useCallback(
    (type: BlockType, index?: number) => {
      const def = BLOCK_LIBRARY.find((b) => b.type === type);
      if (!def) return;
      const block: WorksheetBlock = {
        ...def.defaultData,
        id: uuidv4(),
      } as WorksheetBlock;
      dispatch({ type: "ADD_BLOCK", payload: { block, index } });
    },
    []
  );

  const duplicateBlock = useCallback(
    (id: string) => {
      // Check top-level first
      const topIdx = state.blocks.findIndex((b) => b.id === id);
      if (topIdx !== -1) {
        const block = state.blocks[topIdx];
        const newBlock = { ...JSON.parse(JSON.stringify(block)), id: uuidv4() } as WorksheetBlock;
        dispatch({ type: "ADD_BLOCK", payload: { block: newBlock, index: topIdx + 1 } });
        return;
      }
      // Check inside columns
      const found = deepFindBlock(state.blocks, id);
      if (found && found.parentBlockId !== undefined && found.colIndex !== undefined && found.indexInCol !== undefined) {
        const newBlock = { ...JSON.parse(JSON.stringify(found.block)), id: uuidv4() } as WorksheetBlock;
        dispatch({
          type: "DUPLICATE_IN_COLUMN",
          payload: {
            parentBlockId: found.parentBlockId,
            colIndex: found.colIndex,
            block: newBlock,
            afterIndex: found.indexInCol + 1,
          },
        });
      }
    },
    [state.blocks]
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
          title: state.title,
          blocks: state.blocks,
          settings: state.settings,
          published: state.published,
        }),
      });
      const data = await res.json();
      if (!state.worksheetId && data.id) {
        dispatch({
          type: "LOAD_WORKSHEET",
          payload: {
            id: data.id,
            title: data.title,
            slug: data.slug,
            blocks: data.blocks,
            settings: data.settings,
            published: data.published,
          },
        });
        // Update URL without reload
        window.history.replaceState(null, "", `/editor/${data.id}`);
      }
      dispatch({ type: "MARK_SAVED" });
    } catch (err) {
      console.error("Save failed:", err);
      dispatch({ type: "SET_SAVING", payload: false });
    }
  }, [state.worksheetId, state.title, state.blocks, state.settings, state.published]);

  return (
    <EditorContext.Provider value={{ state, dispatch, addBlock, duplicateBlock, save }}>
      {children}
    </EditorContext.Provider>
  );
}

export function useEditor() {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditor must be used within EditorProvider");
  return ctx;
}
