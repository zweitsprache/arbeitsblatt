import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";
import { launchBrowser, fetchImageAsDataUri } from "@/lib/puppeteer";
import { CardItem, CardSettings, CardLayout } from "@/types/card";
import { DEFAULT_BRAND_SETTINGS, BrandSettings, BrandProfile, getStaticBrandProfile, resolveSubProfileHeaderFooter } from "@/types/worksheet";
import fs from "fs";
import path from "path";
import sharp from "sharp";

export const maxDuration = 60;

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
  /** Optional top offset (mm) to push the grid down from the page top */
  gridTopMm?: number;
}

function getLayoutDims(layout: CardLayout): LayoutDims {
  if (layout === "portrait-2") {
    return { pageW: 210, pageH: 297, cardW: 210, cardH: 148.5, cols: 1, rows: 2, perPage: 2, landscape: false };
  }
  if (layout === "landscape-1") {
    // DIN A4 landscape, 1 card per page, content 297×70mm starting at y=140mm
    return { pageW: 297, pageH: 210, cardW: 297, cardH: 70, cols: 1, rows: 1, perPage: 1, landscape: true, gridTopMm: 140 };
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
  // 5mm nudge for text areas on landscape-4 layout
  const TEXT_TOP_OFFSET = (5 / dims.cardH) * 100;
  return { MX, MY, LOGO_TOP, LOGO_H, IMG_RATIO, IMG_BOTTOM, FOOTER_BOTTOM, TEXT_TOP_OFFSET };
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

  const { MX, MY, LOGO_TOP, LOGO_H, IMG_RATIO, IMG_BOTTOM, FOOTER_BOTTOM, TEXT_TOP_OFFSET } = margins(dims);

  // ─── Landscape-1: simplified full-width text-only slot ─────
  if (dims.perPage === 1) {
    const isHtmlContent = card.text ? /<\/?[a-z][\s\S]*?>/i.test(card.text) : false;
    const hasTextContent = card.text && card.text.replace(/<[^>]*>/g, "").trim() !== "";
    const textSizeClass =
      card.textSize === "sm" ? "text-sm" :
      card.textSize === "lg" ? "text-lg" :
      card.textSize === "xl" ? "text-xl" :
      card.textSize === "xxl" ? "text-xxl" : "text-md";
    // Text container: 297×50mm at y=150mm → within 70mm card: top=10mm, height=50mm
    const textTop = (10 / dims.cardH) * 100;
    const textH = (50 / dims.cardH) * 100;
    let textHTML = "";
    if (hasTextContent) {
      const textInner = isHtmlContent ? card.text! : `<span>${escapeHtml(card.text)}</span>`;
      textHTML = `<div class="text-area-full ${textSizeClass}" style="left:${MX}%;right:${MX}%;top:${textTop}%;height:${textH}%">
         ${textInner}
       </div>`;
    }
    // Footer at y=200mm → within card: 10mm from bottom, align to bottom
    const footerBot = (10 / dims.cardH) * 100;
    const now = new Date();
    const year = now.getFullYear();
    const dateStr = now.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" });
    const footerLeftText = replaceVariables(
      brandSettings.footerLeft || `© ${year} lingostar | Marcel Allenspach<br/>Alle Rechte vorbehalten`,
      brandSettings, worksheetId
    );
    const footerRightText = replaceVariables(
      brandSettings.footerRight || `{worksheet_uuid}<br/>${dateStr}`,
      brandSettings, worksheetId
    );
    const footerHTML = `<div class="card-footer" style="bottom:${footerBot}%;left:${MX}%;right:${MX}%;align-items:flex-end">
      <div class="card-footer-left">${footerLeftText}</div>
      <div class="card-footer-right">${footerRightText}</div>
    </div>`;
    // Logo at y=150mm, right 10mm → within card: top=10mm, right=10mm, 12mm height
    const logoTop1 = (10 / dims.cardH) * 100;
    const LOGO_H_1 = (12 / dims.cardH) * 100;
    const logoHTML = brandSettings.logo
      ? `<img src="${logoDataUri}" class="logo" style="top:${logoTop1}%;right:${MX}%;height:${LOGO_H_1}%" />`
      : "";
    return `<div class="slot">${logoHTML}${textHTML}${footerHTML}</div>`;
  }

  // ─── Standard multi-card layouts ───────────────────────────

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
    card.textSize === "xl" ? "text-xl" :
    card.textSize === "xxl" ? "text-xxl" : "text-md";

  const textPosition = card.textPosition || "top";

  // Text area — position depends on textPosition
  // Detect if text is HTML (from TipTap rich text editor) or plain text (legacy)
  const isHtmlContent = card.text ? /<\/?[a-z][\s\S]*?>/i.test(card.text) : false;
  const hasTextContent = card.text && card.text.replace(/<[^>]*>/g, "").trim() !== "";
  let textHTML = "";
  if (hasTextContent) {
    const textInner = isHtmlContent ? card.text! : `<span>${escapeHtml(card.text)}</span>`;
    if (textPosition === "top") {
      textHTML = `<div class="text-area ${textSizeClass}" style="top:${TEXT_TOP_OFFSET}%;left:${MX}%;right:${MX}%;bottom:calc(${IMG_BOTTOM}% + ((100% - ${MX * 2}%) / ${IMG_RATIO}) + 1%)">
         ${textInner}
       </div>`;
    } else if (textPosition === "center") {
      const yOff = settings.centerTextYOffset ?? 0;
      const centerW = dims.perPage === 1 ? "95%" : dims.landscape ? "60%" : "80%";
      textHTML = `<div class="text-area-center ${textSizeClass}" style="top:${50 + yOff}%;left:50%;transform:translate(-50%,-50%);width:${centerW};z-index:20">
         ${textInner}
       </div>`;
    } else {
      // bottom
      textHTML = `<div class="text-area ${textSizeClass}" style="top:calc(100% - ${IMG_BOTTOM}% + ${TEXT_TOP_OFFSET}%);left:${MX}%;right:${MX}%;bottom:calc(${IMG_BOTTOM}% - ${TEXT_TOP_OFFSET}%)">
         ${textInner}
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
  if (settings.showCuttingLines && dims.perPage > 1) {
    // Horizontal center line — multi-card layouts only
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
    ${dims.gridTopMm ? `top: ${dims.gridTopMm}mm;` : 'top: 0;'}
    left: 0;
    right: 0;
    bottom: 0;
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
  .text-area-full {
    position: absolute;
    top: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .text-area span, .text-area p, .text-area-full span, .text-area-full p {
    text-align: center;
    line-height: 1.3;
    max-width: 100%;
    word-break: break-word;
  }
  .text-area p,
  .text-area span p,
  .text-area-full p,
  .text-area-full span p,
  .text-area-center p,
  .text-area-center span p {
    text-align: center;
  }
  .text-area-center span, .text-area-center p {
    display: block;
    text-align: center;
    line-height: 1.3;
    word-break: break-word;
  }
  .text-sm span, .text-sm p { font-size: ${dims.landscape ? '8pt' : '16pt'}; }
  .text-md span, .text-md p { font-size: ${dims.landscape ? '10pt' : '20pt'}; }
  .text-lg span, .text-lg p { font-size: ${dims.landscape ? '13pt' : '26pt'}; }
  .text-xl span, .text-xl p { font-size: ${dims.landscape ? '16pt' : '32pt'}; font-weight: 500; }
  .text-xxl span, .text-xxl p { font-size: ${dims.perPage === 1 ? '56pt' : dims.landscape ? '48pt' : '48pt'}; font-weight: 600; }
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
  /* Rich text (TipTap / imported Markdown) content inside cards */
  p { margin: 0 0 0.4em 0; }
  p:last-child { margin-bottom: 0; }
  strong, b { font-weight: 700; }
  em, i { font-style: italic; }
  s, del { text-decoration: line-through; }
  u { text-decoration: underline; }
  code { font-family: monospace; font-size: 0.9em; }
  mark { background: #fef08a; padding: 0 1px; border-radius: 1px; }
  sup { font-size: 0.65em; vertical-align: super; }
  sub { font-size: 0.65em; vertical-align: sub; }
  ul { list-style: disc inside; padding-left: 4px; margin: 0 0 0.4em 0; }
  ol { list-style: decimal inside; padding-left: 4px; margin: 0 0 0.4em 0; }
  li { margin: 0; }
</style>
</head>
<body>
${pagesHtml}
</body>
</html>`;
}

// GET /api/worksheets/[id]/card-pdf
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  const { id } = await params;
  const isCH = _req.nextUrl.searchParams.get("ch") === "1";
  const noText = _req.nextUrl.searchParams.get("notext") === "1";

  const worksheet = await prisma.worksheet.findFirst({
    where: { id, userId } as Parameters<typeof prisma.worksheet.findFirst>[0] extends { where?: infer W } ? W : never,
  });
  if (!worksheet || worksheet.type !== "cards") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let cards = (worksheet.blocks ?? []) as unknown as CardItem[];
  const settings = (worksheet.settings ?? {}) as unknown as CardSettings;
  if (cards.length === 0) {
    return NextResponse.json({ error: "No cards to export" }, { status: 400 });
  }

  // Apply CH locale: ß → ss, then apply manual CH overrides
  if (isCH) {
    cards = cards.map(card => ({
      ...card,
      text: card.text ? card.text.replace(/ß/g, "ss") : card.text,
    }));
    // Apply manual CH overrides from settings (text + image)
    const chOverrides = settings.chOverrides;
    if (chOverrides) {
      cards = cards.map(card => {
        const overrides = chOverrides[card.id];
        if (!overrides) return card;
        return {
          ...card,
          text: overrides.text !== undefined ? overrides.text : card.text,
          image: overrides.image !== undefined ? (overrides.image || undefined) : card.image,
          imageRatio: overrides.imageRatio !== undefined ? parseFloat(overrides.imageRatio) : card.imageRatio,
        };
      });
    }
  }

  // Strip text from cards if noText is requested
  if (noText) {
    cards = cards.map(card => ({ ...card, text: "" }));
  }

  // Build brand settings with defaults — resolve from DB, fall back to static
  const brandSlug = settings.brand || "edoomio";
  const dbBrand = await prisma.brandProfile.findUnique({ where: { slug: brandSlug }, include: { subProfiles: true } });
  const brandProfile: BrandProfile = dbBrand
    ? (dbBrand as unknown as BrandProfile)
    : getStaticBrandProfile(brandSlug);
  const brandSettings: BrandSettings = {
    ...DEFAULT_BRAND_SETTINGS[brandSlug],
    ...settings.brandSettings,
    logo: brandProfile.logo ?? DEFAULT_BRAND_SETTINGS[brandSlug]?.logo,
    organization: brandProfile.organization ?? DEFAULT_BRAND_SETTINGS[brandSlug]?.organization,
    headerRight: brandProfile.headerRight ?? DEFAULT_BRAND_SETTINGS[brandSlug]?.headerRight,
    footerLeft: brandProfile.footerLeft ?? DEFAULT_BRAND_SETTINGS[brandSlug]?.footerLeft,
    footerCenter: brandProfile.footerCenter ?? DEFAULT_BRAND_SETTINGS[brandSlug]?.footerCenter,
    footerRight: brandProfile.footerRight ?? DEFAULT_BRAND_SETTINGS[brandSlug]?.footerRight,
  };

  // Apply sub-profile header/footer overrides (landscape-1 uses variant 2 / single line)
  const subProfileVariant = (settings.layout || "landscape-4") === "landscape-1" ? 2 : 1;
  const subHeaders = resolveSubProfileHeaderFooter(brandProfile, settings.subProfileId, subProfileVariant as 1 | 2);
  if (subHeaders) {
    brandSettings.headerRight = subHeaders.headerRight;
    brandSettings.footerLeft = subHeaders.footerLeft;
    brandSettings.footerRight = subHeaders.footerRight;
  }

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

  // Convert external image URLs to data URIs so headless Chrome on Vercel
  // does not need to fetch them over the network (which fails in Lambda).
  // Images are resized to max 1200px to prevent Vercel Lambda memory exhaustion.
  const imageUrls = [...new Set(cards.filter(c => c.image).map(c => c.image!))];
  if (imageUrls.length > 0) {
    console.log(`[Card PDF] Fetching ${imageUrls.length} images as data URIs...`);
    const dataUris = await Promise.all(imageUrls.map(async (url) => {
      try {
        const raw = await fetchImageAsDataUri(url);
        if (!raw) return "";
        // Decode the data URI, resize with sharp, re-encode
        const base64Data = raw.split(",")[1];
        if (!base64Data) return raw;
        const inputBuffer = Buffer.from(base64Data, "base64");
        const resizedBuffer = await sharp(inputBuffer)
          .flatten({ background: { r: 255, g: 255, b: 255 } })
          .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
          .jpeg({ quality: 80 })
          .toBuffer();
        return `data:image/jpeg;base64,${resizedBuffer.toString("base64")}`;
      } catch (e) {
        console.warn(`[Card PDF] Image resize failed for ${url}:`, e instanceof Error ? e.message : e);
        return fetchImageAsDataUri(url);
      }
    }));
    const imageMap = new Map<string, string>();
    imageUrls.forEach((url, i) => {
      if (dataUris[i]) imageMap.set(url, dataUris[i]);
    });
    cards = cards.map(card => ({
      ...card,
      image: card.image ? (imageMap.get(card.image) || card.image) : card.image,
    }));
  }

  const layout: CardLayout = settings.layout || "landscape-4";
  const dims = getLayoutDims(layout);

  const html = buildFullHtml(cards, settings, brandSettings, logoDataUri, dims, id);

  const totalPages = Math.ceil(cards.length / dims.perPage);
  console.log(`[Card PDF] Generating PDF for ${cards.length} cards, ${totalPages} pages, layout=${layout}`);

  let browser;
  try {
    browser = await launchBrowser();

    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
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
      preferCSSPageSize: false,
    });

    const finalPdfBytes = new Uint8Array(pdfBuffer);
    console.log(`[Card PDF] Generated ${finalPdfBytes.length} bytes, ${totalPages} pages`);

    const shortId = id.slice(0, 16);
    const layoutSuffix = layout === "landscape-4" ? "2x2" : layout === "landscape-1" ? "1x1" : "1x2";
    const textSuffix = noText ? "NT" : "WT";
    const localeSuffix = isCH ? "CH" : "DE";
    const filename = `${shortId}_${layoutSuffix}_${textSuffix}_${localeSuffix}.pdf`;

    return new NextResponse(Buffer.from(finalPdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Card PDF generation error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `PDF generation failed: ${message}` },
      { status: 500 }
    );
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}
