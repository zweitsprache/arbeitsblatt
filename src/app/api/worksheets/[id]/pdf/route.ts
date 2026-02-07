import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/worksheets/[id]/pdf — generate PDF via DocRaptor
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const worksheet = await prisma.worksheet.findUnique({ where: { id } });
  if (!worksheet) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const apiKey = process.env.DOCRAPTOR_API_KEY;
  if (!apiKey || apiKey === "YOUR_DOCRAPTOR_API_KEY") {
    return NextResponse.json(
      { error: "DocRaptor API key not configured" },
      { status: 500 }
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  try {
    const response = await fetch("https://docraptor.com/docs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_credentials: apiKey,
        doc: {
          name: `${worksheet.title}.pdf`,
          document_type: "pdf",
          document_url: `${baseUrl}/worksheet/${worksheet.slug}/print`,
          prince_options: {
            media: "print",
            baseurl: baseUrl,
          },
          test: process.env.NODE_ENV !== "production",
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error }, { status: response.status });
    }

    const pdfBuffer = await response.arrayBuffer();
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${worksheet.title}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: "PDF generation failed" },
      { status: 500 }
    );
  }
}
