import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import type { ClientBrandSettings } from "@/types/project";

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

  const brand = (project.client.brandSettings || {}) as ClientBrandSettings;

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
        {/* Main content */}
        <main className="flex-1">{children}</main>
      </div>
    </>
  );
}
