import { AccountView } from "@neondatabase/auth/react";
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
    <main className="container mx-auto max-w-2xl p-4 md:p-6">
      <AccountView path={path} />
    </main>
  );
}
