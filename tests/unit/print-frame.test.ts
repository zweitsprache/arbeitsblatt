import { describe, expect, it } from "vitest";
import { buildPrintFrame } from "@/lib/print-frame";
import { DEFAULT_SETTINGS, getStaticBrandProfile } from "@/types/worksheet";

describe("buildPrintFrame", () => {
  const profile = getStaticBrandProfile("edoomio");
  const baseInput = {
    settings: DEFAULT_SETTINGS,
    resolvedProfile: profile,
    activeBodyFont: "Inter, sans-serif",
    headlineFont: "Inter, sans-serif",
    headerFooterFont: "Inter, sans-serif",
    resolvedBodyFontSize: "12.5px",
    resolvedLetterSpacing: "",
    reserveFooter: true,
    isLandscape: false,
    isCanvaLandscape: false,
  };

  it("emits the portrait class chain by default", () => {
    const { className } = buildPrintFrame(baseInput);
    expect(className).toContain("print-worksheet-root");
    expect(className).toContain("print-skin-final");
    expect(className).toContain("print-portrait");
    expect(className).not.toContain("print-landscape");
    expect(className).not.toContain("print-canva");
  });

  it("switches to landscape and canva modifiers", () => {
    const { className } = buildPrintFrame({
      ...baseInput,
      isLandscape: true,
      isCanvaLandscape: true,
    });
    expect(className).toContain("print-landscape");
    expect(className).toContain("print-canva");
    expect(className).not.toContain("print-portrait");
  });

  it("emits print-has-* modifier classes for block presence", () => {
    const { className } = buildPrintFrame({
      ...baseInput,
      presence: {
        domino: true,
        quartett: true,
        tabooTen: true,
      },
    });
    expect(className).toContain("print-has-domino");
    expect(className).toContain("print-has-quartett");
    expect(className).toContain("print-has-taboo-ten");
    expect(className).not.toContain("print-has-flashcards");
  });

  it("sets the print CSS variables required by globals.css print rules", () => {
    const { cssVars } = buildPrintFrame(baseInput);
    const vars = cssVars as Record<string, string | undefined>;
    expect(vars["--print-body-font"]).toBe("Inter, sans-serif");
    expect(vars["--print-body-size"]).toBe("12.5px");
    expect(vars["--print-headline-font"]).toBe("Inter, sans-serif");
    expect(vars["--print-header-footer-font"]).toBe("Inter, sans-serif");
    expect(vars["--print-primary-color"]).toBe(profile.primaryColor);
    expect(vars["--print-tfoot-height"]).toMatch(/^\d+(\.\d+)?px$/);
    expect(vars["--print-letter-spacing"]).toBe("normal");
  });

  it("normalizes string heading weights to numeric CSS var values", () => {
    const { cssVars } = buildPrintFrame({
      ...baseInput,
      resolvedProfile: {
        ...profile,
        // @ts-expect-error — profile field is typed as number, but real data can be string
        h1Weight: "800",
        h2Weight: null,
      },
    });
    const vars = cssVars as Record<string, string | undefined>;
    expect(vars["--print-h1-weight"]).toBe("800");
    // h2 falls back to headlineWeight
    expect(vars["--print-h2-weight"]).toBe(String(profile.headlineWeight));
  });

  it("returns a smaller tfoot reserve when no footer is used", () => {
    const withFooter = buildPrintFrame({ ...baseInput, reserveFooter: true });
    const withoutFooter = buildPrintFrame({ ...baseInput, reserveFooter: false });
    const vars = (v: React.CSSProperties) => v as unknown as Record<string, string>;
    expect(vars(withoutFooter.cssVars)["--print-tfoot-height"]).toBe("0px");
    expect(
      Number.parseFloat(vars(withFooter.cssVars)["--print-tfoot-height"]),
    ).toBeGreaterThan(0);
  });
});
