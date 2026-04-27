import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";
import { DEFAULT_SETTINGS } from "@/types/worksheet";
import { requireAuth } from "@/lib/auth/require-auth";

// GET /api/worksheets — list worksheets (optionally filtered by folderId or search)
export async function GET(req: NextRequest) {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  try {
    const folderIdParam = req.nextUrl.searchParams.get("folderId");
    const searchParam = req.nextUrl.searchParams.get("search");
    const typeParam = req.nextUrl.searchParams.get("type");

    const hasFolderFilter = folderIdParam !== null;
    const folderId = folderIdParam?.trim() || null;
    const search = searchParam?.trim() || null;
    const type = typeParam?.trim() || null;

    // Claim legacy/unassigned worksheets so they reappear after DB recovery.
    await prisma.worksheet.updateMany({
      where: { userId: null },
      data: { userId },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { userId };

    // Filter by type (default to "worksheet" for backwards compatibility)
    where.type = type || "worksheet";

    if (search) {
      where.title = { contains: search, mode: "insensitive" };
    } else if (hasFolderFilter) {
      if (folderId === "root" || folderId === null) {
        where.folderId = null;
      } else {
        where.folderId = folderId;
      }
    }

    const worksheets = await prisma.worksheet.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        type: true,
        title: true,
        slug: true,
        published: true,
        blocks: true,
        settings: true,
        folderId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return NextResponse.json(worksheets);
  } catch (error) {
    console.error("GET /api/worksheets error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/worksheets — create a new worksheet
export async function POST(req: NextRequest) {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  try {
    const body = await req.json();
    const slug = nanoid(10);

    const worksheet = await prisma.worksheet.create({
      data: {
        type: body.type || "worksheet",
        title: body.title || (body.type === "flashcards" ? "Untitled Flashcards" : "Untitled Worksheet"),
        slug,
        blocks: body.blocks || [],
        settings: body.settings || DEFAULT_SETTINGS,
        published: body.published || false,
        folderId: body.folderId || null,
        userId,
      },
    });

    return NextResponse.json({
      id: worksheet.id,
      type: worksheet.type,
      title: worksheet.title,
      slug: worksheet.slug,
      blocks: worksheet.blocks,
      settings: worksheet.settings,
      published: worksheet.published,
      createdAt: worksheet.createdAt,
      updatedAt: worksheet.updatedAt,
    });
  } catch (error) {
    console.error("POST /api/worksheets error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
