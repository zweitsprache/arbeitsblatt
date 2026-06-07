import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: brandId } = await params;

  try {
    const brand = await prisma.brandProfile.findUnique({
      where: { id: brandId },
    });

    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    const tags = await prisma.brandLibraryTag.findMany({
      where: { brandProfileId: brandId },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ tags });
  } catch (error) {
    console.error("[library/tags] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tags" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAdmin();
  if (result instanceof NextResponse) return result;

  const { id: brandId } = await params;

  try {
    const { name } = await req.json();

    if (!name) {
      return NextResponse.json(
        { error: "Tag name is required" },
        { status: 400 }
      );
    }

    const brand = await prisma.brandProfile.findUnique({
      where: { id: brandId },
    });

    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    const existing = await prisma.brandLibraryTag.findFirst({
      where: {
        brandProfileId: brandId,
        name,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A tag with this name already exists" },
        { status: 409 }
      );
    }

    const tag = await prisma.brandLibraryTag.create({
      data: {
        brandProfileId: brandId,
        name,
      },
    });

    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    console.error("[library/tags] POST error:", error);
    return NextResponse.json(
      { error: "Failed to create tag" },
      { status: 500 }
    );
  }
}
