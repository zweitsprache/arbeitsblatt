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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  FileText,
  Search,
  X,
  BookOpen,
  Heading,
  Type,
  Link2,
  Trash2,
  ChevronUp,
  ChevronDown,
  GripVertical,
  ExternalLink,
  Image,
  Minus,
} from "lucide-react";
import { useCourse } from "@/store/course-store";
import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { authFetch } from "@/lib/auth-fetch";
import { CourseSettingsPanel } from "./course-settings-panel";
import { v4 as uuidv4 } from "uuid";
import { WorksheetBlock, HeadingBlock, TextBlock, LinkedBlocksBlock, SpacerBlock, DividerBlock, ImageBlock } from "@/types/worksheet";
import { Link } from "@/i18n/navigation";

interface WorksheetItem {
  id: string;
  title: string;
  slug: string;
  blocks: unknown[];
  updatedAt: string;
}

// ─── Block Defaults ──────────────────────────────────────────

function createBlock(type: WorksheetBlock["type"]): WorksheetBlock {
  const base = { id: uuidv4(), visibility: "both" as const };
  switch (type) {
    case "heading":
      return { ...base, type: "heading", content: "", level: 2 } as HeadingBlock;
    case "text":
      return { ...base, type: "text", content: "" } as TextBlock;
    case "image":
      return { ...base, type: "image", src: "", alt: "" } as ImageBlock;
    case "spacer":
      return { ...base, type: "spacer", height: 24 } as SpacerBlock;
    case "divider":
      return { ...base, type: "divider" } as DividerBlock;
    default:
      return { ...base, type: "heading", content: "", level: 2 } as HeadingBlock;
  }
}

// ─── Block Editor Card ───────────────────────────────────────

function BlockCard({
  block,
  index,
  total,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  block: WorksheetBlock;
  index: number;
  total: number;
  onUpdate: (block: WorksheetBlock) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const t = useTranslations("course");

  return (
    <div className="group relative flex gap-2 items-start">
      {/* Controls */}
      <div className="flex flex-col items-center gap-0.5 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="h-4 w-4 text-muted-foreground/40" />
        <button
          className="p-0.5 hover:bg-muted rounded disabled:opacity-30"
          onClick={onMoveUp}
          disabled={index === 0}
        >
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        <button
          className="p-0.5 hover:bg-muted rounded disabled:opacity-30"
          onClick={onMoveDown}
          disabled={index === total - 1}
        >
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        <button
          className="p-0.5 hover:bg-destructive/10 rounded"
          onClick={onRemove}
        >
          <Trash2 className="h-3.5 w-3.5 text-destructive/70" />
        </button>
      </div>

      {/* Block content */}
      <div className="flex-1 border rounded-lg p-3 bg-background hover:border-primary/30 transition-colors min-w-0">
        {block.type === "heading" && (
          <HeadingEditor block={block as HeadingBlock} onUpdate={onUpdate} />
        )}
        {block.type === "text" && (
          <TextEditor block={block as TextBlock} onUpdate={onUpdate} />
        )}
        {block.type === "image" && (
          <ImageEditor block={block as ImageBlock} onUpdate={onUpdate} />
        )}
        {block.type === "linked-blocks" && (
          <LinkedBlocksCard block={block as LinkedBlocksBlock} />
        )}
        {block.type === "divider" && (
          <div className="flex items-center gap-2 py-1">
            <Minus className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{t("dividerBlock")}</span>
          </div>
        )}
        {block.type === "spacer" && (
          <div className="flex items-center gap-2 py-1">
            <span className="text-xs text-muted-foreground">
              {t("spacerBlock")} ({(block as SpacerBlock).height}px)
            </span>
          </div>
        )}
        {/* Fallback for other block types */}
        {!["heading", "text", "image", "linked-blocks", "divider", "spacer"].includes(block.type) && (
          <div className="flex items-center gap-2 py-1">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground capitalize">{block.type}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Inline Editors ──────────────────────────────────────────

function HeadingEditor({
  block,
  onUpdate,
}: {
  block: HeadingBlock;
  onUpdate: (block: WorksheetBlock) => void;
}) {
  const t = useTranslations("course");
  const sizeClasses = {
    1: "text-2xl font-bold",
    2: "text-xl font-semibold",
    3: "text-lg font-medium",
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Heading className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="flex gap-1">
          {([1, 2, 3] as const).map((level) => (
            <button
              key={level}
              className={cn(
                "px-1.5 py-0.5 text-xs rounded",
                block.level === level
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
              onClick={() => onUpdate({ ...block, level })}
            >
              H{level}
            </button>
          ))}
        </div>
      </div>
      <input
        className={cn(
          "w-full bg-transparent border-none outline-none placeholder:text-muted-foreground/50",
          sizeClasses[block.level]
        )}
        value={block.content}
        onChange={(e) => onUpdate({ ...block, content: e.target.value })}
        placeholder={t("headingPlaceholder")}
      />
    </div>
  );
}

function TextEditor({
  block,
  onUpdate,
}: {
  block: TextBlock;
  onUpdate: (block: WorksheetBlock) => void;
}) {
  const t = useTranslations("course");
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 mb-1">
        <Type className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{t("textBlock")}</span>
      </div>
      <textarea
        className="w-full bg-transparent border rounded-md p-2 text-sm outline-none resize-y min-h-[60px] placeholder:text-muted-foreground/50 focus:border-primary/50"
        value={block.content}
        onChange={(e) => onUpdate({ ...block, content: e.target.value })}
        placeholder={t("textPlaceholder")}
        rows={3}
      />
    </div>
  );
}

function ImageEditor({
  block,
  onUpdate,
}: {
  block: ImageBlock;
  onUpdate: (block: WorksheetBlock) => void;
}) {
  const t = useTranslations("course");
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Image className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{t("imageBlock")}</span>
      </div>
      <Input
        value={block.src}
        onChange={(e) => onUpdate({ ...block, src: e.target.value })}
        placeholder={t("imageUrlPlaceholder")}
        className="text-xs"
      />
      {block.src && (
        <img
          src={block.src}
          alt={block.alt}
          className="max-h-40 rounded-md border object-contain"
        />
      )}
    </div>
  );
}

function LinkedBlocksCard({ block }: { block: LinkedBlocksBlock }) {
  const t = useTranslations("course");
  return (
    <div className="flex items-center gap-3">
      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Link2 className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{block.worksheetTitle}</p>
        <p className="text-xs text-muted-foreground">
          {t("linkedWorksheet")} · /{block.worksheetSlug}
        </p>
      </div>
      <Link
        href={`/editor/${block.worksheetId}`}
        target="_blank"
      >
        <Button variant="ghost" size="sm" className="gap-1.5">
          <ExternalLink className="h-3.5 w-3.5" />
          <span className="text-xs">{t("editWorksheet")}</span>
        </Button>
      </Link>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────

export function CourseContent() {
  const t = useTranslations("course");
  const tc = useTranslations("common");
  const { state, dispatch, getSelectedLesson, getSelectedTopic, getSelectedModule } =
    useCourse();
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [availableWorksheets, setAvailableWorksheets] = useState<WorksheetItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedModule = getSelectedModule();
  const selectedTopic = getSelectedTopic();
  const selectedLesson = getSelectedLesson();

  // ─── Worksheet Fetch ────────────────────────────────────

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

  // ─── Block Actions ──────────────────────────────────────

  const addBlock = useCallback(
    (type: WorksheetBlock["type"]) => {
      if (!state.selectedModuleId || !state.selectedTopicId || !state.selectedLessonId) return;
      const block = createBlock(type);
      dispatch({
        type: "ADD_LESSON_BLOCK",
        payload: {
          moduleId: state.selectedModuleId,
          topicId: state.selectedTopicId,
          lessonId: state.selectedLessonId,
          block,
        },
      });
    },
    [dispatch, state.selectedModuleId, state.selectedTopicId, state.selectedLessonId]
  );

  const addLinkedBlocks = useCallback(
    (worksheet: WorksheetItem) => {
      if (!state.selectedModuleId || !state.selectedTopicId || !state.selectedLessonId) return;
      const block: LinkedBlocksBlock = {
        id: uuidv4(),
        type: "linked-blocks",
        visibility: "both",
        worksheetId: worksheet.id,
        worksheetTitle: worksheet.title,
        worksheetSlug: worksheet.slug,
      };
      dispatch({
        type: "ADD_LESSON_BLOCK",
        payload: {
          moduleId: state.selectedModuleId,
          topicId: state.selectedTopicId,
          lessonId: state.selectedLessonId,
          block,
        },
      });
      setSelectorOpen(false);
    },
    [dispatch, state.selectedModuleId, state.selectedTopicId, state.selectedLessonId]
  );

  const updateBlock = useCallback(
    (updatedBlock: WorksheetBlock) => {
      if (!state.selectedModuleId || !state.selectedTopicId || !state.selectedLessonId || !selectedLesson) return;
      const newBlocks = selectedLesson.blocks.map((b) =>
        b.id === updatedBlock.id ? updatedBlock : b
      );
      dispatch({
        type: "SET_LESSON_BLOCKS",
        payload: {
          moduleId: state.selectedModuleId,
          topicId: state.selectedTopicId,
          lessonId: state.selectedLessonId,
          blocks: newBlocks,
        },
      });
    },
    [dispatch, state.selectedModuleId, state.selectedTopicId, state.selectedLessonId, selectedLesson]
  );

  const removeBlock = useCallback(
    (blockId: string) => {
      if (!state.selectedModuleId || !state.selectedTopicId || !state.selectedLessonId) return;
      dispatch({
        type: "REMOVE_LESSON_BLOCK",
        payload: {
          moduleId: state.selectedModuleId,
          topicId: state.selectedTopicId,
          lessonId: state.selectedLessonId,
          blockId,
        },
      });
    },
    [dispatch, state.selectedModuleId, state.selectedTopicId, state.selectedLessonId]
  );

  const moveBlock = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (!state.selectedModuleId || !state.selectedTopicId || !state.selectedLessonId || !selectedLesson) return;
      const blocks = [...selectedLesson.blocks];
      const [moved] = blocks.splice(fromIndex, 1);
      blocks.splice(toIndex, 0, moved);
      dispatch({
        type: "SET_LESSON_BLOCKS",
        payload: {
          moduleId: state.selectedModuleId,
          topicId: state.selectedTopicId,
          lessonId: state.selectedLessonId,
          blocks,
        },
      });
    },
    [dispatch, state.selectedModuleId, state.selectedTopicId, state.selectedLessonId, selectedLesson]
  );

  // ─── Render States ─────────────────────────────────────

  // Show course settings when nothing is selected
  if (state.selectedModuleId === null) {
    return <CourseSettingsPanel isFullPanel />;
  }

  // Module selected but no topic
  if (!state.selectedTopicId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground mb-1">
            {selectedModule?.title || t("untitledModule")}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t("selectTopicPrompt")}
          </p>
        </div>
      </div>
    );
  }

  // Topic selected but no lesson
  if (!state.selectedLessonId || !selectedLesson) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground mb-1">
            {selectedTopic?.title || t("untitledTopic")}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t("selectLessonPrompt")}
          </p>
        </div>
      </div>
    );
  }

  // ─── Lesson Selected ───────────────────────────────────

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b bg-background">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <span>{selectedModule?.title}</span>
              <span>/</span>
              <span>{selectedTopic?.title}</span>
            </div>
            <h2 className="text-lg font-semibold">
              {selectedLesson.title || t("untitledLesson")}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {selectedLesson.blocks.length} {selectedLesson.blocks.length === 1 ? "block" : "blocks"}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 p-4">
        {selectedLesson.blocks.length === 0 ? (
          // Empty state
          <div className="text-center py-16">
            <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground mb-6">{t("noLessonContent")}</p>
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setSelectorOpen(true)}
              >
                <Link2 className="h-4 w-4" />
                {t("linkWorksheet")}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    {t("addBlock")}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center">
                  <DropdownMenuItem onClick={() => addBlock("heading")}>
                    <Heading className="h-4 w-4 mr-2" />
                    {t("headingBlock")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addBlock("text")}>
                    <Type className="h-4 w-4 mr-2" />
                    {t("textBlock")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addBlock("image")}>
                    <Image className="h-4 w-4 mr-2" />
                    {t("imageBlock")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => addBlock("divider")}>
                    <Minus className="h-4 w-4 mr-2" />
                    {t("dividerBlock")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ) : (
          // Block list
          <div className="space-y-2 max-w-3xl mx-auto">
            {selectedLesson.blocks.map((block, index) => (
              <BlockCard
                key={block.id}
                block={block}
                index={index}
                total={selectedLesson.blocks.length}
                onUpdate={updateBlock}
                onRemove={() => removeBlock(block.id)}
                onMoveUp={() => moveBlock(index, index - 1)}
                onMoveDown={() => moveBlock(index, index + 1)}
              />
            ))}

            {/* Add block toolbar */}
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setSelectorOpen(true)}
              >
                <Link2 className="h-4 w-4" />
                {t("linkWorksheet")}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    {t("addBlock")}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center">
                  <DropdownMenuItem onClick={() => addBlock("heading")}>
                    <Heading className="h-4 w-4 mr-2" />
                    {t("headingBlock")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addBlock("text")}>
                    <Type className="h-4 w-4 mr-2" />
                    {t("textBlock")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addBlock("image")}>
                    <Image className="h-4 w-4 mr-2" />
                    {t("imageBlock")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => addBlock("divider")}>
                    <Minus className="h-4 w-4 mr-2" />
                    {t("dividerBlock")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )}
      </ScrollArea>

      {/* Worksheet Selector Dialog */}
      <Dialog open={selectorOpen} onOpenChange={setSelectorOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{t("selectWorksheet")}</DialogTitle>
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
                {t("noWorksheetsFound")}
              </div>
            ) : (
              <div className="space-y-2 py-2">
                {availableWorksheets.map((worksheet) => (
                  <div
                    key={worksheet.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer hover:bg-muted"
                    )}
                    onClick={() => addLinkedBlocks(worksheet)}
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
                    <Button variant="outline" size="sm">
                      <Link2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
