"use client";

import type { BrandProfile, WorksheetDocument } from "@/types/worksheet";
import { WorksheetEditor } from "./worksheet-editor";

export function WorksheetEditorV2({
  initialData,
  initialBrandProfile,
}: {
  initialData?: WorksheetDocument | null;
  initialBrandProfile?: BrandProfile | null;
}) {
  return <WorksheetEditor initialData={initialData} initialBrandProfile={initialBrandProfile} editorVersion="v2" />;
}
