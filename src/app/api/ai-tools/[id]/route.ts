import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";

// GET /api/ai-tools/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  const { id } = await params;
  const tool = await prisma.aiTool.findUnique({
    where: { id, userId },
  });
  if (!tool) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(tool);
}

// PUT /api/ai-tools/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.aiTool.findUnique({
    where: { id, userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.description !== undefined) data.description = body.description;
  if (body.fields !== undefined) data.fields = body.fields;
  if (body.promptTemplate !== undefined) data.promptTemplate = body.promptTemplate;
  if (body.settings !== undefined) data.settings = body.settings;
  if (body.published !== undefined) data.published = body.published;

  const tool = await prisma.aiTool.update({
    where: { id },
    data,
  });

  return NextResponse.json(tool);
}

// DELETE /api/ai-tools/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  const { id } = await params;

  const existing = await prisma.aiTool.findUnique({
    where: { id, userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.aiTool.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
