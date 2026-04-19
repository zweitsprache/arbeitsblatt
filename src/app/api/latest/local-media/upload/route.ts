import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";

const ALLOWED_PREFIXES = ["image/", "video/", "audio/"];
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

const sanitizeName = (name: string): string => {
  return name
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 140) || "upload";
};

export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_PREFIXES.some((prefix) => file.type.startsWith(prefix))) {
      return NextResponse.json({ error: "Unsupported media type" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large (max 100MB)" }, { status: 400 });
    }

    const safeName = sanitizeName(file.name);
    const pathname = `local-media/${authResult.userId}/${Date.now()}-${safeName}`;

    const blob = await put(pathname, file, {
      access: "public",
      addRandomSuffix: true,
      contentType: file.type,
    });

    return NextResponse.json({
      id: blob.pathname,
      serverPath: blob.url,
      pathname: blob.pathname,
      size: file.size,
      contentType: file.type,
      uploadedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[local-media/upload] Upload error:", error);
    return NextResponse.json({ error: "Failed to upload media" }, { status: 500 });
  }
}
