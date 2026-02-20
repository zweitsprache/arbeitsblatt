import { Brand, BrandSettings, DEFAULT_BRAND_SETTINGS } from "./worksheet";

// ─── Cover Element types ────────────────────────────────────

export type CoverElementType = "text" | "image" | "ribbon" | "flag";

export interface CoverTextElement {
  id: string;
  type: "text";
  /** Text content (supports line breaks) */
  text: string;
  /** Font family: "Encode Sans" (sans-serif) or "Merriweather" (serif) */
  fontFamily: "Encode Sans" | "Merriweather";
  /** Font size in px (at 2× density, so 56 = 28pt equivalent) */
  fontSize: number;
  fontWeight: 400 | 500 | 600 | 700;
  /** Text color (hex) */
  color: string;
  /** Text alignment */
  textAlign: "left" | "center" | "right";
  /** Whether to render text as uppercase */
  uppercase: boolean;
  /** Position from top in px (1190×1684 canvas) */
  top: number;
  /** Position from left in px */
  left: number;
  /** Width in px (0 = auto) */
  width: number;
}

export interface CoverImageElement {
  id: string;
  type: "image";
  /** Image URL (uploaded or from library) */
  src: string;
  /** Position from top in px */
  top: number;
  /** Position from left in px */
  left: number;
  /** Width in px */
  width: number;
  /** Height in px */
  height: number;
  /** Border radius in px */
  borderRadius: number;
  /** Show border */
  showBorder: boolean;
  /** Object fit */
  objectFit: "cover" | "contain";
}

export interface CoverRibbonElement {
  id: string;
  type: "ribbon";
  /** Ribbon label text */
  text: string;
  /** Background color (hex) */
  color: string;
  /** Text color (hex) */
  textColor: string;
  /** Font size in px */
  fontSize: number;
}

export type CoverFlagVariant = "DE" | "CH" | "AT";

export interface CoverFlagElement {
  id: string;
  type: "flag";
  /** Which flag to show */
  variant: CoverFlagVariant;
  /** Position from top in px */
  top: number;
  /** Position from left in px */
  left: number;
  /** Width in px */
  width: number;
}

export type CoverElement =
  | CoverTextElement
  | CoverImageElement
  | CoverRibbonElement
  | CoverFlagElement;

// ─── Cover Settings ─────────────────────────────────────────

export interface CoverSettings {
  /** Background color */
  backgroundColor: string;
  /** Show logo in top-right */
  showLogo: boolean;
  /** Show footer with copyright + ID + date */
  showFooter: boolean;
  /** Brand */
  brand: Brand;
  brandSettings: BrandSettings;
}

export const DEFAULT_COVER_SETTINGS: CoverSettings = {
  backgroundColor: "#FFFFFF",
  showLogo: true,
  showFooter: true,
  brand: "edoomio",
  brandSettings: DEFAULT_BRAND_SETTINGS["edoomio"],
};

// ─── Cover Document ─────────────────────────────────────────

export interface CoverDocument {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  elements: CoverElement[];
  settings: CoverSettings;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Default elements for a new cover ───────────────────────

export function createDefaultElements(): CoverElement[] {
  return [
    {
      id: "subtitle",
      type: "text",
      text: "Verbkonjugation",
      fontFamily: "Encode Sans",
      fontSize: 22,
      fontWeight: 400,
      color: "#000000",
      textAlign: "left",
      uppercase: true,
      top: 680,
      left: 85,
      width: 0,
    },
    {
      id: "title",
      type: "text",
      text: "Titel",
      fontFamily: "Merriweather",
      fontSize: 56,
      fontWeight: 400,
      color: "#222222",
      textAlign: "left",
      uppercase: false,
      top: 725,
      left: 85,
      width: 900,
    },
    {
      id: "info",
      type: "text",
      text: "Indikativ | Präsens · Perfekt · Präteritum",
      fontFamily: "Encode Sans",
      fontSize: 22,
      fontWeight: 400,
      color: "#000000",
      textAlign: "left",
      uppercase: false,
      top: 800,
      left: 85,
      width: 0,
    },
  ];
}

// ─── Canvas dimensions (A4 portrait at 2× density) ─────────

export const COVER_WIDTH = 1190;
export const COVER_HEIGHT = 1684;
export const COVER_PAD = 85;
