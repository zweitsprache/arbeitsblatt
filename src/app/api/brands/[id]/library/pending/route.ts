import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAdmin();
  if (result instanceof NextResponse) return result;

  const { id: brandId } = await params;

  try {
    const brand = await prisma.brandProfile.findUnique({
      where: { id: brandId },
    });

    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    const pdfs = await prisma.brandLibraryPDF.findMany({
      where: {
        brandProfileId: brandId,
        status: "pending_approval",
      },
      include: {
        tags: { include: { tag: true } },
        category: true,
        folder: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ pdfs });
  } catch (error) {
    console.error("[library/pending] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch pending PDFs" },
      { status: 500 }
    );
  }
}
