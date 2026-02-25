"use client";

import React, { createContext, useContext, useReducer, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { authFetch } from "@/lib/auth-fetch";
import { WorksheetBlock } from "@/types/worksheet";
import {
  CourseCoverSettings,
  CourseSettings,
  CourseModule,
  CourseTopic,
  CourseLesson,
  DEFAULT_COURSE_SETTINGS,
  DEFAULT_COURSE_COVER_SETTINGS,
} from "@/types/course";

// ─── State ───────────────────────────────────────────────────
interface CourseState {
  courseId: string | null;
  title: string;
  slug: string;
  structure: CourseModule[];
  coverSettings: CourseCoverSettings;
  settings: CourseSettings;
  selectedModuleId: string | null;
  selectedTopicId: string | null;
  selectedLessonId: string | null;
  isDirty: boolean;
  isSaving: boolean;
  published: boolean;
}

const initialState: CourseState = {
  courseId: null,
  title: "Untitled Course",
  slug: "",
  structure: [],
  coverSettings: DEFAULT_COURSE_COVER_SETTINGS,
  settings: DEFAULT_COURSE_SETTINGS,
  selectedModuleId: null,
  selectedTopicId: null,
  selectedLessonId: null,
  isDirty: false,
  isSaving: false,
  published: false,
};

// ─── Actions ─────────────────────────────────────────────────
type CourseAction =
  | { type: "LOAD_COURSE"; payload: { id: string; title: string; slug: string; structure: CourseModule[]; coverSettings: CourseCoverSettings; settings: CourseSettings; published: boolean } }
  | { type: "SET_TITLE"; payload: string }
  // Module actions
  | { type: "ADD_MODULE"; payload: { title: string } }
  | { type: "UPDATE_MODULE"; payload: { id: string; title: string } }
  | { type: "REMOVE_MODULE"; payload: string }
  | { type: "REORDER_MODULES"; payload: CourseModule[] }
  | { type: "SELECT_MODULE"; payload: string | null }
  // Topic actions
  | { type: "ADD_TOPIC"; payload: { moduleId: string; title: string } }
  | { type: "UPDATE_TOPIC"; payload: { moduleId: string; topicId: string; title: string } }
  | { type: "REMOVE_TOPIC"; payload: { moduleId: string; topicId: string } }
  | { type: "REORDER_TOPICS"; payload: { moduleId: string; topics: CourseTopic[] } }
  | { type: "SELECT_TOPIC"; payload: { moduleId: string; topicId: string } | null }
  // Lesson actions
  | { type: "ADD_LESSON"; payload: { moduleId: string; topicId: string; title: string } }
  | { type: "UPDATE_LESSON"; payload: { moduleId: string; topicId: string; lessonId: string; title: string } }
  | { type: "REMOVE_LESSON"; payload: { moduleId: string; topicId: string; lessonId: string } }
  | { type: "REORDER_LESSONS"; payload: { moduleId: string; topicId: string; lessons: CourseLesson[] } }
  | { type: "SELECT_LESSON"; payload: { moduleId: string; topicId: string; lessonId: string } | null }
  // Lesson blocks
  | { type: "SET_LESSON_BLOCKS"; payload: { moduleId: string; topicId: string; lessonId: string; blocks: WorksheetBlock[] } }
  | { type: "ADD_LESSON_BLOCK"; payload: { moduleId: string; topicId: string; lessonId: string; block: WorksheetBlock; index?: number } }
  | { type: "REMOVE_LESSON_BLOCK"; payload: { moduleId: string; topicId: string; lessonId: string; blockId: string } }
  // Settings
  | { type: "UPDATE_COVER"; payload: Partial<CourseCoverSettings> }
  | { type: "UPDATE_SETTINGS"; payload: Partial<CourseSettings> }
  | { type: "SET_SAVING"; payload: boolean }
  | { type: "MARK_SAVED" }
  | { type: "SET_PUBLISHED"; payload: boolean };

// ─── Helpers ─────────────────────────────────────────────────
function mapModule(
  structure: CourseModule[],
  moduleId: string,
  fn: (mod: CourseModule) => CourseModule
): CourseModule[] {
  return structure.map((mod) => (mod.id === moduleId ? fn(mod) : mod));
}

function mapTopic(
  mod: CourseModule,
  topicId: string,
  fn: (topic: CourseTopic) => CourseTopic
): CourseModule {
  return { ...mod, topics: mod.topics.map((t) => (t.id === topicId ? fn(t) : t)) };
}

function mapLesson(
  topic: CourseTopic,
  lessonId: string,
  fn: (lesson: CourseLesson) => CourseLesson
): CourseTopic {
  return { ...topic, lessons: topic.lessons.map((l) => (l.id === lessonId ? fn(l) : l)) };
}

// ─── Reducer ─────────────────────────────────────────────────
function courseReducer(state: CourseState, action: CourseAction): CourseState {
  switch (action.type) {
    case "LOAD_COURSE":
      return {
        ...state,
        courseId: action.payload.id,
        title: action.payload.title,
        slug: action.payload.slug,
        structure: action.payload.structure,
        coverSettings: { ...DEFAULT_COURSE_COVER_SETTINGS, ...action.payload.coverSettings },
        settings: { ...DEFAULT_COURSE_SETTINGS, ...action.payload.settings },
        published: action.payload.published,
        isDirty: false,
        selectedModuleId: action.payload.structure[0]?.id ?? null,
        selectedTopicId: null,
        selectedLessonId: null,
      };

    case "SET_TITLE":
      return { ...state, title: action.payload, isDirty: true };

    // ─── Module ────────────────────────────────────────────
    case "ADD_MODULE": {
      const newModule: CourseModule = {
        id: uuidv4(),
        title: action.payload.title || `Module ${state.structure.length + 1}`,
        topics: [],
      };
      return {
        ...state,
        structure: [...state.structure, newModule],
        selectedModuleId: newModule.id,
        selectedTopicId: null,
        selectedLessonId: null,
        isDirty: true,
      };
    }

    case "UPDATE_MODULE":
      return {
        ...state,
        structure: mapModule(state.structure, action.payload.id, (mod) => ({
          ...mod,
          title: action.payload.title,
        })),
        isDirty: true,
      };

    case "REMOVE_MODULE": {
      const newStructure = state.structure.filter((m) => m.id !== action.payload);
      return {
        ...state,
        structure: newStructure,
        selectedModuleId:
          state.selectedModuleId === action.payload
            ? (newStructure[0]?.id ?? null)
            : state.selectedModuleId,
        selectedTopicId:
          state.selectedModuleId === action.payload ? null : state.selectedTopicId,
        selectedLessonId:
          state.selectedModuleId === action.payload ? null : state.selectedLessonId,
        isDirty: true,
      };
    }

    case "REORDER_MODULES":
      return { ...state, structure: action.payload, isDirty: true };

    case "SELECT_MODULE":
      return {
        ...state,
        selectedModuleId: action.payload,
        selectedTopicId: null,
        selectedLessonId: null,
      };

    // ─── Topic ─────────────────────────────────────────────
    case "ADD_TOPIC": {
      const newTopic: CourseTopic = {
        id: uuidv4(),
        title: action.payload.title || "New Topic",
        lessons: [],
      };
      return {
        ...state,
        structure: mapModule(state.structure, action.payload.moduleId, (mod) => ({
          ...mod,
          topics: [...mod.topics, newTopic],
        })),
        selectedModuleId: action.payload.moduleId,
        selectedTopicId: newTopic.id,
        selectedLessonId: null,
        isDirty: true,
      };
    }

    case "UPDATE_TOPIC":
      return {
        ...state,
        structure: mapModule(state.structure, action.payload.moduleId, (mod) =>
          mapTopic(mod, action.payload.topicId, (topic) => ({
            ...topic,
            title: action.payload.title,
          }))
        ),
        isDirty: true,
      };

    case "REMOVE_TOPIC":
      return {
        ...state,
        structure: mapModule(state.structure, action.payload.moduleId, (mod) => ({
          ...mod,
          topics: mod.topics.filter((t) => t.id !== action.payload.topicId),
        })),
        selectedTopicId:
          state.selectedTopicId === action.payload.topicId ? null : state.selectedTopicId,
        selectedLessonId:
          state.selectedTopicId === action.payload.topicId ? null : state.selectedLessonId,
        isDirty: true,
      };

    case "REORDER_TOPICS":
      return {
        ...state,
        structure: mapModule(state.structure, action.payload.moduleId, (mod) => ({
          ...mod,
          topics: action.payload.topics,
        })),
        isDirty: true,
      };

    case "SELECT_TOPIC":
      if (action.payload === null) {
        return { ...state, selectedTopicId: null, selectedLessonId: null };
      }
      return {
        ...state,
        selectedModuleId: action.payload.moduleId,
        selectedTopicId: action.payload.topicId,
        selectedLessonId: null,
      };

    // ─── Lesson ────────────────────────────────────────────
    case "ADD_LESSON": {
      const newLesson: CourseLesson = {
        id: uuidv4(),
        title: action.payload.title || "New Lesson",
        blocks: [],
      };
      return {
        ...state,
        structure: mapModule(state.structure, action.payload.moduleId, (mod) =>
          mapTopic(mod, action.payload.topicId, (topic) => ({
            ...topic,
            lessons: [...topic.lessons, newLesson],
          }))
        ),
        selectedModuleId: action.payload.moduleId,
        selectedTopicId: action.payload.topicId,
        selectedLessonId: newLesson.id,
        isDirty: true,
      };
    }

    case "UPDATE_LESSON":
      return {
        ...state,
        structure: mapModule(state.structure, action.payload.moduleId, (mod) =>
          mapTopic(mod, action.payload.topicId, (topic) =>
            mapLesson(topic, action.payload.lessonId, (lesson) => ({
              ...lesson,
              title: action.payload.title,
            }))
          )
        ),
        isDirty: true,
      };

    case "REMOVE_LESSON":
      return {
        ...state,
        structure: mapModule(state.structure, action.payload.moduleId, (mod) =>
          mapTopic(mod, action.payload.topicId, (topic) => ({
            ...topic,
            lessons: topic.lessons.filter((l) => l.id !== action.payload.lessonId),
          }))
        ),
        selectedLessonId:
          state.selectedLessonId === action.payload.lessonId
            ? null
            : state.selectedLessonId,
        isDirty: true,
      };

    case "REORDER_LESSONS":
      return {
        ...state,
        structure: mapModule(state.structure, action.payload.moduleId, (mod) =>
          mapTopic(mod, action.payload.topicId, (topic) => ({
            ...topic,
            lessons: action.payload.lessons,
          }))
        ),
        isDirty: true,
      };

    case "SELECT_LESSON":
      if (action.payload === null) {
        return { ...state, selectedLessonId: null };
      }
      return {
        ...state,
        selectedModuleId: action.payload.moduleId,
        selectedTopicId: action.payload.topicId,
        selectedLessonId: action.payload.lessonId,
      };

    case "SET_LESSON_BLOCKS":
      return {
        ...state,
        structure: mapModule(state.structure, action.payload.moduleId, (mod) =>
          mapTopic(mod, action.payload.topicId, (topic) =>
            mapLesson(topic, action.payload.lessonId, (lesson) => ({
              ...lesson,
              blocks: action.payload.blocks,
            }))
          )
        ),
        isDirty: true,
      };

    case "ADD_LESSON_BLOCK": {
      return {
        ...state,
        structure: mapModule(state.structure, action.payload.moduleId, (mod) =>
          mapTopic(mod, action.payload.topicId, (topic) =>
            mapLesson(topic, action.payload.lessonId, (lesson) => {
              const blocks = [...lesson.blocks];
              const index = action.payload.index ?? blocks.length;
              blocks.splice(index, 0, action.payload.block);
              return { ...lesson, blocks };
            })
          )
        ),
        isDirty: true,
      };
    }

    case "REMOVE_LESSON_BLOCK":
      return {
        ...state,
        structure: mapModule(state.structure, action.payload.moduleId, (mod) =>
          mapTopic(mod, action.payload.topicId, (topic) =>
            mapLesson(topic, action.payload.lessonId, (lesson) => ({
              ...lesson,
              blocks: lesson.blocks.filter((b) => b.id !== action.payload.blockId),
            }))
          )
        ),
        isDirty: true,
      };

    // ─── Settings ──────────────────────────────────────────
    case "UPDATE_COVER":
      return {
        ...state,
        coverSettings: { ...state.coverSettings, ...action.payload },
        isDirty: true,
      };

    case "UPDATE_SETTINGS":
      return {
        ...state,
        settings: { ...state.settings, ...action.payload },
        isDirty: true,
      };

    case "SET_SAVING":
      return { ...state, isSaving: action.payload };

    case "MARK_SAVED":
      return { ...state, isDirty: false, isSaving: false };

    case "SET_PUBLISHED":
      return { ...state, published: action.payload, isDirty: true };

    default:
      return state;
  }
}

// ─── Context ─────────────────────────────────────────────────
interface CourseContextValue {
  state: CourseState;
  dispatch: React.Dispatch<CourseAction>;
  addModule: (title?: string) => void;
  addTopic: (moduleId: string, title?: string) => void;
  addLesson: (moduleId: string, topicId: string, title?: string) => void;
  save: () => Promise<void>;
  getSelectedModule: () => CourseModule | null;
  getSelectedTopic: () => CourseTopic | null;
  getSelectedLesson: () => CourseLesson | null;
}

const CourseContext = createContext<CourseContextValue | null>(null);

export function CourseProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(courseReducer, initialState);

  const addModule = useCallback((title?: string) => {
    dispatch({ type: "ADD_MODULE", payload: { title: title || "" } });
  }, []);

  const addTopic = useCallback((moduleId: string, title?: string) => {
    dispatch({ type: "ADD_TOPIC", payload: { moduleId, title: title || "" } });
  }, []);

  const addLesson = useCallback((moduleId: string, topicId: string, title?: string) => {
    dispatch({ type: "ADD_LESSON", payload: { moduleId, topicId, title: title || "" } });
  }, []);

  const getSelectedModule = useCallback(() => {
    return state.structure.find((m) => m.id === state.selectedModuleId) ?? null;
  }, [state.structure, state.selectedModuleId]);

  const getSelectedTopic = useCallback(() => {
    const mod = state.structure.find((m) => m.id === state.selectedModuleId);
    if (!mod) return null;
    return mod.topics.find((t) => t.id === state.selectedTopicId) ?? null;
  }, [state.structure, state.selectedModuleId, state.selectedTopicId]);

  const getSelectedLesson = useCallback(() => {
    const mod = state.structure.find((m) => m.id === state.selectedModuleId);
    if (!mod) return null;
    const topic = mod.topics.find((t) => t.id === state.selectedTopicId);
    if (!topic) return null;
    return topic.lessons.find((l) => l.id === state.selectedLessonId) ?? null;
  }, [state.structure, state.selectedModuleId, state.selectedTopicId, state.selectedLessonId]);

  const save = useCallback(async () => {
    dispatch({ type: "SET_SAVING", payload: true });
    try {
      const method = state.courseId ? "PUT" : "POST";
      const url = state.courseId ? `/api/courses/${state.courseId}` : "/api/courses";
      const res = await authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: state.title,
          structure: state.structure,
          coverSettings: state.coverSettings,
          settings: state.settings,
          published: state.published,
        }),
      });
      const data = await res.json();
      if (!state.courseId && data.id) {
        window.history.replaceState(null, "", `/editor/course/${data.id}`);
        dispatch({
          type: "LOAD_COURSE",
          payload: {
            id: data.id,
            title: data.title,
            slug: data.slug,
            structure: state.structure,
            coverSettings: data.coverSettings,
            settings: data.settings,
            published: data.published,
          },
        });
      }
      dispatch({ type: "MARK_SAVED" });
    } catch (err) {
      console.error("Save failed:", err);
      dispatch({ type: "SET_SAVING", payload: false });
    }
  }, [state.courseId, state.title, state.structure, state.coverSettings, state.settings, state.published]);

  return (
    <CourseContext.Provider
      value={{
        state,
        dispatch,
        addModule,
        addTopic,
        addLesson,
        save,
        getSelectedModule,
        getSelectedTopic,
        getSelectedLesson,
      }}
    >
      {children}
    </CourseContext.Provider>
  );
}

export function useCourse() {
  const ctx = useContext(CourseContext);
  if (!ctx) throw new Error("useCourse must be used within CourseProvider");
  return ctx;
}
