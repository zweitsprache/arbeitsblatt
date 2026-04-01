import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const r = await prisma.worksheet.findUnique({
    where: { id: "cmnfsc3hb0000ob03f4rg8rzt" },
    select: { title: true, settings: true, translations: true },
  });

  if (!r) { console.log("not found"); return; }

  console.log("title:", r.title);
  console.log("settings:", JSON.stringify(r.settings, null, 2));
  const t = r.translations as Record<string, unknown>;
  const langs = Object.keys(t).filter((k) => !k.startsWith("_"));
  console.log("translation langs:", langs);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
