"use client";

import React, { useEffect, useId, useState, useCallback, useMemo } from "react";
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
import { BlockSidebar } from "@/components/editor/block-sidebar";
import { WorksheetCanvas } from "@/components/editor/worksheet-canvas";
import { PropertiesPanel } from "@/components/editor/properties-panel";
import { PresentationToolbar } from "./presentation-toolbar";
import { PresentationDocument } from "@/types/presentation";
import { DEFAULT_SETTINGS, BlockType, BLOCK_LIBRARY, WorksheetBlock } from "@/types/worksheet";
import { BlockRenderer } from "@/components/editor/block-renderer";
import { v4 as uuidv4 } from "uuid";

function EditorInner({
  initialData,
}: {
  initialData?: PresentationDocument | null;
}) {
  const { state, dispatch, addBlock, save } = useEditor();
  const dndId = useId();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [overPosition, setOverPosition] = useState<"above" | "below">("below");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load initial data — map presentation settings into WorksheetSettings shape
  useEffect(() => {
    if (initialData) {
      dispatch({
        type: "LOAD_WORKSHEET",
        payload: {
          id: initialData.id,
          title: initialData.title,
          slug: initialData.slug,
          blocks: initialData.blocks,
          settings: {
            ...DEFAULT_SETTINGS,
            orientation: "landscape" as const,
            showHeader: false,
            showFooter: false,
            margins: { top: 0, right: 0, bottom: 0, left: 0 },
            fontSize: initialData.settings.fontSize,
            fontFamily: initialData.settings.fontFamily,
            brand: initialData.settings.brand,
            // Store the presentation background color in brandSettings
            _presentationMode: true,
            _backgroundColor: initialData.settings.backgroundColor,
          } as never,
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
    const overId = event.over?.id as string | null;
    setOverId(overId);

    if (event.over && event.activatorEvent && 'clientY' in event.activatorEvent) {
      const overRect = event.over.rect;
      const pointerY = (event.activatorEvent as PointerEvent).clientY + (event.delta?.y ?? 0);
      const midY = overRect.top + overRect.height / 2;
      setOverPosition(pointerY < midY ? "above" : "below");
    }
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    setOverId(null);
    const { active, over } = event;
    const activeData = active.data.current;
    const overData = over?.data.current;

    // Dragging from sidebar library
    if (activeData?.type === "library-block") {
      const blockType = activeData.blockType as BlockType;

      if (overData?.type === "column-drop") {
        const { blockId, colIndex } = overData as { blockId: string; colIndex: number };
        const def = BLOCK_LIBRARY.find((b) => b.type === blockType);
        if (!def) return;
        const newChildBlock = { ...def.defaultData, id: uuidv4() } as WorksheetBlock;
        const containerBlock = state.blocks.find((b) => b.id === blockId);
        if (!containerBlock) return;
        if (containerBlock.type === "columns") {
          const slot = containerBlock.children[colIndex] ?? [];
          dispatch({
            type: "DUPLICATE_IN_COLUMN",
            payload: { parentBlockId: blockId, colIndex, block: newChildBlock, afterIndex: slot.length },
          });
        } else if (containerBlock.type === "grid") {
          const slot = containerBlock.children[colIndex] ?? [];
          dispatch({
            type: "DUPLICATE_IN_COLUMN",
            payload: { parentBlockId: blockId, colIndex, block: newChildBlock, afterIndex: slot.length },
          });
        } else if (containerBlock.type === "accordion") {
          const slot = containerBlock.items[colIndex]?.children ?? [];
          dispatch({
            type: "DUPLICATE_IN_COLUMN",
            payload: { parentBlockId: blockId, colIndex, block: newChildBlock, afterIndex: slot.length },
          });
        }
        return;
      }

      if (over) {
        const overIndex = state.blocks.findIndex((b) => b.id === over.id);
        if (overIndex >= 0) {
          addBlock(blockType, overPosition === "above" ? overIndex : overIndex + 1);
        } else {
          addBlock(blockType);
        }
      } else {
        addBlock(blockType);
      }
      return;
    }

    // Dragging a column child
    if (activeData?.type === "column-child") {
      const blockId = activeData.blockId as string;
      if (overData?.type === "column-drop") {
        const { blockId: targetParentId, colIndex: targetColIndex } = overData as { blockId: string; colIndex: number };
        dispatch({ type: "MOVE_BLOCK_BETWEEN_COLUMNS", payload: { blockId, targetParentId, targetColIndex } });
        return;
      }
      if (over) {
        const isTopLevel = state.blocks.some((b) => b.id === over.id);
        if (isTopLevel) {
          dispatch({ type: "MOVE_BLOCK_FROM_COLUMN_TO_TOP", payload: { blockId, insertAfterBlockId: over.id as string } });
          return;
        }
      }
      dispatch({ type: "MOVE_BLOCK_FROM_COLUMN_TO_TOP", payload: { blockId } });
      return;
    }

    // Dragging a top-level sortable block
    if (over && active.id !== over.id) {
      if (overData?.type === "column-drop") {
        const { blockId: targetParentId, colIndex: targetColIndex } = overData as { blockId: string; colIndex: number };
        dispatch({ type: "MOVE_BLOCK_TO_COLUMN", payload: { blockId: active.id as string, targetParentId, targetColIndex } });
        return;
      }
      dispatch({ type: "MOVE_BLOCK", payload: { activeId: active.id as string, overId: over.id as string, position: overPosition } });
    }
  };

  // Drag overlay for visual feedback
  const draggedBlock = activeId
    ? state.blocks.find((b) => b.id === activeId)
    : null;
  const draggedLibraryType =
    activeId?.startsWith("library-") ? activeId.replace("library-", "") : null;

  return (
    <div className="h-full flex flex-col">
      <PresentationToolbar />
      <div className="flex flex-1 min-h-0 overflow-hidden bg-muted/30">
        <DndContext
          id={dndId}
          sensors={sensors}
          collisionDetection={pointerWithin}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <BlockSidebar onAddBlock={(type) => addBlock(type)} />
          <WorksheetCanvas
            activeId={activeId}
            overId={overId}
            overPosition={overPosition}
          />
          <PropertiesPanel />
          <DragOverlay dropAnimation={null}>
            {draggedBlock && (
              <div className="opacity-60 pointer-events-none max-w-[600px]">
                <BlockRenderer block={draggedBlock} mode={state.viewMode} />
              </div>
            )}
            {draggedLibraryType && (
              <div className="bg-card border rounded-lg p-3 shadow-lg opacity-80 pointer-events-none">
                <p className="text-sm font-medium">
                  {BLOCK_LIBRARY.find((b) => b.type === draggedLibraryType)?.label}
                </p>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}

export function PresentationEditor({
  initialData,
}: {
  initialData?: PresentationDocument | null;
}) {
  return (
    <TooltipProvider>
      <EditorProvider apiEndpoint="/api/presentations" editorBasePath="/editor/presentation">
        <EditorInner initialData={initialData} />
      </EditorProvider>
    </TooltipProvider>
  );
}
