import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/collections/public/[slug] — fetch published collection with sets (no auth required)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const collection = await prisma.flashcardCollection.findUnique({
      where: { slug },
      include: {
        sets: {
          orderBy: { order: "asc" },
          include: {
            // Include worksheet data for the sets
          },
        },
      },
    });

    if (!collection) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Only return published collections
    if (!collection.published) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Fetch worksheet details for each set
    const setsWithWorksheets = await Promise.all(
      collection.sets.map(async (set) => {
        const worksheet = await prisma.worksheet.findUnique({
          where: { id: set.worksheetId },
          select: {
            id: true,
            type: true,
            title: true,
            description: true,
            slug: true,
            blocks: true,
            settings: true,
            published: true,
            createdAt: true,
            updatedAt: true,
          },
        });
        return {
          ...set,
          worksheet,
        };
      })
    );

    return NextResponse.json({
      ...collection,
      sets: setsWithWorksheets,
    });
  } catch (error) {
    console.error("GET /api/collections/public/[slug] error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
