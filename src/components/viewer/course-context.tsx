"use client";

import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { CourseModule, CourseCoverSettings, CourseSettings, SidebarTheme } from "@/types/course";
import { WorksheetBlock, WorksheetSettings, Brand } from "@/types/worksheet";
import { applyTranslations } from "@/lib/course-translation";

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
  coverSettings: CourseCoverSettings;
  settings: CourseSettings;
  worksheets: Record<string, WorksheetData>;
  /** Pulled translation strings keyed by language code (e.g. "en", "uk") */
  translations?: Record<string, Record<string, string>>;
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
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [contentLocale, setContentLocaleRaw] = useState(() => {
    const fromUrl = searchParams.get("lang");
    return fromUrl ?? "de";
  });

  const setContentLocale = useCallback((locale: string) => {
    setContentLocaleRaw(locale);
  }, []);

  // Sync contentLocale → URL search params
  useEffect(() => {
    const current = searchParams.get("lang");
    const target = contentLocale === "de" ? null : contentLocale;
    if (target !== current) {
      const params = new URLSearchParams(searchParams.toString());
      if (target) {
        params.set("lang", target);
      } else {
        params.delete("lang");
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }
  }, [contentLocale, pathname, router, searchParams]);

  const availableLocales = useMemo(() => {
    const locales = ["de"];
    if (value.translations) {
      for (const lang of Object.keys(value.translations)) {
        if (!locales.includes(lang) && !lang.startsWith("_")) locales.push(lang);
      }
    }
    return locales;
  }, [value.translations]);

  // When a translation is active, apply it dynamically to the current structure
  const resolved = useMemo<CourseContextValue>(() => {
    if (contentLocale === "de" || !value.translations?.[contentLocale]) {
      return { ...value, contentLocale, availableLocales, setContentLocale };
    }
    const translationStrings = value.translations[contentLocale];
    const translated = applyTranslations(
      {
        structure: value.structure,
        coverSettings: value.coverSettings,
        settings: value.settings,
      },
      translationStrings
    );
    return {
      ...value,
      structure: translated.structure,
      title: translated.coverSettings.title || value.title,
      description: translated.settings.description || value.description,
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
