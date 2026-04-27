import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";
import { requireAuth } from "@/lib/auth/require-auth";
import { CreateCollectionRequest, UpdateCollectionRequest } from "@/types/collection";

// GET /api/collections — list user's collections
export async function GET(req: NextRequest) {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  const search = req.nextUrl.searchParams.get("search");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { userId };

  if (search) {
    where.title = { contains: search, mode: "insensitive" };
  }

  const collections = await prisma.flashcardCollection.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      sets: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          worksheetId: true,
          order: true,
          addedAt: true,
        },
      },
    },
  });

  return NextResponse.json(collections);
}

// POST /api/collections — create new collection
export async function POST(req: NextRequest) {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  try {
    const body: CreateCollectionRequest = await req.json();

    if (!body.title || !body.title.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const slug = nanoid(12);

    const collection = await prisma.flashcardCollection.create({
      data: {
        userId,
        slug,
        title: body.title.trim(),
        description: body.description?.trim() || null,
        published: true,
      },
      include: {
        sets: {
          orderBy: { order: "asc" },
        },
      },
    });

    return NextResponse.json(collection, { status: 201 });
  } catch (error) {
    console.error("POST /api/collections error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
