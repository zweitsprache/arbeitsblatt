import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import {
  FileText,
  BookOpen,
  GraduationCap,
  Bot,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ContentType, ClientBrandSettings } from "@/types/project";
import { ProjectHeader } from "@/components/layout/project-header";

const CONTENT_TYPE_ICONS: Record<
  ContentType,
  React.ComponentType<{ className?: string }>
> = {
  WORKSHEET: FileText,
  EBOOK: BookOpen,
  COURSE: GraduationCap,
  AI_TOOL: Bot,
};

const CONTENT_TYPE_VIEWER_PREFIX: Record<ContentType, string> = {
  WORKSHEET: "worksheet",
  EBOOK: "ebook",
  COURSE: "course",
  AI_TOOL: "ai-tool",
};

interface ContentItem {
  contentType: ContentType;
  contentId: string;
  title: string;
  slug: string;
  published: boolean;
}

export default async function ProjectHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("projectHome");
  const headersList = await headers();
  const projectSlug = headersList.get("x-project-slug");
  if (!projectSlug) notFound();

  const project = await prisma.project.findUnique({
    where: { slug: projectSlug },
    include: { contents: true, client: true },
  });
  if (!project) notFound();

  const brand = (project.client.brandSettings || {}) as ClientBrandSettings;

  // Fetch details for all assigned content
  const items: ContentItem[] = [];

  for (const pc of project.contents) {
    let title = "";
    let slug = "";
    let published = false;

    switch (pc.contentType) {
      case "WORKSHEET": {
        const w = await prisma.worksheet.findUnique({
          where: { id: pc.contentId },
          select: { title: true, slug: true, published: true },
        });
        if (w && w.published) {
          title = w.title;
          slug = w.slug;
          published = w.published;
        }
        break;
      }
      case "EBOOK": {
        const e = await prisma.eBook.findUnique({
          where: { id: pc.contentId },
          select: { title: true, slug: true, published: true },
        });
        if (e && e.published) {
          title = e.title;
          slug = e.slug;
          published = e.published;
        }
        break;
      }
      case "COURSE": {
        const c = await prisma.course.findUnique({
          where: { id: pc.contentId },
          select: { title: true, slug: true, published: true },
        });
        if (c && c.published) {
          title = c.title;
          slug = c.slug;
          published = c.published;
        }
        break;
      }
      case "AI_TOOL": {
        const a = await prisma.aiTool.findUnique({
          where: { id: pc.contentId },
          select: { title: true, slug: true, published: true },
        });
        if (a && a.published) {
          title = a.title;
          slug = a.slug;
          published = a.published;
        }
        break;
      }
    }

    if (published && title) {
      items.push({
        contentType: pc.contentType,
        contentId: pc.contentId,
        title,
        slug,
        published,
      });
    }
  }

  const tContentType = await getTranslations("projectHome.contentType");

  return (
    <div className="flex-1">
      <ProjectHeader brandLogo={brand.logo} projectName={project.name} />

      {/* Hero section */}
      <section className="bg-gradient-to-br from-primary/5 via-background to-primary/10 border-b">
        <div className="max-w-5xl mx-auto px-6 sm:px-10 py-16 sm:py-24 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            {project.name}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("heroSubtitle")}
          </p>
        </div>
      </section>

      {/* Content cards */}
      <section className="max-w-5xl mx-auto px-6 sm:px-10 py-10">
        <h2 className="text-xl font-semibold mb-6">{t("availableContent")}</h2>

        {items.length === 0 ? (
          <p className="text-muted-foreground">{t("noContent")}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => {
              const Icon = CONTENT_TYPE_ICONS[item.contentType];
              const viewerPrefix =
                CONTENT_TYPE_VIEWER_PREFIX[item.contentType];
              return (
                <a
                  key={`${item.contentType}-${item.contentId}`}
                  href={`/${locale}/${viewerPrefix}/${item.slug}`}
                  className="group rounded-lg border bg-background p-5 hover:border-primary/40 hover:shadow-md transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                        {item.title}
                      </h3>
                      <Badge
                        variant="outline"
                        className="text-[10px] mt-1"
                      >
                        {tContentType(item.contentType)}
                      </Badge>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
