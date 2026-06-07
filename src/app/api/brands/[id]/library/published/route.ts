import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
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

    const { searchParams } = new URL(req.url);
    const folderId = searchParams.get("folderId");
    const categoryId = searchParams.get("categoryId");
    const tagIds = searchParams.getAll("tagIds");
    const limit = parseInt(searchParams.get("limit") ?? "50", 10);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    const where: any = {
      brandProfileId: brandId,
      status: "approved",
    };

    if (folderId) where.folderId = folderId;
    if (categoryId) where.categoryId = categoryId;

    const pdfs = await prisma.brandLibraryPDF.findMany({
      where,
      include: {
        tags: { include: { tag: true } },
        category: true,
        folder: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    let filtered = pdfs;
    if (tagIds.length > 0) {
      filtered = pdfs.filter((pdf) =>
        tagIds.every((tagId) => pdf.tags.some((t) => t.tagId === tagId))
      );
    }

    const total = await prisma.brandLibraryPDF.count({
      where: {
        brandProfileId: brandId,
        status: "approved",
      },
    });

    return NextResponse.json({
      pdfs: filtered,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("[library/published] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch PDFs" },
      { status: 500 }
    );
  }
}
