import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { CoverDashboard } from "@/components/dashboard/cover-dashboard";
import { setRequestLocale } from "next-intl/server";

export default async function CoversPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <DashboardLayout>
      <CoverDashboard />
    </DashboardLayout>
  );
}
