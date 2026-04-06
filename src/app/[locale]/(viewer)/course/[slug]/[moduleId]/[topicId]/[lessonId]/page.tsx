"use client";
import { useTranslations } from "next-intl";
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
import { lessonNumber } from "@/types/course";

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
  const t = useTranslations("common");

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
  const resolvedBlocks: WorksheetBlock[] = [];
  for (const block of lesson.blocks ?? []) {
    if (block.type === "linked-blocks") {
      const ws = worksheets[block.worksheetId];
      if (ws) {
        resolvedBlocks.push(...ws.blocks);
      }
    } else {
      resolvedBlocks.push(block);
    }
  }

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
        <div className="mb-10 rounded-[28px] border bg-[rgba(250,250,249,0.8)] px-6 py-6 sm:px-8 sm:py-7">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {mod.shortTitle || mod.title} / {topic.shortTitle || topic.title}
          </p>
          <h1 className="mt-3 text-2xl sm:text-3xl font-bold leading-tight">
            {lessonNumber(moduleIndex, topicIndex, lessonIndex)} {lesson.title || "Untitled Lesson"}
          </h1>
        </div>

        {/* Content blocks */}
        <div className="space-y-5 text-cv-base">
          {resolvedBlocks.map((block) => (
            <div
              key={block.id}
              data-block-id={block.id}
              className="group/block relative"
            >
              <ViewerBlockRenderer block={block} mode="online" brand={brand} allBlocks={resolvedBlocks} lessonLabel={lessonNumber(moduleIndex, topicIndex, lessonIndex)} />
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
        <div className="flex items-center gap-3 mt-12">
          {prevLesson ? (
            <button
              className="flex-1 flex items-center gap-2 px-5 py-4 bg-[rgba(250,250,249,0.8)] border rounded-[24px] hover:bg-muted/50 transition-colors text-left group"
              onClick={() =>
                router.push(`${basePath}/${prevLesson.id}`)
              }
            >
              <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
              <div className="min-w-0">
                <span className="block text-[11px] text-muted-foreground uppercase tracking-[0.18em] leading-snug">{t("previous")}</span>
                <span className="mt-1 block !text-[16px] font-medium truncate leading-snug">{prevLesson.title}</span>
              </div>
            </button>
          ) : (
            <div className="flex-1" />
          )}
          {nextLesson ? (
            <button
              className="flex-1 flex items-center justify-end gap-2 px-5 py-4 bg-[rgba(250,250,249,0.8)] border rounded-[24px] hover:bg-muted/50 transition-colors text-right group"
              onClick={() =>
                router.push(`${basePath}/${nextLesson.id}`)
              }
            >
              <div className="min-w-0">
                <span className="block text-[11px] text-muted-foreground uppercase tracking-[0.18em] leading-snug">{t("next")}</span>
                <span className="mt-1 block !text-[16px] font-medium truncate leading-snug">{nextLesson.title}</span>
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
