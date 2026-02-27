import { WorksheetBlock } from "@/types/worksheet";

/**
 * Strip HTML tags and decode common entities to plain text.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

/**
 * Extract fill-in-blank content, replacing {{blank:answer}} with the answer.
 */
function expandBlanks(content: string): string {
  return content.replace(/\{\{blank:([^}]+)\}\}/g, (_m, answer) => answer);
}

/**
 * Extract inline choice content, replacing {{correct|wrong1|wrong2}} with the correct (first) option.
 */
function expandInlineChoices(content: string): string {
  return content.replace(/\{\{([^}]+)\}\}/g, (_m, inner: string) => {
    const opts = inner.split("|");
    return opts[0] ?? "";
  });
}

/**
 * Extract plain text from an array of WorksheetBlocks.
 * Optionally pass a worksheets map to resolve linked-blocks.
 */
export function extractBlocksText(
  blocks: WorksheetBlock[],
  worksheets?: Record<string, { blocks: WorksheetBlock[] }>
): string {
  const parts: string[] = [];

  for (const block of blocks) {
    switch (block.type) {
      case "heading":
        if (block.content) parts.push(block.content);
        break;

      case "text":
        if (block.content) parts.push(stripHtml(block.content));
        break;

      case "multiple-choice":
        if (block.question) parts.push(block.question);
        for (const opt of block.options ?? []) {
          if (opt.text) parts.push(`- ${opt.text}${opt.isCorrect ? " (correct)" : ""}`);
        }
        break;

      case "fill-in-blank":
        if (block.content) parts.push(expandBlanks(block.content));
        break;

      case "fill-in-blank-items":
        for (const item of block.items ?? []) {
          if (item.content) parts.push(expandBlanks(item.content));
        }
        break;

      case "matching":
        if (block.instruction) parts.push(block.instruction);
        for (const pair of block.pairs ?? []) {
          parts.push(`${pair.left} → ${pair.right}`);
        }
        break;

      case "two-column-fill":
        if (block.instruction) parts.push(block.instruction);
        for (const item of block.items ?? []) {
          parts.push(`${item.left} — ${item.right}`);
        }
        break;

      case "glossary":
        if (block.instruction) parts.push(block.instruction);
        for (const pair of block.pairs ?? []) {
          parts.push(`${pair.term}: ${pair.definition}`);
        }
        break;

      case "open-response":
        if (block.question) parts.push(block.question);
        break;

      case "true-false-matrix":
        if (block.instruction) parts.push(block.instruction);
        for (const stmt of block.statements ?? []) {
          parts.push(`${stmt.text} (${stmt.correctAnswer ? "true" : "false"})`);
        }
        break;

      case "order-items":
        if (block.instruction) parts.push(block.instruction);
        for (const item of block.items ?? []) {
          parts.push(`${item.correctPosition}. ${item.text}`);
        }
        break;

      case "inline-choices":
        for (const item of block.items ?? []) {
          if (item.content) parts.push(expandInlineChoices(item.content));
        }
        break;

      case "sorting-categories":
        if (block.instruction) parts.push(block.instruction);
        for (const cat of block.categories ?? []) {
          parts.push(`Category: ${cat.label}`);
        }
        for (const item of block.items ?? []) {
          parts.push(`- ${item.text}`);
        }
        break;

      case "unscramble-words":
        if (block.instruction) parts.push(block.instruction);
        for (const w of block.words ?? []) {
          parts.push(w.word);
        }
        break;

      case "fix-sentences":
        if (block.instruction) parts.push(block.instruction);
        for (const s of block.sentences ?? []) {
          parts.push(s.sentence.replace(/ \| /g, " "));
        }
        break;

      case "complete-sentences":
        if (block.instruction) parts.push(block.instruction);
        for (const s of block.sentences ?? []) {
          parts.push(s.beginning);
        }
        break;

      case "verb-table":
        parts.push(`Verb: ${block.verb}`);
        for (const row of [...(block.singularRows ?? []), ...(block.pluralRows ?? [])]) {
          parts.push(`${row.pronoun} ${row.conjugation}`);
        }
        break;

      case "dialogue":
        if (block.instruction) parts.push(block.instruction);
        for (const item of block.items ?? []) {
          const text = expandBlanks(item.text);
          parts.push(`${item.speaker}: ${text}`);
        }
        break;

      case "article-training":
        if (block.instruction) parts.push(block.instruction);
        for (const item of block.items ?? []) {
          parts.push(`${item.correctArticle} ${item.text}`);
        }
        break;

      case "image-cards":
        for (const item of block.items ?? []) {
          if (item.text) parts.push(item.text);
        }
        break;

      case "text-cards":
        for (const item of block.items ?? []) {
          if (item.text) parts.push(item.text);
          if (item.caption) parts.push(item.caption);
        }
        break;

      case "word-bank":
        if (block.words?.length) parts.push(`Words: ${block.words.join(", ")}`);
        break;

      case "chart":
        if (block.title) parts.push(block.title);
        for (const dp of block.data ?? []) {
          parts.push(`${dp.label}: ${dp.value}`);
        }
        break;

      case "columns":
        for (const col of block.children ?? []) {
          const colText = extractBlocksText(col, worksheets);
          if (colText) parts.push(colText);
        }
        break;

      case "linked-blocks":
        if (worksheets && worksheets[block.worksheetId]) {
          const ws = worksheets[block.worksheetId];
          const wsText = extractBlocksText(ws.blocks);
          if (wsText) parts.push(wsText);
        }
        break;

      // Skip visual-only blocks: image, spacer, divider, page-break,
      // writing-lines, writing-rows, number-line, numbered-label, word-search
      default:
        break;
    }
  }

  return parts.filter(Boolean).join("\n");
}
