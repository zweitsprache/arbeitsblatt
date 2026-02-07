import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/folders — list all folders (optionally filtered by parentId)
export async function GET(req: NextRequest) {
  const parentId = req.nextUrl.searchParams.get("parentId");

  const folders = await prisma.folder.findMany({
    where: {
      parentId: parentId || null,
    },
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          children: true,
          worksheets: true,
        },
      },
    },
  });

  return NextResponse.json(folders);
}

// POST /api/folders — create a new folder
export async function POST(req: NextRequest) {
  const body = await req.json();

  const folder = await prisma.folder.create({
    data: {
      name: body.name || "New Folder",
      parentId: body.parentId || null,
    },
    include: {
      _count: {
        select: {
          children: true,
          worksheets: true,
        },
      },
    },
  });

  return NextResponse.json(folder);
}
