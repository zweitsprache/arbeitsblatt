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
  Download,
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

function cloneBlockWithNewIds(block: WorksheetBlock): WorksheetBlock {
  const clone = JSON.parse(JSON.stringify(block)) as WorksheetBlock;

  const reid = (value: WorksheetBlock): WorksheetBlock => {
    const next = { ...value, id: uuidv4() } as WorksheetBlock;

    if (next.type === "columns") {
      return {
        ...next,
        children: next.children.map((col) => col.map(reid)),
      } as WorksheetBlock;
    }

    if (next.type === "accordion") {
      return {
        ...next,
        items: next.items.map((item) => ({
          ...item,
          children: item.children.map(reid),
        })),
      } as WorksheetBlock;
    }

    return next;
  };

  return reid(clone);
}

function splitBlocksByPageBreak(blocks: WorksheetBlock[]): WorksheetBlock[][] {
  const parts: WorksheetBlock[][] = [];
  let current: WorksheetBlock[] = [];

  for (const block of blocks) {
    if (block.type === "page-break") {
      if (current.length > 0) {
        parts.push(current);
        current = [];
      }
      continue;
    }
    current.push(block);
  }

  if (current.length > 0) {
    parts.push(current);
  }

  return parts.length > 0 ? parts : [blocks];
}

function WorksheetPickerDialog({
  open,
  onOpenChange,
  onLink,
  onImport,
  allowSplitAcrossLessons,
  remainingLessonsCount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLink: (worksheet: WorksheetItem) => void;
  onImport: (
    worksheet: WorksheetItem,
    blocks: WorksheetBlock[],
    options: { splitAcrossLessons: boolean }
  ) => void;
  allowSplitAcrossLessons?: boolean;
  remainingLessonsCount?: number;
}) {
  const tc = useTranslations("common");
  const t = useTranslations("course");
  const [worksheets, setWorksheets] = useState<WorksheetItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [importWorksheet, setImportWorksheet] = useState<WorksheetItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [splitAcrossLessons, setSplitAcrossLessons] = useState(false);

  const worksheetBlocks = Array.isArray(importWorksheet?.blocks)
    ? (importWorksheet?.blocks as WorksheetBlock[])
    : [];

  const getBlockSelectionKey = useCallback((block: WorksheetBlock, index: number) => {
    return typeof block.id === "string" && block.id.length > 0
      ? block.id
      : `${index}-${block.type}`;
  }, []);

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

  useEffect(() => {
    if (open) return;
    setImportWorksheet(null);
    setSelectedIds(new Set());
    setSplitAcrossLessons(false);
    setSearch("");
  }, [open]);

  const startImport = useCallback(
    (worksheet: WorksheetItem) => {
      const blocks = Array.isArray(worksheet.blocks)
        ? (worksheet.blocks as WorksheetBlock[])
        : [];
      const allIds = blocks.map((block, index) => getBlockSelectionKey(block, index));
      setImportWorksheet(worksheet);
      setSelectedIds(new Set(allIds));
    },
    [getBlockSelectionKey]
  );

  const toggleSelectedId = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const confirmImport = useCallback(() => {
    if (!importWorksheet) return;
    const blocks = worksheetBlocks.filter((block, index) =>
      selectedIds.has(getBlockSelectionKey(block, index))
    );
    if (blocks.length === 0) return;
    onImport(importWorksheet, blocks, { splitAcrossLessons: allowSplitAcrossLessons ? splitAcrossLessons : false });
    onOpenChange(false);
  }, [getBlockSelectionKey, importWorksheet, onImport, onOpenChange, selectedIds, splitAcrossLessons, worksheetBlocks]);

  const selectedBlocksForImport = worksheetBlocks.filter((block, index) =>
    selectedIds.has(getBlockSelectionKey(block, index))
  );

  const splitPartsCount = splitBlocksByPageBreak(selectedBlocksForImport).length;
  const showSplitOverflowHint = Boolean(
    allowSplitAcrossLessons &&
    splitAcrossLessons &&
    (remainingLessonsCount ?? 0) > 0 &&
    splitPartsCount > (remainingLessonsCount ?? 0)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-3xl max-h-[80vh] overflow-hidden flex flex-col min-h-0">
        <DialogHeader>
          <DialogTitle>
            {importWorksheet ? t("importWorksheetBlocks") : t("selectWorksheet")}
          </DialogTitle>
        </DialogHeader>
        {importWorksheet ? (
          <div className="flex flex-1 min-h-0 flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setImportWorksheet(null)}
              >
                {tc("back")}
              </Button>
              <p className="text-sm text-muted-foreground truncate">
                {importWorksheet.title}
              </p>
            </div>
            {allowSplitAcrossLessons && (
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={splitAcrossLessons}
                  onChange={(e) => setSplitAcrossLessons(e.target.checked)}
                  className="h-4 w-4"
                />
                {t("importSplitAcrossLessons")}
              </label>
            )}
            {showSplitOverflowHint && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-sm px-2 py-1">
                {t("importSplitOverflowHint", {
                  parts: splitPartsCount,
                  lessons: remainingLessonsCount ?? 0,
                })}
              </p>
            )}
            <ScrollArea className="flex-1 min-h-0 -mx-6 px-6">
              {worksheetBlocks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">{tc("empty")}</div>
              ) : (
                <div className="space-y-2 py-2">
                  {worksheetBlocks.map((block, index) => {
                    const selectionId = getBlockSelectionKey(block, index);
                    const isSelected = selectedIds.has(selectionId);
                    return (
                      <button
                        key={selectionId}
                        type="button"
                        className={`w-full flex items-center gap-3 p-3 rounded-sm border text-left transition-colors ${
                          isSelected ? "bg-muted" : "hover:bg-muted/60"
                        }`}
                        onClick={() => toggleSelectedId(selectionId)}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectedId(selectionId)}
                          className="h-4 w-4"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{`#${index + 1} - ${block.type}`}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
            <div className="flex items-center justify-between gap-3 pt-2 border-t shrink-0">
              <p className="text-xs text-muted-foreground">
                {t("importSelectedCount", {
                  selected: selectedIds.size,
                  total: worksheetBlocks.length,
                })}
              </p>
              <Button
                type="button"
                size="sm"
                onClick={confirmImport}
                disabled={selectedIds.size === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                {t("importSelectedBlocks")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 min-h-0 flex-col gap-3">
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
            <ScrollArea className="flex-1 min-h-0 -mx-6 px-6">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">{tc("loading")}</div>
              ) : worksheets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">{t("noWorksheetsFound")}</div>
              ) : (
                <div className="space-y-2 py-2">
                  {worksheets.map((ws) => (
                    <div
                      key={ws.id}
                      className="flex flex-wrap sm:flex-nowrap items-center gap-3 p-3 rounded-sm border transition-all hover:bg-muted"
                    >
                      <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{ws.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {Array.isArray(ws.blocks)
                            ? t("importBlockCount", { count: ws.blocks.length })
                            : tc("empty")}
                        </p>
                      </div>
                      <div className="w-full sm:w-auto sm:ml-auto grid grid-cols-1 gap-2 shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full whitespace-nowrap"
                          aria-label={t("linkWorksheet")}
                          onClick={() => onLink(ws)}
                        >
                          <Link2 className="h-4 w-4 mr-2" />
                          <span>{t("linkWorksheet")}</span>
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="w-full whitespace-nowrap"
                          aria-label={t("importButton")}
                          onClick={() => startImport(ws)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          <span>{t("importButton")}</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Module Block Editor (reuses the full worksheet editor) ──

function ModuleEditorInner() {
  const t = useTranslations("course");
  const { state: editorState, dispatch: editorDispatch, addBlock } = useEditor();
  const {
    state: courseState,
    dispatch: courseDispatch,
    getSelectedModule,
    save: saveCourse,
  } = useCourse();

  const selectedModule = getSelectedModule();

  const dndId = useId();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [overPosition, setOverPosition] = useState<"above" | "below">("below");
  const [selectorOpen, setSelectorOpen] = useState(false);

  // Sync tracking
  const syncingRef = useRef(false);
  const prevModuleIdRef = useRef<string | null>(null);
  const prevBlocksJsonRef = useRef("");

  // Load module blocks into editor store when module selection changes
  useEffect(() => {
    if (!selectedModule) return;
    if (selectedModule.id === prevModuleIdRef.current) return;
    prevModuleIdRef.current = selectedModule.id;
    syncingRef.current = true;
    const blocks = selectedModule.blocks ?? [];
    prevBlocksJsonRef.current = JSON.stringify(blocks);
    editorDispatch({
      type: "LOAD_WORKSHEET",
      payload: {
        id: selectedModule.id,
        title: selectedModule.title,
        slug: "",
        blocks,
        settings: { ...DEFAULT_SETTINGS, brand: courseState.settings.brand || "edoomio" },
        published: false,
      },
    });
    requestAnimationFrame(() => {
      syncingRef.current = false;
    });
  }, [selectedModule, editorDispatch, courseState.settings.brand]);

  // Sync editor blocks back to course store on change
  useEffect(() => {
    if (syncingRef.current) return;
    if (!courseState.selectedModuleId) return;
    const json = JSON.stringify(editorState.blocks);
    if (json === prevBlocksJsonRef.current) return;
    prevBlocksJsonRef.current = json;
    courseDispatch({
      type: "SET_MODULE_BLOCKS",
      payload: {
        moduleId: courseState.selectedModuleId,
        blocks: editorState.blocks,
      },
    });
  }, [editorState.blocks, courseState.selectedModuleId, courseDispatch]);

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
        const containerBlock = editorState.blocks.find((b) => b.id === blockId);
        if (!containerBlock) return;
        const def = BLOCK_LIBRARY.find((b) => b.type === blockType);
        if (!def) return;
        const newChild = { ...def.defaultData, id: uuidv4() } as WorksheetBlock;
        if (containerBlock.type === "columns") {
          const slot = containerBlock.children[colIndex] ?? [];
          editorDispatch({ type: "DUPLICATE_IN_COLUMN", payload: { parentBlockId: blockId, colIndex, block: newChild, afterIndex: slot.length } });
        } else if (containerBlock.type === "accordion") {
          const slot = containerBlock.items[colIndex]?.children ?? [];
          editorDispatch({ type: "DUPLICATE_IN_COLUMN", payload: { parentBlockId: blockId, colIndex, block: newChild, afterIndex: slot.length } });
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

  const importWorksheetBlocks = useCallback(
    (_worksheet: WorksheetItem, blocks: WorksheetBlock[]) => {
      for (const block of blocks) {
        editorDispatch({
          type: "ADD_BLOCK",
          payload: { block: cloneBlockWithNewIds(block) },
        });
      }
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
        {/* Module breadcrumb header */}
        <div className="px-4 py-2 border-b bg-background flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
            <span className="truncate font-medium text-foreground">
              {selectedModule?.title || t("untitledModule")}
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
          <div className="bg-white rounded-sm border border-primary/30 shadow-xl p-3 opacity-90 max-w-[600px] max-h-[120px] overflow-hidden pointer-events-none">
            <BlockRenderer block={activeBlock} mode={editorState.viewMode} />
          </div>
        ) : activeLibDef ? (
          <div className="bg-white rounded-sm border border-primary/30 shadow-xl px-4 py-3 opacity-90 pointer-events-none">
            <p className="text-sm font-medium">{activeLibDef.label}</p>
            <p className="text-xs text-muted-foreground">{activeLibDef.description}</p>
          </div>
        ) : null}
      </DragOverlay>

      <WorksheetPickerDialog
        open={selectorOpen}
        onOpenChange={setSelectorOpen}
        onLink={addLinkedBlocks}
        onImport={importWorksheetBlocks}
      />
    </DndContext>
  );
}

// ─── Topic Block Editor (reuses the full worksheet editor) ──

function TopicEditorInner() {
  const t = useTranslations("course");
  const { state: editorState, dispatch: editorDispatch, addBlock } = useEditor();
  const {
    state: courseState,
    dispatch: courseDispatch,
    getSelectedModule,
    getSelectedTopic,
    save: saveCourse,
  } = useCourse();

  const selectedModule = getSelectedModule();
  const selectedTopic = getSelectedTopic();

  const dndId = useId();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [overPosition, setOverPosition] = useState<"above" | "below">("below");
  const [selectorOpen, setSelectorOpen] = useState(false);

  // Sync tracking
  const syncingRef = useRef(false);
  const prevTopicIdRef = useRef<string | null>(null);
  const prevBlocksJsonRef = useRef("");

  // Load topic blocks into editor store when topic selection changes
  useEffect(() => {
    if (!selectedTopic) return;
    if (selectedTopic.id === prevTopicIdRef.current) return;
    prevTopicIdRef.current = selectedTopic.id;
    syncingRef.current = true;
    const blocks = selectedTopic.blocks ?? [];
    prevBlocksJsonRef.current = JSON.stringify(blocks);
    editorDispatch({
      type: "LOAD_WORKSHEET",
      payload: {
        id: selectedTopic.id,
        title: selectedTopic.title,
        slug: "",
        blocks,
        settings: { ...DEFAULT_SETTINGS, brand: courseState.settings.brand || "edoomio" },
        published: false,
      },
    });
    requestAnimationFrame(() => {
      syncingRef.current = false;
    });
  }, [selectedTopic, editorDispatch, courseState.settings.brand]);

  // Sync editor blocks back to course store on change
  useEffect(() => {
    if (syncingRef.current) return;
    if (!courseState.selectedModuleId || !courseState.selectedTopicId) return;
    const json = JSON.stringify(editorState.blocks);
    if (json === prevBlocksJsonRef.current) return;
    prevBlocksJsonRef.current = json;
    courseDispatch({
      type: "SET_TOPIC_BLOCKS",
      payload: {
        moduleId: courseState.selectedModuleId,
        topicId: courseState.selectedTopicId,
        blocks: editorState.blocks,
      },
    });
  }, [editorState.blocks, courseState.selectedModuleId, courseState.selectedTopicId, courseDispatch]);

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
        const containerBlock = editorState.blocks.find((b) => b.id === blockId);
        if (!containerBlock) return;
        const def = BLOCK_LIBRARY.find((b) => b.type === blockType);
        if (!def) return;
        const newChild = { ...def.defaultData, id: uuidv4() } as WorksheetBlock;
        if (containerBlock.type === "columns") {
          const slot = containerBlock.children[colIndex] ?? [];
          editorDispatch({ type: "DUPLICATE_IN_COLUMN", payload: { parentBlockId: blockId, colIndex, block: newChild, afterIndex: slot.length } });
        } else if (containerBlock.type === "accordion") {
          const slot = containerBlock.items[colIndex]?.children ?? [];
          editorDispatch({ type: "DUPLICATE_IN_COLUMN", payload: { parentBlockId: blockId, colIndex, block: newChild, afterIndex: slot.length } });
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

  const importWorksheetBlocks = useCallback(
    (_worksheet: WorksheetItem, blocks: WorksheetBlock[]) => {
      for (const block of blocks) {
        editorDispatch({
          type: "ADD_BLOCK",
          payload: { block: cloneBlockWithNewIds(block) },
        });
      }
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
        {/* Topic breadcrumb header */}
        <div className="px-4 py-2 border-b bg-background flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
            <span className="truncate">{selectedModule?.title}</span>
            <span>/</span>
            <span className="truncate font-medium text-foreground">
              {selectedTopic?.title || t("untitledTopic")}
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
          <div className="bg-white rounded-sm border border-primary/30 shadow-xl p-3 opacity-90 max-w-[600px] max-h-[120px] overflow-hidden pointer-events-none">
            <BlockRenderer block={activeBlock} mode={editorState.viewMode} />
          </div>
        ) : activeLibDef ? (
          <div className="bg-white rounded-sm border border-primary/30 shadow-xl px-4 py-3 opacity-90 pointer-events-none">
            <p className="text-sm font-medium">{activeLibDef.label}</p>
            <p className="text-xs text-muted-foreground">{activeLibDef.description}</p>
          </div>
        ) : null}
      </DragOverlay>

      <WorksheetPickerDialog
        open={selectorOpen}
        onOpenChange={setSelectorOpen}
        onLink={addLinkedBlocks}
        onImport={importWorksheetBlocks}
      />
    </DndContext>
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
  const selectedLessonIndex = selectedTopic && selectedLesson
    ? selectedTopic.lessons.findIndex((lesson) => lesson.id === selectedLesson.id)
    : -1;
  const remainingLessonsCount =
    selectedTopic && selectedLessonIndex >= 0
      ? selectedTopic.lessons.length - selectedLessonIndex
      : 0;

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
        settings: { ...DEFAULT_SETTINGS, brand: courseState.settings.brand || "edoomio" },
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
        const containerBlock = editorState.blocks.find((b) => b.id === blockId);
        if (!containerBlock) return;
        const def = BLOCK_LIBRARY.find((b) => b.type === blockType);
        if (!def) return;
        const newChild = { ...def.defaultData, id: uuidv4() } as WorksheetBlock;
        if (containerBlock.type === "columns") {
          const slot = containerBlock.children[colIndex] ?? [];
          editorDispatch({ type: "DUPLICATE_IN_COLUMN", payload: { parentBlockId: blockId, colIndex, block: newChild, afterIndex: slot.length } });
        } else if (containerBlock.type === "accordion") {
          const slot = containerBlock.items[colIndex]?.children ?? [];
          editorDispatch({ type: "DUPLICATE_IN_COLUMN", payload: { parentBlockId: blockId, colIndex, block: newChild, afterIndex: slot.length } });
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

  const importWorksheetBlocks = useCallback(
    (_worksheet: WorksheetItem, blocks: WorksheetBlock[], options: { splitAcrossLessons: boolean }) => {
      if (!options.splitAcrossLessons) {
        for (const block of blocks) {
          editorDispatch({
            type: "ADD_BLOCK",
            payload: { block: cloneBlockWithNewIds(block) },
          });
        }
        setSelectorOpen(false);
        return;
      }

      if (!selectedTopic || !selectedLesson || !courseState.selectedModuleId || !courseState.selectedTopicId || !courseState.selectedLessonId) {
        for (const block of blocks) {
          editorDispatch({
            type: "ADD_BLOCK",
            payload: { block: cloneBlockWithNewIds(block) },
          });
        }
        setSelectorOpen(false);
        return;
      }

      const lessonIndex = selectedTopic.lessons.findIndex((lesson) => lesson.id === selectedLesson.id);
      if (lessonIndex === -1) {
        for (const block of blocks) {
          editorDispatch({
            type: "ADD_BLOCK",
            payload: { block: cloneBlockWithNewIds(block) },
          });
        }
        setSelectorOpen(false);
        return;
      }

      const parts = splitBlocksByPageBreak(blocks).map((part) => part.map(cloneBlockWithNewIds));
      if (parts.length === 0) {
        setSelectorOpen(false);
        return;
      }
      const moduleId = courseState.selectedModuleId;
      const topicId = courseState.selectedTopicId;

      syncingRef.current = true;
      try {
        parts.forEach((part, offset) => {
          const targetIndex = Math.min(lessonIndex + offset, selectedTopic.lessons.length - 1);
          const targetLesson = selectedTopic.lessons[targetIndex];
          const mergedBlocks = [...(targetLesson.blocks ?? []), ...part];

          courseDispatch({
            type: "SET_LESSON_BLOCKS",
            payload: {
              moduleId,
              topicId,
              lessonId: targetLesson.id,
              blocks: mergedBlocks,
            },
          });

          if (targetLesson.id === selectedLesson.id) {
            prevBlocksJsonRef.current = JSON.stringify(mergedBlocks);
            editorDispatch({
              type: "LOAD_WORKSHEET",
              payload: {
                id: selectedLesson.id,
                title: selectedLesson.title,
                slug: "",
                blocks: mergedBlocks,
                settings: { ...DEFAULT_SETTINGS, brand: courseState.settings.brand || "edoomio" },
                published: false,
              },
            });
          }
        });
      } finally {
        requestAnimationFrame(() => {
          syncingRef.current = false;
        });
      }

      setSelectorOpen(false);
    },
    [courseDispatch, courseState.selectedModuleId, courseState.selectedTopicId, courseState.selectedLessonId, courseState.settings.brand, editorDispatch, selectedLesson, selectedTopic]
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
          <div className="bg-white rounded-sm border border-primary/30 shadow-xl p-3 opacity-90 max-w-[600px] max-h-[120px] overflow-hidden pointer-events-none">
            <BlockRenderer block={activeBlock} mode={editorState.viewMode} />
          </div>
        ) : activeLibDef ? (
          <div className="bg-white rounded-sm border border-primary/30 shadow-xl px-4 py-3 opacity-90 pointer-events-none">
            <p className="text-sm font-medium">{activeLibDef.label}</p>
            <p className="text-xs text-muted-foreground">{activeLibDef.description}</p>
          </div>
        ) : null}
      </DragOverlay>

      <WorksheetPickerDialog
        open={selectorOpen}
        onOpenChange={setSelectorOpen}
        onLink={addLinkedBlocks}
        onImport={importWorksheetBlocks}
        allowSplitAcrossLessons
        remainingLessonsCount={remainingLessonsCount}
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

  // Module selected but no topic → module editor
  if (!state.selectedTopicId) {
    return (
      <TooltipProvider>
        <EditorProvider>
          <ModuleEditorInner />
        </EditorProvider>
      </TooltipProvider>
    );
  }

  // Topic selected but no lesson → topic editor
  if (!state.selectedLessonId || !selectedLesson) {
    return (
      <TooltipProvider>
        <EditorProvider>
          <TopicEditorInner />
        </EditorProvider>
      </TooltipProvider>
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
