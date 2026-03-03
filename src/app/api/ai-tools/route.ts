import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";
import { requireAuth } from "@/lib/auth/require-auth";
import { DEFAULT_AI_TOOL_SETTINGS } from "@/types/ai-tool";

// GET /api/ai-tools — list user's AI tools
export async function GET(req: NextRequest) {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  const search = req.nextUrl.searchParams.get("search");
  const publishedOnly = req.nextUrl.searchParams.get("published");

  const where: Record<string, unknown> = {};

  // If publishedOnly is requested, don't filter by userId (for block dropdown)
  if (publishedOnly === "true") {
    where.published = true;
    where.userId = userId;
  } else {
    where.userId = userId;
  }

  if (search) {
    where.title = { contains: search, mode: "insensitive" };
  }

  const tools = await prisma.aiTool.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      fields: true,
      promptTemplate: true,
      settings: true,
      published: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(tools);
}

// POST /api/ai-tools — create a new AI tool
export async function POST(req: NextRequest) {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  try {
    const body = await req.json();
    const slug = nanoid(10);

    const tool = await prisma.aiTool.create({
      data: {
        title: body.title || "Untitled AI Tool",
        slug,
        description: body.description || null,
        fields: body.fields || [],
        promptTemplate: body.promptTemplate || "",
        settings: body.settings || DEFAULT_AI_TOOL_SETTINGS,
        published: false,
        userId,
      },
    });

    return NextResponse.json({
      id: tool.id,
      title: tool.title,
      slug: tool.slug,
      description: tool.description,
      fields: tool.fields,
      promptTemplate: tool.promptTemplate,
      settings: tool.settings,
      published: tool.published,
      createdAt: tool.createdAt,
      updatedAt: tool.updatedAt,
    });
  } catch (error) {
    console.error("POST /api/ai-tools error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
