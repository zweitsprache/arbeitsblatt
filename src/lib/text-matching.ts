export type TextMatchingRenderableItem = {
  id: string;
  text?: string;
  content?: string;
};

function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  return () => {
    let t = seed += 0x6d2b79f5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function deterministicShuffle<T>(items: T[], seedKey: string): T[] {
  const out = [...items];
  const rand = mulberry32(hashString(seedKey));
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function hasTextMatchingContent(html: string | undefined): boolean {
  if (!html) return false;
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim().length > 0;
}

export function hasTextMatchingText(text: string | undefined): boolean {
  if (!text) return false;
  const normalized = text
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/[\u00a0\u200b-\u200d\ufeff]/g, "")
    .trim();

  if (/^(New item|Neues Element)(\s+\d+)?$/i.test(normalized)) return false;
  return normalized.length > 0;
}

export function getTextMatchingTextItems<T extends TextMatchingRenderableItem>(items: T[]): T[] {
  return items.filter((item) => hasTextMatchingText(item.text));
}

export function getTextMatchingCardItems<T extends TextMatchingRenderableItem>(blockId: string, items: T[]): T[] {
  return deterministicShuffle(
    items.filter((item) => hasTextMatchingContent(item.content)),
    `text-matching:${blockId}`
  );
}

export function getTextMatchingAnswerLetters<T extends TextMatchingRenderableItem>(
  blockId: string,
  items: T[],
  formatLetter: (index: number) => string,
): Map<string, string> {
  const textItems = getTextMatchingTextItems(items);
  const shuffledCards = getTextMatchingCardItems(blockId, items);
  const letterByCardId = new Map<string, string>();

  shuffledCards.forEach((item, index) => {
    letterByCardId.set(item.id, formatLetter(index + 1));
  });

  const answerByTextId = new Map<string, string>();

  textItems.forEach((item) => {
    if (!hasTextMatchingContent(item.content)) {
      answerByTextId.set(item.id, "X");
      return;
    }

    const letter = letterByCardId.get(item.id);
    if (letter) answerByTextId.set(item.id, letter);
  });

  return answerByTextId;
}
