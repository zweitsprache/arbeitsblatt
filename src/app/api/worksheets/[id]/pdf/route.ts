import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";
import puppeteer from "puppeteer";
import { BrandSettings, DEFAULT_BRAND_SETTINGS, Brand } from "@/types/worksheet";
import fs from "fs";
import path from "path";

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

  // Build Puppeteer header/footer templates - they need explicit width/height and margin
  // Logo must be base64-encoded for Puppeteer header templates (isolated context)
  let logoDataUri = "";
  if (brandSettings.logo) {
    try {
      const logoPath = path.join(process.cwd(), "public", brandSettings.logo.replace(/^\//, ""));
      const logoContent = fs.readFileSync(logoPath);
      const ext = path.extname(logoPath).toLowerCase();
      const mimeType = ext === ".svg" ? "image/svg+xml" : ext === ".png" ? "image/png" : "image/jpeg";
      logoDataUri = `data:${mimeType};base64,${logoContent.toString("base64")}`;
    } catch (e) {
      console.error("[PDF] Failed to load logo:", e);
    }
  }

  // Embed Google Fonts as base64 TTF for Puppeteer header/footer templates
  const fontFamily = brand === "lingostar" ? "Encode Sans" : "Asap Condensed";
  const fontPrefix = brand === "lingostar" ? "encode-sans" : "asap-condensed";
  let fontFaceRules = "";
  
  try {
    const font400Path = path.join(process.cwd(), "public", "fonts", `${fontPrefix}-400.ttf`);
    const font600Path = path.join(process.cwd(), "public", "fonts", `${fontPrefix}-600.ttf`);
    const font400Content = fs.readFileSync(font400Path);
    const font600Content = fs.readFileSync(font600Path);
    const font400Uri = `data:font/ttf;base64,${font400Content.toString("base64")}`;
    const font600Uri = `data:font/ttf;base64,${font600Content.toString("base64")}`;
    fontFaceRules = `
      @font-face { font-family: '${fontFamily}'; src: url('${font400Uri}') format('truetype'); font-weight: 400; font-style: normal; }
      @font-face { font-family: '${fontFamily}'; src: url('${font600Uri}') format('truetype'); font-weight: 600; font-style: normal; }
    `;
  } catch (e) {
    console.error("[PDF] Failed to load fonts:", e);
  }
  
  const headerTemplate = `
    <style>
      ${fontFaceRules}
      .header { width: 100%; height: 20mm; font-family: '${fontFamily}', sans-serif; font-size: 10pt; color: #666; padding: 5mm 10mm 0 10mm; box-sizing: border-box; display: flex; justify-content: space-between; align-items: flex-start; }
      .header img { height: 8mm; width: auto; }
    </style>
    <div class="header">
      <div>
        ${logoDataUri ? `<img src="${logoDataUri}" />` : ""}
      </div>
      <div style="text-align: right;">
        ${brandSettings.headerRight || ""}
      </div>
    </div>
  `;

  const footerTemplate = `
    <style>
      ${fontFaceRules}
      .footer { width: 100%; height: 20mm; font-family: '${fontFamily}', sans-serif; font-size: 10pt; color: #666; padding: 0 10mm 5mm 10mm; box-sizing: border-box; display: flex; justify-content: space-between; align-items: flex-end; }
    </style>
    <div class="footer">
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
    const hasHeader = Boolean(settings.showHeader && (logoDataUri || brandSettings.headerRight));
    const hasFooter = Boolean(settings.showFooter && (brandSettings.footerLeft || brandSettings.footerCenter || brandSettings.footerRight || settings.footerText));
    const showHeaderFooter = hasHeader || hasFooter;
    
    console.log(`[PDF] hasHeader=${hasHeader}, hasFooter=${hasFooter}, logoDataUri=${logoDataUri ? "(base64)" : ""}, brand=${brand}`);
    console.log(`[PDF] brandSettings:`, JSON.stringify(brandSettings));
    
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
      displayHeaderFooter: showHeaderFooter,
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
