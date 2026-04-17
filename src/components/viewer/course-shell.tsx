"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { CourseModule, SidebarTheme } from "@/types/course";
import { Brand, BRAND_FONTS, BrandFonts, DEFAULT_BRAND_SETTINGS, getStaticBrandProfile } from "@/types/worksheet";
import { useCourse } from "./course-context";
import { extractBlocksText } from "@/lib/extract-block-text";
import { cn } from "@/lib/utils";
import { filterBlocksByDisplay } from "@/lib/block-visibility";
import {
  ChevronRight,
  ChevronLeft,
  Menu,
  MessageCircle,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  slateBg: string;
}

const DARK_TOKENS: SidebarTokens = {
  bg: "#302f2c",
  text: "rgba(255,255,255,0.92)",
  textMuted: "rgba(255,255,255,0.90)",
  textFaint: "rgba(255,255,255,0.20)",
  accentText: "#F2EDDA",
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
  slateBg: "rgba(255,255,255,0.04)",
};

const LIGHT_TOKENS: SidebarTokens = {
  bg: "#f5f4f1",
  text: "rgba(0,0,0,0.85)",
  textMuted: "rgba(0,0,0,0.75)",
  textFaint: "rgba(0,0,0,0.30)",
  accentText: "#4a4639",
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
  slateBg: "rgba(0,0,0,0.03)",
};

const LINGOSTAR_LIGHT_TOKENS: SidebarTokens = {
  bg: "#ffffff",
  text: "rgba(0,0,0,0.85)",
  textMuted: "rgba(0,0,0,0.70)",
  textFaint: "rgba(0,0,0,0.25)",
  accentText: "#3a4f40",
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
  slateBg: "rgba(0,0,0,0.03)",
};

function getSidebarTokens(theme: SidebarTheme, brand?: Brand): SidebarTokens {
  if (brand === "lingostar") {
    return theme === "dark" ? DARK_TOKENS : LINGOSTAR_LIGHT_TOKENS;
  }
  return theme === "light" ? LIGHT_TOKENS : DARK_TOKENS;
}

const SidebarThemeContext = React.createContext<SidebarTokens>(DARK_TOKENS);
function useSidebarTheme() { return React.useContext(SidebarThemeContext); }

function nonEmpty(value?: string | null, fallback?: string) {
  const normalized = value?.trim();
  return normalized || fallback || "";
}

function normalizeWeight(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

// ─── Types ───────────────────────────────────────────────────

// ─── Sidebar Module Section ──────────────────────────────────

function SidebarModuleSection({
  mod,
  moduleIndex,
  moduleTitleColor,
  currentModuleId,
  state,
  onSelectModule,
  onMouseEnter,
  onMouseLeave,
}: {
  mod: CourseModule;
  moduleIndex: number;
  moduleTitleColor: string;
  currentModuleId: string | null;
  onSelectModule: (moduleId: string) => void;
  state: "default" | "expanded" | "compressed";
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const tk = useSidebarTheme();
  const num = String(moduleIndex + 1).padStart(2, "0");
  const isCurrentModule = currentModuleId === mod.id;
  const active = state === "expanded" || isCurrentModule;

  return (
    <button
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={() => onSelectModule(mod.id)}
      className="px-2.5 py-1.5 text-left overflow-hidden"
      style={{
        flexGrow: state === "expanded" ? 3.2 : state === "compressed" ? 0.55 : 1,
        flexShrink: 1,
        flexBasis: "0px",
        height: 36,
        transition: "flex-grow 0.24s cubic-bezier(0.4,0,0.2,1), border-color 0.15s, background-color 0.15s",
        borderRadius: 4,
        backgroundColor: isCurrentModule ? "#f0efed" : state === "expanded" ? "#f5f4f2" : "#f8f8f7",
        border: `1.75px solid ${active ? moduleTitleColor : (isCurrentModule ? "#f0efed" : "#f8f8f7")}`,
        minWidth: 0,
      }}
    >
      <div className="flex items-center gap-1.5 overflow-hidden h-full">
        <span
          className="shrink-0 text-lg font-black leading-none tracking-tight"
          style={{ color: active ? moduleTitleColor : tk.textFaint }}
        >
          {num}
        </span>
        <span
          className="text-[11px] font-semibold leading-none"
          style={{
            color: tk.text,
            opacity: state === "expanded" ? 1 : 0,
            transform: state === "expanded" ? "translateX(0)" : "translateX(-6px)",
            transition: "opacity 0.15s ease 0.07s, transform 0.18s ease 0.07s",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {mod.shortTitle || mod.title || "Untitled"}
        </span>
      </div>
    </button>
  );
}

function ModulePair({
  left,
  leftIndex,
  right,
  rightIndex,
  moduleTitleColor,
  currentModuleId,
  onSelectModule,
}: {
  left: CourseModule;
  leftIndex: number;
  right?: CourseModule;
  rightIndex?: number;
  moduleTitleColor: string;
  currentModuleId: string | null;
  onSelectModule: (moduleId: string) => void;
}) {
  const [hoveredSide, setHoveredSide] = useState<"left" | "right" | null>(null);

  return (
    <div className="flex gap-2">
      <SidebarModuleSection
        mod={left}
        moduleIndex={leftIndex}
        moduleTitleColor={moduleTitleColor}
        currentModuleId={currentModuleId}
        state={hoveredSide === "left" ? "expanded" : hoveredSide === "right" ? "compressed" : "default"}
        onSelectModule={onSelectModule}
        onMouseEnter={() => setHoveredSide("left")}
        onMouseLeave={() => setHoveredSide(null)}
      />
      {right !== undefined && rightIndex !== undefined ? (
        <SidebarModuleSection
          mod={right}
          moduleIndex={rightIndex}
          moduleTitleColor={moduleTitleColor}
          currentModuleId={currentModuleId}
          state={hoveredSide === "right" ? "expanded" : hoveredSide === "left" ? "compressed" : "default"}
          onSelectModule={onSelectModule}
          onMouseEnter={() => setHoveredSide("right")}
          onMouseLeave={() => setHoveredSide(null)}
        />
      ) : (
        <div style={{ flexGrow: 1 }} />
      )}
    </div>
  );
}

function SearchPanel({
  value,
  onChange,
  className,
  variant = "default",
}: {
  value: string;
  onChange: (query: string) => void;
  className?: string;
  variant?: "default" | "flush";
}) {
  const isFlush = variant === "flush";

  return (
    <div className={cn("border bg-white/92 shadow-[0_14px_36px_rgba(15,23,42,0.05)]", className)}>
      <div className={cn("relative", !isFlush && "px-4 py-3")}>
        <Search className={cn("absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground", isFlush ? "left-3" : "left-7")} />
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Suchen…"
          className={cn(
            "w-full rounded-md bg-white py-2.5 pl-9 pr-9 text-cv-xs outline-none transition-colors",
            isFlush ? "border-0" : "border"
          )}
        />
        {value && (
          <button
            onClick={() => onChange("")}
            className={cn("absolute top-1/2 -translate-y-1/2", isFlush ? "right-3" : "right-7")}
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Sidebar Navigation ─────────────────────────────────────

function SidebarNav({
  structure,
  currentModuleId,
  onSelectModule,
  bodyFont,
  moduleTitleColor,
}: {
  structure: CourseModule[];
  currentModuleId: string | null;
  onSelectModule: (moduleId: string) => void;
  bodyFont: string;
  moduleTitleColor: string;
}) {
  const { brand } = useCourse();
  const tk = getSidebarTokens("light", brand as Brand);

  return (
    <SidebarThemeContext.Provider value={tk}>
    <div
      className="flex h-full flex-col overflow-hidden"
      style={{
        fontFamily: bodyFont,
        backgroundColor: "#ffffff",
      }}
    >
      <div className="flex-1 overflow-y-auto px-4 pb-6 pt-4 sidebar-scroll">
        <div className="flex flex-col gap-2">
          {Array.from({ length: Math.ceil(structure.length / 2) }, (_, pi) => (
            <ModulePair
              key={structure[pi * 2].id}
              left={structure[pi * 2]}
              leftIndex={pi * 2}
              right={structure[pi * 2 + 1]}
              rightIndex={structure[pi * 2 + 1] !== undefined ? pi * 2 + 1 : undefined}
              moduleTitleColor={moduleTitleColor}
              currentModuleId={currentModuleId}
              onSelectModule={onSelectModule}
            />
          ))}
        </div>
      </div>

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
  const { title, structure, brand, brandProfile, viewerBasePath, worksheets } = useCourse();
  const router = useRouter();
  const pathname = usePathname();
  const basePathSegments = useMemo(
    () => viewerBasePath.split("/").filter(Boolean),
    [viewerBasePath]
  );
  const basePathSegmentCount = basePathSegments.length;

  const brandKey = brand || "edoomio";
  const staticBrandFonts = BRAND_FONTS[brandKey] ?? BRAND_FONTS.edoomio;
  const resolvedBrandProfile = brandProfile ?? getStaticBrandProfile(brandKey);
  const brandFonts: BrandFonts = {
    bodyFont: nonEmpty(resolvedBrandProfile.bodyFont, staticBrandFonts.bodyFont),
    headlineFont: nonEmpty(resolvedBrandProfile.headlineFont, staticBrandFonts.headlineFont),
    headlineWeight: normalizeWeight(resolvedBrandProfile.headlineWeight, staticBrandFonts.headlineWeight || 700),
    subHeadlineFont: nonEmpty(resolvedBrandProfile.subHeadlineFont, staticBrandFonts.subHeadlineFont),
    subHeadlineWeight: normalizeWeight(resolvedBrandProfile.subHeadlineWeight, staticBrandFonts.subHeadlineWeight || 700),
    headerFooterFont: nonEmpty(resolvedBrandProfile.headerFooterFont, staticBrandFonts.headerFooterFont),
    googleFontsUrl: nonEmpty(resolvedBrandProfile.googleFontsUrl, staticBrandFonts.googleFontsUrl),
    primaryColor: resolvedBrandProfile.primaryColor || staticBrandFonts.primaryColor,
  };
  const brandLogo = nonEmpty(
    resolvedBrandProfile.logo,
    nonEmpty(
      resolvedBrandProfile.iconLogo,
      DEFAULT_BRAND_SETTINGS[brandKey]?.logo || DEFAULT_BRAND_SETTINGS.edoomio.logo,
    ),
  );

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [chatSidebarOpen, setChatSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const currentModuleId = useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length > basePathSegmentCount) return segments[basePathSegmentCount];
    return null;
  }, [basePathSegmentCount, pathname]);

  // Resolve current lesson content for AI chat
  const currentLessonData = useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length < basePathSegmentCount + 3) return null;
    const moduleId = segments[basePathSegmentCount];
    const topicId = segments[basePathSegmentCount + 1];
    const lessonId = segments[basePathSegmentCount + 2];
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
    const visibleBlocks = filterBlocksByDisplay(resolvedBlocks, "course");

    return {
      title: lesson.title || "Untitled Lesson",
      context: extractBlocksText(visibleBlocks, worksheets),
    };
  }, [basePathSegmentCount, pathname, structure, worksheets]);

  // ─── Full-text search across all lessons ──────────────────
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;
    const results: {
      moduleId: string;
      moduleTitle: string;
      topicId: string;
      topicTitle: string;
      lessonId: string;
      lessonTitle: string;
      snippet: string;
    }[] = [];

    for (const mod of structure) {
      for (const topic of mod.topics) {
        for (const lesson of topic.lessons) {
          const resolvedBlocks = (lesson.blocks ?? []).flatMap((block) => {
            if (block.type === "linked-blocks" && worksheets[block.worksheetId]) {
              return worksheets[block.worksheetId].blocks;
            }
            return [block];
          });
          const visibleBlocks = filterBlocksByDisplay(resolvedBlocks, "course");
          const fullText = extractBlocksText(visibleBlocks, worksheets);
          const idx = fullText.toLowerCase().indexOf(q);
          if (idx !== -1) {
            const start = Math.max(0, idx - 40);
            const end = Math.min(fullText.length, idx + q.length + 40);
            const snippet =
              (start > 0 ? "\u2026" : "") +
              fullText.slice(start, end) +
              (end < fullText.length ? "\u2026" : "");
            results.push({
              moduleId: mod.id,
              moduleTitle: mod.shortTitle || mod.title,
              topicId: topic.id,
              topicTitle: topic.shortTitle || topic.title,
              lessonId: lesson.id,
              lessonTitle: lesson.shortTitle || lesson.title || "Untitled Lesson",
              snippet,
            });
          }
        }
      }
    }
    return results;
  }, [searchQuery, structure, worksheets]);

  const handleSearchSelect = useCallback(
    (moduleId: string, topicId: string, lessonId: string) => {
      setSearchQuery("");
      setMobileNavOpen(false);
      router.push(`${viewerBasePath}/${moduleId}/${topicId}/${lessonId}`);
    },
    [router, viewerBasePath]
  );

  const handleSelectModule = useCallback(
    (moduleId: string) => {
      setMobileNavOpen(false);
      router.push(`${viewerBasePath}/${moduleId}`);
    },
    [router, viewerBasePath]
  );

  // Determine breadcrumb from URL
  const breadcrumb = useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length < basePathSegmentCount) return null;
    const isOverview = segments.length === basePathSegmentCount;
    const moduleId = segments[basePathSegmentCount] ?? null;
    const topicId = segments.length >= basePathSegmentCount + 2 ? segments[basePathSegmentCount + 1] : null;
    const lessonId = segments.length >= basePathSegmentCount + 3 ? segments[basePathSegmentCount + 2] : null;
    const mod = moduleId ? structure.find((m) => m.id === moduleId) : null;
    const topic = mod && topicId ? mod.topics.find((t) => t.id === topicId) : null;
    const lesson = topic && lessonId ? topic.lessons.find((l) => l.id === lessonId) : null;
    return { isOverview, mod: mod ?? null, topic: topic ?? null, lesson: lesson ?? null };
  }, [basePathSegmentCount, pathname, structure]);

  return (
    <div className="min-h-screen lg:h-screen lg:max-h-screen lg:overflow-hidden lg:flex lg:flex-col bg-[linear-gradient(180deg,rgba(250,250,249,1)_0%,rgba(245,245,244,1)_100%)]">
      {/* Load brand fonts */}
      <link rel="stylesheet" href={brandFonts.googleFontsUrl} />

      {/* Top bar (mobile only — below lg) */}
      <div className="lg:hidden sticky top-0 z-30 bg-background/95 backdrop-blur border-b" style={{ fontFamily: brandFonts.bodyFont }}>
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => setMobileNavOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="text-cv-sm font-medium truncate">{title}</p>
          </div>
          <CourseLanguageSwitcher />
        </div>
      </div>

      {/* Sidebar as overlay sheet (below 2xl) */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-[400px] p-0 border-none" showCloseButton={false}>
          <SheetHeader className="sr-only">
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>Course navigation</SheetDescription>
          </SheetHeader>
          <div className="border-b bg-[rgba(250,250,249,0.82)] p-4">
            <SearchPanel value={searchQuery} onChange={setSearchQuery} className="rounded-md" />
          </div>
          <SidebarNav
            structure={structure}
            currentModuleId={currentModuleId}
            onSelectModule={handleSelectModule}
            bodyFont={brandFonts.bodyFont}
            moduleTitleColor={brandFonts.primaryColor}
          />
        </SheetContent>
      </Sheet>

      {/* Desktop layout */}
      {/* Top bar (full width, outside padding) */}
      <div className="hidden lg:flex items-center gap-3 px-6 2xl:px-8 py-4 text-cv-xs text-muted-foreground shrink-0 bg-white/80 backdrop-blur border-b" style={{ fontFamily: brandFonts.bodyFont }}>
        {/* Brand logo */}
        <img
          src={brandLogo}
          alt=""
          className="h-7 w-auto mr-1"
        />
        {/* Menu button for sidebar (lg to 2xl) */}
        <div className="2xl:hidden">
          <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => setMobileNavOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
        </div>
        <div className="min-w-0">
          <p className="text-sm text-foreground truncate">{title}</p>
        </div>
        {/* Language switcher */}
        <div className="ml-auto flex items-center gap-3">
          <CourseLanguageSwitcher />
          {!chatSidebarOpen && (
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => setChatSidebarOpen(true)}>
              <MessageCircle className="h-3.5 w-3.5" />
              Assistant
            </Button>
          )}
        </div>
      </div>

      <div className="min-h-screen lg:flex-1 lg:min-h-0 flex flex-col p-4 lg:p-6 2xl:p-8 pt-0 lg:pt-5 2xl:pt-6 gap-4 lg:gap-4 2xl:gap-6">
        {/* Middle row: sidebar + content + chat */}
        <div className="flex-1 min-h-0 flex flex-row gap-4 lg:gap-4 2xl:gap-6">
          {/* Desktop sidebar (2xl+ only — push layout) */}
          <div className={cn(
            "hidden 2xl:flex shrink-0 relative transition-all duration-300",
            desktopSidebarOpen ? "w-[340px]" : "w-0"
          )}>
            <aside className={cn(
              "flex flex-col w-[340px] h-full rounded-lg border bg-[rgba(248,247,243,0.95)] shadow-[0_18px_50px_rgba(15,23,42,0.04)] overflow-hidden transition-all duration-300",
              desktopSidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
            )}>
              <SidebarNav
                structure={structure}
                currentModuleId={currentModuleId}
                onSelectModule={handleSelectModule}
                bodyFont={brandFonts.bodyFont}
                moduleTitleColor={brandFonts.primaryColor}
              />
            </aside>
            <button
              className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center h-9 w-6 bg-white border rounded-r-full shadow-sm hover:bg-muted transition-colors"
              onClick={() => setDesktopSidebarOpen(!desktopSidebarOpen)}
              aria-label={desktopSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              {desktopSidebarOpen ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          </div>

          {!desktopSidebarOpen && (
            <button
              className="hidden 2xl:flex sticky top-1/2 -translate-y-1/2 z-10 items-center justify-center h-9 w-6 bg-white border rounded-r-full shadow-sm hover:bg-muted transition-colors -ml-6"
              onClick={() => setDesktopSidebarOpen(true)}
              aria-label="Expand sidebar"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Content container */}
          <div className="flex-1 min-w-0 rounded-lg border bg-white/94 shadow-[0_22px_60px_rgba(15,23,42,0.06)] overflow-hidden">
            <style>{`
              .content-scroll::-webkit-scrollbar { width: 6px; }
              .content-scroll::-webkit-scrollbar-track { background: transparent; margin-block: 32px; }
              .content-scroll::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 9999px; min-height: 40px; }
              .content-scroll::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
              .content-scroll::-webkit-scrollbar-button { display: none; height: 0; }
              .content-scroll::-webkit-scrollbar-corner { display: none; }
              .course-content { font-family: ${brandFonts.bodyFont}; font-size: 1.25rem; }
              .course-content p { font-size: 1.25rem; }
              .course-content .email-skeleton-fields { font-size: 1.25rem; }
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
              {searchResults ? (
                <div className="text-sm text-muted-foreground shrink-0 bg-white lg:mr-[30px]" style={{ fontFamily: brandFonts.bodyFont }}>
                  <div className="max-w-5xl mx-auto w-full px-6 sm:px-10 lg:px-16">
                    <div className="pt-8 pb-5 flex items-center gap-2 border-b">
                      <button onClick={() => { setSearchQuery(""); router.push(viewerBasePath); }} className="font-medium hover:text-foreground/80 transition-colors">
                        Start
                      </button>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                      <span className="font-medium text-foreground">Suchresultate</span>
                    </div>
                  </div>
                </div>
              ) : breadcrumb && (
                <div className="text-sm text-muted-foreground shrink-0 bg-white lg:mr-[30px]" style={{ fontFamily: brandFonts.bodyFont }}>
                  <div className="max-w-5xl mx-auto w-full px-6 sm:px-10 lg:px-16">
                    <div className="pt-8 pb-5 flex items-center gap-2 border-b">
                      {breadcrumb.isOverview ? (
                        <span className="font-medium text-foreground">Start</span>
                      ) : (
                        <button onClick={() => router.push(viewerBasePath)} className="font-medium hover:text-foreground/80 transition-colors">
                          Start
                        </button>
                      )}
                      {breadcrumb.mod && (
                        <>
                          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                          {!breadcrumb.topic ? (
                            <span className="font-medium text-foreground">{breadcrumb.mod.title}</span>
                          ) : (
                            <button onClick={() => router.push(`${viewerBasePath}/${breadcrumb.mod!.id}`)} className="font-medium hover:text-foreground/80 transition-colors">
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
                            <button onClick={() => router.push(`${viewerBasePath}/${breadcrumb.mod!.id}/${breadcrumb.topic!.id}`)} className="font-medium hover:text-foreground/80 transition-colors">
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
                  </div>
                </div>
              )}
              <div className="flex-1 min-h-0 flex">
                <div className="flex-1 min-w-0 overflow-y-auto content-scroll course-content lg:mr-[30px]">
                  {searchResults ? (
                    <div className="p-6 lg:p-8" style={{ fontFamily: brandFonts.bodyFont }}>
                      <p className="text-sm text-muted-foreground mb-4">
                        {searchResults.length === 0
                          ? "Keine Ergebnisse gefunden."
                          : `${searchResults.length} Ergebnis${searchResults.length !== 1 ? "se" : ""} gefunden`}
                      </p>
                      <div className="flex flex-col gap-2">
                        {searchResults.map((r) => {
                          const q = searchQuery.trim().toLowerCase();
                          const snippetLower = r.snippet.toLowerCase();
                          const matchIdx = snippetLower.indexOf(q);
                          return (
                            <button
                              key={`${r.moduleId}-${r.topicId}-${r.lessonId}`}
                              onClick={() => handleSearchSelect(r.moduleId, r.topicId, r.lessonId)}
                              className="text-left p-4 rounded-md border hover:bg-muted/50 transition-colors"
                            >
                              <p className="text-sm font-semibold">{r.lessonTitle}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {r.moduleTitle} › {r.topicTitle}
                              </p>
                              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                                {matchIdx >= 0 ? (
                                  <>
                                    {r.snippet.slice(0, matchIdx)}
                                    <mark className="bg-yellow-200 text-foreground rounded-sm px-0.5">
                                      {r.snippet.slice(matchIdx, matchIdx + q.length)}
                                    </mark>
                                    {r.snippet.slice(matchIdx + q.length)}
                                  </>
                                ) : (
                                  r.snippet
                                )}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    children
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="hidden lg:flex shrink-0 min-h-0 h-full flex-col gap-4">
            <SearchPanel value={searchQuery} onChange={setSearchQuery} variant="flush" className="shrink-0 rounded-lg" />
            <div className="min-h-0 flex-1">
              <CourseChatSidebar
                open={chatSidebarOpen}
                onClose={() => setChatSidebarOpen(false)}
                lessonContext={currentLessonData?.context ?? ""}
                lessonTitle={currentLessonData?.title ?? ""}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer (full width) */}
      <div className="hidden lg:flex items-center gap-2 px-6 2xl:px-8 py-4 text-cv-xs text-muted-foreground shrink-0 bg-white/80 backdrop-blur border-t" style={{ fontFamily: brandFonts.bodyFont }}>
        <span>© {new Date().getFullYear()} {brand === "lingostar" ? "lingostar | Marcel Allenspach" : "Edoomio"}. Alle Rechte vorbehalten.</span>
      </div>
    </div>
  );
}
