import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { CollectionViewer } from "@/components/viewer/collection-viewer";
import { prisma } from "@/lib/prisma";

interface CollectionPageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export default async function CollectionPage({
  params,
}: CollectionPageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  try {
    const collection = await prisma.flashcardCollection.findUnique({
      where: { slug },
      include: {
        sets: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!collection || !collection.published) {
      notFound();
    }

    const setsWithWorksheets = await Promise.all(
      collection.sets.map(async (set) => {
        const worksheet = await prisma.worksheet.findUnique({
          where: { id: set.worksheetId },
          select: {
            id: true,
            title: true,
            blocks: true,
          },
        });

        return {
          ...set,
          worksheet: worksheet
            ? {
                id: worksheet.id,
                title: worksheet.title,
                blocks: Array.isArray(worksheet.blocks)
                  ? (worksheet.blocks as Array<{
                      id: string;
                      front: { text: string; image?: string };
                      back: { text: string; image?: string };
                    }>)
                  : [],
              }
            : undefined,
        };
      })
    );

    // Transform the API response to match the component's expected structure
    const transformedCollection = {
      id: collection.id,
      title: collection.title,
      description: collection.description,
      sets: (setsWithWorksheets || []).map(
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
