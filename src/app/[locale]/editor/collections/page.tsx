import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { CollectionEditorForm } from "@/components/collection-editor/collection-editor-form";
import { CollectionProvider } from "@/store/collection-store";
import { setRequestLocale } from "next-intl/server";

export default async function CreateCollectionPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <DashboardLayout>
      <CollectionProvider>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Create Collection</h1>
            <p className="text-gray-600 mt-2">
              Create a new collection to organize your flashcard sets
            </p>
          </div>
          <CollectionEditorForm />
        </div>
      </CollectionProvider>
    </DashboardLayout>
  );
}
