import { WorksheetBlock } from "@/types/worksheet";
import { parseBlankContent, parseBlankToken } from "@/lib/fill-in-blank";
import { hasTextMatchingContent, hasTextMatchingText } from "@/lib/text-matching";

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
 * Extract fill-in-blank content, replacing {{blank:answer}} / {{blank,xl:answer}} with the answer.
 */
function expandBlanks(content: string): string {
  return content.replace(/\{\{blank\*?(?:,[^:}]+)?(?::[^}]*)?\}\}/g, (match) => {
    const token = parseBlankToken(match);
    return parseBlankContent(token?.raw || "").answer;
  });
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

      case "title":
        for (const item of block.items ?? []) {
          if (item.content) parts.push(item.content);
        }
        break;

      case "numbered-heading":
        if (block.content) parts.push(block.content);
        break;

      case "text":
        if (block.content) parts.push(stripHtml(block.content));
        break;

      case "text-comparison":
        if (block.leftContent) parts.push(stripHtml(block.leftContent));
        if (block.rightContent) parts.push(stripHtml(block.rightContent));
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

      case "text-matching":
        if (block.instruction) parts.push(block.instruction);
        for (const item of block.items ?? []) {
          if (hasTextMatchingText(item.text)) parts.push(item.text ?? "");
          if (hasTextMatchingContent(item.content)) parts.push(stripHtml(item.content ?? ""));
        }
        break;

      case "pronunciation":
        if (block.instruction) parts.push(block.instruction);
        if (block.leftHeader) parts.push(block.leftHeader);
        if (block.rightHeader) parts.push(block.rightHeader);
        if (block.textAboveItems) parts.push(block.textAboveItems);
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

      case "mcq-matrix":
        if (block.instruction) parts.push(block.instruction);
        for (const word of block.wordBank ?? []) {
          if (word) parts.push(word);
        }
        for (const stmt of block.statements ?? []) {
          const correctOptions = (block.options ?? [])
            .filter((option) => stmt.correctOptionIds?.includes(option.id))
            .map((option) => option.text)
            .join(", ");
          const trailing = stmt.afterOptionsText ? ` ${stmt.afterOptionsText}` : "";
          parts.push(`${stmt.text} (${correctOptions})${trailing}`);
        }
        break;

      case "mcq-rows":
        if (block.instruction) parts.push(block.instruction);
        for (const item of block.items ?? []) {
          const choices = (item.choices ?? [])
            .map((choice) => (choice.id === item.correctChoiceId ? `*${choice.text}` : choice.text))
            .join(", ");
          parts.push(`${item.text} (${choices})`);
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

      case "correct-spelling":
      case "correct-spelling":
      case "correct-numbers":
      case "missing-letters":
        if (block.instruction) parts.push(block.instruction);
        for (const w of block.words ?? []) {
          parts.push(w.word);
        }
        break;

      case "letter-code":
        if (block.instruction) parts.push(block.instruction);
        for (const item of block.items ?? []) {
          if (item.clue) parts.push(item.clue);
          if (item.word) parts.push(item.word);
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

      case "start-sentences":
        if (block.instruction) parts.push(block.instruction);
        for (const s of block.sentences ?? []) {
          parts.push(s.beginning);
          if (s.ending) parts.push(s.ending);
        }
        break;

      case "reading-comprehension":
        if (block.instruction) parts.push(block.instruction);
        if (block.readingText) parts.push(block.readingText);
        for (const s of block.sentences ?? []) {
          if (s.question) parts.push(s.question);
          if (block.layoutType !== "true-false" && s.beginning) parts.push(s.beginning);
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

      case "lueckenzeilen":
        if (block.instruction) parts.push(block.instruction);
        for (const item of block.items ?? []) {
          parts.push(expandBlanks(item.text));
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

      case "image-text-table":
        if (block.instruction) parts.push(block.instruction);
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

      case "accordion":
        for (const item of block.items ?? []) {
          if (item.title) parts.push(item.title);
          const childText = extractBlocksText(item.children ?? [], worksheets);
          if (childText) parts.push(childText);
        }
        break;

      case "checklist":
        for (const item of block.items ?? []) {
          if (item.content) parts.push(stripHtml(item.content));
        }
        break;

      case "quartett":
      case "taboo":
        if (block.title) parts.push(block.title);
        for (const item of block.items ?? []) {
          if (item.title) parts.push(item.title);
          for (const subitem of item.subitems ?? []) {
            if (subitem.content) parts.push(subitem.content);
          }
        }
        break;

      case "aufgabenkarten":
        if (block.title) parts.push(block.title);
        if (block.subtitle) parts.push(block.subtitle);
        for (const item of block.items ?? []) {
          if (item.title) parts.push(item.title);
          if (item.task || item.text) parts.push(item.task || item.text || "");
          for (const chunk of item.chunks ?? []) {
            if (chunk) parts.push(chunk);
          }
        }
        break;

      case "website":
        if (block.title) parts.push(block.title);
        for (const item of block.items ?? []) {
          if (item.title) parts.push(item.title);
          if (item.category || item.description) parts.push(item.category || item.description);
        }
        break;

      case "crossword":
        if (block.instruction) parts.push(block.instruction);
        for (const item of block.items ?? []) {
          if (item.answer) parts.push(item.answer);
          if (item.hint) parts.push(item.hint);
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
