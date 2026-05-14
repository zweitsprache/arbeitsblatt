#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 5_000,
});

const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

function replaceEszett(data) {
  if (typeof data === "string") return data.replace(/ß/g, "ss");
  if (Array.isArray(data)) return data.map(replaceEszett);
  if (data && typeof data === "object") {
    const out = {};
    for (const [k, v] of Object.entries(data)) out[k] = replaceEszett(v);
    return out;
  }
  return data;
}

function getByPath(data, pathStr) {
  return pathStr.split(".").reduce((acc, part) => {
    if (acc === null || acc === undefined) return undefined;
    return acc[part];
  }, data);
}

function setByPath(data, pathStr, value) {
  const parts = pathStr.split(".");
  const root = Array.isArray(data) ? [...data] : { ...data };
  let cursor = root;

  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i];
    const next = cursor[part];
    let cloned;

    if (Array.isArray(next)) cloned = [...next];
    else if (next && typeof next === "object") cloned = { ...next };
    else cloned = /^\d+$/.test(parts[i + 1]) ? [] : {};

    cursor[part] = cloned;
    cursor = cloned;
  }

  cursor[parts[parts.length - 1]] = value;
  return root;
}

function flattenBlocksById(blocks) {
  const map = new Map();

  const walk = (items) => {
    for (const block of items) {
      map.set(block.id, block);
      if (block.type === "columns") for (const col of block.children || []) walk(col);
      if (block.type === "accordion") for (const item of block.items || []) walk(item.children || []);
      if (block.type === "grid") for (const cell of block.children || []) walk(cell);
    }
  };

  walk(Array.isArray(blocks) ? blocks : []);
  return map;
}

function applyOverridesToBlocks(blocks, overrides) {
  if (!overrides) return blocks;
  const byId = flattenBlocksById(blocks);
  let nextBlocks = blocks;

  for (const [blockId, fields] of Object.entries(overrides)) {
    if (blockId === "_worksheet") continue;
    const target = byId.get(blockId);
    if (!target) continue;

    let updated = target;
    for (const [fieldPath, value] of Object.entries(fields)) {
      updated = setByPath(updated, fieldPath, value);
    }

    const replaceInTree = (items) =>
      items.map((b) => {
        if (b.id === blockId) return updated;
        if (b.type === "columns") return { ...b, children: (b.children || []).map((col) => replaceInTree(col)) };
        if (b.type === "accordion") {
          return {
            ...b,
            items: (b.items || []).map((item) => ({ ...item, children: replaceInTree(item.children || []) })),
          };
        }
        if (b.type === "grid") return { ...b, children: (b.children || []).map((cell) => replaceInTree(cell)) };
        return b;
      });

    nextBlocks = replaceInTree(nextBlocks);
  }

  return nextBlocks;
}

function collectStringDiffs(baseValue, oldValue, pathStr, out) {
  if (typeof baseValue === "string" && typeof oldValue === "string") {
    if (baseValue !== oldValue && pathStr !== "id") out[pathStr] = oldValue;
    return;
  }

  if (Array.isArray(baseValue) && Array.isArray(oldValue)) {
    const len = Math.min(baseValue.length, oldValue.length);
    for (let i = 0; i < len; i += 1) {
      const next = pathStr ? `${pathStr}.${i}` : `${i}`;
      collectStringDiffs(baseValue[i], oldValue[i], next, out);
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
    const keys = new Set([...Object.keys(baseValue), ...Object.keys(oldValue)]);
    for (const key of keys) {
      const next = pathStr ? `${pathStr}.${key}` : key;
      collectStringDiffs(baseValue[key], oldValue[key], next, out);
    }
  }
}

function compactOverrides(overrides) {
  const cleaned = {};
  for (const [blockId, fields] of Object.entries(overrides)) {
    const entries = Object.entries(fields).filter(([, v]) => v !== "");
    if (entries.length > 0) cleaned[blockId] = Object.fromEntries(entries);
  }
  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}

function looksAlreadyMigrated(title, blocks, chOverrides) {
  if (!chOverrides) return false;
  const byId = flattenBlocksById(blocks);
  let deSignals = 0;
  let legacySignals = 0;

  const t = chOverrides._worksheet?.title;
  if (typeof t === "string") {
    if (title.includes("ss") && t.includes("ß")) deSignals += 1;
    if (title.includes("ß") && t.includes("ss")) legacySignals += 1;
  }

  for (const [blockId, fields] of Object.entries(chOverrides)) {
    if (blockId === "_worksheet") continue;
    const block = byId.get(blockId);
    if (!block) continue;
    for (const [fieldPath, override] of Object.entries(fields)) {
      if (typeof override !== "string") continue;
      const base = getByPath(block, fieldPath);
      if (typeof base !== "string") continue;
      if (base.includes("ss") && override.includes("ß")) deSignals += 1;
      if (base.includes("ß") && override.includes("ss")) legacySignals += 1;
    }
  }

  return deSignals > 0 && deSignals >= legacySignals;
}

function buildDeOverrides(chBaseBlocks, oldBaseBlocks, oldTitle, newTitle) {
  const overrides = {};
  const chById = flattenBlocksById(chBaseBlocks);
  const oldById = flattenBlocksById(oldBaseBlocks);

  for (const [id, chBlock] of chById.entries()) {
    const oldBlock = oldById.get(id);
    if (!oldBlock) continue;
    const diffs = {};
    collectStringDiffs(chBlock, oldBlock, "", diffs);
    if (Object.keys(diffs).length > 0) overrides[id] = diffs;
  }

  if (newTitle !== oldTitle) {
    overrides._worksheet = { ...(overrides._worksheet || {}), title: oldTitle };
  }

  return compactOverrides(overrides);
}

function migrateWorksheetRow(row) {
  const settings = (row.settings && typeof row.settings === "object") ? { ...row.settings } : {};
  const blocks = Array.isArray(row.blocks) ? row.blocks : [];
  const title = typeof row.title === "string" ? row.title : "";

  if (settings.localeDataVersion === 2) {
    return { migrated: false, title, blocks, settings };
  }

  if (looksAlreadyMigrated(title, blocks, settings.chOverrides)) {
    return {
      migrated: true,
      title,
      blocks,
      settings: {
        ...settings,
        localeDataVersion: 2,
      },
    };
  }

  const legacyOverrides = settings.chOverrides;
  const chTitle = legacyOverrides?._worksheet?.title ?? replaceEszett(title);
  const chBaseBlocks = applyOverridesToBlocks(replaceEszett(blocks), legacyOverrides);
  const deOverrides = buildDeOverrides(chBaseBlocks, blocks, title, chTitle);

  return {
    migrated: true,
    title: chTitle,
    blocks: chBaseBlocks,
    settings: {
      ...settings,
      localeDataVersion: 2,
      chOverrides: deOverrides,
    },
  };
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const apply = args.has("--apply");

  const worksheets = await prisma.worksheet.findMany({
    where: { type: "worksheet" },
    select: {
      id: true,
      title: true,
      blocks: true,
      settings: true,
      updatedAt: true,
    },
  });

  let migratedCount = 0;
  const updates = [];

  for (const row of worksheets) {
    const migrated = migrateWorksheetRow(row);
    const changed =
      migrated.migrated && (
        migrated.title !== row.title ||
        JSON.stringify(migrated.blocks) !== JSON.stringify(row.blocks) ||
        JSON.stringify(migrated.settings) !== JSON.stringify(row.settings)
      );

    if (changed) {
      migratedCount += 1;
      updates.push({
        id: row.id,
        before: {
          title: row.title,
          blocks: row.blocks,
          settings: row.settings,
          updatedAt: row.updatedAt,
        },
        after: {
          title: migrated.title,
          blocks: migrated.blocks,
          settings: migrated.settings,
        },
      });
    }
  }

  if (!apply) {
    console.log(`[dry-run] Worksheet rows scanned: ${worksheets.length}`);
    console.log(`[dry-run] Worksheet rows to migrate: ${migratedCount}`);
    process.exit(0);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(process.cwd(), "tmp", "migrations");
  await fs.mkdir(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, `worksheet-locale-v2-backup-${stamp}.json`);
  await fs.writeFile(backupPath, JSON.stringify({ createdAt: new Date().toISOString(), rows: updates }, null, 2), "utf8");

  for (const update of updates) {
    await prisma.worksheet.update({
      where: { id: update.id },
      data: {
        title: update.after.title,
        blocks: update.after.blocks,
        settings: update.after.settings,
      },
    });
  }

  console.log(`[apply] Worksheet rows scanned: ${worksheets.length}`);
  console.log(`[apply] Worksheet rows migrated: ${updates.length}`);
  console.log(`[apply] Backup written to: ${backupPath}`);
}

main()
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
    await prisma.$disconnect();
  });
