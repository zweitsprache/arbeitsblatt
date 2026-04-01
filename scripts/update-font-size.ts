import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const NEW_FONT_SIZE = 12.5;

async function main() {
  const allWorksheets = await prisma.worksheet.findMany({
    select: { id: true, title: true, settings: true, type: true },
    where: { type: "worksheet" },
  });

  console.log(`Found ${allWorksheets.length} worksheets total`);

  let updated = 0;
  let skipped = 0;

  for (const ws of allWorksheets) {
    const settings = ws.settings as Record<string, unknown>;
    const currentFontSize = settings?.fontSize;

    if (currentFontSize === NEW_FONT_SIZE) {
      skipped++;
      continue;
    }

    await prisma.worksheet.update({
      where: { id: ws.id },
      data: {
        settings: {
          ...settings,
          fontSize: NEW_FONT_SIZE,
        },
      },
    });

    console.log(`  Updated "${ws.title}" — ${currentFontSize ?? "(no fontSize)"} → ${NEW_FONT_SIZE}`);
    updated++;
  }

  console.log(`\nDone. Updated: ${updated}, already at ${NEW_FONT_SIZE}: ${skipped}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
