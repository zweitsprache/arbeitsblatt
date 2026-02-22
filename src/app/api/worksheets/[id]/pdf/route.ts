import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";
import { launchBrowser } from "@/lib/puppeteer";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { Brand } from "@/types/worksheet";

// POST /api/worksheets/[id]/pdf — generate PDF via Puppeteer (headless Chrome)
export async function POST(
  req: NextRequest,
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

  // Check if preview mode is requested
  let isPreview = false;
  try {
    const body = await req.json();
    isPreview = body?.preview === true;
  } catch {
    // No body or invalid JSON — not a preview
  }

  const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : (process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000");

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

    const browser = await launchBrowser();

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

    // For preview mode: rasterize each page, blur the bottom-right triangle, reassemble as image-based PDF
    if (isPreview) {
      console.log(`[PDF] Applying preview blur...`);

      const sourcePdf = await PDFDocument.load(finalPdfBytes);
      const pageCount = sourcePdf.getPageCount();
      const previewPdf = await PDFDocument.create();

      // Get page dimensions from the source PDF
      const firstPage = sourcePdf.getPage(0);
      const { width: pdfW, height: pdfH } = firstPage.getSize();

      // Use a proper viewport width for the print page (matching CSS expectations)
      // A4 at 96 DPI = 794px wide. Use 2x device scale for crisp images.
      const viewportW = 794;
      const viewportH = Math.round(viewportW * (pdfH / pdfW));
      const deviceScale = 2;

      await page.setViewport({ width: viewportW, height: viewportH, deviceScaleFactor: deviceScale });

      // Navigate to the print page fresh for screenshot
      await page.goto(printUrl, { waitUntil: "networkidle0", timeout: 30000 });
      await page.evaluateHandle("document.fonts.ready");
      await new Promise((r) => setTimeout(r, 500));

      // Hide Next.js dev overlays (error toast, build indicator, etc.)
      await page.evaluate(() => {
        document.querySelectorAll('nextjs-portal, [id^="__next-build"], [id^="__nextjs"]').forEach(el => el.remove());
        const style = document.createElement('style');
        style.textContent = 'nextjs-portal, [data-nextjs-dialog-overlay], [data-nextjs-toast] { display: none !important; }';
        document.head.appendChild(style);
      });

      // Take a full-page screenshot of the entire scrollable content
      const fullScreenshot = await page.screenshot({ type: "png", fullPage: true });

      const fullMeta = await sharp(fullScreenshot).metadata();
      const fullW = fullMeta.width!;
      const fullH = fullMeta.height!;

      console.log(`[PDF] Screenshot: ${fullW}x${fullH}, pages=${pageCount}`);

      // Each page slice height in pixels
      const pagePixelH = Math.round(fullH / pageCount);

      // Triangle top offset: 30mm from top of each page
      // At our resolution: 1mm = fullW / 210 pixels (A4 = 210mm wide)
      const mmToPx = fullW / 210;
      const triangleTopOffset = Math.round(30 * mmToPx);
      const blurRadius = 14;

      for (let i = 0; i < pageCount; i++) {
        const pageTop = i * pagePixelH;
        const extractH = Math.min(pagePixelH, fullH - pageTop);
        if (extractH <= 0) continue;

        // Extract this page's slice
        const pageImg = await sharp(fullScreenshot)
          .extract({ left: 0, top: pageTop, width: fullW, height: extractH })
          .toBuffer();

        // Create blurred version
        const blurredImg = await sharp(pageImg).blur(blurRadius).toBuffer();

        // Triangle mask SVG (white = blur visible area)
        const maskSvg = Buffer.from(
          `<svg width="${fullW}" height="${extractH}" xmlns="http://www.w3.org/2000/svg">
            <polygon points="${fullW},${triangleTopOffset} 0,${extractH} ${fullW},${extractH}" fill="white"/>
          </svg>`
        );
        const maskPng = await sharp(maskSvg).png().toBuffer();

        // Apply mask to blurred image
        const maskedBlur = await sharp(blurredImg)
          .composite([{ input: maskPng, blend: "dest-in" }])
          .png()
          .toBuffer();

        // Composite original + blurred triangle
        const composited = await sharp(pageImg)
          .composite([{ input: maskedBlur, blend: "over" }])
          .png()
          .toBuffer();

        // Embed into PDF
        const pngEmbed = await previewPdf.embedPng(composited);
        const pdfPage = previewPdf.addPage([pdfW, pdfH]);
        pdfPage.drawImage(pngEmbed, { x: 0, y: 0, width: pdfW, height: pdfH });
      }

      finalPdfBytes = await previewPdf.save();
      console.log(`[PDF] Preview PDF: ${pageCount} rasterized pages`);
    }

    await browser.close();

    console.log(`[PDF] Generated ${finalPdfBytes.length} bytes`);

    // Sanitize filename for Content-Disposition header (ASCII-safe)
    const safeTitle = worksheet.title
      .replace(/[\u2013\u2014]/g, "-")  // en-dash, em-dash → hyphen
      .replace(/[^\x20-\x7E]/g, "_");  // any other non-ASCII → underscore

    return new NextResponse(Buffer.from(finalPdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeTitle}${isPreview ? ' (Preview)' : ''}.pdf"`,
        "X-Preview": isPreview ? "true" : "false",
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
