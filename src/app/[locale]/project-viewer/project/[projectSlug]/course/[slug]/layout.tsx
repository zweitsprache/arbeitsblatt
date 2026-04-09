import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import {
  CourseModule,
  CourseCoverSettings,
  CourseSettings,
  DEFAULT_COURSE_COVER_SETTINGS,
  DEFAULT_COURSE_SETTINGS,
  collectLinkedWorksheetIds,
  normalizeCourseStructure,
} from "@/types/course";
import {
  WorksheetBlock,
  WorksheetSettings,
  DEFAULT_SETTINGS,
  BrandProfile,
  getStaticBrandProfile,
} from "@/types/worksheet";
import { CourseProvider } from "@/components/viewer/course-context";
import { CourseShell } from "@/components/viewer/course-shell";

export default async function ProjectCourseLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; projectSlug: string; slug: string }>;
}) {
  const { locale, projectSlug, slug } = await params;
  setRequestLocale(locale);

  const headersList = await headers();
  const clientSlug = headersList.get("x-client-slug");
  if (!clientSlug) notFound();

  const project = await prisma.project.findFirst({
    where: { slug: projectSlug, client: { slug: clientSlug } },
    include: { client: true },
  });
  if (!project) notFound();

  const course = await prisma.course.findUnique({ where: { slug } });
  if (!course) notFound();

  const assignment = await prisma.projectContent.findUnique({
    where: {
      projectId_contentType_contentId: {
        projectId: project.id,
        contentType: "COURSE",
        contentId: course.id,
      },
    },
  });
  if (!assignment) notFound();

  const structure = normalizeCourseStructure(
    course.structure as unknown as CourseModule[]
  );

  const linkedWorksheetIds = collectLinkedWorksheetIds(structure);
  const worksheetsData =
    linkedWorksheetIds.length > 0
      ? await prisma.worksheet.findMany({
          where: { id: { in: linkedWorksheetIds } },
        })
      : [];

  const worksheets: Record<
    string,
    {
      id: string;
      title: string;
      slug: string;
      blocks: WorksheetBlock[];
      settings: WorksheetSettings;
    }
  > = {};

  for (const ws of worksheetsData) {
    worksheets[ws.id] = {
      id: ws.id,
      title: ws.title,
      slug: ws.slug,
      blocks: ws.blocks as unknown as WorksheetBlock[],
      settings: {
        ...DEFAULT_SETTINGS,
        ...(ws.settings as unknown as Partial<WorksheetSettings>),
      },
    };
  }

  const settings: CourseSettings = {
    ...DEFAULT_COURSE_SETTINGS,
    ...(course.settings as unknown as Partial<CourseSettings>),
  };

  const brandProfileId = (course as { brandProfileId?: string | null }).brandProfileId;
  const brandSlug = ((course.settings as { brand?: string } | null)?.brand) ?? "edoomio";
  const dbBrandProfile = brandProfileId
    ? await prisma.brandProfile.findUnique({ where: { id: brandProfileId }, include: { subProfiles: { orderBy: { name: "asc" } } } })
    : await prisma.brandProfile.findFirst({ where: { slug: brandSlug }, include: { subProfiles: { orderBy: { name: "asc" } } } });
  const brandProfile: BrandProfile = dbBrandProfile
    ? (dbBrandProfile as unknown as BrandProfile)
    : getStaticBrandProfile(brandSlug);

  const coverSettings: CourseCoverSettings = {
    ...DEFAULT_COURSE_COVER_SETTINGS,
    ...(course.coverSettings as unknown as Partial<CourseCoverSettings>),
  };

  const rawTranslations = (course as { translations?: unknown }).translations;
  const translations: Record<string, Record<string, string>> | undefined =
    rawTranslations &&
    typeof rawTranslations === "object" &&
    Object.keys(rawTranslations as Record<string, unknown>).length > 0
      ? (rawTranslations as Record<string, Record<string, string>>)
      : undefined;

  return (
    <CourseProvider
      value={{
        id: course.id,
        slug,
        viewerBasePath: `/${locale}/project/${project.slug}/course/${slug}`,
        title: course.title,
        description: settings.description,
        languageLevel: settings.languageLevel,
        image: settings.image,
        brand: settings.brand || "edoomio",
        brandProfile,
        sidebarTheme: settings.sidebarTheme || "dark",
        structure,
        coverSettings,
        settings,
        worksheets,
        translations,
      }}
    >
      <CourseShell>{children}</CourseShell>
    </CourseProvider>
  );
}
