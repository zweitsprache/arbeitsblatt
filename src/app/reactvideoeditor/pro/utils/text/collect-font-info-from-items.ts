/**
 * Utility for collecting font information from items before rendering
 * This ensures all required fonts are available during server-side rendering
 */

import type { FontInfo } from '@remotion/google-fonts';
import type { TextOverlay, BlockOverlay, CaptionOverlay, Overlay } from '../../types';
import { OverlayType } from '../../types';
import { getVideoFontInfo } from './get-video-font-info';
import { normalizeVideoFontFamily } from './normalize-video-font-family';

/**
 * Type guard to check if an overlay is a text overlay
 */
const isTextOverlay = (overlay: Overlay): overlay is TextOverlay => {
  return overlay.type === OverlayType.TEXT;
};

const isBlockOverlay = (overlay: Overlay): overlay is BlockOverlay => {
  return overlay.type === OverlayType.BLOCKS;
};

/**
 * Type guard to check if an overlay is a caption overlay
 */
const isCaptionOverlay = (overlay: Overlay): overlay is CaptionOverlay => {
  return overlay.type === OverlayType.CAPTION;
};

/**
 * Collects all font information from overlays that use custom fonts
 * This is called before rendering to ensure all fonts are available
 * 
 * @param overlays - Array of overlays to extract font info from
 * @returns Record of font family names to FontInfo objects
 */
export const collectFontInfoFromOverlays = (
  overlays: Overlay[]
): Record<string, FontInfo> => {
  const fontInfos: Record<string, FontInfo> = {};

  for (const overlay of overlays) {
    let fontFamily: string | undefined;

    // Extract font family based on overlay type
    if (isTextOverlay(overlay) || isBlockOverlay(overlay)) {
      // For text overlays, get font from styles
      fontFamily = normalizeVideoFontFamily(overlay.styles.fontFamily);
    } else if (isCaptionOverlay(overlay)) {
      // For caption overlays, get font from caption styles or default
      fontFamily = overlay.styles?.fontFamily || 'Inter'; // Default font
    }

    // Skip if no font family or already collected
    if (!fontFamily || fontInfos[fontFamily]) {
      continue;
    }

    // Find font info in database
    const fontInfo = getVideoFontInfo(fontFamily);

    if (!fontInfo) {
      console.warn(`Font "${fontFamily}" not found in Google Fonts database`);
      continue;
    }

    fontInfos[fontFamily] = fontInfo;
  }

  return fontInfos;
};

/**
 * Validates that all required fonts are available in the database
 * Useful for pre-flight checks before rendering
 * 
 * @param overlays - Array of overlays to validate
 * @returns Array of missing font names
 */
export const validateFontsAvailable = (overlays: Overlay[]): string[] => {
  const missingFonts: string[] = [];
  const checkedFonts = new Set<string>();

  for (const overlay of overlays) {
    let fontFamily: string | undefined;

    if (isTextOverlay(overlay) || isBlockOverlay(overlay)) {
      fontFamily = normalizeVideoFontFamily(overlay.styles.fontFamily);
    } else if (isCaptionOverlay(overlay)) {
      fontFamily = overlay.styles?.fontFamily || 'Inter';
    }

    if (!fontFamily || checkedFonts.has(fontFamily)) {
      continue;
    }

    checkedFonts.add(fontFamily);

    const fontExists = Boolean(getVideoFontInfo(fontFamily));

    if (!fontExists) {
      missingFonts.push(fontFamily);
    }
  }

  return missingFonts;
};

