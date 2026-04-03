import { WorksheetBlock, Brand } from "./worksheet";

// ─── Presentation Settings ──────────────────────────────────
export interface PresentationSettings {
  brand: Brand;
  fontSize: number;
  fontFamily: string;
  backgroundColor: string;
}

// ─── Presentation Document ──────────────────────────────────
export interface PresentationDocument {
  id: string;
  title: string;
  slug: string;
  blocks: WorksheetBlock[];
  settings: PresentationSettings;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Default Settings ───────────────────────────────────────
export const DEFAULT_PRESENTATION_SETTINGS: PresentationSettings = {
  brand: "edoomio",
  fontSize: 18,
  fontFamily: "Asap Condensed, sans-serif",
  backgroundColor: "#ffffff",
};

// ─── Helpers ────────────────────────────────────────────────

/**
 * Split a flat block list into slides at page-break boundaries.
 * Each slide is an array of blocks between page-break blocks.
 * The page-break blocks themselves are not included in any slide.
 */
export function splitBlocksIntoSlides(blocks: WorksheetBlock[]): WorksheetBlock[][] {
  const slides: WorksheetBlock[][] = [];
  let current: WorksheetBlock[] = [];

  for (const block of blocks) {
    if (block.type === "page-break") {
      slides.push(current);
      current = [];
    } else {
      current.push(block);
    }
  }

  // Push the last slide (even if empty — will be filtered by caller if needed)
  slides.push(current);

  // Filter out empty slides
  return slides.filter((s) => s.length > 0);
}
