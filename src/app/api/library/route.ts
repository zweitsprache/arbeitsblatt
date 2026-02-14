import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";

// GET /api/library — list items for the logged-in user (all types)
export async function GET(req: NextRequest) {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  const search = req.nextUrl.searchParams.get("search");
  const type = req.nextUrl.searchParams.get("type"); // "worksheet" | "cards" | "flashcards" | "grammar-table" | null (all)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const worksheetWhere: any = { userId };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ebookWhere: any = { userId };

  if (type && type !== "ebook") {
    worksheetWhere.type = type;
  }

  if (search) {
    worksheetWhere.title = { contains: search, mode: "insensitive" };
    ebookWhere.title = { contains: search, mode: "insensitive" };
  }

  const includeWorksheets = !type || type !== "ebook";
  const includeEbooks = !type || type === "ebook";

  const [worksheets, ebooks] = await Promise.all([
    includeWorksheets
      ? prisma.worksheet.findMany({
          where: worksheetWhere,
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            type: true,
            title: true,
            slug: true,
            description: true,
            blocks: true,
            settings: true,
            thumbnail: true,
            createdAt: true,
            updatedAt: true,
          },
        })
      : Promise.resolve([]),
    includeEbooks
      ? prisma.eBook.findMany({
          where: ebookWhere,
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            title: true,
            slug: true,
            coverSettings: true,
            chapters: true,
            thumbnail: true,
            createdAt: true,
            updatedAt: true,
          },
        })
      : Promise.resolve([]),
  ]);

  // Helper to extract orientation from settings JSON
  function getOrientation(
    settings: unknown,
    fallback: "portrait" | "landscape"
  ): "portrait" | "landscape" {
    if (
      settings &&
      typeof settings === "object" &&
      "orientation" in (settings as Record<string, unknown>)
    ) {
      const val = (settings as Record<string, unknown>).orientation;
      if (val === "landscape") return "landscape";
      if (val === "portrait") return "portrait";
    }
    return fallback;
  }

  // Normalize into a unified format
  const items = [
    ...worksheets.map((w) => {
      // Cards, flashcards, grammar-tables are always landscape
      const defaultOrientation =
        w.type === "cards" ||
        w.type === "flashcards" ||
        w.type === "grammar-table"
          ? ("landscape" as const)
          : ("portrait" as const);

      return {
        id: w.id,
        type: w.type,
        title: w.title,
        slug: w.slug,
        description: w.description,
        orientation: getOrientation(w.settings, defaultOrientation),
        thumbnailUrl: `/api/worksheets/${w.id}/thumbnail`,
        hasThumbnail: !!w.thumbnail,
        itemCount: Array.isArray(w.blocks)
          ? (w.blocks as unknown[]).length
          : 0,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
      };
    }),
    ...ebooks.map((e) => {
      const ebookSettings = e.coverSettings as Record<string, unknown> | null;
      return {
        id: e.id,
        type: "ebook" as const,
        title: e.title,
        slug: e.slug,
        description: null,
        orientation: getOrientation(ebookSettings, "portrait") as
          | "portrait"
          | "landscape",
        thumbnailUrl: `/api/worksheets/${e.id}/thumbnail`,
        hasThumbnail: !!e.thumbnail,
        itemCount: Array.isArray(e.chapters)
          ? (e.chapters as unknown[]).length
          : 0,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
      };
    }),
  ];

  // Sort all items by updatedAt descending
  items.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return NextResponse.json(items);
}
