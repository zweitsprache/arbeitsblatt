import { NextRequest, NextResponse } from "next/server";
import archiver from "archiver";
import { PassThrough } from "stream";
import { launchBrowser } from "@/lib/puppeteer";
import { requireAuth } from "@/lib/auth/require-auth";
import {
  BrandProfile,
  TabooBlock,
  WorksheetSettings,
} from "@/types/worksheet";
import {
  deleteQuartettExportState,
  saveQuartettExportState,
} from "@/lib/quartett-export-state";

export const runtime = "nodejs";
export const maxDuration = 60;

type TabooCardVariant = {
  id: string;
  word: string;
  stopWords: string[];
};

type ExportRequest = {
  block?: TabooBlock;
  settings?: WorksheetSettings;
  brandProfile?: BrandProfile | null;
  worksheetTitle?: string;
  worksheetId?: string | null;
  locale?: string;
};

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_BASE_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
}

function buildTabooCardVariants(items: TabooBlock["items"]): TabooCardVariant[] {
  return items.map((item) => ({
    id: item.id,
    word: item.title?.trim() || "",
    stopWords: item.subitems
      .map((entry) => entry.content)
      .filter((entry) => entry.trim().length > 0),
  }));
}

function sanitizeFilename(value: string): string {
  const sanitized = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return sanitized || "taboo-cards";
}

async function zipFiles(files: Array<{ name: string; data: Buffer }>): Promise<Buffer> {
  return await new Promise((resolve, reject) => {
    const archive = archiver("zip", { zlib: { level: 9 } });
    const stream = new PassThrough();
    const chunks: Buffer[] = [];

    stream.on("data", (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
    archive.on("error", reject);

    archive.pipe(stream);
    for (const file of files) {
      archive.append(file.data, { name: file.name });
    }
    void archive.finalize();
  });
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  const body = (await req.json()) as ExportRequest;
  const block = body.block;
  const settings = body.settings;

  if (!block || block.type !== "taboo") {
    return NextResponse.json({ error: "TABOO block is required" }, { status: 400 });
  }

  if (!settings) {
    return NextResponse.json({ error: "Worksheet settings are required" }, { status: 400 });
  }

  const cards = buildTabooCardVariants(block.items);
  if (cards.length === 0) {
    return NextResponse.json({ error: "No cards to export" }, { status: 400 });
  }

  const exportId = crypto.randomUUID();
  const locale = body.locale?.trim() || "de";
  saveQuartettExportState(exportId, {
    title: body.worksheetTitle || block.title || "TABOO",
    worksheetId: body.worksheetId || null,
    locale,
    block,
    settings,
    brandProfile: body.brandProfile || null,
    createdAt: Date.now(),
  });

  const browser = await launchBrowser();
  try {
    const baseUrl = getBaseUrl();
    const previewUrl = `${baseUrl}/${locale}/taboo/export-preview/${exportId}`;
    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
    await page.goto(previewUrl, { waitUntil: "networkidle0", timeout: 30000 });
    await page.evaluateHandle("document.fonts.ready");
    await new Promise((resolve) => setTimeout(resolve, 500));

    const cardElements = await page.$$('[data-taboo-export-card="true"]');
    const pngFiles: Array<{ name: string; data: Buffer }> = [];

    for (let index = 0; index < cardElements.length; index += 1) {
      const element = cardElements[index];
      const screenshot = await element.screenshot({ type: "png" });
      const card = cards[index];
      const filenameBase = sanitizeFilename(card.word || `${body.worksheetTitle || block.title || "taboo"}-${index + 1}`);
      const order = String(index + 1).padStart(2, "0");
      pngFiles.push({
        name: `${order}-${filenameBase}.png`,
        data: Buffer.from(screenshot),
      });
    }

    const zipBuffer = await zipFiles(pngFiles);
    const archiveName = sanitizeFilename(block.title || body.worksheetTitle || "taboo-cards");

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${archiveName}.zip"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[TabooExport] Failed to export cards:", error);
    return NextResponse.json({ error: "Failed to export cards" }, { status: 500 });
  } finally {
    deleteQuartettExportState(exportId);
    await browser.close();
  }
}