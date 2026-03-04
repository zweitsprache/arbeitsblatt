import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { isAdmin } from "@/lib/auth/is-admin";

/**
 * Require authenticated admin user for API routes.
 * Returns `{ userId }` on success, or a NextResponse (401/403) on failure.
 */
export async function requireAdmin(): Promise<
  { userId: string } | NextResponse
> {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;

  if (!isAdmin(result.userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return { userId: result.userId };
}
