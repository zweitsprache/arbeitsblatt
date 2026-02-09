import { AccountViewWrapper } from "@/components/auth/account-view-wrapper";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { setRequestLocale } from "next-intl/server";

export const dynamicParams = false;

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: string; path: string }>;
}) {
  const { locale, path } = await params;
  setRequestLocale(locale);

  return (
    <DashboardLayout>
      <div className="container mx-auto max-w-2xl p-4 md:p-6 overflow-auto">
        <AccountViewWrapper path={path} />
      </div>
    </DashboardLayout>
  );
}
