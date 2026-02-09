"use client";

import React, { useState, useCallback } from "react";
import { WorksheetBlock, WorksheetSettings, ViewMode, DEFAULT_BRAND_SETTINGS } from "@/types/worksheet";
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
}: {
  title: string;
  blocks: WorksheetBlock[];
  settings: WorksheetSettings;
  mode: ViewMode;
}) {
  const t = useTranslations("viewer");
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [showResults, setShowResults] = useState(false);

  // Filter blocks based on mode visibility
  const visibleBlocks = blocks.filter(
    (b) => b.visibility === "both" || b.visibility === mode
  );

  const pageWidth = settings.pageSize === "a4" ? 794 : 816;
  const isLingostar = settings.brand === "lingostar";
  const fontFamily = isLingostar
    ? "'Encode Sans', sans-serif"
    : "'Asap Condensed', var(--font-asap-condensed), sans-serif";
  const fontUrl = isLingostar
    ? "https://fonts.googleapis.com/css2?family=Encode+Sans:wght@200;300;400;500;600;700;800;900&display=swap"
    : "https://fonts.googleapis.com/css2?family=Asap+Condensed:wght@200;300;400;500;600;700;800;900&display=swap";

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
  const hasHeaderRight = !!brandSettings.headerRight;
  const hasFooterLeft = !!brandSettings.footerLeft;
  const hasFooterCenter = !!brandSettings.footerCenter || !!settings.footerText;
  const hasFooterRight = !!brandSettings.footerRight;
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

                /* Table-based repeating header/footer */
                .print-table { width: 100%; border-collapse: collapse; }
                .print-table thead { display: table-header-group; }
                .print-table tfoot { display: table-footer-group; }
                .print-table thead td, .print-table tfoot td { padding: 0; }

                .print-header-content {
                  height: 25mm;
                  padding: 10mm 10mm 0 10mm;
                  box-sizing: border-box;
                  display: flex;
                  justify-content: space-between;
                  align-items: flex-start;
                  font-size: 10pt;
                  line-height: 1.2;
                  color: #666;
                }
                .print-header-content img { height: 8mm; width: auto; }

                .print-footer-content {
                  height: 25mm;
                  padding: 0 10mm 10mm 10mm;
                  line-height: 1.2;
                  box-sizing: border-box;
                  display: flex;
                  justify-content: space-between;
                  align-items: flex-end;
                  font-size: 10pt;
                  color: #666;
                }

                .print-body-content {
                  padding: 0 20mm;
                }
              `,
            }}
          />
        </>
      )}

      {mode === "print" ? (
        /* Print mode: table-based layout for repeating header/footer on every page */
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
                      {hasHeaderRight && <span dangerouslySetInnerHTML={{ __html: brandSettings.headerRight || "" }} />}
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
                      {hasFooterLeft && <span dangerouslySetInnerHTML={{ __html: brandSettings.footerLeft || "" }} />}
                    </div>
                    <div style={{ textAlign: "center" }}>
                      {brandSettings.footerCenter ? (
                        <span dangerouslySetInnerHTML={{ __html: brandSettings.footerCenter }} />
                      ) : settings.footerText ? (
                        <span>{settings.footerText}</span>
                      ) : null}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      {hasFooterRight && <span dangerouslySetInnerHTML={{ __html: brandSettings.footerRight || "" }} />}
                    </div>
                  </div>
                </td>
              </tr>
            </tfoot>
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
              <h1 className="text-2xl font-bold">{title}</h1>
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
