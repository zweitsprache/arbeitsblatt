import { WorksheetEditorV3 } from "@/components/editor/worksheet-editor-v3";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { setRequestLocale } from "next-intl/server";

export default async function NewEditorV3Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <DashboardLayout>
      <WorksheetEditorV3 />
    </DashboardLayout>
  );
}
