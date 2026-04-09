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
  const clientSlug = headersList.get("x-client-slug");

  if (!clientSlug) {
    notFound();
  }

  const client = await prisma.client.findUnique({
    where: { slug: clientSlug },
  });

  if (!client) {
    notFound();
  }

  const brand = (client.brandSettings || {}) as ClientBrandSettings;

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
