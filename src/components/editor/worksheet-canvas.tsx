"use client";

import React from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("canvas");
  const { setNodeRef, isOver } = useDroppable({ id: "canvas-drop-zone" });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col items-center justify-center min-h-[400px] text-muted-foreground rounded-lg border-2 border-dashed transition-colors
        ${isOver ? "border-primary bg-primary/5" : "border-transparent"}`}
    >
      <Plus className="h-12 w-12 mb-4 opacity-30" />
      <p className="text-lg font-medium opacity-50">
        {t("dragBlocksHere")}
      </p>
      <p className="text-sm opacity-30 mt-1">
        {t("orDoubleClick")}
      </p>
    </div>
  );
}

export function WorksheetCanvas({
  activeId,
  overId,
  overPosition,
}: {
  activeId: string | null;
  overId: string | null;
  overPosition: "above" | "below";
}) {
  const { state, dispatch } = useEditor();
  const { setNodeRef: setCanvasRef, isOver: isCanvasOver } = useDroppable({ id: "canvas-drop-zone" });

  // Page dimensions (A4 at 96 DPI = 794 x 1123)
  const pageWidth = state.settings.pageSize === "a4" ? 794 : 816;

  return (
    <div 
      className="flex-1 overflow-auto canvas-scroll"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      <div className="flex justify-center py-8 px-4">
        <div
          ref={state.blocks.length === 0 ? setCanvasRef : undefined}
          className={`editor-canvas bg-white shadow-lg rounded-sm border transition-colors
            ${isCanvasOver && state.blocks.length === 0 ? "border-primary ring-2 ring-primary/20" : ""}`}
          style={{
            width: pageWidth,
            minHeight: 1123,
            padding: `${state.settings.margins.top}px ${state.settings.margins.right}px ${state.settings.margins.bottom}px ${state.settings.margins.left}px`,
            fontFamily: "'Asap Condensed', sans-serif",
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
                  // Show drop indicator before/after blocks based on overId + pointer position
                  const isDragging = !!activeId;
                  const isOverThis = overId === block.id;
                  const isActiveBlock = activeId === block.id;

                  // Show above indicator: only on the first block when pointer is in top half
                  const showAbove =
                    index === 0 &&
                    isDragging &&
                    isOverThis &&
                    !isActiveBlock &&
                    overPosition === "above";

                  // Show below indicator: when pointer is in bottom half (or for non-first blocks)
                  const showBelow =
                    isDragging &&
                    isOverThis &&
                    !isActiveBlock &&
                    (index > 0 || overPosition === "below");

                  return (
                    <React.Fragment key={block.id}>
                      {/* Drop indicator before first block */}
                      {index === 0 && isDragging && (
                        <DropIndicator isActive={showAbove} />
                      )}
                      <div className={index > 0 ? "mt-2" : ""}>
                        <SortableBlock
                          block={block}
                          mode={state.viewMode}
                        />
                      </div>
                      {/* Drop indicator after each block */}
                      {isDragging && !isActiveBlock && (
                        <DropIndicator isActive={showBelow} />
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
