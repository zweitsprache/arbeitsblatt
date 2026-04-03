import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";

// GET /api/brands/[id]/sub-profiles — list sub-profiles for a brand
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const subProfiles = await prisma.brandSubProfile.findMany({
      where: { brandProfileId: id },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(subProfiles);
  } catch (err) {
    console.error("GET /api/brands/[id]/sub-profiles error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST /api/brands/[id]/sub-profiles — create a sub-profile (admin only)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const result = await requireAdmin();
  if (result instanceof NextResponse) return result;

  const { id } = await params;

  try {
    const body = await req.json();

    if (!body.name) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 },
      );
    }

    // Verify parent brand exists
    const brand = await prisma.brandProfile.findUnique({ where: { id } });
    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    const subProfile = await prisma.brandSubProfile.create({
      data: {
        name: body.name,
        brandProfileId: id,
        headerLeftV1: body.headerLeftV1 ?? "",
        headerRightV1: body.headerRightV1 ?? "",
        footerLeftV1: body.footerLeftV1 ?? "",
        footerRightV1: body.footerRightV1 ?? "",
        headerLeftV2: body.headerLeftV2 ?? "",
        headerRightV2: body.headerRightV2 ?? "",
        footerLeftV2: body.footerLeftV2 ?? "",
        footerRightV2: body.footerRightV2 ?? "",
      },
    });

    return NextResponse.json(subProfile, { status: 201 });
  } catch (err) {
    console.error("POST /api/brands/[id]/sub-profiles error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
