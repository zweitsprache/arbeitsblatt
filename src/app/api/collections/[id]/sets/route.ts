import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";
import { AddSetToCollectionRequest, ReorderSetsRequest } from "@/types/collection";

// POST /api/collections/[id]/sets — add a flashcard set to collection
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  const { id } = await params;
  const body: AddSetToCollectionRequest = await req.json();

  if (!body.worksheetId) {
    return NextResponse.json({ error: "worksheetId is required" }, { status: 400 });
  }

  try {
    // Verify collection ownership
    const collection = await prisma.flashcardCollection.findUnique({
      where: { id, userId },
      include: { sets: true },
    });

    if (!collection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    // Verify the worksheet exists and is of type flashcards
    const worksheet = await prisma.worksheet.findUnique({
      where: { id: body.worksheetId },
    });

    if (!worksheet || worksheet.type !== "flashcards") {
      return NextResponse.json({ error: "Flashcard set not found" }, { status: 404 });
    }

    // Check if set is already in collection
    const existing = await prisma.flashcardCollectionSet.findUnique({
      where: {
        collectionId_worksheetId: {
          collectionId: id,
          worksheetId: body.worksheetId,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ error: "Set already in collection" }, { status: 409 });
    }

    // Get next order number
    const maxOrder =
      collection.sets.length > 0
        ? Math.max(...collection.sets.map((s) => s.order))
        : -1;

    const collectionSet = await prisma.flashcardCollectionSet.create({
      data: {
        collectionId: id,
        worksheetId: body.worksheetId,
        order: maxOrder + 1,
      },
    });

    return NextResponse.json(collectionSet, { status: 201 });
  } catch (error) {
    console.error("POST /api/collections/[id]/sets error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/collections/[id]/sets/[worksheetId] — remove set from collection
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; worksheetId?: string }> }
) {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  const { id, worksheetId } = await params;

  if (!worksheetId) {
    return NextResponse.json({ error: "worksheetId is required" }, { status: 400 });
  }

  try {
    // Verify collection ownership
    const collection = await prisma.flashcardCollection.findUnique({
      where: { id, userId },
    });

    if (!collection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    // Delete the set from collection
    const collectionSet = await prisma.flashcardCollectionSet.findUnique({
      where: {
        collectionId_worksheetId: {
          collectionId: id,
          worksheetId: worksheetId,
        },
      },
    });

    if (!collectionSet) {
      return NextResponse.json({ error: "Set not in collection" }, { status: 404 });
    }

    await prisma.flashcardCollectionSet.delete({
      where: { id: collectionSet.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/collections/[id]/sets error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/collections/[id]/sets/reorder — reorder sets in collection
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  const { id } = await params;
  const body: ReorderSetsRequest = await req.json();

  if (!Array.isArray(body.sets) || body.sets.length === 0) {
    return NextResponse.json({ error: "sets array is required" }, { status: 400 });
  }

  try {
    // Verify collection ownership
    const collection = await prisma.flashcardCollection.findUnique({
      where: { id, userId },
    });

    if (!collection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    // Update all sets with new order
    const updates = body.sets.map((set) =>
      prisma.flashcardCollectionSet.update({
        where: { id: set.id },
        data: { order: set.order },
      })
    );

    await Promise.all(updates);

    const updatedSets = await prisma.flashcardCollectionSet.findMany({
      where: { collectionId: id },
      orderBy: { order: "asc" },
    });

    return NextResponse.json(updatedSets);
  } catch (error) {
    console.error("PUT /api/collections/[id]/sets/reorder error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
