import { setRequestLocale } from "next-intl/server";
import { ClientsDashboard } from "@/components/admin/clients-dashboard";

export default async function ClientsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <ClientsDashboard />;
}
