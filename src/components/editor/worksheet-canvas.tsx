"use client";

import React from "react";
import { useTranslations } from "next-intl";
import {
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useEditor } from "@/store/editor-store";
import { SortableBlock } from "./sortable-block";
import { Plus } from "lucide-react";
import { resolveBrandFontFamilyOverride } from "@/lib/brand-font-utils";
import {
  getPageDimensionsPx,
  getPrintBodyHeightPx,
  getPrintFooterReservePx,
  getPrintHeaderHeightPx,
  mmToPx,
} from "@/lib/print-layout";
import {
  applyBrandOverrides,
  resolveBrandLogo,
  resolveSubProfileHeaderFooter,
  type WorksheetBlock,
} from "@/types/worksheet";


function DropIndicator({ isActive }: { isActive: boolean }) {
  return (
    <div
      className={`relative transition-all duration-200 ${isActive ? "h-1" : "h-0"}`}
    >
      {isActive && (
        <div className="absolute inset-x-0 top-0 flex items-center">
          <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
          <div className="flex-1 h-0.5 bg-primary" />
          <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
        </div>
      )}
    </div>
  );
}

function EmptyDropZone() {
  const t = useTranslations("canvas");
  const { setNodeRef, isOver } = useDroppable({ id: "canvas-drop-zone" });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col items-center justify-center min-h-[400px] text-muted-foreground rounded-lg border-2 border-dashed transition-colors
        ${isOver ? "border-primary bg-primary/5" : "border-transparent"}`}
    >
      <Plus className="h-12 w-12 mb-4 opacity-30" />
      <p className="text-lg font-medium opacity-50">
        {t("dragBlocksHere")}
      </p>
      <p className="text-sm opacity-30 mt-1">
        {t("orDoubleClick")}
      </p>
    </div>
  );
}

export function WorksheetCanvas({
  activeId,
  overId,
  overPosition,
  showPageGuides = true,
}: {
  activeId: string | null;
  overId: string | null;
  overPosition: "above" | "below";
  showPageGuides?: boolean;
}) {
  const { state, dispatch } = useEditor();
  const { setNodeRef: setCanvasRef, isOver: isCanvasOver } = useDroppable({ id: "canvas-drop-zone" });
  const blockRefs = React.useRef<Map<string, HTMLDivElement>>(new Map());

  const clearSelectionIfWorkspaceClick = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      dispatch({ type: "SELECT_BLOCK", payload: null });
    }
  }, [dispatch]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isPresentationMode = (state.settings as any)._presentationMode === true;
  const isLandscape = state.settings.orientation === "landscape" || state.settings.orientation === "landscape-canva";

  // Page dimensions (A4/Letter at 96 DPI, landscape swaps those values)
  const { widthPx: pageWidth, heightPx: printPageHeight } = getPageDimensionsPx(state.settings);
  const pageHeight = isPresentationMode ? 630 : printPageHeight;

  // Fixed print regions (match print CSS exactly, converted mm → px)
  const HEADER_HEIGHT = getPrintHeaderHeightPx(); // .print-header-content height
  const BODY_SIDE_PADDING = mmToPx(20); // .print-body-content left/right padding

  // ─── Resolve header/footer from brand settings ─────────────
  const resolvedProfile = applyBrandOverrides(
    state.brandProfile,
    state.settings.brandOverrides,
  );
  const fontStylesheetUrls = Array.from(
    new Set(resolvedProfile.googleFontsUrl?.trim() ? [resolvedProfile.googleFontsUrl.trim()] : []),
  );
  const resolvedBodyFontFamily = resolvedProfile.bodyFont || "'Encode Sans Semi Condensed', sans-serif";
  const brandKey = (state.settings.brand || "worksheet").replace(/[^a-zA-Z0-9_-]+/g, "-");
  const exampleFontOverride = resolveBrandFontFamilyOverride(resolvedProfile.exampleTextFont, {
    fallbackFontFamily: resolvedBodyFontFamily,
    generatedFamilyNamePrefix: `worksheet-example-${brandKey}`,
  });

  const nonEmpty = (value?: string | null, fallback?: string) => {
    const v = value?.trim();
    return v ? v : fallback ?? "";
  };

  const brandHeaderFooter = {
    logo: resolveBrandLogo(resolvedProfile, "full"),
    organization: resolvedProfile.organization,
    teacher: resolvedProfile.teacher,
    headerLeft: "",
    headerRight: nonEmpty(state.settings.brandOverrides?.headerRight, resolvedProfile.headerRight),
    footerLeft: nonEmpty(state.settings.brandOverrides?.footerLeft, resolvedProfile.footerLeft),
    footerCenter: nonEmpty(state.settings.brandOverrides?.footerCenter, resolvedProfile.footerCenter),
    footerRight: nonEmpty(state.settings.brandOverrides?.footerRight, resolvedProfile.footerRight),
  };

  // Apply sub-profile header/footer overrides (variant 1 = multiline)
  const subHeaders = resolveSubProfileHeaderFooter(resolvedProfile, state.settings.subProfileId, 1);
  if (subHeaders) {
    brandHeaderFooter.headerLeft = subHeaders.headerLeft;
    brandHeaderFooter.headerRight = subHeaders.headerRight;
    brandHeaderFooter.footerLeft = subHeaders.footerLeft;
    brandHeaderFooter.footerRight = subHeaders.footerRight;
  }

  // Replace template variables (online/editor mode — no page numbers)
  const replaceVariables = (html: string): string => {
    const now = new Date();
    const dateStr = now.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" });
    return html
      .replace(/\{current_date\}/g, dateStr)
      .replace(/\{current_year\}/g, String(now.getFullYear()))
      .replace(/\{organization\}/g, brandHeaderFooter.organization || "")
      .replace(/\{teacher\}/g, brandHeaderFooter.teacher || "")
      .replace(/\{worksheet_uuid\}/g, (state.worksheetId || "").toUpperCase())
      .replace(/\{current_page\}/g, "")
      .replace(/\{no_of_pages\}/g, "");
  };

  const hasLogo = !!brandHeaderFooter.logo;
  const processedHeaderLeft = replaceVariables(brandHeaderFooter.headerLeft || "");
  const processedHeaderRight = replaceVariables(brandHeaderFooter.headerRight || "");
  const processedFooterLeft = replaceVariables(brandHeaderFooter.footerLeft || "");
  const processedFooterCenter = replaceVariables(brandHeaderFooter.footerCenter || "");
  const processedFooterRight = replaceVariables(brandHeaderFooter.footerRight || "");
  const hasHeaderLeft = !!processedHeaderLeft;
  const hasHeaderRight = !!processedHeaderRight;
  const hasFooterLeft = !!processedFooterLeft;
  const hasFooterCenter = !!processedFooterCenter || !!state.settings.footerText;
  const hasFooterRight = !!processedFooterRight;
  const showHeader = state.settings.showHeader && (hasLogo || hasHeaderLeft || hasHeaderRight);
  const showFooter = state.settings.showFooter && (hasFooterLeft || hasFooterCenter || hasFooterRight);
  const headerFooterFont =
    resolvedProfile.headerFooterFont?.trim() || "'Encode Sans', sans-serif";
  const resolvedBodyFontSize = resolvedProfile.textBaseSize || `${state.settings.fontSize || 12.5}px`;
  const canvasBackgroundColor = resolvedProfile.primaryColor
    ? `color-mix(in srgb, ${resolvedProfile.primaryColor} 6%, white)`
    : "#f1f5f9";

  const footerReserveHeight = getPrintFooterReservePx(state.settings, showFooter);

  // Usable height for body content = page height minus header/footer regions
  const usableHeight = getPrintBodyHeightPx(state.settings, pageHeight, showHeader, showFooter);

  const blockGap = resolvedProfile.blockGap || "1.5rem";

  const parseGapToPx = React.useCallback((value: string): number => {
    const trimmed = value.trim();
    const numeric = Number.parseFloat(trimmed);
    if (!Number.isFinite(numeric)) return 24;
    if (trimmed.endsWith("px")) return numeric;
    if (trimmed.endsWith("mm")) return mmToPx(numeric);
    if (trimmed.endsWith("rem")) return numeric * 16;
    return numeric;
  }, []);
  const blockGapPx = parseGapToPx(blockGap);

  const isCardSheetBlock = (block: WorksheetBlock) => (
    block.type === "domino" ||
    block.type === "flashcards" ||
    block.type === "aufgabenkarten" ||
    block.type === "bingo-cards" ||
    block.type === "quartett" ||
    block.type === "taboo" ||
    block.type === "syllable-cards"
  );

  const getSiblingGapPx = React.useCallback((previousBlock: WorksheetBlock | undefined, block: WorksheetBlock): number => {
    if (!previousBlock) return 0;
    if (previousBlock.type === "page-break") return 0;
    if (isCardSheetBlock(previousBlock) && isCardSheetBlock(block)) return 0;

    return blockGapPx;
  }, [blockGapPx]);

  // Break blocks into pages based on actual rendered heights
  const pages = React.useMemo(() => {
    type CanvasPage = { pageNum: number; blocks: WorksheetBlock[]; height: number };
    const result: CanvasPage[] = [];
    let currentPage: CanvasPage = { pageNum: 0, blocks: [], height: 0 };

    for (const block of state.blocks) {
      // Get actual rendered height from ref, fallback to estimate if not measured yet
      const blockEl = blockRefs.current.get(block.id);
      const blockHeight = blockEl?.offsetHeight || 100;

      const isManualBreak = block.type === "page-break";

      const previousBlock = currentPage.blocks[currentPage.blocks.length - 1];
      const interBlockGap = getSiblingGapPx(previousBlock, block);

      if (!isManualBreak && interBlockGap > 0) {
        currentPage.height += interBlockGap;
      }

      // If adding this block would exceed the page, start a new page
      if (
        !isManualBreak &&
        currentPage.height + blockHeight > usableHeight &&
        currentPage.blocks.length > 0
      ) {
        result.push(currentPage);
        currentPage = { pageNum: result.length, blocks: [], height: 0 };
      }

      currentPage.blocks.push(block);
      if (!isManualBreak) {
        currentPage.height += blockHeight;
      }

      // Manual page break: finalize this page so following blocks start on a new page
      if (isManualBreak) {
        result.push(currentPage);
        currentPage = { pageNum: result.length, blocks: [], height: 0 };
      }
    }

    if (currentPage.blocks.length > 0) {
      result.push(currentPage);
    }

    return result;
  }, [state.blocks, usableHeight, getSiblingGapPx]);

  return (
    <div
      className="flex-1 overflow-auto canvas-scroll"
      style={{ backgroundColor: canvasBackgroundColor, scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      {fontStylesheetUrls.map((href) => (
        <link key={href} rel="stylesheet" href={href} />
      ))}
      {exampleFontOverride.fontFaceCss ? <style>{exampleFontOverride.fontFaceCss}</style> : null}
      <div className="flex justify-center pt-4 pb-8 px-4" onMouseDown={clearSelectionIfWorkspaceClick}>
        <SortableContext
          items={state.blocks.map((b) => b.id)}
          strategy={verticalListSortingStrategy}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
            {state.blocks.length === 0 ? (
              <div className="relative">
                <div
                  ref={setCanvasRef}
                  style={{
                    width: pageWidth,
                    height: pageHeight,
                    padding: isPresentationMode
                      ? "40px 60px"
                      : `${showHeader ? HEADER_HEIGHT : 0}px ${BODY_SIDE_PADDING}px ${footerReserveHeight}px ${BODY_SIDE_PADDING}px`,
                    backgroundColor: "white",
                    borderRadius: "4px",
                    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
                    boxSizing: "border-box",
                    overflow: "hidden",
                  }}
                >
                  <EmptyDropZone />
                </div>
              </div>
            ) : (
              pages.map((page) => (
                <div
                  key={`page-${page.pageNum}`}
                  className="relative"
                  style={{
                    width: pageWidth,
                    backgroundColor: "white",
                    borderRadius: "4px",
                    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
                  }}
                >
                  <div
                    style={{
                      ["--worksheet-example-font" as string]: exampleFontOverride.fontFamily,
                      ["--worksheet-original-example-font" as string]: exampleFontOverride.fontFamily,
                      fontFamily: resolvedBodyFontFamily,
                      height: pageHeight,
                      boxSizing: "border-box",
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column",
                    }}
                    onClick={(e) => {
                      if (e.target === e.currentTarget) {
                        dispatch({ type: "SELECT_BLOCK", payload: null });
                      }
                    }}
                  >
                    {/* Header (brand) — fixed 30mm region */}
                    {showHeader && (
                      <div
                        aria-hidden="true"
                        style={{
                          height: HEADER_HEIGHT,
                          padding: `${mmToPx(15)}px ${mmToPx(15)}px 0 ${mmToPx(20)}px`,
                          boxSizing: "border-box",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: "12px",
                          fontFamily: headerFooterFont,
                          fontSize: "9px",
                          color: "#666",
                          lineHeight: 1.5,
                          flexShrink: 0,
                        }}
                      >
                        <div>
                          {hasHeaderLeft ? (
                            <span dangerouslySetInnerHTML={{ __html: processedHeaderLeft }} />
                          ) : (
                            hasHeaderRight && <span dangerouslySetInnerHTML={{ __html: processedHeaderRight }} />
                          )}
                        </div>
                        <div style={{ textAlign: "right", display: "flex", alignItems: "flex-start", gap: "12px" }}>
                          {hasHeaderLeft && hasHeaderRight && (
                            <span dangerouslySetInnerHTML={{ __html: processedHeaderRight }} />
                          )}
                          {hasLogo && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={brandHeaderFooter.logo} alt="" style={{ height: mmToPx(8), width: "auto" }} />
                          )}
                        </div>
                      </div>
                    )}

                    {/* Blocks on this page — body region with left/right padding only */}
                    <div
                      className="print-body-content"
                      style={{
                        flex: "1 1 auto",
                        minHeight: 0,
                        paddingLeft: BODY_SIDE_PADDING,
                        paddingRight: BODY_SIDE_PADDING,
                        fontSize: resolvedBodyFontSize,
                      }}
                    >
                      {page.blocks.map((block, blockIndex) => {
                        const isDragging = !!activeId;
                        const isOverThis = overId === block.id;
                        const isActiveBlock = activeId === block.id;
                        const previousBlock = page.blocks[blockIndex - 1];

                        const showAbove =
                          blockIndex === 0 &&
                          isDragging &&
                          isOverThis &&
                          !isActiveBlock &&
                          overPosition === "above";

                        const showBelow =
                          isDragging &&
                          isOverThis &&
                          !isActiveBlock &&
                          (blockIndex > 0 || overPosition === "below");

                        return (
                          <React.Fragment key={block.id}>
                            {blockIndex === 0 && isDragging && (
                              <DropIndicator isActive={showAbove} />
                            )}
                            <div
                              ref={(el) => {
                                if (el) {
                                  blockRefs.current.set(block.id, el);
                                }
                              }}
                              data-block-id={block.id}
                              className={`worksheet-block worksheet-block-${block.type}`}
                              {...(block.type === "text" && !!(block as { tightTop?: boolean }).tightTop ? { "data-tight": "true" } : {})}
                              {...(block.type === "heading" ? { "data-heading-level": String((block as { level: number }).level), "data-heading-bilingual": String(!!(block as { bilingual?: boolean }).bilingual) } : {})}
                              {...(block.type === "numbered-heading" ? { "data-heading-level": String((block as { level: number }).level), "data-heading-bilingual": String(!!(block as { bilingual?: boolean }).bilingual), "data-numbered-heading": "true" } : {})}
                              {...(block.type === "text" && (block as { textStyle?: string }).textStyle ? { "data-text-style": (block as { textStyle?: string }).textStyle } : {})}
                              {...(block.type === "page-break" && (block as { restartPageNumbering?: boolean }).restartPageNumbering ? { "data-restart-page-numbering": "true" } : {})}
                              style={blockIndex > 0 ? { marginTop: getSiblingGapPx(previousBlock, block) } : undefined}
                            >
                              <SortableBlock
                                block={block}
                                mode="print"
                              />
                            </div>
                            {isDragging && !isActiveBlock && (
                              <DropIndicator isActive={showBelow} />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>

                    {/* Footer (brand) — fixed 25mm region */}
                    {showFooter && (
                      <div
                        aria-hidden="true"
                        style={{
                          height: footerReserveHeight,
                          padding: `0 ${mmToPx(15)}px ${mmToPx(8)}px ${mmToPx(15)}px`,
                          boxSizing: "border-box",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-end",
                          gap: "12px",
                          fontFamily: headerFooterFont,
                          fontSize: "9px",
                          color: "#666",
                          lineHeight: 1.5,
                          flexShrink: 0,
                        }}
                      >
                        <div style={{ flex: "0 1 45%", minWidth: 0 }}>
                          {hasFooterLeft && <span dangerouslySetInnerHTML={{ __html: processedFooterLeft }} />}
                        </div>
                        <div style={{ flex: "0 0 10%", minWidth: 0, textAlign: "center" }}>
                          {processedFooterCenter ? (
                            <span dangerouslySetInnerHTML={{ __html: processedFooterCenter }} />
                          ) : state.settings.footerText ? (
                            <span>{state.settings.footerText}</span>
                          ) : null}
                        </div>
                        <div style={{ flex: "0 1 45%", minWidth: 0, textAlign: "right" }}>
                          {hasFooterRight && <span dangerouslySetInnerHTML={{ __html: processedFooterRight }} />}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}
