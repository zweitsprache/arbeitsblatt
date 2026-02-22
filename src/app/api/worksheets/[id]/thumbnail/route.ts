import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";
import { launchBrowser } from "@/lib/puppeteer";
import sharp from "sharp";

// Thumbnail dimensions
const THUMB_WIDTH = 400;

// GET /api/worksheets/[id]/thumbnail — generate or return cached thumbnail
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  const { id } = await params;

  // Check if this is an ebook
  const ebook = await prisma.eBook.findFirst({
    where: { id, userId },
    select: { id: true, slug: true, thumbnail: true, title: true },
  });

  if (ebook) {
    // Return cached thumbnail if available
    if (ebook.thumbnail) {
      const buf = Buffer.from(ebook.thumbnail.replace(/^data:image\/\w+;base64,/, ""), "base64");
      return new NextResponse(buf, {
        headers: {
          "Content-Type": "image/webp",
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        },
      });
    }

    // Generate thumbnail for ebook
    const thumbBase64 = await generateEbookThumbnail(ebook.slug);
    if (thumbBase64) {
      await prisma.eBook.update({ where: { id }, data: { thumbnail: thumbBase64 } });
      const buf = Buffer.from(thumbBase64.replace(/^data:image\/\w+;base64,/, ""), "base64");
      return new NextResponse(buf, {
        headers: {
          "Content-Type": "image/webp",
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        },
      });
    }
    return NextResponse.json({ error: "Failed to generate thumbnail" }, { status: 500 });
  }

  // Try worksheet (all types stored in Worksheet table)
  const worksheet = await prisma.worksheet.findFirst({
    where: { id, userId },
    select: {
      id: true,
      type: true,
      slug: true,
      title: true,
      thumbnail: true,
      blocks: true,
      settings: true,
    },
  });

  if (!worksheet) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Return cached thumbnail if available
  if (worksheet.thumbnail) {
    const buf = Buffer.from(worksheet.thumbnail.replace(/^data:image\/\w+;base64,/, ""), "base64");
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  }

  // Generate thumbnail based on type
  let thumbBase64: string | null = null;

  if (worksheet.type === "worksheet") {
    thumbBase64 = await generateWorksheetThumbnail(worksheet.slug, worksheet.settings);
  } else if (worksheet.type === "cards") {
    thumbBase64 = await generateCardsThumbnail(worksheet.blocks, worksheet.settings);
  } else if (worksheet.type === "flashcards") {
    thumbBase64 = await generateFlashcardsThumbnail(worksheet.blocks);
  } else if (worksheet.type === "grammar-table") {
    thumbBase64 = await generateGrammarTableThumbnail(worksheet.blocks, worksheet.title);
  } else {
    // Fallback: try worksheet-style thumbnail
    thumbBase64 = await generateWorksheetThumbnail(worksheet.slug, worksheet.settings);
  }

  if (thumbBase64) {
    await prisma.worksheet.update({ where: { id }, data: { thumbnail: thumbBase64 } });
    const buf = Buffer.from(thumbBase64.replace(/^data:image\/\w+;base64,/, ""), "base64");
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  }

  return NextResponse.json({ error: "Failed to generate thumbnail" }, { status: 500 });
}

// ─── Helpers ──────────────────────────────────────────────

// launchBrowser imported from @/lib/puppeteer

function getBaseUrl() {
  return process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : (process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000");
}

async function screenshotToWebp(screenshot: Uint8Array, isLandscape: boolean): Promise<string> {
  // A4 aspect ratios
  const aspectRatio = isLandscape ? 210 / 297 : 297 / 210;
  const thumbH = Math.round(THUMB_WIDTH * aspectRatio);

  const webpBuffer = await sharp(Buffer.from(screenshot))
    .resize(THUMB_WIDTH, thumbH, { fit: "cover", position: "top" })
    .webp({ quality: 80 })
    .toBuffer();

  return `data:image/webp;base64,${webpBuffer.toString("base64")}`;
}

async function hideDevOverlays(page: Awaited<ReturnType<Awaited<ReturnType<typeof launchBrowser>>["newPage"]>>) {
  await page.evaluate(() => {
    document
      .querySelectorAll('nextjs-portal, [id^="__next-build"], [id^="__nextjs"]')
      .forEach((el) => el.remove());
    const style = document.createElement("style");
    style.textContent =
      "nextjs-portal, [data-nextjs-dialog-overlay], [data-nextjs-toast] { display: none !important; }";
    document.head.appendChild(style);
  });
}

// ─── Worksheet (has print page) ─────────────────────────

async function generateWorksheetThumbnail(
  slug: string,
  settingsJson: unknown
): Promise<string | null> {
  const settings = (settingsJson as Record<string, unknown>) || {};
  const isLandscape = settings.orientation === "landscape";
  const baseUrl = getBaseUrl();
  const printUrl = `${baseUrl}/de/worksheet/${slug}/print`;

  // Viewport matching A4 proportions
  const viewportW = 794;
  const viewportH = isLandscape ? Math.round(viewportW * (210 / 297)) : Math.round(viewportW * (297 / 210));

  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: viewportW, height: viewportH, deviceScaleFactor: 2 });
    await page.goto(printUrl, { waitUntil: "networkidle0", timeout: 30000 });
    await page.evaluateHandle("document.fonts.ready");
    await new Promise((r) => setTimeout(r, 500));
    await hideDevOverlays(page);

    const screenshot = await page.screenshot({ type: "png" });
    return screenshotToWebp(screenshot, isLandscape);
  } catch (err) {
    console.error("[Thumbnail] Worksheet generation failed:", err);
    return null;
  } finally {
    await browser.close();
  }
}

// ─── Ebook (has print page) ─────────────────────────────

async function generateEbookThumbnail(slug: string): Promise<string | null> {
  const baseUrl = getBaseUrl();
  const printUrl = `${baseUrl}/de/ebook/${slug}/print`;

  const viewportW = 794;
  const viewportH = Math.round(viewportW * (297 / 210)); // portrait

  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: viewportW, height: viewportH, deviceScaleFactor: 2 });
    await page.goto(printUrl, { waitUntil: "networkidle0", timeout: 30000 });
    await page.evaluateHandle("document.fonts.ready");
    await new Promise((r) => setTimeout(r, 500));
    await hideDevOverlays(page);

    const screenshot = await page.screenshot({ type: "png" });
    return screenshotToWebp(screenshot, false);
  } catch (err) {
    console.error("[Thumbnail] Ebook generation failed:", err);
    return null;
  } finally {
    await browser.close();
  }
}

// ─── Cards (inline HTML) ────────────────────────────────

async function generateCardsThumbnail(
  blocksJson: unknown,
  settingsJson: unknown
): Promise<string | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blocks = (Array.isArray(blocksJson) ? blocksJson : []) as any[];
  const cards = blocks.slice(0, 4); // Show up to 4 cards

  const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Asap+Condensed:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 297mm; height: 210mm; font-family: 'Asap Condensed', sans-serif; background: white; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; width: 100%; height: 100%; }
  .card { border: 1px solid #e5e7eb; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 8mm; gap: 4mm; overflow: hidden; }
  .card-text { font-size: 14pt; text-align: center; color: #374151; max-height: 40%; overflow: hidden; word-break: break-word; }
  .card-img { width: 80%; aspect-ratio: 16/9; background: #f3f4f6; border-radius: 4px; overflow: hidden; display: flex; align-items: center; justify-content: center; }
  .card-img img { width: 100%; height: 100%; object-fit: cover; }
  .empty { background: #fafafa; }
</style>
</head><body>
<div class="grid">
  ${cards
    .map(
      (c) => `<div class="card">
    <div class="card-text">${escapeHtml(c.text || "")}</div>
    <div class="card-img">${c.image ? `<img src="${c.image}">` : ""}</div>
  </div>`
    )
    .join("")}
  ${Array(Math.max(0, 4 - cards.length))
    .fill('<div class="card empty"></div>')
    .join("")}
</div>
</body></html>`;

  return renderInlineHtml(html, true);
}

// ─── Flashcards (inline HTML) ───────────────────────────

async function generateFlashcardsThumbnail(blocksJson: unknown): Promise<string | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blocks = (Array.isArray(blocksJson) ? blocksJson : []) as any[];
  const cards = blocks.slice(0, 9); // Show up to 9 cards (3×3)

  const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Asap+Condensed:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 297mm; height: 210mm; font-family: 'Asap Condensed', sans-serif; background: white; padding: 5mm; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(3, 1fr); width: 100%; height: 100%; gap: 3mm; }
  .fc { border: 1.5px solid #e5e7eb; border-radius: 3px; display: flex; align-items: center; justify-content: center; text-align: center; padding: 3mm; font-size: 11pt; color: #374151; overflow: hidden; background: white; }
  .empty { background: #fafafa; border-style: dashed; }
</style>
</head><body>
<div class="grid">
  ${cards
    .map((c) => {
      const text = c.front?.text || c.text || "";
      return `<div class="fc">${escapeHtml(text)}</div>`;
    })
    .join("")}
  ${Array(Math.max(0, 9 - cards.length))
    .fill('<div class="fc empty"></div>')
    .join("")}
</div>
</body></html>`;

  return renderInlineHtml(html, true);
}

// ─── Grammar Table (inline HTML) ────────────────────────

async function generateGrammarTableThumbnail(
  blocksJson: unknown,
  title: string
): Promise<string | null> {
  // Grammar table data is stored in blocks as the table structure
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blocks = blocksJson as any;

  // Try to extract some table data for a meaningful preview
  let tableHtml = "";

  if (blocks && typeof blocks === "object" && !Array.isArray(blocks)) {
    // Verb conjugation table
    const conjugations = blocks.conjugations || {};
    const verbs = blocks.verbs || [];
    const verbNames = Array.isArray(verbs)
      ? verbs.map((v: { infinitive?: string }) => v.infinitive || "").filter(Boolean).slice(0, 6)
      : [];

    if (verbNames.length > 0) {
      const persons = ["ich", "du", "er/sie/es", "wir", "ihr", "sie/Sie"];
      tableHtml = `
        <table>
          <thead><tr><th></th>${verbNames.map((v: string) => `<th>${escapeHtml(v)}</th>`).join("")}</tr></thead>
          <tbody>${persons
            .map(
              (p) =>
                `<tr><td class="person">${p}</td>${verbNames
                  .map(() => `<td class="conj">—</td>`)
                  .join("")}</tr>`
            )
            .join("")}</tbody>
        </table>`;
    }
  }

  if (Array.isArray(blocks)) {
    // Adjective declination or other array format
    tableHtml = `
      <table>
        <thead><tr><th>Kasus</th><th>Maskulin</th><th>Feminin</th><th>Neutrum</th><th>Plural</th></tr></thead>
        <tbody>
          <tr><td class="person">Nominativ</td><td>der</td><td>die</td><td>das</td><td>die</td></tr>
          <tr><td class="person">Akkusativ</td><td>den</td><td>die</td><td>das</td><td>die</td></tr>
          <tr><td class="person">Dativ</td><td>dem</td><td>der</td><td>dem</td><td>den</td></tr>
          <tr><td class="person">Genitiv</td><td>des</td><td>der</td><td>des</td><td>der</td></tr>
        </tbody>
      </table>`;
  }

  if (!tableHtml) {
    tableHtml = `<div class="placeholder">Grammatiktabelle</div>`;
  }

  const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Asap+Condensed:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 297mm; height: 210mm; font-family: 'Asap Condensed', sans-serif; background: white; padding: 10mm; display: flex; flex-direction: column; }
  h1 { font-size: 18pt; color: #1f2937; margin-bottom: 6mm; }
  table { width: 100%; border-collapse: collapse; font-size: 10pt; }
  th { background: #f0fdf4; color: #166534; padding: 3mm 4mm; text-align: left; border: 1px solid #bbf7d0; font-weight: 600; }
  td { padding: 2.5mm 4mm; border: 1px solid #e5e7eb; color: #374151; }
  .person { font-weight: 600; background: #f9fafb; }
  .conj { color: #6b7280; }
  .placeholder { display: flex; align-items: center; justify-content: center; flex: 1; color: #9ca3af; font-size: 16pt; }
</style>
</head><body>
<h1>${escapeHtml(title)}</h1>
${tableHtml}
</body></html>`;

  return renderInlineHtml(html, true);
}

// ─── Shared: render inline HTML and screenshot ──────────

async function renderInlineHtml(html: string, isLandscape: boolean): Promise<string | null> {
  const viewportW = isLandscape ? 1122 : 794; // A4 landscape or portrait at 96dpi
  const viewportH = isLandscape ? 794 : 1122;

  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: viewportW, height: viewportH, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 15000 });
    await page.evaluateHandle("document.fonts.ready");

    // Wait for images to load
    await page.evaluate(async () => {
      const imgs = Array.from(document.querySelectorAll("img"));
      await Promise.all(
        imgs
          .filter((img) => !img.complete)
          .map(
            (img) =>
              new Promise<void>((resolve) => {
                img.onload = img.onerror = () => resolve();
              })
          )
      );
    });
    await new Promise((r) => setTimeout(r, 300));

    const screenshot = await page.screenshot({ type: "png" });
    return screenshotToWebp(screenshot, isLandscape);
  } catch (err) {
    console.error("[Thumbnail] Inline HTML generation failed:", err);
    return null;
  } finally {
    await browser.close();
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\n/g, "<br>");
}
