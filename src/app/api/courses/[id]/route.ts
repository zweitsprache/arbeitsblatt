import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";
import {
  CourseModule,
  collectWorksheetIds,
  PopulatedCourseModule,
} from "@/types/course";

// GET /api/courses/[id]
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

  // Populate worksheet data for each lesson
  const structure = course.structure as unknown as CourseModule[];
  const allWorksheetIds = collectWorksheetIds(structure);

  const worksheets = await prisma.worksheet.findMany({
    where: { id: { in: allWorksheetIds }, userId },
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

  return NextResponse.json({
    ...course,
    structure: populatedStructure,
  });
}

// PUT /api/courses/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  const { id } = await params;
  const body = await req.json();

  // Verify ownership
  const existing = await prisma.course.findUnique({
    where: { id, userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.structure !== undefined) data.structure = body.structure;
  if (body.coverSettings !== undefined) data.coverSettings = body.coverSettings;
  if (body.settings !== undefined) data.settings = body.settings;
  if (body.published !== undefined) data.published = body.published;
  if (body.folderId !== undefined) data.folderId = body.folderId || null;

  // Invalidate cached thumbnail when content changes
  if (body.structure !== undefined || body.settings !== undefined || body.coverSettings !== undefined) {
    data.thumbnail = null;
  }

  const course = await prisma.course.update({
    where: { id },
    data,
  });

  return NextResponse.json(course);
}

// DELETE /api/courses/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  const { id } = await params;

  // Verify ownership
  const existing = await prisma.course.findUnique({
    where: { id, userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.course.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
