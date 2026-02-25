import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { WorksheetBlock, WorksheetSettings, DEFAULT_SETTINGS } from "@/types/worksheet";
import {
  CourseModule,
  DEFAULT_COURSE_SETTINGS,
  DEFAULT_COURSE_COVER_SETTINGS,
  collectLinkedWorksheetIds,
  normalizeCourseStructure,
} from "@/types/course";
import { CourseViewer } from "@/components/viewer/course-viewer";

export default async function CoursePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const course = await prisma.course.findUnique({ where: { slug } });

  if (!course || !course.published) {
    notFound();
  }

  const structure = normalizeCourseStructure(
    course.structure as unknown as CourseModule[]
  );

  // Collect worksheet IDs referenced by linked-blocks blocks
  const linkedWorksheetIds = collectLinkedWorksheetIds(structure);

  // Fetch all referenced worksheets for linked-blocks resolution
  const worksheetsData = linkedWorksheetIds.length > 0
    ? await prisma.worksheet.findMany({
        where: { id: { in: linkedWorksheetIds } },
      })
    : [];

  // Build worksheets map for linked-blocks resolution
  const worksheetsMap = new Map(
    worksheetsData.map((ws) => [
      ws.id,
      {
        id: ws.id,
        title: ws.title,
        slug: ws.slug,
        blocks: ws.blocks as unknown as WorksheetBlock[],
        settings: {
          ...DEFAULT_SETTINGS,
          ...(ws.settings as unknown as Partial<WorksheetSettings>),
        },
      },
    ])
  );

  const settings = course.settings as unknown as { languageLevel?: string; description?: string };

  return (
    <CourseViewer
      title={course.title}
      structure={structure}
      worksheets={worksheetsMap}
      languageLevel={settings.languageLevel}
      description={settings.description}
    />
  );
}
