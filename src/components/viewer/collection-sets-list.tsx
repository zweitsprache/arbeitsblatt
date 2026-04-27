"use client";

import React from "react";
import { Button } from "@/components/ui/button";

interface CollectionSet {
  id: string;
  order: number;
  worksheet?: {
    id: string;
    title: string;
  };
}

interface CollectionSetsListProps {
  sets: CollectionSet[];
  selectedSetId: string | null;
  onSelectSet: (setId: string, worksheetId: string) => void;
}

export function CollectionSetsList({
  sets,
  selectedSetId,
  onSelectSet,
}: CollectionSetsListProps) {
  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-lg text-gray-900">Browse Sets</h2>
      <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {sets.map((set) => (
          <Button
            key={set.id}
            variant={selectedSetId === set.id ? "default" : "outline"}
            onClick={() => {
              if (set.worksheet) {
                onSelectSet(set.id, set.worksheet.id);
              }
            }}
            className="justify-start text-left h-auto py-3 px-3 whitespace-normal truncate"
          >
            <span className="flex flex-col w-full">
              <span className="text-xs text-gray-500 mb-1">
                Set {set.order + 1}
              </span>
              <span className="font-medium truncate">
                {set.worksheet?.title || "Loading..."}
              </span>
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
}
