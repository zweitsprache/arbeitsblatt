"use client";

import React, { useState, useCallback } from "react";
import { WorksheetBlock, WorksheetSettings, ViewMode, DEFAULT_BRAND_SETTINGS, BRAND_FONTS } from "@/types/worksheet";
import { ViewerBlockRenderer } from "./viewer-block-renderer";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";

export function WorksheetViewer({
  title,
  blocks,
  settings,
  mode,
  worksheetId,
}: {
  title: string;
  blocks: WorksheetBlock[];
  settings: WorksheetSettings;
  mode: ViewMode;
  worksheetId?: string;
}) {
  const t = useTranslations("viewer");
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [showResults, setShowResults] = useState(false);

  // Filter blocks based on mode visibility
  const visibleBlocks = blocks.filter(
    (b) => b.visibility === "both" || b.visibility === mode
  );

  const pageWidth = settings.pageSize === "a4" ? 794 : 816;
  const brandFonts = BRAND_FONTS[settings.brand || "edoomio"];
  const fontFamily = brandFonts.bodyFont;
  const headlineFont = brandFonts.headlineFont;
  const fontUrl = brandFonts.googleFontsUrl;

  // Get brand settings with fallbacks
  const brandSettings = {
    ...DEFAULT_BRAND_SETTINGS[settings.brand || "edoomio"],
    ...settings.brandSettings,
  };

  const hasInteractiveBlocks = visibleBlocks.some(
    (b) =>
      b.type === "multiple-choice" ||
      b.type === "fill-in-blank" ||
      b.type === "open-response" ||
      b.type === "true-false-matrix" ||
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

  const processedHeaderRight = replaceVariables(brandSettings.headerRight || "");
  const processedFooterLeft = replaceVariables(brandSettings.footerLeft || "");
  const processedFooterCenter = replaceVariables(brandSettings.footerCenter || "");
  const processedFooterRight = replaceVariables(brandSettings.footerRight || "");

  const hasHeaderRight = !!processedHeaderRight;
  const hasFooterLeft = !!processedFooterLeft;
  const hasFooterCenter = !!processedFooterCenter || !!settings.footerText;
  const hasFooterRight = !!processedFooterRight;
  const showPrintHeader = mode === "print" && settings.showHeader && (hasLogo || hasHeaderRight);
  const showPrintFooter = mode === "print" && settings.showFooter && (hasFooterLeft || hasFooterCenter || hasFooterRight);

  return (
    <div className={`min-h-screen ${mode === "print" ? "bg-white" : "bg-muted/30"}`}>
      {/* Print/PDF styles + Google Fonts link for reliable font loading */}
      {mode === "print" && (
        <>
          {/* eslint-disable-next-line @next/next/no-page-custom-font */}
          <link
            rel="stylesheet"
            href={fontUrl}
          />
          <style
            dangerouslySetInnerHTML={{
              __html: `
                @page { margin: 0; size: A4; }
                html, body { margin: 0; padding: 0; }
                .worksheet-block { break-inside: avoid; page-break-inside: avoid; }
                .worksheet-block-text { break-inside: auto; page-break-inside: auto; }
                .worksheet-block-heading { break-after: avoid; page-break-after: avoid; }
                .worksheet-block-image { break-inside: avoid; page-break-inside: avoid; }
                .worksheet-block-columns { break-inside: avoid; page-break-inside: avoid; }
                p { widows: 2; orphans: 2; }
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; font-family: ${fontFamily}; }
                h1, h2, h3, h4, h5, h6 { font-family: ${headlineFont}; font-weight: ${brandFonts.headlineWeight}; }

                /* Table-based repeating header */
                .print-table { width: 100%; border-collapse: collapse; }
                .print-table thead { display: table-header-group; }
                .print-table thead td { padding: 0; }

                .print-header-content {
                  height: 25mm;
                  padding: 10mm 10mm 0 10mm;
                  box-sizing: border-box;
                  display: flex;
                  justify-content: space-between;
                  align-items: flex-start;
                  font-family: ${brandFonts.headerFooterFont};
                  font-size: 9pt;
                  line-height: 1.35;
                  color: #666;
                }
                .print-header-content img { height: 8mm; width: auto; }

                /* Fixed footer - repeats on every page via position:fixed in print */
                .print-footer-fixed {
                  position: fixed;
                  bottom: 0;
                  left: 0;
                  right: 0;
                  height: 25mm;
                  padding: 0 10mm 8mm 10mm;
                  line-height: 1.35;
                  box-sizing: border-box;
                  display: flex;
                  justify-content: space-between;
                  align-items: flex-end;
                  font-family: ${brandFonts.headerFooterFont};
                  font-size: 9pt;
                  color: #666;
                }

                .print-body-content {
                  padding: 0 20mm 25mm 20mm;
                }
              `,
            }}
          />
        </>
      )}

      {mode === "print" ? (
        /* Print mode: table thead for repeating header, position:fixed for footer */
        <>
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
                        {hasLogo && <img src={brandSettings.logo} alt="" />}
                      </div>
                      <div style={{ textAlign: "right" }}>
                        {hasHeaderRight && <span dangerouslySetInnerHTML={{ __html: processedHeaderRight }} />}
                      </div>
                    </div>
                  </td>
                </tr>
              </thead>
            )}
            <tbody>
              <tr>
                <td>
                  <div className="print-body-content"
                    style={{ fontSize: settings.fontSize, fontFamily: fontFamily }}
                  >
                    <div className="space-y-6">
                      {visibleBlocks.map((block) => (
                        <div
                          key={block.id}
                          className={`worksheet-block worksheet-block-${block.type}`}
                        >
                          <ViewerBlockRenderer block={block} mode={mode} />
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
                  className={`worksheet-block worksheet-block-${block.type}`}
                >
                  <ViewerBlockRenderer
                    block={block}
                    mode={mode}
                    answer={answers[block.id]}
                    onAnswer={(value) => updateAnswer(block.id, value)}
                    showResults={showResults}
                  />
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
