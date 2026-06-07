import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

try {
  const bp = await prisma.brandProfile.findUnique({ where: { slug: "theresia-banz" } }).catch((e) => ({ error: String(e) }));
  console.log("=== brandProfile theresia-banz ===");
  console.log(bp ? JSON.stringify({ slug: bp.slug, logo: bp.logo, iconLogo: bp.iconLogo, name: bp.name }, null, 2) : "NONE");

  const rows = await prisma.worksheet.findMany({ select: { id: true, title: true, settings: true } });
  const tb = rows.filter((r) => r.settings?.brand === "theresia-banz");
  console.log(`\n=== theresia-banz worksheets: ${tb.length} ===`);
  for (const r of tb.slice(0, 8)) {
    const s = r.settings || {};
    console.log({
      title: r.title?.slice(0, 40),
      orientation: s.orientation,
      bsLogo: s.brandSettings?.logo ?? "(unset)",
    });
  }
} finally {
  await prisma.$disconnect();
  await pool.end();
}
