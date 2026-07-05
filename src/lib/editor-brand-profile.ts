import { prisma } from "@/lib/prisma";
import { BrandProfile, getStaticBrandProfile } from "@/types/worksheet";

export async function loadEditorBrandProfile(brandSlug: string | null | undefined): Promise<BrandProfile> {
  const slug = brandSlug || "edoomio";
  const profile = await prisma.brandProfile.findUnique({
    where: { slug },
    include: { subProfiles: { orderBy: { name: "asc" } } },
  });

  if (!profile) {
    return getStaticBrandProfile(slug);
  }

  return JSON.parse(JSON.stringify(profile)) as BrandProfile;
}
