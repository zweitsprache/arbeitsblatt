import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { listRoleTemplates, updateRoleTemplate } from "@/lib/user-access";
import {
  isAppRole,
  normalizeRoleAccessSettings,
} from "@/types/user-access";

export async function GET() {
  const result = await requireAdmin();
  if (result instanceof NextResponse) return result;

  const templates = await listRoleTemplates();
  return NextResponse.json(templates);
}

export async function PUT(request: NextRequest) {
  const result = await requireAdmin();
  if (result instanceof NextResponse) return result;

  const body = await request.json();
  if (!isAppRole(body.role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const settings = normalizeRoleAccessSettings(body.role, body.settings);
  const record = await updateRoleTemplate(body.role, settings);
  return NextResponse.json(record);
}
