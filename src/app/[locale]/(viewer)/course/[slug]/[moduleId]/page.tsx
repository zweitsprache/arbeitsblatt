"use client";

import { useMemo } from "react";
import { useCourse } from "@/components/viewer/course-context";
import Link from "next/link";
import { useParams } from "next/navigation";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  File,
  Folder,
  BookOpen,
} from "lucide-react";
import { DynamicLucideIcon } from "@/components/ui/lucide-icon-picker";
import { BRAND_FONTS, WorksheetBlock } from "@/types/worksheet";
import { ViewerBlockRenderer } from "@/components/viewer/viewer-block-renderer";
import { BlockScreenshotButton } from "@/components/viewer/block-screenshot-button";
import { CoursePageNav } from "@/components/viewer/course-page-nav";
import { filterBlocksByDisplay } from "@/lib/block-visibility";

export default function ModulePage() {
  const { title, structure, brand, worksheets, id: courseId, accentColor } = useCourse();
  const { locale, slug, moduleId } = useParams<{
    locale: string;
    slug: string;
    moduleId: string;
  }>();

  const moduleIndex = structure.findIndex((m) => m.id === moduleId);
  const mod = structure[moduleIndex];

  if (!mod) {
    notFound();
  }

  const primaryColor = BRAND_FONTS[brand ?? "edoomio"]?.primaryColor ?? BRAND_FONTS.edoomio.primaryColor;
  const firstTopic = mod.topics[0] ?? null;

  const resolvedBlocks = useMemo(() => {
    const blocks: WorksheetBlock[] = [];
    for (const block of mod.blocks ?? []) {
      if (block.type === "linked-blocks") {
        const ws = worksheets[block.worksheetId];
        if (ws) {
          blocks.push(...ws.blocks);
        }
      } else {
        blocks.push(block);
      }
    }
    return blocks;
  }, [mod, worksheets]);

  const visibleBlocks = useMemo(() => filterBlocksByDisplay(resolvedBlocks, "course"), [resolvedBlocks]);

  return (
    <div className="max-w-5xl mx-auto px-6 sm:px-10 lg:px-16 pt-6 pb-10 lg:pt-8 lg:pb-14">
        {/* Hero */}
        <div className="mb-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-left" style={{ color: primaryColor }}>
            {mod.title || "Untitled Module"}
          </h1>
        </div>

        {visibleBlocks.length > 0 && (
          <div className="space-y-4 text-cv-base mb-10">
            {visibleBlocks.map((block) => (
              <div
                key={block.id}
                data-block-id={block.id}
                className="group/block relative"
              >
                <ViewerBlockRenderer block={block} mode="online" primaryColor={primaryColor} accentColor={accentColor} brand={brand} allBlocks={visibleBlocks} />
                <BlockScreenshotButton
                  courseId={courseId}
                  moduleId={moduleId}
                  blockId={block.id}
                />
              </div>
            ))}
          </div>
        )}

        {/* TOC */}
        <div className="space-y-0">
          {mod.topics.map((topic, i) => (
            <div key={topic.id} className="py-5">
              {/* Topic row */}
              <Link
                href={`/${locale}/course/${slug}/${moduleId}/${topic.id}`}
                className="group flex items-center gap-4 w-full text-left"
              >
                <span
                  className="shrink-0 h-8 w-8 rounded-sm flex items-center justify-center text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  {topic.icon ? (
                    <DynamicLucideIcon name={topic.icon} className="h-4 w-4 text-white" />
                  ) : (
                    <Folder className="h-4 w-4 text-white" />
                  )}
                </span>
                <span className="shrink-0 w-10 text-xl font-bold tabular-nums text-center">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex-1 font-bold text-xl truncate">
                  {topic.title || "Untitled Topic"}
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </Link>

              {topic.lessons.length > 0 && (
                <div className="mt-3 ml-[4.25rem] border-l border-border pl-9 space-y-3">
                  <ul className="border-y border-border/60 divide-y divide-border/60">
                    {topic.lessons.map((lesson) => (
                      <li key={lesson.id}>
                        <Link
                          href={`/${locale}/course/${slug}/${moduleId}/${topic.id}/${lesson.id}`}
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
              )}
            </div>
          ))}
        </div>

        {mod.topics.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No topics in this module yet.</p>
          </div>
        )}

        <CoursePageNav
          prev={{
            href: `/${locale}/course/${slug}`,
            title: title || "Untitled Course",
          }}
          next={firstTopic ? {
            href: `/${locale}/course/${slug}/${moduleId}/${firstTopic.id}`,
            title: firstTopic.title || "Untitled Topic",
          } : null}
        />
    </div>
  );
}
