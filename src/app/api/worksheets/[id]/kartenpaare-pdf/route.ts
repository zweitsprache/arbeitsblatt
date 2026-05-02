import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";
import { launchBrowser, fetchImageAsDataUri } from "@/lib/puppeteer";
import { FlashcardItem, FlashcardSide, FlashcardSettings } from "@/types/flashcard";
import { resolveSubProfileHeaderFooter } from "@/types/worksheet";
import type { BrandProfile } from "@/types/worksheet";
import fs from "fs";
import path from "path";
import { normalizeToHtml, hasMarkdownSyntax, hasHtmlMarkup } from "@/lib/markdown-to-html";

// ─── Brand info passed through rendering ────────────────────
interface BrandInfo {
  primaryColor: string;
  accentColor: string;
  logoUrl: string;
  footerLeft: string;
  footerRight: string;
  googleFontsUrl: string;
  headerFooterFont: string;
  organization: string;
}

// ─── Layout constants (mm) ──────────────────────────────────
const CARD_W = 45;
const CARD_H = 35;
const COLS = 4;
const ROWS = 7;
const GRID_CELLS = COLS * ROWS; // 28
const GRID_W = COLS * CARD_W; // 180mm
const GRID_H = ROWS * CARD_H; // 210mm
const PAGE_W = 210; // A4 portrait
const PAGE_H = 297;
const MARGIN_X = (PAGE_W - GRID_W) / 2; // 15mm
const MARGIN_Y = (PAGE_H - GRID_H) / 2; // 43.5mm

/** Deterministic seeded random (xorshift32) keyed on worksheetId */
function seededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return function () {
    h ^= h << 13;
    h ^= h >> 17;
    h ^= h << 5;
    return (h >>> 0) / 0xffffffff;
  };
}

/**
 * Assign a unique 3-digit solution number to each card.
 * A-card gets numbers[i], B-card gets 999 - numbers[i].
 * Both are always 3-digit (100–899) and all assigned values are unique.
 */
function assignCardNumbers(count: number, worksheetId: string): number[] {
  const rand = seededRandom(worksheetId);
  // pool: 100–498 → pairs with 501–899 (avoids mirrored duplicates in the pool)
  const pool: number[] = [];
  for (let n = 100; n <= 498; n++) pool.push(n);
  // Fisher-Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\n/g, "<br>");
}

/** Render one card cell — either content side or label back side */
function renderContentCell(
  side: FlashcardSide,
  row: number,
  col: number,
  isBack: boolean,
  solutionKey?: number,
  letter?: "A" | "B",
  brand?: BrandInfo
): string {
  const borderColor = isBack ? "transparent" : "#ccc";
  const b = `0.5px dashed ${borderColor}`;
  let borderStyle = `border-right:${b};border-bottom:${b};`;
  if (col === 0) borderStyle += `border-left:${b};`;
  if (row === 0) borderStyle += `border-top:${b};`;

  let imageHtml = "";
  if (side.image) {
    const SUB_W = CARD_W - 6;
    const SUB_H = CARD_H - 6;
    const arStr = side.imageAspectRatio ?? "1:1";
    const [aw, ah] = arStr.split(":").map(Number);
    const ar = aw / ah;
    let imgW: number, imgH: number;
    if (ar >= SUB_W / SUB_H) {
      imgW = SUB_W;
      imgH = SUB_W / ar;
    } else {
      imgH = SUB_H;
      imgW = SUB_H * ar;
    }
    imageHtml = `<img src="${side.image}" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:${imgW}mm;height:${imgH}mm;object-fit:cover;" />`;
  }

  const rawText = side.text ?? "";
  const isHtmlContent = hasHtmlMarkup(rawText);
  const isMarkdown = !isHtmlContent && hasMarkdownSyntax(rawText);
  const hasTextContent = rawText.replace(/<[^>]*>/g, "").trim() !== "";

  const fontSize = side.fontSize ?? 10;
  const fontWeightVal = side.fontWeight === "bold" ? 700 : 400;
  const textColor = side.textColor || "#000";
  const justifyMap: Record<string, string> = { top: "flex-start", center: "center", bottom: "flex-end" };
  const justify = justifyMap[side.textPosition ?? "center"] ?? "center";

  let textHtml = "";
  if (hasTextContent) {
    const textInner = isHtmlContent
      ? rawText
      : isMarkdown
        ? normalizeToHtml(rawText)
        : escapeHtml(rawText);
    textHtml = `<div class="card-content" style="font-size:${fontSize}pt;${isHtmlContent || isMarkdown ? "" : `font-weight:${fontWeightVal};color:${textColor};`}line-height:1.3;text-align:center;word-break:break-word;max-width:100%;background:rgba(255,255,255,0.85);padding:1mm 1.5mm;border-radius:0.5mm;position:relative;z-index:1;">${textInner}</div>`;
  }

  const SMALL_ICON = 3.5;
  const iconColor = letter === "A" ? (brand?.primaryColor ?? "#3a4f40") : (brand?.accentColor ?? "#2980b9");
  const iconHtml = letter
    ? (letter === "A"
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="${SMALL_ICON}mm" height="${SMALL_ICON}mm" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 22 12 12 22 2 12"/></svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="${SMALL_ICON}mm" height="${SMALL_ICON}mm" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>`)
    : "";

  const keyHtml = solutionKey != null
    ? `<div style="position:absolute;top:2.5mm;right:2.5mm;font-size:5pt;font-family:'Encode Sans',sans-serif;font-weight:700;color:#bbb;letter-spacing:0.3pt;z-index:2;line-height:1;">${solutionKey}</div>`
    : "";
  const iconBadgeHtml = iconHtml
    ? `<div style="position:absolute;top:2.5mm;left:2.5mm;z-index:2;line-height:0;">${iconHtml}</div>`
    : "";

  return `<div style="position:relative;width:${CARD_W}mm;height:${CARD_H}mm;${borderStyle}box-sizing:border-box;overflow:hidden;">
    ${iconBadgeHtml}
    ${keyHtml}
    <div style="position:absolute;top:0;left:2mm;width:${CARD_W - 4}mm;height:${CARD_H}mm;display:flex;flex-direction:column;align-items:center;justify-content:${justify};overflow:hidden;">
      ${imageHtml}
      ${textHtml}
    </div>
  </div>`;
}


function renderEmptyCell(row: number, col: number, isBack: boolean): string {
  const borderColor = isBack ? "transparent" : "#ccc";
  const b = `0.5px dashed ${borderColor}`;
  let borderStyle = `border-right:${b};border-bottom:${b};`;
  if (col === 0) borderStyle += `border-left:${b};`;
  if (row === 0) borderStyle += `border-top:${b};`;
  return `<div style="width:${CARD_W}mm;height:${CARD_H}mm;${borderStyle}box-sizing:border-box;"></div>`;
}

/** Render an icon-only back cell (Diamond for A, Circle for B) */
function renderBackCell(
  letter: "A" | "B",
  row: number,
  col: number,
  brand: BrandInfo
): string {
  const b = `0.5px dashed transparent`;
  let borderStyle = `border-right:${b};border-bottom:${b};`;
  if (col === 0) borderStyle += `border-left:${b};`;
  if (row === 0) borderStyle += `border-top:${b};`;

  const ICON_MM = 18;
  const color = letter === "A" ? brand.primaryColor : brand.accentColor;

  // Inline SVG — Diamond: rotated square; Circle: circle
  const iconSvg = letter === "A"
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="${ICON_MM}mm" height="${ICON_MM}mm" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 22 12 12 22 2 12"/></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="${ICON_MM}mm" height="${ICON_MM}mm" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>`;

  return `<div style="position:relative;width:${CARD_W}mm;height:${CARD_H}mm;${borderStyle}box-sizing:border-box;display:flex;align-items:center;justify-content:center;">
  ${iconSvg}
</div>`;
}

/**
 * Build one page.
 * mode: "A" / "B"       → front side with card content
 *        "A-back" / "B-back" → back side with icon (columns reversed for duplex)
 */
function buildPage(
  cards: FlashcardItem[],
  pageIndex: number,
  mode: "A" | "B" | "A-back" | "B-back",
  worksheetId: string,
  cardNumbers: number[],
  brand: BrandInfo
): string {
  const start = pageIndex * GRID_CELLS;
  const pageCards = cards.slice(start, start + GRID_CELLS);
  const isBack = mode === "A-back" || mode === "B-back";
  const letter = mode === "A" || mode === "A-back" ? "A" : "B";

  let gridHtml = "";
  for (let row = 0; row < ROWS; row++) {
    gridHtml += `<div style="display:flex;height:${CARD_H}mm;line-height:0;">`;
    for (let col = 0; col < COLS; col++) {
      // Reverse columns on back pages so cards align when flipped (duplex long-edge)
      const effectiveCol = isBack ? COLS - 1 - col : col;
      const idx = row * COLS + effectiveCol;
      const absoluteIdx = start + idx;
      const card = pageCards[idx];
      if (!card) {
        gridHtml += renderEmptyCell(row, col, isBack);
      } else if (isBack) {
        gridHtml += renderBackCell(letter, row, col, brand);
      } else {
        const side: FlashcardSide = mode === "A" ? card.front : card.back;
        const baseNum = cardNumbers[absoluteIdx];
        const solutionKey = mode === "A" ? baseNum : 999 - baseNum;
        gridHtml += renderContentCell(side, row, col, false, solutionKey, letter, brand);
      }
    }
    gridHtml += `</div>`;
  }

  const currentYear = new Date().getFullYear();
  const currentDate = new Date().toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" });
  const footerFont = brand.headerFooterFont
    .split(",")
    .map((f) => {
      const t = f.trim();
      return t.includes(" ") ? `"${t}"` : t;
    })
    .join(", ");

  function resolveFooterText(brandText: string, fallback: string): string {
    const text = brandText || fallback;
    return text
      .replace(/\{worksheet_uuid\}/g, worksheetId.toUpperCase())
      .replace(/\{current_date\}/g, currentDate)
      .replace(/\{date\}/g, currentDate)
      .replace(/\{current_year\}/g, String(currentYear))
      .replace(/\{year\}/g, String(currentYear))
      .replace(/\{organization\}/g, brand.organization || "");
  }

  const footerLeftText = resolveFooterText(
    brand.footerLeft,
    `&copy; ${currentYear} ${brand.organization || "lingostar"}`
  );
  const footerRightText = resolveFooterText(
    brand.footerRight,
    `{worksheet_uuid}<br/>${currentDate}`
  );

  const headerHtml = `<div style="position:absolute;top:0;left:0;right:0;display:flex;justify-content:flex-end;padding:10mm 15mm 0 15mm;z-index:10;">
    <img src="${brand.logoUrl}" style="width:6mm;height:auto;" />
  </div>`;

  const footerHtml = `<div style="position:absolute;bottom:0;left:0;width:100%;height:25mm;padding:0 15mm 8mm 15mm;box-sizing:border-box;display:flex;justify-content:space-between;align-items:flex-end;font-size:7pt;font-family:${footerFont};font-weight:400;line-height:1.5;color:#666;z-index:10;">
    <div class="footer-col" style="flex:1;min-width:0;text-align:left;">${footerLeftText}</div>
    <div class="footer-col" style="flex:1;min-width:0;"></div>
    <div class="footer-col" style="flex:1;min-width:0;text-align:right;">${footerRightText}</div>
  </div>`;

  return `<div class="page">
    ${headerHtml}
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:${PAGE_W}mm;height:${PAGE_H}mm;">
      <div style="display:flex;flex-direction:column;line-height:0;">
        ${gridHtml}
      </div>
    </div>
    ${footerHtml}
  </div>`;
}

function buildFullHtml(
  cards: FlashcardItem[],
  worksheetId: string,
  brand: BrandInfo
): string {
  const totalPages = Math.ceil(cards.length / GRID_CELLS);
  const cardNumbers = assignCardNumbers(cards.length, worksheetId);
  let pagesHtml = "";

  // Per-batch sequence for duplex printing: A-front → A-back → B-front → B-back
  for (let i = 0; i < totalPages; i++) {
    pagesHtml += buildPage(cards, i, "A", worksheetId, cardNumbers, brand);
    pagesHtml += buildPage(cards, i, "A-back", worksheetId, cardNumbers, brand);
    pagesHtml += buildPage(cards, i, "B", worksheetId, cardNumbers, brand);
    pagesHtml += buildPage(cards, i, "B-back", worksheetId, cardNumbers, brand);
  }

  const fontsLink = brand.googleFontsUrl
    ? `<link href="${brand.googleFontsUrl}" rel="stylesheet"><link href="https://fonts.googleapis.com/css2?family=Encode+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">`
    : `<link href="https://fonts.googleapis.com/css2?family=Encode+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
${fontsLink}
<style>
  @page {
    size: A4 portrait;
    margin: 0;
  }
  * { margin: 0; padding: 0; }
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
    page-break-after: always;
    overflow: hidden;
    position: relative;
  }
  .page:last-child { page-break-after: auto; }
  img { display: block; }
  .card-content p { margin: 0 0 0.4em 0; }
  .card-content p:last-child { margin-bottom: 0; }
  .footer-col p { margin: 0; }
  .footer-col > * { margin: 0; }
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

// GET /api/worksheets/[id]/kartenpaare-pdf
export async function GET(
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
  if (!worksheet || worksheet.type !== "kartenpaare") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let cards = (worksheet.blocks ?? []) as unknown as FlashcardItem[];
  if (cards.length === 0) {
    return NextResponse.json({ error: "No cards to export" }, { status: 400 });
  }

  // Convert external image URLs to data URIs
  const allImageUrls = cards.flatMap((c) =>
    [c.front.image, c.back.image].filter(Boolean)
  ) as string[];
  const uniqueImageUrls = [...new Set(allImageUrls)];
  if (uniqueImageUrls.length > 0) {
    const dataUris = await Promise.all(uniqueImageUrls.map((url) => fetchImageAsDataUri(url)));
    const imageMap = new Map<string, string>();
    uniqueImageUrls.forEach((url, i) => {
      if (dataUris[i]) imageMap.set(url, dataUris[i]);
    });
    cards = cards.map((card) => ({
      ...card,
      front: {
        ...card.front,
        image: card.front.image ? imageMap.get(card.front.image) ?? card.front.image : card.front.image,
      },
      back: {
        ...card.back,
        image: card.back.image ? imageMap.get(card.back.image) ?? card.back.image : card.back.image,
      },
    }));
  }

  const worksheetSettings = (worksheet.settings ?? {}) as unknown as FlashcardSettings;

  // ── Resolve brand ─────────────────────────────────────────
  const DEFAULT_PRIMARY = "#3a4f40";
  const DEFAULT_ACCENT = "#2980b9";
  let brand: BrandInfo = {
    primaryColor: DEFAULT_PRIMARY,
    accentColor: DEFAULT_ACCENT,
    logoUrl: "",
    footerLeft: "",
    footerRight: "",
    googleFontsUrl: "",
    headerFooterFont: "Encode Sans, sans-serif",
    organization: "",
  };

  if (worksheetSettings.brandProfileId) {
    try {
      const dbBrand = await (prisma.brandProfile as unknown as {
        findUnique: (args: { where: { id: string }; include: { subProfiles: { orderBy: { name: "asc" } } } }) => Promise<(BrandProfile & { subProfiles: BrandProfile["subProfiles"] }) | null>;
      }).findUnique({
        where: { id: worksheetSettings.brandProfileId },
        include: { subProfiles: { orderBy: { name: "asc" } } },
      });
      if (dbBrand) {
        // Load logo
        let logoDataUri = "";
        if (dbBrand.logo) {
          try {
            const logoPath = path.join(process.cwd(), "public", dbBrand.logo.replace(/^\//, ""));
            const logoRaw = fs.readFileSync(logoPath, "utf-8");
            logoDataUri = `data:image/svg+xml,${encodeURIComponent(logoRaw)}`;
          } catch { /* ignore */ }
        }

        let footerLeft = dbBrand.footerLeft ?? "";
        let footerRight = dbBrand.footerRight ?? "";

        const subHeaders = resolveSubProfileHeaderFooter(
          dbBrand as unknown as BrandProfile,
          worksheetSettings.subProfileId,
          1
        );
        if (subHeaders) {
          footerLeft = subHeaders.footerLeft;
          footerRight = subHeaders.footerRight;
        }

        brand = {
          primaryColor: dbBrand.primaryColor || DEFAULT_PRIMARY,
          accentColor: dbBrand.accentColor || DEFAULT_ACCENT,
          logoUrl: logoDataUri,
          footerLeft,
          footerRight,
          googleFontsUrl: dbBrand.googleFontsUrl ?? "",
          headerFooterFont: dbBrand.headerFooterFont ?? "Encode Sans, sans-serif",
          organization: dbBrand.organization ?? "",
        };
      }
    } catch (err) {
      console.warn("[Kartenpaare PDF] Could not load brand:", err);
    }
  }

  // Fallback logo if brand had none
  if (!brand.logoUrl) {
    const logoPath = path.join(process.cwd(), "public", "logo", "lingostar_logo_icon_flat.svg");
    const logoSvgRaw = fs.readFileSync(logoPath, "utf-8");
    brand.logoUrl = `data:image/svg+xml,${encodeURIComponent(logoSvgRaw)}`;
  }

  const html = buildFullHtml(cards, worksheet.id, brand);

  try {
    console.log(`[Kartenpaare PDF] Generating PDF for ${cards.length} cards`);
    const browser = await launchBrowser();
    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.evaluateHandle("document.fonts.ready");
    await page.evaluate(() =>
      Promise.all(
        Array.from(document.images).map(
          (img) =>
            img.complete
              ? Promise.resolve()
              : new Promise<void>((res) => { img.onload = () => res(); img.onerror = () => res(); })
        )
      )
    );

    const pdfBuffer = await page.pdf({
      format: "A4",
      landscape: false,
      printBackground: true,
    });

    await browser.close();

    return new NextResponse(Buffer.from(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="kartenpaare-${id}.pdf"`,
      },
    });
  } catch (err) {
    console.error("[Kartenpaare PDF] Error:", err);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }
}
