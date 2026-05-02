/**
 * Lightweight Markdown → HTML converter for flashcard content.
 * Handles the subset of Markdown that makes sense for card text:
 * bold, italic, underline, strikethrough, superscript, subscript,
 * inline code, paragraphs, headings, and simple lists.
 */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function sanitizeHtml(value: string): string {
  return value
    .replace(/<\/?(script|style|iframe|object|embed)[^>]*>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");
}

export function hasHtmlMarkup(value: string): boolean {
  return /<\/?[a-z][\s\S]*?>/i.test(value);
}

export function hasMarkdownSyntax(value: string): boolean {
  return /(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_|`[^`]+`|~~[^~]+~~|^#{1,6}\s|\[[^\]]+\]\([^)]+\)|^\s*[-*+]\s|^\s*\d+\.\s|\n\s*\n|\^\^[^\^]+\^\^)/m.test(
    value
  );
}

function formatInlineMarkdown(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/_([^_]+)_/g, "<em>$1</em>")
    .replace(/~~([^~]+)~~/g, "<s>$1</s>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\^\^([^\^]+)\^\^/g, "<sup>$1</sup>")
    .replace(/~([^~]+)~/g, "<sub>$1</sub>")
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    );
}

/**
 * Apply inline Markdown conversion only to text nodes within an HTML string.
 * Does NOT HTML-escape — assumes the input is already sanitized HTML.
 */
function applyInlineMarkdownToTextNodes(html: string): string {
  // Match text between > and < (i.e. text nodes), or at start/end of string
  return html.replace(/(^|>)([^<]+)(<|$)/g, (_, before, text, after) => {
    const converted = text
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(/_([^_]+)_/g, "<em>$1</em>")
      .replace(/~~([^~]+)~~/g, "<s>$1</s>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\^\^([^\^]+)\^\^/g, "<sup>$1</sup>")
      .replace(/~([^~]+)~/g, "<sub>$1</sub>");
    return before + converted + after;
  });
}

function markdownToHtml(value: string): string {
  const blocks = value.trim().split(/\n\s*\n/);
  const htmlBlocks = blocks.map((block) => {
    const lines = block.split("\n");

    if (lines.every((line) => /^\s*[-*+]\s+/.test(line))) {
      const items = lines
        .map((line) => line.replace(/^\s*[-*+]\s+/, "").trim())
        .filter(Boolean)
        .map((item) => `<li>${formatInlineMarkdown(item)}</li>`)
        .join("");
      return `<ul>${items}</ul>`;
    }

    if (lines.every((line) => /^\s*\d+\.\s+/.test(line))) {
      const items = lines
        .map((line) => line.replace(/^\s*\d+\.\s+/, "").trim())
        .filter(Boolean)
        .map((item) => `<li>${formatInlineMarkdown(item)}</li>`)
        .join("");
      return `<ol>${items}</ol>`;
    }

    const heading = lines[0]?.match(/^\s*(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const headingText = formatInlineMarkdown(heading[2]);
      const rest = lines.slice(1).join("\n").trim();
      if (!rest)
        return `<h${level}>${headingText}</h${level}>`;
      return `<h${level}>${headingText}</h${level}><p>${formatInlineMarkdown(rest).replace(/\n/g, "<br>")}</p>`;
    }

    return `<p>${formatInlineMarkdown(lines.join("\n")).replace(/\n/g, "<br>")}</p>`;
  });

  return htmlBlocks.join("");
}

/**
 * Normalize an imported or stored text value to HTML.
 * - Already-HTML values are sanitized and any inline Markdown in text nodes is converted.
 * - Pure Markdown values are converted to HTML.
 * - Plain text is returned unchanged.
 */
export function normalizeToHtml(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (hasHtmlMarkup(trimmed)) {
    const sanitized = sanitizeHtml(trimmed);
    // Handle mixed HTML+Markdown (e.g. "Text<br><br>**Bold**")
    return hasMarkdownSyntax(sanitized)
      ? applyInlineMarkdownToTextNodes(sanitized)
      : sanitized;
  }
  if (hasMarkdownSyntax(trimmed)) return markdownToHtml(trimmed);
  return value;
}
