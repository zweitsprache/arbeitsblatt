"use client";

import dynamic from "next/dynamic";
import type { WorksheetDocument } from "@/types/worksheet";

const WorksheetEditor = dynamic(
  () => import("@/components/editor/worksheet-editor").then((m) => m.WorksheetEditor),
  { ssr: false },
);

export function WorksheetEditorLoader({ initialData }: { initialData?: WorksheetDocument | null }) {
  return <WorksheetEditor initialData={initialData} />;
}
