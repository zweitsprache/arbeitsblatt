"use client";

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
      authClient={authClient}
      redirectTo={`/${locale}/account/settings`}
    >
      {children}
    </NeonAuthUIProvider>
  );
}