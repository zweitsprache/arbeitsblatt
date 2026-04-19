import { list } from "@vercel/blob";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";

const inferMediaType = (pathname: string, contentType?: string): "video" | "image" | "audio" | null => {
  const ct = (contentType || "").toLowerCase();
  if (ct.startsWith("video/")) return "video";
  if (ct.startsWith("image/")) return "image";
  if (ct.startsWith("audio/")) return "audio";

  const lower = pathname.toLowerCase();
  if (/\.(mp4|webm|mov|m4v|avi|mkv|ogv)$/i.test(lower)) return "video";
  if (/\.(mp3|wav|ogg|oga|aac|m4a|webm|flac)$/i.test(lower)) return "audio";
  if (/\.(jpg|jpeg|png|gif|webp|svg|avif)$/i.test(lower)) return "image";
  return null;
};

export async function GET(req: Request) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor") || undefined;
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 100), 1), 200);

    const prefix = `local-media/${authResult.userId}/`;
    const response = await list({ prefix, cursor, limit });

    const media = response.blobs
      .map((blob) => {
        const type = inferMediaType(blob.pathname, (blob as { contentType?: string }).contentType);
        if (!type) return null;

        return {
          id: blob.pathname,
          name: blob.pathname.split("/").pop() || blob.pathname,
          type,
          path: blob.url,
          size: blob.size,
          lastModified: new Date(blob.uploadedAt).getTime(),
          thumbnail: type === "image" ? blob.url : "",
          duration: 0,
          pathname: blob.pathname,
          uploadedAt: blob.uploadedAt,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return NextResponse.json({
      media,
      cursor: response.cursor,
      hasMore: response.hasMore,
    });
  } catch (error) {
    console.error("[local-media/list] List error:", error);
    return NextResponse.json({ error: "Failed to list media" }, { status: 500 });
  }
}
