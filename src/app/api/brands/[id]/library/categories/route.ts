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

    const categories = await prisma.brandLibraryCategory.findMany({
      where: { brandProfileId: brandId },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error("[library/categories] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
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
        { error: "Category name is required" },
        { status: 400 }
      );
    }

    const brand = await prisma.brandProfile.findUnique({
      where: { id: brandId },
    });

    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    const existing = await prisma.brandLibraryCategory.findFirst({
      where: {
        brandProfileId: brandId,
        name,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A category with this name already exists" },
        { status: 409 }
      );
    }

    const category = await prisma.brandLibraryCategory.create({
      data: {
        brandProfileId: brandId,
        name,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("[library/categories] POST error:", error);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    );
  }
}
