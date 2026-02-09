import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";

// GET /api/folders — list all folders (optionally filtered by parentId)
export async function GET(req: NextRequest) {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  const parentId = req.nextUrl.searchParams.get("parentId");

  const folders = await prisma.folder.findMany({
    where: {
      userId,
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
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  const body = await req.json();

  const folder = await prisma.folder.create({
    data: {
      name: body.name || "New Folder",
      parentId: body.parentId || null,
      userId,
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
