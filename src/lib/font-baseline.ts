/**
 * Optical vertical adjustments for font glyphs inside geometrically centered UI.
 *
 * CSS centers a font's line box, whose ascent/descent distribution varies by
 * typeface. Keep those small, font-specific corrections here rather than
 * scattering transforms throughout individual components.
 */
const FONT_BASELINE_ADJUSTMENTS: Readonly<Record<string, string>> = {
  "asap condensed": "0.06em",
  "encode sans": "0px",
  "encode sans semi condensed": "1px",
  thesansb: "0px",
  "noto sans": "0px",
  "noto sans arabic": "0px",
};

function primaryFontName(fontFamily: string): string {
  return (fontFamily.split(",")[0] ?? "")
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .toLowerCase();
}

export function getFontBaselineAdjustment(fontFamily?: string | null): string {
  if (!fontFamily) return "0px";
  return FONT_BASELINE_ADJUSTMENTS[primaryFontName(fontFamily)] ?? "0px";
}
