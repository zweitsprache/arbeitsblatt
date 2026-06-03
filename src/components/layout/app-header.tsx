"use client";

import dynamic from "next/dynamic";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { FilePen, Home } from "lucide-react";
import { routing } from "@/i18n/routing";

const UserButton = dynamic(
  () =>
    import("@neondatabase/auth/react").then((mod) => ({
      default: mod.UserButton,
    })),
  { ssr: false },
);

const localeLabels: Record<string, string> = {
  de: "DE",
  en: "EN",
};

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const isDashboardHome = pathname === "/";
  const isEditorPage = pathname.startsWith("/editor");

  function switchLocale(newLocale: string) {
    router.replace(pathname, { locale: newLocale });
  }

  return (
    <header className="h-14 shadow-[0_2px_8px_rgba(0,0,0,0.08)] bg-background flex items-center pl-6 pr-4 shrink-0 z-30">
      {isDashboardHome && (
        <div className="flex items-center gap-2 text-foreground">
          <Home className="h-4 w-4" />
          <span className="text-base font-semibold tracking-tight">Startseite</span>
        </div>
      )}
      {!isDashboardHome && isEditorPage && (
        <div className="flex items-center gap-2 text-foreground">
          <FilePen className="h-4 w-4" />
          <span className="text-base font-semibold tracking-tight">Editor</span>
        </div>
      )}

      {/* Right actions */}
      <div className="ml-auto flex items-center gap-4">
        {/* Language switcher */}
        <div className="flex items-center rounded-[4px] border border-border overflow-hidden text-xs">
          {routing.locales.map((l) => (
            <button
              key={l}
              onClick={() => switchLocale(l)}
              className={`px-2 py-1 font-medium transition-colors cursor-pointer ${
                l === locale
                  ? "bg-foreground text-background"
                  : "bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              {localeLabels[l] ?? l.toUpperCase()}
            </button>
          ))}
        </div>

        {/* User menu */}
        <div className="scale-110 origin-center [&_[data-slot=avatar-fallback]]:text-[10px] [&_.avatar-fallback]:text-[10px]">
          <UserButton size="icon" />
        </div>
      </div>
    </header>
  );
}
