"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import {
  LayoutDashboard,
  FileText,
  Plus,
  Library,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import React, { useState } from "react";

interface NavItem {
  href: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  titleKey: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}

const topItems: NavItem[] = [
  { href: "/", labelKey: "dashboard", icon: LayoutDashboard },
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
];

const bottomItems: NavItem[] = [
  { href: "/settings", labelKey: "settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const t = useTranslations("sidebar");

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={`border-r border-border bg-sidebar text-sidebar-foreground flex flex-col shrink-0 transition-all duration-200 ${
          collapsed ? "w-14" : "w-56"
        }`}
      >
        {/* Nav items */}
        <ScrollArea className="flex-1">
          <nav className="p-2 space-y-1">
            {topItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors
                        ${
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                        }
                        ${collapsed ? "justify-center px-0" : ""}
                      `}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{t(item.labelKey)}</span>}
                    </Link>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right">
                      {t(item.labelKey)}
                    </TooltipContent>
                  )}
                </Tooltip>
              );
            })}
          </nav>

          {/* Sections */}
          {sections.map((section) => (
            <div key={section.titleKey}>
              <Separator className="my-1" />
              {!collapsed && (
                <p className="flex items-center gap-3 px-5 pt-3 pb-1 text-sm font-medium text-sidebar-foreground/50 uppercase">
                  <section.icon className="h-4 w-4" />
                  {t(section.titleKey)}
                </p>
              )}
              <nav className="p-2 space-y-1">
                {section.items.map((item) => {
                  const isActive =
                    item.labelKey === "worksheetLibrary"
                      ? pathname === "/"
                      : pathname.startsWith(item.href);

                  return (
                    <Tooltip key={item.labelKey}>
                      <TooltipTrigger asChild>
                        <Link
                          href={item.href}
                          className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors
                            ${
                              isActive
                                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                            }
                            ${collapsed ? "justify-center px-0" : ""}
                          `}
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          {!collapsed && <span>{t(item.labelKey)}</span>}
                        </Link>
                      </TooltipTrigger>
                      {collapsed && (
                        <TooltipContent side="right">
                          {t(item.labelKey)}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  );
                })}
              </nav>
            </div>
          ))}
        </ScrollArea>

        {/* Bottom items */}
        <div className="mt-auto">
          <Separator />
          <nav className="p-2 space-y-1">
            {bottomItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors
                        ${
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                        }
                        ${collapsed ? "justify-center px-0" : ""}
                      `}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{t(item.labelKey)}</span>}
                    </Link>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right">
                      {t(item.labelKey)}
                    </TooltipContent>
                  )}
                </Tooltip>
              );
            })}

            {/* Collapse toggle */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors w-full
                text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground
                ${collapsed ? "justify-center px-0" : ""}
              `}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4 shrink-0" />
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4 shrink-0" />
                  <span>{t("collapse")}</span>
                </>
              )}
            </button>
          </nav>
        </div>
      </aside>
    </TooltipProvider>
  );
}
