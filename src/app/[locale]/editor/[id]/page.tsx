import { prisma } from "@/lib/prisma";
import { WorksheetEditor } from "@/components/editor/worksheet-editor";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { WorksheetDocument, DEFAULT_SETTINGS, WorksheetBlock, WorksheetSettings } from "@/types/worksheet";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

export default async function EditWorksheetPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const worksheet = await prisma.worksheet.findUnique({ where: { id } });

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
