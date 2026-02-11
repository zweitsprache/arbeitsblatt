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
import { WorksheetReference } from "@/types/ebook";
import { authFetch } from "@/lib/auth-fetch";
import { CoverSettingsPanel } from "./cover-settings-panel";

interface WorksheetItem {
  id: string;
  title: string;
  slug: string;
  blocks: unknown[];
  updatedAt: string;
}

interface SortableWorksheetItemProps {
  worksheet: WorksheetReference;
  onRemove: () => void;
}

function SortableWorksheetItem({
  worksheet,
  onRemove,
}: SortableWorksheetItemProps) {
  const tc = useTranslations("common");
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: worksheet.id });

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

      <FileText className="h-5 w-5 text-muted-foreground shrink-0" />

      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{worksheet.title}</p>
        <p className="text-xs text-muted-foreground">/{worksheet.slug}</p>
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
  const { state, dispatch, getSelectedChapter, addWorksheetToChapter, removeWorksheetFromChapter } = useEBook();
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [availableWorksheets, setAvailableWorksheets] = useState<WorksheetItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedChapter = getSelectedChapter();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchWorksheets = useCallback(async (searchQuery = "") => {
    setLoading(true);
    try {
      const url = searchQuery
        ? `/api/worksheets?search=${encodeURIComponent(searchQuery)}`
        : "/api/worksheets";
      const res = await authFetch(url);
      const data = await res.json();
      setAvailableWorksheets(data);
    } catch (err) {
      console.error("Failed to fetch worksheets:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectorOpen) {
      fetchWorksheets();
    }
  }, [selectorOpen, fetchWorksheets]);

  useEffect(() => {
    if (!selectorOpen) return;
    const timer = setTimeout(() => {
      fetchWorksheets(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, selectorOpen, fetchWorksheets]);

  const handleDragEnd = (event: DragEndEvent) => {
    if (!selectedChapter) return;
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = selectedChapter.worksheets.findIndex(
        (w) => w.id === active.id
      );
      const newIndex = selectedChapter.worksheets.findIndex(
        (w) => w.id === over.id
      );
      const newWorksheets = arrayMove(
        selectedChapter.worksheets,
        oldIndex,
        newIndex
      );
      dispatch({
        type: "REORDER_WORKSHEETS",
        payload: { chapterId: selectedChapter.id, worksheets: newWorksheets },
      });
    }
  };

  const handleAddWorksheet = (worksheet: WorksheetItem) => {
    if (!selectedChapter) return;
    // Check if already added
    if (selectedChapter.worksheets.some((w) => w.id === worksheet.id)) return;
    addWorksheetToChapter(selectedChapter.id, {
      id: worksheet.id,
      title: worksheet.title,
      slug: worksheet.slug,
    });
  };

  const handleRemoveWorksheet = (worksheetId: string) => {
    if (!selectedChapter) return;
    removeWorksheetFromChapter(selectedChapter.id, worksheetId);
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

  const worksheetIdsInChapter = new Set(
    selectedChapter.worksheets.map((w) => w.id)
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
              {t("worksheetCount", { count: selectedChapter.worksheets.length })}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setSelectorOpen(true)}
          >
            <Plus className="h-4 w-4" />
            {t("addWorksheets")}
          </Button>
        </div>
      </div>

      {/* Worksheets list */}
      <ScrollArea className="flex-1 p-4">
        {selectedChapter.worksheets.length === 0 ? (
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
              {t("addWorksheets")}
            </Button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={selectedChapter.worksheets.map((w) => w.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {selectedChapter.worksheets.map((worksheet) => (
                  <SortableWorksheetItem
                    key={worksheet.id}
                    worksheet={worksheet}
                    onRemove={() => handleRemoveWorksheet(worksheet.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </ScrollArea>

      {/* Worksheet Selector Dialog */}
      <Dialog open={selectorOpen} onOpenChange={setSelectorOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{t("selectWorksheets")}</DialogTitle>
          </DialogHeader>

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

          {/* Worksheets list */}
          <ScrollArea className="flex-1 -mx-6 px-6">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                {tc("loading")}
              </div>
            ) : availableWorksheets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t("noWorksheetsSelected")}
              </div>
            ) : (
              <div className="space-y-2 py-2">
                {availableWorksheets.map((worksheet) => {
                  const isAdded = worksheetIdsInChapter.has(worksheet.id);
                  return (
                    <div
                      key={worksheet.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer",
                        isAdded
                          ? "bg-primary/5 border-primary/30"
                          : "hover:bg-muted"
                      )}
                      onClick={() => !isAdded && handleAddWorksheet(worksheet)}
                    >
                      <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{worksheet.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {Array.isArray(worksheet.blocks)
                            ? `${worksheet.blocks.length} blocks`
                            : "Empty"}
                        </p>
                      </div>
                      {isAdded ? (
                        <span className="text-xs text-primary font-medium">
                          Added
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
