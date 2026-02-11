import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";
import puppeteer from "puppeteer";
import { FlashcardItem, FlashcardSide } from "@/types/flashcard";
import fs from "fs";
import path from "path";

// ─── Layout constants (mm) ──────────────────────────────────
const CARD_W = 74; // mm
const CARD_H = 52; // mm
const COLS = 3;
const ROWS = 3;
const CARDS_PER_PAGE = COLS * ROWS; // 9
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

function renderCardCell(side: FlashcardSide, isCuttingLine: boolean, logoUrl: string, row: number, col: number): string {
  let borderStyle = "";
  if (isCuttingLine) {
    const b = "0.5px dashed #ccc";
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

  const textHtml = side.text
    ? `<div style="font-size:11pt;line-height:1.3;text-align:center;word-break:break-word;max-width:100%;background:rgba(255,255,255,0.85);padding:1mm 2mm;border-radius:0.75mm;position:relative;z-index:1;">${escapeHtml(side.text)}</div>`
    : "";

  return `<div style="position:relative;width:${CARD_W}mm;height:${CARD_H}mm;${borderStyle}box-sizing:border-box;overflow:hidden;">
    <img src="${logoUrl}" style="position:absolute;top:2mm;right:2mm;width:3mm;height:3mm;opacity:1;display:block;z-index:2;" />
    <div style="position:absolute;top:10.875mm;left:4mm;width:66mm;height:37.125mm;display:flex;flex-direction:column;align-items:center;justify-content:${justify};overflow:hidden;border-radius:1mm;">
      ${imageHtml}
      ${textHtml}
    </div>
  </div>`;
}

function buildPageHtml(
  cards: FlashcardItem[],
  pageIndex: number, // 0-based, always the front page index
  side: "front" | "back",
  logoUrl: string
): string {
  const start = pageIndex * CARDS_PER_PAGE;
  const pageCards = cards.slice(start, start + CARDS_PER_PAGE);
  const isCuttingLine = side === "front";

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
        gridHtml += renderCardCell(sideData, isCuttingLine, logoUrl, row, col);
      } else {
        // Empty cell
        let emptyBorder = "";
        if (isCuttingLine) {
          const b = "0.5px dashed #ccc";
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
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:${PAGE_W}mm;height:${PAGE_H}mm;">
      <div style="display:flex;flex-direction:column;">
        ${gridHtml}
      </div>
    </div>
  </div>`;
}

function buildFullHtml(cards: FlashcardItem[], logoUrl: string): string {
  const totalFrontPages = Math.ceil(cards.length / CARDS_PER_PAGE);
  let pagesHtml = "";

  for (let i = 0; i < totalFrontPages; i++) {
    // Front page (odd page in print: 1, 3, 5...)
    pagesHtml += buildPageHtml(cards, i, "front", logoUrl);
    // Back page (even page in print: 2, 4, 6...)
    pagesHtml += buildPageHtml(cards, i, "back", logoUrl);
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

// POST /api/worksheets/[id]/flashcard-pdf
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
  if (!worksheet || worksheet.type !== "flashcards") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const cards = (worksheet.blocks ?? []) as unknown as FlashcardItem[];
  if (cards.length === 0) {
    return NextResponse.json({ error: "No cards to export" }, { status: 400 });
  }

  const logoPath = path.join(process.cwd(), "public", "logo", "lingostar_logo_icon_flat.svg");
  const logoSvgRaw = fs.readFileSync(logoPath, "utf-8");
  const logoDataUri = `data:image/svg+xml,${encodeURIComponent(logoSvgRaw)}`;
  const html = buildFullHtml(cards, logoDataUri);

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
      waitUntil: "networkidle0",
      timeout: 30000,
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
    console.log(`[Flashcard PDF] Generated ${finalPdfBytes.length} bytes, ${Math.ceil(cards.length / CARDS_PER_PAGE) * 2} pages`);

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
    console.error("Flashcard PDF generation error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `PDF generation failed: ${message}` },
      { status: 500 }
    );
  }
}
