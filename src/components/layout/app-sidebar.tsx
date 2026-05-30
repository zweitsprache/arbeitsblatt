"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import {
  LayoutDashboard,
  FileText,
  Plus,
  Library,
  ChevronLeft,
  ChevronRight,
  User,
  Shield,
  BookOpen,
  Layers,
  LayoutGrid,
  TableProperties,
  Store,
  Image,
  GraduationCap,
  Bot,
  Monitor,
  Gamepad2,
  Puzzle,
  Dices,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import React from "react";
import { useUserAccess } from "@/lib/user-access-client";
import { cn } from "@/lib/utils";
import { Building2, FolderKanban, Palette } from "lucide-react";
import type { DashboardSectionKey } from "@/types/user-access";

interface NavItem {
  href: string;
  labelKey: string;
  sectionKey: DashboardSectionKey;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

interface NavSection {
  sectionKey: DashboardSectionKey;
  titleKey: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}

const topItems: NavItem[] = [
  { href: "/", labelKey: "dashboard", sectionKey: "dashboard", icon: LayoutDashboard },
  { href: "/library", labelKey: "library", sectionKey: "library", icon: Store },
];

const sections: NavSection[] = [
  {
    sectionKey: "worksheet",
    titleKey: "worksheet",
    icon: FileText,
    items: [
      { href: "/editor", labelKey: "newWorksheet", sectionKey: "worksheet", icon: Plus },
      { href: "/", labelKey: "worksheetLibrary", sectionKey: "worksheet", icon: Library },
    ],
  },
  {
    sectionKey: "flashcards",
    titleKey: "flashcards",
    icon: Layers,
    items: [
      { href: "/editor/flashcards", labelKey: "newFlashcards", sectionKey: "flashcards", icon: Plus },
      { href: "/flashcards", labelKey: "flashcardLibrary", sectionKey: "flashcards", icon: Library },
      { href: "/collections", labelKey: "collectionLibrary", sectionKey: "flashcards", icon: FolderKanban },
    ],
  },
  {
    sectionKey: "cards",
    titleKey: "cards",
    icon: LayoutGrid,
    items: [
      { href: "/editor/cards", labelKey: "newCards", sectionKey: "cards", icon: Plus },
      { href: "/cards", labelKey: "cardLibrary", sectionKey: "cards", icon: Library },
    ],
  },
  {
    sectionKey: "games",
    titleKey: "games",
    icon: Gamepad2,
    items: [
      { href: "/editor/kartenpaare", labelKey: "newKartenpaare", sectionKey: "games", icon: Plus },
      { href: "/kartenpaare", labelKey: "kartenpaarLibrary", sectionKey: "games", icon: Puzzle },
      { href: "/brettspiel", labelKey: "brettspiel", sectionKey: "games", icon: Dices, disabled: true },
    ],
  },
  {
    sectionKey: "ebooks",
    titleKey: "ebooks",
    icon: BookOpen,
    items: [
      { href: "/ebooks/new", labelKey: "newEbook", sectionKey: "ebooks", icon: Plus },
      { href: "/ebooks", labelKey: "ebooks", sectionKey: "ebooks", icon: Library },
    ],
  },
  {
    sectionKey: "courses",
    titleKey: "courses",
    icon: GraduationCap,
    items: [
      { href: "/courses/new", labelKey: "newCourse", sectionKey: "courses", icon: Plus },
      { href: "/courses", labelKey: "courseLibrary", sectionKey: "courses", icon: Library },
    ],
  },
  {
    sectionKey: "grammarTables",
    titleKey: "grammarTables",
    icon: TableProperties,
    items: [
      { href: "/editor/grammar-tables", labelKey: "newGrammarTable", sectionKey: "grammarTables", icon: Plus },
      { href: "/grammar-tables", labelKey: "grammarTableLibrary", sectionKey: "grammarTables", icon: Library },
    ],
  },
  {
    sectionKey: "presentations",
    titleKey: "presentations",
    icon: Monitor,
    items: [
      { href: "/presentations/new", labelKey: "newPresentation", sectionKey: "presentations", icon: Plus },
      { href: "/presentations", labelKey: "presentationLibrary", sectionKey: "presentations", icon: Library },
    ],
  },
  {
    sectionKey: "covers",
    titleKey: "covers",
    icon: Image,
    items: [
      { href: "/editor/covers", labelKey: "newCover", sectionKey: "covers", icon: Plus },
      { href: "/covers", labelKey: "coverLibrary", sectionKey: "covers", icon: Library },
    ],
  },
  {
    sectionKey: "aiTools",
    titleKey: "aiTools",
    icon: Bot,
    items: [
      { href: "/ai-tools", labelKey: "aiToolLibrary", sectionKey: "aiTools", icon: Library },
    ],
  },
  {
    sectionKey: "account",
    titleKey: "account",
    icon: User,
    items: [
      { href: "/account/settings", labelKey: "accountSettings", sectionKey: "account", icon: User },
      { href: "/account/security", labelKey: "security", sectionKey: "account", icon: Shield },
    ],
  },
];

const adminSection: NavSection = {
  sectionKey: "admin",
  titleKey: "admin",
  icon: Shield,
  items: [
    { href: "/admin/clients", labelKey: "adminClients", sectionKey: "admin", icon: Building2 },
    { href: "/admin/projects", labelKey: "adminProjects", sectionKey: "admin", icon: FolderKanban },
    { href: "/admin/brands", labelKey: "adminBrands", sectionKey: "admin", icon: Palette },
    { href: "/admin/user-access", labelKey: "adminUserAccess", sectionKey: "admin", icon: Shield },
  ],
};

function isItemActive(pathname: string, item: NavItem) {
  if (item.labelKey === "worksheetLibrary") {
    return pathname === "/";
  }

  if (item.labelKey === "flashcardLibrary") {
    return pathname === "/flashcards";
  }

  if (item.labelKey === "newWorksheet") {
    return (
      pathname === "/editor" ||
      (pathname.startsWith("/editor/") &&
        !pathname.startsWith("/editor/flashcards") &&
        !pathname.startsWith("/editor/ebook") &&
        !pathname.startsWith("/editor/covers"))
    );
  }

  if (item.href === "/") {
    return pathname === "/";
  }

  return pathname.startsWith(item.href);
}

function SectionTitle({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Label className="mx-3 text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-[4px] block">
      {children}
    </Label>
  );
}

function CollapsedSectionDivider() {
  return <div className="mx-3 my-2 h-px bg-slate-200" aria-hidden="true" />;
}

interface AppSidebarProps {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

function getNavItemClassName({
  collapsed,
  isActive,
  disabled,
}: {
  collapsed: boolean;
  isActive?: boolean;
  disabled?: boolean;
}) {
  return cn(
    "group relative flex items-center text-sm font-medium leading-normal transition-colors",
    collapsed
      ? "h-11 w-11 justify-center"
      : "h-8 w-full justify-start gap-2 px-2",
    disabled && "cursor-not-allowed",
    collapsed && !disabled && !isActive && "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
    collapsed && isActive && "text-slate-900",
    collapsed && disabled && "text-slate-300",
    !collapsed && !disabled && !isActive && "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
    !collapsed && isActive && "text-slate-900 font-semibold",
    !collapsed && disabled && "text-slate-300",
  );
}

function SidebarNavItem({
  item,
  collapsed,
  isActive,
  label,
}: {
  item: NavItem;
  collapsed: boolean;
  isActive: boolean;
  label: string;
}) {
  const content = (
    <>
      {!collapsed && (
        <item.icon
          className="h-3.5 w-3.5 shrink-0"
        />
      )}
      {collapsed && isActive && (
        <span className="absolute left-1 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-slate-900/70" />
      )}
      {collapsed && <item.icon className="h-4 w-4 shrink-0" />}
      {!collapsed && <span className="truncate">{label}</span>}
    </>
  );

  if (item.disabled) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={getNavItemClassName({ collapsed, disabled: true })}>
            {content}
          </span>
        </TooltipTrigger>
        {collapsed && (
          <TooltipContent side="right" className="border-slate-200 bg-slate-950 text-slate-100">
            {label}
          </TooltipContent>
        )}
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={item.href}
          className={getNavItemClassName({ collapsed, isActive })}
          aria-current={isActive ? "page" : undefined}
        >
          {content}
        </Link>
      </TooltipTrigger>
      {collapsed && (
        <TooltipContent side="right" className="border-slate-200 bg-slate-950 text-slate-100">
          {label}
        </TooltipContent>
      )}
    </Tooltip>
  );
}

function SidebarSection({
  title,
  items,
  pathname,
  collapsed,
  t,
}: {
  title: string;
  items: NavItem[];
  pathname: string;
  collapsed: boolean;
  t: ReturnType<typeof useTranslations<"sidebar">>;
}) {
  return (
    <div>
      {collapsed ? <CollapsedSectionDivider /> : <SectionTitle>{title}</SectionTitle>}
      <nav className={cn("divide-y divide-slate-200", collapsed ? "px-2" : "px-3")}>
        {items.map((item) => (
          <SidebarNavItem
            key={item.labelKey}
            item={item}
            collapsed={collapsed}
            isActive={isItemActive(pathname, item)}
            label={t(item.labelKey)}
          />
        ))}
      </nav>
    </div>
  );
}

export function AppSidebar({
  collapsed,
  onCollapsedChange,
}: AppSidebarProps) {
  const pathname = usePathname();
  const t = useTranslations("sidebar");
  const { payload } = useUserAccess();
  const allowedSections = new Set(payload?.effectiveAccess.sidebarSections ?? ["worksheet", "account"]);
  const isAdminUser = payload?.effectiveAccess.isAdmin === true;

  const allSections = isAdminUser
    ? [...sections.slice(0, -1), adminSection, sections[sections.length - 1]]
    : sections;
  const visibleTopItems = topItems.filter((item) => allowedSections.has(item.sectionKey));
  const visibleSections = allSections.filter((section) => allowedSections.has(section.sectionKey));

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "h-full shrink-0 transition-all duration-200",
          collapsed ? "w-[5.25rem]" : "w-[20rem]",
        )}
      >
        <div className="flex h-full min-h-0 flex-col overflow-hidden border-x border-slate-200 bg-white text-slate-900 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">

          <ScrollArea className="flex-1 min-h-0 scrollbar-hide">
            <div className={cn(collapsed ? "py-3 space-y-0" : "py-4 space-y-0")}> 
              {!collapsed && visibleTopItems.length > 0 && (
                <SectionTitle>{t("home")}</SectionTitle>
              )}
              <nav className={cn("divide-y divide-slate-200", collapsed ? "px-2" : "px-3")}>
                {visibleTopItems.map((item) => (
                  <SidebarNavItem
                    key={item.href}
                    item={item}
                    collapsed={collapsed}
                    isActive={isItemActive(pathname, item)}
                    label={t(item.labelKey)}
                  />
                ))}
              </nav>

              {visibleSections.map((section) => (
                <SidebarSection
                  key={section.titleKey}
                  title={t(section.titleKey)}
                  items={section.items}
                  pathname={pathname}
                  collapsed={collapsed}
                  t={t}
                />
              ))}
            </div>
          </ScrollArea>

          <div className="mt-auto border-t border-slate-200 bg-slate-50/70">
            <div className={cn(collapsed ? "px-2 py-3" : "p-3")}>
              {collapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => onCollapsedChange(false)}
                      aria-label={t("expand")}
                      className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="border-slate-200 bg-slate-950 text-slate-100">
                    {t("expand")}
                  </TooltipContent>
                </Tooltip>
              ) : (
                <button
                  type="button"
                  onClick={() => onCollapsedChange(true)}
                  aria-label={t("collapse")}
                  className="flex min-h-10 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900"
                >
                  <ChevronLeft className="h-4 w-4 shrink-0" />
                  <span>{t("collapse")}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}
