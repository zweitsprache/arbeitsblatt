import { FlashcardEditor } from "@/components/flashcard-editor/flashcard-editor";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { setRequestLocale } from "next-intl/server";

export default async function NewFlashcardsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <DashboardLayout>
      <FlashcardEditor />
    </DashboardLayout>
  );
}
