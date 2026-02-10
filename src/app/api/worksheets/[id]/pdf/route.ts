import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";
import puppeteer from "puppeteer";
import { PDFDocument } from "pdf-lib";
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

  const pdfOptions = {
    format: (settings.pageSize === "a4" ? "A4" : "Letter") as "A4" | "Letter",
    landscape: settings.orientation === "landscape",
    margin: { top: 0, right: 0, bottom: 0, left: 0 } as const,
    printBackground: true,
    displayHeaderFooter: false,
    preferCSSPageSize: false,
  };

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
    await new Promise((r) => setTimeout(r, 500));

    // Check if page variables ({current_page} / {no_of_pages}) are used
    const hasPageVars = await page.evaluate(() => {
      return document.querySelectorAll('.var-current-page, .var-total-pages').length > 0;
    });

    console.log(`[PDF] brand=${brand}, hasPageVars=${hasPageVars}`);

    let finalPdfBytes: Uint8Array;

    if (!hasPageVars) {
      // Simple: no page variables, single-pass PDF
      const pdfBuffer = await page.pdf(pdfOptions);
      finalPdfBytes = new Uint8Array(pdfBuffer);
    } else {
      // Two-pass: first count pages, then generate per-page with correct page numbers

      // Pass 1: count pages
      const firstPassBuffer = await page.pdf(pdfOptions);
      const firstPassText = Buffer.from(firstPassBuffer).toString("latin1");
      const totalPages = (firstPassText.match(/\/Type\s*\/Page[^s]/g) || []).length;
      console.log(`[PDF] Detected ${totalPages} pages`);

      // Inject total pages into all .var-total-pages spans
      await page.evaluate((total) => {
        document.querySelectorAll('.var-total-pages').forEach((el) => {
          el.textContent = String(total);
        });
      }, totalPages);

      // Generate per-page PDFs with correct current page number
      const mergedPdf = await PDFDocument.create();

      for (let i = 1; i <= totalPages; i++) {
        // Set current page number
        await page.evaluate((pageNum) => {
          document.querySelectorAll('.var-current-page').forEach((el) => {
            el.textContent = String(pageNum);
          });
        }, i);

        // Generate single-page PDF
        const singlePageBuffer = await page.pdf({
          ...pdfOptions,
          pageRanges: String(i),
        });

        // Copy this page into the merged document
        const singlePageDoc = await PDFDocument.load(singlePageBuffer);
        const [copiedPage] = await mergedPdf.copyPages(singlePageDoc, [0]);
        mergedPdf.addPage(copiedPage);
      }

      finalPdfBytes = await mergedPdf.save();
      console.log(`[PDF] Merged ${totalPages} pages`);
    }

    await browser.close();

    console.log(`[PDF] Generated ${finalPdfBytes.length} bytes`);

    return new NextResponse(Buffer.from(finalPdfBytes), {
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
