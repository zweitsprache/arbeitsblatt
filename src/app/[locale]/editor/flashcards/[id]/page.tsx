import { prisma } from "@/lib/prisma";
import { FlashcardEditor } from "@/components/flashcard-editor/flashcard-editor";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  FlashcardDocument,
  FlashcardItem,
  FlashcardSettings,
  DEFAULT_FLASHCARD_SETTINGS,
} from "@/types/flashcard";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function EditFlashcardsPage({
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

  const worksheet = await prisma.worksheet.findUnique({
    where: { id, userId: session.user.id },
  });

  if (!worksheet || worksheet.type !== "flashcards") {
    notFound();
  }

  const doc: FlashcardDocument = {
    id: worksheet.id,
    title: worksheet.title,
    description: worksheet.description,
    slug: worksheet.slug,
    cards: worksheet.blocks as unknown as FlashcardItem[],
    settings: {
      ...DEFAULT_FLASHCARD_SETTINGS,
      ...(worksheet.settings as unknown as Partial<FlashcardSettings>),
    },
    published: worksheet.published,
    createdAt: worksheet.createdAt.toISOString(),
    updatedAt: worksheet.updatedAt.toISOString(),
  };

  return (
    <DashboardLayout>
      <FlashcardEditor initialData={doc} />
    </DashboardLayout>
  );
}
