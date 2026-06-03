import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { setRequestLocale } from "next-intl/server";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <DashboardLayout>
      <DashboardOverview />
    </DashboardLayout>
  );
}
