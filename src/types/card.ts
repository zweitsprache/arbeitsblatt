// ─── Card layout types (2×2 image+text cards on A4 landscape) ─

import { Brand, BrandSettings, DEFAULT_BRAND_SETTINGS } from "./worksheet";

export interface CardItem {
  id: string;
  text: string;
  image?: string; // URL to uploaded image
  imageScale?: number; // 10-100, default 100
  imageRatio?: number; // natural width / height of uploaded image
  textPosition?: "top" | "center" | "bottom";
  textSize?: "sm" | "md" | "lg" | "xl";
  backgroundColor?: string;
}

export interface CardSettings {
  showCuttingLines: boolean;
  cuttingLineStyle: "dashed" | "dotted" | "solid";
  cardPadding: number; // mm
  brand: Brand;
  brandSettings: BrandSettings;
}

export interface CardDocument {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  cards: CardItem[];
  settings: CardSettings;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_CARD_SETTINGS: CardSettings = {
  showCuttingLines: true,
  cuttingLineStyle: "dashed",
  cardPadding: 4,
  brand: "edoomio",
  brandSettings: DEFAULT_BRAND_SETTINGS["edoomio"],
};

/**
 * Determines object-fit style based on image aspect ratio.
 * - ~1:1 (0.75–1.33) → contain
 * - landscape (>1.33, e.g. 16:9) → cover, full height
 * - portrait (<0.75, e.g. 9:16) → cover, full width
 */
export function getImageObjectFit(ratio?: number): { objectFit: "contain" | "cover"; objectPosition?: string } {
  if (!ratio) return { objectFit: "contain" };
  if (ratio > 1.33) {
    // Landscape — cover, center, use full height
    return { objectFit: "cover", objectPosition: "center center" };
  }
  if (ratio < 0.75) {
    // Portrait — cover, center, use full width
    return { objectFit: "cover", objectPosition: "center center" };
  }
  // Square-ish — contain
  return { objectFit: "contain" };
}
