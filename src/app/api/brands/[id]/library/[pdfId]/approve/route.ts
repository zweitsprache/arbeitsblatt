import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; pdfId: string }> }
) {
  const result = await requireAdmin();
  if (result instanceof NextResponse) return result;

  const { id: brandId, pdfId } = await params;

  try {
    const pdf = await prisma.brandLibraryPDF.findFirst({
      where: {
        id: pdfId,
        brandProfileId: brandId,
      },
    });

    if (!pdf) {
      return NextResponse.json({ error: "PDF not found" }, { status: 404 });
    }

    const updatedPdf = await prisma.brandLibraryPDF.update({
      where: { id: pdfId },
      data: {
        status: "approved",
        approvedBy: result.userId,
        approvedAt: new Date(),
      },
      include: {
        tags: { include: { tag: true } },
        category: true,
      },
    });

    return NextResponse.json(updatedPdf);
  } catch (error) {
    console.error("[library/approve] Error:", error);
    return NextResponse.json(
      { error: "Failed to approve PDF" },
      { status: 500 }
    );
  }
}
