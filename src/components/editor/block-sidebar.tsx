"use client";

import React, { useState, useMemo } from "react";
import { useDraggable } from "@dnd-kit/core";
import { BLOCK_LIBRARY, BlockDefinition, BlockType } from "@/types/worksheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
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
  ListOrdered,
  TextSelect,
  Search,
  Group,
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
  ListOrdered,
  TextSelect,
  Search,
  Group,
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
      className={`flex items-center gap-3 p-3 rounded-lg bg-card cursor-grab
        hover:bg-accent transition-colors
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
  const [search, setSearch] = useState("");

  const categories = useMemo(() => {
    const filter = (b: BlockDefinition) =>
      !search ||
      b.label.toLowerCase().includes(search.toLowerCase()) ||
      b.description.toLowerCase().includes(search.toLowerCase());

    return {
      content: BLOCK_LIBRARY.filter((b) => b.category === "content" && filter(b)),
      layout: BLOCK_LIBRARY.filter((b) => b.category === "layout" && filter(b)),
      interactive: BLOCK_LIBRARY.filter((b) => b.category === "interactive" && filter(b)),
    };
  }, [search]);

  return (
    <div className="w-64 flex flex-col h-full pt-8 pb-8">
      <div className="flex flex-col h-full bg-amber-50 rounded-sm shadow-sm overflow-hidden">
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search blocks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm border-amber-700"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {/* Content blocks */}
          {categories.content.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-amber-700 uppercase tracking-wider px-2 py-1.5 bg-amber-100 rounded-md mb-2">
                Content
              </div>
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
          )}

          {/* Layout blocks */}
          {categories.layout.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-amber-700 uppercase tracking-wider px-2 py-1.5 bg-amber-100 rounded-md mb-2">
                Layout
              </div>
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
          )}

          {/* Interactive blocks */}
          {categories.interactive.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-amber-700 uppercase tracking-wider px-2 py-1.5 bg-amber-100 rounded-md mb-2">
                Interactive
              </div>
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
          )}

          {/* No results */}
          {categories.content.length === 0 && categories.layout.length === 0 && categories.interactive.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No blocks found</p>
          )}
        </div>
      </ScrollArea>
      </div>
    </div>
  );
}
