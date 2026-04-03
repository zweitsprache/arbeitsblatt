import { prisma } from "@/lib/prisma";
import { PresentationEditor } from "@/components/presentation-editor/presentation-editor";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PresentationDocument, DEFAULT_PRESENTATION_SETTINGS, PresentationSettings } from "@/types/presentation";
import { WorksheetBlock } from "@/types/worksheet";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function EditPresentationPage({
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

  const presentation = await prisma.presentation.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!presentation) {
    notFound();
  }

  const doc: PresentationDocument = {
    id: presentation.id,
    title: presentation.title,
    slug: presentation.slug,
    blocks: presentation.blocks as unknown as WorksheetBlock[],
    settings: {
      ...DEFAULT_PRESENTATION_SETTINGS,
      ...(presentation.settings as unknown as Partial<PresentationSettings>),
    },
    published: presentation.published,
    createdAt: presentation.createdAt.toISOString(),
    updatedAt: presentation.updatedAt.toISOString(),
  };

  return (
    <DashboardLayout>
      <PresentationEditor initialData={doc} />
    </DashboardLayout>
  );
}
