/**
 * Migration script: Convert existing worksheet brandSettings to brandOverrides.
 *
 * For each worksheet that has settings.brandSettings (per-worksheet overrides of
 * organization, teacher, header/footer), copy those values to settings.brandOverrides.
 * This ensures the new brand profile system picks them up.
 *
 * Run with: npx tsx scripts/migrate-brand-overrides.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface LegacyBrandSettings {
  logo?: string;
  organization?: string;
  teacher?: string;
  headerRight?: string;
  footerLeft?: string;
  footerCenter?: string;
  footerRight?: string;
}

interface WorksheetSettings {
  brand?: string;
  brandSettings?: LegacyBrandSettings;
  brandOverrides?: LegacyBrandSettings;
  [key: string]: unknown;
}

async function main() {
  // 1. Verify all brand slugs used by worksheets exist as BrandProfile records
  const worksheets = await prisma.worksheet.findMany({
    select: { id: true, title: true, settings: true },
  });

  const slugs = new Set<string>();
  for (const ws of worksheets) {
    const settings = (ws.settings ?? {}) as WorksheetSettings;
    const slug = settings.brand || "edoomio";
    slugs.add(slug);
  }

  console.log(`Found ${worksheets.length} worksheets using ${slugs.size} distinct brand slugs: ${[...slugs].join(", ")}`);

  // Check that all slugs have a BrandProfile
  const existingProfiles = await prisma.brandProfile.findMany({ select: { slug: true } });
  const existingSlugs = new Set(existingProfiles.map((p) => p.slug));
  const missingSlugs = [...slugs].filter((s) => !existingSlugs.has(s));
  if (missingSlugs.length > 0) {
    console.error(`❌ Missing BrandProfile records for slugs: ${missingSlugs.join(", ")}`);
    console.error("Please seed these brands first.");
    process.exit(1);
  }
  console.log("✅ All brand slugs have matching BrandProfile records.");

  // 2. Migrate brandSettings → brandOverrides
  let migrated = 0;
  let skipped = 0;
  for (const ws of worksheets) {
    const settings = (ws.settings ?? {}) as WorksheetSettings;
    if (!settings.brandSettings) {
      skipped++;
      continue;
    }

    // Already has brandOverrides? Skip to avoid overwriting.
    if (settings.brandOverrides) {
      console.log(`  ⏭ ${ws.title} (id: ${ws.id}) — already has brandOverrides, skipping`);
      skipped++;
      continue;
    }

    const { logo, organization, teacher, headerRight, footerLeft, footerCenter, footerRight } = settings.brandSettings;

    // Only migrate if there are actual override values
    const overrides: LegacyBrandSettings = {};
    if (logo) overrides.logo = logo;
    if (organization) overrides.organization = organization;
    if (teacher) overrides.teacher = teacher;
    if (headerRight) overrides.headerRight = headerRight;
    if (footerLeft) overrides.footerLeft = footerLeft;
    if (footerCenter) overrides.footerCenter = footerCenter;
    if (footerRight) overrides.footerRight = footerRight;

    if (Object.keys(overrides).length === 0) {
      skipped++;
      continue;
    }

    const updatedSettings = {
      ...settings,
      brandOverrides: overrides,
    };

    await prisma.worksheet.update({
      where: { id: ws.id },
      data: { settings: updatedSettings as object },
    });
    migrated++;
    console.log(`  ✅ ${ws.title} (id: ${ws.id}) — migrated ${Object.keys(overrides).length} overrides`);
  }

  console.log(`\nDone! Migrated: ${migrated}, Skipped: ${skipped}, Total: ${worksheets.length}`);

  await prisma.$disconnect();
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
