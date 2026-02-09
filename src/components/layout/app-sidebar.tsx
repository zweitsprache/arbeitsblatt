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
  {
    titleKey: "account",
    icon: User,
    items: [
      { href: "/account/settings", labelKey: "accountSettings", icon: User },
      { href: "/account/security", labelKey: "security", icon: Shield },
    ],
  },
];

function SectionTitle({ icon: Icon, children, collapsed }: { icon: React.ComponentType<{ className?: string }>, children: React.ReactNode, collapsed: boolean }) {
  if (collapsed) return null;
  return (
    <div className="flex items-center gap-2 mx-3 mt-4 mb-1.5 px-2.5 py-1 text-[10px] font-bold text-white/40 uppercase tracking-[0.1em]">
      <Icon className="h-3.5 w-3.5" />
      {children}
    </div>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const t = useTranslations("sidebar");

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={`shrink-0 transition-all duration-200 pt-3 pb-8 pl-4 ${
          collapsed ? "w-[calc(3.5rem+0.75rem)]" : "w-[calc(20rem+0.75rem)]"
        }`}
      >
        <div className="bg-pink-950 text-white flex flex-col h-full rounded-sm border border-border shadow-sm">
        {/* Nav items */}
        <ScrollArea className="flex-1">
          {/* Dashboard section */}
          <SectionTitle icon={LayoutDashboard} collapsed={collapsed}>
            {t("dashboard")}
          </SectionTitle>
          <nav className="px-3 pb-1 space-y-1">
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
                      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all
                        ${
                          isActive
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-white/10 text-white/80 hover:bg-white/15 hover:text-white"
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
              <SectionTitle icon={section.icon} collapsed={collapsed}>
                {t(section.titleKey)}
              </SectionTitle>
              <nav className="px-3 pb-1 space-y-1">
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
                          className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all
                            ${
                              isActive
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "bg-white/10 text-white/80 hover:bg-white/15 hover:text-white"
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
          <Separator className="border-white/10" />
          <nav className="p-3 space-y-1">
            {/* Collapse toggle */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all w-full text-white/50 hover:text-white/80 hover:bg-white/5
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
        </div>
      </aside>
    </TooltipProvider>
  );
}
