"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const localeLabels: Record<string, string> = {
  de: "DE",
  en: "EN",
};

interface ProjectHeaderProps {
  brandLogo?: string | null;
  projectName: string;
}

export function ProjectHeader({ brandLogo, projectName }: ProjectHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();

  function switchLocale(newLocale: string) {
    router.replace(pathname, { locale: newLocale });
  }

  return (
    <>
      {/* Mobile header */}
      <div className="lg:hidden sticky top-0 z-30 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1 flex items-center">
            {brandLogo ? (
              <img src={brandLogo} alt={projectName} className="h-8 w-auto" />
            ) : (
              <p className="text-sm font-medium truncate">{projectName}</p>
            )}
          </div>
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
        </div>
      </div>

      {/* Desktop header — same style as course viewer top bar */}
      <div className="hidden lg:flex items-center gap-2 px-6 2xl:px-8 py-5 text-cv-xs text-muted-foreground shrink-0 bg-white border-b">
        {brandLogo ? (
          <img src={brandLogo} alt={projectName} className="h-8 w-auto mr-2" />
        ) : (
          <span className="text-base font-semibold text-foreground mr-2">{projectName}</span>
        )}
        <div className="ml-auto flex items-center gap-3">
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
        </div>
      </div>
    </>
  );
}
