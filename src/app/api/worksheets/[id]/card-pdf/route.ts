import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";
import puppeteer from "puppeteer";
import { CardItem, CardSettings } from "@/types/card";
import { DEFAULT_BRAND_SETTINGS, BrandSettings } from "@/types/worksheet";
import fs from "fs";
import path from "path";

// ─── Layout constants (mm) ──────────────────────────────────
const PAGE_W = 297; // A4 landscape
const PAGE_H = 210;
const CARD_W = PAGE_W / 2; // 148.5mm
const CARD_H = PAGE_H / 2; // 105mm
const CARDS_PER_PAGE = 4;

// 5mm margins as % of card dimensions
const MX = (5 / CARD_W) * 100; // ~3.37%
const MY = (5 / CARD_H) * 100; // ~4.76%
const LOGO_H = (6 / CARD_H) * 100; // ~5.71%
const IMG_BOTTOM = (10 / CARD_H) * 100; // ~9.52%

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\n/g, "<br>");
}

/** Replace brand template variables in header/footer HTML */
function replaceVariables(html: string, brandSettings: BrandSettings): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" });
  return html
    .replace(/\{current_date\}/g, dateStr)
    .replace(/\{current_year\}/g, String(now.getFullYear()))
    .replace(/\{organization\}/g, brandSettings.organization || "")
    .replace(/\{teacher\}/g, brandSettings.teacher || "");
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
  logoDataUri: string
): string {
  if (!card) return `<div class="slot"></div>`;

  // Brand logo — 5mm from top, 5mm from right, 6mm height
  const logoHTML = brandSettings.logo
    ? `<img src="${logoDataUri}" class="logo" style="top:${MY}%;right:${MX}%;height:${LOGO_H}%" />`
    : "";

  // Header left text — 5mm from left, 5mm from top
  const headerText = replaceVariables(brandSettings.headerRight || "", brandSettings);
  const headerHTML = headerText
    ? `<div class="header-left" style="top:${MY}%;left:${MX}%">${headerText}</div>`
    : "";

  // Footer left — 5mm from left, 5mm from bottom
  const footerText = replaceVariables(brandSettings.footerLeft || "", brandSettings);
  const footerHTML = footerText
    ? `<div class="footer-left" style="bottom:${MY}%;left:${MX}%">${footerText}</div>`
    : "";

  // Text size class
  const textSizeClass =
    card.textSize === "sm" ? "text-sm" :
    card.textSize === "lg" ? "text-lg" :
    card.textSize === "xl" ? "text-xl" : "text-md";

  // Text area — fills space above the image container
  const textHTML = card.text
    ? `<div class="text-area ${textSizeClass}" style="top:0;left:${MX}%;right:${MX}%;bottom:calc(${IMG_BOTTOM}% + ((100% - ${MX * 2}%) / (16/9)) + 1%)">
         <span>${escapeHtml(card.text)}</span>
       </div>`
    : "";

  // Image container — 16:9, 5mm from left/right, 10mm from bottom
  const imgContent = card.image
    ? `<img src="${card.image}" style="width:100%;height:100%;${getObjFitCSS(card.imageRatio)}transform:scale(${(card.imageScale ?? 100) / 100})" />`
    : "";
  const imgHTML = `<div class="image-container" style="left:${MX}%;right:${MX}%;bottom:${IMG_BOTTOM}%;aspect-ratio:16/9">${imgContent}</div>`;

  return `<div class="slot">${logoHTML}${headerHTML}${textHTML}${imgHTML}${footerHTML}</div>`;
}

function buildPageHtml(
  cards: CardItem[],
  pageIndex: number,
  settings: CardSettings,
  brandSettings: BrandSettings,
  logoDataUri: string
): string {
  const start = pageIndex * CARDS_PER_PAGE;
  const pageCards = cards.slice(start, start + CARDS_PER_PAGE);

  const slotsHTML = [0, 1, 2, 3]
    .map((slot) => renderCardSlot(pageCards[slot], brandSettings, logoDataUri))
    .join("");

  const cuttingLinesHTML = settings.showCuttingLines
    ? `<div class="cut-v" style="border-left:1px ${settings.cuttingLineStyle} #ccc"></div>
       <div class="cut-h" style="border-top:1px ${settings.cuttingLineStyle} #ccc"></div>`
    : "";

  return `<div class="page">
    <div class="grid">${slotsHTML}</div>
    ${cuttingLinesHTML}
  </div>`;
}

function buildFullHtml(
  cards: CardItem[],
  settings: CardSettings,
  brandSettings: BrandSettings,
  logoDataUri: string
): string {
  const totalPages = Math.ceil(cards.length / CARDS_PER_PAGE);
  let pagesHtml = "";

  for (let i = 0; i < totalPages; i++) {
    pagesHtml += buildPageHtml(cards, i, settings, brandSettings, logoDataUri);
  }

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Encode+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  @page {
    size: A4 landscape;
    margin: 0;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: ${PAGE_W}mm;
    margin: 0;
    padding: 0;
    font-family: "Encode Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .page {
    width: ${PAGE_W}mm;
    height: ${PAGE_H}mm;
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
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
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
  .footer-left {
    position: absolute;
    z-index: 10;
    font-size: 7pt;
    line-height: 1.3;
    color: #555;
  }
  .text-area {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 2mm;
  }
  .text-area span {
    text-align: center;
    line-height: 1.3;
    max-width: 95%;
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

  const html = buildFullHtml(cards, settings, brandSettings, logoDataUri);

  try {
    const totalPages = Math.ceil(cards.length / CARDS_PER_PAGE);
    console.log(`[Card PDF] Generating PDF for ${cards.length} cards, ${totalPages} pages`);

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
      landscape: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      printBackground: true,
      displayHeaderFooter: false,
      preferCSSPageSize: true,
    });

    await browser.close();

    const finalPdfBytes = new Uint8Array(pdfBuffer);
    console.log(`[Card PDF] Generated ${finalPdfBytes.length} bytes, ${totalPages} pages`);

    const safeTitle = worksheet.title
      .replace(/[\u2013\u2014]/g, "-")
      .replace(/[^\x20-\x7E]/g, "_");

    return new NextResponse(Buffer.from(finalPdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeTitle}.pdf"`,
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
