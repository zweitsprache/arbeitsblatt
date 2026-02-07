import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/worksheets/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const worksheet = await prisma.worksheet.findUnique({ where: { id } });
  if (!worksheet) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(worksheet);
}

// PUT /api/worksheets/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const worksheet = await prisma.worksheet.update({
    where: { id },
    data: {
      title: body.title,
      blocks: body.blocks,
      settings: body.settings,
      published: body.published,
    },
  });

  return NextResponse.json(worksheet);
}

// DELETE /api/worksheets/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.worksheet.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
