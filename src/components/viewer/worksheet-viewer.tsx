"use client";

import React, { useState, useCallback, useMemo } from "react";
import { WorksheetBlock, WorksheetSettings, ViewMode, BRAND_FONTS, BrandFonts, BrandProfile, getStaticBrandProfile, applyBrandOverrides, resolveSubProfileHeaderFooter, resolveTranslationFontOverride } from "@/types/worksheet";
import { ViewerBlockRenderer } from "./viewer-block-renderer";
import { BlockScreenshotButton } from "./block-screenshot-button";
import { WorksheetLanguageSwitcher } from "./worksheet-language-switcher";
import { applyWorksheetTranslations } from "@/lib/worksheet-translation";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { filterBlocksByDisplay } from "@/lib/block-visibility";

/** Language codes that use non-Latin scripts and should default to Noto Sans */
const NON_LATIN_LOCALES = new Set(["uk", "ru", "bg", "sr", "mk", "ar", "fa", "ps", "ur", "he", "zh", "ja", "ko", "hi", "bn", "th", "el"]);
/** Language codes that use Arabic script and need Noto Sans Arabic */
const ARABIC_SCRIPT_LOCALES = new Set(["ar", "fa", "ps", "ur"]);
const NOTO_SANS_STYLESHEET = "https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;600;700&display=swap";
const NOTO_SANS_ARABIC_STYLESHEET = "https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600;700&display=swap";

export function WorksheetViewer({
  title,
  blocks,
  settings,
  mode,
  worksheetId,
  showSolutions = false,
  translations,
  initialLocale = "de",
  originalBlockMap: externalOriginalBlockMap,
  brandProfile,
}: {
  title: string;
  blocks: WorksheetBlock[];
  settings: WorksheetSettings;
  mode: ViewMode;
  worksheetId?: string;
  showSolutions?: boolean;
  /** Flat translation maps keyed by language code. e.g. { en: { "block.id.content": "..." } } */
  translations?: Record<string, Record<string, string>>;
  /** Starting locale (used in print mode where there is no locale switcher). Defaults to "de". */
  initialLocale?: string;
  /** Pre-built map of original (German) blocks by id, for bilingual rendering in print mode. */
  originalBlockMap?: Record<string, WorksheetBlock>;
  /** Resolved brand profile. When provided, replaces static BRAND_FONTS / DEFAULT_BRAND_SETTINGS lookup. */
  brandProfile?: BrandProfile;
}) {
  const t = useTranslations("viewer");
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [showResults, setShowResults] = useState(false);
  const [contentLocale, setContentLocale] = useState(initialLocale);

  // Determine available languages (always includes de as base)
  const availableLocales = useMemo(() => {
    const locales = ["de"];
    if (translations) {
      for (const lang of Object.keys(translations)) {
        if (!lang.startsWith("_") && !locales.includes(lang)) {
          locales.push(lang);
        }
      }
    }
    return locales;
  }, [translations]);

  // Apply translations when a non-DE locale is active
  const displayBlocks = useMemo(() => {
    if (contentLocale === "de" || !translations?.[contentLocale]) return blocks;
    return applyWorksheetTranslations(blocks, translations[contentLocale]);
  }, [blocks, translations, contentLocale]);

  // Build a map of original (German) blocks by id for bilingual rendering
  // Use externally provided map (print mode) or build from blocks (online mode with translations)
  const isTranslated = contentLocale !== "de" && !!translations?.[contentLocale];
  const originalBlockMap = useMemo(() => {
    if (externalOriginalBlockMap) return externalOriginalBlockMap;
    if (!isTranslated) return undefined;
    const map: Record<string, WorksheetBlock> = {};
    for (const b of blocks) map[b.id] = b;
    return map;
  }, [blocks, isTranslated, externalOriginalBlockMap]);

  // Filter blocks based on display target (mode-aware + legacy visibility compatibility)
  const visibleBlocks = filterBlocksByDisplay(
    displayBlocks,
    mode === "print" ? "worksheetPrint" : "worksheetOnline",
  );

  const isLandscape = settings.orientation === "landscape";
  const pageWidth = settings.pageSize === "a4"
    ? (isLandscape ? 1123 : 794)
    : (isLandscape ? 1056 : 816);

  // Resolve brand profile: prefer prop, then static fallback, then apply per-worksheet overrides
  const resolvedProfile = applyBrandOverrides(
    brandProfile ?? getStaticBrandProfile(settings.brand || "edoomio"),
    settings.brandOverrides,
  );

  const brandKey = settings.brand || "edoomio";
  const staticBrandFonts = BRAND_FONTS[brandKey] ?? BRAND_FONTS["edoomio"];
  const nonEmpty = (value?: string | null, fallback?: string) => {
    const v = value?.trim();
    return v ? v : (fallback ?? "");
  };
  const normalizeWeight = (value: unknown, fallback: number): number => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Number(value.trim());
      if (Number.isFinite(parsed)) return parsed;
    }
    return fallback;
  };

  const brandFonts: BrandFonts = {
    bodyFont: nonEmpty(staticBrandFonts.bodyFont, "Asap Condensed, sans-serif"),
    headlineFont: nonEmpty(staticBrandFonts.headlineFont, "Asap Condensed, sans-serif"),
    headlineWeight: staticBrandFonts.headlineWeight,
    subHeadlineFont: nonEmpty(staticBrandFonts.subHeadlineFont, "Asap Condensed, sans-serif"),
    subHeadlineWeight: staticBrandFonts.subHeadlineWeight,
    headerFooterFont: nonEmpty(staticBrandFonts.headerFooterFont, "Asap Condensed, sans-serif"),
    googleFontsUrl: nonEmpty(staticBrandFonts.googleFontsUrl),
    primaryColor: staticBrandFonts.primaryColor,
  };

  // If a brand profile was provided, prefer its values over the static map
  if (brandProfile) {
    brandFonts.bodyFont = nonEmpty(resolvedProfile.bodyFont, staticBrandFonts.bodyFont);
    brandFonts.headlineFont = nonEmpty(resolvedProfile.headlineFont, staticBrandFonts.headlineFont);
    brandFonts.headlineWeight = normalizeWeight(resolvedProfile.headlineWeight, staticBrandFonts.headlineWeight || 700);
    brandFonts.subHeadlineFont = nonEmpty(resolvedProfile.subHeadlineFont, staticBrandFonts.subHeadlineFont);
    brandFonts.subHeadlineWeight = normalizeWeight(resolvedProfile.subHeadlineWeight, staticBrandFonts.subHeadlineWeight || 700);
    brandFonts.headerFooterFont = nonEmpty(resolvedProfile.headerFooterFont, staticBrandFonts.headerFooterFont);
    brandFonts.googleFontsUrl = nonEmpty(resolvedProfile.googleFontsUrl, staticBrandFonts.googleFontsUrl);
    brandFonts.primaryColor = resolvedProfile.primaryColor;
  }

  const isNonLatin = NON_LATIN_LOCALES.has(contentLocale);
  const baseBodyFont = nonEmpty(brandFonts.bodyFont, "Asap Condensed, sans-serif");
  const translationFontOverride = isTranslated
    ? resolveTranslationFontOverride(resolvedProfile, contentLocale)
    : null;
  const isArabicScript = ARABIC_SCRIPT_LOCALES.has(contentLocale);
  const activeBodyFont = isArabicScript && !translationFontOverride?.fontFamily?.trim()
    ? `"Noto Sans Arabic", ${baseBodyFont}`
    : nonEmpty(translationFontOverride?.fontFamily, baseBodyFont);
  const headlineFont = nonEmpty(brandFonts.headlineFont, baseBodyFont);
  const fontStylesheetUrls = Array.from(
    new Set(
      [
        nonEmpty(brandFonts.googleFontsUrl, staticBrandFonts.googleFontsUrl),
        nonEmpty(translationFontOverride?.googleFontsUrl ?? undefined),
        isNonLatin ? NOTO_SANS_STYLESHEET : "",
        isArabicScript ? NOTO_SANS_ARABIC_STYLESHEET : "",
      ].filter(Boolean),
    ),
  );

  // Get brand settings — prefer per-worksheet brandSettings (which includes
  // print-page defaults like pagination placeholders), then resolved profile, then empty
  const legacyBrandSettings = settings.brandSettings;
  const brandSettings = {
    logo: legacyBrandSettings?.logo || resolvedProfile.logo,
    organization: legacyBrandSettings?.organization || resolvedProfile.organization,
    teacher: legacyBrandSettings?.teacher || resolvedProfile.teacher,
    headerLeft: "",
    headerRight: legacyBrandSettings?.headerRight || resolvedProfile.headerRight,
    footerLeft: legacyBrandSettings?.footerLeft || resolvedProfile.footerLeft,
    footerCenter: legacyBrandSettings?.footerCenter || resolvedProfile.footerCenter,
    footerRight: legacyBrandSettings?.footerRight || resolvedProfile.footerRight,
  };

  // Apply sub-profile header/footer overrides (variant 1 = multiline for now)
  const subHeaders = resolveSubProfileHeaderFooter(resolvedProfile, settings.subProfileId, 1);
  if (subHeaders) {
    brandSettings.headerLeft = subHeaders.headerLeft;
    brandSettings.headerRight = subHeaders.headerRight;
    brandSettings.footerLeft = subHeaders.footerLeft;
    brandSettings.footerRight = subHeaders.footerRight;
  }

  const hasInteractiveBlocks = visibleBlocks.some(
    (b) =>
      b.type === "multiple-choice" ||
      b.type === "fill-in-blank" ||
      b.type === "fill-in-blank-items" ||
      b.type === "open-response" ||
      b.type === "true-false-matrix" ||
      b.type === "article-training" ||
      b.type === "matching"
  );

  const updateAnswer = useCallback((blockId: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [blockId]: value }));
  }, []);

  const handleCheckAnswers = () => {
    setShowResults(true);
  };

  const handleReset = () => {
    setAnswers({});
    setShowResults(false);
  };

  // For print mode, determine if we have header/footer content
  const hasLogo = !!brandSettings.logo;

  // Replace template variables in header/footer HTML strings
  // In print mode, use span placeholders for page vars so Puppeteer can inject per-page values
  const replaceVariables = (html: string): string => {
    const now = new Date();
    const dateStr = now.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" });
    const langSuffix =
      mode === "print" && contentLocale !== "de"
        ? ` | ${contentLocale.toUpperCase()}`
        : "";
    let result = html
      .replace(/\{current_date\}/g, dateStr)
      .replace(/\{current_year\}/g, String(now.getFullYear()))
      .replace(/\{organization\}/g, brandSettings.organization || "")
      .replace(/\{teacher\}/g, brandSettings.teacher || "")
      .replace(/\{worksheet_uuid\}/g, `${(worksheetId || "").toUpperCase()}${langSuffix}`);
    if (mode === "print") {
      result = result
        .replace(
          /\{current_page\}\s*\/\s*\{no_of_pages\}/g,
          '<span class="page-number-fragment"><span class="var-current-page"></span> / <span class="var-total-pages"></span></span>'
        )
        .replace(/\{current_page\}/g, '<span class="page-number-fragment"><span class="var-current-page"></span></span>')
        .replace(/\{no_of_pages\}/g, '<span class="page-number-fragment"><span class="var-total-pages"></span></span>');
    } else {
      result = result
        .replace(/\{current_page\}/g, '')
        .replace(/\{no_of_pages\}/g, '');
    }
    return result;
  };

  const processedHeaderLeft = replaceVariables(brandSettings.headerLeft || "");
  const processedHeaderRight = replaceVariables(brandSettings.headerRight || "");
  const processedFooterLeft = replaceVariables(brandSettings.footerLeft || "");
  const processedFooterCenter = replaceVariables(brandSettings.footerCenter || "");
  const processedFooterRight = replaceVariables(brandSettings.footerRight || "");

  const hasHeaderLeft = !!processedHeaderLeft;
  const hasHeaderRight = !!processedHeaderRight;
  const hasFooterLeft = !!processedFooterLeft;
  const hasFooterCenter = !!processedFooterCenter || !!settings.footerText;
  const hasFooterRight = !!processedFooterRight;
  const resolvedBodyFontSize = resolvedProfile.textBaseSize || `${(settings.fontSize || 12.5) + 1}px`;
  const showPrintHeader = mode === "print" && settings.showHeader && (hasLogo || hasHeaderLeft || hasHeaderRight);
  const showPrintFooter = mode === "print" && settings.showFooter && (hasFooterLeft || hasFooterCenter || hasFooterRight);
  const printBottomReservePx = Math.max(settings.margins.bottom || 0, 95);
  const resolvedHeadlineWeight = normalizeWeight(brandFonts.headlineWeight, 700);
  const resolvedH1Weight = normalizeWeight(resolvedProfile.h1Weight, resolvedHeadlineWeight);
  const resolvedH2Weight = normalizeWeight(resolvedProfile.h2Weight, resolvedHeadlineWeight);
  const resolvedH3Weight = normalizeWeight(resolvedProfile.h3Weight, resolvedHeadlineWeight);

  const headingCssVars = {
    ["--heading-h1-weight" as string]: String(resolvedH1Weight),
    ["--heading-h2-weight" as string]: String(resolvedH2Weight),
    ["--heading-h3-weight" as string]: String(resolvedH3Weight),
  } as React.CSSProperties;

  const printCssVars = mode === "print" ? ({
    ["--print-body-font" as string]: activeBodyFont,
    ["--print-body-size" as string]: resolvedBodyFontSize,
    ["--print-headline-font" as string]: headlineFont,
    ["--print-headline-weight" as string]: String(resolvedHeadlineWeight),
    ["--print-primary-color" as string]: brandFonts.primaryColor,
    ["--print-h1-size" as string]: resolvedProfile.h1Size,
    ["--print-h2-size" as string]: resolvedProfile.h2Size,
    ["--print-h3-size" as string]: resolvedProfile.h3Size,
    ["--print-h1-weight" as string]: String(resolvedH1Weight),
    ["--print-h2-weight" as string]: String(resolvedH2Weight),
    ["--print-h3-weight" as string]: String(resolvedH3Weight),
    ["--print-header-footer-font" as string]: brandFonts.headerFooterFont,
    ["--print-tfoot-height" as string]: `${printBottomReservePx}px`,
  } as React.CSSProperties) : undefined;

  const viewerCssVars = {
    ...headingCssVars,
    ...(printCssVars || {}),
  } as React.CSSProperties;

  return (
    <div
      className={`min-h-screen ${mode === "print" ? `bg-white print-worksheet-root print-skin-final ${isLandscape ? "print-landscape" : "print-portrait"}` : "bg-muted/30"}`}
      style={viewerCssVars}
    >
      {fontStylesheetUrls.map((href) => (
        <link key={href} rel="stylesheet" href={href} />
      ))}

      {mode === "print" ? (
        /* Print mode: table thead/tfoot for repeating header & footer */
        <>
          {showSolutions && (
            <div style={{
              position: "fixed",
              top: "15mm",
              left: "20mm",
              backgroundColor: "#16a34a",
              color: "white",
              fontSize: "8pt",
              fontWeight: 600,
              padding: "2px 10px",
              borderRadius: 4,
              zIndex: 1000,
              fontFamily: brandFonts.headerFooterFont,
            }}>
              Lösung
            </div>
          )}
          <table className="print-table">
            {showPrintHeader && (
              <thead>
                <tr>
                  <td>
                    <div className="print-header-content">
                      <div>
                        {hasHeaderLeft ? (
                          <span dangerouslySetInnerHTML={{ __html: processedHeaderLeft }} />
                        ) : (
                          hasHeaderRight && <span dangerouslySetInnerHTML={{ __html: processedHeaderRight }} />
                        )}
                      </div>
                      <div style={{ textAlign: "right", display: "flex", alignItems: "flex-start", gap: "12px" }}>
                        {hasHeaderLeft && hasHeaderRight && <span dangerouslySetInnerHTML={{ __html: processedHeaderRight }} />}
                        {hasLogo && <img src={brandSettings.logo} alt="" />}
                      </div>
                    </div>
                  </td>
                </tr>
              </thead>
            )}
            {showPrintFooter && (
              <tfoot>
                <tr>
                  <td>
                    <div className="print-footer-content">
                      <div>
                        {hasFooterLeft && <span dangerouslySetInnerHTML={{ __html: processedFooterLeft }} />}
                      </div>
                      <div style={{ textAlign: "center" }}>
                        {processedFooterCenter ? (
                          <span dangerouslySetInnerHTML={{ __html: processedFooterCenter }} />
                        ) : settings.footerText ? (
                          <span>{settings.footerText}</span>
                        ) : null}
                      </div>
                      <div style={{ textAlign: "right" }}>
                        {hasFooterRight && <span dangerouslySetInnerHTML={{ __html: processedFooterRight }} />}
                      </div>
                    </div>
                  </td>
                </tr>
              </tfoot>
            )}
            <tbody>
              <tr>
                <td>
                  <div className="print-body-content">
                    <div className="space-y-6">
                      {visibleBlocks.map((block) => (
                        <div
                          key={block.id}
                          data-block-id={block.id}
                          className={`worksheet-block worksheet-block-${block.type}`}
                          {...(block.type === "heading" ? { "data-heading-level": String((block as { level: number }).level), "data-heading-bilingual": String(!!(block as { bilingual?: boolean }).bilingual) } : {})}
                          {...(block.type === "text" && (block as { textStyle?: string }).textStyle ? { "data-text-style": (block as { textStyle?: string }).textStyle } : {})}
                          {...(block.type === "page-break" && (block as { restartPageNumbering?: boolean }).restartPageNumbering ? { "data-restart-page-numbering": "true" } : {})}
                        >
                          <ViewerBlockRenderer block={block} mode={mode} primaryColor={brandFonts.primaryColor} accentColor={resolvedProfile.accentColor} headlineFont={resolvedProfile.headlineFont} headingWeights={{ h1: resolvedH1Weight, h2: resolvedH2Weight, h3: resolvedH3Weight }} showSolutions={showSolutions} allBlocks={visibleBlocks} brand={settings.brand || "edoomio"} bodyFont={activeBodyFont} originalBodyFont={baseBodyFont} bodyFontSize={resolvedBodyFontSize} originalBlock={originalBlockMap?.[block.id]} isNonLatin={isNonLatin} translationScale={resolvedProfile.pdfTranslationScale ?? undefined} />
                        </div>
                      ))}
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </>
      ) : (
        /* Online mode */
        <div
          className="mx-auto py-8 px-4"
          style={{ maxWidth: pageWidth }}
        >
          <div className="bg-background rounded-xl shadow-sm border p-8 mb-4">
            <div className="flex items-center gap-3 mb-1">
              <Image
                src="/logo/arbeitsblatt_logo_icon.svg"
                alt="Arbeitsblatt"
                width={28}
                height={28}
              />
              <h1 className="font-bold" style={{ fontSize: 18 }}>{title}</h1>
              <div className="ml-auto">
                <WorksheetLanguageSwitcher
                  contentLocale={contentLocale}
                  availableLocales={availableLocales}
                  setContentLocale={setContentLocale}
                />
              </div>
            </div>
            {settings.showHeader && settings.headerText && (
              <p className="text-sm text-muted-foreground mt-2">{settings.headerText}</p>
            )}
          </div>

          <div className="bg-background rounded-xl shadow-sm border p-8">
            {/* Blocks */}
            <div className="space-y-6" style={{ fontFamily: activeBodyFont }}>
              {visibleBlocks.map((block) => (
                <div
                  key={block.id}
                  data-block-id={block.id}
                  className={`worksheet-block worksheet-block-${block.type} ${worksheetId ? 'group/block relative' : ''}`}
                  {...(block.type === "heading" ? { "data-heading-level": String((block as { level: number }).level), "data-heading-bilingual": String(!!(block as { bilingual?: boolean }).bilingual) } : {})}
                >
                  <ViewerBlockRenderer
                    block={block}
                    mode={mode}
                    answer={answers[block.id]}
                    onAnswer={(value) => updateAnswer(block.id, value)}
                    showResults={showResults}
                    primaryColor={brandFonts.primaryColor}
                    headingWeights={{ h1: resolvedH1Weight, h2: resolvedH2Weight, h3: resolvedH3Weight }}
                    allBlocks={visibleBlocks}
                    brand={settings.brand || "edoomio"}
                    bodyFont={activeBodyFont}
                    originalBodyFont={baseBodyFont}
                    bodyFontSize={resolvedBodyFontSize}
                    originalBlock={originalBlockMap?.[block.id]}
                    isNonLatin={isNonLatin}
                    translationScale={resolvedProfile.pdfTranslationScale ?? undefined}
                  />
                  {worksheetId && mode === "online" && (
                    <BlockScreenshotButton worksheetId={worksheetId} blockId={block.id} />
                  )}
                </div>
              ))}
            </div>

            {/* Legacy footer text fallback */}
            {settings.showFooter && settings.footerText && (
              <div className="text-center text-sm text-muted-foreground mt-8">
                {settings.footerText}
              </div>
            )}
          </div>

          {hasInteractiveBlocks && (
            <div className="flex items-center justify-center gap-3 mt-6 mb-8">
              {!showResults ? (
                <Button size="lg" onClick={handleCheckAnswers} className="gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  {t("checkAnswers")}
                </Button>
              ) : (
                <Button size="lg" variant="outline" onClick={handleReset} className="gap-2">
                  <RotateCcw className="h-5 w-5" />
                  {t("tryAgain")}
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
