import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { WorksheetBlock, WorksheetSettings, DEFAULT_SETTINGS } from "@/types/worksheet";
import {
  CourseModule,
  DEFAULT_COURSE_SETTINGS,
  DEFAULT_COURSE_COVER_SETTINGS,
  collectWorksheetIds,
  PopulatedCourseModule,
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

  const structure = course.structure as unknown as CourseModule[];
  const allWorksheetIds = collectWorksheetIds(structure);

  // Fetch all referenced worksheets
  const worksheetsData = await prisma.worksheet.findMany({
    where: { id: { in: allWorksheetIds } },
  });

  // Build worksheets map
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

  // Build populated structure
  const populatedStructure: PopulatedCourseModule[] = structure.map((mod) => ({
    id: mod.id,
    title: mod.title,
    topics: mod.topics.map((topic) => ({
      id: topic.id,
      title: topic.title,
      lessons: topic.lessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        worksheet: lesson.worksheetId
          ? (() => {
              const ws = worksheetsMap.get(lesson.worksheetId);
              return ws ? { id: ws.id, title: ws.title, slug: ws.slug } : null;
            })()
          : null,
      })),
    })),
  }));

  return (
    <CourseViewer
      title={course.title}
      structure={populatedStructure}
      worksheets={worksheetsMap}
    />
  );
}
