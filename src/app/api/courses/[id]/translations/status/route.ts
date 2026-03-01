import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";
import { extractTranslatableStrings } from "@/lib/course-translation";
import {
  CourseModule,
  CourseCoverSettings,
  CourseSettings,
  CourseTranslation,
} from "@/types/course";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  const { id } = await params;
  const course = await prisma.course.findUnique({
    where: { id, userId },
  });
  if (!course) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const doc = {
    id: course.id,
    title: course.title,
    slug: course.slug,
    structure: course.structure as unknown as CourseModule[],
    coverSettings: course.coverSettings as unknown as CourseCoverSettings,
    settings: course.settings as unknown as CourseSettings,
    published: course.published,
    createdAt: course.createdAt.toISOString(),
    updatedAt: course.updatedAt.toISOString(),
    folderId: course.folderId,
    userId: course.userId,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const courseAny = course as any;

  const strings = extractTranslatableStrings(doc);
  const translations = (courseAny.translations ?? {}) as Record<
    string,
    CourseTranslation
  >;
  const translatedAt = courseAny.translatedAt
    ? (courseAny.translatedAt as Date).toISOString()
    : null;

  return NextResponse.json({
    hasTranslations: Object.keys(translations).length > 0,
    languages: Object.keys(translations),
    translatedAt,
    stringCount: Object.keys(strings).length,
    namespace: courseAny.i18nexusNamespace ?? null,
  });
}
