import { AiToolDashboard } from "@/components/dashboard/ai-tool-dashboard";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { setRequestLocale } from "next-intl/server";

export default async function AiToolsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <DashboardLayout>
      <AiToolDashboard />
    </DashboardLayout>
  );
}
