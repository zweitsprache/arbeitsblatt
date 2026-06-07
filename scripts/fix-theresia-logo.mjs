// Fix theresia-banz worksheets whose stored brandSettings.logo was polluted with
// edoomio's logo. Sets it to the correct theresia-banz logo.
// Dry-run by default; pass --apply to write.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const apply = process.argv.includes("--apply");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const WRONG = "/logo/arbeitsblatt_logo_full_brand.svg";
const RIGHT = "/logo/theresia_banz.svg";

try {
  const rows = await prisma.worksheet.findMany({ select: { id: true, title: true, settings: true } });
  const targets = rows.filter(
    (r) => r.settings?.brand === "theresia-banz" && r.settings?.brandSettings?.logo === WRONG,
  );

  console.log(`theresia-banz worksheets with wrong logo: ${targets.length}`);
  for (const r of targets) console.log(` - ${r.id}  ${r.title?.slice(0, 40)}`);

  if (!apply) {
    console.log("\nDRY RUN — re-run with --apply to write.");
  } else {
    let updated = 0;
    for (const r of targets) {
      const next = { ...r.settings, brandSettings: { ...r.settings.brandSettings, logo: RIGHT } };
      await prisma.worksheet.update({ where: { id: r.id }, data: { settings: next } });
      updated += 1;
    }
    console.log(`\nAPPLIED — updated ${updated} worksheet(s).`);
  }
} finally {
  await prisma.$disconnect();
  await pool.end();
}
