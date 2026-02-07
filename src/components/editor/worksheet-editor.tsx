"use client";

import React, { useEffect, useId, useState, useCallback } from "react";
import {
  DndContext,
  pointerWithin,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { TooltipProvider } from "@/components/ui/tooltip";
import { EditorProvider, useEditor } from "@/store/editor-store";
import { BlockSidebar } from "./block-sidebar";
import { WorksheetCanvas } from "./worksheet-canvas";
import { PropertiesPanel } from "./properties-panel";
import { EditorToolbar } from "./editor-toolbar";
import { WorksheetDocument, BlockType, BLOCK_LIBRARY, WorksheetBlock } from "@/types/worksheet";
import { BlockRenderer } from "./block-renderer";
import { v4 as uuidv4 } from "uuid";

function EditorInner({
  initialData,
}: {
  initialData?: WorksheetDocument | null;
}) {
  const { state, dispatch, addBlock, save } = useEditor();
  const dndId = useId();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load initial data
  useEffect(() => {
    if (initialData) {
      dispatch({
        type: "LOAD_WORKSHEET",
        payload: {
          id: initialData.id,
          title: initialData.title,
          slug: initialData.slug,
          blocks: initialData.blocks,
          settings: initialData.settings,
          published: initialData.published,
        },
      });
    }
  }, [initialData, dispatch]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        save();
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        const active = document.activeElement;
        const isEditing =
          active?.tagName === "INPUT" ||
          active?.tagName === "TEXTAREA" ||
          (active as HTMLElement)?.contentEditable === "true";
        if (!isEditing && state.selectedBlockId) {
          dispatch({ type: "REMOVE_BLOCK", payload: state.selectedBlockId });
        }
      }
      if (e.key === "Escape") {
        dispatch({ type: "SELECT_BLOCK", payload: null });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [save, state.selectedBlockId, dispatch]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    setOverId(event.over?.id as string | null);
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    setOverId(null);
    const { active, over } = event;
    const activeData = active.data.current;
    const overData = over?.data.current;

    // ── 1. Dragging from sidebar library ──────────────────────
    if (activeData?.type === "library-block") {
      const blockType = activeData.blockType as BlockType;

      // Dropped into a column
      if (overData?.type === "column-drop") {
        const { blockId, colIndex } = overData as { blockId: string; colIndex: number };
        const columnsBlock = state.blocks.find((b) => b.id === blockId);
        if (columnsBlock && columnsBlock.type === "columns") {
          const def = BLOCK_LIBRARY.find((b) => b.type === blockType);
          if (!def) return;
          const newChildBlock = { ...def.defaultData, id: uuidv4() } as WorksheetBlock;
          const newChildren = columnsBlock.children.map((col: WorksheetBlock[], i: number) =>
            i === colIndex ? [...col, newChildBlock] : col
          );
          dispatch({
            type: "UPDATE_BLOCK",
            payload: { id: blockId, updates: { children: newChildren } },
          });
        }
        return;
      }

      if (over) {
        const overIndex = state.blocks.findIndex((b) => b.id === over.id);
        addBlock(blockType, overIndex >= 0 ? overIndex + 1 : undefined);
      } else {
        addBlock(blockType);
      }
      return;
    }

    // ── 2. Dragging a column child ────────────────────────────
    if (activeData?.type === "column-child") {
      const blockId = activeData.blockId as string;

      // Dropped into a column (same or different)
      if (overData?.type === "column-drop") {
        const { blockId: targetParentId, colIndex: targetColIndex } = overData as {
          blockId: string;
          colIndex: number;
        };
        dispatch({
          type: "MOVE_BLOCK_BETWEEN_COLUMNS",
          payload: { blockId, targetParentId, targetColIndex },
        });
        return;
      }

      // Dropped on a top-level sortable block → move out of column to top level
      if (over) {
        const overTopLevelId = over.id as string;
        // Only proceed if the over target is a top-level block
        const isTopLevel = state.blocks.some((b) => b.id === overTopLevelId);
        if (isTopLevel) {
          dispatch({
            type: "MOVE_BLOCK_FROM_COLUMN_TO_TOP",
            payload: { blockId, insertAfterBlockId: overTopLevelId },
          });
          return;
        }
      }

      // Dropped on empty canvas → move to end of top-level
      dispatch({
        type: "MOVE_BLOCK_FROM_COLUMN_TO_TOP",
        payload: { blockId },
      });
      return;
    }

    // ── 3. Dragging a top-level sortable block ────────────────
    if (over && active.id !== over.id) {
      // Dropped into a column
      if (overData?.type === "column-drop") {
        const { blockId: targetParentId, colIndex: targetColIndex } = overData as {
          blockId: string;
          colIndex: number;
        };
        dispatch({
          type: "MOVE_BLOCK_TO_COLUMN",
          payload: {
            blockId: active.id as string,
            targetParentId,
            targetColIndex,
          },
        });
        return;
      }

      // Normal top-level reorder
      dispatch({
        type: "MOVE_BLOCK",
        payload: { activeId: active.id as string, overId: over.id as string },
      });
    }
  };

  // Find the currently dragged block for the overlay preview
  const activeBlock = activeId
    ? state.blocks.find((b) => b.id === activeId)
    : null;
  // For library drags, get the block definition
  const activeLibraryType = activeId?.startsWith("library-")
    ? activeId.replace("library-", "")
    : null;
  const activeLibraryDef = activeLibraryType
    ? BLOCK_LIBRARY.find((b) => b.type === activeLibraryType)
    : null;

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="h-screen flex flex-col">
        <EditorToolbar />
        <div className="flex flex-1 overflow-hidden">
          <BlockSidebar onAddBlock={(type) => addBlock(type)} />
          <WorksheetCanvas activeId={activeId} overId={overId} />
          <PropertiesPanel />
        </div>
      </div>

      {/* Drag overlay — floating preview that follows cursor */}
      <DragOverlay dropAnimation={null}>
        {activeBlock ? (
          <div className="bg-white rounded-lg border border-primary/30 shadow-xl p-3 opacity-90 max-w-[600px] max-h-[120px] overflow-hidden pointer-events-none">
            <BlockRenderer block={activeBlock} mode={state.viewMode} />
          </div>
        ) : activeLibraryDef ? (
          <div className="bg-white rounded-lg border border-primary/30 shadow-xl px-4 py-3 opacity-90 pointer-events-none">
            <p className="text-sm font-medium">{activeLibraryDef.label}</p>
            <p className="text-xs text-muted-foreground">{activeLibraryDef.description}</p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export function WorksheetEditor({
  initialData,
}: {
  initialData?: WorksheetDocument | null;
}) {
  return (
    <TooltipProvider>
      <EditorProvider>
        <EditorInner initialData={initialData} />
      </EditorProvider>
    </TooltipProvider>
  );
}
