import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import {
  EBookChapter,
  EBookCoverSettings,
  EBookSettings,
  EBookContentType,
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

  // Fetch item metadata (title + type only for TOC display)
  const allItemIds = chapters.flatMap((ch) => ch.worksheetIds);
  const itemsData = await prisma.worksheet.findMany({
    where: { id: { in: allItemIds } },
    select: { id: true, type: true, title: true, slug: true },
  });
  const itemMap = new Map(itemsData.map((i) => [i.id, i]));

  // Build populated chapters
  const populatedChapters = chapters.map((chapter) => ({
    id: chapter.id,
    title: chapter.title,
    items: chapter.worksheetIds
      .map((wId) => {
        const item = itemMap.get(wId);
        return item
          ? { id: item.id, title: item.title, slug: item.slug, type: (item.type || "worksheet") as EBookContentType }
          : null;
      })
      .filter((w): w is { id: string; title: string; slug: string; type: EBookContentType } => !!w),
  }));

  return (
    <EBookViewer
      title={ebook.title}
      chapters={populatedChapters}
      coverSettings={coverSettings}
      settings={settings}
      mode="online"
    />
  );
}
