"use client";

import React, { useEffect, useId, useState, useCallback, useRef } from "react";
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
  FileText,
  Search,
  X,
  BookOpen,
  Link2,
} from "lucide-react";
import {
  DndContext,
  pointerWithin,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  DragOverlay,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useCourse } from "@/store/course-store";
import { EditorProvider, useEditor } from "@/store/editor-store";
import { BlockSidebar } from "@/components/editor/block-sidebar";
import { WorksheetCanvas } from "@/components/editor/worksheet-canvas";
import { PropertiesPanel } from "@/components/editor/properties-panel";
import { BlockRenderer } from "@/components/editor/block-renderer";
import { authFetch } from "@/lib/auth-fetch";
import { CourseSettingsPanel } from "./course-settings-panel";
import { v4 as uuidv4 } from "uuid";
import {
  LinkedBlocksBlock,
  WorksheetBlock,
  BlockType,
  BLOCK_LIBRARY,
  DEFAULT_SETTINGS,
} from "@/types/worksheet";

// ─── Worksheet Picker Dialog ─────────────────────────────────

interface WorksheetItem {
  id: string;
  title: string;
  slug: string;
  blocks: unknown[];
  updatedAt: string;
}

function WorksheetPickerDialog({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (worksheet: WorksheetItem) => void;
}) {
  const tc = useTranslations("common");
  const t = useTranslations("course");
  const [worksheets, setWorksheets] = useState<WorksheetItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchWorksheets = useCallback(async (q = "") => {
    setLoading(true);
    try {
      const url = q
        ? `/api/worksheets?search=${encodeURIComponent(q)}`
        : "/api/worksheets";
      const res = await authFetch(url);
      setWorksheets(await res.json());
    } catch (err) {
      console.error("Failed to fetch worksheets:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchWorksheets();
  }, [open, fetchWorksheets]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => fetchWorksheets(search), 300);
    return () => clearTimeout(timer);
  }, [search, open, fetchWorksheets]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{t("selectWorksheet")}</DialogTitle>
        </DialogHeader>
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
        <ScrollArea className="flex-1 -mx-6 px-6">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">{tc("loading")}</div>
          ) : worksheets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">{t("noWorksheetsFound")}</div>
          ) : (
            <div className="space-y-2 py-2">
              {worksheets.map((ws) => (
                <div
                  key={ws.id}
                  className="flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer hover:bg-muted"
                  onClick={() => onSelect(ws)}
                >
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{ws.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {Array.isArray(ws.blocks) ? `${ws.blocks.length} blocks` : "Empty"}
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
  );
}

// ─── Lesson Block Editor (reuses the full worksheet editor) ──

function LessonEditorInner() {
  const t = useTranslations("course");
  const { state: editorState, dispatch: editorDispatch, addBlock } = useEditor();
  const {
    state: courseState,
    dispatch: courseDispatch,
    getSelectedLesson,
    getSelectedTopic,
    getSelectedModule,
    save: saveCourse,
  } = useCourse();

  const selectedLesson = getSelectedLesson();
  const selectedModule = getSelectedModule();
  const selectedTopic = getSelectedTopic();

  const dndId = useId();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [overPosition, setOverPosition] = useState<"above" | "below">("below");
  const [selectorOpen, setSelectorOpen] = useState(false);

  // Sync tracking
  const syncingRef = useRef(false);
  const prevLessonIdRef = useRef<string | null>(null);
  const prevBlocksJsonRef = useRef("");

  // Load lesson blocks into editor store when lesson selection changes
  useEffect(() => {
    if (!selectedLesson) return;
    if (selectedLesson.id === prevLessonIdRef.current) return;
    prevLessonIdRef.current = selectedLesson.id;
    syncingRef.current = true;
    const blocks = selectedLesson.blocks ?? [];
    prevBlocksJsonRef.current = JSON.stringify(blocks);
    editorDispatch({
      type: "LOAD_WORKSHEET",
      payload: {
        id: selectedLesson.id,
        title: selectedLesson.title,
        slug: "",
        blocks,
        settings: DEFAULT_SETTINGS,
        published: false,
      },
    });
    requestAnimationFrame(() => {
      syncingRef.current = false;
    });
  }, [selectedLesson, editorDispatch]);

  // Sync editor blocks back to course store on change
  useEffect(() => {
    if (syncingRef.current) return;
    if (!courseState.selectedModuleId || !courseState.selectedTopicId || !courseState.selectedLessonId) return;
    const json = JSON.stringify(editorState.blocks);
    if (json === prevBlocksJsonRef.current) return;
    prevBlocksJsonRef.current = json;
    courseDispatch({
      type: "SET_LESSON_BLOCKS",
      payload: {
        moduleId: courseState.selectedModuleId,
        topicId: courseState.selectedTopicId,
        lessonId: courseState.selectedLessonId,
        blocks: editorState.blocks,
      },
    });
  }, [editorState.blocks, courseState.selectedModuleId, courseState.selectedTopicId, courseState.selectedLessonId, courseDispatch]);

  // Keyboard: Cmd+S saves course, Delete removes selected block
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        saveCourse();
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        const el = document.activeElement;
        const isEditing =
          el?.tagName === "INPUT" ||
          el?.tagName === "TEXTAREA" ||
          (el as HTMLElement)?.contentEditable === "true";
        if (!isEditing && editorState.selectedBlockId) {
          editorDispatch({ type: "REMOVE_BLOCK", payload: editorState.selectedBlockId });
        }
      }
      if (e.key === "Escape") {
        editorDispatch({ type: "SELECT_BLOCK", payload: null });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [saveCourse, editorState.selectedBlockId, editorDispatch]);

  // DnD
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = useCallback((e: DragStartEvent) => {
    setActiveId(e.active.id as string);
  }, []);

  const handleDragOver = useCallback((e: DragOverEvent) => {
    setOverId(e.over?.id as string | null);
    if (e.over && e.activatorEvent && "clientY" in e.activatorEvent) {
      const overRect = e.over.rect;
      const pointerY = (e.activatorEvent as PointerEvent).clientY + (e.delta?.y ?? 0);
      setOverPosition(pointerY < overRect.top + overRect.height / 2 ? "above" : "below");
    }
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    setOverId(null);
    const { active, over } = event;
    const activeData = active.data.current;
    const overData = over?.data.current;

    // From sidebar library
    if (activeData?.type === "library-block") {
      const blockType = activeData.blockType as BlockType;
      if (overData?.type === "column-drop") {
        const { blockId, colIndex } = overData as { blockId: string; colIndex: number };
        const columnsBlock = editorState.blocks.find((b) => b.id === blockId);
        if (columnsBlock && columnsBlock.type === "columns") {
          const def = BLOCK_LIBRARY.find((b) => b.type === blockType);
          if (!def) return;
          const newChild = { ...def.defaultData, id: uuidv4() } as WorksheetBlock;
          const newChildren = columnsBlock.children.map((col: WorksheetBlock[], i: number) =>
            i === colIndex ? [...col, newChild] : col
          );
          editorDispatch({ type: "UPDATE_BLOCK", payload: { id: blockId, updates: { children: newChildren } } });
        }
        return;
      }
      if (over) {
        const idx = editorState.blocks.findIndex((b) => b.id === over.id);
        if (idx >= 0) addBlock(blockType, overPosition === "above" ? idx : idx + 1);
        else addBlock(blockType);
      } else {
        addBlock(blockType);
      }
      return;
    }

    // Column child
    if (activeData?.type === "column-child") {
      const blockId = activeData.blockId as string;
      if (overData?.type === "column-drop") {
        const { blockId: targetParentId, colIndex: targetColIndex } = overData as { blockId: string; colIndex: number };
        editorDispatch({ type: "MOVE_BLOCK_BETWEEN_COLUMNS", payload: { blockId, targetParentId, targetColIndex } });
        return;
      }
      if (over && editorState.blocks.some((b) => b.id === (over.id as string))) {
        editorDispatch({ type: "MOVE_BLOCK_FROM_COLUMN_TO_TOP", payload: { blockId, insertAfterBlockId: over.id as string } });
        return;
      }
      editorDispatch({ type: "MOVE_BLOCK_FROM_COLUMN_TO_TOP", payload: { blockId } });
      return;
    }

    // Top-level reorder
    if (over && active.id !== over.id) {
      if (overData?.type === "column-drop") {
        const { blockId: targetParentId, colIndex: targetColIndex } = overData as { blockId: string; colIndex: number };
        editorDispatch({ type: "MOVE_BLOCK_TO_COLUMN", payload: { blockId: active.id as string, targetParentId, targetColIndex } });
        return;
      }
      editorDispatch({ type: "MOVE_BLOCK", payload: { activeId: active.id as string, overId: over.id as string, position: overPosition } });
    }
  };

  // Link Worksheet → add linked-blocks block
  const addLinkedBlocks = useCallback(
    (ws: WorksheetItem) => {
      const block: LinkedBlocksBlock = {
        id: uuidv4(),
        type: "linked-blocks",
        visibility: "both",
        worksheetId: ws.id,
        worksheetTitle: ws.title,
        worksheetSlug: ws.slug,
      };
      editorDispatch({ type: "ADD_BLOCK", payload: { block } });
      setSelectorOpen(false);
    },
    [editorDispatch]
  );

  // Drag overlay
  const activeBlock = activeId ? editorState.blocks.find((b) => b.id === activeId) : null;
  const activeLibType = activeId?.startsWith("library-") ? activeId.replace("library-", "") : null;
  const activeLibDef = activeLibType ? BLOCK_LIBRARY.find((b) => b.type === activeLibType) : null;

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="h-full flex flex-col">
        {/* Lesson breadcrumb header */}
        <div className="px-4 py-2 border-b bg-background flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
            <span className="truncate">{selectedModule?.title}</span>
            <span>/</span>
            <span className="truncate">{selectedTopic?.title}</span>
            <span>/</span>
            <span className="truncate font-medium text-foreground">
              {selectedLesson?.title || t("untitledLesson")}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 shrink-0"
            onClick={() => setSelectorOpen(true)}
          >
            <Link2 className="h-4 w-4" />
            {t("linkWorksheet")}
          </Button>
        </div>

        {/* Same three-panel layout as the worksheet editor */}
        <div className="flex flex-1 min-h-0 overflow-hidden bg-white px-4 gap-3">
          <BlockSidebar onAddBlock={(type) => addBlock(type)} />
          <WorksheetCanvas activeId={activeId} overId={overId} overPosition={overPosition} />
          <PropertiesPanel />
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeBlock ? (
          <div className="bg-white rounded-lg border border-primary/30 shadow-xl p-3 opacity-90 max-w-[600px] max-h-[120px] overflow-hidden pointer-events-none">
            <BlockRenderer block={activeBlock} mode={editorState.viewMode} />
          </div>
        ) : activeLibDef ? (
          <div className="bg-white rounded-lg border border-primary/30 shadow-xl px-4 py-3 opacity-90 pointer-events-none">
            <p className="text-sm font-medium">{activeLibDef.label}</p>
            <p className="text-xs text-muted-foreground">{activeLibDef.description}</p>
          </div>
        ) : null}
      </DragOverlay>

      <WorksheetPickerDialog
        open={selectorOpen}
        onOpenChange={setSelectorOpen}
        onSelect={addLinkedBlocks}
      />
    </DndContext>
  );
}

// ─── Main Component ──────────────────────────────────────────

export function CourseContent() {
  const t = useTranslations("course");
  const { state, getSelectedLesson, getSelectedTopic, getSelectedModule } = useCourse();

  const selectedModule = getSelectedModule();
  const selectedTopic = getSelectedTopic();
  const selectedLesson = getSelectedLesson();

  // No selection → course settings
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
          <p className="text-sm text-muted-foreground">{t("selectTopicPrompt")}</p>
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
          <p className="text-sm text-muted-foreground">{t("selectLessonPrompt")}</p>
        </div>
      </div>
    );
  }

  // Lesson selected → full worksheet block editor
  return (
    <TooltipProvider>
      <EditorProvider>
        <LessonEditorInner />
      </EditorProvider>
    </TooltipProvider>
  );
}
