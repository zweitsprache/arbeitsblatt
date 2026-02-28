"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useRouter, usePathname, useParams } from "next/navigation";
import { CourseModule, SidebarTheme } from "@/types/course";
import { BRAND_FONTS, DEFAULT_BRAND_SETTINGS } from "@/types/worksheet";
import { useCourse } from "./course-context";
import { extractBlocksText } from "@/lib/extract-block-text";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  ChevronLeft,
  Menu,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CourseChatSidebar } from "./course-chat-sidebar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

// ─── Sidebar Theme Tokens ────────────────────────────────────

interface SidebarTokens {
  bg: string;
  text: string;
  textMuted: string;
  textFaint: string;
  accentText: string;
  accentPercent: string;
  progressBar: string;
  progressTrack: string;
  ringTrack: string;
  ringFill: string;
  ringFillComplete: string;
  ringNumber: string;
  ringNumberActive: string;
  ringNumberFaint: string;
  divider: string;
  hoverBg: string;
  activeBg: string;
  activeIndicator: string;
  openBg: string;
  topicText: string;
  chevron: string;
  borderLine: string;
  continueGradient: string;
  continueText: string;
  continueShadow: string;
  continueShadowHover: string;
  overviewText: string;
  overviewHover: string;
  glowGradient: string;
  scrollThumb: string;
  scrollThumbHover: string;
}

const DARK_TOKENS: SidebarTokens = {
  bg: "#302f2c",
  text: "rgba(255,255,255,0.92)",
  textMuted: "rgba(255,255,255,0.90)",
  textFaint: "rgba(255,255,255,0.20)",
  accentText: "#F2EDDA",
  accentPercent: "rgba(242,237,218,0.5)",
  progressBar: "linear-gradient(90deg, #F2EDDA, #F7F4E8)",
  progressTrack: "rgba(255,255,255,0.06)",
  ringTrack: "rgba(255,255,255,0.06)",
  ringFill: "rgba(242,237,218,0.7)",
  ringFillComplete: "#F2EDDA",
  ringNumber: "rgba(255,255,255,0.7)",
  ringNumberActive: "#F2EDDA",
  ringNumberFaint: "rgba(255,255,255,0.25)",
  divider: "rgba(255,255,255,0.06)",
  hoverBg: "rgba(255,255,255,0.03)",
  activeBg: "rgba(242,237,218,0.08)",
  activeIndicator: "#F2EDDA",
  openBg: "rgba(255,255,255,0.02)",
  topicText: "rgba(255,255,255,0.80)",
  chevron: "rgba(255,255,255,0.25)",
  borderLine: "rgba(255,255,255,0.06)",
  continueGradient: "linear-gradient(135deg, #F2EDDA, #D9D4C0)",
  continueText: "#302f2c",
  continueShadow: "0 2px 12px rgba(242,237,218,0.15)",
  continueShadowHover: "0 4px 20px rgba(242,237,218,0.25)",
  overviewText: "rgba(255,255,255,0.25)",
  overviewHover: "rgba(255,255,255,0.40)",
  glowGradient: "radial-gradient(circle, rgba(242,237,218,0.04) 0%, transparent 70%)",
  scrollThumb: "rgba(255,255,255,0.08)",
  scrollThumbHover: "rgba(255,255,255,0.15)",
};

const LIGHT_TOKENS: SidebarTokens = {
  bg: "#f5f4f1",
  text: "rgba(0,0,0,0.85)",
  textMuted: "rgba(0,0,0,0.75)",
  textFaint: "rgba(0,0,0,0.30)",
  accentText: "#4a4639",
  accentPercent: "rgba(74,70,57,0.5)",
  progressBar: "linear-gradient(90deg, #4a4639, #635e4e)",
  progressTrack: "rgba(0,0,0,0.06)",
  ringTrack: "rgba(0,0,0,0.08)",
  ringFill: "rgba(74,70,57,0.6)",
  ringFillComplete: "#4a4639",
  ringNumber: "rgba(0,0,0,0.55)",
  ringNumberActive: "#4a4639",
  ringNumberFaint: "rgba(0,0,0,0.20)",
  divider: "rgba(0,0,0,0.08)",
  hoverBg: "rgba(0,0,0,0.04)",
  activeBg: "rgba(74,70,57,0.08)",
  activeIndicator: "#4a4639",
  openBg: "rgba(0,0,0,0.02)",
  topicText: "rgba(0,0,0,0.70)",
  chevron: "rgba(0,0,0,0.25)",
  borderLine: "rgba(0,0,0,0.08)",
  continueGradient: "linear-gradient(135deg, #4a4639, #635e4e)",
  continueText: "#f5f4f1",
  continueShadow: "0 2px 12px rgba(74,70,57,0.12)",
  continueShadowHover: "0 4px 20px rgba(74,70,57,0.20)",
  overviewText: "rgba(0,0,0,0.35)",
  overviewHover: "rgba(0,0,0,0.55)",
  glowGradient: "radial-gradient(circle, rgba(74,70,57,0.03) 0%, transparent 70%)",
  scrollThumb: "rgba(0,0,0,0.10)",
  scrollThumbHover: "rgba(0,0,0,0.18)",
};

function getSidebarTokens(theme: SidebarTheme): SidebarTokens {
  return theme === "light" ? LIGHT_TOKENS : DARK_TOKENS;
}

const SidebarThemeContext = React.createContext<SidebarTokens>(DARK_TOKENS);
function useSidebarTheme() { return React.useContext(SidebarThemeContext); }

// ─── Types ───────────────────────────────────────────────────

interface FlatLesson {
  moduleId: string;
  moduleTitle: string;
  moduleIndex: number;
  topicId: string;
  topicTitle: string;
  lessonId: string;
  lessonTitle: string;
  globalIndex: number;
}

// ─── Helpers ─────────────────────────────────────────────────

function flattenLessons(structure: CourseModule[]): FlatLesson[] {
  const flat: FlatLesson[] = [];
  structure.forEach((mod, mi) => {
    for (const topic of mod.topics) {
      for (const lesson of topic.lessons) {
        flat.push({
          moduleId: mod.id,
          moduleTitle: mod.title,
          moduleIndex: mi,
          topicId: topic.id,
          topicTitle: topic.title,
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          globalIndex: flat.length,
        });
      }
    }
  });
  return flat;
}

// ─── Progress Ring ───────────────────────────────────────────

function ProgressRing({ progress, number }: { progress: number; number: string }) {
  const t = useSidebarTheme();
  const circumference = 2 * Math.PI * 14;
  const hasProgress = progress > 0;
  const isComplete = progress === 100;

  return (
    <svg width="34" height="34" viewBox="0 0 34 34" className="shrink-0">
      <circle cx="17" cy="17" r="14" fill="none" stroke={t.ringTrack} strokeWidth="2" />
      {hasProgress && (
        <circle
          cx="17" cy="17" r="14" fill="none"
          stroke={isComplete ? t.ringFillComplete : t.ringFill}
          strokeWidth="2" strokeLinecap="round"
          strokeDasharray={`${(progress / 100) * circumference} ${circumference}`}
          transform="rotate(-90 17 17)"
          style={{ transition: "stroke-dasharray 0.5s ease" }}
        />
      )}
      <text x="17" y="17" textAnchor="middle" dominantBaseline="central"
        className="text-cv-micro"
        style={{
          fontWeight: 500,
          fill: isComplete ? t.ringNumberActive : hasProgress ? t.ringNumber : t.ringNumberFaint,
        }}
      >
        {number}
      </text>
    </svg>
  );
}

// ─── Sidebar Lesson Item ─────────────────────────────────────

function SidebarLessonItem({
  title,
  isActive,
  isVisited,
  hasContent,
  onSelect,
}: {
  title: string;
  isActive: boolean;
  isVisited: boolean;
  hasContent: boolean;
  onSelect: () => void;
}) {
  const t = useSidebarTheme();
  const isLocked = !hasContent && !isVisited;

  return (
    <button
      onClick={onSelect}
      className={cn(
        "relative flex items-center w-full py-1.5 pl-[48px] pr-3 rounded-md text-left text-cv-xs transition-colors",
        isLocked ? "cursor-default opacity-40" : "cursor-pointer",
      )}
      style={{
        backgroundColor: isActive ? t.activeBg : undefined,
      }}
      onMouseEnter={(e) => { if (!isActive && !isLocked) e.currentTarget.style.backgroundColor = t.hoverBg; }}
      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = ""; }}
    >
      <span
        className="flex-1 min-w-0 leading-snug truncate font-normal"
        style={{
          color: isActive ? t.text : isLocked ? t.textFaint : t.textMuted,
        }}
      >
        {title || "Untitled Lesson"}
      </span>
      {isActive && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-l" style={{ backgroundColor: t.activeIndicator }} />
      )}
    </button>
  );
}

// ─── Sidebar Topic Section ───────────────────────────────────

function SidebarTopicSection({
  topic,
  defaultOpen,
  currentLessonId,
  visitedLessons,
  onSelectLesson,
  onSelectTopic,
}: {
  topic: CourseModule["topics"][0];
  defaultOpen: boolean;
  currentLessonId: string | null;
  visitedLessons: Set<string>;
  onSelectLesson: (moduleId: string, topicId: string, lessonId: string) => void;
  onSelectTopic: (moduleId: string, topicId: string) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const { structure } = useCourse();
  const tk = useSidebarTheme();
  // Find which module this topic belongs to
  const mod = structure.find((m) => m.topics.some((t) => t.id === topic.id));
  const moduleId = mod?.id ?? "";

  return (
    <div className="mb-0.5">
      <div
        className="flex items-center gap-3 py-2 pl-5 pr-3 rounded-md transition-colors"
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = tk.hoverBg; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ""; }}
      >
        <button onClick={() => setOpen(!open)} className="shrink-0">
          <ChevronRight className={cn(
            "h-3.5 w-3.5 transition-transform duration-250 ease-[cubic-bezier(0.4,0,0.2,1)]",
            open && "rotate-90"
          )} style={{ color: tk.chevron }} />
        </button>
        <button
          onClick={() => {
            onSelectTopic(moduleId, topic.id);
            setOpen(true);
          }}
          className="flex-1 min-w-0 text-left"
        >
          <span className="text-cv-xs font-semibold leading-snug truncate block" style={{ color: tk.topicText }}>
            {topic.title || "Untitled Topic"}
          </span>
        </button>
      </div>

      <div
        className="grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col gap-1 pt-1 pb-1">
            {topic.lessons.map((lesson) => {
              const hasContent = (lesson.blocks ?? []).length > 0;
              return (
                <SidebarLessonItem
                  key={lesson.id}
                  title={lesson.title}
                  isActive={lesson.id === currentLessonId}
                  isVisited={visitedLessons.has(lesson.id)}
                  hasContent={hasContent}
                  onSelect={() => onSelectLesson(moduleId, topic.id, lesson.id)}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar Module Section ──────────────────────────────────

function SidebarModuleSection({
  mod,
  moduleIndex,
  defaultOpen,
  flatLessons,
  currentLessonId,
  visitedLessons,
  onSelectLesson,
  onSelectModule,
  onSelectTopic,
}: {
  mod: CourseModule;
  moduleIndex: number;
  defaultOpen: boolean;
  flatLessons: FlatLesson[];
  currentLessonId: string | null;
  visitedLessons: Set<string>;
  onSelectLesson: (moduleId: string, topicId: string, lessonId: string) => void;
  onSelectModule: (moduleId: string) => void;
  onSelectTopic: (moduleId: string, topicId: string) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const tk = useSidebarTheme();

  const moduleLessons = flatLessons.filter((f) => f.moduleId === mod.id);
  const moduleCompleted = moduleLessons.filter((f) => visitedLessons.has(f.lessonId)).length;
  const moduleLessonCount = moduleLessons.length;
  const progress = moduleLessonCount > 0 ? Math.round((moduleCompleted / moduleLessonCount) * 100) : 0;
  const isFullyComplete = progress === 100 && moduleLessonCount > 0;
  const moduleNumber = String(moduleIndex + 1).padStart(2, "0");

  const topicHasProgress = (topic: CourseModule["topics"][0]) => {
    const visited = topic.lessons.filter((l) => visitedLessons.has(l.id)).length;
    return visited > 0 && visited < topic.lessons.length;
  };

  return (
    <div className="mb-1 rounded-lg transition-colors" style={{ backgroundColor: open ? tk.openBg : "transparent" }}>
      <div
        className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors"
        onMouseEnter={(e) => { if (!open) e.currentTarget.style.backgroundColor = tk.hoverBg; }}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.backgroundColor = ""; }}
      >
        <div className="shrink-0">
          <ProgressRing progress={progress} number={moduleNumber} />
        </div>
        <button
          onClick={() => {
            onSelectModule(mod.id);
            setOpen(true);
          }}
          className="flex-1 min-w-0 text-left"
        >
          <p className="text-cv-xs font-semibold leading-snug" style={{ color: tk.text }}>
            {mod.title || "Untitled Module"}
          </p>
        </button>
        <button onClick={() => setOpen(!open)} className="shrink-0">
          <ChevronRight className={cn(
            "h-3.5 w-3.5 transition-transform duration-250 ease-[cubic-bezier(0.4,0,0.2,1)]",
            open && "rotate-90"
          )} style={{ color: tk.chevron }} />
        </button>
      </div>

      <div
        className="grid transition-[grid-template-rows] duration-[350ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="px-1.5 pb-2 pl-6">
            <div className="ml-1 pl-2.5" style={{ borderLeft: `1.5px solid ${tk.borderLine}` }}>
              {mod.topics.map((topic) => (
                <SidebarTopicSection
                  key={topic.id}
                  topic={topic}
                  defaultOpen={topicHasProgress(topic)}
                  currentLessonId={currentLessonId}
                  visitedLessons={visitedLessons}
                  onSelectLesson={onSelectLesson}
                  onSelectTopic={onSelectTopic}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar Navigation ─────────────────────────────────────

function SidebarNav({
  title,
  structure,
  flatLessons,
  currentLessonId,
  visitedLessons,
  onSelectLesson,
  onSelectModule,
  onSelectTopic,
  onShowOverview,
  onContinue,
}: {
  title: string;
  structure: CourseModule[];
  flatLessons: FlatLesson[];
  currentLessonId: string | null;
  visitedLessons: Set<string>;
  onSelectLesson: (moduleId: string, topicId: string, lessonId: string) => void;
  onSelectModule: (moduleId: string) => void;
  onSelectTopic: (moduleId: string, topicId: string) => void;
  onShowOverview: () => void;
  onContinue?: () => void;
}) {
  const { brand, sidebarTheme, image: courseImage } = useCourse();
  const tk = getSidebarTokens(sidebarTheme);
  const totalLessons = flatLessons.length;
  const completedLessons = flatLessons.filter((f) => visitedLessons.has(f.lessonId)).length;
  const overallProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  const moduleHasProgress = (mod: CourseModule) => {
    const moduleLessons = flatLessons.filter((f) => f.moduleId === mod.id);
    const visited = moduleLessons.filter((f) => visitedLessons.has(f.lessonId)).length;
    return visited > 0 && visited < moduleLessons.length;
  };

  return (
    <SidebarThemeContext.Provider value={tk}>
    <div className="flex flex-col h-full relative overflow-hidden"
      style={{ fontFamily: BRAND_FONTS[brand || "edoomio"].bodyFont, backgroundColor: tk.bg }}
    >
      <div
        className="absolute -top-[100px] -left-[50px] w-[300px] h-[300px] pointer-events-none"
        style={{ background: tk.glowGradient }}
      />

      <div className="p-5 pb-4 shrink-0 relative">
        <button
          onClick={onShowOverview}
          className="text-cv-xs font-medium uppercase mb-3 transition-colors"
          style={{ color: tk.overviewText }}
          onMouseEnter={(e) => { e.currentTarget.style.color = tk.overviewHover; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = tk.overviewText; }}
        >
          ← Overview
        </button>
        <h1 className="text-cv-lg leading-snug" style={{ color: tk.text, fontFamily: BRAND_FONTS[brand || "edoomio"].headlineFont, fontWeight: BRAND_FONTS[brand || "edoomio"].headlineWeight }}>{title}</h1>

        {courseImage && (
          <div className="mt-3 w-full overflow-hidden rounded-md">
            <img src={courseImage} alt="" className="w-full h-auto object-contain" />
          </div>
        )}

        {totalLessons > 0 && (
          <div className="mt-3">
            <div className="flex justify-between items-baseline mb-1.5">
              <span className="text-cv-xs font-medium uppercase" style={{ color: tk.textFaint }}>Progress</span>
              <span className="text-cv-lg font-medium" style={{ color: tk.accentText }}>
                {overallProgress}<span className="text-cv-xs" style={{ color: tk.accentPercent }}>%</span>
              </span>
            </div>
            <div className="h-1 rounded overflow-hidden" style={{ backgroundColor: tk.progressTrack }}>
              <div
                className="h-full rounded transition-[width] duration-600 ease-out"
                style={{ width: `${overallProgress}%`, background: tk.progressBar }}
              />
            </div>
            <p className="text-cv-xs mt-1.5" style={{ color: tk.textFaint }}>
              {completedLessons} of {totalLessons} lessons completed
            </p>
          </div>
        )}
      </div>

      <div className="h-px mx-5" style={{ backgroundColor: tk.divider }} />

      <div className="flex-1 overflow-y-auto p-3 pb-6 sidebar-scroll">
        {structure.map((mod, i) => (
          <SidebarModuleSection
            key={mod.id}
            mod={mod}
            moduleIndex={i}
            defaultOpen={moduleHasProgress(mod)}
            flatLessons={flatLessons}
            currentLessonId={currentLessonId}
            visitedLessons={visitedLessons}
            onSelectLesson={onSelectLesson}
            onSelectModule={onSelectModule}
            onSelectTopic={onSelectTopic}
          />
        ))}
      </div>

      {onContinue && (
        <div className="p-4 px-5 shrink-0" style={{ borderTop: `1px solid ${tk.divider}` }}>
          <button
            onClick={onContinue}
            className="w-full py-2.5 rounded-lg text-cv-sm font-bold cursor-pointer transition-all hover:-translate-y-px"
            style={{ background: tk.continueGradient, color: tk.continueText, boxShadow: tk.continueShadow }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = tk.continueShadowHover; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = tk.continueShadow; }}
          >
            Continue Learning →
          </button>
        </div>
      )}

      <style>{`
        @keyframes pulse-ring {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.08); }
        }
        .sidebar-scroll::-webkit-scrollbar { width: 4px; }
        .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
        .sidebar-scroll::-webkit-scrollbar-thumb { background: ${tk.scrollThumb}; border-radius: 4px; }
        .sidebar-scroll::-webkit-scrollbar-thumb:hover { background: ${tk.scrollThumbHover}; }
      `}</style>
    </div>
    </SidebarThemeContext.Provider>
  );
}

// ─── Course Shell (layout wrapper) ──────────────────────────

export function CourseShell({ children }: { children: React.ReactNode }) {
  const { title, structure, slug, brand, worksheets } = useCourse();
  const router = useRouter();
  const pathname = usePathname();
  const { locale } = useParams<{ locale: string }>();

  const brandFonts = BRAND_FONTS[brand || "edoomio"];

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [chatSidebarOpen, setChatSidebarOpen] = useState(false);
  const [visitedLessons, setVisitedLessons] = useState<Set<string>>(new Set());

  const flatLessons = useMemo(() => flattenLessons(structure), [structure]);

  // Detect current lesson from URL
  const currentLessonId = useMemo(() => {
    // URL: /{locale}/course/{slug}/{moduleId}/{topicId}/{lessonId}
    const segments = pathname.split("/").filter(Boolean);
    // segments: [locale, "course", slug, moduleId?, topicId?, lessonId?]
    if (segments.length >= 6) return segments[5];
    return null;
  }, [pathname]);

  // Resolve current lesson content for AI chat
  const currentLessonData = useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length < 6) return null;
    const moduleId = segments[3];
    const topicId = segments[4];
    const lessonId = segments[5];
    const mod = structure.find((m) => m.id === moduleId);
    if (!mod) return null;
    const topic = mod.topics.find((t) => t.id === topicId);
    if (!topic) return null;
    const lesson = topic.lessons.find((l) => l.id === lessonId);
    if (!lesson) return null;

    // Resolve blocks (expand linked-blocks)
    const resolvedBlocks = (lesson.blocks ?? []).flatMap((block) => {
      if (block.type === "linked-blocks" && worksheets[block.worksheetId]) {
        return worksheets[block.worksheetId].blocks;
      }
      return [block];
    });

    return {
      title: lesson.title || "Untitled Lesson",
      context: extractBlocksText(resolvedBlocks, worksheets),
    };
  }, [pathname, structure, worksheets]);

  // Mark visited
  React.useEffect(() => {
    if (currentLessonId) {
      setVisitedLessons((prev) => {
        if (prev.has(currentLessonId)) return prev;
        return new Set(prev).add(currentLessonId);
      });
    }
  }, [currentLessonId]);

  const handleSelectLesson = useCallback(
    (moduleId: string, topicId: string, lessonId: string) => {
      setMobileNavOpen(false);
      router.push(`/${locale}/course/${slug}/${moduleId}/${topicId}/${lessonId}`);
    },
    [router, locale, slug]
  );

  const handleSelectModule = useCallback(
    (moduleId: string) => {
      setMobileNavOpen(false);
      router.push(`/${locale}/course/${slug}/${moduleId}`);
    },
    [router, locale, slug]
  );

  const handleSelectTopic = useCallback(
    (moduleId: string, topicId: string) => {
      setMobileNavOpen(false);
      router.push(`/${locale}/course/${slug}/${moduleId}/${topicId}`);
    },
    [router, locale, slug]
  );

  const handleShowOverview = useCallback(() => {
    setMobileNavOpen(false);
    router.push(`/${locale}/course/${slug}`);
  }, [router, locale, slug]);

  const firstUnvisited = flatLessons.find((f) => !visitedLessons.has(f.lessonId));
  const handleContinue = useCallback(() => {
    if (firstUnvisited) {
      handleSelectLesson(firstUnvisited.moduleId, firstUnvisited.topicId, firstUnvisited.lessonId);
    }
  }, [firstUnvisited, handleSelectLesson]);

  const completedCount = flatLessons.filter((f) => visitedLessons.has(f.lessonId)).length;
  const pct = flatLessons.length > 0 ? Math.round((completedCount / flatLessons.length) * 100) : 0;

  // Determine breadcrumb from URL
  const breadcrumb = useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length < 4) return null;
    const moduleId = segments[3];
    const topicId = segments.length >= 5 ? segments[4] : null;
    const lessonId = segments.length >= 6 ? segments[5] : null;
    const mod = structure.find((m) => m.id === moduleId);
    if (!mod) return null;
    const topic = topicId ? mod.topics.find((t) => t.id === topicId) : null;
    const lesson = topic && lessonId ? topic.lessons.find((l) => l.id === lessonId) : null;
    return { mod, topic, lesson };
  }, [pathname, structure]);

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Load brand fonts */}
      <link rel="stylesheet" href={brandFonts.googleFontsUrl} />

      {/* Top bar (mobile only) */}
      <div className="lg:hidden sticky top-0 z-30 bg-background/95 backdrop-blur border-b" style={{ fontFamily: brandFonts.bodyFont }}>
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => setMobileNavOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="text-cv-sm font-medium truncate">{title}</p>
          </div>
          <Badge variant="secondary" className="shrink-0 text-cv-micro">{pct}%</Badge>
        </div>
        <div className="h-0.5 bg-muted">
          <div className="h-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Mobile sidebar */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-[400px] p-0 border-none" showCloseButton={false}>
          <SheetHeader className="sr-only">
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>Course navigation</SheetDescription>
          </SheetHeader>
          <SidebarNav
            title={title}
            structure={structure}
            flatLessons={flatLessons}
            currentLessonId={currentLessonId}
            visitedLessons={visitedLessons}
            onSelectLesson={handleSelectLesson}
            onSelectModule={handleSelectModule}
            onSelectTopic={handleSelectTopic}
            onShowOverview={handleShowOverview}
            onContinue={firstUnvisited ? handleContinue : undefined}
          />
        </SheetContent>
      </Sheet>

      {/* Desktop layout */}
      <div className="min-h-screen lg:h-screen flex flex-col lg:flex-row gap-4 p-4">
        {/* Desktop sidebar */}
        <div className={cn(
          "hidden lg:flex shrink-0 relative transition-all duration-300",
          desktopSidebarOpen ? "w-[400px]" : "w-0"
        )}>
          <aside className={cn(
            "flex flex-col w-[400px] h-full rounded-lg overflow-hidden transition-all duration-300",
            desktopSidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          )}>
            <SidebarNav
              title={title}
              structure={structure}
              flatLessons={flatLessons}
              currentLessonId={currentLessonId}
              visitedLessons={visitedLessons}
              onSelectLesson={handleSelectLesson}
              onSelectModule={handleSelectModule}
              onSelectTopic={handleSelectTopic}
              onShowOverview={handleShowOverview}
              onContinue={firstUnvisited ? handleContinue : undefined}
            />
          </aside>
          <button
            className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center h-8 w-5 bg-background border rounded-r-md shadow-sm hover:bg-muted transition-colors"
            onClick={() => setDesktopSidebarOpen(!desktopSidebarOpen)}
            aria-label={desktopSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {desktopSidebarOpen ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        </div>

        {!desktopSidebarOpen && (
          <button
            className="hidden lg:flex sticky top-1/2 -translate-y-1/2 z-10 items-center justify-center h-8 w-5 bg-background border rounded-r-md shadow-sm hover:bg-muted transition-colors -ml-4"
            onClick={() => setDesktopSidebarOpen(true)}
            aria-label="Expand sidebar"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Right column: breadcrumb header + content + chat */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {/* Breadcrumb header (full width) */}
          <div className="flex items-center gap-2 pr-4 py-1.5 text-cv-xs text-muted-foreground shrink-0" style={{ fontFamily: brandFonts.bodyFont }}>
            {breadcrumb && (
              <>
                <button onClick={() => router.push(`/${locale}/course/${slug}/${breadcrumb.mod.id}`)} className="font-medium hover:text-foreground/80 transition-colors">
                  {breadcrumb.mod.title}
                </button>
                {breadcrumb.topic && (
                  <>
                    <ChevronRight className="h-3 w-3 shrink-0" />
                    <button onClick={() => router.push(`/${locale}/course/${slug}/${breadcrumb.mod.id}/${breadcrumb.topic!.id}`)} className="font-medium hover:text-foreground/80 transition-colors">
                      {breadcrumb.topic.title}
                    </button>
                  </>
                )}
                {breadcrumb.lesson && (
                  <>
                    <ChevronRight className="h-3 w-3 shrink-0" />
                    <span className="font-medium">{breadcrumb.lesson.title}</span>
                  </>
                )}
              </>
            )}
            {/* Brand logo */}
            <img
              src={DEFAULT_BRAND_SETTINGS[brand].logo}
              alt=""
              className="ml-auto h-6 w-auto"
            />
          </div>

          {/* Content + Chat row */}
          <div className="flex-1 min-h-0 flex flex-row gap-4">
            {/* Content container */}
            <div className="flex-1 min-w-0 rounded-lg border bg-background overflow-hidden">
              <style>{`
                .content-scroll::-webkit-scrollbar { width: 6px; background: transparent; }
                .content-scroll::-webkit-scrollbar-track { background: transparent; margin-block: 12px; }
                .content-scroll::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 9999px; min-height: 40px; }
                .content-scroll::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
                .content-scroll::-webkit-scrollbar-button { display: none; }
                .content-scroll::-webkit-scrollbar-corner { display: none; }
                .content-scroll { scrollbar-width: thin; scrollbar-color: #d1d5db transparent; }
                .course-content { font-family: ${brandFonts.bodyFont}; }
                .course-content p { font-size: 1.125rem; }
                .course-content h1 {
                  font-family: ${brandFonts.headlineFont};
                  font-weight: ${brandFonts.headlineWeight};
                }
                .course-content h2, .course-content h3,
                .course-content h4, .course-content h5, .course-content h6 {
                  font-family: ${brandFonts.subHeadlineFont};
                  font-weight: ${brandFonts.subHeadlineWeight};
                }
              `}</style>
              <div className="h-full w-full overflow-y-auto content-scroll course-content">
                {children}
              </div>
            </div>

            {/* Chat sidebar (desktop) */}
            <CourseChatSidebar
              open={chatSidebarOpen}
              onClose={() => setChatSidebarOpen(false)}
              lessonContext={currentLessonData?.context ?? ""}
              lessonTitle={currentLessonData?.title ?? ""}
            />
          </div>

          {/* Footer */}
          <div className="flex items-center gap-2 pr-4 py-3 text-cv-xs text-muted-foreground shrink-0" style={{ fontFamily: brandFonts.bodyFont }}>
            <span>© {new Date().getFullYear()} {brand === "lingostar" ? "lingostar | Marcel Allenspach" : "Edoomio"}. Alle Rechte vorbehalten.</span>
          </div>
        </div>

        {/* Chat toggle button (desktop, when sidebar is closed) */}
        {!chatSidebarOpen && (
          <button
            onClick={() => setChatSidebarOpen(true)}
            className="hidden lg:flex fixed bottom-8 right-8 z-30 items-center justify-center h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
            aria-label="Open chat"
          >
            <MessageCircle className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}
