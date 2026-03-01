"use client";

import { useMemo } from "react";
import { useCourse } from "@/components/viewer/course-context";
import { useParams, useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import { WorksheetBlock } from "@/types/worksheet";
import { ViewerBlockRenderer } from "@/components/viewer/viewer-block-renderer";
import { BlockScreenshotButton } from "@/components/viewer/block-screenshot-button";
import {
  ArrowLeft,
  ArrowRight,
} from "lucide-react";

export default function LessonPage() {
  const { structure, slug, worksheets, id: courseId, brand } = useCourse();
  const { locale, moduleId, topicId, lessonId } = useParams<{
    locale: string;
    slug: string;
    moduleId: string;
    topicId: string;
    lessonId: string;
  }>();
  const router = useRouter();

  const mod = structure.find((m) => m.id === moduleId);
  if (!mod) notFound();

  const topic = mod.topics.find((t) => t.id === topicId);
  if (!topic) notFound();

  const lessonIndex = topic.lessons.findIndex((l) => l.id === lessonId);
  const lesson = topic.lessons[lessonIndex];
  if (!lesson) notFound();

  const moduleIndex = structure.findIndex((m) => m.id === moduleId);
  const topicIndex = mod.topics.findIndex((t) => t.id === topicId);

  // Resolve blocks: expand linked-blocks
  const resolvedBlocks = useMemo(() => {
    const blocks: WorksheetBlock[] = [];
    for (const block of lesson.blocks ?? []) {
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
  }, [lesson, worksheets]);

  // Compute prev/next lessons (across topics if needed)
  const prevLesson = lessonIndex > 0 ? topic.lessons[lessonIndex - 1] : null;
  const nextLesson =
    lessonIndex < topic.lessons.length - 1
      ? topic.lessons[lessonIndex + 1]
      : null;

  const basePath = `/${locale}/course/${slug}/${moduleId}/${topicId}`;

  return (
    <div className="max-w-5xl mx-auto px-6 sm:px-10 lg:px-16 py-10 lg:py-14">
        {/* Lesson header */}
        <div className="mb-8">
          <p className="text-xs text-muted-foreground mb-1">
            Lesson {lessonIndex + 1} of {topic.lessons.length}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {lesson.title || "Untitled Lesson"}
          </h1>
        </div>

        {/* Content blocks */}
        <div className="space-y-4 text-cv-base">
          {resolvedBlocks.map((block) => (
            <div
              key={block.id}
              data-block-id={block.id}
              className="group/block relative"
            >
              <ViewerBlockRenderer block={block} mode="online" brand={brand} />
              <BlockScreenshotButton
                courseId={courseId}
                moduleId={moduleId}
                topicId={topicId}
                lessonId={lessonId}
                blockId={block.id}
              />
            </div>
          ))}
          {resolvedBlocks.length === 0 && (
            <p className="text-muted-foreground text-center py-12">
              No content available for this lesson yet.
            </p>
          )}
        </div>

        {/* Prev / Next lesson navigation */}
        <div className="flex items-stretch gap-3 mt-10">
          {prevLesson ? (
            <button
              className="flex-1 flex items-center gap-3 px-4 py-3 bg-background border rounded-lg hover:bg-muted/50 transition-colors text-left group"
              onClick={() =>
                router.push(`${basePath}/${prevLesson.id}`)
              }
            >
              <ArrowLeft className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Previous Lesson
                </p>
                <p className="text-sm font-medium truncate">
                  {prevLesson.title}
                </p>
              </div>
            </button>
          ) : (
            <div className="flex-1" />
          )}
          {nextLesson ? (
            <button
              className="flex-1 flex items-center justify-end gap-3 px-4 py-3 bg-background border rounded-lg hover:bg-muted/50 transition-colors text-right group"
              onClick={() =>
                router.push(`${basePath}/${nextLesson.id}`)
              }
            >
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Next Lesson
                </p>
                <p className="text-sm font-medium truncate">
                  {nextLesson.title}
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
