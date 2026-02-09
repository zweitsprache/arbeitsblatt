"use client";

import React, { useMemo, useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useEditor } from "@/store/editor-store";
import { ViewerBlockRenderer } from "@/components/viewer/viewer-block-renderer";
import { WorksheetBlock, DEFAULT_BRAND_SETTINGS } from "@/types/worksheet";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ZoomIn, ZoomOut, Printer, RotateCcw } from "lucide-react";

// DIN A4: 210mm × 297mm
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const LETTER_WIDTH_MM = 216;
const LETTER_HEIGHT_MM = 279;

// Convert mm to px at 96 DPI (1mm ≈ 3.7795px)
const MM_TO_PX = 96 / 25.4;

// Gap between blocks in px (matches space-y-6 = 1.5rem = 24px)
const BLOCK_GAP = 24;

// Header/footer reserved height in px (text + padding + border)
const HEADER_HEIGHT = 40;
const FOOTER_HEIGHT = 40;

type PageDef = { blockIndices: number[] };

export function PrintPreview({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { state } = useEditor();
  const t = useTranslations("printPreview");
  const [zoom, setZoom] = useState(70);
  const [pages, setPages] = useState<PageDef[]>([]);
  const measureRef = React.useRef<HTMLDivElement>(null);
  const [measureKey, setMeasureKey] = useState(0);

  const isA4 = state.settings.pageSize === "a4";
  const isPortrait = state.settings.orientation === "portrait";

  const pageWidthMM = isA4 ? A4_WIDTH_MM : LETTER_WIDTH_MM;
  const pageHeightMM = isA4 ? A4_HEIGHT_MM : LETTER_HEIGHT_MM;

  const effectiveWidthMM = isPortrait ? pageWidthMM : pageHeightMM;
  const effectiveHeightMM = isPortrait ? pageHeightMM : pageWidthMM;

  const pageWidthPx = effectiveWidthMM * MM_TO_PX;
  const pageHeightPx = effectiveHeightMM * MM_TO_PX;

  const { margins, fontSize, fontFamily } = state.settings;
  const isLingostar = state.settings.brand === "lingostar";
  const effectiveFontFamily = isLingostar
    ? "'Encode Sans', sans-serif"
    : "var(--font-asap-condensed), " + fontFamily;

  // Get brand settings with fallbacks
  const brandSettings = {
    ...DEFAULT_BRAND_SETTINGS[state.settings.brand || "edoomio"],
    ...state.settings.brandSettings,
  };

  const paddingTopPx = margins.top * MM_TO_PX;
  const paddingBottomPx = margins.bottom * MM_TO_PX;
  const paddingLeftPx = margins.left * MM_TO_PX;
  const paddingRightPx = margins.right * MM_TO_PX;

  const hasHeader = state.settings.showHeader && (!!state.settings.headerText || !!brandSettings.headerRight);
  const hasFooter = state.settings.showFooter && (!!state.settings.footerText || !!brandSettings.footerLeft || !!brandSettings.footerCenter || !!brandSettings.footerRight);

  // Available content height per page (header/footer are now in margins, don't reduce content)
  const contentHeight =
    pageHeightPx -
    paddingTopPx -
    paddingBottomPx;

  // Filter blocks by print visibility
  const visibleBlocks = useMemo(
    () =>
      state.blocks.filter(
        (b) => b.visibility === "both" || b.visibility === "print"
      ),
    [state.blocks]
  );

  // Re-trigger measurement when blocks/settings change
  useEffect(() => {
    if (open) {
      setMeasureKey((k) => k + 1);
    }
  }, [open, visibleBlocks, margins, fontSize, fontFamily, state.settings.pageSize, state.settings.orientation, state.settings.brand]);

  // Measure block heights and paginate
  const paginate = useCallback(() => {
    const container = measureRef.current;
    if (!container) return;

    const blockEls = container.querySelectorAll<HTMLElement>("[data-block-measure]");
    if (blockEls.length === 0) {
      setPages([{ blockIndices: [] }]);
      return;
    }

    const heights: number[] = [];
    blockEls.forEach((el) => {
      heights.push(el.offsetHeight);
    });

    // Greedy pagination: fit blocks onto pages
    const result: PageDef[] = [];
    let currentPage: number[] = [];
    let usedHeight = 0;

    for (let i = 0; i < heights.length; i++) {
      const blockH = heights[i];
      const gapH = currentPage.length > 0 ? BLOCK_GAP : 0;

      if (usedHeight + gapH + blockH <= contentHeight || currentPage.length === 0) {
        // Fits on current page (or is first block — always place even if oversized)
        currentPage.push(i);
        usedHeight += gapH + blockH;
      } else {
        // Start new page
        result.push({ blockIndices: currentPage });
        currentPage = [i];
        usedHeight = blockH;
      }
    }
    if (currentPage.length > 0) {
      result.push({ blockIndices: currentPage });
    }

    setPages(result);
  }, [contentHeight]);

  // Run pagination after measure div renders
  useEffect(() => {
    if (!open || visibleBlocks.length === 0) {
      setPages([{ blockIndices: [] }]);
      return;
    }
    // Wait for React to paint the hidden measure container
    const raf = requestAnimationFrame(() => {
      // Double rAF to ensure layout
      requestAnimationFrame(() => {
        paginate();
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [open, measureKey, paginate, visibleBlocks.length]);

  // Prince XML-compliant @page CSS
  const printStylesheet = useMemo(
    () => `
/* ─── Prince XML / DocRaptor compliant print styles ─── */

@page {
  size: ${isA4 ? "A4" : "letter"} ${isPortrait ? "portrait" : "landscape"};
  margin: ${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm;

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

@page :first {
  @top-center { content: normal; }
}

/* ─── Page-break rules per block type ─── */

.worksheet-block {
  break-inside: avoid;
  page-break-inside: avoid;
}

.worksheet-block-text {
  break-inside: auto;
  page-break-inside: auto;
}

.worksheet-block-multiple-choice,
.worksheet-block-matching,
.worksheet-block-true-false-matrix,
.worksheet-block-order-items,
.worksheet-block-sorting-categories,
.worksheet-block-word-search,
.worksheet-block-inline-choices,
.worksheet-block-word-bank,
.worksheet-block-fill-in-blank,
.worksheet-block-unscramble-words,
.worksheet-block-fix-sentences {
  break-inside: avoid;
  page-break-inside: avoid;
}

.worksheet-block-image {
  break-inside: avoid;
  page-break-inside: avoid;
}

.worksheet-block-columns {
  break-inside: avoid;
  page-break-inside: avoid;
}

.worksheet-block-heading {
  break-after: avoid;
  page-break-after: avoid;
}

p { widows: 2; orphans: 2; }

.print-running-header {
  string-set: header-text content();
  display: none;
}
.print-running-footer {
  string-set: footer-text content();
  display: none;
}`,
    [isA4, isPortrait, margins]
  );

  const handleZoomIn = () => setZoom((z) => Math.min(z + 10, 150));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 10, 30));
  const handleResetZoom = () => setZoom(70);

  const totalPages = pages.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[95vw] w-[95vw] h-[95vh] p-0 flex flex-col">
        <DialogHeader className="px-6 py-3 border-b shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Printer className="h-4 w-4" />
              {t("title")}
            </DialogTitle>
            <div className="flex items-center gap-4">
              {/* Page info */}
              <div className="text-xs text-muted-foreground">
                {isA4 ? "DIN A4" : "Letter"} · {isPortrait ? t("portrait") : t("landscape")} · {effectiveWidthMM}×{effectiveHeightMM}mm · {t("pageCount", { count: totalPages })}
              </div>

              {/* Zoom controls */}
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomOut}>
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs font-mono w-10 text-center">{zoom}%</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomIn}>
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleResetZoom}>
                  <RotateCcw className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Hidden measurement container — render all blocks here to measure their heights */}
        <div
          ref={measureRef}
          key={measureKey}
          aria-hidden
          style={{
            position: "absolute",
            top: -9999,
            left: -9999,
            width: pageWidthPx - paddingLeftPx - paddingRightPx,
            fontFamily: effectiveFontFamily,
            fontSize: `${fontSize}px`,
            lineHeight: 1.5,
            visibility: "hidden",
            pointerEvents: "none",
          }}
        >
          {visibleBlocks.map((block, i) => (
            <div key={block.id} data-block-measure={i}>
              <div className={`worksheet-block worksheet-block-${block.type}`}>
                <ViewerBlockRenderer block={block} mode="print" />
              </div>
            </div>
          ))}
        </div>

        {/* Paginated preview area */}
        <div className="flex-1 overflow-auto bg-muted/50 py-8">
          <div
            className="flex flex-col items-center gap-8"
            style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: "top center",
            }}
          >
            {pages.map((page, pageIndex) => (
              <React.Fragment key={pageIndex}>
                {/* Single A4 page */}
                <div
                  className="bg-white shadow-2xl border border-border/50 relative shrink-0"
                  style={{
                    width: pageWidthPx,
                    height: pageHeightPx,
                    fontFamily: effectiveFontFamily,
                    fontSize: `${fontSize}px`,
                    lineHeight: 1.5,
                  }}
                >
                  {/* Page number label */}
                  <div className="absolute top-1.5 right-3 text-[9px] text-muted-foreground/40 font-mono">
                    {t("pageLabel", { page: pageIndex + 1, total: totalPages })}
                  </div>

                  {/* Page size label */}
                  <div className="absolute top-1.5 left-3 text-[9px] text-muted-foreground/40 font-mono">
                    {effectiveWidthMM}×{effectiveHeightMM}mm
                  </div>

                  {/* Margin guides */}
                  <div
                    className="absolute border border-dashed border-blue-200/30 pointer-events-none"
                    style={{
                      top: paddingTopPx,
                      left: paddingLeftPx,
                      right: paddingRightPx,
                      bottom: paddingBottomPx,
                    }}
                  />

                  {/* Logo - positioned at 10mm from page edges */}
                  {brandSettings.logo && (
                    <img
                      src={brandSettings.logo}
                      alt=""
                      style={{
                        position: "absolute",
                        top: `${10 * MM_TO_PX}px`,
                        left: `${10 * MM_TO_PX}px`,
                        height: `${8 * MM_TO_PX}px`,
                        width: "auto",
                      }}
                    />
                  )}

                  {/* Header Right - positioned at 10mm from top/right */}
                  {brandSettings.headerRight && (
                    <div
                      style={{
                        position: "absolute",
                        top: `${10 * MM_TO_PX}px`,
                        right: `${10 * MM_TO_PX}px`,
                        textAlign: "right",
                      }}
                      className="text-[10px] text-gray-400"
                      dangerouslySetInnerHTML={{ __html: brandSettings.headerRight }}
                    />
                  )}

                  {/* Content area with margins */}
                  <div
                    className="absolute flex flex-col overflow-hidden"
                    style={{
                      top: paddingTopPx,
                      left: paddingLeftPx,
                      right: paddingRightPx,
                      bottom: paddingBottomPx,
                    }}
                  >
                    {/* Blocks for this page */}
                    <div className="space-y-6 flex-1">
                    {page.blockIndices.length === 0 && pageIndex === 0 ? (
                      <div className="flex items-center justify-center py-20 text-muted-foreground/50">
                        <p className="text-sm">{t("noBlocks")}</p>
                      </div>
                    ) : (
                      page.blockIndices.map((blockIdx) => {
                        const block = visibleBlocks[blockIdx];
                        if (!block) return null;
                        return (
                          <div
                            key={block.id}
                            className={`worksheet-block worksheet-block-${block.type}`}
                          >
                            <ViewerBlockRenderer block={block} mode="print" />
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Footer */}
                  {hasFooter && (
                    <div className="flex items-center justify-between text-[10px] text-gray-400 mt-auto pt-3 shrink-0">
                      <div>
                        {brandSettings.footerLeft ? (
                          <div dangerouslySetInnerHTML={{ __html: brandSettings.footerLeft }} />
                        ) : null}
                      </div>
                      <div>
                        {brandSettings.footerCenter ? (
                          <div dangerouslySetInnerHTML={{ __html: brandSettings.footerCenter }} />
                        ) : state.settings.footerText ? (
                          <span>{state.settings.footerText}</span>
                        ) : null}
                      </div>
                      <div>
                        {brandSettings.footerRight ? (
                          <div dangerouslySetInnerHTML={{ __html: brandSettings.footerRight }} />
                        ) : null}
                      </div>
                    </div>
                  )}
                  </div>{/* End content area */}
                </div>

                {/* Page break indicator between pages */}
                {pageIndex < totalPages - 1 && (
                  <div className="flex items-center gap-2 w-full px-8" style={{ maxWidth: pageWidthPx }}>
                    <div className="flex-1 border-t-2 border-dashed border-red-300/40" />
                    <span className="text-[10px] text-red-400/60 font-mono whitespace-nowrap">
                      ✂ {t("pageBreak")}
                    </span>
                    <div className="flex-1 border-t-2 border-dashed border-red-300/40" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Bottom bar with Prince CSS preview */}
        <div className="px-6 py-3 border-t bg-muted/30 shrink-0">
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors font-medium">
              {t("showPrinceCSS")}
            </summary>
            <pre className="mt-2 p-3 bg-muted rounded-md overflow-auto max-h-48 text-[11px] font-mono leading-relaxed">
              {printStylesheet}
            </pre>
          </details>
        </div>
      </DialogContent>
    </Dialog>
  );
}
