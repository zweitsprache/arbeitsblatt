import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";
import { launchBrowser } from "@/lib/puppeteer";
import { EBookSettings, DEFAULT_EBOOK_SETTINGS } from "@/types/ebook";
import { Brand, BRAND_FONTS } from "@/types/worksheet";

// GET /api/ebooks/[id]/pdf — generate PDF via Puppeteer (headless Chrome)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  const { id } = await params;
  const ebook = await prisma.eBook.findFirst({
    where: { id, userId },
  });
  if (!ebook) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : (process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000");

  // Resolve settings with defaults
  const ebookSettings = ebook.settings as Partial<EBookSettings> | null;
  const settings: EBookSettings = {
    ...DEFAULT_EBOOK_SETTINGS,
    ...ebookSettings,
  };

  // Determine font based on brand
  const brand = settings.brand as Brand;
  const brandFonts = BRAND_FONTS[brand] || BRAND_FONTS.edoomio;

  const pdfOptions = {
    format: (settings.pageSize === "a4" ? "A4" : "Letter") as "A4" | "Letter",
    landscape: settings.orientation === "landscape",
    margin: { top: 0, right: 0, bottom: 0, left: 0 } as const,
    printBackground: true,
    displayHeaderFooter: false,
    preferCSSPageSize: false,
  };

  try {
    const printUrl = `${baseUrl}/de/ebook/${ebook.slug}/print`;
    console.log(`[E-Book PDF] Generating PDF for: ${printUrl}`);

    const browser = await launchBrowser();

    const page = await browser.newPage();

    // Navigate to the print page and wait for all content + fonts to load
    await page.goto(printUrl, {
      waitUntil: "networkidle0",
      timeout: 60000, // E-books may take longer
    });

    // Wait for web fonts to be fully loaded
    await page.evaluateHandle("document.fonts.ready");
    await new Promise((r) => setTimeout(r, 1000));

    // Generate PDF
    const pdfBuffer = await page.pdf(pdfOptions);
    const finalPdfBytes = new Uint8Array(pdfBuffer);

    await browser.close();

    console.log(`[E-Book PDF] Generated ${finalPdfBytes.length} bytes`);

    // Sanitize filename for Content-Disposition header (ASCII-safe)
    const safeTitle = ebook.title
      .replace(/[\u2013\u2014]/g, "-")
      .replace(/[^\x20-\x7E]/g, "_");

    return new NextResponse(Buffer.from(finalPdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeTitle}.pdf"`,
      },
    });
  } catch (error) {
    console.error("E-Book PDF generation error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `PDF generation failed: ${message}` },
      { status: 500 }
    );
  }
}
