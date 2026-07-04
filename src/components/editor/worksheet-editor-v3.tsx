"use client";

import type { WorksheetDocument } from "@/types/worksheet";
import { WorksheetEditor } from "./worksheet-editor";

export function WorksheetEditorV3({ initialData }: { initialData?: WorksheetDocument | null }) {
  return <WorksheetEditor initialData={initialData} editorVersion="v3" />;
}
