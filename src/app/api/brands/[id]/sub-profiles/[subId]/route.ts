import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";

// GET /api/brands/[id]/sub-profiles/[subId] — fetch a single sub-profile
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; subId: string }> },
) {
  const { subId } = await params;

  try {
    const subProfile = await prisma.brandSubProfile.findUnique({
      where: { id: subId },
    });
    if (!subProfile) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(subProfile);
  } catch (err) {
    console.error("GET /api/brands/[id]/sub-profiles/[subId] error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// PUT /api/brands/[id]/sub-profiles/[subId] — update a sub-profile (admin only)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; subId: string }> },
) {
  const result = await requireAdmin();
  if (result instanceof NextResponse) return result;

  const { subId } = await params;
  const body = await req.json();

  try {
    const subProfile = await prisma.brandSubProfile.update({
      where: { id: subId },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.headerLeftV1 !== undefined && { headerLeftV1: body.headerLeftV1 }),
        ...(body.headerRightV1 !== undefined && { headerRightV1: body.headerRightV1 }),
        ...(body.footerLeftV1 !== undefined && { footerLeftV1: body.footerLeftV1 }),
        ...(body.footerRightV1 !== undefined && { footerRightV1: body.footerRightV1 }),
        ...(body.headerLeftV2 !== undefined && { headerLeftV2: body.headerLeftV2 }),
        ...(body.headerRightV2 !== undefined && { headerRightV2: body.headerRightV2 }),
        ...(body.footerLeftV2 !== undefined && { footerLeftV2: body.footerLeftV2 }),
        ...(body.footerRightV2 !== undefined && { footerRightV2: body.footerRightV2 }),
      },
    });

    return NextResponse.json(subProfile);
  } catch (err) {
    console.error("PUT /api/brands/[id]/sub-profiles/[subId] error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// DELETE /api/brands/[id]/sub-profiles/[subId] — delete a sub-profile (admin only)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; subId: string }> },
) {
  const result = await requireAdmin();
  if (result instanceof NextResponse) return result;

  const { subId } = await params;

  try {
    await prisma.brandSubProfile.delete({ where: { id: subId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/brands/[id]/sub-profiles/[subId] error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
