import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/ai-tools/[id]/public — fetch published tool metadata (fields only)
// Used by the viewer block to render the form without exposing the prompt template
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const tool = await prisma.aiTool.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      fields: true,
      published: true,
    },
  });

  if (!tool || !tool.published) {
    return NextResponse.json({ error: "Tool not found or not published" }, { status: 404 });
  }

  return NextResponse.json(tool);
}
