import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";
import { extractTranslatableStrings } from "@/lib/course-translation";
import {
  CourseModule,
  CourseCoverSettings,
  CourseSettings,
} from "@/types/course";

type UnitStatus = "translated" | "outdated" | "none";

/**
 * Get per-unit translation status for the course sidebar indicators.
 *
 * Compares each unit's current German strings against the `_source`
 * snapshot stored alongside translations to determine status:
 *   - "translated" — all keys match _source (up to date)
 *   - "outdated"   — some keys are new or changed since last translation
 *   - "none"       — no _source snapshot exists (never translated)
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  const { id } = await params;
  const course = await prisma.course.findUnique({
    where: { id, userId },
  });
  if (!course) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const doc = {
    id: course.id,
    title: course.title,
    slug: course.slug,
    structure: course.structure as unknown as CourseModule[],
    coverSettings: course.coverSettings as unknown as CourseCoverSettings,
    settings: course.settings as unknown as CourseSettings,
    published: course.published,
    createdAt: course.createdAt.toISOString(),
    updatedAt: course.updatedAt.toISOString(),
    folderId: course.folderId,
    userId: course.userId,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const translations = ((course as any).translations ?? {}) as Record<string, Record<string, string>>;
  const source = translations._source ?? {};
  const hasSource = Object.keys(source).length > 0;

  // Extract all current German strings
  const allStrings = extractTranslatableStrings(doc);

  // Helper: compute status for a set of key prefixes
  function statusForKeys(prefixes: string[]): UnitStatus {
    if (!hasSource) return "none";

    const relevantKeys = Object.keys(allStrings).filter((k) =>
      prefixes.some((p) => k.startsWith(p))
    );
    if (relevantKeys.length === 0) return "none";

    // Check if any relevant key has no source entry or a different value
    const hasAnySource = relevantKeys.some((k) => k in source);
    if (!hasAnySource) return "none";

    const allMatch = relevantKeys.every((k) => source[k] === allStrings[k]);
    return allMatch ? "translated" : "outdated";
  }

  // ── Cover + settings
  const coverStatus = statusForKeys(["cover.", "settings."]);

  // ── Modules, topics, lessons
  const modules: Record<string, UnitStatus> = {};
  const topics: Record<string, UnitStatus> = {};
  const lessons: Record<string, UnitStatus> = {};

  for (const mod of doc.structure) {
    const modBlocks = (mod.blocks ?? []).map((b) => `block.${b.id}.`);
    modules[mod.id] = statusForKeys([`module.${mod.id}.`, ...modBlocks]);

    for (const topic of mod.topics) {
      const topicBlocks = (topic.blocks ?? []).map((b) => `block.${b.id}.`);
      topics[topic.id] = statusForKeys([`topic.${topic.id}.`, ...topicBlocks]);

      for (const lesson of topic.lessons) {
        const lessonBlocks = (lesson.blocks ?? []).map((b) => `block.${b.id}.`);
        lessons[lesson.id] = statusForKeys([`lesson.${lesson.id}.`, ...lessonBlocks]);
      }
    }
  }

  return NextResponse.json({ cover: coverStatus, modules, topics, lessons });
}
