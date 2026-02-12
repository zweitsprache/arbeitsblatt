import { CardDashboard } from "@/components/dashboard/card-dashboard";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { setRequestLocale } from "next-intl/server";

export default async function CardsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <DashboardLayout>
      <CardDashboard />
    </DashboardLayout>
  );
}
