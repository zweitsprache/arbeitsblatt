"use client";

import { useCourse } from "@/components/viewer/course-context";
import { useParams, useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  Layers,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ModulePage() {
  const { structure, slug } = useCourse();
  const { locale, moduleId } = useParams<{
    locale: string;
    slug: string;
    moduleId: string;
  }>();
  const router = useRouter();

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
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <span>
              Module {moduleIndex + 1} of {structure.length}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            {mod.title || "Untitled Module"}
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-3">
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                className="group text-left rounded-lg border bg-background overflow-hidden hover:border-primary/40 hover:shadow-md transition-all"
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
                  <span className="flex items-center justify-center h-9 w-9 rounded-lg bg-muted text-muted-foreground text-sm font-bold shrink-0">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base group-hover:text-primary transition-colors truncate">
                      {topic.title || "Untitled Topic"}
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
        <div className="flex items-stretch gap-3 mt-10">
          {prevModule ? (
            <button
              className="flex-1 flex items-center gap-3 px-4 py-3 bg-background border rounded-lg hover:bg-muted/50 transition-colors text-left group"
              onClick={() =>
                router.push(`/${locale}/course/${slug}/${prevModule.id}`)
              }
            >
              <ArrowLeft className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Previous Module
                </p>
                <p className="text-sm font-medium truncate">
                  {prevModule.title}
                </p>
              </div>
            </button>
          ) : (
            <div className="flex-1" />
          )}
          {nextModule ? (
            <button
              className="flex-1 flex items-center justify-end gap-3 px-4 py-3 bg-background border rounded-lg hover:bg-muted/50 transition-colors text-right group"
              onClick={() =>
                router.push(`/${locale}/course/${slug}/${nextModule.id}`)
              }
            >
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Next Module
                </p>
                <p className="text-sm font-medium truncate">
                  {nextModule.title}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
            </button>
          ) : (
            <div className="flex-1" />
          )}
        </div>
    </div>
  );
}
