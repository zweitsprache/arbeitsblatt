"use client";

import React, { useState, useMemo } from "react";
import { useDraggable } from "@dnd-kit/core";
import { useTranslations } from "next-intl";
import { BLOCK_LIBRARY, BlockDefinition, BlockType } from "@/types/worksheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useEditor } from "@/store/editor-store";
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
  Grid3X3,
  BookA,
  BarChart3,
  Hash,
  BookOpen,
  MessageCircle,
  FileOutput,
  Rows3,
  Mail,
  ClipboardList,
  Sparkles,
  Sparkle,
  Bot,
  ClipboardCopy,
  ListChecks,
  ChevronDown,
  Scissors,
  Table,
  Volume2,
  Clock,
  Globe,
  TriangleAlert,
  Square,
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
  Grid3X3,
  BookA,
  BarChart3,
  Hash,
  BookOpen,
  MessageCircle,
  FileOutput,
  Rows3,
  Mail,
  ClipboardList,
  Sparkles,
  Sparkle,
  Bot,
  ClipboardCopy,
  ListChecks,
  ChevronDown,
  Scissors,
  Table,
  Volume2,
  Clock,
  Globe,
  TriangleAlert,
  Square,
};

function DraggableBlockItem({ definition, disabled = false }: { definition: BlockDefinition; disabled?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `library-${definition.type}`,
    data: { type: "library-block", blockType: definition.type },
    disabled,
  });

  const Icon = iconMap[definition.icon];
  const tb = useTranslations("blocks");

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      aria-disabled={disabled}
      className={`flex cursor-grab items-center gap-3 rounded-[4px] border !border-sky-800 bg-sky-50 p-3
        transition-colors hover:bg-sky-100
        ${disabled ? "cursor-not-allowed opacity-50 hover:bg-card" : ""}
        ${isDragging ? "opacity-50 shadow-lg" : ""}`}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0 text-sky-800" />}
      <div className="min-w-0">
        <p className="text-sm font-bold leading-none text-sky-800">{tb(definition.labelKey)}</p>
        <p className="mt-1 truncate text-xs text-sky-800">
          {tb(definition.descriptionKey)}
        </p>
      </div>
    </div>
  );
}

export function BlockSidebar({
  onAddBlock,
  canAddBlock = () => true,
}: {
  onAddBlock: (type: BlockType) => void;
  canAddBlock?: (type: BlockType) => boolean;
}) {
  const t = useTranslations("blockSidebar");
  const tb = useTranslations("blocks");
  const { access } = useEditor();
  const [search, setSearch] = useState("");

  const ts = (key: string, fallback: string) => {
    try {
      return t(key);
    } catch {
      return fallback;
    }
  };

  const categories = useMemo(() => {
    const filter = (b: BlockDefinition) =>
      access.allowedBlockTypes.includes(b.type) &&
      !search ||
      tb(b.labelKey).toLowerCase().includes(search.toLowerCase()) ||
      tb(b.descriptionKey).toLowerCase().includes(search.toLowerCase());

    return {
      headings: BLOCK_LIBRARY.filter((b) => b.category === "headings" && filter(b)),
      content: BLOCK_LIBRARY.filter((b) => b.category === "content" && filter(b)),
      images: BLOCK_LIBRARY.filter((b) => b.category === "images" && filter(b)),
      vocabulary: BLOCK_LIBRARY.filter((b) => b.category === "vocabulary" && filter(b)),
      games: BLOCK_LIBRARY.filter((b) => b.category === "games" && filter(b)),
      spelling: BLOCK_LIBRARY.filter((b) => b.category === "spelling" && filter(b)),
      cards: BLOCK_LIBRARY.filter((b) => b.category === "cards" && filter(b)),
      mockup: BLOCK_LIBRARY.filter((b) => b.category === "mockup" && filter(b)),
      numbering: BLOCK_LIBRARY.filter((b) => b.category === "numbering" && filter(b)),
      memoryAids: BLOCK_LIBRARY.filter((b) => b.category === "memory-aids" && filter(b)),
      multimedia: BLOCK_LIBRARY.filter((b) => b.category === "multimedia" && filter(b)),
      layout: BLOCK_LIBRARY.filter((b) => b.category === "layout" && filter(b)),
      interactive: BLOCK_LIBRARY.filter((b) => b.category === "interactive" && filter(b)),
      aiTools: BLOCK_LIBRARY.filter((b) => b.category === "ai-tools" && filter(b)),
    };
  }, [access.allowedBlockTypes, search, tb]);

  const renderBlock = (def: BlockDefinition) => {
    const disabled = !canAddBlock(def.type);

    return (
      <div
        key={def.type}
        onDoubleClick={disabled ? undefined : () => onAddBlock(def.type)}
      >
        <DraggableBlockItem definition={def} disabled={disabled} />
      </div>
    );
  };

  return (
    <div className="w-80 shrink-0 flex flex-col h-full min-h-0 pt-4 pb-8">
      <div className="flex flex-col h-full border border-foreground rounded-sm overflow-hidden min-h-0">
        <div className="flex flex-col h-full overflow-hidden">
          <div className="p-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder={ts("searchPlaceholder", "Search block...")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-sm border-slate-700"
              />
            </div>
          </div>
          <ScrollArea className="flex-1 min-h-0 overflow-hidden scrollbar-hide [&_[data-slot=scroll-area-viewport]>div]:!block">
            <div className="px-3 pb-3 space-y-3">
              {/* Headings blocks */}
              {categories.headings.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-[4px] mb-2">
                    {ts("headingsCategory", "Headings")}
                  </div>
                  <div className="space-y-1.5">
                    {categories.headings.map(renderBlock)}
                  </div>
                </div>
              )}

              {/* Content blocks */}
              {categories.content.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-[4px] mb-2">
                    {ts("contentCategory", "Text")}
                  </div>
                  <div className="space-y-1.5">
                    {categories.content.map(renderBlock)}
                  </div>
                </div>
              )}

              {/* Image blocks */}
              {categories.images.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-[4px] mb-2">
                    {ts("imagesCategory", "Images and Graphics")}
                  </div>
                  <div className="space-y-1.5">
                    {categories.images.map(renderBlock)}
                  </div>
                </div>
              )}

              {/* Vocabulary blocks */}
              {categories.vocabulary.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-[4px] mb-2">
                    {ts("vocabularyCategory", "Vocabulary")}
                  </div>
                  <div className="space-y-1.5">
                    {categories.vocabulary.map(renderBlock)}
                  </div>
                </div>
              )}

              {/* Games blocks */}
              {categories.games.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-[4px] mb-2">
                    {ts("gamesCategory", "Games")}
                  </div>
                  <div className="space-y-1.5">
                    {categories.games.map(renderBlock)}
                  </div>
                </div>
              )}

              {/* Spelling blocks */}
              {categories.spelling.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-[4px] mb-2">
                    {ts("spellingCategory", "Spelling")}
                  </div>
                  <div className="space-y-1.5">
                    {categories.spelling.map(renderBlock)}
                  </div>
                </div>
              )}

              {/* Cards blocks */}
              {categories.cards.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-[4px] mb-2">
                    {ts("cardsCategory", "Cards")}
                  </div>
                  <div className="space-y-1.5">
                    {categories.cards.map(renderBlock)}
                  </div>
                </div>
              )}

              {/* Mockup blocks */}
              {categories.mockup.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-[4px] mb-2">
                    {ts("mockupCategory", "Mockups")}
                  </div>
                  <div className="space-y-1.5">
                    {categories.mockup.map(renderBlock)}
                  </div>
                </div>
              )}

              {/* Numbering blocks */}
              {categories.numbering.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-[4px] mb-2">
                    {ts("numberingCategory", "Numbering")}
                  </div>
                  <div className="space-y-1.5">
                    {categories.numbering.map(renderBlock)}
                  </div>
                </div>
              )}

              {/* Memory aids blocks */}
              {categories.memoryAids.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-[4px] mb-2">
                    {ts("memoryAidsCategory", "Memory Aids")}
                  </div>
                  <div className="space-y-1.5">
                    {categories.memoryAids.map(renderBlock)}
                  </div>
                </div>
              )}

              {/* Multimedia blocks */}
              {categories.multimedia.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-[4px] mb-2">
                    {ts("multimediaCategory", "Multimedia")}
                  </div>
                  <div className="space-y-1.5">
                    {categories.multimedia.map(renderBlock)}
                  </div>
                </div>
              )}

              {/* Layout blocks */}
              {categories.layout.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-[4px] mb-2">
                    {ts("layoutCategory", "Layout")}
                  </div>
                  <div className="space-y-1.5">
                    {categories.layout.map(renderBlock)}
                  </div>
                </div>
              )}

              {/* Interactive blocks */}
              {categories.interactive.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-[4px] mb-2">
                    {ts("interactiveCategory", "Interactive")}
                  </div>
                  <div className="space-y-1.5">
                    {categories.interactive.map(renderBlock)}
                  </div>
                </div>
              )}

              {/* AI Tools blocks */}
              {categories.aiTools.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-[4px] mb-2">
                    {ts("aiToolsCategory", "AI Tools")}
                  </div>
                  <div className="space-y-1.5">
                    {categories.aiTools.map(renderBlock)}
                  </div>
                </div>
              )}

              {/* No results */}
              {categories.headings.length === 0 && categories.content.length === 0 && categories.images.length === 0 && categories.vocabulary.length === 0 && categories.games.length === 0 && categories.spelling.length === 0 && categories.cards.length === 0 && categories.mockup.length === 0 && categories.numbering.length === 0 && categories.memoryAids.length === 0 && categories.multimedia.length === 0 && categories.layout.length === 0 && categories.interactive.length === 0 && categories.aiTools.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">{ts("noBlocksFound", "No blocks found")}</p>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
