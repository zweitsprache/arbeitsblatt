import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";
import { v4 as uuidv4 } from "uuid";
import { generatePDFPreview } from "@/lib/pdf-preview";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  const { id: brandId } = await params;

  try {
    const brand = await prisma.brandProfile.findUnique({
      where: { id: brandId },
    });

    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const title = formData.get("title") as string;
    const description = formData.get("description") as string | null;
    const folderId = formData.get("folderId") as string;
    const categoryId = formData.get("categoryId") as string | null;
    const worksheetId = formData.get("worksheetId") as string | null;
    const worksheetUpdatedAt = formData.get("worksheetUpdatedAt") as string | null;
    const tagIdsStr = formData.get("tagIds") as string | null;
    const tagIds = tagIdsStr ? JSON.parse(tagIdsStr) : [];

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!title || !folderId) {
      return NextResponse.json(
        { error: "Title and folder are required" },
        { status: 400 }
      );
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "File must be a PDF" },
        { status: 400 }
      );
    }

    const folder = await prisma.brandLibraryFolder.findFirst({
      where: {
        id: folderId,
        brandProfileId: brandId,
      },
    });

    if (!folder) {
      return NextResponse.json(
        { error: "Folder not found or does not belong to this brand" },
        { status: 404 }
      );
    }

    if (categoryId) {
      const category = await prisma.brandLibraryCategory.findFirst({
        where: {
          id: categoryId,
          brandProfileId: brandId,
        },
      });

      if (!category) {
        return NextResponse.json(
          { error: "Category not found or does not belong to this brand" },
          { status: 404 }
        );
      }
    }

    if (tagIds.length > 0) {
      const tags = await prisma.brandLibraryTag.findMany({
        where: {
          id: { in: tagIds },
          brandProfileId: brandId,
        },
      });

      if (tags.length !== tagIds.length) {
        return NextResponse.json(
          { error: "One or more tags do not belong to this brand" },
          { status: 404 }
        );
      }
    }

    const blobPath = `library/${brandId}/${uuidv4()}_${Date.now()}.pdf`;
    const blob = await put(blobPath, file, {
      access: "public",
      contentType: "application/pdf",
    });

    // Generate preview image
    const previewImagePath = await generatePDFPreview(file, brandId, title);

    const pdfEntry = await prisma.brandLibraryPDF.create({
      data: {
        brandProfileId: brandId,
        folderId,
        categoryId: categoryId || undefined,
        worksheetId: worksheetId || undefined,
        worksheetUpdatedAt: worksheetUpdatedAt ? new Date(worksheetUpdatedAt) : undefined,
        blobPath: blob.pathname,
        previewImagePath: previewImagePath || undefined,
        title,
        description: description || undefined,
        status: "pending_approval",
        createdBy: authResult.userId,
        tags: {
          create: tagIds.map((tagId: string) => ({
            tagId,
          })),
        },
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
        category: true,
      },
    });

    return NextResponse.json(pdfEntry, { status: 201 });
  } catch (error) {
    console.error("[library/publish] Error:", error);
    return NextResponse.json(
      { error: "Failed to publish PDF" },
      { status: 500 }
    );
  }
}
