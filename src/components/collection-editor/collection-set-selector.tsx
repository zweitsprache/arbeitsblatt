"use client";

import React, { useState, useEffect } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { useCollection } from "@/store/collection-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CollectionSetSelectorProps {
  collectionId: string;
  onClose: () => void;
}

interface WorksheetItem {
  id: string;
  title: string;
  slug: string;
  type: string;
}

export function CollectionSetSelector({
  collectionId,
  onClose,
}: CollectionSetSelectorProps) {
  const { addSetToCollection, state } = useCollection();
  const [availableSets, setAvailableSets] = useState<WorksheetItem[]>([]);
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchFlashcardSets = async () => {
      try {
        const res = await authFetch("/api/worksheets?type=flashcards");
        if (res.ok) {
          const data = await res.json();
          // Filter out sets already in the collection
          const filtered = data.filter(
            (set: WorksheetItem) =>
              !state.currentCollection?.sets?.some((s) => s.worksheetId === set.id)
          );
          setAvailableSets(filtered);
        }
      } catch (error) {
        console.error("Failed to fetch flashcard sets:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFlashcardSets();
  }, [state.currentCollection?.sets]);

  const filteredSets = availableSets.filter((set) =>
    set.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async () => {
    if (!selectedSetId) return;
    await addSetToCollection(collectionId, selectedSetId);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-4">
          <h2 className="text-lg font-semibold">Add Flashcard Set</h2>
        </div>

        <div className="p-4 space-y-4">
          <Input
            placeholder="Search sets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading sets...</div>
          ) : filteredSets.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {availableSets.length === 0
                ? "No flashcard sets available"
                : "No matching sets"}
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredSets.map((set) => (
                <div
                  key={set.id}
                  className={`p-3 border rounded cursor-pointer transition-colors ${
                    selectedSetId === set.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => setSelectedSetId(set.id)}
                >
                  <div className="font-medium text-sm">{set.title}</div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 sticky bottom-0 bg-white border-t pt-4 mt-4">
            <Button
              onClick={handleAdd}
              disabled={!selectedSetId || state.isSaving}
              className="flex-1"
            >
              {state.isSaving ? "Adding..." : "Add"}
            </Button>
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
