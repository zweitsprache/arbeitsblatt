import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
const key = process.argv[2];
try {
  const rows = await prisma.worksheet.findMany({ select: { id: true, slug: true, title: true, settings: true } });
  const m = rows.filter(r => r.id === key || r.slug === key || r.id?.toLowerCase() === key?.toLowerCase() || r.slug?.toLowerCase() === key?.toLowerCase());
  console.log(`matches for "${key}": ${m.length}`);
  for (const r of m) {
    const s = r.settings || {};
    console.log(JSON.stringify({ id: r.id, slug: r.slug, title: r.title?.slice(0,50), brand: s.brand, orientation: s.orientation, bsLogo: s.brandSettings?.logo ?? "(unset)", brandOverridesLogo: s.brandOverrides?.logo ?? "(none)" }, null, 2));
  }
} finally { await prisma.$disconnect(); await pool.end(); }
