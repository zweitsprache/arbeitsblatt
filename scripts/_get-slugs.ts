import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const rows = await prisma.worksheet.findMany({
    orderBy: { updatedAt: "desc" },
    take: 3,
    select: { id: true, type: true, slug: true },
    where: { type: { in: ["worksheet", "cards"] } }
  });
  for (const r of rows) {
    console.log(`type=${r.type} slug=${r.slug} id=${r.id}`);
  }
}

main().catch(console.error).finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
