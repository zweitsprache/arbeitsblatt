const LOCAL_FONT_FILE_PATTERN = /\.(woff2?|ttf|otf)$/i;

function escapeCssString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function inferFontFormat(fontPath: string): string {
  if (/\.woff2$/i.test(fontPath)) return "woff2";
  if (/\.woff$/i.test(fontPath)) return "woff";
  if (/\.ttf$/i.test(fontPath)) return "truetype";
  return "opentype";
}

function normalizeLocalFontAssetPath(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^(?:[a-z]+:)?\/\//i.test(trimmed) || /^data:/i.test(trimmed)) {
    return null;
  }

  let normalized = trimmed.replace(/^public\//i, "/");
  if (!normalized.startsWith("/")) {
    normalized = `/${normalized}`;
  }
  normalized = normalized.replace(/\/+/g, "/");

  if (!LOCAL_FONT_FILE_PATTERN.test(normalized)) {
    return null;
  }

  return normalized;
}

function sanitizeFamilyName(value: string): string {
  const sanitized = value.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  return sanitized || "font";
}

export function resolveBrandFontFamilyOverride(
  value: string | null | undefined,
  options: {
    fallbackFontFamily: string;
    generatedFamilyNamePrefix: string;
  },
): {
  fontFamily: string;
  fontFaceCss: string;
} {
  const trimmed = value?.trim() ?? "";
  const fallbackFontFamily = options.fallbackFontFamily.trim();
  if (!trimmed) {
    return { fontFamily: fallbackFontFamily, fontFaceCss: "" };
  }

  const localPath = normalizeLocalFontAssetPath(trimmed);
  if (!localPath) {
    return { fontFamily: trimmed, fontFaceCss: "" };
  }

  const familyName = `${sanitizeFamilyName(options.generatedFamilyNamePrefix)}-${sanitizeFamilyName(localPath)}`;
  const resolvedFontFamily = fallbackFontFamily
    ? `"${familyName}", ${fallbackFontFamily}`
    : `"${familyName}"`;

  return {
    fontFamily: resolvedFontFamily,
    fontFaceCss: `@font-face { font-family: "${escapeCssString(familyName)}"; src: url("${escapeCssString(localPath)}") format("${inferFontFormat(localPath)}"); font-style: normal; font-weight: 400; font-display: swap; }`,
  };
}
