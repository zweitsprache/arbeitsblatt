import { del } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";

const normalizeUrl = (input: string): string => {
  if (!input) return "";
  return input.trim();
};

export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await req.json();
    const filePath = normalizeUrl(body?.filePath || body?.url || "");

    if (!filePath) {
      return NextResponse.json({ error: "Missing filePath" }, { status: 400 });
    }

    // Ignore blob URLs: those are local fallbacks and can be removed from IndexedDB only.
    if (filePath.startsWith("blob:")) {
      return NextResponse.json({ success: true, skipped: "blob-url" });
    }

    await del(filePath);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[local-media/delete] Delete error:", error);
    return NextResponse.json({ error: "Failed to delete media" }, { status: 500 });
  }
}
