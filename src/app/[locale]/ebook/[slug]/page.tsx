import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { WorksheetBlock, WorksheetSettings, DEFAULT_SETTINGS } from "@/types/worksheet";
import {
  EBookChapter,
  EBookCoverSettings,
  EBookSettings,
  DEFAULT_EBOOK_SETTINGS,
  DEFAULT_EBOOK_COVER_SETTINGS,
} from "@/types/ebook";
import { EBookViewer } from "@/components/viewer/ebook-viewer";

export default async function EBookPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  
  const ebook = await prisma.eBook.findUnique({ where: { slug } });

  if (!ebook || !ebook.published) {
    notFound();
  }

  const chapters = ebook.chapters as unknown as EBookChapter[];
  const coverSettings = {
    ...DEFAULT_EBOOK_COVER_SETTINGS,
    ...(ebook.coverSettings as unknown as Partial<EBookCoverSettings>),
  };
  const settings = {
    ...DEFAULT_EBOOK_SETTINGS,
    ...(ebook.settings as unknown as Partial<EBookSettings>),
  };

  // Fetch all worksheets referenced in chapters
  const allWorksheetIds = chapters.flatMap((ch) => ch.worksheetIds);
  const worksheetsData = await prisma.worksheet.findMany({
    where: { id: { in: allWorksheetIds } },
  });

  // Build worksheets map
  const worksheetsMap = new Map(
    worksheetsData.map((ws) => [
      ws.id,
      {
        id: ws.id,
        title: ws.title,
        slug: ws.slug,
        blocks: ws.blocks as unknown as WorksheetBlock[],
        settings: {
          ...DEFAULT_SETTINGS,
          ...(ws.settings as unknown as Partial<WorksheetSettings>),
        },
      },
    ])
  );

  // Build populated chapters
  const populatedChapters = chapters.map((chapter) => ({
    id: chapter.id,
    title: chapter.title,
    worksheets: chapter.worksheetIds
      .map((wId) => {
        const ws = worksheetsMap.get(wId);
        return ws ? { id: ws.id, title: ws.title, slug: ws.slug } : null;
      })
      .filter((w): w is { id: string; title: string; slug: string } => !!w),
  }));

  return (
    <EBookViewer
      title={ebook.title}
      chapters={populatedChapters}
      worksheets={worksheetsMap}
      coverSettings={coverSettings}
      settings={settings}
      mode="online"
    />
  );
}
