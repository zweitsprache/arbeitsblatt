import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function EditAiToolPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  redirect(`/${locale}/ai-tools`);

  return (
    <DashboardLayout>
      <div />
    </DashboardLayout>
  );
}
