import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";
import { launchBrowser } from "@/lib/puppeteer";
import { CardItem, CardSettings, CardLayout } from "@/types/card";
import { DEFAULT_BRAND_SETTINGS, BrandSettings } from "@/types/worksheet";
import fs from "fs";
import path from "path";

// ─── Layout dimensions (mm) ─────────────────────────────────
interface LayoutDims {
  pageW: number;
  pageH: number;
  cardW: number;
  cardH: number;
  cols: number;
  rows: number;
  perPage: number;
  landscape: boolean;
}

function getLayoutDims(layout: CardLayout): LayoutDims {
  if (layout === "portrait-2") {
    return { pageW: 210, pageH: 297, cardW: 210, cardH: 148.5, cols: 1, rows: 2, perPage: 2, landscape: false };
  }
  // landscape-4 (default)
  return { pageW: 297, pageH: 210, cardW: 148.5, cardH: 105, cols: 2, rows: 2, perPage: 4, landscape: true };
}

// Margin helpers — computed per layout
function margins(dims: LayoutDims) {
  const MX = (10 / dims.cardW) * 100;
  const MY = (10 / dims.cardH) * 100;
  const LOGO_TOP = (7 / dims.cardH) * 100;
  const LOGO_H = (6 / dims.cardH) * 100;
  // Image container: 17mm from bottom, 3mm taller than 16:9
  const contentW = dims.cardW - 2 * 10; // mm width inside margins
  const IMG_RATIO = contentW / (contentW * 9 / 16 + 3);
  const IMG_BOTTOM = (17 / dims.cardH) * 100;
  const FOOTER_BOTTOM = (8 / dims.cardH) * 100;
  return { MX, MY, LOGO_TOP, LOGO_H, IMG_RATIO, IMG_BOTTOM, FOOTER_BOTTOM };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\n/g, "<br>");
}

/** Replace brand template variables in header/footer HTML */
function replaceVariables(html: string, brandSettings: BrandSettings, worksheetId = ""): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" });
  return html
    .replace(/\{current_date\}/g, dateStr)
    .replace(/\{current_year\}/g, String(now.getFullYear()))
    .replace(/\{organization\}/g, brandSettings.organization || "")
    .replace(/\{teacher\}/g, brandSettings.teacher || "")
    .replace(/\{worksheet_uuid\}/g, worksheetId.toUpperCase());
}

/**
 * Determine object-fit CSS based on image aspect ratio.
 * ~1:1 → contain, landscape → cover, portrait → cover
 */
function getObjFitCSS(ratio?: number): string {
  if (!ratio) return "object-fit:contain;";
  if (ratio > 1.33) return "object-fit:cover;object-position:center center;";
  if (ratio < 0.75) return "object-fit:cover;object-position:center center;";
  return "object-fit:contain;";
}

function renderCardSlot(
  card: CardItem | undefined,
  brandSettings: BrandSettings,
  logoDataUri: string,
  dims: LayoutDims,
  worksheetId: string,
  settings: CardSettings
): string {
  if (!card) return `<div class="slot"></div>`;

  const { MX, MY, LOGO_TOP, LOGO_H, IMG_RATIO, IMG_BOTTOM, FOOTER_BOTTOM } = margins(dims);

  // Brand logo — 7mm from top, 10mm from right, 6mm height
  const logoHTML = brandSettings.logo
    ? `<img src="${logoDataUri}" class="logo" style="top:${LOGO_TOP}%;right:${MX}%;height:${LOGO_H}%" />`
    : "";

  // Header left text — 5mm from left, 5mm from top
  const headerText = replaceVariables(brandSettings.headerRight || "", brandSettings, worksheetId);
  const headerHTML = headerText
    ? `<div class="header-left" style="top:${MY}%;left:${MX}%">${headerText}</div>`
    : "";

  // Three-column footer bar (matching worksheet layout)
  const now = new Date();
  const year = now.getFullYear();
  const dateStr = now.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" });
  const footerLeftText = replaceVariables(
    brandSettings.footerLeft || `© ${year} lingostar | Marcel Allenspach<br/>Alle Rechte vorbehalten`,
    brandSettings,
    worksheetId
  );
  const footerRightText = replaceVariables(
    brandSettings.footerRight || `{worksheet_uuid}<br/>${dateStr}`,
    brandSettings,
    worksheetId
  );
  const footerHTML = `<div class="card-footer" style="bottom:${FOOTER_BOTTOM}%;left:${MX}%;right:${MX}%">
    <div class="card-footer-left">${footerLeftText}</div>
    <div class="card-footer-right">${footerRightText}</div>
  </div>`;

  // Text size class
  const textSizeClass =
    card.textSize === "sm" ? "text-sm" :
    card.textSize === "lg" ? "text-lg" :
    card.textSize === "xl" ? "text-xl" : "text-md";

  const textPosition = card.textPosition || "top";

  // Text area — position depends on textPosition
  let textHTML = "";
  if (card.text) {
    if (textPosition === "top") {
      textHTML = `<div class="text-area ${textSizeClass}" style="top:0;left:${MX}%;right:${MX}%;bottom:calc(${IMG_BOTTOM}% + ((100% - ${MX * 2}%) / ${IMG_RATIO}) + 1%)">
         <span>${escapeHtml(card.text)}</span>
       </div>`;
    } else if (textPosition === "center") {
      const yOff = settings.centerTextYOffset ?? 0;
      textHTML = `<div class="text-area-center ${textSizeClass}" style="top:${50 + yOff}%;left:50%;transform:translate(-50%,-50%);width:60%;z-index:20">
         <span>${escapeHtml(card.text)}</span>
       </div>`;
    } else {
      // bottom
      textHTML = `<div class="text-area ${textSizeClass}" style="top:calc(100% - ${IMG_BOTTOM}%);left:${MX}%;right:${MX}%;bottom:${IMG_BOTTOM}%">
         <span>${escapeHtml(card.text)}</span>
       </div>`;
    }
  }

  // Image container — 10mm from left/right, 17mm from bottom, 3mm taller than 16:9
  const imgContent = card.image
    ? `<img src="${card.image}" style="width:100%;height:100%;${getObjFitCSS(card.imageRatio)}transform:scale(${(card.imageScale ?? 100) / 100})" />`
    : "";
  const imgHTML = `<div class="image-container" style="left:${MX}%;right:${MX}%;bottom:${IMG_BOTTOM}%;aspect-ratio:${IMG_RATIO}">${imgContent}</div>`;

  return `<div class="slot">${logoHTML}${headerHTML}${textHTML}${imgHTML}${footerHTML}</div>`;
}

function buildPageHtml(
  cards: CardItem[],
  pageIndex: number,
  settings: CardSettings,
  brandSettings: BrandSettings,
  logoDataUri: string,
  dims: LayoutDims,
  worksheetId: string
): string {
  const start = pageIndex * dims.perPage;
  const pageCards = cards.slice(start, start + dims.perPage);

  const slotsHTML = Array.from({ length: dims.perPage })
    .map((_, slot) => renderCardSlot(pageCards[slot], brandSettings, logoDataUri, dims, worksheetId, settings))
    .join("");

  let cuttingLinesHTML = "";
  if (settings.showCuttingLines) {
    // Horizontal center line — always present
    cuttingLinesHTML += `<div class="cut-h" style="border-top:1px ${settings.cuttingLineStyle} #ccc"></div>`;
    // Vertical center line — landscape-4 only
    if (dims.cols === 2) {
      cuttingLinesHTML += `<div class="cut-v" style="border-left:1px ${settings.cuttingLineStyle} #ccc"></div>`;
    }
  }

  return `<div class="page">
    <div class="grid">${slotsHTML}</div>
    ${cuttingLinesHTML}
  </div>`;
}

function buildFullHtml(
  cards: CardItem[],
  settings: CardSettings,
  brandSettings: BrandSettings,
  logoDataUri: string,
  dims: LayoutDims,
  worksheetId: string
): string {
  const totalPages = Math.ceil(cards.length / dims.perPage);
  let pagesHtml = "";

  for (let i = 0; i < totalPages; i++) {
    pagesHtml += buildPageHtml(cards, i, settings, brandSettings, logoDataUri, dims, worksheetId);
  }

  const orientation = dims.landscape ? "landscape" : "portrait";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Encode+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  @page {
    size: A4 ${orientation};
    margin: 0;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: ${dims.pageW}mm;
    margin: 0;
    padding: 0;
    font-family: "Encode Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .page {
    width: ${dims.pageW}mm;
    height: ${dims.pageH}mm;
    position: relative;
    overflow: hidden;
    page-break-after: always;
  }
  .page:last-child {
    page-break-after: auto;
  }
  .grid {
    position: absolute;
    inset: 0;
    display: grid;
    grid-template-columns: repeat(${dims.cols}, 1fr);
    grid-template-rows: repeat(${dims.rows}, 1fr);
  }
  .slot {
    position: relative;
    overflow: hidden;
  }
  .logo {
    position: absolute;
    z-index: 10;
    object-fit: contain;
    width: auto;
  }
  .header-left {
    position: absolute;
    z-index: 10;
    font-size: 7pt;
    line-height: 1.3;
    color: #555;
  }
  .card-footer {
    position: absolute;
    z-index: 10;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    font-size: 7pt;
    line-height: 1.3;
    color: #555;
  }
  .card-footer-left { text-align: left; }
  .card-footer-right { text-align: right; }
  .text-area {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 2mm;
  }
  .text-area-center {
    position: absolute;
    background-color: rgba(255,255,255,0.9);
    padding: 2mm 3mm;
    border-radius: 2px;
  }
  .text-area span {
    text-align: center;
    line-height: 1.3;
    max-width: 95%;
    word-break: break-word;
  }
  .text-area-center span {
    display: block;
    text-align: center;
    line-height: 1.3;
    word-break: break-word;
  }
  .text-sm span { font-size: 8pt; }
  .text-md span { font-size: 10pt; }
  .text-lg span { font-size: 13pt; }
  .text-xl span { font-size: 16pt; font-weight: 500; }
  .image-container {
    position: absolute;
    overflow: hidden;
    border-radius: 1px;
  }
  .cut-v {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 50%;
    transform: translateX(-0.5px);
    width: 1px;
  }
  .cut-h {
    position: absolute;
    left: 0;
    right: 0;
    top: 50%;
    transform: translateY(-0.5px);
    height: 1px;
  }
  img { display: block; }
</style>
</head>
<body>
${pagesHtml}
</body>
</html>`;
}

// POST /api/worksheets/[id]/card-pdf
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
  if (!worksheet || worksheet.type !== "cards") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const cards = (worksheet.blocks ?? []) as unknown as CardItem[];
  const settings = (worksheet.settings ?? {}) as unknown as CardSettings;
  if (cards.length === 0) {
    return NextResponse.json({ error: "No cards to export" }, { status: 400 });
  }

  // Build brand settings with defaults
  const brandSettings: BrandSettings = {
    ...DEFAULT_BRAND_SETTINGS[settings.brand || "edoomio"],
    ...settings.brandSettings,
  };

  // Read logo as data URI so Puppeteer can render it without network
  let logoDataUri = "";
  if (brandSettings.logo) {
    try {
      const logoPath = path.join(process.cwd(), "public", brandSettings.logo.replace(/^\//, ""));
      const logoRaw = fs.readFileSync(logoPath, "utf-8");
      const isSvg = brandSettings.logo.endsWith(".svg");
      logoDataUri = isSvg
        ? `data:image/svg+xml,${encodeURIComponent(logoRaw)}`
        : `data:image/png;base64,${Buffer.from(logoRaw).toString("base64")}`;
    } catch {
      console.warn(`[Card PDF] Could not read logo file: ${brandSettings.logo}`);
    }
  }

  const layout: CardLayout = settings.layout || "landscape-4";
  const dims = getLayoutDims(layout);

  const html = buildFullHtml(cards, settings, brandSettings, logoDataUri, dims, id);

  try {
    const totalPages = Math.ceil(cards.length / dims.perPage);
    console.log(`[Card PDF] Generating PDF for ${cards.length} cards, ${totalPages} pages, layout=${layout}`);

    const browser = await launchBrowser();

    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    // Wait for fonts and images to load
    await page.evaluateHandle("document.fonts.ready");
    await page.evaluate(() =>
      Promise.all(
        Array.from(document.images)
          .filter((img) => !img.complete)
          .map(
            (img) =>
              new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = resolve;
              })
          )
      )
    );
    await new Promise((r) => setTimeout(r, 300));

    const pdfBuffer = await page.pdf({
      format: "A4",
      landscape: dims.landscape,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      printBackground: true,
      displayHeaderFooter: false,
      preferCSSPageSize: true,
    });

    await browser.close();

    const finalPdfBytes = new Uint8Array(pdfBuffer);
    console.log(`[Card PDF] Generated ${finalPdfBytes.length} bytes, ${totalPages} pages`);

    const shortId = id.slice(0, 16);

    return new NextResponse(Buffer.from(finalPdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${shortId}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Card PDF generation error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `PDF generation failed: ${message}` },
      { status: 500 }
    );
  }
}
