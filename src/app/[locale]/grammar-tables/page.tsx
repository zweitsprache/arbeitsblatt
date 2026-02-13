import { GrammarTableDashboard } from "@/components/dashboard/grammar-table-dashboard";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { setRequestLocale } from "next-intl/server";

export default async function GrammarTablesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <DashboardLayout>
      <GrammarTableDashboard />
    </DashboardLayout>
  );
}
