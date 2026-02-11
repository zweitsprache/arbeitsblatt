import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";
import { DEFAULT_EBOOK_SETTINGS, DEFAULT_EBOOK_COVER_SETTINGS } from "@/types/ebook";
import { requireAuth } from "@/lib/auth/require-auth";

// GET /api/ebooks — list ebooks (optionally filtered by folderId or search)
export async function GET(req: NextRequest) {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  const folderId = req.nextUrl.searchParams.get("folderId");
  const search = req.nextUrl.searchParams.get("search");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { userId };

  if (search) {
    where.title = { contains: search, mode: "insensitive" };
  } else if (folderId === "root") {
    where.folderId = null;
  } else if (folderId) {
    where.folderId = folderId;
  }

  const ebooks = await prisma.eBook.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      published: true,
      chapters: true,
      coverSettings: true,
      folderId: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return NextResponse.json(ebooks);
}

// POST /api/ebooks — create a new ebook
export async function POST(req: NextRequest) {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  const body = await req.json();
  const slug = nanoid(10);

  const ebook = await prisma.eBook.create({
    data: {
      title: body.title || "Untitled E-Book",
      slug,
      chapters: body.chapters || [],
      coverSettings: body.coverSettings || DEFAULT_EBOOK_COVER_SETTINGS,
      settings: body.settings || DEFAULT_EBOOK_SETTINGS,
      published: body.published || false,
      folderId: body.folderId || null,
      userId,
    },
  });

  return NextResponse.json({
    id: ebook.id,
    title: ebook.title,
    slug: ebook.slug,
    chapters: ebook.chapters,
    coverSettings: ebook.coverSettings,
    settings: ebook.settings,
    published: ebook.published,
    createdAt: ebook.createdAt,
    updatedAt: ebook.updatedAt,
  });
}
