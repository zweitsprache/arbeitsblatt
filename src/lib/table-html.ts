import { BLANK_TOKEN_REGEX, parseBlankContent, parseBlankToken } from "@/lib/fill-in-blank";

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
  let marked = false;

  return html.replace(/<span data-table-blank="true"([^>]*)>/gi, (match, attrs) => {
    if (marked) return match;
    marked = true;

    if (/\bdata-table-example-blank="true"\b/i.test(attrs)) {
      return match;
    }

    return `<span data-table-blank="true"${attrs} data-table-example-blank="true">`;
  });
}

function styleObjectToCss(style: Record<string, string | number | undefined>): string {
  return Object.entries(style)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${key.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`)}:${String(value)}`)
    .join(";");
}

function renderBlankToken(raw: string, noSpace: boolean): string {
  const { answer } = parseBlankContent(raw);
  const style = styleObjectToCss({
    verticalAlign: "middle",
    boxSizing: "border-box",
    marginLeft: noSpace ? undefined : "0",
    marginRight: noSpace ? undefined : "0",
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
      return part.replace(BLANK_TOKEN_REGEX, (match) => {
        const token = parseBlankToken(match);
        return renderBlankToken(token?.raw || "", token?.noSpace || false);
      });
    })
    .join("");
}
