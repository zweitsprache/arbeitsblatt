"use client";

import React from "react";
import { useCourse } from "./course-context";
import { Globe } from "lucide-react";

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
  ru: "Русский",
};

/** Flag emoji for content languages */
const LANGUAGE_FLAGS: Record<string, string> = {
  de: "🇩🇪",
  en: "🇬🇧",
  uk: "🇺🇦",
  fr: "🇫🇷",
  es: "🇪🇸",
  it: "🇮🇹",
  pt: "🇵🇹",
  tr: "🇹🇷",
  ar: "🇸🇦",
  pl: "🇵🇱",
  ru: "🇷🇺",
};

/**
 * Compact language switcher for the course viewer breadcrumb bar.
 * Only renders when translations are available (more than just "de").
 */
export function CourseLanguageSwitcher() {
  const { contentLocale, availableLocales, setContentLocale } = useCourse();

  // Don't show if only the base language is available
  if (availableLocales.length <= 1) return null;

  return (
    <div className="flex items-center gap-1">
      <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <div className="flex items-center rounded-md border bg-background/50 overflow-hidden">
        {availableLocales.map((locale) => {
          const isActive = locale === contentLocale;
          return (
            <button
              key={locale}
              onClick={() => setContentLocale(locale)}
              className={`
                px-2 py-1 text-xs font-medium transition-colors
                ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }
              `}
              title={LANGUAGE_LABELS[locale] ?? locale}
            >
              <span className="mr-1">{LANGUAGE_FLAGS[locale] ?? ""}</span>
              {locale.toUpperCase()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
