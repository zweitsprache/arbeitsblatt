import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import {
  ArrowRight,
  FolderKanban,
} from "lucide-react";
import type { ClientBrandSettings } from "@/types/project";
import { ProjectHeader } from "@/components/layout/project-header";

export default async function ProjectHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("projectHome");
  const headersList = await headers();
  const clientSlug = headersList.get("x-client-slug");
  if (!clientSlug) notFound();

  const client = await prisma.client.findUnique({
    where: { slug: clientSlug },
    include: {
      projects: {
        orderBy: { updatedAt: "desc" },
        include: { _count: { select: { contents: true } } },
      },
    },
  });
  if (!client) notFound();

  const brand = (client.brandSettings || {}) as ClientBrandSettings;

  return (
    <div className="flex-1">
      <ProjectHeader brandLogo={brand.logo} projectName={client.name} />

      {/* Hero section */}
      <section className="bg-gradient-to-br from-primary/5 via-background to-primary/10 border-b">
        <div className="max-w-5xl mx-auto px-6 sm:px-10 py-16 sm:py-24 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            {client.name}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("heroSubtitle")}
          </p>
        </div>
      </section>

      {/* Content cards */}
      <section className="max-w-5xl mx-auto px-6 sm:px-10 py-10">
        <h2 className="text-xl font-semibold mb-6">{t("availableProjects")}</h2>

        {client.projects.length === 0 ? (
          <p className="text-muted-foreground">{t("noProjects")}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {client.projects.map((project) => {
              return (
                <a
                  key={project.id}
                  href={`/${locale}/project/${project.slug}`}
                  className="group rounded-lg border bg-background p-5 hover:border-primary/40 hover:shadow-md transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <FolderKanban className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                        {project.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {project._count.contents} content item{project._count.contents === 1 ? "" : "s"}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
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
