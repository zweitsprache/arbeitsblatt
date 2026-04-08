import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getAiToolDefinition } from "@/ai-tools/registry";
import { getAiToolBrandProfileId, resolveAiToolBrandProfile } from "@/ai-tools/runtime/brand-context";
import {
  createStoredMessageData,
  serializeRunContext,
  serializeAiToolRun,
  toPrismaRunStatus,
} from "@/ai-tools/runtime/server";
import { AiToolCard, AiToolReplyRequest } from "@/ai-tools/types";
import { requireAuth } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/prisma";

function encodeEvent(payload: Record<string, unknown>) {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

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
    if (!tool?.streamContinueRun) {
      return NextResponse.json({ error: "Streaming not supported for this AI tool" }, { status: 400 });
    }

    const result = await tool.streamContinueRun(
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
        brandProfileId: getAiToolBrandProfileId(run.context),
        brandProfile: await resolveAiToolBrandProfile(run.context),
      }
    );

    const userCard: AiToolCard | null = body.input?.trim()
      ? {
          kind: "user-text",
          payload: {
            text: body.input.trim(),
          },
        }
      : null;

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        let accumulatedText = "";

        try {
          const optimisticMessages = [
            ...(userCard ? [userCard] : []),
            ...result.prefixMessages,
            result.streamedMessage,
          ];

          controller.enqueue(
            encoder.encode(
              encodeEvent({
                type: "ack",
                messages: optimisticMessages,
              })
            )
          );

          for await (const delta of result.textStream) {
            accumulatedText += delta;
            controller.enqueue(
              encoder.encode(
                encodeEvent({
                  type: "delta",
                  text: delta,
                })
              )
            );
          }

          const finalStreamedMessage: AiToolCard = {
            ...result.streamedMessage,
            payload: {
              ...result.streamedMessage.payload,
              text: accumulatedText,
            },
          };

          const outgoingCards = [
            ...(userCard ? [userCard] : []),
            ...result.prefixMessages,
            finalStreamedMessage,
          ];

          const lastSequence = run.messages.at(-1)?.sequence ?? -1;
          const nextState = ((result.state ?? run.state ?? {}) as Record<string, unknown>) as Prisma.InputJsonValue;
          const nextFinalResult = {
            ...((result.finalResult as Record<string, unknown> | null) ?? {}),
            output: accumulatedText,
          } as Prisma.InputJsonValue;

          const updatedRun = await prisma.$transaction(async (tx) => {
            await tx.aiToolMessage.createMany({
              data: createStoredMessageData(outgoingCards, lastSequence + 1).map((message) => ({
                runId: run.id,
                role: message.role,
                kind: message.kind,
                payload: message.payload,
                sequence: message.sequence,
              })),
            });

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

          controller.enqueue(
            encoder.encode(
              encodeEvent({
                type: "done",
                run: serializeAiToolRun(updatedRun),
              })
            )
          );
          controller.close();
        } catch (error) {
          controller.enqueue(
            encoder.encode(
              encodeEvent({
                type: "error",
                error: error instanceof Error ? error.message : "Streaming failed",
              })
            )
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("POST /api/ai-tools/runs/[id]/stream error:", error);
    return NextResponse.json({ error: "Failed to stream AI tool run" }, { status: 500 });
  }
}