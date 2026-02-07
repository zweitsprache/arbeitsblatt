import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { WorksheetBlock, WorksheetSettings, DEFAULT_SETTINGS } from "@/types/worksheet";
import { WorksheetViewer } from "@/components/viewer/worksheet-viewer";

// This page is used by DocRaptor for PDF rendering
export default async function PrintWorksheetPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const worksheet = await prisma.worksheet.findUnique({ where: { slug } });

  if (!worksheet) {
    notFound();
  }

  const blocks = worksheet.blocks as unknown as WorksheetBlock[];
  const settings = {
    ...DEFAULT_SETTINGS,
    ...(worksheet.settings as unknown as Partial<WorksheetSettings>),
  };

  return (
    <WorksheetViewer
      title={worksheet.title}
      blocks={blocks}
      settings={settings}
      mode="print"
    />
  );
}
