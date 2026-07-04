import { prisma } from "@/lib/prisma";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { WorksheetDocument, DEFAULT_SETTINGS, WorksheetBlock, WorksheetSettings } from "@/types/worksheet";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth/server";
import { WorksheetEditorV3Loader } from "@/components/editor/worksheet-editor-v3-loader";

export const dynamic = "force-dynamic";

export default async function EditWorksheetV3Page({
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
      <WorksheetEditorV3Loader initialData={doc} />
    </DashboardLayout>
  );
}
