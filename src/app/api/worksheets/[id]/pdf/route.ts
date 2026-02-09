import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";
import puppeteer from "puppeteer";
import { BrandSettings, DEFAULT_BRAND_SETTINGS, Brand } from "@/types/worksheet";

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

  // Get brand settings
  const brandSettings: BrandSettings = {
    ...DEFAULT_BRAND_SETTINGS[brand],
    ...(worksheetSettings?.brandSettings as Partial<BrandSettings> | undefined),
  };

  const margins =
    typeof settings.margins === "object" && settings.margins !== null
      ? (settings.margins as { top: number; right: number; bottom: number; left: number })
      : { top: 20, right: 20, bottom: 20, left: 20 };

  // Build Puppeteer header/footer templates
  const logoUrl = brandSettings.logo ? `${baseUrl}${brandSettings.logo}` : "";
  
  const headerTemplate = `
    <div style="width: 100%; font-size: 10pt; color: #666; padding: 0 10mm; box-sizing: border-box; display: flex; justify-content: space-between; align-items: center;">
      <div>
        ${logoUrl ? `<img src="${logoUrl}" style="height: 8mm; width: auto;" />` : ""}
      </div>
      <div style="text-align: right;">
        ${brandSettings.headerRight || ""}
      </div>
    </div>
  `;

  const footerTemplate = `
    <div style="width: 100%; font-size: 10pt; color: #666; padding: 0 10mm; box-sizing: border-box; display: flex; justify-content: space-between; align-items: center;">
      <div>${brandSettings.footerLeft || ""}</div>
      <div style="text-align: center;">${brandSettings.footerCenter || settings.footerText || ""}</div>
      <div style="text-align: right;">${brandSettings.footerRight || ""}</div>
    </div>
  `;

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

    // Generate the PDF with Puppeteer header/footer templates
    const hasHeader = settings.showHeader && (logoUrl || brandSettings.headerRight);
    const hasFooter = settings.showFooter && (brandSettings.footerLeft || brandSettings.footerCenter || brandSettings.footerRight || settings.footerText);
    
    const pdfBuffer = await page.pdf({
      format: settings.pageSize === "a4" ? "A4" : "Letter",
      landscape: settings.orientation === "landscape",
      margin: {
        top: hasHeader ? "25mm" : `${margins.top}mm`,
        right: `${margins.right}mm`,
        bottom: hasFooter ? "25mm" : `${margins.bottom}mm`,
        left: `${margins.left}mm`,
      },
      printBackground: true,
      displayHeaderFooter: hasHeader || hasFooter,
      headerTemplate: hasHeader ? headerTemplate : "<span></span>",
      footerTemplate: hasFooter ? footerTemplate : "<span></span>",
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
