import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";
import { extractTranslatableStrings } from "@/lib/course-translation";
import {
  CourseModule,
  CourseCoverSettings,
  CourseSettings,
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
    Record<string, string>
  >;
  const translatedAt = courseAny.translatedAt
    ? (courseAny.translatedAt as Date).toISOString()
    : null;

  const langKeys = Object.keys(translations).filter((k) => !k.startsWith("_"));

  return NextResponse.json({
    hasTranslations: langKeys.length > 0,
    languages: langKeys,
    translatedAt,
    stringCount: Object.keys(strings).length,
  });
}
