"use client";

import { AppHeader } from "./app-header";
import { AppFooter } from "./app-footer";
import { AppSidebar } from "./app-sidebar";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <AppHeader />
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar />
        <main className="flex-1 min-h-0 overflow-hidden bg-background flex flex-col">
          {children}
        </main>
      </div>
      <AppFooter />
    </div>
  );
}
