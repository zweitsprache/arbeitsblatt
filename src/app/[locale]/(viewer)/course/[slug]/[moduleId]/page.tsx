"use client";

import { useTranslations } from "next-intl";
import { useCourse } from "@/components/viewer/course-context";
import { useParams, useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  Layers,
  BookOpen,
  ToyBrick,
  Folder,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DynamicLucideIcon } from "@/components/ui/lucide-icon-picker";
import { moduleNumber, topicNumber } from "@/types/course";

export default function ModulePage() {
  const { structure, slug } = useCourse();
  const { locale, moduleId } = useParams<{
    locale: string;
    slug: string;
    moduleId: string;
  }>();
  const router = useRouter();
  const t = useTranslations("common");

  const moduleIndex = structure.findIndex((m) => m.id === moduleId);
  const mod = structure[moduleIndex];

  if (!mod) {
    notFound();
  }

  const totalLessons = mod.topics.reduce(
    (s, t) => s + t.lessons.length,
    0
  );

  const prevModule = moduleIndex > 0 ? structure[moduleIndex - 1] : null;
  const nextModule =
    moduleIndex < structure.length - 1 ? structure[moduleIndex + 1] : null;

  return (
    <div className="max-w-5xl mx-auto px-6 sm:px-10 lg:px-16 py-10 lg:py-14">
        {/* Hero */}
        <div className="mb-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-14 w-14 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              {mod.icon ? (
                <DynamicLucideIcon name={mod.icon} className="h-8 w-8 text-primary" />
              ) : (
                <ToyBrick className="h-8 w-8 text-primary" />
              )}
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold">
                {moduleNumber(moduleIndex)} {mod.title || "Untitled Module"}
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <Badge variant="outline" className="text-xs">
              {mod.topics.length}{" "}
              {mod.topics.length === 1 ? "Topic" : "Topics"}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {totalLessons} {totalLessons === 1 ? "Lesson" : "Lessons"}
            </Badge>
          </div>
        </div>

        {/* Topic card grid */}
        <h2 className="text-lg font-semibold mb-4">Topics</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {mod.topics.map((topic, i) => {
            const lessonCount = topic.lessons.length;

            return (
              <button
                key={topic.id}
                onClick={() =>
                  router.push(
                    `/${locale}/course/${slug}/${moduleId}/${topic.id}`
                  )
                }
                className="group text-left rounded-lg overflow-hidden hover:shadow-md transition-all"
                style={{ backgroundColor: "#ECF3F9" }}
              >
                {topic.image && (
                  <div className="w-full h-36 overflow-x-clip overflow-y-hidden flex items-center justify-center">
                    <img
                      src={topic.image}
                      alt=""
                      className="h-full w-auto max-w-none object-contain group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                <div className="p-5">
                <div className="flex items-start gap-3">
                  {topic.icon ? (
                    <DynamicLucideIcon name={topic.icon} className="h-8 w-8 text-primary shrink-0" />
                  ) : (
                    <Folder className="h-8 w-8 text-primary shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base group-hover:text-primary transition-colors truncate">
                      <span className="font-extrabold">{topicNumber(moduleIndex, i)}</span>{" "}<span className="font-semibold">{topic.title || "Untitled Topic"}</span>
                    </h3>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5" />
                        {lessonCount}{" "}
                        {lessonCount === 1 ? "Lesson" : "Lessons"}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
                </div>
                </div>
              </button>
            );
          })}
        </div>

        {mod.topics.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Layers className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No topics in this module yet.</p>
          </div>
        )}

        {/* Prev / Next module navigation */}
        <div className="flex items-center gap-2 mt-10">
          {prevModule ? (
            <button
              className="flex-1 flex items-center gap-1.5 px-4 py-3 bg-background border rounded hover:bg-muted/50 transition-colors text-left group"
              onClick={() =>
                router.push(`/${locale}/course/${slug}/${prevModule.id}`)
              }
            >
              <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
              <div className="min-w-0">
                <span className="block !text-[16px] text-muted-foreground uppercase tracking-wider leading-snug">{t("previous")}</span>
                <span className="block !text-[16px] font-medium truncate leading-snug">{prevModule.title}</span>
              </div>
            </button>
          ) : (
            <div className="flex-1" />
          )}
          {nextModule ? (
            <button
              className="flex-1 flex items-center justify-end gap-1.5 px-4 py-3 bg-background border rounded hover:bg-muted/50 transition-colors text-right group"
              onClick={() =>
                router.push(`/${locale}/course/${slug}/${nextModule.id}`)
              }
            >
              <div className="min-w-0">
                <span className="block !text-[16px] text-muted-foreground uppercase tracking-wider leading-snug">{t("next")}</span>
                <span className="block !text-[16px] font-medium truncate leading-snug">{nextModule.title}</span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
            </button>
          ) : (
            <div className="flex-1" />
          )}
        </div>
    </div>
  );
}
