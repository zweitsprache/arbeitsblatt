"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  MoreVertical,
  Trash2,
  GripVertical,
  BookOpen,
  Layers,
  FileText,
  ChevronRight,
  ChevronDown,
  ArrowRight,
} from "lucide-react";
import { useCourse } from "@/store/course-store";
import { useState, useCallback } from "react";
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
import {
  CourseModule,
  CourseTopic,
  CourseLesson,
  moduleNumber,
  topicNumber,
  lessonNumber,
} from "@/types/course";
import { LucideIconPicker, DynamicLucideIcon } from "@/components/ui/lucide-icon-picker";

// ─── Sortable Lesson ─────────────────────────────────────────
function SortableLessonItem({
  lesson,
  moduleId,
  topicId,
  otherTopics,
  number,
}: {
  lesson: CourseLesson;
  moduleId: string;
  topicId: string;
  otherTopics: { moduleId: string; moduleTitle: string; topicId: string; topicTitle: string }[];
  number: string;
}) {
  const t = useTranslations("course");
  const tc = useTranslations("common");
  const { dispatch } = useCourse();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lesson.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const startEditing = () => {
    setEditValue(lesson.title);
    setIsEditing(true);
  };

  const handleSubmitEdit = () => {
    if (editValue.trim()) {
      dispatch({
        type: "UPDATE_LESSON",
        payload: { moduleId, topicId, lessonId: lesson.id, title: editValue.trim() },
      });
    }
    setIsEditing(false);
  };

  const moveToTopic = (targetModuleId: string, targetTopicId: string) => {
    // Remove from current topic
    dispatch({
      type: "REMOVE_LESSON",
      payload: { moduleId, topicId, lessonId: lesson.id },
    });
    // Add to target topic (we re-create with same id)
    dispatch({
      type: "ADD_LESSON",
      payload: { moduleId: targetModuleId, topicId: targetTopicId, title: lesson.title },
    });
  };

  const hasContent = (lesson.blocks ?? []).length > 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-2 px-3 py-2 rounded-md border bg-background transition-colors",
        isDragging && "opacity-50 shadow-lg",
        "hover:border-primary/30"
      )}
    >
      <button
        className="cursor-grab touch-none opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />

      <span className="text-[10px] font-mono text-muted-foreground shrink-0">{number}</span>

      {isEditing ? (
        <Input
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSubmitEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmitEdit();
            if (e.key === "Escape") setIsEditing(false);
          }}
          onClick={(e) => e.stopPropagation()}
          autoFocus
          className="h-6 text-sm py-0 flex-1"
        />
      ) : (
        <span className="flex-1 text-sm truncate">
          {lesson.title || t("untitledLesson")}
        </span>
      )}

      {hasContent && (
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
          {(lesson.blocks ?? []).length}
        </Badge>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreVertical className="size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={startEditing}>
            {tc("rename")}
          </DropdownMenuItem>
          {otherTopics.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <ArrowRight className="h-3.5 w-3.5 mr-2" />
                  {t("moveTo")}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {otherTopics.map((target) => (
                    <DropdownMenuItem
                      key={`${target.moduleId}-${target.topicId}`}
                      onClick={() => moveToTopic(target.moduleId, target.topicId)}
                    >
                      <span className="text-muted-foreground mr-1">{target.moduleTitle} →</span>
                      {target.topicTitle}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive"
            onClick={() =>
              dispatch({
                type: "REMOVE_LESSON",
                payload: { moduleId, topicId, lessonId: lesson.id },
              })
            }
          >
            <Trash2 className="h-3.5 w-3.5 mr-2" />
            {tc("delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ─── Topic Section ───────────────────────────────────────────
function SortableTopicSection({
  topic,
  moduleId,
  moduleIndex,
  topicIndex,
  otherModules,
  allTopics,
}: {
  topic: CourseTopic;
  moduleId: string;
  moduleIndex: number;
  topicIndex: number;
  otherModules: { id: string; title: string }[];
  allTopics: { moduleId: string; moduleTitle: string; topicId: string; topicTitle: string }[];
}) {
  const t = useTranslations("course");
  const tc = useTranslations("common");
  const { dispatch, addLesson } = useCourse();
  const [expanded, setExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: topic.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleLessonDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = topic.lessons.findIndex((l) => l.id === active.id);
        const newIndex = topic.lessons.findIndex((l) => l.id === over.id);
        const newLessons = arrayMove(topic.lessons, oldIndex, newIndex);
        dispatch({
          type: "REORDER_LESSONS",
          payload: { moduleId, topicId: topic.id, lessons: newLessons },
        });
      }
    },
    [dispatch, moduleId, topic.id, topic.lessons]
  );

  const startEditing = () => {
    setEditValue(topic.title);
    setIsEditing(true);
  };

  const handleSubmitEdit = () => {
    if (editValue.trim()) {
      dispatch({
        type: "UPDATE_TOPIC",
        payload: { moduleId, topicId: topic.id, title: editValue.trim() },
      });
    }
    setIsEditing(false);
  };

  const moveToModule = (targetModuleId: string) => {
    dispatch({
      type: "REMOVE_TOPIC",
      payload: { moduleId, topicId: topic.id },
    });
    dispatch({
      type: "ADD_TOPIC",
      payload: { moduleId: targetModuleId, title: topic.title },
    });
  };

  // Other topics for lesson "move to" (all topics except the current one)
  const otherTopicsForLessons = allTopics.filter(
    (t) => t.topicId !== topic.id
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-lg border bg-muted/30 transition-all",
        isDragging && "opacity-50 shadow-lg"
      )}
    >
      {/* Topic header */}
      <div className="group flex items-center gap-2 px-3 py-2.5">
        <button
          className="cursor-grab touch-none opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>

        <button
          className="shrink-0"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {topic.icon ? (
          <DynamicLucideIcon name={topic.icon} className="h-4 w-4 text-blue-500 shrink-0" />
        ) : (
          <Layers className="h-4 w-4 text-blue-500 shrink-0" />
        )}

        <span className="text-[10px] font-mono text-muted-foreground shrink-0">{topicNumber(moduleIndex, topicIndex)}</span>

        {isEditing ? (
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSubmitEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmitEdit();
              if (e.key === "Escape") setIsEditing(false);
            }}
            autoFocus
            className="h-6 text-sm py-0 flex-1"
          />
        ) : (
          <span className="flex-1 text-sm font-medium truncate">
            {topic.title || t("untitledTopic")}
          </span>
        )}

        <LucideIconPicker
          value={topic.icon}
          onChange={(icon) =>
            dispatch({ type: "UPDATE_TOPIC", payload: { moduleId, topicId: topic.id, icon } })
          }
          placeholder={t("iconPlaceholder")}
        />

        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
          {t("lessonCount", { count: topic.lessons.length })}
        </Badge>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => addLesson(moduleId, topic.id)}
            >
              <Plus className="h-3.5 w-3.5 mr-2" />
              {t("addLesson")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={startEditing}>
              {tc("rename")}
            </DropdownMenuItem>
            {otherModules.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <ArrowRight className="h-3.5 w-3.5 mr-2" />
                    {t("moveTo")}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {otherModules.map((mod) => (
                      <DropdownMenuItem
                        key={mod.id}
                        onClick={() => moveToModule(mod.id)}
                      >
                        {mod.title || t("untitledModule")}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() =>
                dispatch({
                  type: "REMOVE_TOPIC",
                  payload: { moduleId, topicId: topic.id },
                })
              }
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              {tc("delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Lessons */}
      {expanded && (
        <div className="px-3 pb-3">
          {topic.lessons.length === 0 ? (
            <div className="text-center py-4 border border-dashed rounded-md">
              <p className="text-xs text-muted-foreground mb-2">
                {t("noLessonContent")}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-xs h-7"
                onClick={() => addLesson(moduleId, topic.id)}
              >
                <Plus className="h-3 w-3" />
                {t("addLesson")}
              </Button>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleLessonDragEnd}
            >
              <SortableContext
                items={topic.lessons.map((l) => l.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1">
                  {topic.lessons.map((lesson, li) => (
                    <SortableLessonItem
                      key={lesson.id}
                      lesson={lesson}
                      moduleId={moduleId}
                      topicId={topic.id}
                      otherTopics={otherTopicsForLessons}
                      number={lessonNumber(moduleIndex, topicIndex, li)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 gap-1 text-xs text-muted-foreground h-7 w-full justify-start"
            onClick={() => addLesson(moduleId, topic.id)}
          >
            <Plus className="h-3 w-3" />
            {t("addLesson")}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Module Section ──────────────────────────────────────────
function SortableModuleSection({
  module: mod,
  moduleIndex,
  allModules,
  allTopics,
}: {
  module: CourseModule;
  moduleIndex: number;
  allModules: CourseModule[];
  allTopics: { moduleId: string; moduleTitle: string; topicId: string; topicTitle: string }[];
}) {
  const t = useTranslations("course");
  const tc = useTranslations("common");
  const { dispatch, addTopic } = useCourse();
  const [expanded, setExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: mod.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleTopicDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = mod.topics.findIndex((t) => t.id === active.id);
        const newIndex = mod.topics.findIndex((t) => t.id === over.id);
        const newTopics = arrayMove(mod.topics, oldIndex, newIndex);
        dispatch({
          type: "REORDER_TOPICS",
          payload: { moduleId: mod.id, topics: newTopics },
        });
      }
    },
    [dispatch, mod.id, mod.topics]
  );

  const startEditing = () => {
    setEditValue(mod.title);
    setIsEditing(true);
  };

  const handleSubmitEdit = () => {
    if (editValue.trim()) {
      dispatch({
        type: "UPDATE_MODULE",
        payload: { id: mod.id, title: editValue.trim() },
      });
    }
    setIsEditing(false);
  };

  const otherModules = allModules
    .filter((m) => m.id !== mod.id)
    .map((m) => ({ id: m.id, title: m.title }));

  const totalLessons = mod.topics.reduce((sum, t) => sum + t.lessons.length, 0);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-xl border-2 bg-background transition-all",
        isDragging && "opacity-50 shadow-xl"
      )}
    >
      {/* Module header */}
      <div className="group flex items-center gap-2 px-4 py-3 border-b">
        <button
          className="cursor-grab touch-none opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>

        <button
          className="shrink-0"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {mod.icon ? (
          <DynamicLucideIcon name={mod.icon} className="h-4.5 w-4.5 text-primary shrink-0" />
        ) : (
          <BookOpen className="h-4.5 w-4.5 text-primary shrink-0" />
        )}

        <span className="text-xs font-mono text-muted-foreground shrink-0">{moduleNumber(moduleIndex)}</span>

        {isEditing ? (
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSubmitEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmitEdit();
              if (e.key === "Escape") setIsEditing(false);
            }}
            autoFocus
            className="h-7 text-sm py-0 flex-1 font-semibold"
          />
        ) : (
          <span className="flex-1 text-sm font-semibold truncate">
            {mod.title || t("untitledModule")}
          </span>
        )}

        <div className="flex items-center gap-1.5 shrink-0">
          <LucideIconPicker
            value={mod.icon}
            onChange={(icon) =>
              dispatch({ type: "UPDATE_MODULE", payload: { id: mod.id, icon } })
            }
            placeholder={t("iconPlaceholder")}
          />
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
            {t("topicCount", { count: mod.topics.length })}
          </Badge>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
            {t("lessonCount", { count: totalLessons })}
          </Badge>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => addTopic(mod.id)}>
              <Plus className="h-3.5 w-3.5 mr-2" />
              {t("addTopic")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={startEditing}>
              {tc("rename")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => {
                if (confirm(t("deleteModule"))) {
                  dispatch({ type: "REMOVE_MODULE", payload: mod.id });
                }
              }}
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              {tc("delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Topics */}
      {expanded && (
        <div className="p-4">
          {mod.topics.length === 0 ? (
            <div className="text-center py-6 border border-dashed rounded-lg">
              <Layers className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-3">
                {t("noTopicsYet")}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => addTopic(mod.id)}
              >
                <Plus className="h-3.5 w-3.5" />
                {t("addTopic")}
              </Button>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleTopicDragEnd}
            >
              <SortableContext
                items={mod.topics.map((t) => t.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {mod.topics.map((topic, ti) => (
                    <SortableTopicSection
                      key={topic.id}
                      topic={topic}
                      moduleId={mod.id}
                      moduleIndex={moduleIndex}
                      topicIndex={ti}
                      otherModules={otherModules}
                      allTopics={allTopics}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="mt-3 gap-1.5 text-muted-foreground w-full justify-start"
            onClick={() => addTopic(mod.id)}
          >
            <Plus className="h-3.5 w-3.5" />
            {t("addTopic")}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Course Structure Manager ────────────────────────────────
export function CourseStructureManager() {
  const t = useTranslations("course");
  const { state, dispatch, addModule } = useCourse();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleModuleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = state.structure.findIndex((m) => m.id === active.id);
        const newIndex = state.structure.findIndex((m) => m.id === over.id);
        const newStructure = arrayMove(state.structure, oldIndex, newIndex);
        dispatch({ type: "REORDER_MODULES", payload: newStructure });
      }
    },
    [dispatch, state.structure]
  );

  // Build a flat list of all topics for "move to" menus
  const allTopics = state.structure.flatMap((mod) =>
    mod.topics.map((topic) => ({
      moduleId: mod.id,
      moduleTitle: mod.title || t("untitledModule"),
      topicId: topic.id,
      topicTitle: topic.title || t("untitledTopic"),
    }))
  );

  const totalModules = state.structure.length;
  const totalTopics = state.structure.reduce((sum, m) => sum + m.topics.length, 0);
  const totalLessons = state.structure.reduce(
    (sum, m) => sum + m.topics.reduce((s, t) => s + t.lessons.length, 0),
    0
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Summary bar */}
      <div className="px-6 py-3 border-b bg-background flex items-center gap-4">
        <h2 className="text-sm font-semibold">{t("structureOverview")}</h2>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="gap-1">
            <BookOpen className="h-3 w-3" />
            {t("moduleCount", { count: totalModules })}
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Layers className="h-3 w-3" />
            {t("topicCountSummary", { count: totalTopics })}
          </Badge>
          <Badge variant="outline" className="gap-1">
            <FileText className="h-3 w-3" />
            {t("lessonCount", { count: totalLessons })}
          </Badge>
        </div>
        <div className="flex-1" />
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => addModule()}
        >
          <Plus className="h-3.5 w-3.5" />
          {t("addModule")}
        </Button>
      </div>

      {/* Modules list */}
      <ScrollArea className="flex-1">
        <div className="p-6 max-w-4xl mx-auto">
          {state.structure.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed rounded-xl">
              <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                {t("noModules")}
              </h3>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => addModule()}
              >
                <Plus className="h-4 w-4" />
                {t("addModule")}
              </Button>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleModuleDragEnd}
            >
              <SortableContext
                items={state.structure.map((m) => m.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-4">
                  {state.structure.map((mod, mi) => (
                    <SortableModuleSection
                      key={mod.id}
                      module={mod}
                      moduleIndex={mi}
                      allModules={state.structure}
                      allTopics={allTopics}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
