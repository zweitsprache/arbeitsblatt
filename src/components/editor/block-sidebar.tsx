"use client";

import React, { useState, useMemo } from "react";
import { useDraggable } from "@dnd-kit/core";
import { useTranslations } from "next-intl";
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
  Shuffle,
  WrapText,
  TableProperties,
  LayoutGrid,
  BookA,
  BarChart3,
  Hash,
  BookOpen,
  MessageCircle,
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
  Shuffle,
  WrapText,
  TableProperties,
  LayoutGrid,
  BookA,
  BarChart3,
  Hash,
  BookOpen,
  MessageCircle,
};

function DraggableBlockItem({ definition }: { definition: BlockDefinition }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `library-${definition.type}`,
    data: { type: "library-block", blockType: definition.type },
  });

  const Icon = iconMap[definition.icon];
  const tb = useTranslations("blocks");

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
        <p className="text-sm font-medium leading-none">{tb(definition.labelKey)}</p>
        <p className="text-xs text-muted-foreground mt-1 truncate">
          {tb(definition.descriptionKey)}
        </p>
      </div>
    </div>
  );
}

export function BlockSidebar({ onAddBlock }: { onAddBlock: (type: BlockType) => void }) {
  const t = useTranslations("blockSidebar");
  const tb = useTranslations("blocks");
  const [search, setSearch] = useState("");

  const categories = useMemo(() => {
    const filter = (b: BlockDefinition) =>
      !search ||
      tb(b.labelKey).toLowerCase().includes(search.toLowerCase()) ||
      tb(b.descriptionKey).toLowerCase().includes(search.toLowerCase());

    return {
      content: BLOCK_LIBRARY.filter((b) => b.category === "content" && filter(b)),
      layout: BLOCK_LIBRARY.filter((b) => b.category === "layout" && filter(b)),
      interactive: BLOCK_LIBRARY.filter((b) => b.category === "interactive" && filter(b)),
    };
  }, [search, tb]);

  return (
    <div className="w-80 shrink-0 flex flex-col h-full min-h-0 pt-8 pb-8">
      <div className="flex flex-col h-full bg-slate-50 rounded-sm shadow-sm overflow-hidden">
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm border-slate-700"
          />
        </div>
      </div>
      <ScrollArea className="flex-1 min-h-0 overflow-hidden scrollbar-hide [&_[data-slot=scroll-area-viewport]>div]:!block">
        <div className="px-3 pb-3 space-y-3">
          {/* Content blocks */}
          {categories.content.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md mb-2">
                {t("contentCategory")}
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
              <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md mb-2">
                {t("layoutCategory")}
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
              <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md mb-2">
                {t("interactiveCategory")}
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
            <p className="text-xs text-muted-foreground text-center py-4">{t("noBlocksFound")}</p>
          )}
        </div>
      </ScrollArea>
      </div>
    </div>
  );
}
