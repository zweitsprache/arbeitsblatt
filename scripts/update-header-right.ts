import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const oldValue = "10 Religion und Tradition<br>Glücksbringer";
  const newValue = "10 Religion und Tradition<br>Glück und Unglück";

  // Find all worksheets and filter manually
  const allWorksheets = await prisma.worksheet.findMany();
  
  // Debug: print all headerRight values
  console.log("All headerRight values:");
  for (const ws of allWorksheets) {
    const settings = ws.settings as Record<string, unknown>;
    const brandSettings = settings?.brandSettings as Record<string, unknown> | undefined;
    if (brandSettings?.headerRight) {
      console.log(`  "${brandSettings.headerRight}" - ${ws.title}`);
    }
  }
  
  const worksheetsToUpdate = allWorksheets.filter((ws) => {
    const settings = ws.settings as Record<string, unknown>;
    const brandSettings = settings?.brandSettings as Record<string, unknown> | undefined;
    return brandSettings?.headerRight === oldValue;
  });

  console.log(`\nFound ${worksheetsToUpdate.length} worksheets to update`);

  for (const worksheet of worksheetsToUpdate) {
    const settings = worksheet.settings as Record<string, unknown>;
    const brandSettings = settings.brandSettings as Record<string, unknown>;
    
    const updatedSettings = {
      ...settings,
      brandSettings: {
        ...brandSettings,
        headerRight: newValue,
      },
    };

    await prisma.worksheet.update({
      where: { id: worksheet.id },
      data: { settings: updatedSettings },
    });

    console.log(`Updated worksheet: ${worksheet.title} (${worksheet.id})`);
  }

  console.log("Done!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
