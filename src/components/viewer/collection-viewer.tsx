"use client";

import React, { useState, useEffect } from "react";
import { CollectionHeader } from "./collection-header";
import { CollectionSetsList } from "./collection-sets-list";
import { CollectionLearningInterface } from "./collection-learning-interface";
import { Button } from "@/components/ui/button";
import { BookOpen, Grid } from "lucide-react";

interface CollectionSet {
  id: string;
  order: number;
  worksheet?: {
    id: string;
    title: string;
    blocks?: Array<{
      id: string;
      front: {
        text: string;
        image?: string;
      };
      back: {
        text: string;
        image?: string;
      };
    }>;
  };
}

interface CollectionViewerProps {
  collection: {
    id: string;
    title: string;
    description: string | null;
    sets: CollectionSet[];
  };
}

export function CollectionViewer({ collection }: CollectionViewerProps) {
  const [mode, setMode] = useState<"sequential" | "individual">("individual");
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Initialize selected set on first load
  useEffect(() => {
    if (!selectedSetId && collection.sets.length > 0) {
      setSelectedSetId(collection.sets[0].id);
    }
  }, [collection.sets, selectedSetId]);

  const handleSelectSet = (setId: string, _worksheetId: string) => {
    setSelectedSetId(setId);
    setMode("individual");
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row">
      {/* Header - Full width */}
      <div className="w-full md:hidden">
        <CollectionHeader
          title={collection.title}
          description={collection.description}
          setCount={collection.sets.length}
        />
      </div>

      {/* Sidebar - Desktop */}
      <div className="hidden md:flex md:w-80 bg-gray-50 border-r flex-col p-6 space-y-4">
        <CollectionHeader
          title={collection.title}
          description={collection.description}
          setCount={collection.sets.length}
        />

        <div className="border-t pt-4">
          <div className="space-y-2 mb-4">
            <label className="text-sm font-medium text-gray-700">Learning Mode</label>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={mode === "individual" ? "default" : "outline"}
                onClick={() => setMode("individual")}
                className="flex-1 text-xs gap-1"
              >
                <Grid className="w-3 h-3" />
                Individual
              </Button>
              <Button
                size="sm"
                variant={mode === "sequential" ? "default" : "outline"}
                onClick={() => setMode("sequential")}
                className="flex-1 text-xs gap-1"
              >
                <BookOpen className="w-3 h-3" />
                Sequential
              </Button>
            </div>
          </div>

          {mode === "individual" && (
            <CollectionSetsList
              sets={collection.sets}
              selectedSetId={selectedSetId}
              onSelectSet={handleSelectSet}
            />
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 p-4 sm:p-6 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Mobile controls */}
          <div className="md:hidden space-y-3">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={mode === "individual" ? "default" : "outline"}
                onClick={() => setMode("individual")}
                className="flex-1 text-xs gap-1"
              >
                <Grid className="w-3 h-3" />
                Individual
              </Button>
              <Button
                size="sm"
                variant={mode === "sequential" ? "default" : "outline"}
                onClick={() => setMode("sequential")}
                className="flex-1 text-xs gap-1"
              >
                <BookOpen className="w-3 h-3" />
                Sequential
              </Button>
            </div>

            {mode === "individual" && (
              <Button
                variant="outline"
                className="w-full text-sm"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? "Hide Sets" : "Show Sets"}
              </Button>
            )}
          </div>

          {/* Mobile set selector */}
          {isMobileMenuOpen && mode === "individual" && (
            <CollectionSetsList
              sets={collection.sets}
              selectedSetId={selectedSetId}
              onSelectSet={handleSelectSet}
            />
          )}

          {/* Learning interface */}
          <CollectionLearningInterface
            sets={collection.sets}
            selectedSetId={selectedSetId}
            mode={mode}
          />
        </div>
      </div>
    </div>
  );
}
