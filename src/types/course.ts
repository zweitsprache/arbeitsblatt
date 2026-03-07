import { WorksheetBlock, Brand } from "./worksheet";

// ─── Course Lesson ──────────────────────────────────────────
export interface CourseLesson {
  id: string;
  title: string;
  shortTitle: string;
  blocks: WorksheetBlock[];
}

// ─── Course Topic ───────────────────────────────────────────
export interface CourseTopic {
  id: string;
  title: string;
  shortTitle: string;
  image: string | null;
  icon: string | null;
  lessons: CourseLesson[];
  blocks: WorksheetBlock[];
}

// ─── Course Module ──────────────────────────────────────────
export interface CourseModule {
  id: string;
  title: string;
  shortTitle: string;
  image: string | null;
  icon: string | null;
  topics: CourseTopic[];
  blocks: WorksheetBlock[];
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

export type SidebarTheme = "dark" | "light";

// ─── Course Settings ────────────────────────────────────────
export interface CourseSettings {
  languageLevel: string;
  description: string;
  image: string | null;
  brand: Brand;
  sidebarTheme: SidebarTheme;
}

// ─── Course Translation ─────────────────────────────────────
export interface CourseTranslation {
  structure: CourseModule[];
  coverSettings: CourseCoverSettings;
  settings: CourseSettings;
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
  translations?: Record<string, Record<string, string>>;
  i18nexusNamespace?: string | null;
  translatedAt?: string | null;
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
  image: null,
  brand: "edoomio",
  sidebarTheme: "dark",
};

// ─── Helpers ────────────────────────────────────────────────

/**
 * Normalize course structure loaded from DB.
 * Migrates old lessons (worksheetId) → new format (blocks[]).
 */
export function normalizeCourseStructure(modules: CourseModule[]): CourseModule[] {
  return modules.map((mod) => ({
    ...mod,
    image: mod.image ?? null,
    icon: mod.icon ?? null,
    shortTitle: mod.shortTitle ?? "",
    blocks: Array.isArray(mod.blocks) ? mod.blocks : [],
    topics: mod.topics.map((topic) => ({
      ...topic,
      image: topic.image ?? null,
      icon: topic.icon ?? null,
      shortTitle: topic.shortTitle ?? "",
      blocks: Array.isArray(topic.blocks) ? topic.blocks : [],
      lessons: topic.lessons.map((lesson) => {
        // Already migrated
        if (Array.isArray(lesson.blocks)) return { ...lesson, shortTitle: lesson.shortTitle ?? "" };
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
        return { id: raw.id, title: raw.title, shortTitle: "", blocks };
      }),
    })),
  }));
}

/** Collect all worksheet IDs from linked-blocks blocks in the structure */
export function collectLinkedWorksheetIds(modules: CourseModule[]): string[] {
  const ids = new Set<string>();
  for (const mod of modules) {
    // Module-level blocks
    for (const block of mod.blocks ?? []) {
      if (block.type === "linked-blocks") {
        ids.add(block.worksheetId);
      }
    }
    for (const topic of mod.topics) {
      // Topic-level blocks
      for (const block of topic.blocks ?? []) {
        if (block.type === "linked-blocks") {
          ids.add(block.worksheetId);
        }
      }
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

// ─── Dynamic Numbering ──────────────────────────────────────
/** Module number: 100, 200, 300, … */
export function moduleNumber(moduleIndex: number): number {
  return (moduleIndex + 1) * 100;
}

/** Topic number: 101, 102, … (within module 100); 201, 202, … (within module 200) */
export function topicNumber(moduleIndex: number, topicIndex: number): number {
  return moduleNumber(moduleIndex) + topicIndex + 1;
}

/** Lesson number: "101.01", "101.02", … */
export function lessonNumber(
  moduleIndex: number,
  topicIndex: number,
  lessonIndex: number,
): string {
  return `${topicNumber(moduleIndex, topicIndex)}.${String(lessonIndex + 1).padStart(2, "0")}`;
}
