import type React from "react";
import type { BrandProfile, WorksheetSettings } from "@/types/worksheet";
import { getPrintFooterReservePx } from "./print-layout";

/**
 * Shared print / PDF frame typography contract.
 *
 * Both the editor canvas (src/components/editor/worksheet-canvas.tsx) and the
 * print/PDF viewer (src/components/viewer/worksheet-viewer.tsx `mode="print"`)
 * MUST derive their wrapper class chain and CSS variables from this single
 * helper. That is what makes editor WYSIWYG match the Puppeteer-rendered PDF —
 * the same `.print-worksheet-root .print-skin-final` CSS rules in
 * `src/app/globals.css` fire on both surfaces because both surfaces produce
 * the same wrapper markup here.
 */

export interface PrintFrameInput {
  settings: WorksheetSettings;
  resolvedProfile: BrandProfile;
  /** Body font-family string with any locale/translation override applied. */
  activeBodyFont: string;
  /** Headline font-family string. */
  headlineFont: string;
  /** Header/footer font-family string. */
  headerFooterFont: string;
  /** Base body font size (CSS value, e.g. "12.5px" or "10pt"). */
  resolvedBodyFontSize: string;
  /** Letter spacing (CSS value or empty). */
  resolvedLetterSpacing: string;
  /** Whether a footer will be reserved in the tfoot region (drives --print-tfoot-height). */
  reserveFooter: boolean;
  /** Whether the print frame should reserve landscape dimensions. */
  isLandscape: boolean;
  /** Whether this worksheet uses the Canva-style landscape rail layout. */
  isCanvaLandscape: boolean;
  /** Presence flags for block types that toggle print-has-* modifier classes. */
  presence?: {
    domino?: boolean;
    flashcards?: boolean;
    aufgabenkarten?: boolean;
    cardPairs?: boolean;
    quartett?: boolean;
    taboo?: boolean;
    tabooTen?: boolean;
    syllableCards?: boolean;
  };
}

export interface PrintFrame {
  /** Full class chain to apply to the outer wrapper. */
  className: string;
  /** CSS variables to spread into the wrapper's `style` prop. */
  cssVars: React.CSSProperties;
}

function normalizeWeight(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

/** Build the shared print/editor frame (class chain + CSS variables). */
export function buildPrintFrame(input: PrintFrameInput): PrintFrame {
  const {
    settings,
    resolvedProfile,
    activeBodyFont,
    headlineFont,
    headerFooterFont,
    resolvedBodyFontSize,
    resolvedLetterSpacing,
    reserveFooter,
    isLandscape,
    isCanvaLandscape,
    presence = {},
  } = input;

  const headlineWeight = normalizeWeight(resolvedProfile.headlineWeight, 700);
  const h1Weight = normalizeWeight(resolvedProfile.h1Weight, headlineWeight);
  const h2Weight = normalizeWeight(resolvedProfile.h2Weight, headlineWeight);
  const h3Weight = normalizeWeight(resolvedProfile.h3Weight, headlineWeight);
  const h4Weight = normalizeWeight(resolvedProfile.h4Weight, headlineWeight);

  const printBottomReservePx = getPrintFooterReservePx(settings, reserveFooter);

  const cssVars = {
    // Heading weights (used outside @media print by non-print blocks too)
    ["--heading-h1-weight" as string]: String(h1Weight),
    ["--heading-h2-weight" as string]: String(h2Weight),
    ["--heading-h3-weight" as string]: String(h3Weight),
    ["--heading-h4-weight" as string]: String(h4Weight),
    ["--print-h1-bottom-margin" as string]: resolvedProfile.h1BottomMargin ?? undefined,
    ["--print-h2-bottom-margin" as string]: resolvedProfile.h2BottomMargin ?? undefined,
    ["--print-h3-bottom-margin" as string]: resolvedProfile.h3BottomMargin ?? undefined,
    ["--print-h4-bottom-margin" as string]: resolvedProfile.h4BottomMargin ?? undefined,
    ["--print-block-gap" as string]: resolvedProfile.blockGap ?? undefined,

    // Print skin (applied on screen via .print-skin-final rules + in @media print)
    ["--print-body-font" as string]: activeBodyFont,
    ["--print-body-size" as string]: resolvedBodyFontSize,
    ["--print-headline-font" as string]: headlineFont,
    ["--print-headline-weight" as string]: String(headlineWeight),
    ["--print-primary-color" as string]: resolvedProfile.primaryColor,
    ["--print-h1-size" as string]: resolvedProfile.h1Size ?? undefined,
    ["--print-h2-size" as string]: resolvedProfile.h2Size ?? undefined,
    ["--print-h3-size" as string]: resolvedProfile.h3Size ?? undefined,
    ["--print-h4-size" as string]: resolvedProfile.h4Size ?? undefined,
    ["--print-h1-weight" as string]: String(h1Weight),
    ["--print-h2-weight" as string]: String(h2Weight),
    ["--print-h3-weight" as string]: String(h3Weight),
    ["--print-h4-weight" as string]: String(h4Weight),
    ["--print-header-footer-font" as string]: headerFooterFont,
    ["--print-letter-spacing" as string]: resolvedLetterSpacing || "normal",
    ["--print-tfoot-height" as string]: `${printBottomReservePx}px`,
  } as React.CSSProperties;

  const classes = [
    "print-worksheet-root",
    "print-skin-final",
    isLandscape ? "print-landscape" : "print-portrait",
    isCanvaLandscape ? "print-canva" : "",
    presence.domino ? "print-has-domino" : "",
    presence.flashcards ? "print-has-flashcards" : "",
    presence.aufgabenkarten ? "print-has-aufgabenkarten" : "",
    presence.cardPairs ? "print-has-card-pairs" : "",
    presence.quartett ? "print-has-quartett" : "",
    presence.taboo ? "print-has-taboo" : "",
    presence.tabooTen ? "print-has-taboo-ten" : "",
    presence.syllableCards ? "print-has-syllable-cards" : "",
  ].filter(Boolean);

  return {
    className: classes.join(" "),
    cssVars,
  };
}
