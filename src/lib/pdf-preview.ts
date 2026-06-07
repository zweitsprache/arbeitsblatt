import sharp from "sharp";
import { put } from "@vercel/blob";

export async function generatePDFPreview(
  pdfBlob: Blob,
  brandId: string,
  title: string
): Promise<string | null> {
  try {
    // Create a simple preview image with title
    // In production, you can integrate with a service like pdf2pic or use a Lambda function
    const width = 400;
    const height = 600;

    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#f3f4f6;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#e5e7eb;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="${width}" height="${height}" fill="url(#grad)"/>
        <rect width="${width}" height="120" fill="#3b82f6"/>
        <image href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2'%3E%3Cpath d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'/%3E%3Cpolyline points='14 2 14 8 20 8'/%3E%3Cline x1='12' y1='19' x2='12' y2='5'/%3E%3C/svg%3E" x="160" y="20" width="80" height="80"/>
        <text x="${width / 2}" y="320" font-size="24" font-weight="bold" text-anchor="middle" fill="#1f2937" font-family="Arial">
          ${escapeXml(title.substring(0, 30))}
        </text>
        <text x="${width / 2}" y="550" font-size="12" text-anchor="middle" fill="#6b7280" font-family="Arial">
          PDF Document
        </text>
      </svg>
    `;

    const pngBuffer = await sharp(Buffer.from(svg))
      .png()
      .toBuffer();

    // Upload to Vercel Blob
    const previewBlob = await put(
      `library/${brandId}/preview_${Date.now()}.png`,
      pngBuffer,
      { access: "public", contentType: "image/png" }
    );

    return previewBlob.url;
  } catch (error) {
    console.error("Error generating PDF preview:", error);
    return null;
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

