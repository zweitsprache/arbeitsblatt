"use client";

import { useCourse } from "@/components/viewer/course-context";
import { useParams, useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  FileText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function TopicPage() {
  const { structure, slug } = useCourse();
  const { locale, moduleId, topicId } = useParams<{
    locale: string;
    slug: string;
    moduleId: string;
    topicId: string;
  }>();
  const router = useRouter();

  const mod = structure.find((m) => m.id === moduleId);
  if (!mod) notFound();

  const topicIndex = mod.topics.findIndex((t) => t.id === topicId);
  const topic = mod.topics[topicIndex];
  if (!topic) notFound();

  const moduleIndex = structure.findIndex((m) => m.id === moduleId);

  const prevTopic = topicIndex > 0 ? mod.topics[topicIndex - 1] : null;
  const nextTopic =
    topicIndex < mod.topics.length - 1 ? mod.topics[topicIndex + 1] : null;

  return (
    <div className="max-w-5xl mx-auto px-6 sm:px-10 lg:px-16 py-10 lg:py-14">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <span>
              Module {moduleIndex + 1} &middot; Topic {topicIndex + 1} of{" "}
              {mod.topics.length}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            {topic.title || "Untitled Topic"}
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Badge variant="outline" className="text-xs">
              {topic.lessons.length}{" "}
              {topic.lessons.length === 1 ? "Lesson" : "Lessons"}
            </Badge>
          </div>
        </div>

        {/* Lesson card grid */}
        <h2 className="text-lg font-semibold mb-4">Lessons</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {topic.lessons.map((lesson, i) => {
            const blockCount = lesson.blocks?.length ?? 0;

            return (
              <button
                key={lesson.id}
                onClick={() =>
                  router.push(
                    `/${locale}/course/${slug}/${moduleId}/${topicId}/${lesson.id}`
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
                      {lesson.title || "Untitled Lesson"}
                    </h3>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5" />
                        {blockCount} {blockCount === 1 ? "Block" : "Blocks"}
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

        {topic.lessons.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No lessons in this topic yet.</p>
          </div>
        )}

        {/* Prev / Next topic navigation */}
        <div className="flex items-stretch gap-3 mt-10">
          {prevTopic ? (
            <button
              className="flex-1 flex items-center gap-3 px-4 py-3 bg-background border rounded-lg hover:bg-muted/50 transition-colors text-left group"
              onClick={() =>
                router.push(
                  `/${locale}/course/${slug}/${moduleId}/${prevTopic.id}`
                )
              }
            >
              <ArrowLeft className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Previous Topic
                </p>
                <p className="text-sm font-medium truncate">
                  {prevTopic.title}
                </p>
              </div>
            </button>
          ) : (
            <div className="flex-1" />
          )}
          {nextTopic ? (
            <button
              className="flex-1 flex items-center justify-end gap-3 px-4 py-3 bg-background border rounded-lg hover:bg-muted/50 transition-colors text-right group"
              onClick={() =>
                router.push(
                  `/${locale}/course/${slug}/${moduleId}/${nextTopic.id}`
                )
              }
            >
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Next Topic
                </p>
                <p className="text-sm font-medium truncate">
                  {nextTopic.title}
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
