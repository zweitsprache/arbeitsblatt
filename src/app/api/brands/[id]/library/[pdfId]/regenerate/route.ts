import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { generatePDFPreview } from "@/lib/pdf-preview";

export async function POST(
  req: NextRequest,
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

    if (!pdf.worksheetId) {
      return NextResponse.json(
        { error: "PDF has no associated worksheet" },
        { status: 400 }
      );
    }

    // Call the PDF generation endpoint
    const pdfGenerationRes = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/worksheets/${pdf.worksheetId}/pdf-v3`,
      { method: "POST" }
    );

    if (!pdfGenerationRes.ok) {
      throw new Error("Failed to generate PDF");
    }

    const pdfBlob = await pdfGenerationRes.blob();

    // Upload to Vercel Blob
    const { put } = await import("@vercel/blob");
    const blobResponse = await put(
      `library/${brandId}/${pdfId}_${Date.now()}.pdf`,
      pdfBlob,
      { access: "public" }
    );

    let previewImagePath: string | null = null;
    try {
      previewImagePath = await generatePDFPreview(pdfBlob, brandId, pdf.title);
    } catch (previewError) {
      console.error("[library/regenerate] Preview generation failed:", previewError);
    }

    // Delete old blob if it exists
    try {
      const { del } = await import("@vercel/blob");
      await del(pdf.blobPath);
    } catch (deleteError) {
      console.error("[library/regenerate] Failed to delete old blob:", deleteError);
    }

    // Update PDF record
    const updatedPdf = await prisma.brandLibraryPDF.update({
      where: { id: pdfId },
      data: {
        blobPath: blobResponse.url,
        previewImagePath: previewImagePath || pdf.previewImagePath,
        pdfGeneratedAt: new Date(),
        worksheetUpdatedAt: new Date(),
      },
      include: {
        tags: { include: { tag: true } },
        category: true,
      },
    });

    return NextResponse.json(updatedPdf);
  } catch (error) {
    console.error("[library/regenerate] Error:", error);
    return NextResponse.json(
      { error: "Failed to regenerate PDF" },
      { status: 500 }
    );
  }
}
