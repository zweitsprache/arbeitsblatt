"use client";

import { useCourse } from "@/components/viewer/course-context";
import Link from "next/link";
import {
  BookOpen,
  File,
  ArrowRight,
  ToyBrick,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DynamicLucideIcon } from "@/components/ui/lucide-icon-picker";
import { BRAND_FONTS, getStaticBrandProfile } from "@/types/worksheet";
import { CoursePageNav } from "@/components/viewer/course-page-nav";

export default function CourseOverviewPage() {
  const {
    title,
    description,
    languageLevel,
    structure,
    brand,
    brandProfile,
    viewerBasePath,
  } = useCourse();

  const brandKey = brand ?? "edoomio";
  const staticBrandFonts = BRAND_FONTS[brandKey] ?? BRAND_FONTS.edoomio;
  const resolvedBrandProfile = brandProfile ?? getStaticBrandProfile(brandKey);
  const primaryColor = resolvedBrandProfile.primaryColor || staticBrandFonts.primaryColor;
  const firstModule = structure[0] ?? null;

  return (
    <div className="max-w-5xl mx-auto px-6 sm:px-10 lg:px-16 pt-6 pb-10 lg:pt-8 lg:pb-14">
        {/* Hero */}
        <div className="mb-10">
          <div className="flex items-center gap-4">
            <div className="shrink-0 w-[5.5rem] flex items-center">
              <div
                className="h-[4.5rem] w-[4.5rem] rounded-sm flex items-center justify-center"
                style={{ backgroundColor: primaryColor }}
              >
                <BookOpen className="h-10 w-10 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: primaryColor }}>
                {title}
              </h1>
              {description && (
                <p className="mt-2 text-base leading-relaxed max-w-2xl">
                  {description}
                </p>
              )}
              {languageLevel && (
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <Badge variant="secondary" className="text-xs">
                    {languageLevel}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* TOC */}
        <div className="space-y-0">
          {structure.map((mod, i) => (
            <div key={mod.id} className="py-5">
              {/* Module row */}
              <Link
                href={`${viewerBasePath}/${mod.id}`}
                className="group flex items-center gap-4 w-full text-left"
              >
                <span
                  className="shrink-0 h-8 w-8 rounded-sm flex items-center justify-center text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  {mod.icon ? (
                    <DynamicLucideIcon name={mod.icon} className="h-4 w-4 text-white" />
                  ) : (
                    <ToyBrick className="h-4 w-4 text-white" />
                  )}
                </span>
                {/* Number */}
                <span className="shrink-0 w-10 text-xl font-bold tabular-nums text-center">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {/* Title */}
                <span className="flex-1 font-bold text-xl truncate">
                  {mod.title || "Untitled Module"}
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </Link>

              {/* Topics + lessons */}
              {mod.topics.length > 0 && (
                <div className="mt-3 ml-[4.25rem] border-l border-border pl-9 space-y-3">
                  {mod.topics.map((topic) => (
                    <div key={topic.id}>
                      <Link
                        href={`${viewerBasePath}/${mod.id}/${topic.id}`}
                        className="group/topic flex w-full items-center gap-1 text-lg font-semibold mb-1.5"
                      >
                        <span className="flex-1 truncate">{topic.title}</span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover/topic:opacity-100 shrink-0" />
                      </Link>
                      <ul className="border-y border-border/60 divide-y divide-border/60">
                        {topic.lessons.map((lesson) => (
                          <li key={lesson.id}>
                            <Link
                              href={`${viewerBasePath}/${mod.id}/${topic.id}/${lesson.id}`}
                              className="group/lesson flex w-full items-center gap-2 py-1.5 text-lg"
                            >
                              <File className="h-4 w-4 shrink-0" style={{ color: primaryColor }} />
                              <span className="flex-1 truncate">{lesson.title || "Untitled Lesson"}</span>
                              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover/lesson:opacity-100 shrink-0" />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {structure.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No modules in this course yet.</p>
          </div>
        )}

        <CoursePageNav
          next={firstModule ? {
            href: `${viewerBasePath}/${firstModule.id}`,
            title: firstModule.title || "Untitled Module",
          } : null}
        />
    </div>
  );
}
