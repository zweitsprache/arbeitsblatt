import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { CollectionViewer } from "@/components/viewer/collection-viewer";

interface CollectionPageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export default async function CollectionPage({
  params,
}: CollectionPageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  try {
    // Fetch collection from API
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const response = await fetch(
      `${baseUrl}/api/collections/public/${slug}`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      notFound();
    }

    const collection = await response.json();

    // Transform the API response to match the component's expected structure
    const transformedCollection = {
      id: collection.id,
      title: collection.title,
      description: collection.description,
      sets: (collection.sets || []).map(
        (set: {
          id: string;
          order: number;
          worksheet: {
            id: string;
            title: string;
            blocks: Array<{
              id: string;
              front: { text: string; image?: string };
              back: { text: string; image?: string };
            }>;
          };
        }) => ({
          id: set.id,
          order: set.order,
          worksheet: set.worksheet
            ? {
                id: set.worksheet.id,
                title: set.worksheet.title,
                blocks: set.worksheet.blocks,
              }
            : undefined,
        })
      ),
    };

    return (
      <div>
        <CollectionViewer collection={transformedCollection} />
      </div>
    );
  } catch (error) {
    console.error("Failed to fetch collection:", error);
    notFound();
  }
}
