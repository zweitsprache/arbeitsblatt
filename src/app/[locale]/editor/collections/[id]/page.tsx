"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { CollectionEditorForm } from "@/components/collection-editor/collection-editor-form";
import { CollectionSetList } from "@/components/collection-editor/collection-set-list";
import { CollectionSetSelector } from "@/components/collection-editor/collection-set-selector";
import { CollectionProvider, useCollection } from "@/store/collection-store";

interface CollectionEditPageProps {
  params: Promise<{ locale: string; id: string }>;
}

function EditCollectionContent({ collectionId }: { collectionId: string }) {
  const { fetchCollection } = useCollection();
  const [showSelector, setShowSelector] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      await fetchCollection(collectionId);
      setIsLoading(false);
    };
    load();
  }, [collectionId, fetchCollection]);

  if (isLoading) {
    return <div className="p-6 text-center">Loading collection...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-6">Edit Collection</h1>
        <CollectionEditorForm collectionId={collectionId} />
      </div>

      <div className="border-t pt-8">
        <CollectionSetList
          collectionId={collectionId}
          onAddSet={() => setShowSelector(true)}
        />
      </div>

      {showSelector && (
        <CollectionSetSelector
          collectionId={collectionId}
          onClose={() => setShowSelector(false)}
        />
      )}
    </div>
  );
}

export default async function CollectionEditPage({
  params,
}: CollectionEditPageProps) {
  const { locale, id } = await params;

  return (
    <DashboardLayout>
      <CollectionProvider>
        <EditCollectionContent collectionId={id} />
      </CollectionProvider>
    </DashboardLayout>
  );
}
