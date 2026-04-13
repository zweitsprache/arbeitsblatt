import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { FlashcardDashboard } from "@/components/dashboard/flashcard-dashboard";
import { setRequestLocale } from "next-intl/server";

export default async function KartenpaarePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <DashboardLayout>
      <FlashcardDashboard
        worksheetType="kartenpaare"
        editorBasePath="/editor/kartenpaare"
      />
    </DashboardLayout>
  );
}
