"use client";

import React, { useState, useCallback, useMemo } from "react";
import { WorksheetBlock, WorksheetSettings, ViewMode, BRAND_FONTS, BrandProfile, getStaticBrandProfile, applyBrandOverrides, resolveSubProfileHeaderFooter } from "@/types/worksheet";
import { ViewerBlockRenderer } from "./viewer-block-renderer";
import { BlockScreenshotButton } from "./block-screenshot-button";
import { WorksheetLanguageSwitcher } from "./worksheet-language-switcher";
import { applyWorksheetTranslations } from "@/lib/worksheet-translation";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";

/** Language codes that use non-Latin scripts and should default to Noto Sans */
const NON_LATIN_LOCALES = new Set(["uk", "ru", "bg", "sr", "mk", "ar", "fa", "he", "zh", "ja", "ko", "hi", "bn", "th", "el"]);

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

  // Filter blocks based on mode visibility (use displayBlocks)
  const visibleBlocks = displayBlocks.filter(
    (b) => b.visibility === "both" || b.visibility === mode
  );

  const pageWidth = settings.pageSize === "a4" ? 794 : 816;

  // Resolve brand profile: prefer prop, then static fallback, then apply per-worksheet overrides
  const resolvedProfile = applyBrandOverrides(
    brandProfile ?? getStaticBrandProfile(settings.brand || "edoomio"),
    settings.brandOverrides,
  );

  const brandFonts = BRAND_FONTS[settings.brand || "edoomio"] ?? {
    bodyFont: resolvedProfile.bodyFont,
    headlineFont: resolvedProfile.headlineFont,
    headlineWeight: resolvedProfile.headlineWeight,
    subHeadlineFont: resolvedProfile.subHeadlineFont,
    subHeadlineWeight: resolvedProfile.subHeadlineWeight,
    headerFooterFont: resolvedProfile.headerFooterFont,
    googleFontsUrl: resolvedProfile.googleFontsUrl,
    primaryColor: resolvedProfile.primaryColor,
  };

  // If a brand profile was provided, prefer its values over the static map
  if (brandProfile) {
    brandFonts.bodyFont = resolvedProfile.bodyFont;
    brandFonts.headlineFont = resolvedProfile.headlineFont;
    brandFonts.headlineWeight = resolvedProfile.headlineWeight;
    brandFonts.subHeadlineFont = resolvedProfile.subHeadlineFont;
    brandFonts.subHeadlineWeight = resolvedProfile.subHeadlineWeight;
    brandFonts.headerFooterFont = resolvedProfile.headerFooterFont;
    brandFonts.googleFontsUrl = resolvedProfile.googleFontsUrl;
    brandFonts.primaryColor = resolvedProfile.primaryColor;
  }

  const isNonLatin = NON_LATIN_LOCALES.has(contentLocale);
  // Keep brand typography as the base in all locales (including bilingual/translated print).
  // Non-Latin-specific tweaks are handled in individual block renderers where needed.
  const fontFamily = brandFonts.bodyFont;
  const headlineFont = brandFonts.headlineFont;
  const fontUrl = brandFonts.googleFontsUrl;

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
    let result = html
      .replace(/\{current_date\}/g, dateStr)
      .replace(/\{current_year\}/g, String(now.getFullYear()))
      .replace(/\{organization\}/g, brandSettings.organization || "")
      .replace(/\{teacher\}/g, brandSettings.teacher || "")
      .replace(/\{worksheet_uuid\}/g, (worksheetId || "").toUpperCase());
    if (mode === "print") {
      result = result
        .replace(/\{current_page\}/g, '<span class="var-current-page"></span>')
        .replace(/\{no_of_pages\}/g, '<span class="var-total-pages"></span>');
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

  const printCssVars = mode === "print" ? ({
    ["--print-body-font" as string]: fontFamily,
    ["--print-body-size" as string]: resolvedBodyFontSize,
    ["--print-headline-font" as string]: headlineFont,
    ["--print-headline-weight" as string]: String(brandFonts.headlineWeight),
    ["--print-h1-size" as string]: resolvedProfile.h1Size,
    ["--print-h2-size" as string]: resolvedProfile.h2Size,
    ["--print-h3-size" as string]: resolvedProfile.h3Size,
    ["--print-h1-weight" as string]: resolvedProfile.h1Weight ? String(resolvedProfile.h1Weight) : undefined,
    ["--print-h2-weight" as string]: resolvedProfile.h2Weight ? String(resolvedProfile.h2Weight) : undefined,
    ["--print-h3-weight" as string]: String(resolvedProfile.h3Weight ?? 800),
    ["--print-header-footer-font" as string]: brandFonts.headerFooterFont,
  } as React.CSSProperties) : undefined;

  return (
    <div className={`min-h-screen ${mode === "print" ? "bg-white print-worksheet-root" : "bg-muted/30"}`} style={printCssVars}>
      {/* Print/PDF styles + Google Fonts link for reliable font loading */}
      {mode === "print" && (
        <>
          <link
            rel="stylesheet"
            href={fontUrl}
          />
          {/* Noto Sans as universal fallback for non-Latin scripts (Cyrillic, Arabic, etc.) */}
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;600;700&display=swap"
          />
        </>
      )}

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
          {showPrintFooter && (
            <div className="print-footer-fixed">
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
                    <div className="print-footer-spacer" />
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
                          {...(block.type === "text" && (block as { textStyle?: string }).textStyle ? { "data-text-style": (block as { textStyle?: string }).textStyle } : {})}
                          {...(block.type === "page-break" && (block as { restartPageNumbering?: boolean }).restartPageNumbering ? { "data-restart-page-numbering": "true" } : {})}
                        >
                          <ViewerBlockRenderer block={block} mode={mode} primaryColor={brandFonts.primaryColor} showSolutions={showSolutions} allBlocks={visibleBlocks} brand={settings.brand || "edoomio"} bodyFont={fontFamily} bodyFontSize={resolvedBodyFontSize} originalBlock={originalBlockMap?.[block.id]} isNonLatin={isNonLatin} translationScale={resolvedProfile.pdfTranslationScale ?? undefined} />
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
            <div className="space-y-6">
              {visibleBlocks.map((block) => (
                <div
                  key={block.id}
                  data-block-id={block.id}
                  className={`worksheet-block worksheet-block-${block.type} ${worksheetId ? 'group/block relative' : ''}`}
                >
                  <ViewerBlockRenderer
                    block={block}
                    mode={mode}
                    answer={answers[block.id]}
                    onAnswer={(value) => updateAnswer(block.id, value)}
                    showResults={showResults}
                    primaryColor={brandFonts.primaryColor}
                    allBlocks={visibleBlocks}
                    brand={settings.brand || "edoomio"}
                    bodyFont={fontFamily}
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
