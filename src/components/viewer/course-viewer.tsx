"use client";

import React, { useState } from "react";
import {
  WorksheetBlock,
  WorksheetSettings,
  DEFAULT_SETTINGS,
} from "@/types/worksheet";
import {
  PopulatedCourseModule,
  PopulatedCourseTopic,
  PopulatedCourseLesson,
} from "@/types/course";
import { ViewerBlockRenderer } from "./viewer-block-renderer";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  ChevronDown,
  BookOpen,
  Layers,
  FileText,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface WorksheetData {
  id: string;
  title: string;
  slug: string;
  blocks: WorksheetBlock[];
  settings: WorksheetSettings;
}

interface CourseViewerProps {
  title: string;
  structure: PopulatedCourseModule[];
  worksheets: Map<string, WorksheetData>;
}

// Flatten all lessons for prev/next navigation
function flattenLessons(
  structure: PopulatedCourseModule[]
): { moduleId: string; topicId: string; lesson: PopulatedCourseLesson }[] {
  const flat: { moduleId: string; topicId: string; lesson: PopulatedCourseLesson }[] = [];
  for (const mod of structure) {
    for (const topic of mod.topics) {
      for (const lesson of topic.lessons) {
        flat.push({ moduleId: mod.id, topicId: topic.id, lesson });
      }
    }
  }
  return flat;
}

export function CourseViewer({ title, structure, worksheets }: CourseViewerProps) {
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    () => new Set(structure.map((m) => m.id))
  );
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(
    () => new Set(structure.flatMap((m) => m.topics.map((t) => t.id)))
  );
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const flatLessons = flattenLessons(structure);
  const currentIndex = flatLessons.findIndex((f) => f.lesson.id === selectedLessonId);
  const currentFlat = currentIndex >= 0 ? flatLessons[currentIndex] : null;
  const prevLesson = currentIndex > 0 ? flatLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < flatLessons.length - 1 ? flatLessons[currentIndex + 1] : null;

  // Get current worksheet data
  const currentWorksheet = currentFlat?.lesson.worksheet
    ? worksheets.get(currentFlat.lesson.worksheet.id)
    : null;

  const toggleModule = (id: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleTopic = (id: string) => {
    setExpandedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-muted/30 flex">
      {/* Sidebar */}
      {sidebarOpen && (
        <div className="w-72 bg-background border-r flex flex-col shrink-0 sticky top-0 h-screen">
          <div className="p-4 border-b">
            <h1 className="font-bold text-lg truncate">{title}</h1>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2">
              {structure.map((mod) => (
                <div key={mod.id} className="mb-1">
                  {/* Module */}
                  <button
                    className="flex items-center gap-2 w-full px-2 py-2 rounded-md hover:bg-muted transition-colors text-left"
                    onClick={() => toggleModule(mod.id)}
                  >
                    {expandedModules.has(mod.id) ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium truncate">{mod.title}</span>
                  </button>

                  {expandedModules.has(mod.id) && (
                    <div className="ml-2">
                      {mod.topics.map((topic) => (
                        <div key={topic.id}>
                          {/* Topic */}
                          <button
                            className="flex items-center gap-1.5 w-full pl-4 pr-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors text-left"
                            onClick={() => toggleTopic(topic.id)}
                          >
                            {expandedTopics.has(topic.id) ? (
                              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            )}
                            <Layers className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-xs font-medium truncate">{topic.title}</span>
                          </button>

                          {expandedTopics.has(topic.id) && (
                            <div>
                              {topic.lessons.map((lesson) => (
                                <button
                                  key={lesson.id}
                                  className={cn(
                                    "flex items-center gap-2 w-full pl-10 pr-2 py-1.5 rounded-md transition-colors text-left",
                                    selectedLessonId === lesson.id
                                      ? "bg-primary/10 text-primary"
                                      : "hover:bg-muted/50"
                                  )}
                                  onClick={() => setSelectedLessonId(lesson.id)}
                                >
                                  <FileText className="h-3.5 w-3.5 shrink-0" />
                                  <span className="text-xs truncate">{lesson.title}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Toggle sidebar button */}
      <button
        className="sticky top-4 -ml-3 z-10 bg-background border rounded-full p-1 shadow-sm hover:bg-muted transition-colors self-start mt-4"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? (
          <ChevronLeft className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {!selectedLessonId ? (
          // Course overview
          <div className="max-w-3xl mx-auto py-12 px-6">
            <div className="bg-background rounded-xl shadow-sm border p-8">
              <h1 className="text-3xl font-bold mb-4">{title}</h1>
              <p className="text-muted-foreground mb-6">
                {structure.length} modules · {flatLessons.length} lessons
              </p>
              <div className="space-y-4">
                {structure.map((mod, i) => (
                  <div key={mod.id} className="border rounded-lg p-4">
                    <h2 className="font-semibold mb-2">
                      {i + 1}. {mod.title}
                    </h2>
                    <div className="space-y-1">
                      {mod.topics.map((topic) => (
                        <div key={topic.id} className="pl-4">
                          <p className="text-sm text-muted-foreground">
                            {topic.title} — {topic.lessons.length} lesson(s)
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : currentWorksheet ? (
          // Lesson content
          <div className="max-w-3xl mx-auto py-8 px-6">
            {/* Breadcrumb */}
            {currentFlat && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-4">
                <span>{structure.find((m) => m.id === currentFlat.moduleId)?.title}</span>
                <ChevronRight className="h-3 w-3" />
                <span>
                  {structure
                    .find((m) => m.id === currentFlat.moduleId)
                    ?.topics.find((t) => t.id === currentFlat.topicId)?.title}
                </span>
              </div>
            )}

            <div className="bg-background rounded-xl shadow-sm border p-8">
              <h2 className="text-2xl font-bold mb-6">
                {currentFlat?.lesson.title}
              </h2>
              <div className="space-y-4">
                {currentWorksheet.blocks.map((block) => (
                  <ViewerBlockRenderer
                    key={block.id}
                    block={block}
                    mode="online"
                  />
                ))}
                {currentWorksheet.blocks.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">
                    No content available for this lesson.
                  </p>
                )}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6">
              {prevLesson ? (
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => setSelectedLessonId(prevLesson.lesson.id)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  {prevLesson.lesson.title}
                </Button>
              ) : (
                <div />
              )}
              {nextLesson ? (
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => setSelectedLessonId(nextLesson.lesson.id)}
                >
                  {nextLesson.lesson.title}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <div />
              )}
            </div>
          </div>
        ) : (
          // Lesson selected but no worksheet
          <div className="max-w-3xl mx-auto py-12 px-6">
            <div className="bg-background rounded-xl shadow-sm border p-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">
                {currentFlat?.lesson.title}
              </h2>
              <p className="text-muted-foreground">
                No content available for this lesson yet.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
