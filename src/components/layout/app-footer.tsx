"use client";

import { useTranslations } from "next-intl";

export function AppFooter() {
  const t = useTranslations("footer");

  return (
    <footer className="h-10 border-t border-border bg-background flex items-center justify-center px-4 shrink-0 text-xs text-muted-foreground">
      <p>
        {t("copyright", { year: new Date().getFullYear() })}
      </p>
    </footer>
  );
}
