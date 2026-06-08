import type {
  CrosswordBlock,
  CrosswordDirection,
  CrosswordItem,
  CrosswordPlacement,
} from "@/types/worksheet";

export const MAX_GRID_COLS = 21;
const SEARCH_NODE_BUDGET = 60_000;
const SEARCH_TIME_BUDGET_MS = 300;

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
  minRow: number;
  maxRow: number;
  minCol: number;
  maxCol: number;
};

type WorkingPlacement = {
  item: NormalizedCrosswordItem;
  row: number;
  col: number;
  direction: CrosswordDirection;
  intersections: number;
};

type SearchContext = {
  best: {
    board: BoardState;
    placements: WorkingPlacement[];
    unplacedIds: string[];
    cost: number;
  } | null;
  expansions: number;
  deadline: number;
  rng: () => number;
  exhausted: boolean;
};

const CROSSWORD_DIRECTIONS: Record<CrosswordDirection, [number, number]> = {
  across: [0, 1],
  down: [1, 0],
};

// Mulberry32 — small, fast, seeded PRNG.
function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleInPlace<T>(array: T[], rng: () => number): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

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

function emptyBoard(): BoardState {
  return {
    cells: new Map(),
    minRow: Number.POSITIVE_INFINITY,
    maxRow: Number.NEGATIVE_INFINITY,
    minCol: Number.POSITIVE_INFINITY,
    maxCol: Number.NEGATIVE_INFINITY,
  };
}

function cloneBoard(board: BoardState): BoardState {
  return {
    cells: new Map(
      Array.from(board.cells.entries(), ([key, cell]) => [
        key,
        {
          kind: cell.kind,
          letter: cell.letter,
          directions: new Set(cell.directions),
        },
      ]),
    ),
    minRow: board.minRow,
    maxRow: board.maxRow,
    minCol: board.minCol,
    maxCol: board.maxCol,
  };
}

function boardWidth(board: BoardState): number {
  if (board.cells.size === 0) return 0;
  return board.maxCol - board.minCol + 1;
}

function boardHeight(board: BoardState): number {
  if (board.cells.size === 0) return 0;
  return board.maxRow - board.minRow + 1;
}

function boardArea(board: BoardState): number {
  return boardWidth(board) * boardHeight(board);
}

function boardCost(board: BoardState): number {
  if (board.cells.size === 0) return 0;
  const w = boardWidth(board);
  const h = boardHeight(board);
  const area = w * h;
  const filled = board.cells.size;
  // primary: height (save vertical space on A4 portrait)
  // secondary: area (don't waste the page horizontally either)
  // tertiary: density
  return h * 10_000 + area * 100 + (area - filled) * 10;
}

// Massive weight so that placing one extra word always wins over any
// height/area difference (max boardCost on a 21×21 grid is well under 1e6).
const UNPLACED_PENALTY = 100_000_000;

// Cost for a (possibly partial) placement: more placed words always wins.
function partialBoardCost(board: BoardState, unplacedCount: number): number {
  return unplacedCount * UNPLACED_PENALTY + boardCost(board);
}

// Sound lower bound on `boardCost` for any descendant state: descendants can
// only grow the bounding box, so current height/area are minimums for the
// future cost. Density term is omitted (it can only improve as cells fill in).
function boardCostLowerBound(board: BoardState): number {
  if (board.cells.size === 0) return 0;
  return boardHeight(board) * 10_000 + boardArea(board) * 100;
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

    if (cellRow < nextBoard.minRow) nextBoard.minRow = cellRow;
    if (cellRow > nextBoard.maxRow) nextBoard.maxRow = cellRow;
    if (cellCol < nextBoard.minCol) nextBoard.minCol = cellCol;
    if (cellCol > nextBoard.maxCol) nextBoard.maxCol = cellCol;
  }

  return nextBoard;
}

function dimensionsIfPlaced(
  board: BoardState,
  candidate: WorkingPlacement,
): { width: number; height: number } | null {
  const [dRow, dCol] = CROSSWORD_DIRECTIONS[candidate.direction];
  const endRow = candidate.row + dRow * (candidate.item.cells.length - 1);
  const endCol = candidate.col + dCol * (candidate.item.cells.length - 1);

  const currentMinRow = board.cells.size === 0 ? candidate.row : board.minRow;
  const currentMaxRow = board.cells.size === 0 ? candidate.row : board.maxRow;
  const currentMinCol = board.cells.size === 0 ? candidate.col : board.minCol;
  const currentMaxCol = board.cells.size === 0 ? candidate.col : board.maxCol;

  const newMinRow = Math.min(currentMinRow, candidate.row, endRow);
  const newMaxRow = Math.max(currentMaxRow, candidate.row, endRow);
  const newMinCol = Math.min(currentMinCol, candidate.col, endCol);
  const newMaxCol = Math.max(currentMaxCol, candidate.col, endCol);

  const width = newMaxCol - newMinCol + 1;
  const height = newMaxRow - newMinRow + 1;

  if (width > MAX_GRID_COLS) return null;
  return { width, height };
}

function buildCandidates(board: BoardState, item: NormalizedCrosswordItem): WorkingPlacement[] {
  // Empty board is handled separately by `seedSearch`.
  if (board.cells.size === 0) return [];

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

        const candidate: WorkingPlacement = {
          item,
          row: startRow,
          col: startCol,
          direction,
          intersections,
        };
        // Hard prune: would the placement exceed the page width?
        if (!dimensionsIfPlaced(board, candidate)) continue;

        placements.set(`${startRow}:${startCol}:${direction}`, candidate);
      }
    }
  }

  return Array.from(placements.values());
}

function searchCrossword(
  board: BoardState,
  remaining: NormalizedCrosswordItem[],
  placements: WorkingPlacement[],
  ctx: SearchContext,
): void {
  if (ctx.expansions >= SEARCH_NODE_BUDGET) {
    ctx.exhausted = true;
    return;
  }
  if (performance.now() > ctx.deadline) {
    ctx.exhausted = true;
    return;
  }
  ctx.expansions += 1;

  // Always consider the current state as a candidate solution. If we can't
  // place every word, we still want the best partial layout (most words
  // placed, then smallest height/area).
  const currentCost = partialBoardCost(board, remaining.length);
  if (!ctx.best || currentCost < ctx.best.cost) {
    ctx.best = {
      board,
      placements,
      unplacedIds: remaining.map((it) => it.id),
      cost: currentCost,
    };
  }

  // Sound lower-bound prune: descendants can only grow the bounding rectangle
  // (and at best place every remaining word), so their cost is at least
  // boardCostLowerBound(board). Compare against the cost of the current best.
  if (ctx.best && boardCostLowerBound(board) >= ctx.best.cost) return;

  if (remaining.length === 0) return;

  // Score every remaining item that CAN be placed from here. Items with no
  // candidates *right now* are not a dead end — adding other words may
  // introduce intersection letters later. We just don't branch on them.
  type ScoredCandidate = {
    candidate: WorkingPlacement;
    height: number;
    area: number;
    lowerBound: number;
  };
  type Entry = {
    item: NormalizedCrosswordItem;
    candidates: ScoredCandidate[];
    bestLowerBound: number;
  };

  const entries: Entry[] = [];

  for (const item of remaining) {
    const rawCandidates = buildCandidates(board, item);
    if (rawCandidates.length === 0) continue;

    let bestLowerBound = Number.POSITIVE_INFINITY;
    const scored: ScoredCandidate[] = rawCandidates.map((candidate) => {
      const dims = dimensionsIfPlaced(board, candidate);
      const height = dims ? dims.height : Number.POSITIVE_INFINITY;
      const area = dims ? dims.width * dims.height : Number.POSITIVE_INFINITY;
      const lowerBound = dims ? height * 10_000 + area * 100 : Number.POSITIVE_INFINITY;
      if (lowerBound < bestLowerBound) bestLowerBound = lowerBound;
      return { candidate, height, area, lowerBound };
    });

    scored.sort((left, right) => {
      if (left.height !== right.height) return left.height - right.height;
      if (left.area !== right.area) return left.area - right.area;
      return right.candidate.intersections - left.candidate.intersections;
    });

    entries.push({ item, candidates: scored, bestLowerBound });
  }

  // No remaining item is placeable from this state — the current partial
  // layout is final for this branch.
  if (entries.length === 0) return;

  entries.sort((left, right) => {
    if (left.bestLowerBound !== right.bestLowerBound) return left.bestLowerBound - right.bestLowerBound;
    return left.candidates.length - right.candidates.length;
  });

  for (const entry of entries) {
    const nextRemaining = remaining.filter((it) => it.id !== entry.item.id);

    for (const { candidate, lowerBound } of entry.candidates) {
      if (ctx.best && lowerBound >= ctx.best.cost) continue;
      const nextBoard = placeWord(board, candidate.item, candidate.row, candidate.col, candidate.direction);
      searchCrossword(nextBoard, nextRemaining, [...placements, candidate], ctx);
    }
  }
}

function seedSearch(items: NormalizedCrosswordItem[], ctx: SearchContext): void {
  // Try ALL items as potential seeds (in randomized order), not just the longest.
  // The original top-3 cap left many word sets unsolvable when none of the
  // longest words could anchor a valid grid. The global node/time budget caps
  // total work either way.
  const orderedSeeds = shuffleInPlace([...items], ctx.rng);

  for (const seed of orderedSeeds) {
    if (ctx.expansions >= SEARCH_NODE_BUDGET) break;
    if (performance.now() > ctx.deadline) break;

    const directions = shuffleInPlace<CrosswordDirection>(["across", "down"], ctx.rng);
    for (const direction of directions) {
      // Words longer than MAX_GRID_COLS placed `across` can't fit at all.
      if (direction === "across" && seed.cells.length > MAX_GRID_COLS) continue;

      const board = placeWord(emptyBoard(), seed, 0, 0, direction);
      const remaining = items.filter((it) => it.id !== seed.id);
      const placement: WorkingPlacement = {
        item: seed,
        row: 0,
        col: 0,
        direction,
        intersections: 0,
      };
      searchCrossword(board, remaining, [placement], ctx);
    }
  }
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
  seed: number = Date.now(),
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

  // Pre-validate: any single word longer than the page width is unplaceable.
  if (normalizedItems.some((item) => item.cells.length > MAX_GRID_COLS)) {
    return { grid: [], placements: [], generationError: "word-too-long" };
  }

  const ctx: SearchContext = {
    best: null,
    expansions: 0,
    deadline: performance.now() + SEARCH_TIME_BUDGET_MS,
    rng: createRng(seed || 1),
    exhausted: false,
  };

  seedSearch(normalizedItems, ctx);

  if (!ctx.best) {
    // Defensive fallback: should be unreachable because every non-empty input
    // can place at least its first seed word.
    return { grid: [], placements: [], generationError: "no-layout" };
  }

  const { board, placements } = ctx.best;
  const rowCount = board.maxRow - board.minRow + 1;
  const colCount = board.maxCol - board.minCol + 1;
  const grid = Array.from({ length: rowCount }, () => Array.from({ length: colCount }, () => ""));

  for (const [key, cell] of board.cells.entries()) {
    const [row, col] = fromCellKey(key);
    grid[row - board.minRow][col - board.minCol] = cell.letter;
  }

  return {
    grid,
    placements: numberPlacements(placements, -board.minRow, -board.minCol),
    generationError: null,
  };
}
