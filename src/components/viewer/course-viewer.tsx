"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
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
  ChevronDown,
  ChevronLeft,
  FileText,
  Menu,
  CheckCircle2,
  Circle,
  GraduationCap,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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

// ─── Progress Bar ────────────────────────────────────────────

function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] text-muted-foreground tabular-nums whitespace-nowrap">
        {completed}/{total}
      </span>
    </div>
  );
}

// ─── Sidebar Navigation Content ─────────────────────────────

function SidebarNav({
  title,
  structure,
  flatLessons,
  selectedLessonId,
  visitedLessons,
  onSelectLesson,
  onShowOverview,
}: {
  title: string;
  structure: CourseModule[];
  flatLessons: FlatLesson[];
  selectedLessonId: string | null;
  visitedLessons: Set<string>;
  onSelectLesson: (id: string) => void;
  onShowOverview: () => void;
}) {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    () => new Set(structure.map((m) => m.id))
  );

  const toggleModule = (id: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalLessons = flatLessons.length;
  const completedLessons = flatLessons.filter((f) => visitedLessons.has(f.lesson.id)).length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <button
          onClick={onShowOverview}
          className="flex items-center gap-2.5 w-full text-left group"
        >
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
            <GraduationCap className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold text-sm leading-tight truncate group-hover:text-primary transition-colors">
              {title}
            </h2>
            <p className="text-[11px] text-muted-foreground">
              {structure.length} {structure.length === 1 ? "Module" : "Modules"} · {totalLessons} {totalLessons === 1 ? "Lesson" : "Lessons"}
            </p>
          </div>
        </button>
        <ProgressBar completed={completedLessons} total={totalLessons} />
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1">
        <nav className="p-2 space-y-1" aria-label="Course navigation">
          {structure.map((mod, moduleIndex) => {
            const isExpanded = expandedModules.has(mod.id);
            const moduleLessonCount = countModuleLessons(mod);
            const moduleCompleted = flatLessons
              .filter((f) => f.moduleId === mod.id)
              .filter((f) => visitedLessons.has(f.lesson.id)).length;
            const isModuleComplete = moduleCompleted === moduleLessonCount && moduleLessonCount > 0;

            return (
              <div key={mod.id}>
                {/* Module header */}
                <button
                  className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-left transition-colors hover:bg-muted/80"
                  onClick={() => toggleModule(mod.id)}
                  aria-expanded={isExpanded}
                >
                  <span className={cn(
                    "flex items-center justify-center h-5 w-5 rounded-md text-[10px] font-bold shrink-0",
                    isModuleComplete
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {moduleIndex + 1}
                  </span>

                  <span className="flex-1 text-sm font-medium truncate">
                    {mod.title || "Untitled Module"}
                  </span>

                  <span className="text-[10px] text-muted-foreground tabular-nums mr-1">
                    {moduleCompleted}/{moduleLessonCount}
                  </span>

                  {isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  )}
                </button>

                {/* Topics & lessons */}
                {isExpanded && (
                  <div className="mt-0.5 mb-2 ml-[18px] border-l border-border/60 pl-0">
                    {mod.topics.map((topic) => (
                      <div key={topic.id} className="mt-1">
                        {/* Topic label */}
                        <div className="flex items-center gap-1.5 px-3 py-1">
                          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
                            {topic.title || "Untitled Topic"}
                          </span>
                        </div>

                        {/* Lessons */}
                        {topic.lessons.map((lesson) => {
                          const isActive = selectedLessonId === lesson.id;
                          const isVisited = visitedLessons.has(lesson.id);
                          const hasContent = (lesson.blocks ?? []).length > 0;

                          return (
                            <button
                              key={lesson.id}
                              className={cn(
                                "flex items-center gap-2 w-full pl-3 pr-2.5 py-1.5 text-left transition-all rounded-r-md",
                                isActive
                                  ? "bg-primary/10 text-primary border-l-2 border-primary -ml-px"
                                  : "hover:bg-muted/60 border-l-2 border-transparent -ml-px",
                                !hasContent && "opacity-50"
                              )}
                              onClick={() => onSelectLesson(lesson.id)}
                            >
                              {isVisited ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                              ) : (
                                <Circle className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                              )}
                              <span className={cn(
                                "text-xs truncate flex-1",
                                isActive && "font-medium"
                              )}>
                                {lesson.title || "Untitled Lesson"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </ScrollArea>
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
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [visitedLessons, setVisitedLessons] = useState<Set<string>>(new Set());
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);

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
            <p className="text-sm font-medium truncate">{title}</p>
            {currentFlat && (
              <p className="text-[11px] text-muted-foreground truncate">
                {currentFlat.lesson.title}
              </p>
            )}
          </div>
          <Badge variant="secondary" className="shrink-0 text-[10px]">
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
        <SheetContent side="left" className="w-80 p-0" showCloseButton={false}>
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
          />
        </SheetContent>
      </Sheet>

      <div className="flex">
        {/* Desktop sidebar */}
        <div
          className={cn(
            "hidden lg:flex shrink-0 sticky top-0 h-screen transition-all duration-300",
            desktopSidebarOpen ? "w-80" : "w-0 overflow-hidden"
          )}
        >
          <aside
            className={cn(
              "flex flex-col w-80 h-[calc(100vh-2rem)] my-4 ml-4 bg-background border rounded-xl shadow-sm overflow-hidden transition-all duration-300",
              desktopSidebarOpen ? "opacity-100" : "opacity-0"
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
            />
          </aside>
        </div>

        {/* Desktop sidebar toggle */}
        <button
          className={cn(
            "hidden lg:flex sticky top-1/2 -translate-y-1/2 z-10 items-center justify-center h-8 w-5 bg-background border rounded-r-md shadow-sm hover:bg-muted transition-colors",
            desktopSidebarOpen ? "-ml-px" : "ml-0"
          )}
          onClick={() => setDesktopSidebarOpen(!desktopSidebarOpen)}
          aria-label={desktopSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {desktopSidebarOpen ? (
            <ChevronLeft className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>

        {/* Main content */}
        <main className="flex-1 min-w-0">
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
        </main>
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
    <div className="max-w-5xl mx-auto py-8 lg:py-12 px-4 sm:px-6">
      <div className="bg-background rounded-2xl shadow-sm border overflow-hidden">
        {/* Hero */}
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-6 sm:px-8 py-8 sm:py-10">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <GraduationCap className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h1>
              {description && (
                <p className="text-muted-foreground mt-2 text-sm sm:text-base leading-relaxed">
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
                    "flex items-center justify-center h-7 w-7 rounded-lg text-xs font-bold shrink-0 mt-0.5",
                    isComplete ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {isComplete ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-base">{mod.title}</h2>
                    <div className="mt-2 space-y-1">
                      {mod.topics.map((topic) => (
                        <div key={topic.id}>
                          <p className="text-xs font-medium text-muted-foreground mb-0.5">
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
                                    "text-[11px] px-2 py-0.5 rounded-full transition-colors",
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
    <div className="max-w-5xl mx-auto py-6 lg:py-8 px-4 sm:px-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4 flex-wrap">
        <span className="font-medium">{currentFlat.moduleTitle}</span>
        <ChevronRight className="h-3 w-3 shrink-0" />
        <span className="font-medium">{currentFlat.topicTitle}</span>
      </div>

      <div className="bg-background rounded-2xl shadow-sm border overflow-hidden">
        <div className="px-6 sm:px-8 pt-6 sm:pt-8 pb-4 border-b">
          <p className="text-xs text-muted-foreground mb-1">
            Lesson {currentFlat.globalIndex + 1} of {totalLessons}
          </p>
          <h2 className="text-xl sm:text-2xl font-bold">
            {currentFlat.lesson.title}
          </h2>
        </div>
        <div className="px-6 sm:px-8 py-6 sm:py-8 space-y-4">
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
    <div className="max-w-5xl mx-auto py-8 lg:py-12 px-4 sm:px-6">
      <div className="bg-background rounded-2xl shadow-sm border p-8 sm:p-12 text-center">
        <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
          <FileText className="h-8 w-8 text-muted-foreground/40" />
        </div>
        <h2 className="text-xl font-semibold mb-2">{title}</h2>
        <p className="text-muted-foreground text-sm">
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
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Previous</p>
            <p className="text-sm font-medium truncate">{prev.lesson.title}</p>
          </div>
        </button>
      ) : <div className="flex-1" />}
      {next ? (
        <button
          className="flex-1 flex items-center justify-end gap-3 px-4 py-3 bg-background border rounded-xl hover:bg-muted/50 transition-colors text-right group"
          onClick={() => onSelect(next.lesson.id)}
        >
          <div className="min-w-0">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Next</p>
            <p className="text-sm font-medium truncate">{next.lesson.title}</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
        </button>
      ) : <div className="flex-1" />}
    </div>
  );
}
