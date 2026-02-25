import { Brand, BrandSettings, DEFAULT_BRAND_SETTINGS } from "./worksheet";

// ─── E-Book Chapter ─────────────────────────────────────────
export interface EBookChapter {
  id: string;
  title: string;
  worksheetIds: string[];
}

// ─── E-Book Cover Settings ──────────────────────────────────
export interface EBookCoverSettings {
  title: string;
  subtitle: string;
  author: string;
  coverImage: string | null;
  showLogo: boolean;
  backgroundColor: string;
  textColor: string;
}

// ─── E-Book Settings ────────────────────────────────────────
export interface EBookSettings {
  pageSize: "a4" | "letter";
  orientation: "portrait" | "landscape";
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  // Header/Footer
  showHeader: boolean;
  showFooter: boolean;
  headerText: string;
  footerText: string;
  // Page numbering
  showPageNumbers: boolean;
  pageNumberPosition: "footer-center" | "footer-right" | "footer-left";
  pageNumberFormat: "numeric" | "roman" | "dash"; // "1", "I", "- 1 -"
  startPageNumber: number;
  // Typography
  fontSize: number;
  fontFamily: string;
  // Brand
  brand: Brand;
  brandSettings: BrandSettings;
  // TOC Settings
  tocTitle: string;
  showToc: boolean;
}

// ─── E-Book Document ────────────────────────────────────────
export interface EBookDocument {
  id: string;
  title: string;
  slug: string;
  chapters: EBookChapter[];
  coverSettings: EBookCoverSettings;
  settings: EBookSettings;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  folderId: string | null;
  userId: string | null;
}

// ─── Default Settings ───────────────────────────────────────
export const DEFAULT_EBOOK_COVER_SETTINGS: EBookCoverSettings = {
  title: "",
  subtitle: "",
  author: "",
  coverImage: null,
  showLogo: true,
  backgroundColor: "#ffffff",
  textColor: "#1a1a1a",
};

export const DEFAULT_EBOOK_SETTINGS: EBookSettings = {
  pageSize: "a4",
  orientation: "portrait",
  margins: { top: 20, right: 20, bottom: 20, left: 20 },
  showHeader: false,
  showFooter: true,
  headerText: "",
  footerText: "",
  showPageNumbers: true,
  pageNumberPosition: "footer-center",
  pageNumberFormat: "numeric",
  startPageNumber: 1,
  fontSize: 14,
  fontFamily: "Asap Condensed, sans-serif",
  brand: "edoomio",
  brandSettings: DEFAULT_BRAND_SETTINGS["edoomio"],
  tocTitle: "Table of Contents",
  showToc: true,
};

// ─── Content item types supported in e-book chapters ────────
export type EBookContentType = "worksheet" | "flashcards" | "cards" | "grammar-table";

// ─── Content item reference for populated data ──────────────
export interface ContentItemReference {
  id: string;
  title: string;
  slug: string;
  type: EBookContentType;
}

/** @deprecated Use ContentItemReference instead */
export type WorksheetReference = ContentItemReference;

// ─── Populated Chapter (with content item data) ─────────────
export interface PopulatedEBookChapter {
  id: string;
  title: string;
  items: ContentItemReference[];
}

// ─── Populated E-Book (for editor) ──────────────────────────
export interface PopulatedEBookDocument extends Omit<EBookDocument, "chapters"> {
  chapters: PopulatedEBookChapter[];
}
