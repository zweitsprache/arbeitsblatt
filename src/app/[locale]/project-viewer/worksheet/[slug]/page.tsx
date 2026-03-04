import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import {
  WorksheetBlock,
  WorksheetSettings,
  DEFAULT_SETTINGS,
} from "@/types/worksheet";
import { WorksheetViewer } from "@/components/viewer/worksheet-viewer";

export default async function ProjectWorksheetPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const headersList = await headers();
  const projectSlug = headersList.get("x-project-slug");
  if (!projectSlug) notFound();

  // Verify project exists
  const project = await prisma.project.findUnique({
    where: { slug: projectSlug },
  });
  if (!project) notFound();

  // Find worksheet by slug
  const worksheet = await prisma.worksheet.findUnique({ where: { slug } });
  if (!worksheet || !worksheet.published) notFound();

  // Verify worksheet is assigned to this project
  const assignment = await prisma.projectContent.findUnique({
    where: {
      projectId_contentType_contentId: {
        projectId: project.id,
        contentType: "WORKSHEET",
        contentId: worksheet.id,
      },
    },
  });
  if (!assignment) notFound();

  const blocks = worksheet.blocks as unknown as WorksheetBlock[];
  const settings = {
    ...DEFAULT_SETTINGS,
    ...(worksheet.settings as unknown as Partial<WorksheetSettings>),
  };

  return (
    <WorksheetViewer
      title={worksheet.title}
      blocks={blocks}
      settings={settings}
      mode="online"
      worksheetId={worksheet.id}
    />
  );
}
