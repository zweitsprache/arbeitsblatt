/** Replace non-breaking spaces with regular spaces so the browser
 *  can line-wrap normally, but preserve &nbsp; inside .nobreak spans. */
export function nbspToSpace(html: string): string {
  // Temporarily protect content inside <span ... data-nobreak ...>…</span>
  const placeholder = "\x00NB\x00";
  const protected_: string[] = [];
  const safe = html.replace(
    /<span[^>]*data-nobreak[^>]*>.*?<\/span>/gi,
    (match) => {
      protected_.push(match);
      return placeholder;
    }
  );

  // Replace nbsp in the rest
  const cleaned = safe.replace(/&nbsp;/g, " ").replace(/\u00A0/g, " ");

  // Restore protected spans
  let idx = 0;
  return cleaned.replace(new RegExp(placeholder.replace(/\x00/g, "\\x00"), "g"), () => protected_[idx++]);
}

const GERMAN_MONTHS = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

/** Add or subtract weekdays (Mon-Fri) from a date. */
function addWeekdays(start: Date, days: number): Date {
  const d = new Date(start);
  const step = days >= 0 ? 1 : -1;
  let remaining = Math.abs(days);
  while (remaining > 0) {
    d.setDate(d.getDate() + step);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) remaining--;
  }
  return d;
}

/** Replace {{df+N}}, {{df-N}}, {{ds+N}}, {{ds-N}} with formatted dates.
 *  df = date full (28. Februar 2026), ds = date short (28.02.2026).
 *  Also strips any TipTap color-span wrapping around the shortcode. */
export function resolveDateShortcodes(html: string): string {
  // First strip color spans wrapping a shortcode so the date inherits the block color
  html = html.replace(
    /<span[^>]*style="[^"]*color:[^"]*"[^>]*>(\{\{d[fs][+-]\d+\}\})<\/span>/gi,
    "$1",
  );
  return html.replace(/\{\{d([fs])([+-]\d+)\}\}/g, (_match, fmt: string, offset: string) => {
    const target = addWeekdays(new Date(), parseInt(offset, 10));
    if (fmt === "f") {
      return `${target.getDate()}. ${GERMAN_MONTHS[target.getMonth()]} ${target.getFullYear()}`;
    }
    const dd = String(target.getDate()).padStart(2, "0");
    const mm = String(target.getMonth() + 1).padStart(2, "0");
    return `${dd}.${mm}.${target.getFullYear()}`;
  });
}

/** Replace {{de:…}} markers in HTML with styled <span> elements. */
export function resolveDeMarkers(html: string, color?: string | null): string {
  const style = color
    ? `font-weight:600;color:${color}`
    : "font-weight:600";
  return html.replace(
    /\{\{de:(.*?)\}\}/g,
    `<span style="${style}">$1</span>`,
  );
}

/** Remove inline typography overrides so brand profile font settings can apply uniformly.
 *  Keeps other inline styles (e.g. color, weight) intact. */
export function stripInlineTypographyStyles(html: string): string {
  return html
    .replace(/style="([^"]*)"/gi, (_m, styleContent: string) => {
      const kept = styleContent
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean)
        .filter(
          (decl) =>
            !/^font-family\s*:/i.test(decl) &&
            !/^font-size\s*:/i.test(decl) &&
            !/^line-height\s*:/i.test(decl)
        );
      return kept.length ? `style="${kept.join("; ")}"` : "";
    })
    .replace(/\s{2,}/g, " ");
}

/** Pipeline: sanitise nbsp + resolve date shortcodes + resolve {{de:…}} markers. */
export function prepareTiptapHtml(html: string, deMarkerColor?: string | null): string {
  return stripInlineTypographyStyles(
    resolveDeMarkers(resolveDateShortcodes(nbspToSpace(html)), deMarkerColor)
  );
}

/** Strip outer <p>…</p> wrapper so content can render inline. */
export function stripOuterP(html: string): string {
  return html.replace(/^<p[^>]*>([\s\S]*)<\/p>$/i, "$1");
}
