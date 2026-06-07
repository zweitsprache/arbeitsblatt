// One-off migration: update stored worksheet settings.margins.bottom 113 -> 95.
// Dry-run by default; pass --apply to write changes.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const apply = process.argv.includes("--apply");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const OLD = 113;
const NEW = 95;

try {
  const rows = await prisma.worksheet.findMany({ select: { id: true, title: true, settings: true } });
  const targets = rows.filter((r) => {
    const m = r.settings && typeof r.settings === "object" ? r.settings.margins : undefined;
    return m && m.bottom === OLD;
  });

  console.log(`Total worksheets: ${rows.length}`);
  console.log(`With margins.bottom === ${OLD}: ${targets.length}`);

  if (!apply) {
    console.log("\nDRY RUN — no changes written. Re-run with --apply to migrate.");
  } else {
    let updated = 0;
    for (const r of targets) {
      const next = { ...r.settings, margins: { ...r.settings.margins, bottom: NEW } };
      await prisma.worksheet.update({ where: { id: r.id }, data: { settings: next } });
      updated += 1;
    }
    console.log(`\nAPPLIED — updated ${updated} worksheet(s): margins.bottom ${OLD} -> ${NEW}.`);
  }
} finally {
  await prisma.$disconnect();
  await pool.end();
}
