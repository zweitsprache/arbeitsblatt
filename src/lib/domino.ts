import { parseBlankContent } from "@/lib/fill-in-blank";
import { BoardGameCell, CardPairsBlock, CardPairsPairingMode, DominoBlock, DominoTextSize, FlashcardsBlock } from "@/types/worksheet";

export interface DominoPair {
  pairIndex: number;
  pairLabel: string;
  itemIndices: number[];
  pairItems: BoardGameCell[];
}

export function getDefaultDominoItems(): BoardGameCell[] {
  return Array.from({ length: 8 }, (_, index) => ({
    id: `domino-item-${index + 1}`,
    text: index === 0 ? "START" : index === 7 ? "ZIEL" : "",
    imageUrl: "",
    speakerIcon: null,
  }));
}

export function getDefaultFlashcardItems(): BoardGameCell[] {
  return Array.from({ length: 8 }, (_, index) => ({
    id: `flashcard-item-${index + 1}`,
    text: "",
    imageUrl: "",
    speakerIcon: null,
  }));
}

export function getDefaultCardPairItems(): BoardGameCell[] {
  return Array.from({ length: 8 }, (_, index) => ({
    id: `card-pair-item-${index + 1}`,
    text: "",
    imageUrl: "",
    speakerIcon: null,
  }));
}

export function getDominoTextSize(blockTextSize?: DominoTextSize | null): DominoTextSize {
  return blockTextSize ?? "m";
}

export function getDominoEditorTextClass(blockTextSize?: DominoTextSize | null): string {
  switch (getDominoTextSize(blockTextSize)) {
    case "s":
      return "text-xs leading-snug";
    case "l":
      return "text-sm leading-snug";
    case "xl":
      return "text-base leading-snug";
    case "m":
    default:
      return "text-[13px] leading-snug";
  }
}

export function getDominoPrintFontSize(blockTextSize?: DominoTextSize | null): string {
  switch (getDominoTextSize(blockTextSize)) {
    case "s":
      return "11pt";
    case "l":
      return "14pt";
    case "xl":
      return "16pt";
    case "m":
    default:
      return "12.5pt";
  }
}

function hashString(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let result = Math.imul(value ^ (value >>> 15), 1 | value);
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function deterministicShuffle<T>(items: T[], seedKey: string): T[] {
  const shuffled = [...items];
  const random = mulberry32(hashString(seedKey));
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

export function getDominoItems(items: BoardGameCell[]): BoardGameCell[] {
  return items.length > 0 ? items : getDefaultDominoItems();
}

export function getFlashcardItems(items: BoardGameCell[]): BoardGameCell[] {
  return items.length > 0 ? items : getDefaultFlashcardItems();
}

export function getCardPairItems(items: BoardGameCell[]): BoardGameCell[] {
  return items.length > 0 ? items : getDefaultCardPairItems();
}

export function getCardPairsPairingMode(pairingMode?: CardPairsPairingMode | null): CardPairsPairingMode {
  return pairingMode ?? "same";
}

const FLASHCARD_BLANK_TOKEN_PATTERN = /\{\{blank\*?(?::[^}]*)?\}\}/;
const FLASHCARD_BLANK_TOKEN_REPLACE_PATTERN = /\{\{blank\*?(?::([^}]*))?\}\}/g;

export function solveFlashcardBlankText(text: string): string {
  return text.replace(FLASHCARD_BLANK_TOKEN_REPLACE_PATTERN, (_match, raw = "") => parseBlankContent(raw).answer);
}

export function getFlashcardDisplayText(frontItem?: BoardGameCell | null, backItem?: BoardGameCell | null, sideIndex = 0): string {
  if (sideIndex === 0) {
    return frontItem?.text ?? "";
  }

  const backText = backItem?.text?.trim() ? backItem.text : "";
  if (backText) {
    return backText;
  }

  const frontText = frontItem?.text ?? "";
  if (!FLASHCARD_BLANK_TOKEN_PATTERN.test(frontText)) {
    return backItem?.text ?? "";
  }

  return solveFlashcardBlankText(frontText);
}

export function getCardPairDisplayText(
  frontItem?: BoardGameCell | null,
  backItem?: BoardGameCell | null,
  sideIndex = 0,
  pairingMode?: CardPairsPairingMode | null,
): string {
  if (getCardPairsPairingMode(pairingMode) === "same" && sideIndex === 1) {
    return frontItem?.text ?? "";
  }

  return getFlashcardDisplayText(frontItem, backItem, sideIndex);
}

function buildPairs(id: string, items: BoardGameCell[], shufflePairs?: boolean): DominoPair[] {
  const pairs = Array.from({ length: Math.ceil(items.length / 2) }, (_, pairIndex) => {
    const startIndex = pairIndex * 2;
    const itemIndices = [startIndex, startIndex + 1].filter((itemIndex) => itemIndex < items.length);

    return {
      pairIndex,
      pairLabel: `${startIndex + 1}/${Math.min(startIndex + 2, items.length)}`,
      itemIndices,
      pairItems: items.slice(startIndex, startIndex + 2),
    };
  });

  if (!shufflePairs) {
    return pairs;
  }

  return deterministicShuffle(pairs, `domino-pairs:${id}`);
}

export function getDominoPairs(block: Pick<DominoBlock, "id" | "items" | "shufflePairs">): DominoPair[] {
  return buildPairs(block.id, getDominoItems(block.items), block.shufflePairs);
}

export function getFlashcardPairs(block: Pick<FlashcardsBlock, "id" | "items" | "shufflePairs">): DominoPair[] {
  return buildPairs(block.id, getFlashcardItems(block.items), block.shufflePairs);
}

export function getCardPairs(block: Pick<CardPairsBlock, "id" | "items" | "shufflePairs">): DominoPair[] {
  return buildPairs(block.id, getCardPairItems(block.items), block.shufflePairs);
}