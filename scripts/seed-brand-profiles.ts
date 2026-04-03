import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const brands = [
  {
    name: "edoomio",
    slug: "edoomio",
    bodyFont: "Asap Condensed, sans-serif",
    headlineFont: "Asap Condensed, sans-serif",
    headlineWeight: 700,
    subHeadlineFont: "Asap Condensed, sans-serif",
    subHeadlineWeight: 700,
    headerFooterFont: "Asap Condensed, sans-serif",
    googleFontsUrl:
      "https://fonts.googleapis.com/css2?family=Asap+Condensed:wght@400;600;700&display=swap",
    primaryColor: "#1a1a1a",
    logo: "/logo/arbeitsblatt_logo_full_brand.svg",
    iconLogo: "/logo/arbeitsblatt_logo_icon.svg",
  },
  {
    name: "LingoStar",
    slug: "lingostar",
    bodyFont: "Encode Sans, sans-serif",
    headlineFont: "Merriweather, serif",
    headlineWeight: 400,
    subHeadlineFont: "Encode Sans, sans-serif",
    subHeadlineWeight: 600,
    headerFooterFont: "Encode Sans, sans-serif",
    googleFontsUrl:
      "https://fonts.googleapis.com/css2?family=Encode+Sans:wght@400;500;600&family=Merriweather:wght@400;700&family=Nunito:wght@400;600;700;800&display=swap",
    primaryColor: "#3a4f40",
    logo: "/logo/lingostar_logo_icon_flat.svg",
    iconLogo: "/logo/lingostar_logo_icon_flat.svg",
  },
  {
    name: "AGI Frauenfeld",
    slug: "agi-frauenfeld",
    bodyFont: "Asap Condensed, sans-serif",
    headlineFont: "Asap Condensed, sans-serif",
    headlineWeight: 700,
    subHeadlineFont: "Asap Condensed, sans-serif",
    subHeadlineWeight: 700,
    headerFooterFont: "Asap Condensed, sans-serif",
    googleFontsUrl:
      "https://fonts.googleapis.com/css2?family=Asap+Condensed:wght@400;600;700&display=swap",
    primaryColor: "#1a1a1a",
    logo: "/logo/logo-stadt-frauenfeld.svg",
    iconLogo: "/logo/logo-stadt-frauenfeld.svg",
  },
];

async function main() {
  for (const brand of brands) {
    const existing = await prisma.brandProfile.findUnique({
      where: { slug: brand.slug },
    });
    if (existing) {
      console.log(`Brand "${brand.slug}" already exists — skipping`);
      continue;
    }
    await prisma.brandProfile.create({ data: brand });
    console.log(`Created brand "${brand.slug}"`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
