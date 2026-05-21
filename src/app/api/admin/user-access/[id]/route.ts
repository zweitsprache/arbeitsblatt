import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { deleteUserAccessRecord, updateUserRole } from "@/lib/user-access";
import { isAppRole } from "@/types/user-access";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const result = await requireAdmin();
  if (result instanceof NextResponse) return result;

  const { id } = await context.params;
  const body = await request.json();

  if (!isAppRole(body.role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const record = await updateUserRole(id, body.role);
  return NextResponse.json(record);
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const result = await requireAdmin();
  if (result instanceof NextResponse) return result;

  const { id } = await context.params;
  await deleteUserAccessRecord(id);
  return NextResponse.json({ ok: true });
}
