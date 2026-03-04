import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import {
  FileText,
  BookOpen,
  GraduationCap,
  Bot,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ContentType } from "@/types/project";

const CONTENT_TYPE_ICONS: Record<
  ContentType,
  React.ComponentType<{ className?: string }>
> = {
  WORKSHEET: FileText,
  EBOOK: BookOpen,
  COURSE: GraduationCap,
  AI_TOOL: Bot,
};

const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  WORKSHEET: "Worksheet",
  EBOOK: "E-Book",
  COURSE: "Course",
  AI_TOOL: "AI Tool",
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

  const headersList = await headers();
  const projectSlug = headersList.get("x-project-slug");
  if (!projectSlug) notFound();

  const project = await prisma.project.findUnique({
    where: { slug: projectSlug },
    include: { contents: true },
  });
  if (!project) notFound();

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

  return (
    <div className="max-w-5xl mx-auto px-6 sm:px-10 py-10">
      <h2 className="text-2xl font-bold mb-6">{project.name}</h2>

      {items.length === 0 ? (
        <p className="text-muted-foreground">No content available yet.</p>
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
                      {CONTENT_TYPE_LABELS[item.contentType]}
                    </Badge>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
