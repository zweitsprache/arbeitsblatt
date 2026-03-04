import { headers } from "next/headers";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import type { BrandSettings } from "@/types/project";

export default async function ProjectViewerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const projectSlug = headersList.get("x-project-slug");

  if (!projectSlug) {
    notFound();
  }

  // Load project + client brand settings
  const project = await prisma.project.findUnique({
    where: { slug: projectSlug },
    include: { client: true },
  });

  if (!project) {
    notFound();
  }

  const brand = (project.client.brandSettings || {}) as BrandSettings;
  const pageTitle = brand.pageTitle || project.name;

  return (
    <>
      {/* Inject brand styles */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            :root {
              ${brand.primaryColor ? `--project-primary: ${brand.primaryColor};` : ""}
              ${brand.accentColor ? `--project-accent: ${brand.accentColor};` : ""}
            }
            ${brand.fontFamily ? `body { font-family: ${brand.fontFamily}; }` : ""}
          `.trim(),
        }}
      />

      <div className="min-h-screen flex flex-col">
        {/* Header with branding */}
        <header className="border-b bg-background px-6 py-4 flex items-center gap-4">
          {brand.logo && (
            <Image
              src={brand.logo}
              alt={pageTitle}
              width={120}
              height={32}
              className="h-8 w-auto object-contain"
              unoptimized
            />
          )}
          <h1 className="text-lg font-semibold">{pageTitle}</h1>
        </header>

        {/* Main content */}
        <main className="flex-1">{children}</main>

        {/* Footer */}
        <footer className="border-t bg-background px-6 py-4 text-center text-xs text-muted-foreground">
          {pageTitle}
        </footer>
      </div>
    </>
  );
}
