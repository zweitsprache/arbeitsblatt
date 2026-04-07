import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getAiToolDefinition } from "@/ai-tools/registry";
import {
  createStoredMessageData,
  serializeRunContext,
  serializeAiToolRun,
  toPrismaRunStatus,
} from "@/ai-tools/runtime/server";
import { AiToolCard, AiToolReplyRequest } from "@/ai-tools/types";
import { requireAuth } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = await params;
    const body = (await req.json()) as AiToolReplyRequest;

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

    if (run.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Only active AI tool runs can accept new messages" },
        { status: 409 }
      );
    }

    const tool = getAiToolDefinition(run.toolKey);
    if (!tool) {
      return NextResponse.json({ error: "AI tool definition not found" }, { status: 404 });
    }

    const result = await tool.continueRun(
      {
        id: run.id,
        toolKey: run.toolKey,
        context: serializeRunContext(run.context),
        state: (run.state as Record<string, unknown> | null) ?? {},
        status: "active",
      },
      body,
      {
        locale:
          typeof (run.context as Record<string, unknown> | null)?.locale === "string"
            ? ((run.context as Record<string, unknown>).locale as string)
            : undefined,
        userId: authResult.userId,
      }
    );

    const outgoingCards: AiToolCard[] = [];
    if (body.input?.trim()) {
      outgoingCards.push({
        kind: "user-text" as const,
        payload: {
          text: body.input.trim(),
        },
      });
    }
    outgoingCards.push(...result.messages);

    const lastSequence = run.messages.at(-1)?.sequence ?? -1;
    const nextState = ((result.state ?? run.state ?? {}) as Record<string, unknown>) as Prisma.InputJsonValue;
    const nextFinalResult =
      result.finalResult === null
        ? Prisma.JsonNull
        : ((result.finalResult ?? run.finalResult) as Prisma.InputJsonValue | undefined);

    const updatedRun = await prisma.$transaction(async (tx) => {
      if (outgoingCards.length > 0) {
        await tx.aiToolMessage.createMany({
          data: createStoredMessageData(outgoingCards, lastSequence + 1).map((message) => ({
            runId: run.id,
            role: message.role,
            kind: message.kind,
            payload: message.payload,
            sequence: message.sequence,
          })),
        });
      }

      await tx.aiToolRun.update({
        where: { id: run.id },
        data: {
          state: nextState,
          status: toPrismaRunStatus(result.status ?? "active"),
          finalResult: nextFinalResult,
          finishedAt:
            result.status === "completed" || result.status === "error"
              ? new Date()
              : null,
        },
      });

      return tx.aiToolRun.findUniqueOrThrow({
        where: { id: run.id },
        include: {
          messages: {
            orderBy: { sequence: "asc" },
          },
        },
      });
    });

    return NextResponse.json(serializeAiToolRun(updatedRun));
  } catch (error) {
    console.error("POST /api/ai-tools/runs/[id]/messages error:", error);
    return NextResponse.json({ error: "Failed to continue AI tool run" }, { status: 500 });
  }
}