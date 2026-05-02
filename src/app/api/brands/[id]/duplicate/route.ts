import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";

// POST /api/brands/[id]/duplicate — duplicate a brand profile (admin only)
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const result = await requireAdmin();
  if (result instanceof NextResponse) return result;

  const { id } = await params;

  try {
    const source = await prisma.brandProfile.findUnique({ where: { id } });
    if (!source) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Generate a unique slug by appending -copy, -copy-2, etc.
    const baseSlug = `${source.slug}-copy`;
    let slug = baseSlug;
    let counter = 1;
    while (await prisma.brandProfile.findUnique({ where: { slug } })) {
      counter += 1;
      slug = `${baseSlug}-${counter}`;
    }

    const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = source;

    const duplicate = await prisma.brandProfile.create({
      data: {
        ...rest,
        name: `${source.name} (Copy)`,
        slug,
      },
    });

    return NextResponse.json(duplicate, { status: 201 });
  } catch (err) {
    console.error("POST /api/brands/[id]/duplicate error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
