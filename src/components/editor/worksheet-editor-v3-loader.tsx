"use client";

import dynamic from "next/dynamic";
import type { BrandProfile, WorksheetDocument } from "@/types/worksheet";

const WorksheetEditorV3 = dynamic(
  () => import("@/components/editor/worksheet-editor-v3").then((m) => m.WorksheetEditorV3),
  { ssr: false },
);

export function WorksheetEditorV3Loader({
  initialData,
  initialBrandProfile,
}: {
  initialData?: WorksheetDocument | null;
  initialBrandProfile?: BrandProfile | null;
}) {
  return <WorksheetEditorV3 initialData={initialData} initialBrandProfile={initialBrandProfile} />;
}
