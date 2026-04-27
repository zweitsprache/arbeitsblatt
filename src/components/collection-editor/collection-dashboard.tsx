"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useCollection } from "@/store/collection-store";
import { Button } from "@/components/ui/button";

export function CollectionDashboard() {
  const { state, fetchCollections, deleteCollection } = useCollection();

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  if (state.isLoading) {
    return <div className="p-6 text-center">Loading collections...</div>;
  }

  if (state.error) {
    return <div className="p-6 text-center text-red-600">Error: {state.error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Collections</h1>
        <Link href="/editor/collections">
          <Button>Create Collection</Button>
        </Link>
      </div>

      {state.collections.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No collections yet. Create one to get started!</p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {state.collections.map((collection) => (
            <div
              key={collection.id}
              className="border rounded-lg p-4 hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold text-lg truncate">{collection.title}</h3>
                  {collection.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {collection.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="text-xs text-gray-500 mb-3">
                {collection.sets?.length || 0} set{(collection.sets?.length || 0) !== 1 ? "s" : ""}
              </div>

              <div className="flex gap-2">
                <Link href={`/editor/collections/${collection.id}`} className="flex-1">
                  <Button variant="outline" className="w-full">
                    Edit
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => {
                    if (confirm("Are you sure you want to delete this collection?")) {
                      deleteCollection(collection.id);
                    }
                  }}
                >
                  Delete
                </Button>
              </div>

              <div className="mt-3 pt-3 border-t">
                <a
                  href={`/collection/${collection.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline"
                >
                  View public page →
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
