import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";

// GET /api/brands — list all brand profiles (public, no auth needed)
export async function GET() {
  try {
    const brands = await prisma.brandProfile.findMany({
      orderBy: { name: "asc" },
      include: { subProfiles: { orderBy: { name: "asc" } } },
    });
    return NextResponse.json(brands);
  } catch (err) {
    console.error("GET /api/brands error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST /api/brands — create a new brand profile (admin only)
export async function POST(req: NextRequest) {
  const result = await requireAdmin();
  if (result instanceof NextResponse) return result;

  try {
    const body = await req.json();

    if (!body.name || !body.slug) {
      return NextResponse.json(
        { error: "name and slug are required" },
        { status: 400 },
      );
    }

    // Check slug uniqueness
    const existing = await prisma.brandProfile.findUnique({
      where: { slug: body.slug },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A brand with this slug already exists" },
        { status: 409 },
      );
    }

    const brand = await prisma.brandProfile.create({
      data: {
        name: body.name,
        slug: body.slug,
        bodyFont: body.bodyFont,
        headlineFont: body.headlineFont,
        headlineWeight: body.headlineWeight,
        subHeadlineFont: body.subHeadlineFont,
        subHeadlineWeight: body.subHeadlineWeight,
        headerFooterFont: body.headerFooterFont,
        googleFontsUrl: body.googleFontsUrl,
        primaryColor: body.primaryColor,
        accentColor: body.accentColor,
        logo: body.logo,
        iconLogo: body.iconLogo,
        favicon: body.favicon,
        organization: body.organization,
        teacher: body.teacher,
        headerRight: body.headerRight,
        footerLeft: body.footerLeft,
        footerCenter: body.footerCenter,
        footerRight: body.footerRight,
        pdfFontSize: body.pdfFontSize,
        pdfTranslationScale: body.pdfTranslationScale,
        pageTitle: body.pageTitle,
      },
    });

    return NextResponse.json(brand, { status: 201 });
  } catch (err) {
    console.error("POST /api/brands error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
