"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth/client";
import { isAdmin } from "@/lib/auth/is-admin";

/**
 * Client-side hook to check if the current user is an admin.
 * Uses the auth session and the NEXT_PUBLIC_ADMIN_USER_IDS env var.
 */
export function useIsAdmin(): boolean {
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    authClient.getSession().then(({ data: session }) => {
      if (session?.user?.id) {
        setAdmin(isAdmin(session.user.id));
      }
    });
  }, []);

  return admin;
}
