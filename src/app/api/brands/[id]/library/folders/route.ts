import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";

// Helper to build folder tree recursively
async function buildFolderTree(
  folderId: string | null,
  brandId: string
): Promise<any[]> {
  const folders = await prisma.brandLibraryFolder.findMany({
    where: {
      brandProfileId: brandId,
      parentId: folderId,
    },
    orderBy: { name: "asc" },
  });

  return Promise.all(
    folders.map(async (folder) => ({
      ...folder,
      children: await buildFolderTree(folder.id, brandId),
    }))
  );
}

// GET /api/brands/[id]/library/folders — get folder tree (public)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: brandId } = await params;

  try {
    const brand = await prisma.brandProfile.findUnique({
      where: { id: brandId },
    });

    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    const folders = await buildFolderTree(null, brandId);
    return NextResponse.json({ folders });
  } catch (error) {
    console.error("[library/folders] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch folders" },
      { status: 500 }
    );
  }
}

// POST /api/brands/[id]/library/folders — create a folder
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAdmin();
  if (result instanceof NextResponse) return result;

  const { id: brandId } = await params;

  try {
    const { name, parentId } = await req.json();

    if (!name) {
      return NextResponse.json(
        { error: "Folder name is required" },
        { status: 400 }
      );
    }

    const brand = await prisma.brandProfile.findUnique({
      where: { id: brandId },
    });

    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    if (parentId) {
      const parentFolder = await prisma.brandLibraryFolder.findFirst({
        where: {
          id: parentId,
          brandProfileId: brandId,
        },
      });

      if (!parentFolder) {
        return NextResponse.json(
          { error: "Parent folder not found" },
          { status: 404 }
        );
      }
    }

    const slug = name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    const existing = await prisma.brandLibraryFolder.findFirst({
      where: {
        brandProfileId: brandId,
        slug,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A folder with this name already exists" },
        { status: 409 }
      );
    }

    const folder = await prisma.brandLibraryFolder.create({
      data: {
        brandProfileId: brandId,
        parentId: parentId || undefined,
        name,
        slug,
      },
    });

    return NextResponse.json(folder, { status: 201 });
  } catch (error) {
    console.error("[library/folders] POST error:", error);
    return NextResponse.json(
      { error: "Failed to create folder" },
      { status: 500 }
    );
  }
}
