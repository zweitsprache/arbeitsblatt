"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { authFetch } from "@/lib/auth-fetch";
import { useCollection } from "@/store/collection-store";
import { Button } from "@/components/ui/button";

interface WorksheetItem {
  id: string;
  title: string;
  slug: string;
}

interface CollectionSetListProps {
  collectionId: string;
  onAddSet: () => void;
}

export function CollectionSetList({
  collectionId,
  onAddSet,
}: CollectionSetListProps) {
  const { state, removeSetFromCollection, reorderSets } = useCollection();
  const [worksheets, setWorksheets] = useState<Record<string, WorksheetItem>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  const sets = state.currentCollection?.sets || [];

  // Fetch worksheet details for all sets
  useEffect(() => {
    const fetchWorksheets = async () => {
      try {
        const missingIds = sets
          .map((s) => s.worksheetId)
          .filter((id) => !worksheets[id]);

        if (missingIds.length === 0) return;

        const results: Record<string, WorksheetItem> = {};
        for (const id of missingIds) {
          const res = await authFetch(`/api/worksheets/${id}`);
          if (res.ok) {
            const data = await res.json();
            results[id] = {
              id: data.id,
              title: data.title,
              slug: data.slug,
            };
          }
        }
        setWorksheets((prev) => ({ ...prev, ...results }));
      } catch (error) {
        console.error("Failed to fetch worksheets:", error);
      }
    };

    fetchWorksheets();
  }, [sets, worksheets]);

  const handleDragStart = (e: React.DragEvent, setId: string) => {
    setDraggedItem(setId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, targetSetId: string) => {
    e.preventDefault();
    if (!draggedItem || draggedItem === targetSetId) return;

    const draggedIndex = sets.findIndex((s) => s.id === draggedItem);
    const targetIndex = sets.findIndex((s) => s.id === targetSetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Create new order
    const newSets = [...sets];
    const [moved] = newSets.splice(draggedIndex, 1);
    newSets.splice(targetIndex, 0, moved);

    // Update orders
    const reorderData = newSets.map((s, i) => ({
      id: s.id,
      order: i,
    }));

    await reorderSets(collectionId, reorderData);
    setDraggedItem(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Flashcard Sets</h2>
        <Button onClick={onAddSet}>Add Set</Button>
      </div>

      {sets.length === 0 ? (
        <div className="text-center py-8 text-gray-500 border rounded-lg">
          No sets in this collection yet. Add one to get started!
        </div>
      ) : (
        <div className="space-y-2">
          {sets.map((set) => {
            const worksheet = worksheets[set.worksheetId];
            return (
              <div
                key={set.id}
                draggable
                onDragStart={(e) => handleDragStart(e, set.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, set.id)}
                className={`flex items-center justify-between p-4 border rounded-lg cursor-move hover:bg-gray-50 transition-all ${
                  draggedItem === set.id ? "opacity-50 bg-blue-50" : ""
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-500 mb-1">#{set.order + 1}</div>
                  {worksheet ? (
                    <>
                      <div className="font-medium truncate">{worksheet.title}</div>
                      <Link
                        href={`/editor/flashcards/${worksheet.id}`}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Edit set →
                      </Link>
                    </>
                  ) : (
                    <div className="text-sm text-gray-400">Loading...</div>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700 ml-2"
                  onClick={() => {
                    if (confirm("Remove this set from the collection?")) {
                      removeSetFromCollection(collectionId, set.worksheetId);
                    }
                  }}
                >
                  Remove
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
