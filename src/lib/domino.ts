import { BoardGameCell, DominoBlock } from "@/types/worksheet";

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
  }));
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

export function getDominoPairs(block: Pick<DominoBlock, "id" | "items" | "shufflePairs">): DominoPair[] {
  const items = getDominoItems(block.items);
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

  if (!block.shufflePairs) {
    return pairs;
  }

  return deterministicShuffle(pairs, `domino-pairs:${block.id}`);
}