import type {
  CrosswordBlock,
  CrosswordDirection,
  CrosswordItem,
  CrosswordPlacement,
} from "@/types/worksheet";

type NormalizedCrosswordItem = CrosswordItem & {
  normalizedAnswer: string;
  cells: Array<{ kind: "letter"; value: string } | { kind: "gap"; value: string }>;
};

type BoardCell = {
  kind: "letter" | "gap";
  letter: string;
  directions: Set<CrosswordDirection>;
};

type BoardState = {
  cells: Map<string, BoardCell>;
};

type WorkingPlacement = {
  item: NormalizedCrosswordItem;
  row: number;
  col: number;
  direction: CrosswordDirection;
  intersections: number;
};

const CROSSWORD_DIRECTIONS: Record<CrosswordDirection, [number, number]> = {
  across: [0, 1],
  down: [1, 0],
};

function toCellKey(row: number, col: number): string {
  return `${row},${col}`;
}

function fromCellKey(key: string): [number, number] {
  const [row, col] = key.split(",").map(Number);
  return [row, col];
}

function getCell(board: BoardState, row: number, col: number): BoardCell | undefined {
  return board.cells.get(toCellKey(row, col));
}

function isOccupied(board: BoardState, row: number, col: number): boolean {
  return board.cells.has(toCellKey(row, col));
}

function cloneBoard(board: BoardState): BoardState {
  return {
    cells: new Map(
      Array.from(board.cells.entries(), ([key, cell]) => [
        key,
        { letter: cell.letter, directions: new Set(cell.directions) },
      ]),
    ),
  };
}

function getBoardBounds(board: BoardState) {
  if (board.cells.size === 0) {
    return { minRow: 0, maxRow: 0, minCol: 0, maxCol: 0 };
  }

  let minRow = Number.POSITIVE_INFINITY;
  let maxRow = Number.NEGATIVE_INFINITY;
  let minCol = Number.POSITIVE_INFINITY;
  let maxCol = Number.NEGATIVE_INFINITY;

  for (const key of board.cells.keys()) {
    const [row, col] = fromCellKey(key);
    minRow = Math.min(minRow, row);
    maxRow = Math.max(maxRow, row);
    minCol = Math.min(minCol, col);
    maxCol = Math.max(maxCol, col);
  }

  return { minRow, maxRow, minCol, maxCol };
}

function getBoundingArea(board: BoardState): number {
  const bounds = getBoardBounds(board);
  return (bounds.maxRow - bounds.minRow + 1) * (bounds.maxCol - bounds.minCol + 1);
}

export function normalizeCrosswordAnswer(answer: string): string {
  return answer
    .normalize("NFC")
    .toUpperCase()
    .replace(/[\s-]+/g, "")
    .replace(/[^\p{L}]/gu, "");
}

function tokenizeCrosswordAnswer(answer: string): NormalizedCrosswordItem["cells"] {
  const cells: NormalizedCrosswordItem["cells"] = [];

  for (const char of answer.normalize("NFC").toUpperCase()) {
    if (char === "-") {
      if (cells.length > 0) {
        cells.push({ kind: "gap", value: "-" });
      }
      continue;
    }

    if (/\s/.test(char)) {
      if (cells.length > 0) {
        cells.push({ kind: "gap", value: " " });
      }
      continue;
    }

    if (/\p{L}/u.test(char)) {
      cells.push({ kind: "letter", value: char });
    }
  }

  if (cells[cells.length - 1]?.kind === "gap") {
    cells.pop();
  }

  return cells;
}

export function formatCrosswordItemsText(items: CrosswordItem[]): string {
  return items.map((item) => `${item.answer}|${item.hint}`).join("\n");
}

export function parseCrosswordItemsText(text: string): Array<Pick<CrosswordItem, "answer" | "hint">> {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separatorIndex = line.indexOf("|");
      if (separatorIndex === -1) {
        return { answer: line, hint: "" };
      }

      return {
        answer: line.slice(0, separatorIndex).trim(),
        hint: line.slice(separatorIndex + 1).trim(),
      };
    })
    .filter((item) => item.answer.length > 0);
}

function canPlaceWord(
  board: BoardState,
  cells: NormalizedCrosswordItem["cells"],
  row: number,
  col: number,
  direction: CrosswordDirection,
): number | null {
  const [dRow, dCol] = CROSSWORD_DIRECTIONS[direction];
  const beforeRow = row - dRow;
  const beforeCol = col - dCol;
  const afterRow = row + dRow * cells.length;
  const afterCol = col + dCol * cells.length;

  if (isOccupied(board, beforeRow, beforeCol) || isOccupied(board, afterRow, afterCol)) {
    return null;
  }

  let intersections = 0;

  for (let index = 0; index < cells.length; index++) {
    const cellRow = row + dRow * index;
    const cellCol = col + dCol * index;
    const existing = getCell(board, cellRow, cellCol);
    const targetCell = cells[index];

    if (existing) {
      if (targetCell.kind !== "letter") return null;
      if (existing.kind !== "letter" || existing.letter !== targetCell.value) return null;
      if (existing.directions.has(direction)) return null;
      intersections += 1;
      continue;
    }

    if (direction === "across") {
      if (isOccupied(board, cellRow - 1, cellCol) || isOccupied(board, cellRow + 1, cellCol)) {
        return null;
      }
    } else if (isOccupied(board, cellRow, cellCol - 1) || isOccupied(board, cellRow, cellCol + 1)) {
      return null;
    }
  }

  if (board.cells.size > 0 && intersections === 0) {
    return null;
  }

  return intersections;
}

function placeWord(
  board: BoardState,
  item: NormalizedCrosswordItem,
  row: number,
  col: number,
  direction: CrosswordDirection,
): BoardState {
  const nextBoard = cloneBoard(board);
  const [dRow, dCol] = CROSSWORD_DIRECTIONS[direction];

  for (let index = 0; index < item.cells.length; index++) {
    const cellRow = row + dRow * index;
    const cellCol = col + dCol * index;
    const key = toCellKey(cellRow, cellCol);
    const existing = nextBoard.cells.get(key);
    const targetCell = item.cells[index];

    if (existing) {
      existing.directions.add(direction);
    } else {
      nextBoard.cells.set(key, {
        kind: targetCell.kind,
        letter: targetCell.value,
        directions: new Set([direction]),
      });
    }
  }

  return nextBoard;
}

function buildCandidates(board: BoardState, item: NormalizedCrosswordItem): WorkingPlacement[] {
  if (board.cells.size === 0) {
    return [{ item, row: 0, col: 0, direction: "across", intersections: 0 }];
  }

  const placements = new Map<string, WorkingPlacement>();

  for (const [key, cell] of board.cells.entries()) {
    if (cell.kind !== "letter") continue;
    const [row, col] = fromCellKey(key);

    for (let index = 0; index < item.cells.length; index++) {
      const targetCell = item.cells[index];
      if (targetCell.kind !== "letter" || targetCell.value !== cell.letter) continue;

      for (const direction of ["across", "down"] as const) {
        const [dRow, dCol] = CROSSWORD_DIRECTIONS[direction];
        const startRow = row - dRow * index;
        const startCol = col - dCol * index;
        const intersections = canPlaceWord(board, item.cells, startRow, startCol, direction);
        if (intersections === null) continue;

        placements.set(`${startRow}:${startCol}:${direction}`, {
          item,
          row: startRow,
          col: startCol,
          direction,
          intersections,
        });
      }
    }
  }

  return Array.from(placements.values()).sort((left, right) => {
    if (right.intersections !== left.intersections) {
      return right.intersections - left.intersections;
    }

    const leftArea = getBoundingArea(placeWord(board, left.item, left.row, left.col, left.direction));
    const rightArea = getBoundingArea(placeWord(board, right.item, right.row, right.col, right.direction));
    if (leftArea !== rightArea) {
      return leftArea - rightArea;
    }

    if (left.row !== right.row) return left.row - right.row;
    if (left.col !== right.col) return left.col - right.col;
    return left.direction.localeCompare(right.direction);
  });
}

function solveCrossword(
  board: BoardState,
  remainingItems: NormalizedCrosswordItem[],
  placements: WorkingPlacement[],
): { board: BoardState; placements: WorkingPlacement[] } | null {
  if (remainingItems.length === 0) {
    return { board, placements };
  }

  const itemCandidates = remainingItems
    .map((item) => ({ item, candidates: buildCandidates(board, item) }))
    .filter((entry) => entry.candidates.length > 0)
    .sort((left, right) => {
      if (left.candidates.length !== right.candidates.length) {
        return left.candidates.length - right.candidates.length;
      }
      return right.item.normalizedAnswer.length - left.item.normalizedAnswer.length;
    });

  for (const entry of itemCandidates) {
    const nextRemainingItems = remainingItems.filter((item) => item.id !== entry.item.id);

    for (const candidate of entry.candidates) {
      const nextBoard = placeWord(board, candidate.item, candidate.row, candidate.col, candidate.direction);
      const result = solveCrossword(nextBoard, nextRemainingItems, [...placements, candidate]);
      if (result) return result;
    }
  }

  return null;
}

function numberPlacements(
  placements: WorkingPlacement[],
  rowOffset: number,
  colOffset: number,
): CrosswordPlacement[] {
  const startCells = new Map<string, number>();
  let nextNumber = 1;

  const sortedStarts = [...placements].sort((left, right) => {
    if (left.row !== right.row) return left.row - right.row;
    if (left.col !== right.col) return left.col - right.col;
    return left.direction === right.direction ? 0 : left.direction === "across" ? -1 : 1;
  });

  for (const placement of sortedStarts) {
    const key = toCellKey(placement.row + rowOffset, placement.col + colOffset);
    if (!startCells.has(key)) {
      startCells.set(key, nextNumber);
      nextNumber += 1;
    }
  }

  return placements
    .map((placement) => {
      const [dRow, dCol] = CROSSWORD_DIRECTIONS[placement.direction];
      const row = placement.row + rowOffset;
      const col = placement.col + colOffset;
      return {
        itemId: placement.item.id,
        answer: placement.item.answer,
        hint: placement.item.hint,
        row,
        col,
        labelRow: row - dRow,
        labelCol: col - dCol,
        direction: placement.direction,
        clueNumber: startCells.get(toCellKey(row, col)) ?? 0,
      };
    })
    .sort((left, right) => {
      if (left.clueNumber !== right.clueNumber) return left.clueNumber - right.clueNumber;
      return left.direction === right.direction ? 0 : left.direction === "across" ? -1 : 1;
    });
}

export function generateCrosswordLayout(
  items: CrosswordItem[],
): Pick<CrosswordBlock, "grid" | "placements" | "generationError"> {
  const normalizedItems = items
    .map((item) => ({
      ...item,
      cells: tokenizeCrosswordAnswer(item.answer),
      normalizedAnswer: normalizeCrosswordAnswer(item.answer),
    }))
    .filter((item) => item.normalizedAnswer.length > 0 && item.cells.length > 0 && item.hint.trim().length > 0)
    .sort((left, right) => {
      if (right.normalizedAnswer.length !== left.normalizedAnswer.length) {
        return right.normalizedAnswer.length - left.normalizedAnswer.length;
      }
      return left.normalizedAnswer.localeCompare(right.normalizedAnswer);
    });

  if (normalizedItems.length === 0) {
    return { grid: [], placements: [], generationError: null };
  }

  const seenAnswers = new Set<string>();
  for (const item of normalizedItems) {
    if (seenAnswers.has(item.normalizedAnswer)) {
      return { grid: [], placements: [], generationError: "duplicate-answers" };
    }
    seenAnswers.add(item.normalizedAnswer);
  }

  const solved = solveCrossword({ cells: new Map() }, normalizedItems, []);
  if (!solved) {
    return { grid: [], placements: [], generationError: "unplaced-items" };
  }

  const bounds = getBoardBounds(solved.board);
  let minRow = bounds.minRow;
  let maxRow = bounds.maxRow;
  let minCol = bounds.minCol;
  let maxCol = bounds.maxCol;

  for (const placement of solved.placements) {
    const [dRow, dCol] = CROSSWORD_DIRECTIONS[placement.direction];
    minRow = Math.min(minRow, placement.row - dRow);
    maxRow = Math.max(maxRow, placement.row - dRow);
    minCol = Math.min(minCol, placement.col - dCol);
    maxCol = Math.max(maxCol, placement.col - dCol);
  }

  const rowCount = maxRow - minRow + 1;
  const colCount = maxCol - minCol + 1;
  const grid = Array.from({ length: rowCount }, () => Array.from({ length: colCount }, () => ""));

  for (const [key, cell] of solved.board.cells.entries()) {
    const [row, col] = fromCellKey(key);
    grid[row - minRow][col - minCol] = cell.letter;
  }

  return {
    grid,
    placements: numberPlacements(solved.placements, -minRow, -minCol),
    generationError: null,
  };
}