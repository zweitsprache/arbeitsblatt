import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { WorksheetBlock, WorksheetSettings, DEFAULT_SETTINGS, DEFAULT_BRAND_SETTINGS, BrandSettings, Brand, BrandProfile, getStaticBrandProfile, applyBrandOverrides } from "@/types/worksheet";
import { WorksheetViewer } from "@/components/viewer/worksheet-viewer";
import { applyWorksheetTranslations } from "@/lib/worksheet-translation";
import { migrateWorksheetLocaleDataToV2, resolveWorksheetLocaleContent } from "@/lib/worksheet-locale-migration";

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
  const worksheet = await prisma.worksheet.findFirst({
    where: {
      OR: [{ slug }, { id: slug }],
    },
  });

  if (!worksheet) {
    notFound();
  }

  const isCH = sp.ch === "1";
  const showSolutions = sp.solutions === "1";
  const lang = typeof sp.lang === "string" ? sp.lang : null;
  // When set, render the translated content only (suppress the original German
  // shown side-by-side in bilingual blocks).
  const translationOnly = sp.transOnly === "1";
  const scaleParam = typeof sp.scale === "string" ? Number(sp.scale) : NaN;
  const previewScale = Number.isFinite(scaleParam) && scaleParam > 0 ? scaleParam / 100 : 1;

  const migratedLocaleData = migrateWorksheetLocaleDataToV2({
    title: worksheet.title,
    blocks: worksheet.blocks as unknown as WorksheetBlock[],
    settings: {
      ...DEFAULT_SETTINGS,
      ...(worksheet.settings as unknown as Partial<WorksheetSettings>),
    },
  });

  let blocks = migratedLocaleData.blocks;
  const cardBlocksForceCanva = blocks.some((block) => block.type === "domino" || block.type === "flashcards" || block.type === "aufgabenkarten");
  const hasTenStopWordTabooBlock = blocks.some((block) => (
    block.type === "taboo"
    && (block.stopWordCount === 10 || block.items.some((item) => item.subitems.length > 4))
  ));
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
    ...migratedLocaleData.settings,
    orientation: hasTenStopWordTabooBlock ? "portrait" : (cardBlocksForceCanva ? "landscape-canva" : migratedLocaleData.settings.orientation),
    brandSettings: resolvedBrandSettings,
  };
  const effectiveOrientation = settings.orientation === "portrait" ? "portrait" : "landscape";
  const pageSizeCss =
    effectiveOrientation === "landscape"
      ? "297mm 210mm"
      : "210mm 297mm";

  let title = migratedLocaleData.title;

  // Keep original blocks for bilingual rendering before applying translations
  const originalBlocks = migratedLocaleData.blocks;

  const resolvedVariant = resolveWorksheetLocaleContent(
    title,
    blocks,
    settings,
    isCH ? "CH" : "DE",
  );
  title = resolvedVariant.title;
  blocks = resolvedVariant.blocks;

  // Apply translation if lang param is provided
  if (lang && lang !== "de") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allTranslations = ((worksheet as any).translations ?? {}) as Record<string, Record<string, string>>;
    const langMap = allTranslations[lang];
    if (langMap) {
      blocks = applyWorksheetTranslations(blocks, langMap);
    }
  }

  // Build original blocks map for bilingual text blocks (only when translated).
  // Skipped in translation-only mode so blocks render the translation alone.
  const originalBlockMap = (lang && lang !== "de" && !translationOnly)
    ? Object.fromEntries(originalBlocks.map((b) => [b.id, b]))
    : undefined;

  return (
    <>
      <style>{`
        @page { size: ${pageSizeCss}; margin: 0; }
        @media screen {
          .print-preview-scale {
            transform: scale(${previewScale});
            transform-origin: top center;
            width: ${100 / previewScale}%;
            margin: 0 auto;
          }
        }
      `}</style>
      <div className={previewScale !== 1 ? "print-preview-scale" : undefined}>
        <WorksheetViewer
          title={title}
          blocks={blocks}
          settings={settings}
          mode="print"
          worksheetId={worksheet.id}
          showSolutions={showSolutions}
          initialLocale={lang ?? "de"}
          originalBlockMap={originalBlockMap}
          brandProfile={brandProfile}
        />
      </div>
    </>
  );
}
