"use client";

import React, { useEffect } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CourseProvider, useCourse } from "@/store/course-store";
import { CourseTreeSidebar } from "./course-tree-sidebar";
import { CourseContent } from "./course-content";
import { CourseSettingsPanel } from "./course-settings-panel";
import { CourseToolbar } from "./course-toolbar";
import { PopulatedCourseDocument } from "@/types/course";

function EditorInner({
  initialData,
}: {
  initialData?: PopulatedCourseDocument | null;
}) {
  const { dispatch, save } = useCourse();

  // Load initial data
  useEffect(() => {
    if (initialData) {
      dispatch({
        type: "LOAD_COURSE",
        payload: {
          id: initialData.id,
          title: initialData.title,
          slug: initialData.slug,
          structure: initialData.structure,
          coverSettings: initialData.coverSettings,
          settings: initialData.settings,
          published: initialData.published,
        },
      });
    }
  }, [initialData, dispatch]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [save]);

  return (
    <div className="h-full flex flex-col">
      <CourseToolbar />
      <div className="flex flex-1 min-h-0 overflow-hidden bg-muted/30">
        <CourseTreeSidebar />
        <CourseContent />
        <CourseSettingsPanel />
      </div>
    </div>
  );
}

export function CourseEditor({
  initialData,
}: {
  initialData?: PopulatedCourseDocument | null;
}) {
  return (
    <TooltipProvider>
      <CourseProvider>
        <EditorInner initialData={initialData} />
      </CourseProvider>
    </TooltipProvider>
  );
}
