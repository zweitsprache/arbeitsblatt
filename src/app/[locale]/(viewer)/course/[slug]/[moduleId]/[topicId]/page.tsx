"use client";

import { useCourse } from "@/components/viewer/course-context";
import Link from "next/link";
import { useParams, notFound } from "next/navigation";
import { ArrowRight, File, FileText } from "lucide-react";
import { BRAND_FONTS } from "@/types/worksheet";
import { CoursePageNav } from "@/components/viewer/course-page-nav";

export default function TopicPage() {
  const { structure, brand } = useCourse();
  const { locale, slug, moduleId, topicId } = useParams<{
    locale: string;
    slug: string;
    moduleId: string;
    topicId: string;
  }>();

  const mod = structure.find((m) => m.id === moduleId);
  if (!mod) notFound();

  const topic = mod.topics.find((t) => t.id === topicId);
  if (!topic) notFound();

  const primaryColor = BRAND_FONTS[brand ?? "edoomio"]?.primaryColor ?? BRAND_FONTS.edoomio.primaryColor;
  const firstLesson = topic.lessons[0] ?? null;

  return (
    <div className="max-w-5xl mx-auto px-6 sm:px-10 lg:px-16 pt-6 pb-10 lg:pt-8 lg:pb-14">
      {/* Hero */}
      <div className="mb-10">
        <h1 className="text-2xl sm:text-3xl font-bold text-left" style={{ color: primaryColor }}>
          {topic.title || "Untitled Topic"}
        </h1>
      </div>

      {/* Lessons grid */}
      <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
        {topic.lessons.map((lesson, i) => (
          <Link
            key={lesson.id}
            href={`/${locale}/course/${slug}/${moduleId}/${topicId}/${lesson.id}`}
            className="group border-t border-border bg-background p-5 transition-colors hover:bg-muted/30 sm:rounded-sm sm:border"
          >
            <div className="flex items-start gap-3">
              <File className="h-5 w-5 shrink-0 mt-0.5" style={{ color: primaryColor }} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-muted-foreground tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h2 className="mt-1 text-lg font-semibold leading-snug truncate">
                  {lesson.title || "Untitled Lesson"}
                </h2>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
            </div>
          </Link>
        ))}
      </div>

      {topic.lessons.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No lessons in this topic yet.</p>
        </div>
      )}

      <CoursePageNav
        prev={{
          href: `/${locale}/course/${slug}/${moduleId}`,
          title: mod.title || "Untitled Module",
        }}
        next={firstLesson ? {
          href: `/${locale}/course/${slug}/${moduleId}/${topicId}/${firstLesson.id}`,
          title: firstLesson.title || "Untitled Lesson",
        } : null}
      />
    </div>
  );
}
