import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";
import puppeteerCore from "puppeteer-core";
import { launchBrowser } from "@/lib/puppeteer";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";

// POST /api/worksheets/[id]/pdf-v3 — generate PDF via Puppeteer (headless Chrome)
// Query params: locale=DE|CH|NEUTRAL, solutions=1
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  const { id } = await params;
  const locale = req.nextUrl.searchParams.get("locale") as "DE" | "CH" | "NEUTRAL" | null;
  const showSolutions = req.nextUrl.searchParams.get("solutions") === "1";
  const showBoth = req.nextUrl.searchParams.get("both") === "1";

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

  const pdfOptions = {
    format: "A4" as const,
    landscape: false,
    margin: { top: 0, right: 0, bottom: 0, left: 0 } as const,
    printBackground: true,
    displayHeaderFooter: false,
    preferCSSPageSize: false,
  };

  /**
   * Render a single print URL to PDF bytes using a Puppeteer page.
   * Handles page variable injection ({current_page} / {no_of_pages}).
   */
  async function renderPrintUrl(
    page: Awaited<ReturnType<Awaited<ReturnType<typeof puppeteerCore.launch>>["newPage"]>>,
    printUrl: string,
  ): Promise<Uint8Array> {
    await page.goto(printUrl, { waitUntil: "networkidle0", timeout: 30000 });
    await page.evaluateHandle("document.fonts.ready");
    await new Promise((r) => setTimeout(r, 500));

    const hasPageVars = await page.evaluate(() => {
      return document.querySelectorAll(".var-current-page, .var-total-pages").length > 0;
    });

    if (!hasPageVars) {
      const pdfBuffer = await page.pdf(pdfOptions);
      return new Uint8Array(pdfBuffer);
    }

    // Two-pass: first count pages, then generate per-page with correct page numbers
    const firstPassBuffer = await page.pdf(pdfOptions);
    const firstPassText = Buffer.from(firstPassBuffer).toString("latin1");
    const totalPages = (firstPassText.match(/\/Type\s*\/Page[^s]/g) || []).length;

    await page.evaluate((total) => {
      document.querySelectorAll(".var-total-pages").forEach((el) => {
        el.textContent = String(total);
      });
    }, totalPages);

    const mergedPdf = await PDFDocument.create();
    for (let i = 1; i <= totalPages; i++) {
      await page.evaluate((pageNum) => {
        document.querySelectorAll(".var-current-page").forEach((el) => {
          el.textContent = String(pageNum);
        });
      }, i);

      const singlePageBuffer = await page.pdf({ ...pdfOptions, pageRanges: String(i) });
      const singlePageDoc = await PDFDocument.load(singlePageBuffer);
      const [copiedPage] = await mergedPdf.copyPages(singlePageDoc, [0]);
      mergedPdf.addPage(copiedPage);
    }

    return await mergedPdf.save();
  }

  try {
    // Build print URL(s)
    const buildPrintUrl = (solutions: boolean) => {
      const printParams = new URLSearchParams();
      if (locale === "CH") printParams.set("ch", "1");
      if (solutions) printParams.set("solutions", "1");
      const qs = printParams.toString();
      return `${baseUrl}/de/worksheet/${worksheet.slug}/print${qs ? `?${qs}` : ""}`;
    };

    const browser = await launchBrowser();

    const page = await browser.newPage();

    let finalPdfBytes: Uint8Array;

    if (showBoth) {
      // Generate worksheet + solutions as a single PDF, each with independent page numbering
      const worksheetUrl = buildPrintUrl(false);
      const solutionsUrl = buildPrintUrl(true);

      console.log(`[PDF v3] Generating BOTH for: ${worksheetUrl} + ${solutionsUrl}`);

      const worksheetBytes = await renderPrintUrl(page, worksheetUrl);
      const solutionsBytes = await renderPrintUrl(page, solutionsUrl);

      // Merge into a single PDF
      const combinedPdf = await PDFDocument.create();
      const wsPdf = await PDFDocument.load(worksheetBytes);
      const solPdf = await PDFDocument.load(solutionsBytes);

      const wsPages = await combinedPdf.copyPages(wsPdf, wsPdf.getPageIndices());
      wsPages.forEach((p) => combinedPdf.addPage(p));

      const solPages = await combinedPdf.copyPages(solPdf, solPdf.getPageIndices());
      solPages.forEach((p) => combinedPdf.addPage(p));

      finalPdfBytes = await combinedPdf.save();
      console.log(`[PDF v3] Combined PDF: ${wsPdf.getPageCount()} worksheet + ${solPdf.getPageCount()} solution pages`);
    } else {
      const printUrl = buildPrintUrl(showSolutions);
      console.log(`[PDF v3] Generating PDF for: ${printUrl} (locale=${locale || "DE"}, solutions=${showSolutions})`);
      finalPdfBytes = await renderPrintUrl(page, printUrl);
    }

    // For preview mode: rasterize each page, blur the bottom-right triangle, reassemble
    if (isPreview) {
      console.log(`[PDF v3] Applying preview blur...`);

      const sourcePdf = await PDFDocument.load(finalPdfBytes);
      const pageCount = sourcePdf.getPageCount();
      const previewPdf = await PDFDocument.create();

      const firstPage = sourcePdf.getPage(0);
      const { width: pdfW, height: pdfH } = firstPage.getSize();

      const viewportW = 794;
      const viewportH = Math.round(viewportW * (pdfH / pdfW));
      const deviceScale = 2;

      await page.setViewport({ width: viewportW, height: viewportH, deviceScaleFactor: deviceScale });

      // Navigate to the print page fresh for screenshot (use worksheet version for preview)
      const previewUrl = buildPrintUrl(false);
      await page.goto(previewUrl, { waitUntil: "networkidle0", timeout: 30000 });
      await page.evaluateHandle("document.fonts.ready");
      await new Promise((r) => setTimeout(r, 500));

      // Hide Next.js dev overlays
      await page.evaluate(() => {
        document.querySelectorAll('nextjs-portal, [id^="__next-build"], [id^="__nextjs"]').forEach((el) => el.remove());
        const style = document.createElement("style");
        style.textContent =
          "nextjs-portal, [data-nextjs-dialog-overlay], [data-nextjs-toast] { display: none !important; }";
        document.head.appendChild(style);
      });

      // Take a full-page screenshot of the entire scrollable content
      const fullScreenshot = await page.screenshot({ type: "png", fullPage: true });

      const fullMeta = await sharp(fullScreenshot).metadata();
      const fullW = fullMeta.width!;
      const fullH = fullMeta.height!;

      console.log(`[PDF v3] Screenshot: ${fullW}x${fullH}, pages=${pageCount}`);

      const pagePixelH = Math.round(fullH / pageCount);
      const mmToPx = fullW / 210;
      const triangleTopOffset = Math.round(30 * mmToPx);
      const blurRadius = 14;

      for (let i = 0; i < pageCount; i++) {
        const pageTop = i * pagePixelH;
        const extractH = Math.min(pagePixelH, fullH - pageTop);
        if (extractH <= 0) continue;

        const pageImg = await sharp(fullScreenshot)
          .extract({ left: 0, top: pageTop, width: fullW, height: extractH })
          .toBuffer();

        const blurredImg = await sharp(pageImg).blur(blurRadius).toBuffer();

        const maskSvg = Buffer.from(
          `<svg width="${fullW}" height="${extractH}" xmlns="http://www.w3.org/2000/svg">
            <polygon points="${fullW},${triangleTopOffset} 0,${extractH} ${fullW},${extractH}" fill="white"/>
          </svg>`,
        );
        const maskPng = await sharp(maskSvg).png().toBuffer();

        const maskedBlur = await sharp(blurredImg)
          .composite([{ input: maskPng, blend: "dest-in" }])
          .png()
          .toBuffer();

        const composited = await sharp(pageImg)
          .composite([{ input: maskedBlur, blend: "over" }])
          .png()
          .toBuffer();

        const pngEmbed = await previewPdf.embedPng(composited);
        const pdfPage = previewPdf.addPage([pdfW, pdfH]);
        pdfPage.drawImage(pngEmbed, { x: 0, y: 0, width: pdfW, height: pdfH });
      }

      finalPdfBytes = await previewPdf.save();
      console.log(`[PDF v3] Preview PDF: ${pageCount} rasterized pages`);
    }

    await browser.close();

    console.log(`[PDF v3] Generated ${finalPdfBytes.length} bytes`);

    // Sanitize filename for Content-Disposition header (ASCII-safe)
    const safeTitle = worksheet.title
      .replace(/[\u2013\u2014]/g, "-")
      .replace(/[^\x20-\x7E]/g, "_");

    return new NextResponse(Buffer.from(finalPdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeTitle}${isPreview ? " (Preview)" : ""}.pdf"`,
        "X-Preview": isPreview ? "true" : "false",
      },
    });
  } catch (error) {
    console.error("[PDF v3] Generation error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `PDF generation failed: ${message}` },
      { status: 500 },
    );
  }
}
