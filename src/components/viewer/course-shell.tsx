"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useRouter, usePathname, useParams } from "next/navigation";
import { CourseModule, SidebarTheme } from "@/types/course";
import { Brand, BRAND_FONTS, DEFAULT_BRAND_SETTINGS } from "@/types/worksheet";
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
import { CourseLanguageSwitcher } from "./course-language-switcher";
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

const LINGOSTAR_LIGHT_TOKENS: SidebarTokens = {
  bg: "#ffffff",
  text: "rgba(0,0,0,0.85)",
  textMuted: "rgba(0,0,0,0.70)",
  textFaint: "rgba(0,0,0,0.25)",
  accentText: "#3a4f40",
  accentPercent: "rgba(58,79,64,0.5)",
  progressBar: "linear-gradient(90deg, #3a4f40, #4d6953)",
  progressTrack: "rgba(0,0,0,0.06)",
  ringTrack: "rgba(0,0,0,0.08)",
  ringFill: "rgba(58,79,64,0.6)",
  ringFillComplete: "#3a4f40",
  ringNumber: "rgba(0,0,0,0.55)",
  ringNumberActive: "#3a4f40",
  ringNumberFaint: "rgba(0,0,0,0.20)",
  divider: "rgba(0,0,0,0.07)",
  hoverBg: "rgba(0,0,0,0.03)",
  activeBg: "rgba(58,79,64,0.08)",
  activeIndicator: "#3a4f40",
  openBg: "rgba(0,0,0,0.02)",
  topicText: "rgba(0,0,0,0.65)",
  chevron: "rgba(0,0,0,0.25)",
  borderLine: "rgba(0,0,0,0.07)",
  continueGradient: "linear-gradient(135deg, #3a4f40, #4d6953)",
  continueText: "#ffffff",
  continueShadow: "0 2px 12px rgba(58,79,64,0.12)",
  continueShadowHover: "0 4px 20px rgba(58,79,64,0.20)",
  overviewText: "rgba(0,0,0,0.35)",
  overviewHover: "rgba(0,0,0,0.55)",
  glowGradient: "radial-gradient(circle, rgba(58,79,64,0.03) 0%, transparent 70%)",
  scrollThumb: "rgba(0,0,0,0.08)",
  scrollThumbHover: "rgba(0,0,0,0.15)",
};

function getSidebarTokens(theme: SidebarTheme, brand?: Brand): SidebarTokens {
  if (brand === "lingostar") {
    return theme === "dark" ? DARK_TOKENS : LINGOSTAR_LIGHT_TOKENS;
  }
  return theme === "light" ? LIGHT_TOKENS : DARK_TOKENS;
}

const SidebarThemeContext = React.createContext<SidebarTokens>(DARK_TOKENS);
function useSidebarTheme() { return React.useContext(SidebarThemeContext); }

// ─── Types ───────────────────────────────────────────────────

interface FlatLesson {
  moduleId: string;
  moduleTitle: string;
  moduleShortTitle: string;
  moduleIndex: number;
  topicId: string;
  topicTitle: string;
  topicShortTitle: string;
  lessonId: string;
  lessonTitle: string;
  lessonShortTitle: string;
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
          moduleShortTitle: mod.shortTitle,
          moduleIndex: mi,
          topicId: topic.id,
          topicTitle: topic.title,
          topicShortTitle: topic.shortTitle,
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          lessonShortTitle: lesson.shortTitle,
          globalIndex: flat.length,
        });
      }
    }
  });
  return flat;
}

// ─── Module Number ──────────────────────────────────────────

function ModuleNumber({ number }: { number: string }) {
  const t = useSidebarTheme();

  return (
    <span
      className="flex items-center justify-center h-7 w-7 rounded-full text-cv-micro font-medium shrink-0"
      style={{ color: t.ringNumber, border: `1.5px solid ${t.ringTrack}` }}
    >
      {number}
    </span>
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
    >
      <span
        className="flex-1 min-w-0 leading-snug truncate"
        style={{
          color: isActive ? t.text : isLocked ? t.textFaint : t.textMuted,
          fontWeight: isActive ? 600 : 400,
        }}
      >
        {title || "Untitled Lesson"}
      </span>
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
      <div className="flex items-center gap-3 py-2 pl-5 pr-3 rounded-md">
        <button onClick={() => setOpen(!open)} className="shrink-0">
          <ChevronRight className={cn(
            "h-3.5 w-3.5 transition-transform duration-200",
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
          <span className="text-cv-xs font-medium leading-snug truncate block" style={{ color: tk.topicText }}>
            {topic.shortTitle || topic.title || "Untitled Topic"}
          </span>
        </button>
      </div>

      <div
        className="grid transition-[grid-template-rows] duration-200"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col gap-0.5 pt-1 pb-1">
            {topic.lessons.map((lesson) => {
              const hasContent = (lesson.blocks ?? []).length > 0;
              return (
                <SidebarLessonItem
                  key={lesson.id}
                  title={lesson.shortTitle || lesson.title}
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
    <div className="mb-1 rounded-lg">
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
        <ModuleNumber number={moduleNumber} />
        <button
          onClick={() => {
            onSelectModule(mod.id);
            setOpen(true);
          }}
          className="flex-1 min-w-0 text-left"
        >
          <p className="text-cv-xs font-semibold leading-snug" style={{ color: tk.text }}>
            {mod.shortTitle || mod.title || "Untitled Module"}
          </p>
        </button>
        <button onClick={() => setOpen(!open)} className="shrink-0">
          <ChevronRight className={cn(
            "h-3.5 w-3.5 transition-transform duration-200",
            open && "rotate-90"
          )} style={{ color: tk.chevron }} />
        </button>
      </div>

      <div
        className="grid transition-[grid-template-rows] duration-200"
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
  const tk = getSidebarTokens(sidebarTheme, brand as Brand);
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
      style={{ fontFamily: BRAND_FONTS[brand || "edoomio"].bodyFont }}
    >
      {/* Header — matches breadcrumb / chat sidebar header */}
      <div className="flex items-center gap-2 px-6 py-4 border-b shrink-0">
        <button
          onClick={onShowOverview}
          className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          ←&ensp;Start
        </button>
      </div>

      <div className="p-5 pb-4 shrink-0 relative">
        <h1 className="text-cv-lg leading-snug" style={{ color: tk.text, fontFamily: BRAND_FONTS[brand || "edoomio"].headlineFont, fontWeight: BRAND_FONTS[brand || "edoomio"].headlineWeight }}>{title}</h1>

        {courseImage && (
          <div className="mt-3 w-full overflow-hidden rounded-md">
            <img src={courseImage} alt="" className="w-full h-auto object-contain" />
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
            className="w-full py-2.5 rounded-lg text-cv-sm font-semibold cursor-pointer transition-colors"
            style={{ background: tk.continueGradient, color: tk.continueText }}
          >
            Continue Learning →
          </button>
        </div>
      )}

      <style>{`
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
  const [chatSidebarOpen, setChatSidebarOpen] = useState(true);
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
    // segments: [locale, "course", slug, moduleId?, topicId?, lessonId?]
    if (segments.length < 3) return null;
    const isOverview = segments.length === 3;
    const moduleId = segments[3] ?? null;
    const topicId = segments.length >= 5 ? segments[4] : null;
    const lessonId = segments.length >= 6 ? segments[5] : null;
    const mod = moduleId ? structure.find((m) => m.id === moduleId) : null;
    const topic = mod && topicId ? mod.topics.find((t) => t.id === topicId) : null;
    const lesson = topic && lessonId ? topic.lessons.find((l) => l.id === lessonId) : null;
    return { isOverview, mod: mod ?? null, topic: topic ?? null, lesson: lesson ?? null };
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
          <CourseLanguageSwitcher />
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
      {/* Top bar (full width, outside padding) */}
      <div className="hidden lg:flex items-center gap-2 px-8 py-5 text-cv-xs text-muted-foreground shrink-0 bg-white border-b" style={{ fontFamily: brandFonts.bodyFont }}>
        {/* Brand logo */}
        <img
          src={DEFAULT_BRAND_SETTINGS[brand].logo}
          alt=""
          className="h-8 w-auto mr-2"
        />
        {/* Language switcher */}
        <div className="ml-auto flex items-center gap-3">
          <CourseLanguageSwitcher />
        </div>
      </div>

      <div className="min-h-screen lg:h-screen flex flex-col p-8 pt-0 lg:pt-6 gap-6">
        {/* Middle row: sidebar + content + chat */}
        <div className="flex-1 min-h-0 flex flex-row gap-8">
          {/* Desktop sidebar */}
          <div className={cn(
            "hidden lg:flex shrink-0 relative transition-all duration-300",
            desktopSidebarOpen ? "w-[400px]" : "w-0"
          )}>
            <aside className={cn(
              "flex flex-col w-[400px] h-full rounded-lg border bg-background overflow-hidden transition-all duration-300",
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
              className="hidden lg:flex sticky top-1/2 -translate-y-1/2 z-10 items-center justify-center h-8 w-5 bg-background border rounded-r-md shadow-sm hover:bg-muted transition-colors -ml-8"
              onClick={() => setDesktopSidebarOpen(true)}
              aria-label="Expand sidebar"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Content container */}
          <div className="flex-1 min-w-0 rounded-lg border bg-background overflow-hidden">
            <style>{`
              .content-scroll::-webkit-scrollbar { width: 6px; }
              .content-scroll::-webkit-scrollbar-track { background: transparent; margin-block: 32px; }
              .content-scroll::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 9999px; min-height: 40px; }
              .content-scroll::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
              .content-scroll::-webkit-scrollbar-button { display: none; height: 0; }
              .content-scroll::-webkit-scrollbar-corner { display: none; }
              .course-content { font-family: ${brandFonts.bodyFont}; font-size: 1.125rem; }
              .course-content p { font-size: 1.125rem; }
              .course-content .email-skeleton-fields { font-size: 1.125rem; }
              .course-content h1 {
                font-family: ${brandFonts.headlineFont};
                font-weight: ${brandFonts.headlineWeight};
              }
              .course-content h2, .course-content h3,
              .course-content h4, .course-content h5, .course-content h6 {
                font-family: ${brandFonts.subHeadlineFont};
                font-weight: ${brandFonts.subHeadlineWeight};
              }
              .course-content h2 {
                font-size: 1.25rem;
                font-weight: 700;
              }
            `}</style>
            <div className="h-full flex flex-col">
              {/* Breadcrumb path */}
              {breadcrumb && (
                <div className="flex items-center gap-2 px-6 py-4 text-sm text-muted-foreground border-b shrink-0" style={{ fontFamily: brandFonts.bodyFont }}>
                  {breadcrumb.isOverview ? (
                    <span className="font-medium text-foreground">Start</span>
                  ) : (
                    <button onClick={() => router.push(`/${locale}/course/${slug}`)} className="font-medium hover:text-foreground/80 transition-colors">
                      Start
                    </button>
                  )}
                  {breadcrumb.mod && (
                    <>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                      {!breadcrumb.topic ? (
                        <span className="font-medium text-foreground">{breadcrumb.mod.title}</span>
                      ) : (
                        <button onClick={() => router.push(`/${locale}/course/${slug}/${breadcrumb.mod!.id}`)} className="font-medium hover:text-foreground/80 transition-colors">
                          {breadcrumb.mod.title}
                        </button>
                      )}
                    </>
                  )}
                  {breadcrumb.topic && (
                    <>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                      {!breadcrumb.lesson ? (
                        <span className="font-medium text-foreground">{breadcrumb.topic.title}</span>
                      ) : (
                        <button onClick={() => router.push(`/${locale}/course/${slug}/${breadcrumb.mod!.id}/${breadcrumb.topic!.id}`)} className="font-medium hover:text-foreground/80 transition-colors">
                          {breadcrumb.topic.title}
                        </button>
                      )}
                    </>
                  )}
                  {breadcrumb.lesson && (
                    <>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                      <span className="font-medium text-foreground">{breadcrumb.lesson.title}</span>
                    </>
                  )}
                </div>
              )}
              <div className="flex-1 min-h-0 flex">
                <div className="flex-1 min-w-0 overflow-y-auto content-scroll course-content">
                  {children}
                </div>
                <div className="w-6 shrink-0" />
              </div>
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
      </div>

      {/* Footer (full width) */}
      <div className="hidden lg:flex items-center gap-2 px-8 py-5 text-cv-xs text-muted-foreground shrink-0 bg-white border-t sticky bottom-0 z-20" style={{ fontFamily: brandFonts.bodyFont }}>
        <span>© {new Date().getFullYear()} {brand === "lingostar" ? "lingostar | Marcel Allenspach" : "Edoomio"}. Alle Rechte vorbehalten.</span>
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
  );
}
