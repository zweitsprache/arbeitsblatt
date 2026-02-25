"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useRouter, usePathname, useParams } from "next/navigation";
import { CourseModule } from "@/types/course";
import { useCourse } from "./course-context";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  ChevronLeft,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

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
  const circumference = 2 * Math.PI * 20;
  const hasProgress = progress > 0;
  const isComplete = progress === 100;

  return (
    <svg width="46" height="46" viewBox="0 0 46 46" className="shrink-0">
      <circle cx="23" cy="23" r="20" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
      {hasProgress && (
        <circle
          cx="23" cy="23" r="20" fill="none"
          stroke={isComplete ? "#F2EDDA" : "rgba(242,237,218,0.7)"}
          strokeWidth="2.5" strokeLinecap="round"
          strokeDasharray={`${(progress / 100) * circumference} ${circumference}`}
          transform="rotate(-90 23 23)"
          style={{ transition: "stroke-dasharray 0.5s ease" }}
        />
      )}
      <text x="23" y="24" textAnchor="middle" dominantBaseline="central"
        className="text-cv-sm"
        style={{
          fontWeight: 500,
          fill: isComplete ? "#F2EDDA" : hasProgress ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.25)",
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
  const isLocked = !hasContent && !isVisited;

  return (
    <button
      onClick={onSelect}
      className={cn(
        "relative flex items-center w-full py-2.5 pl-[62px] pr-3.5 rounded-lg text-left text-cv-xl transition-colors",
        isLocked ? "cursor-default opacity-40" : "cursor-pointer",
        isActive ? "bg-[rgba(242,237,218,0.08)]" : "hover:bg-[rgba(255,255,255,0.03)]"
      )}
    >
      <span className={cn(
        "flex-1 min-w-0 leading-snug truncate font-normal",
        isActive ? "text-[#f0f0f0]" : isLocked ? "text-white/35" : "text-white/90"
      )}>
        {title || "Untitled Lesson"}
      </span>
      {isActive && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[3.5px] h-7 bg-[#F2EDDA] rounded-l" />
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
  // Find which module this topic belongs to
  const mod = structure.find((m) => m.topics.some((t) => t.id === topic.id));
  const moduleId = mod?.id ?? "";

  return (
    <div className="mb-0.5">
      <div className="flex items-center gap-4 py-3 pl-7 pr-3.5 rounded-lg transition-colors hover:bg-[rgba(255,255,255,0.04)]">
        <button onClick={() => setOpen(!open)} className="shrink-0">
          <ChevronRight className={cn(
            "h-[18px] w-[18px] text-white/35 transition-transform duration-250 ease-[cubic-bezier(0.4,0,0.2,1)]",
            open && "rotate-90"
          )} />
        </button>
        <button
          onClick={() => {
            onSelectTopic(moduleId, topic.id);
            setOpen(true);
          }}
          className="flex-1 min-w-0 text-left"
        >
          <span className="text-cv-base font-semibold text-white/80 leading-snug truncate block">
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
    <div className={cn("mb-1.5 rounded-xl transition-colors", open ? "bg-[rgba(255,255,255,0.02)]" : "bg-transparent")}>
      <div
        className={cn(
          "flex items-center gap-4 px-[18px] py-2.5 rounded-xl transition-colors",
          !open && "hover:bg-[rgba(255,255,255,0.03)]"
        )}
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
          <p className="text-cv-base font-semibold text-white/[0.92] leading-snug">
            {mod.title || "Untitled Module"}
          </p>
        </button>
        <button onClick={() => setOpen(!open)} className="shrink-0">
          <ChevronRight className={cn(
            "h-[18px] w-[18px] text-white/25 transition-transform duration-250 ease-[cubic-bezier(0.4,0,0.2,1)]",
            open && "rotate-90"
          )} />
        </button>
      </div>

      <div
        className="grid transition-[grid-template-rows] duration-[350ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="px-2 pb-3 pl-8">
            <div className="border-l-[1.5px] border-white/[0.06] ml-1.5 pl-3">
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
  const totalLessons = flatLessons.length;
  const completedLessons = flatLessons.filter((f) => visitedLessons.has(f.lessonId)).length;
  const overallProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  const moduleHasProgress = (mod: CourseModule) => {
    const moduleLessons = flatLessons.filter((f) => f.moduleId === mod.id);
    const visited = moduleLessons.filter((f) => visitedLessons.has(f.lessonId)).length;
    return visited > 0 && visited < moduleLessons.length;
  };

  return (
    <div className="flex flex-col h-full bg-[#302f2c] text-white relative overflow-hidden">
      <div
        className="absolute -top-[100px] -left-[50px] w-[300px] h-[300px] pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(242,237,218,0.04) 0%, transparent 70%)" }}
      />

      <div className="p-7 pb-6 shrink-0 relative">
        <button
          onClick={onShowOverview}
          className="text-cv-xs font-medium text-white/25 uppercase mb-4 hover:text-white/40 transition-colors"
        >
          ← Overview
        </button>
        <h1 className="text-cv-2xl font-bold text-white/95 leading-snug">{title}</h1>

        {totalLessons > 0 && (
          <div className="mt-5">
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-cv-xs font-medium text-white/30 uppercase">Progress</span>
              <span className="text-cv-2xl font-medium text-[#F2EDDA]">
                {overallProgress}<span className="text-cv-sm text-[rgba(242,237,218,0.5)]">%</span>
              </span>
            </div>
            <div className="h-1 bg-white/[0.06] rounded overflow-hidden">
              <div
                className="h-full rounded transition-[width] duration-600 ease-out"
                style={{ width: `${overallProgress}%`, background: "linear-gradient(90deg, #F2EDDA, #F7F4E8)" }}
              />
            </div>
            <p className="text-cv-xs text-white/20 mt-1.5">
              {completedLessons} of {totalLessons} lessons completed
            </p>
          </div>
        )}
      </div>

      <div className="h-px bg-white/[0.06] mx-7" />

      <div className="flex-1 overflow-y-auto p-4 pb-9 sidebar-scroll">
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
        <div className="p-5 px-7 border-t border-white/[0.06] shrink-0">
          <button
            onClick={onContinue}
            className="w-full py-3.5 rounded-xl text-cv-base font-bold cursor-pointer transition-all shadow-[0_2px_12px_rgba(242,237,218,0.15)] hover:shadow-[0_4px_20px_rgba(242,237,218,0.25)] hover:-translate-y-px"
            style={{ background: "linear-gradient(135deg, #F2EDDA, #D9D4C0)", color: "#302f2c" }}
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
        .sidebar-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 4px; }
        .sidebar-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
      `}</style>
    </div>
  );
}

// ─── Course Shell (layout wrapper) ──────────────────────────

export function CourseShell({ children }: { children: React.ReactNode }) {
  const { title, structure, slug } = useCourse();
  const router = useRouter();
  const pathname = usePathname();
  const { locale } = useParams<{ locale: string }>();

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
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
      {/* Top bar (mobile only) */}
      <div className="lg:hidden sticky top-0 z-30 bg-background/95 backdrop-blur border-b">
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
        <SheetContent side="left" className="w-[500px] p-0 border-none" showCloseButton={false}>
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
          desktopSidebarOpen ? "w-[500px]" : "w-0"
        )}>
          <aside className={cn(
            "flex flex-col w-[500px] h-full rounded-lg overflow-hidden transition-all duration-300",
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

        {/* Right column: breadcrumb header + content */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {/* Breadcrumb header */}
          {breadcrumb && (
            <div className="flex items-center gap-2 px-6 py-5 text-cv-sm text-muted-foreground rounded-lg border bg-background shrink-0">
              <button onClick={() => router.push(`/${locale}/course/${slug}/${breadcrumb.mod.id}`)} className="font-medium hover:text-foreground transition-colors">
                {breadcrumb.mod.title}
              </button>
              {breadcrumb.topic && (
                <>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                  <button onClick={() => router.push(`/${locale}/course/${slug}/${breadcrumb.mod.id}/${breadcrumb.topic!.id}`)} className="font-medium hover:text-foreground transition-colors">
                    {breadcrumb.topic.title}
                  </button>
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

          {/* Content container */}
          <div className="flex-1 min-h-0 rounded-lg border bg-background overflow-hidden">
            <style>{`
              .content-scroll::-webkit-scrollbar { width: 6px; background: transparent; }
              .content-scroll::-webkit-scrollbar-track { background: transparent; margin-block: 12px; }
              .content-scroll::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 9999px; min-height: 40px; }
              .content-scroll::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
              .content-scroll::-webkit-scrollbar-button { display: none; }
              .content-scroll::-webkit-scrollbar-corner { display: none; }
              .content-scroll { scrollbar-width: thin; scrollbar-color: #d1d5db transparent; }
            `}</style>
            <div className="h-full w-full overflow-y-auto content-scroll">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
