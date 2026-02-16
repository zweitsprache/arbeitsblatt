import { list } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";

// GET /api/upload/list — list uploaded images from blob storage
export async function GET(req: NextRequest) {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor") || undefined;
  const limit = Math.min(Number(searchParams.get("limit") || 50), 100);

  try {
    const response = await list({
      limit,
      cursor,
    });

    // Filter to only image content types based on pathname extensions
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];
    const images = response.blobs.filter((blob) =>
      imageExtensions.some((ext) => blob.pathname.toLowerCase().endsWith(ext))
    );

    return NextResponse.json({
      images: images.map((blob) => ({
        url: blob.url,
        pathname: blob.pathname,
        size: blob.size,
        uploadedAt: blob.uploadedAt,
      })),
      cursor: response.cursor,
      hasMore: response.hasMore,
    });
  } catch (error) {
    console.error("List blobs error:", error);
    return NextResponse.json(
      { error: "Failed to list images" },
      { status: 500 }
    );
  }
}
