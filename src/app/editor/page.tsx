import { WorksheetEditor } from "@/components/editor/worksheet-editor";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

export default function NewEditorPage() {
  return (
    <DashboardLayout>
      <WorksheetEditor />
    </DashboardLayout>
  );
}
