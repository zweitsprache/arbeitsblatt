import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const DEFAULT_SETTINGS = {
  pageSize: "a4",
  orientation: "portrait",
  margins: { top: 20, right: 20, bottom: 113, left: 20 },
  showHeader: true,
  showFooter: true,
  headerText: "",
  footerText: "",
  fontSize: 12.5,
  fontFamily: "Asap Condensed, sans-serif",
  brand: "edoomio",
  brandSettings: {
    logo: "/logo/arbeitsblatt_logo_full_brand.svg",
    organization: "",
    teacher: "",
    headerRight: "",
    footerLeft: "",
    footerCenter: "",
    footerRight: "",
  },
  coverSubtitle: "Arbeitsblatt",
  coverInfoText: "",
  coverImages: [],
  coverImageBorder: false,
  translationLanguages: [],
};

function usage() {
  console.log(`Usage:
  node scripts/import-worksheet-backup.mjs <file.json> [--update] [--dry-run] [--user-id <id>]

Accepted input formats:
  - backup export: { worksheetId, title, updatedAt, blocks }
  - full worksheet: { id, title, description, slug, blocks, settings, published }

Flags:
  --update   Update an existing worksheet when the incoming id already exists
  --dry-run  Validate and print the normalized payload without writing to the DB
  --user-id  Assign the worksheet to a specific user so it appears in the editor/library
`);
}

function readFlagValue(args, flag) {
  const exact = `${flag}=`;
  const inline = args.find((arg) => arg.startsWith(exact));
  if (inline) return inline.slice(exact.length);

  const index = args.indexOf(flag);
  if (index === -1) return undefined;
  const next = args[index + 1];
  if (!next || next.startsWith("--")) {
    throw new Error(`${flag} requires a value.`);
  }
  return next;
}

function slugify(input) {
  return String(input)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-") || "worksheet";
}

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cloneDefaultSettings() {
  return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
}

function normalizeWorksheetPayload(raw) {
  if (!isObject(raw)) {
    throw new Error("Top-level JSON value must be an object.");
  }

  if (Array.isArray(raw.blocks) && typeof raw.title === "string" && typeof raw.worksheetId === "string") {
    return {
      id: raw.worksheetId,
      title: raw.title,
      description: null,
      slug: slugify(raw.title),
      blocks: raw.blocks,
      settings: cloneDefaultSettings(),
      published: false,
    };
  }

  if (Array.isArray(raw.blocks) && typeof raw.title === "string" && typeof raw.id === "string") {
    return {
      id: raw.id,
      title: raw.title,
      description: raw.description ?? null,
      slug: typeof raw.slug === "string" && raw.slug.trim() ? raw.slug.trim() : slugify(raw.title),
      blocks: raw.blocks,
      settings: isObject(raw.settings) ? raw.settings : cloneDefaultSettings(),
      published: Boolean(raw.published),
    };
  }

  throw new Error("Unsupported worksheet JSON shape.");
}

async function ensureUniqueSlug(prisma, desiredSlug, excludeId) {
  let slug = desiredSlug;
  let suffix = 2;

  while (true) {
    const existing = await prisma.worksheet.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!existing || existing.id === excludeId) {
      return slug;
    }

    slug = `${desiredSlug}-${suffix}`;
    suffix += 1;
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    usage();
    process.exit(args.length === 0 ? 1 : 0);
  }

  const fileArg = args.find((arg) => !arg.startsWith("--"));
  if (!fileArg) {
    usage();
    process.exit(1);
  }

  const updateExisting = args.includes("--update");
  const dryRun = args.includes("--dry-run");
  const userId = readFlagValue(args, "--user-id")?.trim() || null;
  const filePath = path.resolve(process.cwd(), fileArg);
  const rawText = await readFile(filePath, "utf8");
  const parsed = JSON.parse(rawText);
  const normalized = normalizeWorksheetPayload(parsed);

  if (!Array.isArray(normalized.blocks)) {
    throw new Error("`blocks` must be an array.");
  }

  if (!process.env.DATABASE_URL && !dryRun) {
    throw new Error("DATABASE_URL is not set.");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const existing = normalized.id
      ? await prisma.worksheet.findUnique({
          where: { id: normalized.id },
          select: { id: true, slug: true, title: true },
        })
      : null;

    const slug = await ensureUniqueSlug(prisma, normalized.slug, existing?.id);
    const payload = {
      type: "worksheet",
      title: normalized.title,
      description: normalized.description,
      slug,
      blocks: normalized.blocks,
      settings: normalized.settings,
      published: normalized.published,
      userId,
    };

    if (dryRun) {
      console.log(JSON.stringify({ mode: existing ? "update" : "create", id: normalized.id, ...payload }, null, 2));
      return;
    }

    if (existing) {
      if (!updateExisting) {
        throw new Error(
          `Worksheet with id ${normalized.id} already exists (${existing.title}). Re-run with --update to overwrite it.`
        );
      }

      const updated = await prisma.worksheet.update({
        where: { id: normalized.id },
        data: payload,
        select: { id: true, slug: true, title: true, updatedAt: true },
      });

      console.log(`Updated worksheet ${updated.id} (${updated.slug})`);
      return;
    }

    const created = await prisma.worksheet.create({
      data: normalized.id ? { id: normalized.id, ...payload } : payload,
      select: { id: true, slug: true, title: true, updatedAt: true },
    });

    console.log(`Created worksheet ${created.id} (${created.slug})`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});