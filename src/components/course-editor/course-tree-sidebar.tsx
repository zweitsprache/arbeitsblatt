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
  ChevronRight,
  ChevronDown,
  BookOpen,
  Layers,
  FileText,
  Settings,
} from "lucide-react";
import { useCourse } from "@/store/course-store";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  PopulatedCourseModule,
  PopulatedCourseTopic,
  PopulatedCourseLesson,
} from "@/types/course";

// ─── Lesson Item ─────────────────────────────────────────────
function LessonItem({
  lesson,
  moduleId,
  topicId,
  isSelected,
}: {
  lesson: PopulatedCourseLesson;
  moduleId: string;
  topicId: string;
  isSelected: boolean;
}) {
  const t = useTranslations("course");
  const tc = useTranslations("common");
  const { dispatch } = useCourse();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(lesson.title);

  const handleSubmitRename = () => {
    if (editTitle.trim()) {
      dispatch({
        type: "UPDATE_LESSON",
        payload: { moduleId, topicId, lessonId: lesson.id, title: editTitle.trim() },
      });
    }
    setIsEditing(false);
  };

  return (
    <div
      className={cn(
        "group flex items-center gap-2 pl-12 pr-2 py-1.5 cursor-pointer transition-colors",
        isSelected
          ? "bg-primary/10 border-r-2 border-primary"
          : "hover:bg-muted"
      )}
      onClick={() =>
        dispatch({
          type: "SELECT_LESSON",
          payload: { moduleId, topicId, lessonId: lesson.id },
        })
      }
    >
      <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />

      {isEditing ? (
        <Input
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onBlur={handleSubmitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmitRename();
            if (e.key === "Escape") {
              setEditTitle(lesson.title);
              setIsEditing(false);
            }
          }}
          onClick={(e) => e.stopPropagation()}
          autoFocus
          className="h-5 text-xs py-0"
        />
      ) : (
        <span className="flex-1 text-xs truncate">
          {lesson.title || t("untitledLesson")}
        </span>
      )}

      {lesson.worksheet && (
        <span className="text-[10px] text-muted-foreground/70 shrink-0">●</span>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 shrink-0 text-muted-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              setEditTitle(lesson.title);
              setIsEditing(true);
            }}
          >
            {tc("rename")}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              dispatch({
                type: "REMOVE_LESSON",
                payload: { moduleId, topicId, lessonId: lesson.id },
              });
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

// ─── Topic Item ──────────────────────────────────────────────
function TopicItem({
  topic,
  moduleId,
  isSelected,
  selectedLessonId,
}: {
  topic: PopulatedCourseTopic;
  moduleId: string;
  isSelected: boolean;
  selectedLessonId: string | null;
}) {
  const t = useTranslations("course");
  const tc = useTranslations("common");
  const { dispatch, addLesson } = useCourse();
  const [expanded, setExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(topic.title);

  const handleSubmitRename = () => {
    if (editTitle.trim()) {
      dispatch({
        type: "UPDATE_TOPIC",
        payload: { moduleId, topicId: topic.id, title: editTitle.trim() },
      });
    }
    setIsEditing(false);
  };

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-1.5 pl-6 pr-2 py-1.5 cursor-pointer transition-colors",
          isSelected && !selectedLessonId
            ? "bg-primary/5"
            : "hover:bg-muted/50"
        )}
        onClick={() => {
          dispatch({
            type: "SELECT_TOPIC",
            payload: { moduleId, topicId: topic.id },
          });
        }}
      >
        <button
          className="shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
        >
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </button>

        <Layers className="h-3.5 w-3.5 text-muted-foreground shrink-0" />

        {isEditing ? (
          <Input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleSubmitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmitRename();
              if (e.key === "Escape") {
                setEditTitle(topic.title);
                setIsEditing(false);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            autoFocus
            className="h-5 text-xs py-0"
          />
        ) : (
          <span className="flex-1 text-xs font-medium truncate">
            {topic.title || t("untitledTopic")}
          </span>
        )}

        <span className="text-[10px] text-muted-foreground shrink-0">
          {topic.lessons.length}
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 shrink-0 text-muted-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                addLesson(moduleId, topic.id);
              }}
            >
              <Plus className="h-3.5 w-3.5 mr-2" />
              {t("addLesson")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setEditTitle(topic.title);
                setIsEditing(true);
              }}
            >
              {tc("rename")}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                dispatch({
                  type: "REMOVE_TOPIC",
                  payload: { moduleId, topicId: topic.id },
                });
              }}
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              {tc("delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {expanded && (
        <div>
          {topic.lessons.map((lesson) => (
            <LessonItem
              key={lesson.id}
              lesson={lesson}
              moduleId={moduleId}
              topicId={topic.id}
              isSelected={selectedLessonId === lesson.id && isSelected}
            />
          ))}
          {topic.lessons.length === 0 && (
            <div className="pl-14 pr-2 py-2">
              <button
                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                onClick={() => addLesson(moduleId, topic.id)}
              >
                <Plus className="h-3 w-3" />
                {t("addLesson")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Module Item ─────────────────────────────────────────────
function ModuleItem({
  module: mod,
  isSelected,
  selectedTopicId,
  selectedLessonId,
}: {
  module: PopulatedCourseModule;
  isSelected: boolean;
  selectedTopicId: string | null;
  selectedLessonId: string | null;
}) {
  const t = useTranslations("course");
  const tc = useTranslations("common");
  const { dispatch, addTopic } = useCourse();
  const [expanded, setExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(mod.title);

  const handleSubmitRename = () => {
    if (editTitle.trim()) {
      dispatch({
        type: "UPDATE_MODULE",
        payload: { id: mod.id, title: editTitle.trim() },
      });
    }
    setIsEditing(false);
  };

  return (
    <div className="mb-1">
      <div
        className={cn(
          "group flex items-center gap-1.5 px-2 py-2 cursor-pointer transition-colors rounded-md",
          isSelected && !selectedTopicId
            ? "bg-primary/10 border border-primary/30"
            : "hover:bg-muted border border-transparent"
        )}
        onClick={() =>
          dispatch({ type: "SELECT_MODULE", payload: mod.id })
        }
      >
        <button
          className="shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
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
                setEditTitle(mod.title);
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
              {mod.title || t("untitledModule")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("topicCount", { count: mod.topics.length })}
            </p>
          </div>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 text-muted-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                addTopic(mod.id);
              }}
            >
              <Plus className="h-3.5 w-3.5 mr-2" />
              {t("addTopic")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setEditTitle(mod.title);
                setIsEditing(true);
              }}
            >
              {tc("rename")}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={(e) => {
                e.stopPropagation();
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

      {expanded && (
        <div className="mt-0.5">
          {mod.topics.map((topic) => (
            <TopicItem
              key={topic.id}
              topic={topic}
              moduleId={mod.id}
              isSelected={isSelected && selectedTopicId === topic.id}
              selectedLessonId={
                selectedTopicId === topic.id ? selectedLessonId : null
              }
            />
          ))}
          {mod.topics.length === 0 && (
            <div className="pl-8 pr-2 py-2">
              <button
                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                onClick={() => addTopic(mod.id)}
              >
                <Plus className="h-3 w-3" />
                {t("addTopic")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tree Sidebar ────────────────────────────────────────────
export function CourseTreeSidebar() {
  const t = useTranslations("course");
  const { state, dispatch, addModule } = useCourse();

  return (
    <div className="w-72 bg-background border-r flex flex-col shrink-0">
      {/* Header */}
      <div className="p-3 border-b">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-sm">{t("structure")}</h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => addModule()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Cover section */}
      <div
        className={cn(
          "mx-3 mt-3 p-2 rounded-md cursor-pointer transition-colors flex items-center gap-2",
          state.selectedModuleId === null &&
            state.selectedTopicId === null &&
            state.selectedLessonId === null
            ? "bg-primary/10 border border-primary/30"
            : "hover:bg-muted border border-transparent"
        )}
        onClick={() => {
          dispatch({ type: "SELECT_MODULE", payload: null });
        }}
      >
        <Settings className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{t("courseSettings")}</span>
      </div>

      {/* Modules tree */}
      <ScrollArea className="flex-1 px-3 py-2">
        {state.structure.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">{t("noModules")}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 gap-2"
              onClick={() => addModule()}
            >
              <Plus className="h-4 w-4" />
              {t("addModule")}
            </Button>
          </div>
        ) : (
          <div className="space-y-0.5">
            {state.structure.map((mod) => (
              <ModuleItem
                key={mod.id}
                module={mod}
                isSelected={state.selectedModuleId === mod.id}
                selectedTopicId={
                  state.selectedModuleId === mod.id
                    ? state.selectedTopicId
                    : null
                }
                selectedLessonId={
                  state.selectedModuleId === mod.id &&
                  state.selectedTopicId !== null
                    ? state.selectedLessonId
                    : null
                }
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
