import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";

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

  // Structure now contains blocks directly on lessons — no population needed
  return NextResponse.json(course);
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
