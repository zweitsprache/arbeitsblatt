import type { AiToolBrandProfile } from "@/ai-tools/types";
import { prisma } from "@/lib/prisma";

function readBrandProfileIdFromUnknownContext(context: unknown): string | undefined {
  const rawContext =
    context && typeof context === "object" ? (context as Record<string, unknown>) : undefined;
  const metadata =
    rawContext?.metadata && typeof rawContext.metadata === "object"
      ? (rawContext.metadata as Record<string, unknown>)
      : undefined;
  const brandProfileId = metadata?.brandProfileId;

  return typeof brandProfileId === "string" && brandProfileId.trim()
    ? brandProfileId.trim()
    : undefined;
}

export function getAiToolBrandProfileId(context: unknown): string | undefined {
  return readBrandProfileIdFromUnknownContext(context);
}

export async function resolveAiToolBrandProfile(context: unknown): Promise<AiToolBrandProfile | undefined> {
  const brandProfileId = readBrandProfileIdFromUnknownContext(context);
  if (!brandProfileId) return undefined;

  const brandProfile = await prisma.brandProfile.findUnique({
    where: { id: brandProfileId },
  });

  if (!brandProfile) return undefined;

  return {
    id: brandProfile.id,
    name: brandProfile.name,
    slug: brandProfile.slug,
    organization: brandProfile.organization,
    teacher: brandProfile.teacher,
    pageTitle: brandProfile.pageTitle,
    primaryColor: brandProfile.primaryColor,
    accentColor: brandProfile.accentColor,
  };
}

export function getBrandPromptContext(brandProfile?: AiToolBrandProfile) {
  if (!brandProfile) return "";

  return [
    "Brand profile:",
    `- Brand name: ${brandProfile.name}`,
    `- Organization: ${brandProfile.organization}`,
    `- Teacher or contact label: ${brandProfile.teacher}`,
    `- Page title: ${brandProfile.pageTitle || ""}`,
    `- Primary color: ${brandProfile.primaryColor}`,
    `- Accent color: ${brandProfile.accentColor || ""}`,
    `- Brand slug: ${brandProfile.slug}`,
  ]
    .filter(Boolean)
    .join("\n");
}