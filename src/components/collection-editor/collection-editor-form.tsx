"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCollection } from "@/store/collection-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CollectionEditorFormProps {
  collectionId?: string;
  onSave?: () => void;
}

export function CollectionEditorForm({ collectionId, onSave }: CollectionEditorFormProps) {
  const router = useRouter();
  const { state, fetchCollection, createCollection, updateCollection } = useCollection();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(!!collectionId);

  useEffect(() => {
    if (collectionId) {
      setIsLoading(true);
      fetchCollection(collectionId).finally(() => setIsLoading(false));
    }
  }, [collectionId, fetchCollection]);

  useEffect(() => {
    if (state.currentCollection) {
      setTitle(state.currentCollection.title);
      setDescription(state.currentCollection.description || "");
    }
  }, [state.currentCollection]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert("Title is required");
      return;
    }

    if (collectionId) {
      await updateCollection(collectionId, {
        title,
        description,
      });
    } else {
      const result = await createCollection({
        title,
        description,
      });
      if (result) {
        router.push(`/editor/collections/${result.id}`);
        onSave?.();
        return;
      }
    }

    onSave?.();
  };

  if (isLoading) {
    return <div className="p-6 text-center">Loading...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
      <div>
        <label htmlFor="title" className="block text-sm font-medium mb-1">
          Title *
        </label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="My Flashcard Collection"
          required
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium mb-1">
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description for your collection"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          rows={3}
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={state.isSaving}>
          {state.isSaving ? "Saving..." : collectionId ? "Update" : "Create"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
      </div>

      {state.error && <div className="text-red-600 text-sm">{state.error}</div>}
    </form>
  );
}
