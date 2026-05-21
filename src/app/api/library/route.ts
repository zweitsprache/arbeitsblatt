import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";

type LibraryOrientation = "portrait" | "landscape" | "landscape-canva";

interface LibraryWorksheetRow {
  id: string;
  type: string;
  title: string;
  slug: string;
  description: string | null;
  orientation: LibraryOrientation;
  hasThumbnail: boolean;
  itemCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface LibraryEbookRow {
  id: string;
  title: string;
  slug: string;
  orientation: Extract<LibraryOrientation, "portrait" | "landscape">;
  hasThumbnail: boolean;
  itemCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// GET /api/library — list items for the logged-in user (all types)
export async function GET(req: NextRequest) {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  const search = req.nextUrl.searchParams.get("search");
  const type = req.nextUrl.searchParams.get("type"); // "worksheet" | "cards" | "flashcards" | "grammar-table" | null (all)

  const includeWorksheets = !type || type !== "ebook";
  const includeEbooks = !type || type === "ebook";

  const worksheetConditions: Prisma.Sql[] = [
    Prisma.sql`"userId" = ${userId}`,
  ];
  const ebookConditions: Prisma.Sql[] = [
    Prisma.sql`"userId" = ${userId}`,
  ];

  if (type && type !== "ebook") {
    worksheetConditions.push(Prisma.sql`type = ${type}`);
  }

  if (search) {
    const searchPattern = `%${search}%`;
    worksheetConditions.push(Prisma.sql`title ILIKE ${searchPattern}`);
    ebookConditions.push(Prisma.sql`title ILIKE ${searchPattern}`);
  }

  const [worksheets, ebooks] = await Promise.all([
    includeWorksheets
      ? prisma.$queryRaw<LibraryWorksheetRow[]>(Prisma.sql`
          SELECT
            id,
            type,
            title,
            slug,
            description,
            CASE
              WHEN type IN ('cards', 'flashcards', 'grammar-table') THEN 'landscape'
              WHEN EXISTS (
                SELECT 1
                FROM jsonb_array_elements(
                  CASE
                    WHEN jsonb_typeof(blocks) = 'array' THEN blocks
                    ELSE '[]'::jsonb
                  END
                ) AS block
                WHERE block->>'type' IN ('domino', 'flashcards')
              ) THEN 'landscape-canva'
              WHEN settings->>'orientation' = 'landscape-canva' THEN 'landscape-canva'
              WHEN settings->>'orientation' = 'landscape' THEN 'landscape'
              WHEN settings->>'orientation' = 'portrait' THEN 'portrait'
              ELSE 'portrait'
            END AS orientation,
            thumbnail IS NOT NULL AS "hasThumbnail",
            CASE
              WHEN jsonb_typeof(blocks) = 'array' THEN jsonb_array_length(blocks)
              ELSE 0
            END AS "itemCount",
            "createdAt",
            "updatedAt"
          FROM "Worksheet"
            WHERE ${Prisma.join(worksheetConditions, " AND ")}
          ORDER BY "updatedAt" DESC
        `)
      : Promise.resolve([]),
    includeEbooks
      ? prisma.$queryRaw<LibraryEbookRow[]>(Prisma.sql`
          SELECT
            id,
            title,
            slug,
            CASE
              WHEN "coverSettings"->>'orientation' = 'landscape' THEN 'landscape'
              ELSE 'portrait'
            END AS orientation,
            thumbnail IS NOT NULL AS "hasThumbnail",
            CASE
              WHEN jsonb_typeof(chapters) = 'array' THEN jsonb_array_length(chapters)
              ELSE 0
            END AS "itemCount",
            "createdAt",
            "updatedAt"
          FROM "EBook"
            WHERE ${Prisma.join(ebookConditions, " AND ")}
          ORDER BY "updatedAt" DESC
        `)
      : Promise.resolve([]),
  ]);

  // Normalize into a unified format
  const items = [
    ...worksheets.map((w) => {
      return {
        id: w.id,
        type: w.type,
        title: w.title,
        slug: w.slug,
        description: w.description,
        orientation: w.orientation,
        thumbnailUrl: `/api/worksheets/${w.id}/thumbnail`,
        hasThumbnail: w.hasThumbnail,
        itemCount: w.itemCount,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
      };
    }),
    ...ebooks.map((e) => {
      return {
        id: e.id,
        type: "ebook" as const,
        title: e.title,
        slug: e.slug,
        description: null,
        orientation: e.orientation,
        thumbnailUrl: `/api/worksheets/${e.id}/thumbnail`,
        hasThumbnail: e.hasThumbnail,
        itemCount: e.itemCount,
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
