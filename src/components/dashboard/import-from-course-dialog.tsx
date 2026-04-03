"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { v4 as uuidv4 } from "uuid";
import { authFetch } from "@/lib/auth-fetch";
import { deepCloneBlocksWithNewIds } from "@/lib/block-utils";
import { normalizeCourseStructure, CourseModule, CourseTopic } from "@/types/course";
import { WorksheetBlock } from "@/types/worksheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, BookOpen, Loader2, Search } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────

interface CourseListItem {
  id: string;
  title: string;
  structure: CourseModule[];
}

interface ImportFromCourseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ─── Component ───────────────────────────────────────────────

export function ImportFromCourseDialog({
  open,
  onOpenChange,
}: ImportFromCourseDialogProps) {
  const t = useTranslations("dashboard");
  const router = useRouter();

  // Step
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1: courses
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [courseSearch, setCourseSearch] = useState("");

  // Step 2: lesson selection + options
  const [selectedCourse, setSelectedCourse] = useState<CourseListItem | null>(null);
  const [selectedLessonIds, setSelectedLessonIds] = useState<Set<string>>(new Set());
  const [worksheetTitle, setWorksheetTitle] = useState("");
  const [addHeadings, setAddHeadings] = useState(true);
  const [creating, setCreating] = useState(false);

  // Load courses when dialog opens
  useEffect(() => {
    if (!open) return;
    setLoadingCourses(true);
    authFetch("/api/courses")
      .then((res) => res.json())
      .then((data: CourseListItem[]) => {
        const normalised = data.map((c) => ({
          ...c,
          structure: normalizeCourseStructure(c.structure ?? []),
        }));
        setCourses(normalised);
      })
      .catch(console.error)
      .finally(() => setLoadingCourses(false));
  }, [open]);

  // Reset state on close
  function handleOpenChange(val: boolean) {
    if (!val) {
      setStep(1);
      setSelectedCourse(null);
      setSelectedLessonIds(new Set());
      setWorksheetTitle("");
      setCourseSearch("");
    }
    onOpenChange(val);
  }

  // Step 1 → Step 2
  function pickCourse(course: CourseListItem) {
    setSelectedCourse(course);
    setWorksheetTitle(course.title);
    setSelectedLessonIds(new Set());
    setStep(2);
  }

  function toggleLesson(lessonId: string) {
    setSelectedLessonIds((prev) => {
      const next = new Set(prev);
      if (next.has(lessonId)) next.delete(lessonId);
      else next.add(lessonId);
      return next;
    });
  }

  function toggleTopic(topic: CourseTopic, allSelected: boolean) {
    setSelectedLessonIds((prev) => {
      const next = new Set(prev);
      for (const lesson of topic.lessons) {
        if (allSelected) next.delete(lesson.id);
        else next.add(lesson.id);
      }
      return next;
    });
  }

  async function handleCreate() {
    if (!selectedCourse || selectedLessonIds.size === 0 || creating) return;
    setCreating(true);

    try {
      const mergedBlocks: WorksheetBlock[] = [];

      for (const mod of selectedCourse.structure) {
        for (const topic of mod.topics) {
          for (const lesson of topic.lessons) {
            if (!selectedLessonIds.has(lesson.id)) continue;

            if (addHeadings) {
              mergedBlocks.push({
                id: uuidv4(),
                type: "heading",
                content: lesson.title,
                level: 2,
                visibility: "both",
              } as WorksheetBlock);
            }

            mergedBlocks.push(...deepCloneBlocksWithNewIds(lesson.blocks ?? []));
          }
        }
      }

      const res = await authFetch("/api/worksheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: worksheetTitle.trim() || selectedCourse.title,
          blocks: mergedBlocks,
        }),
      });

      const data = await res.json();
      handleOpenChange(false);
      router.push(`/editor/${data.id}`);
    } catch (err) {
      console.error("Failed to create worksheet from course:", err);
    } finally {
      setCreating(false);
    }
  }

  const filteredCourses = courses.filter((c) =>
    c.title.toLowerCase().includes(courseSearch.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {/* ── Step 1: Pick a course ── */}
        {step === 1 && (
          <>
            <DialogHeader>
              <DialogTitle>{t("importFromCourseTitle")}</DialogTitle>
              <DialogDescription>{t("importSelectCourse")}</DialogDescription>
            </DialogHeader>

            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder={t("importSearchCourses")}
                value={courseSearch}
                onChange={(e) => setCourseSearch(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>

            <ScrollArea className="max-h-72 mt-1">
              {loadingCourses ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : filteredCourses.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">
                  {t("importNoCourses")}
                </p>
              ) : (
                <div className="space-y-1 pr-3">
                  {filteredCourses.map((course) => (
                    <button
                      key={course.id}
                      onClick={() => pickCourse(course)}
                      className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors text-sm"
                    >
                      <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="font-medium">{course.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </>
        )}

        {/* ── Step 2: Pick lessons ── */}
        {step === 2 && selectedCourse && (
          <>
            <DialogHeader>
              <DialogTitle>{selectedCourse.title}</DialogTitle>
              <DialogDescription>{t("importSelectLessons")}</DialogDescription>
            </DialogHeader>

            <ScrollArea className="max-h-64 mt-1">
              <div className="space-y-4 pr-3">
                {selectedCourse.structure.map((mod) => (
                  <div key={mod.id}>
                    {/* Module label */}
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 px-1">
                      {mod.title}
                    </p>

                    {mod.topics.map((topic) => {
                      const topicLessonIds = topic.lessons.map((l) => l.id);
                      const selectedCount = topicLessonIds.filter((id) =>
                        selectedLessonIds.has(id)
                      ).length;
                      const allSelected = selectedCount === topicLessonIds.length && topicLessonIds.length > 0;
                      const someSelected = selectedCount > 0 && !allSelected;

                      return (
                        <div key={topic.id} className="mb-2">
                          {/* Topic row — checkbox toggles all its lessons */}
                          <label className="flex items-center gap-2 py-1 px-1 rounded cursor-pointer hover:bg-muted/50 transition-colors">
                            <input
                              type="checkbox"
                              checked={allSelected}
                              ref={(el) => {
                                if (el) el.indeterminate = someSelected;
                              }}
                              onChange={() => toggleTopic(topic, allSelected)}
                              className="h-4 w-4 rounded border-border accent-primary"
                            />
                            <span className="text-sm font-medium">{topic.title}</span>
                          </label>

                          {/* Lesson rows */}
                          <div className="ml-6 space-y-0.5">
                            {topic.lessons.map((lesson) => (
                              <label
                                key={lesson.id}
                                className="flex items-center gap-2 py-0.5 px-1 rounded cursor-pointer hover:bg-muted/50 transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedLessonIds.has(lesson.id)}
                                  onChange={() => toggleLesson(lesson.id)}
                                  className="h-4 w-4 rounded border-border accent-primary"
                                />
                                <span className="text-sm text-muted-foreground">
                                  {lesson.title}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Options */}
            <div className="mt-3 space-y-3 border-t pt-3">
              <div>
                <Label htmlFor="ws-import-title" className="text-sm mb-1.5 block">
                  {t("importWorksheetTitle")}
                </Label>
                <Input
                  id="ws-import-title"
                  value={worksheetTitle}
                  onChange={(e) => setWorksheetTitle(e.target.value)}
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addHeadings}
                  onChange={(e) => setAddHeadings(e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-primary"
                />
                <span className="text-sm">{t("importAddLessonHeadings")}</span>
              </label>
              {selectedLessonIds.size > 0 && (
                <p className="text-xs text-muted-foreground">
                  {t("importLessonsSelected", { count: selectedLessonIds.size })}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between mt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep(1)}
                disabled={creating}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                {t("importBackToCourses")}
              </Button>
              <Button
                onClick={handleCreate}
                disabled={selectedLessonIds.size === 0 || creating}
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t("importCreating")}
                  </>
                ) : (
                  t("importCreate")
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
