import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/brands/by-slug/[slug] — resolve a brand profile by slug (public)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  try {
    const brand = await prisma.brandProfile.findUnique({
      where: { slug },
      include: { subProfiles: { orderBy: { name: "asc" } } },
    });
    if (!brand) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(brand);
  } catch (err) {
    console.error("GET /api/brands/by-slug/[slug] error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
