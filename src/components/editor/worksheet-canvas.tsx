"use client";

import React from "react";
import {
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useEditor } from "@/store/editor-store";
import { SortableBlock } from "./sortable-block";
import { Plus } from "lucide-react";

function DropIndicator({ isActive }: { isActive: boolean }) {
  return (
    <div
      className={`relative transition-all duration-200 ${isActive ? "h-1" : "h-0"}`}
    >
      {isActive && (
        <div className="absolute inset-x-0 top-0 flex items-center">
          <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
          <div className="flex-1 h-0.5 bg-primary" />
          <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
        </div>
      )}
    </div>
  );
}

function EmptyDropZone() {
  const { setNodeRef, isOver } = useDroppable({ id: "canvas-drop-zone" });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col items-center justify-center min-h-[400px] text-muted-foreground rounded-lg border-2 border-dashed transition-colors
        ${isOver ? "border-primary bg-primary/5" : "border-transparent"}`}
    >
      <Plus className="h-12 w-12 mb-4 opacity-30" />
      <p className="text-lg font-medium opacity-50">
        Drag blocks here to start building
      </p>
      <p className="text-sm opacity-30 mt-1">
        Or double-click a block in the sidebar
      </p>
    </div>
  );
}

export function WorksheetCanvas({
  activeId,
  overId,
}: {
  activeId: string | null;
  overId: string | null;
}) {
  const { state, dispatch } = useEditor();
  const { setNodeRef: setCanvasRef, isOver: isCanvasOver } = useDroppable({ id: "canvas-drop-zone" });

  // Page dimensions (A4 at 96 DPI = 794 x 1123)
  const pageWidth = state.settings.pageSize === "a4" ? 794 : 816;

  return (
    <div className="flex-1 bg-muted/30 overflow-auto">
      <div className="flex justify-center py-8 px-4">
        <div
          ref={state.blocks.length === 0 ? setCanvasRef : undefined}
          className={`bg-white shadow-lg rounded-sm border transition-colors
            ${isCanvasOver && state.blocks.length === 0 ? "border-primary ring-2 ring-primary/20" : ""}`}
          style={{
            width: pageWidth,
            minHeight: 1123,
            padding: `${state.settings.margins.top}px ${state.settings.margins.right}px ${state.settings.margins.bottom}px ${state.settings.margins.left}px`,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              dispatch({ type: "SELECT_BLOCK", payload: null });
            }
          }}
        >
          {/* Header */}
          {state.settings.showHeader && state.settings.headerText && (
            <div className="text-center text-sm text-muted-foreground mb-4 pb-2 border-b">
              {state.settings.headerText}
            </div>
          )}

          {/* Blocks */}
          {state.blocks.length === 0 ? (
            <EmptyDropZone />
          ) : (
            <SortableContext
              items={state.blocks.map((b) => b.id)}
              strategy={verticalListSortingStrategy}
            >
              <div>
                {state.blocks.map((block, index) => {
                  // Show drop indicator before/after blocks based on overId
                  const isDragging = !!activeId;
                  const isOverThis = overId === block.id;
                  // Don't show indicator on the block being dragged
                  const isActiveBlock = activeId === block.id;

                  return (
                    <React.Fragment key={block.id}>
                      {/* Drop indicator before first block */}
                      {index === 0 && isDragging && (
                        <DropIndicator isActive={isOverThis && !isActiveBlock} />
                      )}
                      <div className={index > 0 ? "mt-2" : ""}>
                        <SortableBlock
                          block={block}
                          mode={state.viewMode}
                        />
                      </div>
                      {/* Drop indicator after each block */}
                      {isDragging && !isActiveBlock && (
                        <DropIndicator isActive={isOverThis} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </SortableContext>
          )}

          {/* Footer */}
          {state.settings.showFooter && state.settings.footerText && (
            <div className="text-center text-sm text-muted-foreground mt-4 pt-2 border-t">
              {state.settings.footerText}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
