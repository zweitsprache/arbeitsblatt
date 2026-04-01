import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const rows = await prisma.worksheet.findMany({
    where: { type: { in: ["flashcards", "cards", "grammar-table"] } },
    select: { id: true, title: true, type: true, settings: true },
  });

  console.log(`Found ${rows.length} non-worksheet records to check`);

  for (const r of rows) {
    const settings = r.settings as Record<string, unknown>;
    if (settings.fontSize === 12.5) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { fontSize: _, ...rest } = settings;
      await prisma.worksheet.update({ where: { id: r.id }, data: { settings: rest as object } });
      console.log(`  Reverted: "${r.title}" (${r.type})`);
    } else {
      console.log(`  Skipped (fontSize=${settings.fontSize ?? "none"}): "${r.title}" (${r.type})`);
    }
  }

  console.log("Done");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
