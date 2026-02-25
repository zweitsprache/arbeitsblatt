import { prisma } from "@/lib/prisma";
import { EBookEditor } from "@/components/ebook-editor/ebook-editor";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  PopulatedEBookDocument,
  EBookChapter,
  EBookCoverSettings,
  EBookSettings,
  DEFAULT_EBOOK_SETTINGS,
  DEFAULT_EBOOK_COVER_SETTINGS,
} from "@/types/ebook";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function EditEBookPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  let session;
  try {
    const result = await auth.getSession();
    session = result.data;
  } catch {
    redirect(`/${locale}/auth/sign-in`);
  }
  if (!session?.user) {
    redirect(`/${locale}/auth/sign-in`);
  }

  const ebook = await prisma.eBook.findUnique({
    where: { id, userId: session.user.id },
  });

  if (!ebook) {
    notFound();
  }

  // Populate worksheet data for each chapter
  const chapters = ebook.chapters as unknown as EBookChapter[];
  const allWorksheetIds = chapters.flatMap((ch) => ch.worksheetIds);

  const worksheets = await prisma.worksheet.findMany({
    where: { id: { in: allWorksheetIds }, userId: session.user.id },
    select: { id: true, title: true, slug: true, type: true },
  });

  const worksheetMap = new Map(worksheets.map((w) => [w.id, w]));

  const populatedChapters = chapters.map((chapter) => ({
    id: chapter.id,
    title: chapter.title,
    items: chapter.worksheetIds
      .map((wId) => {
        const w = worksheetMap.get(wId);
        return w ? { id: w.id, title: w.title, slug: w.slug, type: (w.type || "worksheet") as "worksheet" | "flashcards" | "cards" | "grammar-table" } : null;
      })
      .filter((w): w is NonNullable<typeof w> => !!w),
  }));

  const doc: PopulatedEBookDocument = {
    id: ebook.id,
    title: ebook.title,
    slug: ebook.slug,
    chapters: populatedChapters,
    coverSettings: {
      ...DEFAULT_EBOOK_COVER_SETTINGS,
      ...(ebook.coverSettings as Partial<EBookCoverSettings>),
    },
    settings: {
      ...DEFAULT_EBOOK_SETTINGS,
      ...(ebook.settings as Partial<EBookSettings>),
    },
    published: ebook.published,
    createdAt: ebook.createdAt.toISOString(),
    updatedAt: ebook.updatedAt.toISOString(),
    folderId: ebook.folderId,
    userId: ebook.userId,
  };

  return (
    <DashboardLayout>
      <EBookEditor initialData={doc} />
    </DashboardLayout>
  );
}
