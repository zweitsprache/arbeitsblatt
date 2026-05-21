import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { listUserAccessRecords } from "@/lib/user-access";

export async function GET() {
  const result = await requireAdmin();
  if (result instanceof NextResponse) return result;

  const records = await listUserAccessRecords();
  return NextResponse.json(records);
}
