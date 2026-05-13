import { WorksheetEditorV2 } from "@/components/editor/worksheet-editor-v2";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { setRequestLocale } from "next-intl/server";

export default async function NewEditorV2Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <DashboardLayout>
      <WorksheetEditorV2 />
    </DashboardLayout>
  );
}
