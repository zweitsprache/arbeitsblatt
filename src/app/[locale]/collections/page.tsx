import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { CollectionDashboard } from "@/components/collection-editor/collection-dashboard";
import { CollectionProvider } from "@/store/collection-store";
import { setRequestLocale } from "next-intl/server";

export default async function CollectionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <DashboardLayout>
      <CollectionProvider>
        <CollectionDashboard />
      </CollectionProvider>
    </DashboardLayout>
  );
}
