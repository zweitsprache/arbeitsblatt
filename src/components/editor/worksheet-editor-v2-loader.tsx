"use client";

import dynamic from "next/dynamic";
import type { WorksheetDocument } from "@/types/worksheet";

const WorksheetEditorV2 = dynamic(
  () => import("@/components/editor/worksheet-editor-v2").then((m) => m.WorksheetEditorV2),
  { ssr: false },
);

export function WorksheetEditorV2Loader({ initialData }: { initialData?: WorksheetDocument | null }) {
  return <WorksheetEditorV2 initialData={initialData} />;
}
