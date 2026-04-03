import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";
import { DEFAULT_PRESENTATION_SETTINGS } from "@/types/presentation";
import { requireAuth } from "@/lib/auth/require-auth";

// GET /api/presentations — list presentations
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

  const presentations = await prisma.presentation.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      published: true,
      blocks: true,
      settings: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return NextResponse.json(presentations);
}

// POST /api/presentations — create a new presentation
export async function POST(req: NextRequest) {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  try {
    const body = await req.json();
    const slug = nanoid(10);

    const presentation = await prisma.presentation.create({
      data: {
        title: body.title || "Untitled Presentation",
        slug,
        blocks: body.blocks || [],
        settings: body.settings || DEFAULT_PRESENTATION_SETTINGS,
        published: body.published || false,
        userId,
      },
    });

    return NextResponse.json(presentation);
  } catch (error) {
    console.error("POST /api/presentations error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
