import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { CollectionProvider } from "@/store/collection-store";
import { EditCollectionContent } from "@/components/collection-editor/edit-collection-content";

interface CollectionEditPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function CollectionEditPage({
  params,
}: CollectionEditPageProps) {
  const { id } = await params;

  return (
    <DashboardLayout>
      <CollectionProvider>
        <EditCollectionContent collectionId={id} />
      </CollectionProvider>
    </DashboardLayout>
  );
}
