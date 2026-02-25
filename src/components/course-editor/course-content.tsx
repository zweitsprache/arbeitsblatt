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
  FileText,
  Search,
  X,
  ExternalLink,
  Loader2,
  BookOpen,
} from "lucide-react";
import { useCourse } from "@/store/course-store";
import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { authFetch } from "@/lib/auth-fetch";
import { Link } from "@/i18n/navigation";
import { CourseSettingsPanel } from "./course-settings-panel";

interface WorksheetItem {
  id: string;
  title: string;
  slug: string;
  blocks: unknown[];
  updatedAt: string;
}

export function CourseContent() {
  const t = useTranslations("course");
  const tc = useTranslations("common");
  const { state, dispatch, getSelectedLesson, getSelectedTopic, getSelectedModule, createLessonWorksheet } =
    useCourse();
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [availableWorksheets, setAvailableWorksheets] = useState<WorksheetItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [creatingWorksheet, setCreatingWorksheet] = useState(false);

  const selectedModule = getSelectedModule();
  const selectedTopic = getSelectedTopic();
  const selectedLesson = getSelectedLesson();

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

  const handleAddExistingWorksheet = (worksheet: WorksheetItem) => {
    if (!state.selectedModuleId || !state.selectedTopicId || !state.selectedLessonId) return;
    dispatch({
      type: "SET_LESSON_WORKSHEET",
      payload: {
        moduleId: state.selectedModuleId,
        topicId: state.selectedTopicId,
        lessonId: state.selectedLessonId,
        worksheet: { id: worksheet.id, title: worksheet.title, slug: worksheet.slug },
      },
    });
    setSelectorOpen(false);
  };

  const handleCreateWorksheet = async () => {
    if (!state.selectedModuleId || !state.selectedTopicId || !state.selectedLessonId || !selectedLesson) return;
    setCreatingWorksheet(true);
    try {
      await createLessonWorksheet(
        state.selectedModuleId,
        state.selectedTopicId,
        state.selectedLessonId,
        selectedLesson.title
      );
    } finally {
      setCreatingWorksheet(false);
    }
  };

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

  // Lesson selected — show content
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
            {selectedLesson.worksheet ? (
              <Link
                href={`/editor/${selectedLesson.worksheet.id}`}
                target="_blank"
              >
                <Button variant="outline" size="sm" className="gap-2">
                  <ExternalLink className="h-4 w-4" />
                  {t("editWorksheet")}
                </Button>
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 p-4">
        {selectedLesson.worksheet ? (
          // Lesson has a worksheet
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-background rounded-lg border">
              <FileText className="h-6 w-6 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium">{selectedLesson.worksheet.title}</p>
                <p className="text-xs text-muted-foreground">
                  /{selectedLesson.worksheet.slug}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/editor/${selectedLesson.worksheet.id}`}
                  target="_blank"
                >
                  <Button variant="outline" size="sm" className="gap-2">
                    <ExternalLink className="h-4 w-4" />
                    {t("editWorksheet")}
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    dispatch({
                      type: "SET_LESSON_WORKSHEET",
                      payload: {
                        moduleId: state.selectedModuleId!,
                        topicId: state.selectedTopicId!,
                        lessonId: state.selectedLessonId!,
                        worksheet: null,
                      },
                    });
                  }}
                >
                  {t("unlinkWorksheet")}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          // Lesson has no worksheet — show create/attach options
          <div className="text-center py-16">
            <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground mb-6">{t("noLessonContent")}</p>
            <div className="flex items-center justify-center gap-3">
              <Button
                className="gap-2"
                onClick={handleCreateWorksheet}
                disabled={creatingWorksheet}
              >
                {creatingWorksheet ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {t("createContent")}
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setSelectorOpen(true)}
              >
                <FileText className="h-4 w-4" />
                {t("linkExistingWorksheet")}
              </Button>
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
                    onClick={() => handleAddExistingWorksheet(worksheet)}
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
                      <Plus className="h-4 w-4" />
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
