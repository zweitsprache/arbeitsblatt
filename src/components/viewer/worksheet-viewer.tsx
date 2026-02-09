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
                @page {
                  size: ${settings.pageSize === "a4" ? "A4" : "letter"} ${settings.orientation || "portrait"};
                  margin: ${settings.margins.top}mm ${settings.margins.right}mm ${settings.margins.bottom}mm ${settings.margins.left}mm;
                }
                @page:first {
                  @top-center { content: normal; }
                }
                @page {
                  @top-center {
                    content: string(header-text);
                    font-size: 9pt;
                    color: #888;
                  }
                  @bottom-center {
                    content: string(footer-text);
                    font-size: 9pt;
                    color: #888;
                  }
                  @bottom-right {
                    content: counter(page) " / " counter(pages);
                    font-size: 8pt;
                    color: #aaa;
                  }
                }
                .print-running-header { string-set: header-text content(); display: none; }
                .print-running-footer { string-set: footer-text content(); display: none; }
                .worksheet-block { break-inside: avoid; page-break-inside: avoid; }
                .worksheet-block-text { break-inside: auto; page-break-inside: auto; }
                .worksheet-block-heading { break-after: avoid; page-break-after: avoid; }
                .worksheet-block-image { break-inside: avoid; page-break-inside: avoid; }
                .worksheet-block-columns { break-inside: avoid; page-break-inside: avoid; }
                p { widows: 2; orphans: 2; }
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; font-family: ${fontFamily}; }
              `,
            }}
          />
          {settings.showHeader && settings.headerText && (
            <div className="print-running-header">{settings.headerText}</div>
          )}
          {settings.showFooter && settings.footerText && (
            <div className="print-running-footer">{settings.footerText}</div>
          )}
        </>
      )}
      <div
        className={`mx-auto ${mode === "print" ? "" : "py-8 px-4"}`}
        style={{ maxWidth: pageWidth }}
      >
        {mode === "online" && (
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
        )}

        <div
          className={`${mode === "online" ? "bg-background rounded-xl shadow-sm border p-8" : ""}`}
          style={
            mode === "print"
              ? {
                  fontSize: settings.fontSize,
                  fontFamily: fontFamily,
                }
              : undefined
          }
        >
          {/* Brand header for print mode */}
          {mode === "print" && settings.showHeader && (brandSettings.logo || brandSettings.headerLeft || brandSettings.headerRight) && (
            <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
              <div className="flex items-center gap-2">
                {brandSettings.logo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={brandSettings.logo} alt="" style={{ height: "8mm", width: "auto" }} />
                )}
                {brandSettings.headerLeft && (
                  <div dangerouslySetInnerHTML={{ __html: brandSettings.headerLeft }} />
                )}
              </div>
              {brandSettings.headerRight && (
                <div dangerouslySetInnerHTML={{ __html: brandSettings.headerRight }} />
              )}
            </div>
          )}
          {/* Legacy header text fallback */}
          {mode === "print" && settings.showHeader && settings.headerText && !brandSettings.headerLeft && !brandSettings.headerRight && !brandSettings.logo && (
            <div className="text-center text-sm text-gray-500 mb-4">
              {settings.headerText}
            </div>
          )}

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

          {/* Brand footer for print mode */}
          {mode === "print" && settings.showFooter && (brandSettings.footerLeft || brandSettings.footerCenter || brandSettings.footerRight) && (
            <div className="flex items-center justify-between text-xs text-gray-500 mt-8">
              <div>
                {brandSettings.footerLeft && (
                  <div dangerouslySetInnerHTML={{ __html: brandSettings.footerLeft }} />
                )}
              </div>
              <div>
                {brandSettings.footerCenter && (
                  <div dangerouslySetInnerHTML={{ __html: brandSettings.footerCenter }} />
                )}
              </div>
              <div>
                {brandSettings.footerRight && (
                  <div dangerouslySetInnerHTML={{ __html: brandSettings.footerRight }} />
                )}
              </div>
            </div>
          )}
          {/* Legacy footer text fallback */}
          {settings.showFooter && settings.footerText && !brandSettings.footerLeft && !brandSettings.footerCenter && !brandSettings.footerRight && (
            <div className="text-center text-sm text-muted-foreground mt-8">
              {settings.footerText}
            </div>
          )}
        </div>

        {mode === "online" && hasInteractiveBlocks && (
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
    </div>
  );
}
