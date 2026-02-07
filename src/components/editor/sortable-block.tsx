"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { WorksheetBlock, ViewMode } from "@/types/worksheet";
import { BlockRenderer } from "./block-renderer";
import { useEditor } from "@/store/editor-store";
import {
  GripVertical,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Monitor,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

const visibilityIcons = {
  both: Eye,
  print: Printer,
  online: Monitor,
};

const visibilityCycle = ["both", "print", "online"] as const;

export function SortableBlock({
  block,
  mode,
}: {
  block: WorksheetBlock;
  mode: ViewMode;
}) {
  const tc = useTranslations("common");
  const tb = useTranslations("blockRenderer");
  const { state, dispatch, duplicateBlock } = useEditor();
  const isSelected = state.selectedBlockId === block.id;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  // Strip scaleX/scaleY to prevent the block from being squeezed while dragging
  const normalizedTransform = transform
    ? { ...transform, scaleX: 1, scaleY: 1 }
    : transform;
  const style = {
    transform: CSS.Transform.toString(normalizedTransform),
    transition,
  };

  // Check if block should be visible in current mode
  const isVisibleInMode =
    block.visibility === "both" || block.visibility === mode;

  const VisIcon = visibilityIcons[block.visibility];

  const cycleVisibility = () => {
    const currentIdx = visibilityCycle.indexOf(block.visibility);
    const nextIdx = (currentIdx + 1) % visibilityCycle.length;
    dispatch({
      type: "SET_BLOCK_VISIBILITY",
      payload: { id: block.id, visibility: visibilityCycle[nextIdx] },
    });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-lg transition-all border border-transparent
        ${isDragging ? "opacity-30 z-50" : ""}
        ${isSelected ? "ring-1 ring-slate-400 bg-slate-50" : "hover:border-border"}
        ${!isVisibleInMode ? "opacity-40" : ""}
      `}
      onClick={() => dispatch({ type: "SELECT_BLOCK", payload: block.id })}
    >
      {/* Block toolbar */}
      <div
        className={`absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-background border rounded-md shadow-sm px-1 py-0.5 z-10
          ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}
          transition-opacity`}
      >
        {/* Drag handle */}
        <button
          className="p-1 hover:bg-muted rounded cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
        </button>

        {/* Visibility toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="p-1 hover:bg-muted rounded"
              onClick={(e) => {
                e.stopPropagation();
                cycleVisibility();
              }}
            >
              <VisIcon className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">{tb("visibleLabel", { visibility: block.visibility })}</p>
          </TooltipContent>
        </Tooltip>

        {/* Duplicate */}
        <button
          className="p-1 hover:bg-muted rounded"
          onClick={(e) => {
            e.stopPropagation();
            duplicateBlock(block.id);
          }}
        >
          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
        </button>

        {/* Delete */}
        <button
          className="p-1 hover:bg-destructive/10 rounded"
          onClick={(e) => {
            e.stopPropagation();
            dispatch({ type: "REMOVE_BLOCK", payload: block.id });
          }}
        >
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </button>
      </div>

      {/* Visibility badge */}
      {block.visibility !== "both" && (
        <Badge
          variant="secondary"
          className="absolute -top-2 -right-2 text-[10px] px-1.5 py-0 z-10"
        >
          {block.visibility === "print" ? tc("printOnly") : tc("onlineOnly")}
        </Badge>
      )}

      {/* Block content */}
      <div className="p-3">
        <BlockRenderer block={block} mode={mode} />
      </div>
    </div>
  );
}
