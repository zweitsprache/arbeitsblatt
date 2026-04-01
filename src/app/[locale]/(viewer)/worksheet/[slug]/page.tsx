import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { WorksheetBlock, WorksheetSettings, DEFAULT_SETTINGS } from "@/types/worksheet";
import { WorksheetViewer } from "@/components/viewer/worksheet-viewer";

export default async function PublicWorksheetPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const worksheet = await prisma.worksheet.findUnique({ where: { slug } });

  if (!worksheet || !worksheet.published) {
    notFound();
  }

  const blocks = worksheet.blocks as unknown as WorksheetBlock[];
  const settings = {
    ...DEFAULT_SETTINGS,
    ...(worksheet.settings as unknown as Partial<WorksheetSettings>),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const translations = ((worksheet as any).translations ?? {}) as Record<string, Record<string, string>>;
  // Strip internal _source key before passing to viewer
  const { _source: _ignored, ...displayTranslations } = translations;

  return (
    <WorksheetViewer
      title={worksheet.title}
      blocks={blocks}
      settings={settings}
      mode="online"
      worksheetId={worksheet.id}
      translations={Object.keys(displayTranslations).length > 0 ? displayTranslations : undefined}
    />
  );
}
