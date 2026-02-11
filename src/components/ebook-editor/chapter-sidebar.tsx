"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  MoreVertical,
  Trash2,
  GripVertical,
  BookOpen,
  Image as ImageIcon,
} from "lucide-react";
import { useEBook } from "@/store/ebook-store";
import { useState } from "react";
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
import { PopulatedEBookChapter } from "@/types/ebook";

interface SortableChapterItemProps {
  chapter: PopulatedEBookChapter;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (title: string) => void;
}

function SortableChapterItem({
  chapter,
  isSelected,
  onSelect,
  onDelete,
  onRename,
}: SortableChapterItemProps) {
  const t = useTranslations("ebook");
  const tc = useTranslations("common");
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(chapter.title);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: chapter.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleSubmitRename = () => {
    if (editTitle.trim()) {
      onRename(editTitle.trim());
    }
    setIsEditing(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer transition-colors",
        isSelected
          ? "bg-primary/10 border border-primary/30"
          : "hover:bg-muted border border-transparent",
        isDragging && "opacity-50"
      )}
      onClick={onSelect}
    >
      <button
        className="cursor-grab touch-none opacity-0 group-hover:opacity-100 transition-opacity"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>

      <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />

      {isEditing ? (
        <Input
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onBlur={handleSubmitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmitRename();
            if (e.key === "Escape") {
              setEditTitle(chapter.title);
              setIsEditing(false);
            }
          }}
          onClick={(e) => e.stopPropagation()}
          autoFocus
          className="h-6 text-sm py-0"
        />
      ) : (
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {chapter.title || t("untitledChapter")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("worksheetCount", { count: chapter.worksheets.length })}
          </p>
        </div>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              setEditTitle(chapter.title);
              setIsEditing(true);
            }}
          >
            {tc("rename")}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="h-3.5 w-3.5 mr-2" />
            {tc("delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function ChapterSidebar() {
  const t = useTranslations("ebook");
  const { state, dispatch, addChapter } = useEBook();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = state.chapters.findIndex((ch) => ch.id === active.id);
      const newIndex = state.chapters.findIndex((ch) => ch.id === over.id);
      const newChapters = arrayMove(state.chapters, oldIndex, newIndex);
      dispatch({ type: "REORDER_CHAPTERS", payload: newChapters });
    }
  };

  const handleDeleteChapter = (chapterId: string) => {
    if (confirm(t("deleteChapter"))) {
      dispatch({ type: "REMOVE_CHAPTER", payload: chapterId });
    }
  };

  const handleRenameChapter = (chapterId: string, title: string) => {
    dispatch({ type: "UPDATE_CHAPTER", payload: { id: chapterId, title } });
  };

  return (
    <div className="w-64 bg-background border-r flex flex-col shrink-0">
      {/* Header */}
      <div className="p-3 border-b">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-sm">{t("chapters")}</h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => addChapter()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Cover section */}
      <div
        className={cn(
          "mx-3 mt-3 p-2 rounded-md cursor-pointer transition-colors flex items-center gap-2",
          state.selectedChapterId === null
            ? "bg-primary/10 border border-primary/30"
            : "hover:bg-muted border border-transparent"
        )}
        onClick={() => dispatch({ type: "SELECT_CHAPTER", payload: null })}
      >
        <ImageIcon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{t("cover")}</span>
      </div>

      {/* Chapters list */}
      <ScrollArea className="flex-1 px-3 py-2">
        {state.chapters.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">{t("noChapters")}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 gap-2"
              onClick={() => addChapter()}
            >
              <Plus className="h-4 w-4" />
              {t("addChapter")}
            </Button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={state.chapters.map((ch) => ch.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-1">
                {state.chapters.map((chapter) => (
                  <SortableChapterItem
                    key={chapter.id}
                    chapter={chapter}
                    isSelected={state.selectedChapterId === chapter.id}
                    onSelect={() =>
                      dispatch({ type: "SELECT_CHAPTER", payload: chapter.id })
                    }
                    onDelete={() => handleDeleteChapter(chapter.id)}
                    onRename={(title) => handleRenameChapter(chapter.id, title)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </ScrollArea>
    </div>
  );
}
