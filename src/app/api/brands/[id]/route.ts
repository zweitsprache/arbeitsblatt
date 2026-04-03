import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";

// GET /api/brands/[id] — fetch a single brand profile (public)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const brand = await prisma.brandProfile.findUnique({
      where: { id },
      include: { subProfiles: { orderBy: { name: "asc" } } },
    });
    if (!brand) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(brand);
  } catch (err) {
    console.error("GET /api/brands/[id] error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// PUT /api/brands/[id] — update a brand profile (admin only)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const result = await requireAdmin();
  if (result instanceof NextResponse) return result;

  const { id } = await params;
  const body = await req.json();

  try {
    // If slug is being changed, check uniqueness
    if (body.slug) {
      const existing = await prisma.brandProfile.findUnique({
        where: { slug: body.slug },
      });
      if (existing && existing.id !== id) {
        return NextResponse.json(
          { error: "A brand with this slug already exists" },
          { status: 409 },
        );
      }
    }

    const brand = await prisma.brandProfile.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.slug !== undefined && { slug: body.slug }),
        ...(body.bodyFont !== undefined && { bodyFont: body.bodyFont }),
        ...(body.headlineFont !== undefined && {
          headlineFont: body.headlineFont,
        }),
        ...(body.headlineWeight !== undefined && {
          headlineWeight: body.headlineWeight,
        }),
        ...(body.subHeadlineFont !== undefined && {
          subHeadlineFont: body.subHeadlineFont,
        }),
        ...(body.subHeadlineWeight !== undefined && {
          subHeadlineWeight: body.subHeadlineWeight,
        }),
        ...(body.headerFooterFont !== undefined && {
          headerFooterFont: body.headerFooterFont,
        }),
        ...(body.googleFontsUrl !== undefined && {
          googleFontsUrl: body.googleFontsUrl,
        }),
        ...(body.h1Size !== undefined && { h1Size: body.h1Size }),
        ...(body.h1Weight !== undefined && { h1Weight: body.h1Weight }),
        ...(body.h2Size !== undefined && { h2Size: body.h2Size }),
        ...(body.h2Weight !== undefined && { h2Weight: body.h2Weight }),
        ...(body.h3Size !== undefined && { h3Size: body.h3Size }),
        ...(body.h3Weight !== undefined && { h3Weight: body.h3Weight }),
        ...(body.textBaseSize !== undefined && {
          textBaseSize: body.textBaseSize,
        }),
        ...(body.primaryColor !== undefined && {
          primaryColor: body.primaryColor,
        }),
        ...(body.accentColor !== undefined && {
          accentColor: body.accentColor,
        }),
        ...(body.logo !== undefined && { logo: body.logo }),
        ...(body.iconLogo !== undefined && { iconLogo: body.iconLogo }),
        ...(body.favicon !== undefined && { favicon: body.favicon }),
        ...(body.organization !== undefined && {
          organization: body.organization,
        }),
        ...(body.teacher !== undefined && { teacher: body.teacher }),
        ...(body.headerRight !== undefined && {
          headerRight: body.headerRight,
        }),
        ...(body.footerLeft !== undefined && { footerLeft: body.footerLeft }),
        ...(body.footerCenter !== undefined && {
          footerCenter: body.footerCenter,
        }),
        ...(body.footerRight !== undefined && {
          footerRight: body.footerRight,
        }),
        ...(body.pdfFontSize !== undefined && {
          pdfFontSize: body.pdfFontSize,
        }),
        ...(body.pdfTranslationScale !== undefined && {
          pdfTranslationScale: body.pdfTranslationScale,
        }),
        ...(body.pageTitle !== undefined && { pageTitle: body.pageTitle }),
      },
    });

    return NextResponse.json(brand);
  } catch (err) {
    console.error("PUT /api/brands/[id] error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// DELETE /api/brands/[id] — delete a brand profile (admin only, blocked if in use)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const result = await requireAdmin();
  if (result instanceof NextResponse) return result;

  const { id } = await params;

  try {
    // Check if any clients reference this brand
    const clientCount = await prisma.client.count({
      where: { brandProfileId: id },
    });

    if (clientCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete: ${clientCount} client(s) reference this brand profile`,
        },
        { status: 409 },
      );
    }

    await prisma.brandProfile.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/brands/[id] error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
