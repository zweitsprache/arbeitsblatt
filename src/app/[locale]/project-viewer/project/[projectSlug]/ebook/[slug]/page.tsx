import { headers } from "next/headers";
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

export default async function ProjectEBookPage({
  params,
}: {
  params: Promise<{ locale: string; projectSlug: string; slug: string }>;
}) {
  const { locale, projectSlug, slug } = await params;
  setRequestLocale(locale);

  const headersList = await headers();
  const clientSlug = headersList.get("x-client-slug");
  if (!clientSlug) notFound();

  const project = await prisma.project.findFirst({
    where: { slug: projectSlug, client: { slug: clientSlug } },
  });
  if (!project) notFound();

  const ebook = await prisma.eBook.findUnique({ where: { slug } });
  if (!ebook || !ebook.published) notFound();

  const assignment = await prisma.projectContent.findUnique({
    where: {
      projectId_contentType_contentId: {
        projectId: project.id,
        contentType: "EBOOK",
        contentId: ebook.id,
      },
    },
  });
  if (!assignment) notFound();

  const chapters = ebook.chapters as unknown as EBookChapter[];
  const coverSettings = {
    ...DEFAULT_EBOOK_COVER_SETTINGS,
    ...(ebook.coverSettings as unknown as Partial<EBookCoverSettings>),
  };
  const settings = {
    ...DEFAULT_EBOOK_SETTINGS,
    ...(ebook.settings as unknown as Partial<EBookSettings>),
  };

  const allItemIds = chapters.flatMap((chapter) => chapter.worksheetIds);
  const itemsData = await prisma.worksheet.findMany({
    where: { id: { in: allItemIds } },
    select: { id: true, type: true, title: true, slug: true },
  });
  const itemMap = new Map(itemsData.map((item) => [item.id, item]));

  const populatedChapters = chapters.map((chapter) => ({
    id: chapter.id,
    title: chapter.title,
    items: chapter.worksheetIds
      .map((worksheetId) => {
        const item = itemMap.get(worksheetId);
        return item
          ? {
              id: item.id,
              title: item.title,
              slug: item.slug,
              type: (item.type || "worksheet") as EBookContentType,
            }
          : null;
      })
      .filter(
        (
          item
        ): item is {
          id: string;
          title: string;
          slug: string;
          type: EBookContentType;
        } => !!item
      ),
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
