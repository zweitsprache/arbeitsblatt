import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";

/**
 * Get the authenticated user's ID from the session.
 * Returns the userId string, or a 401 NextResponse if not authenticated.
 */
export async function requireAuth(): Promise<
  { userId: string } | NextResponse
> {
  const { data: session } = await auth.getSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return { userId: session.user.id };
}
