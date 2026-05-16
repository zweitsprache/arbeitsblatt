import { getBlankWidthStyle, parseBlankContent } from "@/lib/fill-in-blank";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function stripTablePixelWidths(html: string): string {
  return html
    .replace(/<table([^>]*) style="[^"]*width:\s*\d+px[^"]*"/gi, "<table$1")
    .replace(/<col([^>]*) style="[^"]*width:\s*\d+px[^"]*"/gi, "<col$1");
}

export function hideTableHeaderHtml(html: string): string {
  const withoutThead = html.replace(/<thead\b[^>]*>[\s\S]*?<\/thead>/gi, "");
  return withoutThead.replace(/<tr\b[^>]*>([\s\S]*?)<\/tr>/i, (match, inner) => {
    return /<th\b/i.test(inner) && !/<td\b/i.test(inner) ? "" : match;
  });
}

export function markFirstExampleRowHtml(html: string): string {
  return html.replace(/<tr\b([^>]*)>([\s\S]*?)<\/tr>/i, (match, attrs, inner) => {
    if (!/<td\b/i.test(inner)) {
      return match;
    }

    const markedInner = inner.replace(
      /<span data-table-blank="true"([^>]*)data-answer="([^"]+)"([^>]*)>/i,
      '<span data-table-blank="true"$1data-answer="$2" data-table-example-blank="true"$3>',
    );

    return `<tr${attrs} data-table-example-row="true">${markedInner}</tr>`;
  });
}

function styleObjectToCss(style: Record<string, string | number | undefined>): string {
  return Object.entries(style)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${key.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`)}:${String(value)}`)
    .join(";");
}

function renderBlankToken(raw: string, noSpace: boolean): string {
  const { answer, width } = parseBlankContent(raw);
  const widthStyle = getBlankWidthStyle(width, false);
  const style = styleObjectToCss({
    verticalAlign: "middle",
    boxSizing: "border-box",
    marginLeft: noSpace ? undefined : "0.25rem",
    marginRight: noSpace ? undefined : "0.25rem",
    ...widthStyle,
  });

  const safeAnswer = escapeHtml(answer);
  const measure = safeAnswer || "&nbsp;";
  const answerAttr = safeAnswer ? ` data-answer="${safeAnswer}"` : "";

  return `<span data-table-blank="true"${answerAttr} style="${style}"><span data-table-blank-measure="true">${measure}</span></span>`;
}

export function renderBlankTokensInHtml(html: string): string {
  return html
    .split(/(<[^>]+>)/g)
    .map((part) => {
      if (!part || part.startsWith("<")) return part;
      return part.replace(/\{\{blank(\*?)(?::([^}]+))?\}\}/g, (_match, star: string, raw: string | undefined) => {
        return renderBlankToken(raw || "", star === "*");
      });
    })
    .join("");
}