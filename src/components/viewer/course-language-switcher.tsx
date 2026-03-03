"use client";

import React from "react";
import { useCourse } from "./course-context";
import { Globe } from "lucide-react";
import "flag-icons/css/flag-icons.min.css";

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

/** Map language codes to flag-icons country codes (ISO 3166-1 alpha-2) */
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
  ru: "ru",
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
      <div className="flex items-center rounded-md border bg-background/50 overflow-hidden">
        {availableLocales.map((locale) => {
          const isActive = locale === contentLocale;
          const flagCode = LANGUAGE_FLAG_CODES[locale];
          return (
            <button
              key={locale}
              onClick={() => setContentLocale(locale)}
              className={`
                px-2 py-1 text-xs font-medium transition-colors flex items-center gap-1.5
                ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }
              `}
              title={LANGUAGE_LABELS[locale] ?? locale}
            >
              {flagCode && <span className={`fi fi-${flagCode}`} style={{ fontSize: "0.875rem" }} />}
              {locale.toUpperCase()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
