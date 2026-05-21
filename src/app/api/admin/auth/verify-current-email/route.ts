import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { auth } from "@/lib/auth/server";

function getSessionUser(session: unknown): { id: string; email?: string | null } | null {
  if (!session || typeof session !== "object") {
    return null;
  }

  const maybeUser = (session as { user?: unknown }).user;
  if (!maybeUser || typeof maybeUser !== "object") {
    return null;
  }

  const user = maybeUser as { id?: unknown; email?: unknown };
  if (typeof user.id !== "string" || !user.id.trim()) {
    return null;
  }

  return {
    id: user.id,
    email: typeof user.email === "string" ? user.email : null,
  };
}

export async function POST() {
  const adminResult = await requireAdmin();
  if (adminResult instanceof NextResponse) return adminResult;

  const sessionResult = await auth.getSession();
  const sessionUser = getSessionUser(sessionResult.data);

  if (!sessionUser) {
    return NextResponse.json({ error: "No authenticated auth user found." }, { status: 401 });
  }

  if (sessionUser.id !== adminResult.userId) {
    return NextResponse.json({ error: "Authenticated user mismatch." }, { status: 403 });
  }

  const updateResult = await auth.admin.updateUser({
    userId: sessionUser.id,
    data: {
      emailVerified: true,
    },
  });

  if (updateResult.error) {
    return NextResponse.json(
      {
        error: updateResult.error.message || "Failed to update auth user.",
      },
      { status: updateResult.error.status || 500 },
    );
  }

  return NextResponse.json({
    success: true,
    email: sessionUser.email ?? null,
    userId: sessionUser.id,
  });
}