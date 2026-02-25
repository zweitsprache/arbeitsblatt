"use client";

import React, { useEffect } from "react";
import dynamic from "next/dynamic";
import { TooltipProvider } from "@/components/ui/tooltip";
import { EBookProvider, useEBook } from "@/store/ebook-store";
import { ChapterSidebar } from "./chapter-sidebar";
import { ChapterContent } from "./chapter-content";
import { EBookToolbar } from "./ebook-toolbar";
import { PopulatedEBookDocument } from "@/types/ebook";

// Dynamic import to avoid Radix Select SSR hydration mismatch (aria-controls IDs)
const EBookSettingsPanel = dynamic(
  () => import("./ebook-settings-panel").then((m) => m.EBookSettingsPanel),
  { ssr: false },
);

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
