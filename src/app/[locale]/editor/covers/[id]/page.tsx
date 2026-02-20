import { prisma } from "@/lib/prisma";
import { CoverEditor } from "@/components/cover-editor/cover-editor";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  CoverDocument,
  CoverElement,
  CoverSettings,
  DEFAULT_COVER_SETTINGS,
} from "@/types/cover";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function EditCoverPage({
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

  if (!worksheet || worksheet.type !== "covers") {
    notFound();
  }

  const doc: CoverDocument = {
    id: worksheet.id,
    title: worksheet.title,
    description: worksheet.description,
    slug: worksheet.slug,
    elements: worksheet.blocks as unknown as CoverElement[],
    settings: {
      ...DEFAULT_COVER_SETTINGS,
      ...(worksheet.settings as unknown as Partial<CoverSettings>),
    },
    published: worksheet.published,
    createdAt: worksheet.createdAt.toISOString(),
    updatedAt: worksheet.updatedAt.toISOString(),
  };

  return (
    <DashboardLayout>
      <CoverEditor initialData={doc} />
    </DashboardLayout>
  );
}
