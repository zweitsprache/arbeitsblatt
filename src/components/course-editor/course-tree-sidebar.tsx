"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
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
  MoreVertical,
  Trash2,
  ChevronRight,
  ChevronDown,
  BookOpen,
  Layers,
  FileText,
  Settings,
  ImagePlus,
  Languages,
  Loader2,
  X,
} from "lucide-react";
import { useCourse } from "@/store/course-store";
import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  CourseModule,
  CourseTopic,
  CourseLesson,
  moduleNumber,
  topicNumber,
  lessonNumber,
} from "@/types/course";
import { MediaBrowserDialog } from "@/components/ui/media-browser-dialog";
import { ImageCropDialog, CropResult } from "@/components/ui/image-crop-dialog";
import { useUpload } from "@/lib/use-upload";
import { DynamicLucideIcon } from "@/components/ui/lucide-icon-picker";
import { authFetch } from "@/lib/auth-fetch";

// ─── Translation Status Context ──────────────────────────────
type UnitStatus = "translated" | "outdated" | "none";

interface UnitStatusMap {
  cover: UnitStatus;
  modules: Record<string, UnitStatus>;
  topics: Record<string, UnitStatus>;
  lessons: Record<string, UnitStatus>;
}

interface TranslationStatusCtx {
  status: UnitStatusMap | null;
  translatingId: string | null;
  translateUnit: (scope: string, scopeId?: string) => Promise<void>;
}

const TranslationStatusContext = createContext<TranslationStatusCtx>({
  status: null,
  translatingId: null,
  translateUnit: async () => {},
});

function useTranslationStatus() {
  return useContext(TranslationStatusContext);
}

function TranslationDot({ unitStatus }: { unitStatus?: UnitStatus }) {
  if (!unitStatus || unitStatus === "none") return null;
  return (
    <span
      className={cn(
        "size-2 rounded-full shrink-0",
        unitStatus === "translated" ? "bg-green-500" : "bg-orange-500"
      )}
      title={unitStatus === "translated" ? "Translated" : "Needs update"}
    />
  );
}

// ─── Lesson Item ─────────────────────────────────────────────
function LessonItem({
  lesson,
  moduleId,
  topicId,
  isSelected,
  number,
}: {
  lesson: CourseLesson;
  moduleId: string;
  topicId: string;
  isSelected: boolean;
  number: string;
}) {
  const t = useTranslations("course");
  const tc = useTranslations("common");
  const { dispatch } = useCourse();
  const [editingField, setEditingField] = useState<"title" | "shortTitle" | null>(null);
  const [editValue, setEditValue] = useState("");

  const startEditing = (field: "title" | "shortTitle") => {
    setEditValue(field === "title" ? lesson.title : lesson.shortTitle);
    setEditingField(field);
  };

  const handleSubmitEdit = () => {
    if (editingField && editValue.trim()) {
      dispatch({
        type: "UPDATE_LESSON",
        payload: { moduleId, topicId, lessonId: lesson.id, [editingField]: editValue.trim() },
      });
    }
    setEditingField(null);
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

      <span className="text-[10px] font-mono text-muted-foreground shrink-0">{number}</span>

      {editingField ? (
        <Input
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSubmitEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmitEdit();
            if (e.key === "Escape") {
              setEditingField(null);
            }
          }}
          onClick={(e) => e.stopPropagation()}
          autoFocus
          placeholder={editingField === "shortTitle" ? t("shortTitlePlaceholder") : ""}
          className="h-5 text-xs py-0"
        />
      ) : (
        <span className="flex-1 text-xs truncate">
          {lesson.shortTitle || lesson.title || t("untitledLesson")}
        </span>
      )}

      {(lesson.blocks ?? []).length > 0 && (
        <span className="text-[10px] text-muted-foreground/70 shrink-0">●</span>
      )}

      <TranslationDotForUnit type="lessons" id={lesson.id} />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="size-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              startEditing("title");
            }}
          >
            {tc("rename")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              startEditing("shortTitle");
            }}
          >
            {t("shortTitle")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <TranslateMenuItem scope="lesson" scopeId={lesson.id} />
          <DropdownMenuSeparator />
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
  moduleIndex,
  topicIndex,
  isSelected,
  selectedLessonId,
}: {
  topic: CourseTopic;
  moduleId: string;
  moduleIndex: number;
  topicIndex: number;
  isSelected: boolean;
  selectedLessonId: string | null;
}) {
  const t = useTranslations("course");
  const tc = useTranslations("common");
  const { dispatch, addLesson } = useCourse();
  const [expanded, setExpanded] = useState(true);
  const [editingField, setEditingField] = useState<"title" | "shortTitle" | null>(null);
  const [editValue, setEditValue] = useState("");
  const [imageBrowserOpen, setImageBrowserOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const { upload } = useUpload();

  const handleFileForCrop = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const objectUrl = URL.createObjectURL(file);
    setCropSrc(objectUrl);
    setCropOpen(true);
  };

  const handleCropComplete = async (result: CropResult) => {
    try {
      const file = new File([result.blob], "topic-image.png", { type: "image/png" });
      const uploadResult = await upload(file);
      if (uploadResult?.url) {
        dispatch({
          type: "UPDATE_TOPIC",
          payload: { moduleId, topicId: topic.id, image: uploadResult.url },
        });
      }
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      if (cropSrc) URL.revokeObjectURL(cropSrc);
      URL.revokeObjectURL(result.url);
    }
  };

  const startEditing = (field: "title" | "shortTitle") => {
    setEditValue(field === "title" ? topic.title : topic.shortTitle);
    setEditingField(field);
  };

  const handleSubmitEdit = () => {
    if (editingField && editValue.trim()) {
      dispatch({
        type: "UPDATE_TOPIC",
        payload: { moduleId, topicId: topic.id, [editingField]: editValue.trim() },
      });
    }
    setEditingField(null);
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

        {topic.icon ? (
          <DynamicLucideIcon name={topic.icon} className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        ) : (
          <Layers className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}

        <span className="text-[10px] font-mono text-muted-foreground shrink-0">{topicNumber(moduleIndex, topicIndex)}</span>

        {editingField ? (
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSubmitEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmitEdit();
              if (e.key === "Escape") {
                setEditingField(null);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            autoFocus
            placeholder={editingField === "shortTitle" ? t("shortTitlePlaceholder") : ""}
            className="h-5 text-xs py-0"
          />
        ) : (
          <span className="flex-1 text-xs font-medium truncate">
            {topic.shortTitle || topic.title || t("untitledTopic")}
          </span>
        )}

        <span className="text-[10px] text-muted-foreground shrink-0">
          {topic.lessons.length}
        </span>

        {(topic.blocks ?? []).length > 0 && (
          <span className="text-[10px] text-muted-foreground/70 shrink-0">●</span>
        )}

        <TranslationDotForUnit type="topics" id={topic.id} />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="size-3" />
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
                startEditing("title");
              }}
            >
              {tc("rename")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                startEditing("shortTitle");
              }}
            >
              {t("shortTitle")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setImageBrowserOpen(true);
              }}
            >
              <ImagePlus className="h-3.5 w-3.5 mr-2" />
              {tc("image")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <TranslateMenuItem scope="topic" scopeId={topic.id} />
            <DropdownMenuSeparator />
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

      {topic.image && (
        <div className="pl-10 pr-2 py-1">
          <div className="relative group/img inline-block">
            <img src={topic.image} alt="" className="h-10 rounded object-cover" />
            <button
              className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"
              onClick={() =>
                dispatch({
                  type: "UPDATE_TOPIC",
                  payload: { moduleId, topicId: topic.id, image: null },
                })
              }
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
        </div>
      )}

      <MediaBrowserDialog
        open={imageBrowserOpen}
        onOpenChange={setImageBrowserOpen}
        onSelectUrl={(url) => {
          dispatch({
            type: "UPDATE_TOPIC",
            payload: { moduleId, topicId: topic.id, image: url },
          });
        }}
        onSelectFile={(file) => handleFileForCrop(file)}
      />

      <ImageCropDialog
        imageSrc={cropSrc}
        open={cropOpen}
        onOpenChange={(open) => {
          setCropOpen(open);
          if (!open && cropSrc) {
            URL.revokeObjectURL(cropSrc);
            setCropSrc(null);
          }
        }}
        onCropComplete={handleCropComplete}
      />

      {expanded && (
        <div>
          {topic.lessons.map((lesson, li) => (
            <LessonItem
              key={lesson.id}
              lesson={lesson}
              moduleId={moduleId}
              topicId={topic.id}
              isSelected={selectedLessonId === lesson.id && isSelected}
              number={lessonNumber(moduleIndex, topicIndex, li)}
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
  moduleIndex,
  isSelected,
  selectedTopicId,
  selectedLessonId,
}: {
  module: CourseModule;
  moduleIndex: number;
  isSelected: boolean;
  selectedTopicId: string | null;
  selectedLessonId: string | null;
}) {
  const t = useTranslations("course");
  const tc = useTranslations("common");
  const { dispatch, addTopic } = useCourse();
  const [expanded, setExpanded] = useState(true);
  const [editingField, setEditingField] = useState<"title" | "shortTitle" | null>(null);
  const [editValue, setEditValue] = useState("");
  const [imageBrowserOpen, setImageBrowserOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const { upload } = useUpload();

  const handleFileForCrop = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const objectUrl = URL.createObjectURL(file);
    setCropSrc(objectUrl);
    setCropOpen(true);
  };

  const handleCropComplete = async (result: CropResult) => {
    try {
      const file = new File([result.blob], "module-image.png", { type: "image/png" });
      const uploadResult = await upload(file);
      if (uploadResult?.url) {
        dispatch({
          type: "UPDATE_MODULE",
          payload: { id: mod.id, image: uploadResult.url },
        });
      }
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      if (cropSrc) URL.revokeObjectURL(cropSrc);
      URL.revokeObjectURL(result.url);
    }
  };

  const startEditing = (field: "title" | "shortTitle") => {
    setEditValue(field === "title" ? mod.title : mod.shortTitle);
    setEditingField(field);
  };

  const handleSubmitEdit = () => {
    if (editingField && editValue.trim()) {
      dispatch({
        type: "UPDATE_MODULE",
        payload: { id: mod.id, [editingField]: editValue.trim() },
      });
    }
    setEditingField(null);
  };

  return (
    <div className="mb-1">
      <div
        className={cn(
          "group flex items-center gap-1.5 px-2 py-2 cursor-pointer transition-colors rounded-sm",
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

        {mod.icon ? (
          <DynamicLucideIcon name={mod.icon} className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
        )}

        <span className="text-[10px] font-mono text-muted-foreground shrink-0">{moduleNumber(moduleIndex)}</span>

        {editingField ? (
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSubmitEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmitEdit();
              if (e.key === "Escape") {
                setEditingField(null);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            autoFocus
            placeholder={editingField === "shortTitle" ? t("shortTitlePlaceholder") : ""}
            className="h-6 text-sm py-0"
          />
        ) : (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {mod.shortTitle || mod.title || t("untitledModule")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("topicCount", { count: mod.topics.length })}
            </p>
          </div>
        )}

        {(mod.blocks ?? []).length > 0 && (
          <span className="text-[10px] text-muted-foreground/70 shrink-0">●</span>
        )}

        <TranslationDotForUnit type="modules" id={mod.id} />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-6 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="size-3.5" />
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
                startEditing("title");
              }}
            >
              {tc("rename")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                startEditing("shortTitle");
              }}
            >
              {t("shortTitle")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setImageBrowserOpen(true);
              }}
            >
              <ImagePlus className="h-3.5 w-3.5 mr-2" />
              {tc("image")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <TranslateMenuItem scope="module" scopeId={mod.id} />
            <DropdownMenuSeparator />
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

      {mod.image && (
        <div className="px-2 py-1">
          <div className="relative group/img inline-block">
            <img src={mod.image} alt="" className="h-12 rounded object-cover" />
            <button
              className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"
              onClick={() =>
                dispatch({
                  type: "UPDATE_MODULE",
                  payload: { id: mod.id, image: null },
                })
              }
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
        </div>
      )}

      <MediaBrowserDialog
        open={imageBrowserOpen}
        onOpenChange={setImageBrowserOpen}
        onSelectUrl={(url) => {
          dispatch({
            type: "UPDATE_MODULE",
            payload: { id: mod.id, image: url },
          });
        }}
        onSelectFile={(file) => handleFileForCrop(file)}
      />

      <ImageCropDialog
        imageSrc={cropSrc}
        open={cropOpen}
        onOpenChange={(open) => {
          setCropOpen(open);
          if (!open && cropSrc) {
            URL.revokeObjectURL(cropSrc);
            setCropSrc(null);
          }
        }}
        onCropComplete={handleCropComplete}
      />

      {expanded && (
        <div className="mt-0.5">
          {mod.topics.map((topic, ti) => (
            <TopicItem
              key={topic.id}
              topic={topic}
              moduleId={mod.id}
              moduleIndex={moduleIndex}
              topicIndex={ti}
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

// ─── Shared Translation Helpers ──────────────────────────────

function TranslationDotForUnit({ type, id }: { type: "modules" | "topics" | "lessons"; id: string }) {
  const { status, translatingId } = useTranslationStatus();
  if (translatingId === id) {
    return <Loader2 className="h-3 w-3 shrink-0 animate-spin text-muted-foreground" />;
  }
  const unitStatus = status?.[type]?.[id];
  return <TranslationDot unitStatus={unitStatus} />;
}

function TranslateMenuItem({ scope, scopeId }: { scope: string; scopeId: string }) {
  const t = useTranslations("course");
  const { translatingId, translateUnit } = useTranslationStatus();
  const isTranslating = translatingId === scopeId;

  return (
    <DropdownMenuItem
      disabled={isTranslating}
      onClick={(e) => {
        e.stopPropagation();
        translateUnit(scope, scopeId);
      }}
    >
      {isTranslating ? (
        <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
      ) : (
        <Languages className="h-3.5 w-3.5 mr-2" />
      )}
      {isTranslating ? t("translating") : t("translate")}
    </DropdownMenuItem>
  );
}

// ─── Tree Sidebar ────────────────────────────────────────────
export function CourseTreeSidebar() {
  const t = useTranslations("course");
  const { state, dispatch, addModule, save } = useCourse();

  // ── Translation status management ──────────────────────────
  const [unitStatus, setUnitStatus] = useState<UnitStatusMap | null>(null);
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const fetchUnitStatus = useCallback(async () => {
    if (!state.courseId) return;
    try {
      const res = await authFetch(`/api/courses/${state.courseId}/translations/unit-status`);
      if (res.ok) setUnitStatus(await res.json());
    } catch {
      // Silently ignore
    }
  }, [state.courseId]);

  useEffect(() => {
    if (!fetchedRef.current && state.courseId) {
      fetchedRef.current = true;
      fetchUnitStatus();
    }
  }, [state.courseId, fetchUnitStatus]);

  // Refresh status after every save completes
  const wasSavingRef = useRef(false);
  useEffect(() => {
    if (wasSavingRef.current && !state.isSaving) {
      fetchUnitStatus();
    }
    wasSavingRef.current = state.isSaving;
  }, [state.isSaving, fetchUnitStatus]);

  const translateUnit = useCallback(async (scope: string, scopeId?: string) => {
    if (!state.courseId) return;
    setTranslatingId(scopeId ?? "cover");
    try {
      if (state.isDirty) await save();
      const res = await authFetch(
        `/api/courses/${state.courseId}/translations/translate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scope, scopeId }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        console.error("Translation failed:", data?.error);
      }
      await fetchUnitStatus();
    } catch (err) {
      console.error("Translation error:", err);
    } finally {
      setTranslatingId(null);
    }
  }, [state.courseId, state.isDirty, save, fetchUnitStatus]);

  const translationCtx: TranslationStatusCtx = {
    status: unitStatus,
    translatingId,
    translateUnit,
  };

  return (
    <TranslationStatusContext.Provider value={translationCtx}>
    <div className="w-72 bg-background border-r flex flex-col shrink-0 min-h-0">
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
          "mx-3 mt-3 p-2 rounded-sm cursor-pointer transition-colors flex items-center gap-2",
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
      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2">
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
            {state.structure.map((mod, mi) => (
              <ModuleItem
                key={mod.id}
                module={mod}
                moduleIndex={mi}
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
      </div>
    </div>
    </TranslationStatusContext.Provider>
  );
}
