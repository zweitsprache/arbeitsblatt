import { prisma } from "@/lib/prisma";
import { WorksheetEditor } from "@/components/editor/worksheet-editor";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { WorksheetDocument, DEFAULT_SETTINGS, WorksheetBlock, WorksheetSettings } from "@/types/worksheet";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function EditWorksheetPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const { data: session } = await auth.getSession();
  if (!session?.user) {
    redirect(`/${locale}/auth/sign-in`);
  }

  const worksheet = await prisma.worksheet.findUnique({
    where: { id, userId: session.user.id },
  });

  if (!worksheet) {
    notFound();
  }

  const doc: WorksheetDocument = {
    id: worksheet.id,
    title: worksheet.title,
    description: worksheet.description,
    slug: worksheet.slug,
    blocks: worksheet.blocks as unknown as WorksheetBlock[],
    settings: {
      ...DEFAULT_SETTINGS,
      ...(worksheet.settings as unknown as Partial<WorksheetSettings>),
    },
    published: worksheet.published,
    createdAt: worksheet.createdAt.toISOString(),
    updatedAt: worksheet.updatedAt.toISOString(),
  };

  return (
    <DashboardLayout>
      <WorksheetEditor initialData={doc} />
    </DashboardLayout>
  );
}
