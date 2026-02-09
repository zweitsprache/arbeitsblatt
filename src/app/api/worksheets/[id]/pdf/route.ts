import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";
import puppeteer from "puppeteer";
import { Brand } from "@/types/worksheet";

// POST /api/worksheets/[id]/pdf — generate PDF via Puppeteer (headless Chrome)
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  const { id } = await params;
  const worksheet = await prisma.worksheet.findFirst({
    where: { id, userId } as Parameters<typeof prisma.worksheet.findFirst>[0] extends { where?: infer W } ? W : never,
  });
  if (!worksheet) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  // Determine font based on brand
  const worksheetSettings = worksheet.settings as Record<string, unknown> | null;
  const brand = ((worksheetSettings?.brand as string) || "edoomio") as Brand;
  const defaultFont = brand === "lingostar" 
    ? "Encode Sans, sans-serif" 
    : "Asap Condensed, sans-serif";

  // Resolve settings with defaults
  const settings = {
    pageSize: "a4",
    orientation: "portrait",
    margins: { top: 20, right: 20, bottom: 20, left: 20 },
    showHeader: true,
    showFooter: true,
    headerText: "",
    footerText: "",
    fontSize: 14,
    fontFamily: defaultFont,
    ...worksheetSettings,
  };

  // Header/footer are now rendered as fixed CSS elements within the page content
  // The page loads Google Fonts directly and uses position:fixed for header/footer

  try {
    const printUrl = `${baseUrl}/de/worksheet/${worksheet.slug}/print`;
    console.log(`[PDF] Generating PDF for: ${printUrl}`);

    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--font-render-hinting=none",
      ],
    });

    const page = await browser.newPage();

    // Navigate to the print page and wait for all content + fonts to load
    await page.goto(printUrl, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    // Wait for web fonts to be fully loaded
    await page.evaluateHandle("document.fonts.ready");
    // Extra wait to ensure Google Fonts CDN stylesheet is fully processed
    await new Promise((r) => setTimeout(r, 500));

    console.log(`[PDF] Generating with brand=${brand}`);
    
    // Header/footer are now rendered as fixed elements within the page content
    // Using @page { margin: 0 } and position:fixed in the page CSS
    const pdfBuffer = await page.pdf({
      format: settings.pageSize === "a4" ? "A4" : "Letter",
      landscape: settings.orientation === "landscape",
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      printBackground: true,
      displayHeaderFooter: false,
      preferCSSPageSize: false,
    });

    await browser.close();

    console.log(`[PDF] Generated ${pdfBuffer.length} bytes`);

    return new NextResponse(Buffer.from(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${worksheet.title}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `PDF generation failed: ${message}` },
      { status: 500 }
    );
  }
}
