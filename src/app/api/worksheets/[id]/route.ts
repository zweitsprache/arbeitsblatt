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
  const worksheet = await prisma.worksheet.findUnique({
    where: { id, userId },
  });
  if (!worksheet) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
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
  const existing = await prisma.worksheet.findUnique({
    where: { id, userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
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
  const existing = await prisma.worksheet.findUnique({
    where: { id, userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.worksheet.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
