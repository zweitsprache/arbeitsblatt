import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Get userId from command line argument
const adminUserId = process.argv[2];

if (!adminUserId) {
  console.error("Usage: npx tsx scripts/assign-worksheets-to-admin.ts <userId>");
  console.error("");
  console.error("To get your userId, inspect the network request to /api/worksheets");
  console.error("or check the session in your browser's dev tools.");
  process.exit(1);
}

async function main() {
  console.log(`Assigning null-userId items to user: ${adminUserId}`);

  // First, let's see what worksheets exist
  const allWorksheets = await prisma.worksheet.findMany({
    select: { id: true, title: true, userId: true, type: true, folderId: true }
  });
  console.log("All worksheets:", JSON.stringify(allWorksheets, null, 2));

  // Update worksheets with null userId
  const worksheetsResult = await prisma.worksheet.updateMany({
    where: { userId: null },
    data: { userId: adminUserId },
  });
  console.log(`Updated ${worksheetsResult.count} worksheets`);

  // Update folders with null userId
  const foldersResult = await prisma.folder.updateMany({
    where: { userId: null },
    data: { userId: adminUserId },
  });
  console.log(`Updated ${foldersResult.count} folders`);

  // Update ebooks with null userId
  const ebooksResult = await prisma.eBook.updateMany({
    where: { userId: null },
    data: { userId: adminUserId },
  });
  console.log(`Updated ${ebooksResult.count} ebooks`);

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
