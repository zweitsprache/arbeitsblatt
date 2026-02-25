import { prisma } from "@/lib/prisma";
import { CourseEditor } from "@/components/course-editor/course-editor";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  CourseDocument,
  CourseModule,
  CourseCoverSettings,
  CourseSettings,
  DEFAULT_COURSE_SETTINGS,
  DEFAULT_COURSE_COVER_SETTINGS,
  normalizeCourseStructure,
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

  // Structure now contains blocks directly — normalize old data if needed
  const structure = normalizeCourseStructure(
    course.structure as unknown as CourseModule[]
  );

  const doc: CourseDocument = {
    id: course.id,
    title: course.title,
    slug: course.slug,
    structure,
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
