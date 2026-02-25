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

/** Collect all worksheet IDs from linked-blocks blocks in the structure */
export function collectLinkedWorksheetIds(modules: CourseModule[]): string[] {
  const ids = new Set<string>();
  for (const mod of modules) {
    for (const topic of mod.topics) {
      for (const lesson of topic.lessons) {
        for (const block of lesson.blocks) {
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
