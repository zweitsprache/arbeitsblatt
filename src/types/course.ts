import { WorksheetBlock } from "./worksheet";

// ─── Course Lesson ──────────────────────────────────────────
export interface CourseLesson {
  id: string;
  title: string;
  blocks: WorksheetBlock[];
}

// ─── Course Topic ───────────────────────────────────────────
export interface CourseTopic {
  id: string;
  title: string;
  lessons: CourseLesson[];
}

// ─── Course Module ──────────────────────────────────────────
export interface CourseModule {
  id: string;
  title: string;
  topics: CourseTopic[];
}

// ─── Course Cover Settings ──────────────────────────────────
export interface CourseCoverSettings {
  title: string;
  subtitle: string;
  author: string;
  coverImage: string | null;
  showLogo: boolean;
  backgroundColor: string;
  textColor: string;
}

// ─── Course Settings ────────────────────────────────────────
export interface CourseSettings {
  languageLevel: string;
  description: string;
}

// ─── Course Document (storage format) ───────────────────────
export interface CourseDocument {
  id: string;
  title: string;
  slug: string;
  structure: CourseModule[];
  coverSettings: CourseCoverSettings;
  settings: CourseSettings;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  folderId: string | null;
  userId: string | null;
}

// ─── Default Settings ───────────────────────────────────────
export const DEFAULT_COURSE_COVER_SETTINGS: CourseCoverSettings = {
  title: "",
  subtitle: "",
  author: "",
  coverImage: null,
  showLogo: true,
  backgroundColor: "#ffffff",
  textColor: "#1a1a1a",
};

export const DEFAULT_COURSE_SETTINGS: CourseSettings = {
  languageLevel: "",
  description: "",
};

// ─── Helpers ────────────────────────────────────────────────

/**
 * Normalize course structure loaded from DB.
 * Migrates old lessons (worksheetId) → new format (blocks[]).
 */
export function normalizeCourseStructure(modules: CourseModule[]): CourseModule[] {
  return modules.map((mod) => ({
    ...mod,
    topics: mod.topics.map((topic) => ({
      ...topic,
      lessons: topic.lessons.map((lesson) => {
        // Already migrated
        if (Array.isArray(lesson.blocks)) return lesson;
        // Old format: convert worksheetId → linked-blocks block
        const raw = lesson as unknown as { id: string; title: string; worksheetId?: string | null };
        const blocks: WorksheetBlock[] = [];
        if (raw.worksheetId) {
          blocks.push({
            id: crypto.randomUUID(),
            type: "linked-blocks",
            visibility: "both",
            worksheetId: raw.worksheetId,
            worksheetTitle: "",
            worksheetSlug: "",
          });
        }
        return { id: raw.id, title: raw.title, blocks };
      }),
    })),
  }));
}

/** Collect all worksheet IDs from linked-blocks blocks in the structure */
export function collectLinkedWorksheetIds(modules: CourseModule[]): string[] {
  const ids = new Set<string>();
  for (const mod of modules) {
    for (const topic of mod.topics) {
      for (const lesson of topic.lessons) {
        for (const block of lesson.blocks ?? []) {
          if (block.type === "linked-blocks") {
            ids.add(block.worksheetId);
          }
        }
      }
    }
  }
  return Array.from(ids);
}

/** Count total lessons in a course structure */
export function countLessons(modules: CourseModule[]): number {
  let count = 0;
  for (const mod of modules) {
    for (const topic of mod.topics) {
      count += topic.lessons.length;
    }
  }
  return count;
}

/** Count total topics in a course structure */
export function countTopics(modules: CourseModule[]): number {
  let count = 0;
  for (const mod of modules) {
    count += mod.topics.length;
  }
  return count;
}
