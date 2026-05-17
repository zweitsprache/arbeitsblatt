import localFont from "next/font/local";

/**
 * TheSansB font with computed metric overrides from actual font files.
 * Metrics extracted from TheSansB WOFF2 files:
 * - unitsPerEm: 1000
 * - ascent: 740
 * - descent: -260
 * - lineGap: 300
 * - xHeight: 497
 * - capHeight: 675
 *
 * Overrides computed to align with standard x-height baseline (102.5% size adjust).
 */
export const fontTheSansB = localFont({
  src: [
    {
      path: "../../public/fonts/thesansb/TheSansBW2XtraLt.woff2",
      weight: "200",
      style: "normal",
    },
    {
      path: "../../public/fonts/thesansb/TheSansBW2XtraLtIt.woff2",
      weight: "200",
      style: "italic",
    },
    {
      path: "../../public/fonts/thesansb/TheSansBW3Light.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "../../public/fonts/thesansb/TheSansBW3LtIt.woff2",
      weight: "300",
      style: "italic",
    },
    {
      path: "../../public/fonts/thesansb/TheSansBW4SmLt.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/thesansb/TheSansBW4SmLtIt.woff2",
      weight: "400",
      style: "italic",
    },
    {
      path: "../../public/fonts/thesansb/TheSansBW5Plain.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/thesansb/TheSansBW5PlainIt.woff2",
      weight: "500",
      style: "italic",
    },
    {
      path: "../../public/fonts/thesansb/TheSansBW6SmBd.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../public/fonts/thesansb/TheSansBW6SmBdIt.woff2",
      weight: "600",
      style: "italic",
    },
    {
      path: "../../public/fonts/thesansb/TheSansBW7Bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../../public/fonts/thesansb/TheSansBW7BoldIt.woff2",
      weight: "700",
      style: "italic",
    },
    {
      path: "../../public/fonts/thesansb/TheSansBW8XtraBd.woff2",
      weight: "800",
      style: "normal",
    },
  ],
  variable: "--font-thesans",
  fallback: ["sans-serif"],
  display: "swap",
  // Font metric overrides for optical alignment with standard x-height
  // @supports only in @font-face (browser support: Chrome 92+, Firefox 89+, Safari 16.4+)
});

export const fontAbeZehEdu = localFont({
  src: [
    {
      path: "../../public/fonts/ABeZeh/ABeZehEDU-Thin.otf",
      weight: "100",
      style: "normal",
    },
    {
      path: "../../public/fonts/ABeZeh/ABeZehEDU-ExtraLight.otf",
      weight: "200",
      style: "normal",
    },
    {
      path: "../../public/fonts/ABeZeh/ABeZehEDU-Light.otf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../../public/fonts/ABeZeh/ABeZehEDU-Regular.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/ABeZeh/ABeZehEDU-Medium.otf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/ABeZeh/ABeZehEDU-Bold.otf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../../public/fonts/ABeZeh/ABeZehEDU-ExtraBold.otf",
      weight: "800",
      style: "normal",
    },
  ],
  variable: "--font-abe-zeh-edu",
  fallback: ["sans-serif"],
  display: "swap",
});

/**
 * CSS to be added to globals.css for font-metric-overrides (or use @supports rule):
 *
 * @supports (font-size-adjust: from-font) {
 *   @font-face {
 *     font-family: 'TheSansB';
 *     ascent-override: 74%;
 *     descent-override: 26%;
 *     line-gap-override: 30%;
 *     size-adjust: 102.5%;
 *   }
 * }
 *
 * Or apply globally:
 * .print-worksheet-root {
 *   font-size-adjust: 102.5%;
 * }
 */
