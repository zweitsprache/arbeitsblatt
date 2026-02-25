import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";
import { launchBrowser } from "@/lib/puppeteer";
import { PDFDocument, degrees } from "pdf-lib";
import {
  EBookChapter,
  EBookCoverSettings,
  EBookSettings,
  DEFAULT_EBOOK_SETTINGS,
  DEFAULT_EBOOK_COVER_SETTINGS,
  EBookContentType,
} from "@/types/ebook";
import { Brand, BRAND_FONTS, DEFAULT_BRAND_SETTINGS } from "@/types/worksheet";

export const maxDuration = 120;

// ─── Helpers ─────────────────────────────────────────────────

/** Map content type → PDF API route pattern */
function getPdfRoute(type: EBookContentType, id: string): { url: string; method: string } {
  switch (type) {
    case "flashcards":
      return { url: `/api/worksheets/${id}/flashcard-pdf?locale=de`, method: "GET" };
    case "cards":
      return { url: `/api/worksheets/${id}/card-pdf`, method: "GET" };
    case "grammar-table":
      return { url: `/api/worksheets/${id}/grammar-table-pdf-v2?locale=de`, method: "POST" };
    case "worksheet":
    default:
      return { url: `/api/worksheets/${id}/pdf-v3`, method: "POST" };
  }
}

/** Merge an array of PDF buffers into a single document, rotating landscape pages to portrait */
async function mergePdfs(pdfs: Uint8Array[]): Promise<Uint8Array> {
  const merged = await PDFDocument.create();
  for (const buf of pdfs) {
    try {
      const doc = await PDFDocument.load(buf);
      const pages = await merged.copyPages(doc, doc.getPageIndices());
      for (const p of pages) {
        // Rotate landscape pages (width > height) by -90° (CCW) so they become portrait
        const { width, height } = p.getSize();
        if (width > height) {
          p.setRotation(degrees(-90));
        }
        merged.addPage(p);
      }
    } catch (err) {
      console.warn("[E-Book PDF] Skipping unreadable PDF segment:", err);
    }
  }
  return merged.save();
}

// GET /api/ebooks/[id]/pdf — assemble e-book from individual content PDFs
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  const { id } = await params;
  const ebook = await prisma.eBook.findFirst({
    where: { id, userId },
  });
  if (!ebook) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : (process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000");

  // Resolve settings
  const settings: EBookSettings = {
    ...DEFAULT_EBOOK_SETTINGS,
    ...(ebook.settings as Partial<EBookSettings> | null),
  };
  const coverSettings: EBookCoverSettings = {
    ...DEFAULT_EBOOK_COVER_SETTINGS,
    ...(ebook.coverSettings as Partial<EBookCoverSettings> | null),
  };

  const brandName = settings.brand as Brand;
  const brandFonts = BRAND_FONTS[brandName] || BRAND_FONTS.edoomio;
  const brandSettingsResolved = {
    ...(DEFAULT_BRAND_SETTINGS[brandName] || DEFAULT_BRAND_SETTINGS.edoomio),
    ...settings.brandSettings,
  };

  // Unified brand info for HTML builders
  const brand: PageBrandInfo = {
    fonts: brandFonts,
    settings: brandSettingsResolved,
  };

  const pdfOptions = {
    format: (settings.pageSize === "a4" ? "A4" : "Letter") as "A4" | "Letter",
    landscape: settings.orientation === "landscape",
    margin: { top: 0, right: 0, bottom: 0, left: 0 } as const,
    printBackground: true,
    displayHeaderFooter: false,
    preferCSSPageSize: false,
  };

  // Forward cookies for internal API calls
  const cookieHeader = req.headers.get("cookie") || "";

  try {
    console.log(`[E-Book PDF] Start assembly for ebook ${id}`);

    // Parse chapters & collect all referenced item IDs
    const chapters = ebook.chapters as unknown as EBookChapter[];
    const allItemIds = chapters.flatMap((ch) => ch.worksheetIds);

    // Fetch item metadata (we need type + title)
    const items = await prisma.worksheet.findMany({
      where: { id: { in: allItemIds }, userId },
      select: { id: true, type: true, title: true, slug: true },
    });
    const itemMap = new Map(items.map((i) => [i.id, i]));

    // ── 1. Generate cover + TOC + chapter title pages via setContent ──
    // (No page.goto to avoid the server calling itself which causes deadlocks)
    const browser = await launchBrowser();
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(60000);
    page.setDefaultTimeout(60000);

    // Helper: set HTML content and wait for fonts with a bounded timeout.
    // We use "domcontentloaded" instead of "networkidle0" because external
    // Google Fonts requests can hang in headless Chrome on constrained environments.
    async function renderPagePdf(html: string): Promise<Uint8Array> {
      await page.setContent(html, { waitUntil: "domcontentloaded" });
      await Promise.race([
        page.evaluateHandle("document.fonts.ready"),
        new Promise((r) => setTimeout(r, 5000)),
      ]);
      return new Uint8Array(await page.pdf(pdfOptions));
    }

    const structurePdfs: Uint8Array[] = [];

    // Cover page
    const coverHtml = buildCoverPageHtml(
      ebook.title,
      coverSettings,
      settings,
      brand,
      baseUrl,
    );
    structurePdfs.push(await renderPagePdf(coverHtml));

    // TOC page
    if (settings.showToc) {
      const tocEntries: { chapterTitle: string; itemTitle: string }[] = [];
      for (const chapter of chapters) {
        for (const itemId of chapter.worksheetIds) {
          const item = itemMap.get(itemId);
          if (item) {
            tocEntries.push({ chapterTitle: chapter.title, itemTitle: item.title });
          }
        }
      }
      const tocHtml = buildTocPageHtml(settings, brand, tocEntries);
      structurePdfs.push(await renderPagePdf(tocHtml));
    }

    // Chapter title pages
    const chapterTitlePdfs: Map<string, Uint8Array> = new Map();
    for (const chapter of chapters) {
      const chapterTitleHtml = buildChapterTitlePageHtml(chapter.title, settings, brand, baseUrl);
      chapterTitlePdfs.set(chapter.id, await renderPagePdf(chapterTitleHtml));
    }

    // Done with Puppeteer — close BEFORE fetching content PDFs
    // (individual PDF routes also use Puppeteer; closing prevents resource contention)
    await browser.close();
    console.log("[E-Book PDF] Structure pages generated, browser closed");

    // ── 2. Fetch individual content PDFs ──
    const contentPdfs: Uint8Array[] = [];

    for (const chapter of chapters) {
      // Add chapter title page
      const titlePdf = chapterTitlePdfs.get(chapter.id);
      if (titlePdf) contentPdfs.push(titlePdf);

      // Individual item PDFs
      for (const itemId of chapter.worksheetIds) {
        const item = itemMap.get(itemId);
        if (!item) continue;

        const contentType = (item.type || "worksheet") as EBookContentType;
        const route = getPdfRoute(contentType, item.id);
        const url = `${baseUrl}${route.url}`;

        console.log(`[E-Book PDF] Fetching ${contentType} PDF: ${item.title} (${item.id})`);

        try {
          const res = await fetch(url, {
            method: route.method,
            headers: {
              "Content-Type": "application/json",
              Cookie: cookieHeader,
            },
            ...(route.method === "POST" ? { body: JSON.stringify({}) } : {}),
          });

          if (!res.ok) {
            console.warn(`[E-Book PDF] Failed to get PDF for ${item.id}: HTTP ${res.status}`);
            continue;
          }

          const buf = new Uint8Array(await res.arrayBuffer());
          contentPdfs.push(buf);
          console.log(`[E-Book PDF] Got ${buf.length} bytes for ${item.title}`);
        } catch (err) {
          console.warn(`[E-Book PDF] Error fetching PDF for ${item.id}:`, err);
        }
      }
    }

    // ── 3. Merge: structure pages + content PDFs ──
    const allPdfs = [...structurePdfs, ...contentPdfs];
    const finalPdfBytes = await mergePdfs(allPdfs);

    console.log(`[E-Book PDF] Final assembled PDF: ${finalPdfBytes.length} bytes`);

    const safeTitle = ebook.title
      .replace(/[\u2013\u2014]/g, "-")
      .replace(/[^\x20-\x7E]/g, "_");

    return new NextResponse(Buffer.from(finalPdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeTitle}.pdf"`,
      },
    });
  } catch (error) {
    console.error("E-Book PDF generation error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `PDF generation failed: ${message}` },
      { status: 500 }
    );
  }
}

// ─── Shared types for HTML builders ──────────────────────────

interface PageBrandInfo {
  fonts: {
    bodyFont: string;
    headlineFont: string;
    headlineWeight: number;
    headerFooterFont: string;
    googleFontsUrl: string;
    primaryColor: string;
  };
  settings: {
    logo: string;
    organization: string;
    teacher: string;
    headerRight: string;
    footerLeft: string;
    footerCenter: string;
    footerRight: string;
  };
}

// ─── Cover page HTML ─────────────────────────────────────────

function buildCoverPageHtml(
  ebookTitle: string,
  cover: EBookCoverSettings,
  settings: EBookSettings,
  brand: PageBrandInfo,
  baseUrl: string,
): string {
  const pageW = settings.pageSize === "a4" ? 210 : 215.9;
  const pageH = settings.pageSize === "a4" ? 297 : 279.4;
  const displayTitle = cover.title || ebookTitle;

  const coverImageHtml = cover.coverImage
    ? `<img src="${escapeAttr(cover.coverImage)}" alt="" style="max-width:100%;max-height:40%;object-fit:contain;margin-bottom:30mm;"/>`
    : "";

  const subtitleHtml = cover.subtitle
    ? `<p style="font-size:16pt;margin-bottom:15mm;opacity:0.8">${escapeHtml(cover.subtitle)}</p>`
    : "";

  const authorHtml = cover.author
    ? `<p style="font-size:12pt;opacity:0.7">${escapeHtml(cover.author)}</p>`
    : "";

  // Organization / teacher line
  const orgParts: string[] = [];
  if (brand.settings.organization) orgParts.push(escapeHtml(brand.settings.organization));
  if (brand.settings.teacher) orgParts.push(escapeHtml(brand.settings.teacher));
  const orgHtml = orgParts.length > 0
    ? `<p style="font-size:11pt;opacity:0.6;margin-top:5mm">${orgParts.join(" · ")}</p>`
    : "";

  const logoUrl = cover.showLogo && brand.settings.logo
    ? `${baseUrl}${brand.settings.logo}`
    : "";
  const logoHtml = logoUrl
    ? `<img src="${escapeAttr(logoUrl)}" alt="" style="height:15mm;margin-top:20mm;"/>`
    : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <link rel="stylesheet" href="${brand.fonts.googleFontsUrl}"/>
  <style>
    @page { margin: 0; size: ${pageW}mm ${pageH}mm; }
    html, body { margin: 0; padding: 0; width: ${pageW}mm; height: ${pageH}mm; }
    body {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 40mm 30mm;
      box-sizing: border-box;
      font-family: ${brand.fonts.bodyFont};
      background-color: ${cover.backgroundColor};
      color: ${cover.textColor};
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    h1 {
      font-size: 32pt;
      font-weight: bold;
      margin-bottom: 10mm;
      font-family: ${brand.fonts.headlineFont};
    }
  </style>
</head>
<body>
  ${coverImageHtml}
  <h1>${escapeHtml(displayTitle)}</h1>
  ${subtitleHtml}
  ${authorHtml}
  ${orgHtml}
  ${logoHtml}
</body>
</html>`;
}

// ─── TOC page HTML ───────────────────────────────────────────

function buildTocPageHtml(
  settings: EBookSettings,
  brand: PageBrandInfo,
  entries: { chapterTitle: string; itemTitle: string }[],
): string {
  const pageW = settings.pageSize === "a4" ? 210 : 215.9;
  const pageH = settings.pageSize === "a4" ? 297 : 279.4;

  const rows = entries
    .map(
      (e) =>
        `<div class="toc-entry">
          <span class="chapter">${escapeHtml(e.chapterTitle)} &middot;</span>
          <span>${escapeHtml(e.itemTitle)}</span>
        </div>`
    )
    .join("\n");

  // Build footer from brand settings
  const footerParts: string[] = [
    brand.settings.footerLeft,
    brand.settings.footerCenter,
    brand.settings.footerRight,
  ].filter(Boolean);
  const footerHtml = footerParts.length > 0
    ? `<div class="page-footer">${footerParts.map((p) => `<span>${escapeHtml(p)}</span>`).join("")}</div>`
    : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <link rel="stylesheet" href="${brand.fonts.googleFontsUrl}"/>
  <style>
    @page { margin: 0; size: ${pageW}mm ${pageH}mm; }
    html, body { margin: 0; padding: 0; width: ${pageW}mm; min-height: ${pageH}mm; }
    body {
      padding: 30mm;
      padding-bottom: 20mm;
      box-sizing: border-box;
      font-family: ${brand.fonts.bodyFont};
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      position: relative;
    }
    h2 {
      font-size: 20pt;
      font-weight: ${brand.fonts.headlineWeight};
      margin-bottom: 15mm;
      font-family: ${brand.fonts.headlineFont};
      color: ${brand.fonts.primaryColor};
    }
    .toc-entry {
      display: flex;
      align-items: baseline;
      padding: 8px 0;
      border-bottom: 1px dotted #ccc;
    }
    .chapter {
      color: ${brand.fonts.primaryColor};
      font-size: 10pt;
      margin-right: 8px;
      white-space: nowrap;
    }
    .page-footer {
      position: absolute;
      bottom: 10mm;
      left: 30mm;
      right: 30mm;
      display: flex;
      justify-content: space-between;
      font-size: 8pt;
      color: #999;
      font-family: ${brand.fonts.headerFooterFont};
    }
  </style>
</head>
<body>
  <h2>${escapeHtml(settings.tocTitle || "Table of Contents")}</h2>
  ${rows}
  ${footerHtml}
</body>
</html>`;
}

// ─── Chapter title page HTML ─────────────────────────────────

function buildChapterTitlePageHtml(
  chapterTitle: string,
  settings: EBookSettings,
  brand: PageBrandInfo,
  baseUrl: string,
): string {
  const pageW = settings.pageSize === "a4" ? 210 : 215.9;
  const pageH = settings.pageSize === "a4" ? 297 : 279.4;

  // Optional brand logo on chapter pages
  const logoUrl = brand.settings.logo ? `${baseUrl}${brand.settings.logo}` : "";
  const logoHtml = logoUrl
    ? `<img src="${escapeAttr(logoUrl)}" alt="" class="chapter-logo"/>`
    : "";

  // Footer from brand settings
  const footerParts: string[] = [
    brand.settings.footerLeft,
    brand.settings.footerCenter,
    brand.settings.footerRight,
  ].filter(Boolean);
  const footerHtml = footerParts.length > 0
    ? `<div class="page-footer">${footerParts.map((p) => `<span>${escapeHtml(p)}</span>`).join("")}</div>`
    : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <link rel="stylesheet" href="${brand.fonts.googleFontsUrl}"/>
  <style>
    @page { margin: 0; size: ${pageW}mm ${pageH}mm; }
    html, body { margin: 0; padding: 0; width: ${pageW}mm; height: ${pageH}mm; }
    body {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-family: ${brand.fonts.headlineFont};
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      position: relative;
    }
    h1 {
      font-size: 28pt;
      font-weight: ${brand.fonts.headlineWeight};
      text-align: center;
      color: ${brand.fonts.primaryColor};
      padding: 0 30mm;
    }
    .chapter-logo {
      height: 10mm;
      margin-bottom: 10mm;
      opacity: 0.5;
    }
    .page-footer {
      position: absolute;
      bottom: 10mm;
      left: 30mm;
      right: 30mm;
      display: flex;
      justify-content: space-between;
      font-size: 8pt;
      color: #999;
      font-family: ${brand.fonts.headerFooterFont};
    }
  </style>
</head>
<body>
  ${logoHtml}
  <h1>${escapeHtml(chapterTitle)}</h1>
  ${footerHtml}
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
