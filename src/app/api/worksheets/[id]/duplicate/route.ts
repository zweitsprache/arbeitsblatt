import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";
import { requireAuth } from "@/lib/auth/require-auth";

// POST /api/worksheets/[id]/duplicate
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  const { id } = await params;

  const existing = await prisma.worksheet.findUnique({
    where: { id, userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const slug = nanoid(10);

  const duplicate = await prisma.worksheet.create({
    data: {
      type: existing.type,
      title: `${existing.title} (Copy)`,
      slug,
      blocks: existing.blocks as never,
      settings: existing.settings as never,
      published: false,
      folderId: existing.folderId,
      userId,
    },
  });

  return NextResponse.json({
    id: duplicate.id,
    type: duplicate.type,
    title: duplicate.title,
    slug: duplicate.slug,
    published: duplicate.published,
    createdAt: duplicate.createdAt,
    updatedAt: duplicate.updatedAt,
  });
}
