import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";

// GET /api/worksheets/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  const { id } = await params;
  let worksheet = await prisma.worksheet.findFirst({
    where: {
      id,
      OR: [{ userId }, { userId: null }],
    },
  });
  if (!worksheet) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (worksheet.userId === null) {
    worksheet = await prisma.worksheet.update({
      where: { id },
      data: { userId },
    });
  }

  return NextResponse.json(worksheet);
}

// PUT /api/worksheets/[id]
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
  const existing = await prisma.worksheet.findFirst({
    where: {
      id,
      OR: [{ userId }, { userId: null }],
    },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (existing.userId === null) {
    await prisma.worksheet.update({
      where: { id },
      data: { userId },
    });
  }

  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.blocks !== undefined) data.blocks = body.blocks;
  if (body.settings !== undefined) data.settings = body.settings;
  if (body.published !== undefined) data.published = body.published;
  if (body.folderId !== undefined) data.folderId = body.folderId || null;

  // Invalidate cached thumbnail when content changes
  if (body.blocks !== undefined || body.settings !== undefined) {
    data.thumbnail = null;
  }

  const worksheet = await prisma.worksheet.update({
    where: { id },
    data,
  });

  return NextResponse.json(worksheet);
}

// DELETE /api/worksheets/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  const { id } = await params;

  // Verify ownership
  const existing = await prisma.worksheet.findFirst({
    where: {
      id,
      OR: [{ userId }, { userId: null }],
    },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (existing.userId === null) {
    await prisma.worksheet.update({
      where: { id },
      data: { userId },
    });
  }

  await prisma.worksheet.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
