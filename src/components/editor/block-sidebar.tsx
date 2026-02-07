"use client";

import React from "react";
import { useDraggable } from "@dnd-kit/core";
import { BLOCK_LIBRARY, BlockDefinition, BlockType } from "@/types/worksheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Heading,
  Type,
  Image,
  Space,
  Minus,
  Columns2,
  CircleDot,
  TextCursorInput,
  ArrowLeftRight,
  PenLine,
  LayoutList,
  CheckSquare,
} from "lucide-react";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Heading,
  Type,
  Image,
  Space,
  Minus,
  Columns2,
  CircleDot,
  TextCursorInput,
  ArrowLeftRight,
  PenLine,
  LayoutList,
  CheckSquare,
};

function DraggableBlockItem({ definition }: { definition: BlockDefinition }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `library-${definition.type}`,
    data: { type: "library-block", blockType: definition.type },
  });

  const Icon = iconMap[definition.icon];

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`flex items-center gap-3 p-3 rounded-lg border border-border bg-card cursor-grab
        hover:bg-accent hover:border-accent transition-colors
        ${isDragging ? "opacity-50 shadow-lg" : ""}`}
    >
      {Icon && <Icon className="h-4 w-4 text-muted-foreground shrink-0" />}
      <div className="min-w-0">
        <p className="text-sm font-medium leading-none">{definition.label}</p>
        <p className="text-xs text-muted-foreground mt-1 truncate">
          {definition.description}
        </p>
      </div>
    </div>
  );
}

export function BlockSidebar({ onAddBlock }: { onAddBlock: (type: BlockType) => void }) {
  const categories = {
    layout: BLOCK_LIBRARY.filter((b) => b.category === "layout"),
    content: BLOCK_LIBRARY.filter((b) => b.category === "content"),
    interactive: BLOCK_LIBRARY.filter((b) => b.category === "interactive"),
  };

  return (
    <div className="w-64 border-r border-border bg-background flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h2 className="text-sm font-semibold">Blocks</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Drag blocks onto the worksheet
        </p>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* Content blocks */}
          <div>
            <Badge variant="outline" className="mb-2 text-xs">
              Content
            </Badge>
            <div className="space-y-1.5">
              {categories.content.map((def) => (
                <div
                  key={def.type}
                  onDoubleClick={() => onAddBlock(def.type)}
                >
                  <DraggableBlockItem definition={def} />
                </div>
              ))}
            </div>
          </div>

          {/* Layout blocks */}
          <div>
            <Badge variant="outline" className="mb-2 text-xs">
              Layout
            </Badge>
            <div className="space-y-1.5">
              {categories.layout.map((def) => (
                <div
                  key={def.type}
                  onDoubleClick={() => onAddBlock(def.type)}
                >
                  <DraggableBlockItem definition={def} />
                </div>
              ))}
            </div>
          </div>

          {/* Interactive blocks */}
          <div>
            <Badge variant="outline" className="mb-2 text-xs">
              Interactive
            </Badge>
            <div className="space-y-1.5">
              {categories.interactive.map((def) => (
                <div
                  key={def.type}
                  onDoubleClick={() => onAddBlock(def.type)}
                >
                  <DraggableBlockItem definition={def} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
