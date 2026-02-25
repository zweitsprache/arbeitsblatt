import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";
import { requireAuth } from "@/lib/auth/require-auth";

// POST /api/courses/[id]/lesson-worksheet — create a worksheet for a lesson
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  const { id } = await params;

  // Verify course ownership
  const course = await prisma.course.findUnique({
    where: { id, userId },
  });
  if (!course) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const lessonTitle = body.lessonTitle || "Untitled Lesson";

  // Create a new worksheet for this lesson
  const worksheet = await prisma.worksheet.create({
    data: {
      type: "worksheet",
      title: lessonTitle,
      slug: nanoid(10),
      blocks: [],
      settings: {},
      userId,
    },
  });

  return NextResponse.json({
    id: worksheet.id,
    title: worksheet.title,
    slug: worksheet.slug,
  });
}
