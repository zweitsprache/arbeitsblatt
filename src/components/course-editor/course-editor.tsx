"use client";

import React, { useEffect } from "react";
import dynamic from "next/dynamic";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CourseProvider, useCourse } from "@/store/course-store";
import { CourseTreeSidebar } from "./course-tree-sidebar";
import { CourseContent } from "./course-content";
import { CourseToolbar } from "./course-toolbar";
import { CourseStructureManager } from "./course-structure-manager";
import { CourseDocument } from "@/types/course";

// Dynamic import to avoid Radix Select SSR hydration mismatch (aria-controls IDs)
const CourseSettingsPanel = dynamic(
  () => import("./course-settings-panel").then((m) => m.CourseSettingsPanel),
  { ssr: false },
);

function EditorInner({
  initialData,
}: {
  initialData?: CourseDocument | null;
}) {
  const { state, dispatch, save } = useCourse();

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
        {state.view === "structure" ? (
          <CourseStructureManager />
        ) : (
          <>
            <CourseTreeSidebar />
            <CourseContent />
            {state.selectedModuleId === null && <CourseSettingsPanel />}
          </>
        )}
      </div>
    </div>
  );
}

export function CourseEditor({
  initialData,
}: {
  initialData?: CourseDocument | null;
}) {
  return (
    <TooltipProvider>
      <CourseProvider>
        <EditorInner initialData={initialData} />
      </CourseProvider>
    </TooltipProvider>
  );
}
