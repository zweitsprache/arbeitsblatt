import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth/server";
import { isAdmin } from "@/lib/auth/is-admin";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  let session;
  try {
    const result = await auth.getSession();
    session = result.data;
  } catch {
    redirect(`/${locale}/auth/sign-in`);
  }

  if (!session?.user) {
    redirect(`/${locale}/auth/sign-in`);
  }

  if (!isAdmin(session.user.id)) {
    redirect(`/${locale}`);
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
