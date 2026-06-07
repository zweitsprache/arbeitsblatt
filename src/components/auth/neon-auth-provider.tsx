"use client";

// @ts-ignore - Type mismatch due to nested auth library versions
import { NeonAuthUIProvider } from "@neondatabase/auth/react";
import { authClient } from "@/lib/auth/client";

export function NeonAuthProvider({
  locale,
  children,
}: {
  locale: string;
  children: React.ReactNode;
}) {
  return (
    <NeonAuthUIProvider
      authClient={authClient as any}
      redirectTo={`/${locale}/account/settings`}
    >
      {children}
    </NeonAuthUIProvider>
  );
}