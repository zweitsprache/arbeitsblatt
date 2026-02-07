import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";
import { DEFAULT_SETTINGS } from "@/types/worksheet";

// GET /api/worksheets — list all worksheets
export async function GET() {
  const worksheets = await prisma.worksheet.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      published: true,
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
