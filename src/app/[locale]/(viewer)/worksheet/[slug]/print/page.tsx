import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { WorksheetBlock, WorksheetSettings, DEFAULT_SETTINGS, DEFAULT_BRAND_SETTINGS, BrandSettings, Brand, BrandProfile, getStaticBrandProfile, applyBrandOverrides } from "@/types/worksheet";
import { WorksheetViewer } from "@/components/viewer/worksheet-viewer";
import { replaceEszett, applyChOverrides } from "@/lib/locale-utils";
import { applyWorksheetTranslations } from "@/lib/worksheet-translation";

// This page is used by Puppeteer for PDF rendering
export default async function PrintWorksheetPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { locale, slug } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const worksheet = await prisma.worksheet.findUnique({ where: { slug } });

  if (!worksheet) {
    notFound();
  }

  const isCH = sp.ch === "1";
  const showSolutions = sp.solutions === "1";
  const lang = typeof sp.lang === "string" ? sp.lang : null;

  let blocks = worksheet.blocks as unknown as WorksheetBlock[];
  const rawSettings = worksheet.settings as unknown as Partial<WorksheetSettings>;
  const brand = ((rawSettings?.brand as string) || "edoomio") as Brand;
  const now = new Date();
  const year = now.getFullYear();
  const dateStr = now.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" });

  // Resolve brand profile from DB, falling back to static data
  const dbBrand = await prisma.brandProfile.findUnique({ where: { slug: brand }, include: { subProfiles: true } });
  const brandProfile: BrandProfile = dbBrand
    ? (dbBrand as unknown as BrandProfile)
    : getStaticBrandProfile(brand);

  // Resolve brand settings with fallback footer defaults (matching v2 behaviour)
  const userBrandSettings = (rawSettings?.brandSettings as Partial<BrandSettings>) || {};
  const resolvedProfile = applyBrandOverrides(brandProfile, rawSettings?.brandOverrides);
  const resolvedBrandSettings: BrandSettings = {
    ...DEFAULT_BRAND_SETTINGS[brand],
    ...userBrandSettings,
    footerLeft: userBrandSettings.footerLeft || resolvedProfile.footerLeft || `© ${year} lingostar | Marcel Allenspach<br/>Alle Rechte vorbehalten`,
    footerCenter: userBrandSettings.footerCenter || resolvedProfile.footerCenter || "{current_page} / {no_of_pages}",
    footerRight: userBrandSettings.footerRight || resolvedProfile.footerRight || `{worksheet_uuid}<br/>${dateStr}`,
  };

  const settings: WorksheetSettings = {
    ...DEFAULT_SETTINGS,
    ...rawSettings,
    brandSettings: resolvedBrandSettings,
  };
  const effectiveOrientation = settings.orientation === "landscape" ? "landscape" : "portrait";
  const pageSizeCss =
    effectiveOrientation === "landscape"
      ? "297mm 210mm"
      : "210mm 297mm";

  let title = worksheet.title;

  // Keep original blocks for bilingual rendering before applying translations
  const originalBlocks = worksheet.blocks as unknown as WorksheetBlock[];

  // Apply translation if lang param is provided
  if (lang && lang !== "de") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allTranslations = ((worksheet as any).translations ?? {}) as Record<string, Record<string, string>>;
    const langMap = allTranslations[lang];
    if (langMap) {
      blocks = applyWorksheetTranslations(blocks, langMap);
    }
  }

  // Apply ß→ss replacement for Swiss locale, then layer manual CH overrides
  if (isCH) {
    title = replaceEszett(title);
    blocks = replaceEszett(blocks);
    if (settings.chOverrides) {
      blocks = applyChOverrides(blocks, settings.chOverrides);
    }
  }

  // Build original blocks map for bilingual text blocks (only when translated)
  const originalBlockMap = (lang && lang !== "de")
    ? Object.fromEntries(originalBlocks.map((b) => [b.id, b]))
    : undefined;

  return (
    <>
      <style>{`@page { size: ${pageSizeCss}; margin: 0; }`}</style>
      <WorksheetViewer
        title={title}
        blocks={blocks}
        settings={isCH ? replaceEszett(settings) : settings}
        mode="print"
        worksheetId={worksheet.id}
        showSolutions={showSolutions}
        initialLocale={lang ?? "de"}
        originalBlockMap={originalBlockMap}
        brandProfile={brandProfile}
      />
    </>
  );
}
