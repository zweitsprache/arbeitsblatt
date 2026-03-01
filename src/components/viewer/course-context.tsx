"use client";

import React, { createContext, useContext, useState, useMemo } from "react";
import { CourseModule, CourseTranslation, SidebarTheme } from "@/types/course";
import { WorksheetBlock, WorksheetSettings, Brand } from "@/types/worksheet";

export interface WorksheetData {
  id: string;
  title: string;
  slug: string;
  blocks: WorksheetBlock[];
  settings: WorksheetSettings;
}

export interface CourseContextInitial {
  id: string;
  slug: string;
  title: string;
  description?: string;
  languageLevel?: string;
  image?: string | null;
  brand: Brand;
  sidebarTheme: SidebarTheme;
  structure: CourseModule[];
  worksheets: Record<string, WorksheetData>;
  /** Pulled translations keyed by language code (e.g. "en", "uk") */
  translations?: Record<string, CourseTranslation>;
}

export interface CourseContextValue extends CourseContextInitial {
  /** Currently active content language ("de" = base, or a translation code) */
  contentLocale: string;
  /** Available content languages (always includes "de") */
  availableLocales: string[];
  /** Switch the viewer to a different content language */
  setContentLocale: (locale: string) => void;
}

const CourseContext = createContext<CourseContextValue | null>(null);

export function CourseProvider({
  value,
  children,
}: {
  value: CourseContextInitial;
  children: React.ReactNode;
}) {
  const [contentLocale, setContentLocale] = useState("de");

  const availableLocales = useMemo(() => {
    const locales = ["de"];
    if (value.translations) {
      for (const lang of Object.keys(value.translations)) {
        if (!locales.includes(lang)) locales.push(lang);
      }
    }
    return locales;
  }, [value.translations]);

  // When a translation is active, swap in the translated structure/settings
  const resolved = useMemo<CourseContextValue>(() => {
    if (contentLocale === "de" || !value.translations?.[contentLocale]) {
      return { ...value, contentLocale, availableLocales, setContentLocale };
    }
    const t = value.translations[contentLocale];
    return {
      ...value,
      structure: t.structure,
      title: t.coverSettings.title || value.title,
      description: t.settings.description || value.description,
      contentLocale,
      availableLocales,
      setContentLocale,
    };
  }, [value, contentLocale, availableLocales]);

  return (
    <CourseContext.Provider value={resolved}>{children}</CourseContext.Provider>
  );
}

export function useCourse() {
  const ctx = useContext(CourseContext);
  if (!ctx) throw new Error("useCourse must be used within a CourseProvider");
  return ctx;
}
