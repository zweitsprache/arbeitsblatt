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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import React from "react";
import { useIsAdmin } from "@/lib/auth/use-is-admin";
import { cn } from "@/lib/utils";
import { Building2, FolderKanban, Palette } from "lucide-react";

interface NavItem {
  href: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

interface NavSection {
  titleKey: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}

const topItems: NavItem[] = [
  { href: "/", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/library", labelKey: "library", icon: Store },
];

const sections: NavSection[] = [
  {
    titleKey: "worksheet",
    icon: FileText,
    items: [
      { href: "/editor", labelKey: "newWorksheet", icon: Plus },
      { href: "/", labelKey: "worksheetLibrary", icon: Library },
    ],
  },
  {
    titleKey: "flashcards",
    icon: Layers,
    items: [
      { href: "/editor/flashcards", labelKey: "newFlashcards", icon: Plus },
      { href: "/flashcards", labelKey: "flashcardLibrary", icon: Library },
    ],
  },
  {
    titleKey: "cards",
    icon: LayoutGrid,
    items: [
      { href: "/editor/cards", labelKey: "newCards", icon: Plus },
      { href: "/cards", labelKey: "cardLibrary", icon: Library },
    ],
  },
  {
    titleKey: "games",
    icon: Gamepad2,
    items: [
      { href: "/editor/kartenpaare", labelKey: "newKartenpaare", icon: Plus },
      { href: "/kartenpaare", labelKey: "kartenpaarLibrary", icon: Puzzle },
      { href: "/brettspiel", labelKey: "brettspiel", icon: Dices, disabled: true },
    ],
  },
  {
    titleKey: "ebooks",
    icon: BookOpen,
    items: [
      { href: "/ebooks/new", labelKey: "newEbook", icon: Plus },
      { href: "/ebooks", labelKey: "ebooks", icon: Library },
    ],
  },
  {
    titleKey: "courses",
    icon: GraduationCap,
    items: [
      { href: "/courses/new", labelKey: "newCourse", icon: Plus },
      { href: "/courses", labelKey: "courseLibrary", icon: Library },
    ],
  },
  {
    titleKey: "grammarTables",
    icon: TableProperties,
    items: [
      { href: "/editor/grammar-tables", labelKey: "newGrammarTable", icon: Plus },
      { href: "/grammar-tables", labelKey: "grammarTableLibrary", icon: Library },
    ],
  },
  {
    titleKey: "presentations",
    icon: Monitor,
    items: [
      { href: "/presentations/new", labelKey: "newPresentation", icon: Plus },
      { href: "/presentations", labelKey: "presentationLibrary", icon: Library },
    ],
  },
  {
    titleKey: "covers",
    icon: Image,
    items: [
      { href: "/editor/covers", labelKey: "newCover", icon: Plus },
      { href: "/covers", labelKey: "coverLibrary", icon: Library },
    ],
  },
  {
    titleKey: "aiTools",
    icon: Bot,
    items: [
      { href: "/ai-tools", labelKey: "aiToolLibrary", icon: Library },
    ],
  },
  {
    titleKey: "account",
    icon: User,
    items: [
      { href: "/account/settings", labelKey: "accountSettings", icon: User },
      { href: "/account/security", labelKey: "security", icon: Shield },
    ],
  },
];

const adminSection: NavSection = {
  titleKey: "admin",
  icon: Shield,
  items: [
    { href: "/admin/clients", labelKey: "adminClients", icon: Building2 },
    { href: "/admin/projects", labelKey: "adminProjects", icon: FolderKanban },
    { href: "/admin/brands", labelKey: "adminBrands", icon: Palette },
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
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-3 mb-1 mt-5 flex items-center gap-2 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
      <Icon className="h-3.5 w-3.5" />
      {children}
    </div>
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
    "group relative flex items-center text-sm font-medium transition-colors",
    collapsed
      ? "h-10 w-10 justify-center rounded-lg"
      : "min-h-10 w-full justify-start gap-3 rounded-xl px-3 py-2.5",
    disabled && "cursor-not-allowed",
    collapsed && !disabled && !isActive && "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
    collapsed && isActive && "bg-slate-900 text-white shadow-sm",
    collapsed && disabled && "text-slate-300",
    !collapsed && !disabled && !isActive && "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
    !collapsed && isActive && "bg-slate-900 text-white shadow-sm",
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
          className={cn(
            "shrink-0",
            isActive ? "h-4.5 w-4.5" : "h-4 w-4",
          )}
        />
      )}
      {collapsed && isActive && (
        <span className="absolute left-1 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-white/80" />
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
  icon,
  items,
  pathname,
  collapsed,
  t,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
  pathname: string;
  collapsed: boolean;
  t: ReturnType<typeof useTranslations<"sidebar">>;
}) {
  return (
    <div>
      {collapsed ? <CollapsedSectionDivider /> : <SectionTitle icon={icon}>{title}</SectionTitle>}
      <nav className={cn("space-y-1", collapsed ? "px-2" : "px-3")}> 
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
  const isAdminUser = useIsAdmin();

  const allSections = isAdminUser
    ? [...sections.slice(0, -1), adminSection, sections[sections.length - 1]]
    : sections;

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "shrink-0 pb-8 pl-4 pt-3 transition-all duration-200",
          collapsed ? "w-[5.25rem] pr-3" : "w-[20rem] pr-4",
        )}
      >
        <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">

          <ScrollArea className="flex-1 min-h-0 scrollbar-hide">
            <div className={cn(collapsed ? "py-3 space-y-1" : "py-4 space-y-2")}> 
              <nav className={cn("space-y-1", collapsed ? "px-2" : "px-3")}>
                {topItems.map((item) => (
                  <SidebarNavItem
                    key={item.href}
                    item={item}
                    collapsed={collapsed}
                    isActive={isItemActive(pathname, item)}
                    label={t(item.labelKey)}
                  />
                ))}
              </nav>

              {allSections.map((section) => (
                <SidebarSection
                  key={section.titleKey}
                  title={t(section.titleKey)}
                  icon={section.icon}
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
