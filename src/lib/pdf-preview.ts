import sharp from "sharp";
import { put } from "@vercel/blob";
import path from "node:path";

export async function generatePDFPreview(
  pdfBlob: Blob,
  brandId: string,
  title: string
): Promise<string | null> {
  try {
    const pngBuffer = await renderFirstPDFPage(pdfBlob);

    const previewBlob = await put(
      `library/${brandId}/preview_${Date.now()}.png`,
      pngBuffer,
      { access: "public", contentType: "image/png" }
    );

    return previewBlob.url;
  } catch (error) {
    console.error("[generatePDFPreview] Failed:", error);
    return uploadFallbackPreview(brandId, title);
  }
}

async function renderFirstPDFPage(pdfBlob: Blob): Promise<Buffer> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const runtimeRequire = eval("require") as NodeRequire;
  const { createCanvas } = runtimeRequire("@napi-rs/canvas") as typeof import("@napi-rs/canvas");

  pdfjs.GlobalWorkerOptions.workerSrc = runtimeRequire.resolve(
    "pdfjs-dist/legacy/build/pdf.worker.mjs"
  );

  const data = new Uint8Array(await pdfBlob.arrayBuffer());
  const wasmUrl =
    path.dirname(runtimeRequire.resolve("pdfjs-dist/wasm/openjpeg.wasm")) +
    path.sep;
  const document = await pdfjs.getDocument({ data, wasmUrl }).promise;
  const page = await document.getPage(1);
  const viewport = page.getViewport({ scale: 1 });
  const scale = 800 / viewport.width;
  const scaledViewport = page.getViewport({ scale });
  const canvas = createCanvas(
    Math.ceil(scaledViewport.width),
    Math.ceil(scaledViewport.height)
  );
  const canvasContext = canvas.getContext("2d");

  await page.render({
    canvas: canvas as never,
    canvasContext: canvasContext as never,
    viewport: scaledViewport,
  }).promise;

  page.cleanup();
  await document.cleanup();

  return canvas.toBuffer("image/png");
}

async function uploadFallbackPreview(
  brandId: string,
  title: string
): Promise<string | null> {
  try {
    const pngBuffer = await createFallbackPreview(title);
    const previewBlob = await put(
      `library/${brandId}/preview_${Date.now()}.png`,
      pngBuffer,
      { access: "public", contentType: "image/png" }
    );
    return previewBlob.url;
  } catch (error) {
    console.error("[generatePDFPreview] Fallback failed:", error);
    return null;
  }
}

async function createFallbackPreview(title: string): Promise<Buffer> {
  const width = 400;
  const height = 600;
  const safeTitle = escapeXml(title.substring(0, 40));

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="#f3f4f6"/>
  <rect width="${width}" height="120" fill="#3b82f6"/>
  <text x="${width / 2}" y="75" font-size="48" font-weight="bold" text-anchor="middle" fill="white" font-family="Arial, sans-serif">PDF</text>
  <text x="${width / 2}" y="320" font-size="22" font-weight="bold" text-anchor="middle" fill="#1f2937" font-family="Arial, sans-serif">${safeTitle}</text>
  <text x="${width / 2}" y="560" font-size="12" text-anchor="middle" fill="#6b7280" font-family="Arial, sans-serif">PDF Document</text>
</svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
