import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import {
  WorksheetBlock,
  WorksheetSettings,
  DEFAULT_SETTINGS,
  BrandProfile,
  getStaticBrandProfile,
} from "@/types/worksheet";
import { WorksheetViewer } from "@/components/viewer/worksheet-viewer";

export default async function ProjectWorksheetPage({
  params,
}: {
  params: Promise<{ locale: string; projectSlug: string; slug: string }>;
}) {
  const { locale, projectSlug, slug } = await params;
  setRequestLocale(locale);

  const headersList = await headers();
  const clientSlug = headersList.get("x-client-slug");
  if (!clientSlug) notFound();

  const project = await prisma.project.findFirst({
    where: { slug: projectSlug, client: { slug: clientSlug } },
  });
  if (!project) notFound();

  const worksheet = await prisma.worksheet.findUnique({ where: { slug } });
  if (!worksheet || !worksheet.published) notFound();

  const assignment = await prisma.projectContent.findUnique({
    where: {
      projectId_contentType_contentId: {
        projectId: project.id,
        contentType: "WORKSHEET",
        contentId: worksheet.id,
      },
    },
  });
  if (!assignment) notFound();

  const blocks = worksheet.blocks as unknown as WorksheetBlock[];
  const settings = {
    ...DEFAULT_SETTINGS,
    ...(worksheet.settings as unknown as Partial<WorksheetSettings>),
  };
  const brandSlug = (settings.brand || "edoomio") as string;

  const dbBrand = await prisma.brandProfile.findUnique({
    where: { slug: brandSlug },
    include: { subProfiles: true },
  });
  const brandProfile: BrandProfile = dbBrand
    ? (dbBrand as unknown as BrandProfile)
    : getStaticBrandProfile(brandSlug);

  return (
    <WorksheetViewer
      title={worksheet.title}
      blocks={blocks}
      settings={settings}
      mode="online"
      worksheetId={worksheet.id}
      brandProfile={brandProfile}
    />
  );
}
