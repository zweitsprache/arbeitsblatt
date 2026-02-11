"use client";

import React, { useEffect } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { EBookProvider, useEBook } from "@/store/ebook-store";
import { ChapterSidebar } from "./chapter-sidebar";
import { ChapterContent } from "./chapter-content";
import { EBookSettingsPanel } from "./ebook-settings-panel";
import { EBookToolbar } from "./ebook-toolbar";
import { PopulatedEBookDocument } from "@/types/ebook";

function EditorInner({
  initialData,
}: {
  initialData?: PopulatedEBookDocument | null;
}) {
  const { dispatch, save } = useEBook();

  // Load initial data
  useEffect(() => {
    if (initialData) {
      dispatch({
        type: "LOAD_EBOOK",
        payload: {
          id: initialData.id,
          title: initialData.title,
          slug: initialData.slug,
          chapters: initialData.chapters,
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
      <EBookToolbar />
      <div className="flex flex-1 min-h-0 overflow-hidden bg-muted/30">
        <ChapterSidebar />
        <ChapterContent />
        <EBookSettingsPanel />
      </div>
    </div>
  );
}

export function EBookEditor({
  initialData,
}: {
  initialData?: PopulatedEBookDocument | null;
}) {
  return (
    <TooltipProvider>
      <EBookProvider>
        <EditorInner initialData={initialData} />
      </EBookProvider>
    </TooltipProvider>
  );
}
