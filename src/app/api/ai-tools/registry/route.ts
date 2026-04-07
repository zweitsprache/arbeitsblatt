import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { getAiToolPublicMetadata } from "@/ai-tools/registry";

export async function GET() {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  return NextResponse.json(getAiToolPublicMetadata());
}