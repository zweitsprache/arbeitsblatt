import { prisma } from "@/lib/prisma";
import { CourseEditor } from "@/components/course-editor/course-editor";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  PopulatedCourseDocument,
  CourseModule,
  CourseCoverSettings,
  CourseSettings,
  DEFAULT_COURSE_SETTINGS,
  DEFAULT_COURSE_COVER_SETTINGS,
  collectWorksheetIds,
  PopulatedCourseModule,
} from "@/types/course";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function EditCoursePage({
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

  const course = await prisma.course.findUnique({
    where: { id, userId: session.user.id },
  });

  if (!course) {
    notFound();
  }

  // Populate worksheet data for each lesson
  const structure = course.structure as unknown as CourseModule[];
  const allWorksheetIds = collectWorksheetIds(structure);

  const worksheets = await prisma.worksheet.findMany({
    where: { id: { in: allWorksheetIds }, userId: session.user.id },
    select: { id: true, title: true, slug: true },
  });

  const worksheetMap = new Map(worksheets.map((w) => [w.id, w]));

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
          ? worksheetMap.get(lesson.worksheetId) ?? null
          : null,
      })),
    })),
  }));

  const doc: PopulatedCourseDocument = {
    id: course.id,
    title: course.title,
    slug: course.slug,
    structure: populatedStructure,
    coverSettings: {
      ...DEFAULT_COURSE_COVER_SETTINGS,
      ...(course.coverSettings as Partial<CourseCoverSettings>),
    },
    settings: {
      ...DEFAULT_COURSE_SETTINGS,
      ...(course.settings as Partial<CourseSettings>),
    },
    published: course.published,
    createdAt: course.createdAt.toISOString(),
    updatedAt: course.updatedAt.toISOString(),
    folderId: course.folderId,
    userId: course.userId,
  };

  return (
    <DashboardLayout>
      <CourseEditor initialData={doc} />
    </DashboardLayout>
  );
}
