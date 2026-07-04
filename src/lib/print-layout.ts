import type { WorksheetSettings } from "@/types/worksheet";

export const PX_PER_MM = 96 / 25.4;
export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;
export const LETTER_WIDTH_MM = 215.9;
export const LETTER_HEIGHT_MM = 279.4;
export const PRINT_HEADER_HEIGHT_MM = 30;
export const PRINT_FOOTER_HEIGHT_MM = 25;

export function mmToPx(value: number): number {
  return value * PX_PER_MM;
}

export function getPageDimensionsMm(settings: WorksheetSettings): { widthMm: number; heightMm: number } {
  const isLandscape = settings.orientation === "landscape" || settings.orientation === "landscape-canva";
  const isLetter = settings.pageSize === "letter";
  const portraitWidthMm = isLetter ? LETTER_WIDTH_MM : A4_WIDTH_MM;
  const portraitHeightMm = isLetter ? LETTER_HEIGHT_MM : A4_HEIGHT_MM;

  return isLandscape
    ? { widthMm: portraitHeightMm, heightMm: portraitWidthMm }
    : { widthMm: portraitWidthMm, heightMm: portraitHeightMm };
}

export function getPageDimensionsPx(settings: WorksheetSettings): { widthPx: number; heightPx: number } {
  const { widthMm, heightMm } = getPageDimensionsMm(settings);
  return {
    widthPx: Math.round(mmToPx(widthMm)),
    heightPx: Math.round(mmToPx(heightMm)),
  };
}

export function getPageSizeCss(settings: WorksheetSettings): string {
  const { widthMm, heightMm } = getPageDimensionsMm(settings);
  return `${widthMm}mm ${heightMm}mm`;
}

export function getPrintHeaderHeightPx(): number {
  return mmToPx(PRINT_HEADER_HEIGHT_MM);
}

export function getPrintFooterHeightPx(): number {
  return mmToPx(PRINT_FOOTER_HEIGHT_MM);
}

export function getPrintFooterReservePx(settings: WorksheetSettings, showFooter: boolean): number {
  if (!showFooter) return 0;
  return Math.max(getPrintFooterHeightPx(), settings.margins.bottom || 0);
}

export function getPrintBodyHeightPx(
  settings: WorksheetSettings,
  pageHeightPx: number,
  showHeader: boolean,
  showFooter: boolean,
): number {
  return pageHeightPx - (showHeader ? getPrintHeaderHeightPx() : 0) - getPrintFooterReservePx(settings, showFooter);
}