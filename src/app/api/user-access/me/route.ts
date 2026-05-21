import { NextResponse } from "next/server";
import { getCurrentUserAccess } from "@/lib/user-access";

export async function GET() {
  const payload = await getCurrentUserAccess();
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(payload);
}