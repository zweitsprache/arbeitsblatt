import { AuthView } from "@neondatabase/auth/react";
import { setRequestLocale } from "next-intl/server";
import { SignupVerificationFlow } from "@/components/auth/signup-verification-flow";

export default async function AuthPage({
  params,
}: {
  params: Promise<{ locale: string; path: string }>;
}) {
  const { locale, path } = await params;
  setRequestLocale(locale);
  const useCustomAuthFlow =
    path === "sign-in" || path === "sign-up" || path === "verify-email-code";

  return (
    <main
      className={
        useCustomAuthFlow
          ? "min-h-screen bg-[#d8d6e1] px-4 py-6 sm:px-6 lg:px-10 lg:py-10"
          : "flex min-h-screen flex-col items-center justify-center p-4"
      }
    >
      {useCustomAuthFlow ? (
        <SignupVerificationFlow locale={locale} path={path} />
      ) : (
        <AuthView path={path} />
      )}
    </main>
  );
}
