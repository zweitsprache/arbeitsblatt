import type { WordSearchBlock, WordSearchDirection } from "@/types/worksheet";

export const WORD_SEARCH_DIRECTION_VECTORS: Record<WordSearchDirection, [number, number]> = {
  leftToRight: [0, 1],
  rightToLeft: [0, -1],
  upToDown: [1, 0],
  downToUp: [-1, 0],
  nwToSe: [1, 1],
  swToNe: [-1, 1],
  neToSw: [1, -1],
  seToNw: [-1, -1],
};

export const ALL_WORD_SEARCH_DIRECTIONS = Object.keys(
  WORD_SEARCH_DIRECTION_VECTORS,
) as WordSearchDirection[];

export const DEFAULT_WORD_SEARCH_DIRECTIONS: WordSearchDirection[] = ["leftToRight", "upToDown"];

export function normalizeWordSearchWord(word: string): string {
  return word.toUpperCase();
}

export function resolveWordSearchDirections(
  directionsConfig?: WordSearchBlock["allowedDirections"] | null,
  fallbackDirections: WordSearchDirection[] = DEFAULT_WORD_SEARCH_DIRECTIONS,
): WordSearchDirection[] {
  const directions = Object.entries(WORD_SEARCH_DIRECTION_VECTORS)
    .filter(([direction]) => directionsConfig?.[direction as WordSearchDirection])
    .map(([direction]) => direction as WordSearchDirection);

  return directions.length > 0 ? directions : fallbackDirections;
}

export function generateWordSearchGrid(
  words: string[],
  cols: number,
  rows: number,
  allowedDirections?: WordSearchBlock["allowedDirections"],
): string[][] {
  const grid: string[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ""),
  );

  const directions = resolveWordSearchDirections(allowedDirections).map(
    (direction) => WORD_SEARCH_DIRECTION_VECTORS[direction],
  );

  const upperWords = words.map(normalizeWordSearchWord);

  for (const word of upperWords) {
    let placed = false;
    let attempts = 0;
    while (!placed && attempts < 100) {
      attempts++;
      const dir = directions[Math.floor(Math.random() * directions.length)];
      const startRow = dir[0] < 0
        ? Math.floor(Math.random() * (rows - word.length)) + word.length - 1
        : Math.floor(Math.random() * (rows - (dir[0] > 0 ? word.length - 1 : 0)));
      const startCol = dir[1] < 0
        ? Math.floor(Math.random() * (cols - word.length)) + word.length - 1
        : Math.floor(Math.random() * (cols - (dir[1] > 0 ? word.length - 1 : 0)));

      let canPlace = true;
      for (let index = 0; index < word.length; index++) {
        const row = startRow + index * dir[0];
        const col = startCol + index * dir[1];
        if (row < 0 || row >= rows || col < 0 || col >= cols) {
          canPlace = false;
          break;
        }
        if (grid[row][col] !== "" && grid[row][col] !== word[index]) {
          canPlace = false;
          break;
        }
      }

      if (canPlace) {
        for (let index = 0; index < word.length; index++) {
          grid[startRow + index * dir[0]][startCol + index * dir[1]] = word[index];
        }
        placed = true;
      }
    }
  }

  const hasMultiWordItems = upperWords.some((word) => word.includes(" "));
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const emptyCells: Array<[number, number]> = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (grid[row][col] === "") {
        emptyCells.push([row, col]);
      }
    }
  }

  // Add 3 fake blank cells if we have multi-word items
  if (hasMultiWordItems && emptyCells.length > 0) {
    const fakeBlankCount = Math.min(3, emptyCells.length);
    for (let i = 0; i < fakeBlankCount; i++) {
      const randomIndex = Math.floor(Math.random() * emptyCells.length);
      const [row, col] = emptyCells[randomIndex];
      grid[row][col] = " ";
      emptyCells.splice(randomIndex, 1);
    }
  }

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (grid[row][col] === "") {
        grid[row][col] = letters[Math.floor(Math.random() * letters.length)];
      }
    }
  }

  return grid;
}

export function findWordSearchPlacements(
  grid: string[][],
  words: string[],
  allowedDirections?: WordSearchBlock["allowedDirections"],
) {
  const rowCount = grid.length;
  const colCount = grid[0]?.length || 0;
  if (rowCount === 0 || colCount === 0) {
    return [] as Array<{
      word: string;
      wordIndex: number;
      startRow: number;
      startCol: number;
      endRow: number;
      endCol: number;
    }>;
  }

  const normalizedGrid = grid.map((row) => row.map((cell) => cell.toUpperCase()));
  const directions = resolveWordSearchDirections(
    allowedDirections,
    allowedDirections ? DEFAULT_WORD_SEARCH_DIRECTIONS : ALL_WORD_SEARCH_DIRECTIONS,
  ).map(
    (direction) => WORD_SEARCH_DIRECTION_VECTORS[direction],
  );

  return words.flatMap((rawWord, wordIndex) => {
    const word = normalizeWordSearchWord(rawWord);
    if (!word) return [];

    for (let row = 0; row < rowCount; row++) {
      for (let col = 0; col < colCount; col++) {
        if (normalizedGrid[row][col] !== word[0]) continue;

        for (const [dRow, dCol] of directions) {
          let matches = true;

          for (let index = 1; index < word.length; index++) {
            const nextRow = row + dRow * index;
            const nextCol = col + dCol * index;
            if (
              nextRow < 0 ||
              nextRow >= rowCount ||
              nextCol < 0 ||
              nextCol >= colCount ||
              normalizedGrid[nextRow][nextCol] !== word[index]
            ) {
              matches = false;
              break;
            }
          }

          if (matches) {
            return [{
              word: rawWord,
              wordIndex,
              startRow: row,
              startCol: col,
              endRow: row + dRow * (word.length - 1),
              endCol: col + dCol * (word.length - 1),
            }];
          }
        }
      }
    }

    return [];
  });
}