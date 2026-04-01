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
    take: 6,
    select: { id: true, title: true, type: true, updatedAt: true, blocks: true },
  });

  for (const r of rows) {
    const blocks = r.blocks as unknown[];
    console.log("---");
    console.log("id:        ", r.id);
    console.log("title:     ", r.title);
    console.log("type:      ", r.type);
    console.log("updatedAt: ", r.updatedAt);
    console.log("blocks:    ", Array.isArray(blocks) ? blocks.length : "N/A");
    if (Array.isArray(blocks) && blocks.length > 0) {
      const first = blocks[0] as Record<string, unknown>;
      const last = blocks[blocks.length - 1] as Record<string, unknown>;
      console.log("first block: id=%s type=%s", first.id, first.type);
      console.log("last block:  id=%s type=%s", last.id, last.type);
    }
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
