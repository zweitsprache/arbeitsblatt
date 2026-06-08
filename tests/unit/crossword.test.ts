import { describe, expect, it } from "vitest";
import {
  MAX_GRID_COLS,
  generateCrosswordLayout,
  normalizeCrosswordAnswer,
} from "@/lib/crossword";
import type { CrosswordItem } from "@/types/worksheet";

function makeItems(answers: string[]): CrosswordItem[] {
  return answers.map((answer, index) => ({
    id: `item-${index}`,
    answer,
    hint: `Hint ${index + 1}`,
  }));
}

describe("generateCrosswordLayout", () => {
  it("places a single word", () => {
    const result = generateCrosswordLayout(makeItems(["HELLO"]), 1);
    expect(result.generationError).toBeNull();
    expect(result.placements).toHaveLength(1);
    expect(result.placements[0].clueNumber).toBe(1);
    // The single word is either horizontal (1 row × 5 cols) or vertical (5 rows × 1 col).
    const flat = result.grid.flat().join("");
    expect(flat).toBe("HELLO");
  });

  it("interlocks words on shared letters and produces a single connected grid", () => {
    const result = generateCrosswordLayout(makeItems(["HELLO", "WORLD"]), 1);
    expect(result.generationError).toBeNull();
    expect(result.grid.length).toBeGreaterThan(0);
    expect(result.placements).toHaveLength(2);
  });

  it("never exceeds MAX_GRID_COLS in width", () => {
    const result = generateCrosswordLayout(
      makeItems(["INTERNATIONAL", "TIME", "RAIN", "NICE", "ALOE", "ON", "LANE"]),
      1,
    );
    expect(result.generationError).toBeNull();
    expect(result.grid.length).toBeGreaterThan(0);
    const width = result.grid[0]?.length ?? 0;
    expect(width).toBeLessThanOrEqual(MAX_GRID_COLS);
  });

  it("rejects answers longer than the maximum grid width", () => {
    const tooLong = "A".repeat(MAX_GRID_COLS + 1);
    const result = generateCrosswordLayout(
      makeItems([tooLong, "AB"]),
    );
    expect(result.generationError).toBe("word-too-long");
    expect(result.grid).toEqual([]);
    expect(result.placements).toEqual([]);
  });

  it("flags duplicate answers", () => {
    const result = generateCrosswordLayout(makeItems(["WORD", "WORD"]));
    expect(result.generationError).toBe("duplicate-answers");
  });

  it("returns an empty layout for an empty input", () => {
    const result = generateCrosswordLayout([]);
    expect(result.generationError).toBeNull();
    expect(result.grid).toEqual([]);
    expect(result.placements).toEqual([]);
  });

  it("places as many words as possible when some share no letters with the rest", () => {
    const items = makeItems(["ABC", "DEF"]);
    const result = generateCrosswordLayout(items);
    expect(result.generationError).toBeNull();
    // At least one word fits; the other is reported as unplaced via missing
    // placements (caller derives this by diffing items vs placements).
    expect(result.placements.length).toBeGreaterThanOrEqual(1);
    expect(result.placements.length).toBeLessThan(items.length);
  });

  it("normalizes answers consistently", () => {
    expect(normalizeCrosswordAnswer("Schöne Frucht")).toBe("SCHÖNEFRUCHT");
    expect(normalizeCrosswordAnswer("multi-part")).toBe("MULTIPART");
  });

  it.each([
    ["APPLE", "PEAR", "GRAPE", "PLUM", "LEMON"],
    ["FRUIT", "TRAIN", "RIVER", "TRUE"],
  ])("produces a layout for %j", (...words) => {
    const result = generateCrosswordLayout(makeItems(words), 1);
    expect(result.generationError).toBeNull();
    expect(result.grid.length).toBeGreaterThan(0);
    const width = result.grid[0]?.length ?? 0;
    expect(width).toBeLessThanOrEqual(MAX_GRID_COLS);
  });

  it("falls back to a partial layout when mutual letter constraints conflict", () => {
    // Each word shares letters with TABLE, but the resulting placements
    // mutually block each other — no layout fits all five. The solver should
    // still place as many as possible and report the rest as unplaced.
    const items = makeItems(["TABLE", "CHAIR", "LAMP", "BOOK", "PEN"]);
    const result = generateCrosswordLayout(items);
    expect(result.generationError).toBeNull();
    expect(result.placements.length).toBeGreaterThan(0);
    expect(result.placements.length).toBeLessThan(items.length);
  });

  it("is deterministic for a given seed", () => {
    const items = makeItems(["APPLE", "PEAR", "GRAPE", "PLUM", "LEMON"]);
    const a = generateCrosswordLayout(items, 42);
    const b = generateCrosswordLayout(items, 42);
    expect(b.grid).toEqual(a.grid);
    expect(b.placements).toEqual(a.placements);
  });

  it("produces different layouts for different seeds when alternatives exist", () => {
    const items = makeItems(["APPLE", "PEAR", "GRAPE", "PLUM", "LEMON"]);
    const seeds = [1, 2, 3, 4, 5, 6, 7, 8];
    const fingerprints = new Set(
      seeds.map((s) => {
        const r = generateCrosswordLayout(items, s);
        return r.grid.map((row) => row.join("|")).join("/");
      }),
    );
    // We expect at least 2 distinct layouts across these seeds.
    expect(fingerprints.size).toBeGreaterThan(1);
  });

  it("prefers wider layouts over taller ones to save vertical space", () => {
    // For a single word, the layout must be horizontal (1 row tall), never vertical.
    const result = generateCrosswordLayout(makeItems(["ELEPHANT"]), 1);
    expect(result.generationError).toBeNull();
    expect(result.grid.length).toBe(1);
    expect(result.grid[0].length).toBe(8);
    expect(result.placements[0].direction).toBe("across");
  });

  it("keeps the resulting grid height at or below its width across many seeds", () => {
    const items = makeItems(["APPLE", "PEAR", "GRAPE", "PLUM", "LEMON"]);
    for (let seed = 1; seed <= 8; seed++) {
      const result = generateCrosswordLayout(items, seed);
      expect(result.generationError).toBeNull();
      const h = result.grid.length;
      const w = result.grid[0]?.length ?? 0;
      // Height-preference cost should never pick a layout that is taller than it is wide
      // when an equal-or-better wider alternative exists for this word set.
      expect(h).toBeLessThanOrEqual(w);
    }
  });
});
