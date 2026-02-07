import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";
import { DEFAULT_SETTINGS } from "@/types/worksheet";

// GET /api/worksheets — list worksheets (optionally filtered by folderId or search)
export async function GET(req: NextRequest) {
  const folderId = req.nextUrl.searchParams.get("folderId");
  const search = req.nextUrl.searchParams.get("search");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (search) {
    where.title = { contains: search, mode: "insensitive" };
  } else if (folderId === "root") {
    where.folderId = null;
  } else if (folderId) {
    where.folderId = folderId;
  }

  const worksheets = await prisma.worksheet.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      published: true,
      blocks: true,
      folderId: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return NextResponse.json(worksheets);
}

// POST /api/worksheets — create a new worksheet
export async function POST(req: NextRequest) {
  const body = await req.json();
  const slug = nanoid(10);

  const worksheet = await prisma.worksheet.create({
    data: {
      title: body.title || "Untitled Worksheet",
      slug,
      blocks: body.blocks || [],
      settings: body.settings || DEFAULT_SETTINGS,
      published: body.published || false,
      folderId: body.folderId || null,
    },
  });

  return NextResponse.json({
    id: worksheet.id,
    title: worksheet.title,
    slug: worksheet.slug,
    blocks: worksheet.blocks,
    settings: worksheet.settings,
    published: worksheet.published,
    createdAt: worksheet.createdAt,
    updatedAt: worksheet.updatedAt,
  });
}
