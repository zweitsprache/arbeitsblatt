import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth/server";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { CourseDashboard } from "@/components/dashboard/course-dashboard";

export const dynamic = "force-dynamic";

export default async function CoursesPage({
  params,
}: {
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

  return (
    <DashboardLayout>
      <CourseDashboard />
    </DashboardLayout>
  );
}
