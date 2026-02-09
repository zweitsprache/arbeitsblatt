import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";

// GET /api/folders/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  const { id } = await params;
  const folder = await prisma.folder.findUnique({
    where: { id, userId },
    include: {
      children: {
        orderBy: { name: "asc" },
        include: {
          _count: { select: { children: true, worksheets: true } },
        },
      },
      worksheets: {
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          title: true,
          slug: true,
          published: true,
          blocks: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      parent: {
        select: { id: true, name: true, parentId: true },
      },
    },
  });

  if (!folder) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(folder);
}

// PUT /api/folders/[id] — rename or move folder
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  const { id } = await params;

  // Verify ownership
  const existing = await prisma.folder.findUnique({
    where: { id, userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();

  const data: { name?: string; parentId?: string | null } = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.parentId !== undefined) data.parentId = body.parentId;

  const folder = await prisma.folder.update({
    where: { id },
    data,
    include: {
      _count: { select: { children: true, worksheets: true } },
    },
  });

  return NextResponse.json(folder);
}

// DELETE /api/folders/[id] — delete folder (cascades to subfolders)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  const { id } = await params;

  // Verify ownership
  const existing = await prisma.folder.findUnique({
    where: { id, userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.folder.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
