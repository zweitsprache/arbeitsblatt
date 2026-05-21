"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { authFetch } from "@/lib/auth-fetch";
import type { CurrentUserAccessPayload } from "@/types/user-access";

interface UserAccessContextValue {
  payload: CurrentUserAccessPayload | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

const UserAccessContext = createContext<UserAccessContextValue | null>(null);

export function UserAccessProvider({ children }: { children: React.ReactNode }) {
  const [payload, setPayload] = useState<CurrentUserAccessPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await authFetch("/api/user-access/me");
      if (!response.ok) {
        setPayload(null);
        return;
      }

      const nextPayload = (await response.json()) as CurrentUserAccessPayload;
      setPayload(nextPayload);
    } catch {
      setPayload(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ payload, isLoading, refresh }),
    [payload, isLoading, refresh],
  );

  return <UserAccessContext.Provider value={value}>{children}</UserAccessContext.Provider>;
}

export function useUserAccess() {
  const context = useContext(UserAccessContext);
  if (!context) {
    throw new Error("useUserAccess must be used within UserAccessProvider");
  }

  return context;
}