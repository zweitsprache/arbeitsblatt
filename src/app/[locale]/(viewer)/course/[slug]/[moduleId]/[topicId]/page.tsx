"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
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
import { DynamicLucideIcon } from "@/components/ui/lucide-icon-picker";
import { moduleNumber, topicNumber, lessonNumber } from "@/types/course";
import { WorksheetBlock } from "@/types/worksheet";
import { ViewerBlockRenderer } from "@/components/viewer/viewer-block-renderer";
import { BlockScreenshotButton } from "@/components/viewer/block-screenshot-button";

export default function TopicPage() {
  const { structure, slug, worksheets, id: courseId, brand } = useCourse();
  const { locale, moduleId, topicId } = useParams<{
    locale: string;
    slug: string;
    moduleId: string;
    topicId: string;
  }>();
  const router = useRouter();
  const t = useTranslations("common");
  const tc = useTranslations("course");

  const mod = structure.find((m) => m.id === moduleId);
  if (!mod) notFound();

  const topicIndex = mod.topics.findIndex((t) => t.id === topicId);
  const topic = mod.topics[topicIndex];
  if (!topic) notFound();

  const moduleIndex = structure.findIndex((m) => m.id === moduleId);

  const prevTopic = topicIndex > 0 ? mod.topics[topicIndex - 1] : null;
  const nextTopic =
    topicIndex < mod.topics.length - 1 ? mod.topics[topicIndex + 1] : null;
  const firstLesson = topic.lessons.length > 0 ? topic.lessons[0] : null;

  // Resolve topic-level blocks: expand linked-blocks
  const resolvedBlocks = useMemo(() => {
    const blocks: WorksheetBlock[] = [];
    for (const block of topic.blocks ?? []) {
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
  }, [topic, worksheets]);

  return (
    <div className="max-w-5xl mx-auto px-6 sm:px-10 lg:px-16 py-10 lg:py-14">
        {/* Hero with optional image overlay */}
        <div className="mb-10">
          {topic.image ? (
            <div className="relative rounded-sm overflow-hidden">
              <img src={topic.image} alt="" className="w-full h-auto" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
                <div className="flex items-center gap-4 mb-3">
                  <div className="h-14 w-14 rounded-sm backdrop-blur-sm border-2 border-white/60 flex items-center justify-center shrink-0">
                    {topic.icon ? (
                      <DynamicLucideIcon name={topic.icon} className="h-8 w-8 text-white" />
                    ) : (
                      <Layers className="h-8 w-8 text-white" />
                    )}
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-bold text-white drop-shadow-md">
                    {topicNumber(moduleIndex, topicIndex)} {topic.title || "Untitled Topic"}
                  </h1>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-xs text-white border-white/40 rounded-sm">
                    {topic.lessons.length}{" "}
                    {topic.lessons.length === 1 ? tc("lessonSingular") : tc("lessonPlural")}
                  </Badge>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4 mb-4">
                <div className="h-14 w-14 rounded-sm bg-primary/10 flex items-center justify-center shrink-0">
                  {topic.icon ? (
                    <DynamicLucideIcon name={topic.icon} className="h-8 w-8 text-primary" />
                  ) : (
                    <Layers className="h-8 w-8 text-primary" />
                  )}
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold">
                    {topicNumber(moduleIndex, topicIndex)} {topic.title || "Untitled Topic"}
                  </h1>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-4">
                <Badge variant="outline" className="text-xs rounded-sm">
                  {topic.lessons.length}{" "}
                  {topic.lessons.length === 1 ? tc("lessonSingular") : tc("lessonPlural")}
                </Badge>
              </div>
            </>
          )}
        </div>

        {/* Topic content blocks */}
        {resolvedBlocks.length > 0 && (
          <>
            <div className="space-y-4 text-cv-base mb-10">
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
                    blockId={block.id}
                  />
                </div>
              ))}
            </div>
          </>
        )}

        {/* Lesson card grid */}
        <h2 className="text-lg font-semibold mb-4">Lektionen in diesem Thema</h2>
        <div className="grid gap-4 sm:grid-cols-2">
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
                className="group text-left rounded-sm overflow-hidden hover:shadow-md transition-all"
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
                  <FileText className="h-8 w-8 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base group-hover:text-primary transition-colors truncate">
                      <span className="font-extrabold">{lessonNumber(moduleIndex, topicIndex, i)}</span>{" "}<span className="font-semibold">{lesson.title || "Untitled Lesson"}</span>
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
        <div className="flex items-center gap-2 mt-10">
          {prevTopic ? (
            <button
              className="flex-1 flex items-center gap-1.5 px-4 py-3 bg-background border rounded hover:bg-muted/50 transition-colors text-left group"
              onClick={() =>
                router.push(
                  `/${locale}/course/${slug}/${moduleId}/${prevTopic.id}`
                )
              }
            >
              <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
              <div className="min-w-0">
                <span className="block !text-[16px] text-muted-foreground uppercase tracking-wider leading-snug">{t("previous")}</span>
                <span className="block !text-[16px] font-medium truncate leading-snug">{prevTopic.title}</span>
              </div>
            </button>
          ) : (
            <div className="flex-1" />
          )}
          {firstLesson ? (
            <button
              className="flex-1 flex items-center justify-end gap-1.5 px-4 py-3 bg-background border rounded hover:bg-muted/50 transition-colors text-right group"
              onClick={() =>
                router.push(
                  `/${locale}/course/${slug}/${moduleId}/${topicId}/${firstLesson.id}`
                )
              }
            >
              <div className="min-w-0">
                <span className="block !text-[16px] text-muted-foreground uppercase tracking-wider leading-snug">{t("next")}</span>
                <span className="block !text-[16px] font-medium truncate leading-snug">{firstLesson.title}</span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
            </button>
          ) : nextTopic ? (
            <button
              className="flex-1 flex items-center justify-end gap-1.5 px-4 py-3 bg-background border rounded hover:bg-muted/50 transition-colors text-right group"
              onClick={() =>
                router.push(
                  `/${locale}/course/${slug}/${moduleId}/${nextTopic.id}`
                )
              }
            >
              <div className="min-w-0">
                <span className="block !text-[16px] text-muted-foreground uppercase tracking-wider leading-snug">{t("next")}</span>
                <span className="block !text-[16px] font-medium truncate leading-snug">{nextTopic.title}</span>
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
