"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Trash2,
  GripVertical,
  FileText,
  Search,
  X,
  Layers,
  CreditCard,
  Table2,
} from "lucide-react";
import { useEBook } from "@/store/ebook-store";
import { useState, useEffect, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { ContentItemReference, EBookContentType } from "@/types/ebook";
import { authFetch } from "@/lib/auth-fetch";
import { CoverSettingsPanel } from "./cover-settings-panel";

// ─── Content type configuration ──────────────────────────────
const CONTENT_TYPES: { type: EBookContentType; labelKey: string; icon: React.ElementType }[] = [
  { type: "worksheet", labelKey: "worksheets", icon: FileText },
  { type: "flashcards", labelKey: "flashcards", icon: Layers },
  { type: "cards", labelKey: "cards", icon: CreditCard },
  { type: "grammar-table", labelKey: "grammarTables", icon: Table2 },
];

function getContentTypeIcon(type: EBookContentType) {
  const config = CONTENT_TYPES.find((ct) => ct.type === type);
  return config?.icon ?? FileText;
}

interface FetchedItem {
  id: string;
  type: string;
  title: string;
  slug: string;
  blocks?: unknown[];
  updatedAt: string;
}

interface SortableContentItemProps {
  item: ContentItemReference;
  onRemove: () => void;
}

function SortableContentItem({
  item,
  onRemove,
}: SortableContentItemProps) {
  const t = useTranslations("ebook");
  const Icon = getContentTypeIcon(item.type);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-3 p-3 bg-background rounded-lg border transition-all",
        isDragging && "opacity-50 shadow-lg"
      )}
    >
      <button
        className="cursor-grab touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>

      <Icon className="h-5 w-5 text-muted-foreground shrink-0" />

      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{item.title}</p>
        <p className="text-xs text-muted-foreground">
          {t(`contentType_${item.type}`)}
        </p>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
        onClick={onRemove}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function ChapterContent() {
  const t = useTranslations("ebook");
  const tc = useTranslations("common");
  const { state, dispatch, getSelectedChapter, addItemToChapter, removeItemFromChapter } = useEBook();
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [availableItems, setAvailableItems] = useState<FetchedItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<EBookContentType>("worksheet");

  const selectedChapter = getSelectedChapter();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchItems = useCallback(async (type: EBookContentType, searchQuery = "") => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type });
      if (searchQuery) params.set("search", searchQuery);
      const res = await authFetch(`/api/worksheets?${params.toString()}`);
      const data = await res.json();
      setAvailableItems(data);
    } catch (err) {
      console.error("Failed to fetch items:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch when dialog opens or type changes
  useEffect(() => {
    if (selectorOpen) {
      setSearch("");
      fetchItems(selectedType);
    }
  }, [selectorOpen, selectedType, fetchItems]);

  // Debounced search
  useEffect(() => {
    if (!selectorOpen) return;
    const timer = setTimeout(() => {
      fetchItems(selectedType, search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, selectorOpen, selectedType, fetchItems]);

  const handleDragEnd = (event: DragEndEvent) => {
    if (!selectedChapter) return;
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = selectedChapter.items.findIndex(
        (w) => w.id === active.id
      );
      const newIndex = selectedChapter.items.findIndex(
        (w) => w.id === over.id
      );
      const newItems = arrayMove(
        selectedChapter.items,
        oldIndex,
        newIndex
      );
      dispatch({
        type: "REORDER_ITEMS",
        payload: { chapterId: selectedChapter.id, items: newItems },
      });
    }
  };

  const handleAddItem = (item: FetchedItem) => {
    if (!selectedChapter) return;
    if (selectedChapter.items.some((w) => w.id === item.id)) return;
    addItemToChapter(selectedChapter.id, {
      id: item.id,
      title: item.title,
      slug: item.slug,
      type: (item.type || selectedType) as EBookContentType,
    });
  };

  const handleRemoveItem = (itemId: string) => {
    if (!selectedChapter) return;
    removeItemFromChapter(selectedChapter.id, itemId);
  };

  // Show cover settings when no chapter is selected
  if (state.selectedChapterId === null) {
    return <CoverSettingsPanel />;
  }

  if (!selectedChapter) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">{t("noChapters")}</p>
      </div>
    );
  }

  const itemIdsInChapter = new Set(
    selectedChapter.items.map((w) => w.id)
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b bg-background">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              {selectedChapter.title || t("untitledChapter")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("itemCount", { count: selectedChapter.items.length })}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setSelectorOpen(true)}
          >
            <Plus className="h-4 w-4" />
            {t("addContent")}
          </Button>
        </div>
      </div>

      {/* Items list */}
      <ScrollArea className="flex-1 p-4">
        {selectedChapter.items.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">{t("emptyChapter")}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 gap-2"
              onClick={() => setSelectorOpen(true)}
            >
              <Plus className="h-4 w-4" />
              {t("addContent")}
            </Button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={selectedChapter.items.map((w) => w.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {selectedChapter.items.map((item) => (
                  <SortableContentItem
                    key={item.id}
                    item={item}
                    onRemove={() => handleRemoveItem(item.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </ScrollArea>

      {/* Content Selector Dialog */}
      <Dialog open={selectorOpen} onOpenChange={setSelectorOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{t("selectContent")}</DialogTitle>
          </DialogHeader>

          {/* Content type tabs */}
          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            {CONTENT_TYPES.map(({ type, labelKey, icon: Icon }) => (
              <button
                key={type}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  selectedType === type
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setSelectedType(type)}
              >
                <Icon className="h-3.5 w-3.5" />
                {t(labelKey)}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`${tc("search")}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-10"
            />
            {search && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-muted rounded"
                onClick={() => setSearch("")}
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Items list */}
          <ScrollArea className="flex-1 -mx-6 px-6">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                {tc("loading")}
              </div>
            ) : availableItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t("noItemsFound")}
              </div>
            ) : (
              <div className="space-y-2 py-2">
                {availableItems.map((item) => {
                  const isAdded = itemIdsInChapter.has(item.id);
                  const Icon = getContentTypeIcon((item.type || selectedType) as EBookContentType);
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer",
                        isAdded
                          ? "bg-primary/5 border-primary/30"
                          : "hover:bg-muted"
                      )}
                      onClick={() => !isAdded && handleAddItem(item)}
                    >
                      <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.type === "worksheet" && Array.isArray(item.blocks)
                            ? `${item.blocks.length} blocks`
                            : t(`contentType_${(item.type || selectedType) as EBookContentType}`)}
                        </p>
                      </div>
                      {isAdded ? (
                        <span className="text-xs text-primary font-medium">
                          {t("added")}
                        </span>
                      ) : (
                        <Button variant="outline" size="sm">
                          <Plus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
