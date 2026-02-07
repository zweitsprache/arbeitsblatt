import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { WorksheetDashboard } from "@/components/dashboard/worksheet-dashboard";
import { setRequestLocale } from "next-intl/server";

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <DashboardLayout>
      <WorksheetDashboard />
    </DashboardLayout>
  );
}
