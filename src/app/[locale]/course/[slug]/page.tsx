"use client";

import { useCourse } from "@/components/viewer/course-context";
import { useParams, useRouter } from "next/navigation";
import {
  BookOpen,
  Layers,
  FileText,
  ArrowRight,
  GraduationCap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function CourseOverviewPage() {
  const { title, description, languageLevel, structure } = useCourse();
  const { locale, slug } = useParams<{ locale: string; slug: string }>();
  const router = useRouter();

  const totalTopics = structure.reduce((s, m) => s + m.topics.length, 0);
  const totalLessons = structure.reduce(
    (s, m) => s + m.topics.reduce((t, tp) => t + tp.lessons.length, 0),
    0
  );

  return (
    <div className="max-w-5xl mx-auto px-6 sm:px-10 lg:px-16 py-10 lg:py-14">
        {/* Hero */}
        <div className="mb-10">
          <div className="flex items-start gap-4 mb-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <GraduationCap className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                {title}
              </h1>
              {description && (
                <p className="text-muted-foreground mt-2 text-base leading-relaxed max-w-2xl">
                  {description}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-4">
            {languageLevel && (
              <Badge variant="secondary" className="text-xs">
                {languageLevel}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {structure.length} {structure.length === 1 ? "Module" : "Modules"}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {totalTopics} {totalTopics === 1 ? "Topic" : "Topics"}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {totalLessons} {totalLessons === 1 ? "Lesson" : "Lessons"}
            </Badge>
          </div>
        </div>

        {/* Module card grid */}
        <h2 className="text-lg font-semibold mb-4">Modules</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {structure.map((mod, i) => {
            const topicCount = mod.topics.length;
            const lessonCount = mod.topics.reduce(
              (s, t) => s + t.lessons.length,
              0
            );

            return (
              <button
                key={mod.id}
                onClick={() =>
                  router.push(`/${locale}/course/${slug}/${mod.id}`)
                }
                className="group text-left rounded-lg border bg-background overflow-hidden hover:border-primary/40 hover:shadow-md transition-all"
              >
                {mod.image && (
                  <div className="w-full h-36 overflow-x-clip overflow-y-hidden flex items-center justify-center">
                    <img
                      src={mod.image}
                      alt=""
                      className="h-full w-auto max-w-none object-contain group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                <div className="p-5">
                <div className="flex items-start gap-3">
                  <span className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10 text-primary text-sm font-bold shrink-0">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base group-hover:text-primary transition-colors truncate">
                      {mod.title || "Untitled Module"}
                    </h3>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Layers className="h-3.5 w-3.5" />
                        {topicCount} {topicCount === 1 ? "Topic" : "Topics"}
                      </span>
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

        {structure.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No modules in this course yet.</p>
          </div>
        )}
    </div>
  );
}
