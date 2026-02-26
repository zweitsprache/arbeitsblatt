"use client";

import React, { createContext, useContext } from "react";
import { CourseModule, SidebarTheme } from "@/types/course";
import { WorksheetBlock, WorksheetSettings, Brand } from "@/types/worksheet";

export interface WorksheetData {
  id: string;
  title: string;
  slug: string;
  blocks: WorksheetBlock[];
  settings: WorksheetSettings;
}

export interface CourseContextValue {
  slug: string;
  title: string;
  description?: string;
  languageLevel?: string;
  image?: string | null;
  brand: Brand;
  sidebarTheme: SidebarTheme;
  structure: CourseModule[];
  worksheets: Record<string, WorksheetData>;
}

const CourseContext = createContext<CourseContextValue | null>(null);

export function CourseProvider({
  value,
  children,
}: {
  value: CourseContextValue;
  children: React.ReactNode;
}) {
  return (
    <CourseContext.Provider value={value}>{children}</CourseContext.Provider>
  );
}

export function useCourse() {
  const ctx = useContext(CourseContext);
  if (!ctx) throw new Error("useCourse must be used within a CourseProvider");
  return ctx;
}
