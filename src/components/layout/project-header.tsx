"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

/** Fallback logo when client has no custom brand logo */
const DEFAULT_LOGO = "/logo/arbeitsblatt_logo_full_brand.svg";

const localeLabels: Record<string, string> = {
  de: "DE",
  en: "EN",
};

/** Map UI locale codes to flag SVG filenames in /public/flags/ */
const LOCALE_FLAG_CODES: Record<string, string> = {
  de: "ch",
  en: "gb",
};

interface ProjectHeaderProps {
  brandLogo?: string | null;
  projectName: string;
}

export function ProjectHeader({ brandLogo, projectName }: ProjectHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const logo = brandLogo || DEFAULT_LOGO;

  function switchLocale(newLocale: string) {
    router.replace(pathname, { locale: newLocale });
  }

  return (
    <>
      {/* Mobile header */}
      <div className="lg:hidden sticky top-0 z-30 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1 flex items-center">
            <img src={logo} alt={projectName} className="h-8 w-auto" />
          </div>
          <div className="flex items-center gap-1">
            <div className="flex items-center rounded-sm border bg-background/50 overflow-hidden">
              {routing.locales.map((l) => {
                const flagCode = LOCALE_FLAG_CODES[l];
                return (
                  <button
                    key={l}
                    onClick={() => switchLocale(l)}
                    className={`px-2 py-1 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                      l === locale
                        ? "bg-slate-200 text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    {flagCode && (
                      <img src={`/flags/${flagCode}.svg`} alt="" className="inline-block w-[1.2em] h-[0.9em] object-cover rounded-[1px]" />
                    )}
                    {localeLabels[l] ?? l.toUpperCase()}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop header — same style as course viewer top bar */}
      <div className="hidden lg:flex items-center gap-2 px-6 2xl:px-8 py-5 text-cv-xs text-muted-foreground shrink-0 bg-white border-b">
        <img src={logo} alt={projectName} className="h-8 w-auto mr-2" />
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="flex items-center rounded-sm border bg-background/50 overflow-hidden">
              {routing.locales.map((l) => {
                const flagCode = LOCALE_FLAG_CODES[l];
                return (
                  <button
                    key={l}
                    onClick={() => switchLocale(l)}
                    className={`px-2 py-1 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                      l === locale
                        ? "bg-slate-200 text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    {flagCode && (
                      <img src={`/flags/${flagCode}.svg`} alt="" className="inline-block w-[1.2em] h-[0.9em] object-cover rounded-[1px]" />
                    )}
                    {localeLabels[l] ?? l.toUpperCase()}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
