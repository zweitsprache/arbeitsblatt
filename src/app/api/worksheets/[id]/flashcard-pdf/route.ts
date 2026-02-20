import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";
import puppeteer from "puppeteer";
import { FlashcardItem, FlashcardSide } from "@/types/flashcard";
import fs from "fs";
import path from "path";

import { replaceEszett } from "@/lib/locale-utils";

// ─── Layout constants (mm) ──────────────────────────────────
const CARD_W = 74; // mm
const CARD_H = 52; // mm
const COLS = 3;
const ROWS = 3;
const CARDS_PER_PAGE = 8; // 8 cards per page, 9th grid cell always empty
const GRID_W = COLS * CARD_W; // 222mm
const GRID_H = ROWS * CARD_H; // 156mm
const PAGE_W = 297; // A4 landscape
const PAGE_H = 210;
const MARGIN_X = (PAGE_W - GRID_W) / 2; // 37.5mm
const MARGIN_Y = (PAGE_H - GRID_H) / 2; // 27mm

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\n/g, "<br>");
}

/** Escape HTML and make the first line semibold, render {{hl}}…{{/hl}} as yellow highlight, {{sup}}…{{/sup}} as superscript.
 *  When skipFirstLineBold is true (explicit fontWeight set), don't wrap the first line in <strong>. */
function escapeHtmlBoldFirst(str: string, skipFirstLineBold = false): string {
  const lines = str.split("\n");
  return lines
    .map((line, i) => {
      const escaped = line
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/\{\{hl\}\}(.*?)\{\{\/hl\}\}/g, '<span style="background:#5a4540;color:#fff;font-weight:600;padding:0 2px;border-radius:2px;">$1</span>')
        .replace(/\{\{sup\}\}(.*?)\{\{\/sup\}\}/g, '<sup style="font-size:0.65em;color:#888;font-weight:normal;">$1</sup>')
        .replace(/\{\{verb\}\}/g, "");
      return i === 0 && !skipFirstLineBold ? `<strong>${escaped}</strong>` : escaped;
    })
    .join("<br>");
}

/** Escape HTML for back pages: pronoun regular, verb form semibold, sup always regular */
function escapeHtmlBackPage(str: string): string {
  const lines = str.split("\n");
  return lines
    .map((line) => {
      const escaped = line
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/\{\{hl\}\}(.*?)\{\{\/hl\}\}/g, '<span style="background:#5a4540;color:#fff;font-weight:600;padding:0 2px;border-radius:2px;">$1</span>')
        .replace(/\{\{sup\}\}(.*?)\{\{\/sup\}\}/g, '<sup style="font-size:0.65em;color:#888;font-weight:normal;">$1</sup>')
        .replace(/\{\{verb\}\}/g, '</span><span style="font-weight:600;">');
      return `<span>${escaped}</span>`;
    })
    .join("<br>");
}

function renderCardCell(side: FlashcardSide, isCuttingLine: boolean, logoUrl: string, row: number, col: number, pageSide: "front" | "back"): string {
  let borderStyle = "";
  if (isCuttingLine) {
    const borderColor = pageSide === "back" ? "transparent" : "#ccc";
    const b = `0.5px dashed ${borderColor}`;
    borderStyle = `border-right:${b};border-bottom:${b};`;
    if (col === 0) borderStyle += `border-left:${b};`;
    if (row === 0) borderStyle += `border-top:${b};`;
  }

  let imageHtml = "";
  if (side.image) {
    const SUB_W = 66;
    const SUB_H = 37.125;
    const arStr = side.imageAspectRatio ?? "1:1";
    const [aw, ah] = arStr.split(":").map(Number);
    const ar = aw / ah;
    const scale = (side.imageScale ?? 100) / 100;
    let imgW: number, imgH: number;
    if (ar >= SUB_W / SUB_H) {
      imgW = SUB_W * scale;
      imgH = (SUB_W / ar) * scale;
    } else {
      imgH = SUB_H * scale;
      imgW = (SUB_H * ar) * scale;
    }
    imageHtml = `<img src="${side.image}" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:${imgW}mm;height:${imgH}mm;object-fit:cover;border-radius:1mm;" />`;
  }

  const justifyMap = { top: "flex-start", center: "center", bottom: "flex-end" };
  const justify = justifyMap[side.textPosition ?? "center"];

  const fontSize = side.fontSize ?? 11;
  const fontWeightVal = side.fontWeight === "bold" ? 700 : 400;
  const hasExplicitWeight = side.fontWeight === "bold";

  const textHtml = side.text
    ? `<div style="font-size:${fontSize}pt;font-weight:${fontWeightVal};line-height:1.3;text-align:center;word-break:break-word;max-width:100%;background:rgba(255,255,255,0.85);padding:1mm 2mm;border-radius:0.75mm;position:relative;z-index:1;">${pageSide === "back" ? escapeHtmlBackPage(side.text) : escapeHtmlBoldFirst(side.text, hasExplicitWeight)}</div>`
    : "";

  const logoHtml = pageSide === "front"
    ? `<img src="${logoUrl}" style="position:absolute;top:3mm;right:3mm;width:4.5mm;height:4.5mm;opacity:1;display:block;z-index:2;" />`
    : "";

  return `<div style="position:relative;width:${CARD_W}mm;height:${CARD_H}mm;${borderStyle}box-sizing:border-box;overflow:hidden;">
    ${logoHtml}
    <div style="position:absolute;top:0;left:4mm;width:66mm;height:${CARD_H}mm;display:flex;flex-direction:column;align-items:center;justify-content:${justify};overflow:hidden;border-radius:1mm;">
      ${imageHtml}
      ${textHtml}
    </div>
  </div>`;
}

function buildPageHtml(
  cards: FlashcardItem[],
  pageIndex: number,
  side: "front" | "back",
  logoUrl: string,
  headerHtml: string,
  footerHtml: string
): string {
  const start = pageIndex * CARDS_PER_PAGE;
  const pageCards = cards.slice(start, start + CARDS_PER_PAGE);
  const isCuttingLine = true;

  let gridHtml = "";
  for (let row = 0; row < ROWS; row++) {
    gridHtml += `<div style="display:flex;">`;
    for (let col = 0; col < COLS; col++) {
      // For back side, reverse column order so cards align when flipped
      const effectiveCol = side === "back" ? COLS - 1 - col : col;
      const idx = row * COLS + effectiveCol;
      const card = pageCards[idx];

      if (card) {
        const sideData = side === "front" ? card.front : card.back;
        // Treat blank cards (no text, no image) as empty cells
        const isBlank = !sideData.text && !sideData.image;
        if (isBlank) {
          let emptyBorder = "";
          if (isCuttingLine) {
            const borderColor = side === "back" ? "transparent" : "#ccc";
            const b = `0.5px dashed ${borderColor}`;
            emptyBorder = `border-right:${b};border-bottom:${b};`;
            if (col === 0) emptyBorder += `border-left:${b};`;
            if (row === 0) emptyBorder += `border-top:${b};`;
          }
          gridHtml += `<div style="width:${CARD_W}mm;height:${CARD_H}mm;${emptyBorder}box-sizing:border-box;"></div>`;
        } else {
          gridHtml += renderCardCell(sideData, isCuttingLine, logoUrl, row, col, side);
        }
      } else {
        // Empty cell
        let emptyBorder = "";
        if (isCuttingLine) {
          const borderColor = side === "back" ? "transparent" : "#ccc";
          const b = `0.5px dashed ${borderColor}`;
          emptyBorder = `border-right:${b};border-bottom:${b};`;
          if (col === 0) emptyBorder += `border-left:${b};`;
          if (row === 0) emptyBorder += `border-top:${b};`;
        }
        gridHtml += `<div style="width:${CARD_W}mm;height:${CARD_H}mm;${emptyBorder}box-sizing:border-box;"></div>`;
      }
    }
    gridHtml += `</div>`;
  }

  return `<div class="page">
    ${headerHtml}
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:${PAGE_W}mm;height:${PAGE_H}mm;">
      <div style="display:flex;flex-direction:column;">
        ${gridHtml}
      </div>
    </div>
    ${footerHtml}
  </div>`;
}

function buildFullHtml(cards: FlashcardItem[], logoUrl: string, worksheetId: string, singleSided: boolean): string {
  const totalFrontPages = Math.ceil(cards.length / CARDS_PER_PAGE);
  const currentYear = new Date().getFullYear();
  const currentDate = new Date().toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" });

  const headerHtml = `<div style="position:absolute;top:0;left:0;right:0;display:flex;justify-content:flex-end;padding:10mm 15mm 0 15mm;z-index:10;">
    <img src="${logoUrl}" style="width:6mm;height:auto;" />
  </div>`;

  const footerHtml = `<div style="position:absolute;bottom:0;left:0;right:0;font-size:7pt;font-family:'Encode Sans',sans-serif;color:#666;padding:0 15mm 5mm 15mm;display:flex;justify-content:space-between;align-items:flex-end;z-index:10;">
    <div style="text-align:left;line-height:1.4;">&copy; ${currentYear} lingostar | Marcel Allenspach<br/>Alle Rechte vorbehalten</div>
    <div style="text-align:right;line-height:1.4;">${worksheetId}<br/>${currentDate}</div>
  </div>`;

  let pagesHtml = "";

  for (let i = 0; i < totalFrontPages; i++) {
    pagesHtml += buildPageHtml(cards, i, "front", logoUrl, headerHtml, footerHtml);
    if (!singleSided) {
      pagesHtml += buildPageHtml(cards, i, "back", logoUrl, headerHtml, footerHtml);
    }
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
  .page:last-child {
    page-break-after: auto;
  }
  img {
    display: block;
  }
</style>
</head>
<body>
${pagesHtml}
</body>
</html>`;
}

// ─── Re-pad blank cards to clean page boundaries ────────────
// Blank cards (no text, no image on both sides) are used as page-break padding
// between verb groups. This function strips them all out, detects the groups they
// separated, and re-inserts padding so each group starts on a fresh page of
// `pageSize` cards.
function isBlankCard(card: FlashcardItem): boolean {
  return !card.front.text && !card.front.image && !card.back.text && !card.back.image;
}

function repadCards(cards: FlashcardItem[], pageSize: number): FlashcardItem[] {
  // Split into groups separated by one or more blank cards
  const groups: FlashcardItem[][] = [];
  let current: FlashcardItem[] = [];

  for (const card of cards) {
    if (isBlankCard(card)) {
      if (current.length > 0) {
        groups.push(current);
        current = [];
      }
      // discard blank
    } else {
      current.push(card);
    }
  }
  if (current.length > 0) {
    groups.push(current);
  }

  // Single group or no blanks found → return without padding
  if (groups.length <= 1) {
    return groups[0] ?? [];
  }

  // Multiple groups → re-pad each group (except the last) to pageSize boundaries
  const result: FlashcardItem[] = [];
  for (let g = 0; g < groups.length; g++) {
    result.push(...groups[g]);
    if (g < groups.length - 1) {
      const remainder = result.length % pageSize;
      if (remainder !== 0) {
        const blanks = pageSize - remainder;
        for (let i = 0; i < blanks; i++) {
          result.push({
            id: `pad-${g}-${i}`,
            front: { text: "" },
            back: { text: "" },
          });
        }
      }
    }
  }
  return result;
}

// POST /api/worksheets/[id]/flashcard-pdf
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  const { id } = await params;
  const locale = (_req.nextUrl.searchParams.get("locale") || "DE").toUpperCase() as "DE" | "CH";
  const isSwiss = locale === "CH";

  const worksheet = await prisma.worksheet.findFirst({
    where: { id, userId } as Parameters<typeof prisma.worksheet.findFirst>[0] extends { where?: infer W } ? W : never,
  });
  if (!worksheet || worksheet.type !== "flashcards") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let cards = (worksheet.blocks ?? []) as unknown as FlashcardItem[];
  if (cards.length === 0) {
    return NextResponse.json({ error: "No cards to export" }, { status: 400 });
  }

  // ── Normalise blank-card padding ──────────────────────────
  // The modal inserts blank cards (empty front+back) to pad each verb group
  // to page boundaries. Strip those blanks and re-pad to CARDS_PER_PAGE so
  // the layout is always correct regardless of how the data was originally saved.
  cards = repadCards(cards, CARDS_PER_PAGE);

  if (isSwiss) {
    cards = replaceEszett(cards);
  }

  const settings = (worksheet.settings ?? {}) as { singleSided?: boolean };
  const singleSided = settings.singleSided === true;

  const logoPath = path.join(process.cwd(), "public", "logo", "lingostar_logo_icon_flat.svg");
  const logoSvgRaw = fs.readFileSync(logoPath, "utf-8");
  const logoDataUri = `data:image/svg+xml,${encodeURIComponent(logoSvgRaw)}`;
  const html = buildFullHtml(cards, logoDataUri, worksheet.id, singleSided);

  try {
    console.log(`[Flashcard PDF] Generating PDF for ${cards.length} cards`);

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
      waitUntil: "domcontentloaded",
      timeout: 120000,
    });

    // Wait for fonts and images to load
    await page.evaluateHandle("document.fonts.ready");
    await page.evaluate(() =>
      Promise.all(
        Array.from(document.images)
          .filter((img) => !img.complete)
          .map((img) => new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          }))
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
    const frontPages = Math.ceil(cards.length / CARDS_PER_PAGE);
    const totalPages = singleSided ? frontPages : frontPages * 2;
    console.log(`[Flashcard PDF] Generated ${finalPdfBytes.length} bytes, ${totalPages} pages (singleSided=${singleSided})`);

    const shortId = worksheet.id.slice(0, 16);
    const filename = `${shortId}_${locale}.pdf`;

    return new NextResponse(Buffer.from(finalPdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Flashcard PDF generation error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `PDF generation failed: ${message}` },
      { status: 500 }
    );
  }
}
