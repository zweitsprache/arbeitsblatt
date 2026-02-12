import { prisma } from "@/lib/prisma";
import { CardEditor } from "@/components/card-editor/card-editor";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  CardDocument,
  CardItem,
  CardSettings,
  DEFAULT_CARD_SETTINGS,
} from "@/types/card";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function EditCardsPage({
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

  if (!worksheet || worksheet.type !== "cards") {
    notFound();
  }

  const doc: CardDocument = {
    id: worksheet.id,
    title: worksheet.title,
    description: worksheet.description,
    slug: worksheet.slug,
    cards: worksheet.blocks as unknown as CardItem[],
    settings: {
      ...DEFAULT_CARD_SETTINGS,
      ...(worksheet.settings as object),
    } as CardSettings,
    published: worksheet.published,
    createdAt: worksheet.createdAt.toISOString(),
    updatedAt: worksheet.updatedAt.toISOString(),
  };

  return (
    <DashboardLayout>
      <CardEditor initialData={doc} />
    </DashboardLayout>
  );
}
