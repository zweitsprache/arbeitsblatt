import { del } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function DELETE(
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

    try {
      await del(pdf.blobPath);
    } catch (blobError) {
      console.error("[library/delete] Blob deletion error:", blobError);
    }

    await prisma.brandLibraryPDF.delete({
      where: { id: pdfId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[library/delete] Error:", error);
    return NextResponse.json(
      { error: "Failed to delete PDF" },
      { status: 500 }
    );
  }
}
