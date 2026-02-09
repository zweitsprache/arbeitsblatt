"use client";

import dynamic from "next/dynamic";

const AccountView = dynamic(
  () => import("@neondatabase/auth/react").then((mod) => mod.AccountView),
  { ssr: false }
);

export function AccountViewWrapper({ path }: { path: string }) {
  return <AccountView path={path} hideNav />;
}
