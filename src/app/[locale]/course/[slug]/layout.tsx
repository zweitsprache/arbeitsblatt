import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import {
  CourseModule,
  CourseSettings,
  DEFAULT_COURSE_SETTINGS,
  collectLinkedWorksheetIds,
  normalizeCourseStructure,
} from "@/types/course";
import { WorksheetBlock, WorksheetSettings, DEFAULT_SETTINGS } from "@/types/worksheet";
import { CourseProvider } from "@/components/viewer/course-context";
import { CourseShell } from "@/components/viewer/course-shell";

export default async function CourseLayout({
  children,
  params,
}: {
  children: React.ReactNode;
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

  const linkedWorksheetIds = collectLinkedWorksheetIds(structure);

  const worksheetsData =
    linkedWorksheetIds.length > 0
      ? await prisma.worksheet.findMany({
          where: { id: { in: linkedWorksheetIds } },
        })
      : [];

  const worksheets: Record<string, {
    id: string;
    title: string;
    slug: string;
    blocks: WorksheetBlock[];
    settings: WorksheetSettings;
  }> = {};

  for (const ws of worksheetsData) {
    worksheets[ws.id] = {
      id: ws.id,
      title: ws.title,
      slug: ws.slug,
      blocks: ws.blocks as unknown as WorksheetBlock[],
      settings: {
        ...DEFAULT_SETTINGS,
        ...(ws.settings as unknown as Partial<WorksheetSettings>),
      },
    };
  }

  const settings: CourseSettings = {
    ...DEFAULT_COURSE_SETTINGS,
    ...(course.settings as unknown as Partial<CourseSettings>),
  };

  return (
    <CourseProvider
      value={{
        slug,
        title: course.title,
        description: settings.description,
        languageLevel: settings.languageLevel,
        image: settings.image,
        brand: settings.brand || "edoomio",
        sidebarTheme: settings.sidebarTheme || "dark",
        structure,
        worksheets,
      }}
    >
      <CourseShell>{children}</CourseShell>
    </CourseProvider>
  );
}
