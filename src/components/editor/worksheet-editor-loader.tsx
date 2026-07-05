"use client";

import dynamic from "next/dynamic";
import type { BrandProfile, WorksheetDocument } from "@/types/worksheet";

const WorksheetEditor = dynamic(
  () => import("@/components/editor/worksheet-editor").then((m) => m.WorksheetEditor),
  { ssr: false },
);

export function WorksheetEditorLoader({
  initialData,
  initialBrandProfile,
}: {
  initialData?: WorksheetDocument | null;
  initialBrandProfile?: BrandProfile | null;
}) {
  return <WorksheetEditor initialData={initialData} initialBrandProfile={initialBrandProfile} />;
}
