import { applyChOverrides, replaceEszett } from "@/lib/locale-utils";
import type { ChOverrides, WorksheetBlock, WorksheetSettings } from "@/types/worksheet";

type LocalePayload = {
  title: string;
  blocks: WorksheetBlock[];
  settings: WorksheetSettings;
};

type MigrationResult = LocalePayload & {
  migrated: boolean;
};

type StringMap = Record<string, string>;

type BlockMap = Map<string, WorksheetBlock>;

function getByPath(data: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, part) => {
    if (acc === null || acc === undefined) return undefined;
    const asRecord = acc as Record<string, unknown>;
    return asRecord[part];
  }, data);
}

function setByPath<T>(data: T, path: string, value: string): T {
  const parts = path.split(".");
  const root = Array.isArray(data) ? [...(data as unknown as unknown[])] : { ...(data as unknown as Record<string, unknown>) };
  let cursor: Record<string, unknown> | unknown[] = root;

  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i];
    const next = (cursor as Record<string, unknown>)[part];
    let cloned: unknown;

    if (Array.isArray(next)) {
      cloned = [...next];
    } else if (next && typeof next === "object") {
      cloned = { ...(next as Record<string, unknown>) };
    } else {
      const nextPart = parts[i + 1];
      cloned = /^\d+$/.test(nextPart) ? [] : {};
    }

    (cursor as Record<string, unknown>)[part] = cloned;
    cursor = cloned as Record<string, unknown> | unknown[];
  }

  (cursor as Record<string, unknown>)[parts[parts.length - 1]] = value;
  return root as T;
}

function flattenBlocksById(blocks: WorksheetBlock[]): BlockMap {
  const map: BlockMap = new Map();

  const walk = (items: WorksheetBlock[]) => {
    for (const block of items) {
      map.set(block.id, block);

      if (block.type === "columns") {
        for (const col of block.children) walk(col);
      }
      if (block.type === "accordion") {
        for (const item of block.items) walk(item.children);
      }
      if (block.type === "grid") {
        for (const cell of block.children) walk(cell);
      }
    }
  };

  walk(blocks);
  return map;
}

function collectStringDiffs(
  baseValue: unknown,
  oldValue: unknown,
  path: string,
  out: StringMap,
): void {
  if (typeof baseValue === "string" && typeof oldValue === "string") {
    if (baseValue !== oldValue && path !== "id") {
      out[path] = oldValue;
    }
    return;
  }

  if (Array.isArray(baseValue) && Array.isArray(oldValue)) {
    const len = Math.min(baseValue.length, oldValue.length);
    for (let i = 0; i < len; i += 1) {
      const nextPath = path ? `${path}.${i}` : `${i}`;
      collectStringDiffs(baseValue[i], oldValue[i], nextPath, out);
    }
    return;
  }

  if (
    baseValue &&
    oldValue &&
    typeof baseValue === "object" &&
    typeof oldValue === "object" &&
    !Array.isArray(baseValue) &&
    !Array.isArray(oldValue)
  ) {
    const keys = new Set([
      ...Object.keys(baseValue as Record<string, unknown>),
      ...Object.keys(oldValue as Record<string, unknown>),
    ]);
    for (const key of keys) {
      const nextPath = path ? `${path}.${key}` : key;
      collectStringDiffs(
        (baseValue as Record<string, unknown>)[key],
        (oldValue as Record<string, unknown>)[key],
        nextPath,
        out,
      );
    }
  }
}

function compactOverrides(overrides: ChOverrides): ChOverrides | undefined {
  const cleaned: ChOverrides = {};
  for (const [blockId, fields] of Object.entries(overrides)) {
    const entries = Object.entries(fields).filter(([, value]) => value !== "");
    if (entries.length > 0) {
      cleaned[blockId] = Object.fromEntries(entries);
    }
  }
  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}

function looksAlreadyMigrated(
  title: string,
  blocks: WorksheetBlock[],
  chOverrides?: ChOverrides,
): boolean {
  if (!chOverrides) return false;

  const blockMap = flattenBlocksById(blocks);
  let deSignals = 0;
  let legacySignals = 0;

  const titleOverride = chOverrides._worksheet?.title;
  if (typeof titleOverride === "string") {
    if (title.includes("ss") && titleOverride.includes("ß")) deSignals += 1;
    if (title.includes("ß") && titleOverride.includes("ss")) legacySignals += 1;
  }

  for (const [blockId, fields] of Object.entries(chOverrides)) {
    if (blockId === "_worksheet") continue;
    const block = blockMap.get(blockId);
    if (!block) continue;

    for (const [path, override] of Object.entries(fields)) {
      if (typeof override !== "string") continue;
      const base = getByPath(block, path);
      if (typeof base !== "string") continue;

      if (base.includes("ss") && override.includes("ß")) deSignals += 1;
      if (base.includes("ß") && override.includes("ss")) legacySignals += 1;
    }
  }

  return deSignals > 0 && deSignals >= legacySignals;
}

function buildDeOverrides(
  chBaseBlocks: WorksheetBlock[],
  oldBaseBlocks: WorksheetBlock[],
  oldTitle: string,
  newTitle: string,
): ChOverrides | undefined {
  const overrides: ChOverrides = {};
  const chById = flattenBlocksById(chBaseBlocks);
  const oldById = flattenBlocksById(oldBaseBlocks);

  for (const [id, chBlock] of chById.entries()) {
    const oldBlock = oldById.get(id);
    if (!oldBlock) continue;

    const fieldDiffs: StringMap = {};
    collectStringDiffs(chBlock, oldBlock, "", fieldDiffs);
    if (Object.keys(fieldDiffs).length > 0) {
      overrides[id] = fieldDiffs;
    }
  }

  if (newTitle !== oldTitle) {
    overrides._worksheet = {
      ...(overrides._worksheet || {}),
      title: oldTitle,
    };
  }

  return compactOverrides(overrides);
}

/**
 * Migrates legacy worksheet locale data (DE base + CH overrides) to
 * CH base + DE overrides. Idempotent when settings.localeDataVersion === 2.
 */
export function migrateWorksheetLocaleDataToV2(input: LocalePayload): MigrationResult {
  const settings = input.settings || ({} as WorksheetSettings);

  if (settings.localeDataVersion === 2) {
    return {
      title: input.title,
      blocks: input.blocks,
      settings,
      migrated: false,
    };
  }

  if (looksAlreadyMigrated(input.title, input.blocks, settings.chOverrides)) {
    return {
      title: input.title,
      blocks: input.blocks,
      settings: {
        ...settings,
        localeDataVersion: 2,
      },
      migrated: true,
    };
  }

  const legacyOverrides = settings.chOverrides;
  const baseTitle = input.title;
  const chTitle = legacyOverrides?._worksheet?.title ?? replaceEszett(baseTitle);

  let chBaseBlocks = replaceEszett(input.blocks);
  if (legacyOverrides) {
    chBaseBlocks = applyChOverrides(chBaseBlocks, legacyOverrides);
  }

  const deOverrides = buildDeOverrides(chBaseBlocks, input.blocks, baseTitle, chTitle);

  return {
    title: chTitle,
    blocks: chBaseBlocks,
    settings: {
      ...settings,
      localeDataVersion: 2,
      chOverrides: deOverrides,
    },
    migrated: true,
  };
}

export function resolveWorksheetLocaleContent(
  title: string,
  blocks: WorksheetBlock[],
  settings: WorksheetSettings,
  localeMode: "CH" | "DE",
): { title: string; blocks: WorksheetBlock[] } {
  if (localeMode === "CH") {
    return { title, blocks };
  }

  const overrides = settings.chOverrides;
  if (!overrides) {
    return { title, blocks };
  }

  const deTitle = overrides._worksheet?.title ?? title;
  let deBlocks = blocks;

  for (const [blockId, fields] of Object.entries(overrides)) {
    if (blockId === "_worksheet") continue;
    const fieldEntries = Object.entries(fields);
    if (fieldEntries.length === 0) continue;

    deBlocks = deBlocks.map((block) => {
      if (block.id !== blockId) return block;
      let updated = block as WorksheetBlock;
      for (const [fieldPath, value] of fieldEntries) {
        updated = setByPath(updated, fieldPath, value) as WorksheetBlock;
      }
      return updated;
    });
  }

  return { title: deTitle, blocks: deBlocks };
}
