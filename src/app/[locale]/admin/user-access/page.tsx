import { setRequestLocale } from "next-intl/server";
import { UserAccessDashboard } from "@/components/admin/user-access-dashboard";

export default async function UserAccessPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <UserAccessDashboard />;
}