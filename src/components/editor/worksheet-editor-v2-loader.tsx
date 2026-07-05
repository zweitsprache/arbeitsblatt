"use client";

import dynamic from "next/dynamic";
import type { BrandProfile, WorksheetDocument } from "@/types/worksheet";

const WorksheetEditorV2 = dynamic(
  () => import("@/components/editor/worksheet-editor-v2").then((m) => m.WorksheetEditorV2),
  { ssr: false },
);

export function WorksheetEditorV2Loader({
  initialData,
  initialBrandProfile,
}: {
  initialData?: WorksheetDocument | null;
  initialBrandProfile?: BrandProfile | null;
}) {
  return <WorksheetEditorV2 initialData={initialData} initialBrandProfile={initialBrandProfile} />;
}
