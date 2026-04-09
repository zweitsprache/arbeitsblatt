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
  Monitor,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ContentType, ClientBrandSettings } from "@/types/project";
import { ProjectHeader } from "@/components/layout/project-header";
import { getAiToolDefinition } from "@/ai-tools/registry";

const CONTENT_TYPE_ICONS: Record<
  ContentType,
  React.ComponentType<{ className?: string }>
> = {
  WORKSHEET: FileText,
  EBOOK: BookOpen,
  COURSE: GraduationCap,
  AI_TOOL: Bot,
  PRESENTATION: Monitor,
};

const CONTENT_TYPE_VIEWER_PREFIX: Record<ContentType, string> = {
  WORKSHEET: "worksheet",
  EBOOK: "ebook",
  COURSE: "course",
  AI_TOOL: "ai-tool",
  PRESENTATION: "presentation",
};

interface ContentItem {
  contentType: ContentType;
  contentId: string;
  title: string;
  slug: string;
  published: boolean;
}

export default async function ProjectLandingPage({
  params,
}: {
  params: Promise<{ locale: string; projectSlug: string }>;
}) {
  const { locale, projectSlug } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("projectHome");
  const tContentType = await getTranslations("projectHome.contentType");
  const headersList = await headers();
  const clientSlug = headersList.get("x-client-slug");

  if (!clientSlug) notFound();

  const project = await prisma.project.findFirst({
    where: {
      slug: projectSlug,
      client: { slug: clientSlug },
    },
    include: { contents: true, client: true },
  });

  if (!project) notFound();

  const brand = (project.client.brandSettings || {}) as ClientBrandSettings;
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
        const tool = getAiToolDefinition(pc.contentId);
        if (tool) {
          title = tool.title;
          slug = tool.toolKey;
          published = true;
        }
        break;
      }
      case "PRESENTATION":
        break;
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

  return (
    <div className="flex-1">
      <ProjectHeader brandLogo={brand.logo} projectName={project.name} />

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

      <section className="max-w-5xl mx-auto px-6 sm:px-10 py-10">
        <h2 className="text-xl font-semibold mb-6">{t("availableContent")}</h2>

        {items.length === 0 ? (
          <p className="text-muted-foreground">{t("noContent")}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => {
              const Icon = CONTENT_TYPE_ICONS[item.contentType];
              const viewerPrefix = CONTENT_TYPE_VIEWER_PREFIX[item.contentType];

              return (
                <a
                  key={`${item.contentType}-${item.contentId}`}
                  href={`/${locale}/project/${project.slug}/${viewerPrefix}/${item.slug}`}
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
                      <Badge variant="outline" className="text-[10px] mt-1">
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
