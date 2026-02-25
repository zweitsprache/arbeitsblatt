"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  WorksheetBlock,
  WorksheetSettings,
} from "@/types/worksheet";
import {
  CourseModule,
  CourseLesson,
} from "@/types/course";
import { ViewerBlockRenderer } from "./viewer-block-renderer";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  ChevronLeft,
  FileText,
  Menu,
  GraduationCap,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
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

interface WorksheetData {
  id: string;
  title: string;
  slug: string;
  blocks: WorksheetBlock[];
  settings: WorksheetSettings;
}

interface CourseViewerProps {
  title: string;
  structure: CourseModule[];
  worksheets: Map<string, WorksheetData>;
  languageLevel?: string;
  description?: string;
}

interface FlatLesson {
  moduleId: string;
  moduleTitle: string;
  moduleIndex: number;
  topicId: string;
  topicTitle: string;
  lesson: CourseLesson;
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
          lesson,
          globalIndex: flat.length,
        });
      }
    }
  });
  return flat;
}

function countModuleLessons(mod: CourseModule): number {
  return mod.topics.reduce((sum, t) => sum + t.lessons.length, 0);
}

// ─── Progress Ring (concept: SVG circle with arc + number) ──

function ProgressRing({
  progress,
  number,
}: {
  progress: number;
  number: string;
}) {
  const circumference = 2 * Math.PI * 20; // r = 20
  const hasProgress = progress > 0;
  const isComplete = progress === 100;

  return (
    <svg width="46" height="46" viewBox="0 0 46 46" className="shrink-0">
      {/* Background track */}
      <circle
        cx="23" cy="23" r="20"
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth="2.5"
      />
      {/* Progress arc */}
      {hasProgress && (
        <circle
          cx="23" cy="23" r="20"
          fill="none"
          stroke={isComplete ? "#F2EDDA" : "rgba(242,237,218,0.7)"}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={`${(progress / 100) * circumference} ${circumference}`}
          transform="rotate(-90 23 23)"
          style={{ transition: "stroke-dasharray 0.5s ease" }}
        />
      )}
      {/* Number */}
      <text
        x="23" y="24"
        textAnchor="middle"
        dominantBaseline="central"
        className="text-cv-sm"
        style={{
          fontWeight: 500,
          fill: isComplete
            ? "#F2EDDA"
            : hasProgress
              ? "rgba(255,255,255,0.7)"
              : "rgba(255,255,255,0.25)",
        }}
      >
        {number}
      </text>
    </svg>
  );
}

// ─── Viewer Lesson Item (concept styling) ────────────────────

function ViewerLessonItem({
  lesson,
  isActive,
  isVisited,
  hasContent,
  onSelect,
}: {
  lesson: CourseLesson;
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
      {/* Title */}
      <span
        className={cn(
          "flex-1 min-w-0 leading-snug truncate font-normal",
          isActive
            ? "text-[#f0f0f0]"
            : isLocked
              ? "text-white/35"
              : "text-white/90"
        )}
      >
        {lesson.title || "Untitled Lesson"}
      </span>

      {/* Active indicator bar */}
      {isActive && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[3.5px] h-7 bg-[#F2EDDA] rounded-l" />
      )}
    </button>
  );
}

// ─── Viewer Topic Section (animated expand) ──────────────────

function ViewerTopicSection({
  topic,
  defaultOpen,
  selectedLessonId,
  visitedLessons,
  onSelectLesson,
}: {
  topic: CourseModule["topics"][0];
  defaultOpen: boolean;
  selectedLessonId: string | null;
  visitedLessons: Set<string>;
  onSelectLesson: (id: string) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mb-0.5">
      {/* Topic header */}
      <div className="flex items-center gap-4 py-3 pl-7 pr-3.5 rounded-lg transition-colors hover:bg-[rgba(255,255,255,0.04)]">
        <button onClick={() => setOpen(!open)} className="shrink-0">
          <ChevronRight
            className={cn(
              "h-[18px] w-[18px] text-white/35 transition-transform duration-250 ease-[cubic-bezier(0.4,0,0.2,1)]",
              open && "rotate-90"
            )}
          />
        </button>
        <button
          onClick={() => {
            const firstLesson = topic.lessons[0];
            if (firstLesson) {
              onSelectLesson(firstLesson.id);
              setOpen(true);
            }
          }}
          className="flex-1 min-w-0 text-left"
        >
          <span className="text-cv-base font-semibold text-white/80 leading-snug truncate block">
            {topic.title || "Untitled Topic"}
          </span>
        </button>
      </div>

      {/* Lessons — animated expand */}
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col gap-1 pt-1 pb-1">
            {topic.lessons.map((lesson) => {
              const hasContent = (lesson.blocks ?? []).length > 0;
              return (
                <ViewerLessonItem
                  key={lesson.id}
                  lesson={lesson}
                  isActive={lesson.id === selectedLessonId}
                  isVisited={visitedLessons.has(lesson.id)}
                  hasContent={hasContent}
                  onSelect={() => onSelectLesson(lesson.id)}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Viewer Module Section (progress ring + expand) ──────────

function ViewerModuleSection({
  mod,
  moduleIndex,
  defaultOpen,
  flatLessons,
  selectedLessonId,
  visitedLessons,
  onSelectLesson,
}: {
  mod: CourseModule;
  moduleIndex: number;
  defaultOpen: boolean;
  flatLessons: FlatLesson[];
  selectedLessonId: string | null;
  visitedLessons: Set<string>;
  onSelectLesson: (id: string) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const moduleLessons = flatLessons.filter((f) => f.moduleId === mod.id);
  const moduleCompleted = moduleLessons.filter((f) => visitedLessons.has(f.lesson.id)).length;
  const moduleLessonCount = moduleLessons.length;
  const progress = moduleLessonCount > 0 ? Math.round((moduleCompleted / moduleLessonCount) * 100) : 0;
  const isFullyComplete = progress === 100 && moduleLessonCount > 0;
  const moduleNumber = String(moduleIndex + 1).padStart(2, "0");

  // Compute per-topic progress for defaultOpen
  const topicHasProgress = (topic: CourseModule["topics"][0]) => {
    const visited = topic.lessons.filter((l) => visitedLessons.has(l.id)).length;
    return visited > 0 && visited < topic.lessons.length;
  };

  return (
    <div
      className={cn(
        "mb-1.5 rounded-xl transition-colors",
        open ? "bg-[rgba(255,255,255,0.02)]" : "bg-transparent"
      )}
    >
      {/* Module header */}
      <div
        className={cn(
          "flex items-center gap-4 px-[18px] py-2.5 rounded-xl transition-colors",
          !open && "hover:bg-[rgba(255,255,255,0.03)]"
        )}
      >
        {/* Progress ring */}
        <div className="shrink-0">
          <ProgressRing progress={progress} number={moduleNumber} />
        </div>

        {/* Title — navigates to first lesson */}
        <button
          onClick={() => {
            const firstLesson = mod.topics[0]?.lessons[0];
            if (firstLesson) {
              onSelectLesson(firstLesson.id);
              setOpen(true);
            }
          }}
          className="flex-1 min-w-0 text-left"
        >
          <p className="text-cv-base font-semibold text-white/[0.92] leading-snug">
            {mod.title || "Untitled Module"}
          </p>
        </button>

        {/* Chevron — toggles expand */}
        <button onClick={() => setOpen(!open)} className="shrink-0">
          <ChevronRight
            className={cn(
              "h-[18px] w-[18px] text-white/25 transition-transform duration-250 ease-[cubic-bezier(0.4,0,0.2,1)]",
              open && "rotate-90"
            )}
          />
        </button>
      </div>

      {/* Topics expand */}
      <div
        className="grid transition-[grid-template-rows] duration-[350ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="px-2 pb-3 pl-8">
            {/* Thin connecting line */}
            <div className="border-l-[1.5px] border-white/[0.06] ml-1.5 pl-3">
              {mod.topics.map((topic) => (
                <ViewerTopicSection
                  key={topic.id}
                  topic={topic}
                  defaultOpen={topicHasProgress(topic)}
                  selectedLessonId={selectedLessonId}
                  visitedLessons={visitedLessons}
                  onSelectLesson={onSelectLesson}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar Navigation (full concept design) ───────────────

function SidebarNav({
  title,
  structure,
  flatLessons,
  selectedLessonId,
  visitedLessons,
  onSelectLesson,
  onShowOverview,
  onContinue,
}: {
  title: string;
  structure: CourseModule[];
  flatLessons: FlatLesson[];
  selectedLessonId: string | null;
  visitedLessons: Set<string>;
  onSelectLesson: (id: string) => void;
  onShowOverview: () => void;
  onContinue?: () => void;
}) {
  const totalLessons = flatLessons.length;
  const completedLessons = flatLessons.filter((f) => visitedLessons.has(f.lesson.id)).length;
  const overallProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  // Module has progress if some lessons visited but not all
  const moduleHasProgress = (mod: CourseModule) => {
    const moduleLessons = flatLessons.filter((f) => f.moduleId === mod.id);
    const visited = moduleLessons.filter((f) => visitedLessons.has(f.lesson.id)).length;
    return visited > 0 && visited < moduleLessons.length;
  };

  return (
    <div className="flex flex-col h-full bg-[#302f2c] text-white relative overflow-hidden">
      {/* Ambient glow */}
      <div
        className="absolute -top-[100px] -left-[50px] w-[300px] h-[300px] pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(242,237,218,0.04) 0%, transparent 70%)",
        }}
      />

      {/* Header */}
      <div className="p-7 pb-6 shrink-0 relative">
        {/* Breadcrumb */}
        <button
          onClick={onShowOverview}
          className="text-cv-xs font-medium text-white/25 uppercase mb-4 hover:text-white/40 transition-colors"
        >
          ← Overview
        </button>

        {/* Course title */}
        <h1 className="text-cv-2xl font-bold text-white/95 leading-snug">
          {title}
        </h1>

        {/* Progress bar */}
        {totalLessons > 0 && (
          <div className="mt-5">
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-cv-xs font-medium text-white/30 uppercase">
                Progress
              </span>
              <span className="text-cv-2xl font-medium text-[#F2EDDA]">
                {overallProgress}
                <span className="text-cv-sm text-[rgba(242,237,218,0.5)]">%</span>
              </span>
            </div>
            <div className="h-1 bg-white/[0.06] rounded overflow-hidden">
              <div
                className="h-full rounded transition-[width] duration-600 ease-out"
                style={{
                  width: `${overallProgress}%`,
                  background: "linear-gradient(90deg, #F2EDDA, #F7F4E8)",
                }}
              />
            </div>
            <p className="text-cv-xs text-white/20 mt-1.5">
              {completedLessons} of {totalLessons} lessons completed
            </p>
          </div>
        )}
      </div>

      {/* Separator */}
      <div className="h-px bg-white/[0.06] mx-7" />

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 pb-9 sidebar-scroll">
        {structure.map((mod, i) => (
          <ViewerModuleSection
            key={mod.id}
            mod={mod}
            moduleIndex={i}
            defaultOpen={moduleHasProgress(mod)}
            flatLessons={flatLessons}
            selectedLessonId={selectedLessonId}
            visitedLessons={visitedLessons}
            onSelectLesson={onSelectLesson}
          />
        ))}
      </div>

      {/* Bottom action */}
      {onContinue && (
        <div className="p-5 px-7 border-t border-white/[0.06] shrink-0">
          <button
            onClick={onContinue}
            className="w-full py-3.5 rounded-xl text-cv-base font-bold cursor-pointer transition-all shadow-[0_2px_12px_rgba(242,237,218,0.15)] hover:shadow-[0_4px_20px_rgba(242,237,218,0.25)] hover:-translate-y-px"
            style={{
              background: "linear-gradient(135deg, #F2EDDA, #D9D4C0)",
              color: "#302f2c",
            }}
          >
            Continue Learning →
          </button>
        </div>
      )}

      {/* Animations + scrollbar */}
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

// ─── Main Component ──────────────────────────────────────────

export function CourseViewer({
  title,
  structure,
  worksheets,
  languageLevel,
  description,
}: CourseViewerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialLesson = searchParams.get("lesson");
  const didInit = useRef(false);

  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(initialLesson);
  const [visitedLessons, setVisitedLessons] = useState<Set<string>>(() => {
    return initialLesson ? new Set([initialLesson]) : new Set();
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);

  // Sync URL → state on popstate (back/forward)
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
  }, []);

  // Sync state → URL whenever selectedLessonId changes
  useEffect(() => {
    const current = searchParams.get("lesson");
    if (selectedLessonId && selectedLessonId !== current) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("lesson", selectedLessonId);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    } else if (!selectedLessonId && current) {
      router.replace(pathname, { scroll: false });
    }
  }, [selectedLessonId, pathname, router, searchParams]);

  const flatLessons = useMemo(() => flattenLessons(structure), [structure]);

  const currentIndex = flatLessons.findIndex((f) => f.lesson.id === selectedLessonId);
  const currentFlat = currentIndex >= 0 ? flatLessons[currentIndex] : null;
  const prevLesson = currentIndex > 0 ? flatLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < flatLessons.length - 1 ? flatLessons[currentIndex + 1] : null;

  // Resolve blocks: expand linked-blocks by fetching from worksheets map
  const resolvedBlocks = useMemo(() => {
    if (!currentFlat) return [];
    const blocks: WorksheetBlock[] = [];
    for (const block of currentFlat.lesson.blocks ?? []) {
      if (block.type === "linked-blocks") {
        const ws = worksheets.get(block.worksheetId);
        if (ws) {
          blocks.push(...ws.blocks);
        }
      } else {
        blocks.push(block);
      }
    }
    return blocks;
  }, [currentFlat, worksheets]);

  const hasContent = resolvedBlocks.length > 0;

  // Mark lesson as visited when selected
  useEffect(() => {
    if (selectedLessonId) {
      setVisitedLessons((prev) => {
        if (prev.has(selectedLessonId)) return prev;
        const next = new Set(prev);
        next.add(selectedLessonId);
        return next;
      });
    }
  }, [selectedLessonId]);

  const handleSelectLesson = useCallback((id: string) => {
    setSelectedLessonId(id);
    setMobileNavOpen(false);
  }, []);

  const handleShowOverview = useCallback(() => {
    setSelectedLessonId(null);
    setMobileNavOpen(false);
  }, []);

  const firstUnvisited = flatLessons.find((f) => !visitedLessons.has(f.lesson.id));
  const handleContinue = useCallback(() => {
    if (firstUnvisited) {
      handleSelectLesson(firstUnvisited.lesson.id);
    }
  }, [firstUnvisited, handleSelectLesson]);

  const completedCount = flatLessons.filter((f) => visitedLessons.has(f.lesson.id)).length;
  const pct = flatLessons.length > 0 ? Math.round((completedCount / flatLessons.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top bar (mobile only) */}
      <div className="lg:hidden sticky top-0 z-30 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-8 w-8"
            onClick={() => setMobileNavOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="text-cv-sm font-medium truncate">{title}</p>
            {currentFlat && (
              <p className="text-cv-xs text-muted-foreground truncate">
                {currentFlat.lesson.title}
              </p>
            )}
          </div>
          <Badge variant="secondary" className="shrink-0 text-cv-micro">
            {pct}%
          </Badge>
        </div>
        {/* Thin progress line */}
        <div className="h-0.5 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Mobile sidebar (Sheet drawer) */}
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
            selectedLessonId={selectedLessonId}
            visitedLessons={visitedLessons}
            onSelectLesson={handleSelectLesson}
            onShowOverview={handleShowOverview}
            onContinue={firstUnvisited ? handleContinue : undefined}
          />
        </SheetContent>
      </Sheet>

      <div className="min-h-screen lg:h-screen flex flex-col lg:flex-row gap-4 p-4">
        {/* Desktop sidebar */}
        <div
          className={cn(
            "hidden lg:flex shrink-0 relative transition-all duration-300",
            desktopSidebarOpen ? "w-[500px]" : "w-0"
          )}
        >
          <aside
            className={cn(
              "flex flex-col w-[500px] h-full rounded-lg overflow-hidden transition-all duration-300",
              desktopSidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
          >
            <SidebarNav
              title={title}
              structure={structure}
              flatLessons={flatLessons}
              selectedLessonId={selectedLessonId}
              visitedLessons={visitedLessons}
              onSelectLesson={handleSelectLesson}
              onShowOverview={handleShowOverview}
              onContinue={firstUnvisited ? handleContinue : undefined}
            />
          </aside>

          {/* Sidebar toggle — anchored to sidebar edge */}
          <button
            className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center h-8 w-5 bg-background border rounded-r-md shadow-sm hover:bg-muted transition-colors"
            onClick={() => setDesktopSidebarOpen(!desktopSidebarOpen)}
            aria-label={desktopSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {desktopSidebarOpen ? (
              <ChevronLeft className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        {/* Toggle when sidebar is hidden */}
        {!desktopSidebarOpen && (
          <button
            className="hidden lg:flex sticky top-1/2 -translate-y-1/2 z-10 items-center justify-center h-8 w-5 bg-background border rounded-r-md shadow-sm hover:bg-muted transition-colors -ml-4"
            onClick={() => setDesktopSidebarOpen(true)}
            aria-label="Expand sidebar"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Right column: header + content */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {/* Breadcrumb header — separate container */}
          {currentFlat && (
            <div className="flex items-center gap-2 px-6 py-5 text-cv-sm text-muted-foreground rounded-lg border bg-background shrink-0">
              <span className="font-medium">{currentFlat.moduleTitle}</span>
              <ChevronRight className="h-3.5 w-3.5 shrink-0" />
              <span className="font-medium">{currentFlat.topicTitle}</span>
              <ChevronRight className="h-3.5 w-3.5 shrink-0" />
              <span className="font-medium text-foreground">{currentFlat.lesson.title}</span>
            </div>
          )}

          {/* Content container */}
          <div className="flex-1 min-h-0 rounded-lg border bg-background overflow-hidden flex justify-center">
            <style>{`
              .content-scroll::-webkit-scrollbar { width: 6px; background: transparent; }
              .content-scroll::-webkit-scrollbar-track { background: transparent; margin-block: 12px; }
              .content-scroll::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 9999px; min-height: 40px; }
              .content-scroll::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
              .content-scroll::-webkit-scrollbar-button { display: none; }
              .content-scroll::-webkit-scrollbar-corner { display: none; }
              .content-scroll { scrollbar-width: thin; scrollbar-color: #d1d5db transparent; }
            `}</style>
            <div className="h-full w-full max-w-5xl overflow-y-auto content-scroll pt-2 pb-2">
              {!selectedLessonId ? (
                <CourseOverview
                  title={title}
                  description={description}
                  languageLevel={languageLevel}
                  structure={structure}
                  flatLessons={flatLessons}
                  visitedLessons={visitedLessons}
                  onSelectLesson={handleSelectLesson}
                />
              ) : currentFlat && hasContent ? (
                <LessonContent
                  currentFlat={currentFlat}
                  totalLessons={flatLessons.length}
                  blocks={resolvedBlocks}
                  prevLesson={prevLesson}
                  nextLesson={nextLesson}
                  onSelectLesson={handleSelectLesson}
                />
              ) : (
                <EmptyLesson
                  title={currentFlat?.lesson.title || ""}
                  prevLesson={prevLesson}
                  nextLesson={nextLesson}
                  onSelectLesson={handleSelectLesson}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Course Overview ─────────────────────────────────────────

function CourseOverview({
  title,
  description,
  languageLevel,
  structure,
  flatLessons,
  visitedLessons,
  onSelectLesson,
}: {
  title: string;
  description?: string;
  languageLevel?: string;
  structure: CourseModule[];
  flatLessons: FlatLesson[];
  visitedLessons: Set<string>;
  onSelectLesson: (id: string) => void;
}) {
  const firstUnvisited = flatLessons.find((f) => !visitedLessons.has(f.lesson.id));

  return (
    <div className="py-8 lg:py-12 px-4 sm:px-6">
      <div className="overflow-hidden">
        {/* Hero */}
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-6 sm:px-8 py-8 sm:py-10">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <GraduationCap className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-cv-3xl font-bold tracking-tight">{title}</h1>
              {description && (
                <p className="text-muted-foreground mt-2 text-cv-base leading-relaxed">
                  {description}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {languageLevel && <Badge variant="secondary">{languageLevel}</Badge>}
                <Badge variant="outline">
                  {structure.length} {structure.length === 1 ? "Module" : "Modules"}
                </Badge>
                <Badge variant="outline">
                  {flatLessons.length} {flatLessons.length === 1 ? "Lesson" : "Lessons"}
                </Badge>
              </div>
            </div>
          </div>
          {firstUnvisited && (
            <div className="mt-6">
              <Button onClick={() => onSelectLesson(firstUnvisited.lesson.id)} className="gap-2">
                {visitedLessons.size > 0 ? "Continue learning" : "Start course"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Module list */}
        <div className="px-6 sm:px-8 py-6 space-y-4">
          {structure.map((mod, i) => {
            const moduleLessons = flatLessons.filter((f) => f.moduleId === mod.id);
            const moduleDone = moduleLessons.filter((f) => visitedLessons.has(f.lesson.id)).length;
            const isComplete = moduleDone === moduleLessons.length && moduleLessons.length > 0;

            return (
              <div
                key={mod.id}
                className={cn(
                  "border rounded-xl p-4 sm:p-5 transition-colors",
                  isComplete && "border-primary/30 bg-primary/[0.02]"
                )}
              >
                <div className="flex items-start gap-3">
                  <span className={cn(
                    "flex items-center justify-center h-7 w-7 rounded-lg text-cv-xs font-bold shrink-0 mt-0.5",
                    isComplete ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {isComplete ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-cv-base">{mod.title}</h2>
                    <div className="mt-2 space-y-1">
                      {mod.topics.map((topic) => (
                        <div key={topic.id}>
                          <p className="text-cv-xs font-medium text-muted-foreground mb-0.5">
                            {topic.title}
                          </p>
                          <div className="flex flex-wrap gap-1 ml-1">
                            {topic.lessons.map((lesson) => {
                              const visited = visitedLessons.has(lesson.id);
                              return (
                                <button
                                  key={lesson.id}
                                  onClick={() => onSelectLesson(lesson.id)}
                                  className={cn(
                                    "text-cv-xs px-2 py-0.5 rounded-full transition-colors",
                                    visited
                                      ? "bg-primary/10 text-primary hover:bg-primary/20"
                                      : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                                  )}
                                >
                                  {lesson.title || "Untitled"}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Lesson Content ──────────────────────────────────────────

function LessonContent({
  currentFlat,
  totalLessons,
  blocks,
  prevLesson,
  nextLesson,
  onSelectLesson,
}: {
  currentFlat: FlatLesson;
  totalLessons: number;
  blocks: WorksheetBlock[];
  prevLesson: FlatLesson | null;
  nextLesson: FlatLesson | null;
  onSelectLesson: (id: string) => void;
}) {
  return (
    <div className="py-6 lg:py-8 px-4 sm:px-6">
      <div className="overflow-hidden">
        <div className="px-6 sm:px-8 pt-6 sm:pt-8 pb-4">
          <p className="text-cv-xs text-muted-foreground mb-1">
            Lesson {currentFlat.globalIndex + 1} of {totalLessons}
          </p>
          <h2 className="text-cv-2xl font-bold">
            {currentFlat.lesson.title}
          </h2>
        </div>
        <div className="px-6 sm:px-8 py-6 sm:py-8 space-y-4 text-cv-base">
          {blocks.map((block) => (
            <ViewerBlockRenderer key={block.id} block={block} mode="online" />
          ))}
          {blocks.length === 0 && (
            <p className="text-muted-foreground text-center py-8">
              No content available for this lesson.
            </p>
          )}
        </div>
      </div>

      <LessonNav prev={prevLesson} next={nextLesson} onSelect={onSelectLesson} />
    </div>
  );
}

// ─── Empty Lesson ────────────────────────────────────────────

function EmptyLesson({
  title,
  prevLesson,
  nextLesson,
  onSelectLesson,
}: {
  title: string;
  prevLesson: FlatLesson | null;
  nextLesson: FlatLesson | null;
  onSelectLesson: (id: string) => void;
}) {
  return (
    <div className="py-8 lg:py-12 px-4 sm:px-6">
      <div className="p-8 sm:p-12 text-center">
        <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
          <FileText className="h-8 w-8 text-muted-foreground/40" />
        </div>
        <h2 className="text-cv-xl font-semibold mb-2">{title}</h2>
        <p className="text-muted-foreground text-cv-sm">
          No content available for this lesson yet.
        </p>
      </div>
      <LessonNav prev={prevLesson} next={nextLesson} onSelect={onSelectLesson} />
    </div>
  );
}

// ─── Prev / Next Cards ──────────────────────────────────────

function LessonNav({
  prev,
  next,
  onSelect,
}: {
  prev: FlatLesson | null;
  next: FlatLesson | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex items-stretch gap-3 mt-6">
      {prev ? (
        <button
          className="flex-1 flex items-center gap-3 px-4 py-3 bg-background border rounded-xl hover:bg-muted/50 transition-colors text-left group"
          onClick={() => onSelect(prev.lesson.id)}
        >
          <ArrowLeft className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
          <div className="min-w-0">
            <p className="text-cv-micro text-muted-foreground uppercase tracking-wider">Previous</p>
            <p className="text-cv-sm font-medium truncate">{prev.lesson.title}</p>
          </div>
        </button>
      ) : <div className="flex-1" />}
      {next ? (
        <button
          className="flex-1 flex items-center justify-end gap-3 px-4 py-3 bg-background border rounded-xl hover:bg-muted/50 transition-colors text-right group"
          onClick={() => onSelect(next.lesson.id)}
        >
          <div className="min-w-0">
            <p className="text-cv-micro text-muted-foreground uppercase tracking-wider">Next</p>
            <p className="text-cv-sm font-medium truncate">{next.lesson.title}</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
        </button>
      ) : <div className="flex-1" />}
    </div>
  );
}
