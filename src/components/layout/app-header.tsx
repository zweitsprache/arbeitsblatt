"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { routing } from "@/i18n/routing";
import { UserButton } from "@neondatabase/auth/react";

const localeLabels: Record<string, string> = {
  de: "DE",
  en: "EN",
};

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("header");
  const isEditor = pathname.startsWith("/editor");

  function switchLocale(newLocale: string) {
    router.replace(pathname, { locale: newLocale });
  }

  return (
    <header className="h-14 shadow-[0_2px_8px_rgba(0,0,0,0.08)] bg-background flex items-center px-4 shrink-0 z-30">
      {/* Logo / brand */}
      <Link
        href="/"
        className="flex items-center hover:opacity-80 transition-opacity"
      >
        <Image
          src="/logo/arbeitsblatt_logo_full_brand.svg"
          alt="Arbeitsblatt"
          width={160}
          height={32}
        />
      </Link>

      {/* Right actions */}
      <div className="ml-auto flex items-center gap-2">
        {!isEditor && (
          <Link href="/editor">
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              {t("newWorksheet")}
            </Button>
          </Link>
        )}

        {/* Language switcher */}
        <div className="flex items-center rounded-md border border-border overflow-hidden text-xs">
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
        <UserButton size="icon" />
      </div>
    </header>
  );
}
