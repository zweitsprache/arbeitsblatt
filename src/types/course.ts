import { WorksheetReference } from "./ebook";

// ─── Course Lesson ──────────────────────────────────────────
export interface CourseLesson {
  id: string;
  title: string;
  worksheetId: string | null; // auto-created or linked worksheet
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

// ─── Populated types (with worksheet data resolved) ─────────
export interface PopulatedCourseLesson {
  id: string;
  title: string;
  worksheet: WorksheetReference | null;
}

export interface PopulatedCourseTopic {
  id: string;
  title: string;
  lessons: PopulatedCourseLesson[];
}

export interface PopulatedCourseModule {
  id: string;
  title: string;
  topics: PopulatedCourseTopic[];
}

export interface PopulatedCourseDocument extends Omit<CourseDocument, "structure"> {
  structure: PopulatedCourseModule[];
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

/** Convert populated structure to storage format (strip worksheet data, keep only IDs) */
export function structureToStorage(modules: PopulatedCourseModule[]): CourseModule[] {
  return modules.map((mod) => ({
    id: mod.id,
    title: mod.title,
    topics: mod.topics.map((topic) => ({
      id: topic.id,
      title: topic.title,
      lessons: topic.lessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        worksheetId: lesson.worksheet?.id ?? null,
      })),
    })),
  }));
}

/** Collect all worksheet IDs from the structure */
export function collectWorksheetIds(modules: CourseModule[]): string[] {
  const ids: string[] = [];
  for (const mod of modules) {
    for (const topic of mod.topics) {
      for (const lesson of topic.lessons) {
        if (lesson.worksheetId) {
          ids.push(lesson.worksheetId);
        }
      }
    }
  }
  return ids;
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
