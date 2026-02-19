import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";
import {
  renderCoverPng,
  readLogoAsPngDataUri,
  compressImageUrl,
  CoverSvgProps,
} from "@/app/api/worksheets/[id]/grammar-table-pdf-v2/route";
import { replaceEszett, getEffectiveValue } from "@/lib/locale-utils";
import { WorksheetSettings, ChOverrides } from "@/types/worksheet";
import { GrammarTableSettings } from "@/types/grammar-table";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/worksheets/[id]/cover?locale=DE|CH|NEUTRAL — generate cover page as PNG
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  const { id } = await params;
  const locale = (req.nextUrl.searchParams.get("locale") || "DE").toUpperCase() as
    | "DE"
    | "CH"
    | "NEUTRAL";
  const isSwiss = locale === "CH";
  const isNeutral = locale === "NEUTRAL";

  const worksheet = await prisma.worksheet.findFirst({
    where: {
      id,
      userId,
    } as Parameters<typeof prisma.worksheet.findFirst>[0] extends {
      where?: infer W;
    }
      ? W
      : never,
  });
  if (!worksheet) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const settings = (worksheet.settings ?? {}) as unknown as WorksheetSettings;

    // Compress cover images
    const rawCoverImages = settings.coverImages ?? [];
    const compressedCoverImages = await Promise.all(
      rawCoverImages.map((url) =>
        url && url !== "" ? compressImageUrl(url, 400, 75) : Promise.resolve(url),
      ),
    );

    // Build a settings-like object for renderCoverPng (expects GrammarTableSettings shape)
    const coverSettings = {
      coverImages: compressedCoverImages,
      coverImageBorder: settings.coverImageBorder ?? false,
    } as unknown as GrammarTableSettings;

    // Read logos
    const bigLogoDataUri = await readLogoAsPngDataUri(
      "logo/lingostar_logo_and_brand_flat.svg",
      800,
    );
    const flagDataUri = isNeutral
      ? ""
      : await readLogoAsPngDataUri(
          isSwiss
            ? "key_visuals/flag_of_Switzerland.svg"
            : "key_visuals/flag_of_Germany.svg",
          200,
        );

    let title = getEffectiveValue(
      worksheet.title,
      "_worksheet",
      "title",
      isSwiss ? "CH" : "DE",
      settings.chOverrides,
    );
    let subtitle = settings.coverSubtitle || "Arbeitsblatt";
    let infoText = settings.coverInfoText || "";

    if (isSwiss) {
      title = replaceEszett(title);
      subtitle = replaceEszett(subtitle);
      infoText = replaceEszett(infoText);
    }

    const coverProps: CoverSvgProps = {
      subtitle,
      title,
      tenseInfo: infoText,
      settings: isSwiss ? replaceEszett(coverSettings) : coverSettings,
      worksheetId: worksheet.id,
      bigLogoDataUri,
      flagDataUri,
    };

    const pngBuffer = await renderCoverPng(coverProps);

    const shortId = worksheet.id.slice(0, 8);
    const filename = `${shortId}_cover_${locale === "NEUTRAL" ? "DACH" : locale}.png`;

    return new NextResponse(new Uint8Array(pngBuffer), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("[Worksheet Cover] Cover image error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Cover image generation failed: ${message}` },
      { status: 500 },
    );
  }
}
