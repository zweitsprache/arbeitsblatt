"use client";

import React from "react";

/** Human-readable labels for content languages */
const LANGUAGE_LABELS: Record<string, string> = {
  de: "Deutsch",
  en: "English",
  uk: "Українська",
  fr: "Français",
  es: "Español",
  it: "Italiano",
  pt: "Português",
  tr: "Türkçe",
  ar: "العربية",
  pl: "Polski",
};

/** Map language codes to flag SVG filenames in /public/flags/ */
const LANGUAGE_FLAG_CODES: Record<string, string> = {
  de: "ch",
  en: "gb",
  uk: "ua",
  fr: "fr",
  es: "es",
  it: "it",
  pt: "pt",
  tr: "tr",
  ar: "sa",
  pl: "pl",
};

interface WorksheetLanguageSwitcherProps {
  contentLocale: string;
  availableLocales: string[];
  setContentLocale: (locale: string) => void;
}

/**
 * Compact language switcher for the worksheet viewer.
 * Only renders when translated languages are available (more than just "de").
 */
export function WorksheetLanguageSwitcher({
  contentLocale,
  availableLocales,
  setContentLocale,
}: WorksheetLanguageSwitcherProps) {
  if (availableLocales.length <= 1) return null;

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center overflow-hidden rounded-sm border bg-background/50">
        {availableLocales.map((locale) => {
          const isActive = locale === contentLocale;
          const flagCode = LANGUAGE_FLAG_CODES[locale];
          return (
            <button
              key={locale}
              onClick={() => setContentLocale(locale)}
              className={`
                flex items-center gap-1.5 px-2 py-1 text-xs font-medium transition-colors
                ${
                  isActive
                    ? "bg-slate-200 text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }
              `}
              title={LANGUAGE_LABELS[locale] ?? locale}
            >
              {flagCode && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/flags/${flagCode}.svg`}
                  alt=""
                  className="inline-block h-[0.9em] w-[1.2em] rounded-[1px] object-cover"
                />
              )}
              {locale.toUpperCase()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
