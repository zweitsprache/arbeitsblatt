import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { WorksheetBlock, WorksheetSettings, DEFAULT_SETTINGS, DEFAULT_BRAND_SETTINGS, BrandSettings, Brand } from "@/types/worksheet";
import { WorksheetViewer } from "@/components/viewer/worksheet-viewer";
import { replaceEszett, applyChOverrides } from "@/lib/locale-utils";

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

  let blocks = worksheet.blocks as unknown as WorksheetBlock[];
  const rawSettings = worksheet.settings as unknown as Partial<WorksheetSettings>;
  const brand = ((rawSettings?.brand as string) || "edoomio") as Brand;
  const now = new Date();
  const year = now.getFullYear();
  const dateStr = now.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" });

  // Resolve brand settings with fallback footer defaults (matching v2 behaviour)
  const userBrandSettings = (rawSettings?.brandSettings as Partial<BrandSettings>) || {};
  const resolvedBrandSettings: BrandSettings = {
    ...DEFAULT_BRAND_SETTINGS[brand],
    ...userBrandSettings,
    footerLeft: userBrandSettings.footerLeft || `© ${year} lingostar | Marcel Allenspach<br/>Alle Rechte vorbehalten`,
    footerCenter: userBrandSettings.footerCenter || "{current_page} / {no_of_pages}",
    footerRight: userBrandSettings.footerRight || `{worksheet_uuid}<br/>${dateStr}`,
  };

  const settings: WorksheetSettings = {
    ...DEFAULT_SETTINGS,
    ...rawSettings,
    brandSettings: resolvedBrandSettings,
  };

  let title = worksheet.title;

  // Apply ß→ss replacement for Swiss locale, then layer manual CH overrides
  if (isCH) {
    title = replaceEszett(title);
    blocks = replaceEszett(blocks);
    if (settings.chOverrides) {
      blocks = applyChOverrides(blocks, settings.chOverrides);
    }
  }

  return (
    <WorksheetViewer
      title={title}
      blocks={blocks}
      settings={isCH ? replaceEszett(settings) : settings}
      mode="print"
      worksheetId={worksheet.id}
      showSolutions={showSolutions}
    />
  );
}
