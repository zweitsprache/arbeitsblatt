import type { WorksheetBlock, ChOverrides } from "@/types/worksheet";

// ─── Dot-path helpers ───────────────────────────────────────

/** Get a nested value by dot-separated path, e.g. "options.1.text" */
export function getByPath(obj: unknown, path: string): unknown {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

/** Set a nested value by dot-separated path (immutably – returns new root) */
export function setByPath<T>(obj: T, path: string, value: unknown): T {
  const parts = path.split(".");
  if (parts.length === 0) return obj;

  function recurse(cur: unknown, i: number): unknown {
    const key = parts[i];
    if (i === parts.length - 1) {
      if (Array.isArray(cur)) {
        const arr = [...cur];
        arr[Number(key)] = value;
        return arr;
      }
      return { ...(cur as Record<string, unknown>), [key]: value };
    }
    const next = (cur as Record<string, unknown>)?.[key];
    const updated = recurse(next, i + 1);
    if (Array.isArray(cur)) {
      const arr = [...cur];
      arr[Number(key)] = updated;
      return arr;
    }
    return { ...(cur as Record<string, unknown>), [key]: updated };
  }

  return recurse(obj, 0) as T;
}

// ─── ß → ss replacement (client-side mirror) ───────────────

/** Replace every ß with ss in any string value, recursively */
export function replaceEszett<T>(data: T): T {
  if (typeof data === "string") return data.replace(/ß/g, "ss") as unknown as T;
  if (Array.isArray(data)) return data.map(replaceEszett) as unknown as T;
  if (data && typeof data === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = replaceEszett(value);
    }
    return result as T;
  }
  return data;
}

// ─── Apply CH overrides to blocks ───────────────────────────

/**
 * Apply manual CH overrides on top of (already ß→ss-replaced) blocks.
 * Returns a new array with overridden field values applied.
 */
export function applyChOverrides(
  blocks: WorksheetBlock[],
  overrides: ChOverrides,
): WorksheetBlock[] {
  return blocks.map((block) => {
    // Handle columns recursively
    if (block.type === "columns") {
      return {
        ...block,
        children: block.children.map((col) => applyChOverrides(col, overrides)),
      } as WorksheetBlock;
    }

    const blockOverrides = overrides[block.id];
    if (!blockOverrides || Object.keys(blockOverrides).length === 0) return block;

    let updated: WorksheetBlock = block;
    for (const [fieldPath, value] of Object.entries(blockOverrides)) {
      updated = setByPath(updated, fieldPath, value) as WorksheetBlock;
    }
    return updated;
  });
}

// ─── Resolve effective field value for editor display ───────

/**
 * Get the effective text for a field in a given locale mode.
 * - DE mode: returns the base value
 * - CH mode: returns the manual override if set, otherwise replaceEszett(base)
 */
export function getEffectiveValue(
  baseValue: string,
  blockId: string,
  fieldPath: string,
  localeMode: "DE" | "CH",
  chOverrides?: ChOverrides,
): string {
  if (localeMode === "DE") return baseValue;

  // CH mode: check for manual override first
  const override = chOverrides?.[blockId]?.[fieldPath];
  if (override !== undefined) return override;

  // Fall back to automatic ß → ss
  return replaceEszett(baseValue);
}

/**
 * Check whether a field has a manual CH override set.
 */
export function hasChOverride(
  blockId: string,
  fieldPath: string,
  chOverrides?: ChOverrides,
): boolean {
  return chOverrides?.[blockId]?.[fieldPath] !== undefined;
}

/**
 * Count the total number of CH overrides across all blocks.
 */
export function countChOverrides(chOverrides?: ChOverrides): number {
  if (!chOverrides) return 0;
  let count = 0;
  for (const blockOverrides of Object.values(chOverrides)) {
    count += Object.keys(blockOverrides).length;
  }
  return count;
}
