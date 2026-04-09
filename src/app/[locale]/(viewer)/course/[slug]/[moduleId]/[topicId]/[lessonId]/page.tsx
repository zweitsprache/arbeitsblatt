"use client";
import { useCourse } from "@/components/viewer/course-context";
import { useParams } from "next/navigation";
import { notFound } from "next/navigation";
import { BRAND_FONTS, WorksheetBlock } from "@/types/worksheet";
import { ViewerBlockRenderer } from "@/components/viewer/viewer-block-renderer";
import { BlockScreenshotButton } from "@/components/viewer/block-screenshot-button";
import { lessonNumber } from "@/types/course";
import { CoursePageNav } from "@/components/viewer/course-page-nav";
import { filterBlocksByDisplay } from "@/lib/block-visibility";

export default function LessonPage() {
  const {
    structure,
    worksheets,
    id: courseId,
    brand,
    accentColor,
    viewerBasePath,
  } = useCourse();
  const { moduleId, topicId, lessonId } = useParams<{
    slug: string;
    moduleId: string;
    topicId: string;
    lessonId: string;
  }>();

  const mod = structure.find((m) => m.id === moduleId);
  if (!mod) notFound();

  const topic = mod.topics.find((t) => t.id === topicId);
  if (!topic) notFound();

  const lessonIndex = topic.lessons.findIndex((l) => l.id === lessonId);
  const lesson = topic.lessons[lessonIndex];
  if (!lesson) notFound();

  const moduleIndex = structure.findIndex((m) => m.id === moduleId);
  const topicIndex = mod.topics.findIndex((t) => t.id === topicId);
  const primaryColor = BRAND_FONTS[brand ?? "edoomio"]?.primaryColor ?? BRAND_FONTS.edoomio.primaryColor;

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
  const visibleBlocks = filterBlocksByDisplay(resolvedBlocks, "course");

  // Compute prev/next lessons (across topics if needed)
  const prevLesson = lessonIndex > 0 ? topic.lessons[lessonIndex - 1] : null;
  const nextLesson =
    lessonIndex < topic.lessons.length - 1
      ? topic.lessons[lessonIndex + 1]
      : null;
  const nextTopic = topicIndex < mod.topics.length - 1 ? mod.topics[topicIndex + 1] : null;
  const nextModule = moduleIndex < structure.length - 1 ? structure[moduleIndex + 1] : null;
  const prevNav = prevLesson
    ? {
        href: `${viewerBasePath}/${moduleId}/${topicId}/${prevLesson.id}`,
        title: prevLesson.title || "Untitled Lesson",
      }
    : null;
  const nextNav = nextLesson
    ? {
        href: `${viewerBasePath}/${moduleId}/${topicId}/${nextLesson.id}`,
        title: nextLesson.title || "Untitled Lesson",
      }
    : nextTopic
      ? {
          href: `${viewerBasePath}/${moduleId}/${nextTopic.id}`,
          title: nextTopic.title || "Untitled Topic",
        }
      : nextModule
        ? {
            href: `${viewerBasePath}/${nextModule.id}`,
            title: nextModule.title || "Untitled Module",
          }
        : null;

  return (
    <div className="max-w-5xl mx-auto px-6 sm:px-10 lg:px-16 py-10 lg:py-14">
        {/* Lesson header */}
        <div className="mb-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-left" style={{ color: primaryColor }}>
            {lesson.title || "Untitled Lesson"}
          </h1>
        </div>

        {/* Content blocks */}
        <div className="space-y-5 text-cv-base">
          {visibleBlocks.map((block) => (
            <div
              key={block.id}
              data-block-id={block.id}
              className="group/block relative"
            >
              <ViewerBlockRenderer block={block} mode="online" primaryColor={primaryColor} accentColor={accentColor} brand={brand} allBlocks={visibleBlocks} lessonLabel={lessonNumber(moduleIndex, topicIndex, lessonIndex)} />
              <BlockScreenshotButton
                courseId={courseId}
                moduleId={moduleId}
                topicId={topicId}
                lessonId={lessonId}
                blockId={block.id}
              />
            </div>
          ))}
          {visibleBlocks.length === 0 && (
            <p className="text-muted-foreground text-center py-12">
              No content available for this lesson yet.
            </p>
          )}
        </div>

        <CoursePageNav prev={prevNav} next={nextNav} />
    </div>
  );
}
