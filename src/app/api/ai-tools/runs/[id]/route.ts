import { NextResponse } from "next/server";
import { serializeAiToolRun } from "@/ai-tools/runtime/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;

  const run = await prisma.aiToolRun.findFirst({
    where: {
      id,
      userId: authResult.userId,
    },
    include: {
      messages: {
        orderBy: { sequence: "asc" },
      },
    },
  });

  if (!run) {
    return NextResponse.json({ error: "AI tool run not found" }, { status: 404 });
  }

  return NextResponse.json(serializeAiToolRun(run));
}