import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";
import { EBookChapter } from "@/types/ebook";

// GET /api/ebooks/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  const { id } = await params;
  const ebook = await prisma.eBook.findUnique({
    where: { id, userId },
  });
  if (!ebook) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Populate worksheet data for each chapter
  const chapters = ebook.chapters as unknown as EBookChapter[];
  const allWorksheetIds = chapters.flatMap((ch) => ch.worksheetIds);
  
  const worksheets = await prisma.worksheet.findMany({
    where: { id: { in: allWorksheetIds }, userId },
    select: { id: true, title: true, slug: true },
  });
  
  const worksheetMap = new Map(worksheets.map((w) => [w.id, w]));
  
  const populatedChapters = chapters.map((chapter) => ({
    id: chapter.id,
    title: chapter.title,
    worksheets: chapter.worksheetIds
      .map((wId) => worksheetMap.get(wId))
      .filter(Boolean),
  }));

  return NextResponse.json({
    ...ebook,
    chapters: populatedChapters,
  });
}

// PUT /api/ebooks/[id]
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
  const existing = await prisma.eBook.findUnique({
    where: { id, userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.chapters !== undefined) data.chapters = body.chapters;
  if (body.coverSettings !== undefined) data.coverSettings = body.coverSettings;
  if (body.settings !== undefined) data.settings = body.settings;
  if (body.published !== undefined) data.published = body.published;
  if (body.folderId !== undefined) data.folderId = body.folderId || null;

  const ebook = await prisma.eBook.update({
    where: { id },
    data,
  });

  return NextResponse.json(ebook);
}

// DELETE /api/ebooks/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  const { id } = await params;

  // Verify ownership
  const existing = await prisma.eBook.findUnique({
    where: { id, userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.eBook.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
