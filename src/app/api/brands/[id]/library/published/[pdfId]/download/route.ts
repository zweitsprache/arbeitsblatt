import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; pdfId: string }> }
) {
  const { id: brandId, pdfId } = await params;

  try {
    const pdf = await prisma.brandLibraryPDF.findFirst({
      where: {
        id: pdfId,
        brandProfileId: brandId,
        status: "approved",
      },
    });

    if (!pdf) {
      return NextResponse.json(
        { error: "PDF not found or not approved" },
        { status: 404 }
      );
    }

    const response = new NextResponse(null, {
      status: 302,
      headers: {
        Location: `${pdf.blobPath}?download=${encodeURIComponent(pdf.title + ".pdf")}`,
      },
    });

    return response;
  } catch (error) {
    console.error("[library/download] GET error:", error);
    return NextResponse.json(
      { error: "Failed to download PDF" },
      { status: 500 }
    );
  }
}
