export const normalizeVideoFontFamily = (fontFamily: string | undefined | null): string => {
  if (!fontFamily) return "Inter";

  const primary = fontFamily
    .split(",")[0]
    ?.trim()
    .replace(/^['\"]|['\"]$/g, "");

  if (!primary) return "Inter";

  return primary;
};