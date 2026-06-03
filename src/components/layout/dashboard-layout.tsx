"use client";

import { useEffect, useSyncExternalStore } from "react";
import { AppHeader } from "./app-header";
import { AppFooter } from "./app-footer";
import { AppSidebar } from "./app-sidebar";
import { UserAccessProvider } from "@/lib/user-access-client";

const SIDEBAR_COLLAPSED_STORAGE_KEY = "dashboard-sidebar-collapsed";

function subscribeToSidebarPreference(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === SIDEBAR_COLLAPSED_STORAGE_KEY) {
      onStoreChange();
    }
  };

  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener("storage", handleStorage);
  };
}

function getSidebarCollapsedSnapshot() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "true";
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const sidebarCollapsed = useSyncExternalStore(
    subscribeToSidebarPreference,
    getSidebarCollapsedSnapshot,
    () => false,
  );

  useEffect(() => {
    window.localStorage.setItem(
      SIDEBAR_COLLAPSED_STORAGE_KEY,
      String(sidebarCollapsed),
    );
  }, [sidebarCollapsed]);

  const setSidebarCollapsed = (collapsed: boolean) => {
    window.localStorage.setItem(
      SIDEBAR_COLLAPSED_STORAGE_KEY,
      String(collapsed),
    );
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: SIDEBAR_COLLAPSED_STORAGE_KEY,
        newValue: String(collapsed),
      }),
    );
  };

  return (
    <UserAccessProvider>
      <div className="flex h-screen overflow-hidden">
        <AppSidebar
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
        />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <AppHeader />
          <main className="flex-1 min-h-0 overflow-hidden bg-background flex flex-col">
            {children}
          </main>
          <AppFooter />
        </div>
      </div>
    </UserAccessProvider>
  );
}
