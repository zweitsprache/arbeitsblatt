import { AuthView } from "@neondatabase/auth/react";
import { setRequestLocale } from "next-intl/server";

export const dynamicParams = false;

export default async function AuthPage({
  params,
}: {
  params: Promise<{ locale: string; path: string }>;
}) {
  const { locale, path } = await params;
  setRequestLocale(locale);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <AuthView path={path} />
    </main>
  );
}
