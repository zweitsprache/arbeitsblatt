import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getAiToolDefinition } from "@/ai-tools/registry";
import { getAiToolBrandProfileId, resolveAiToolBrandProfile } from "@/ai-tools/runtime/brand-context";
import { createStoredMessageData, serializeAiToolRun } from "@/ai-tools/runtime/server";
import { AiToolStartRequest } from "@/ai-tools/types";
import { requireAuth } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  const toolKey = req.nextUrl.searchParams.get("toolKey");
  const runId = req.nextUrl.searchParams.get("runId");
  const worksheetBlockId = req.nextUrl.searchParams.get("worksheetBlockId");
  const mode = req.nextUrl.searchParams.get("mode");
  const brandProfileId = req.nextUrl.searchParams.get("brandProfileId");

  if (!toolKey && !runId) {
    return NextResponse.json(
      { error: "toolKey or runId is required" },
      { status: 400 }
    );
  }

  const run = await prisma.aiToolRun.findFirst({
    where: {
      userId: authResult.userId,
      ...(runId ? { id: runId } : {}),
      ...(toolKey ? { toolKey } : {}),
      ...(worksheetBlockId ? { worksheetBlockId } : {}),
      ...(mode
        ? {
            context: {
              path: ["mode"],
              equals: mode,
            },
          }
        : {}),
      ...(brandProfileId
        ? {
            AND: [
              {
                context: {
                  path: ["metadata", "brandProfileId"],
                  equals: brandProfileId,
                },
              },
            ],
          }
        : {}),
    },
    include: {
      messages: {
        orderBy: { sequence: "asc" },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  if (!run) {
    return NextResponse.json(null);
  }

  return NextResponse.json(serializeAiToolRun(run));
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = (await req.json()) as AiToolStartRequest;

    if (!body.toolKey) {
      return NextResponse.json({ error: "toolKey is required" }, { status: 400 });
    }

    if (!body.context?.mode) {
      return NextResponse.json({ error: "context.mode is required" }, { status: 400 });
    }

    const tool = getAiToolDefinition(body.toolKey);
    if (!tool) {
      return NextResponse.json({ error: "AI tool not found" }, { status: 404 });
    }

    const result = await tool.createRun(body, {
      locale: body.context.locale,
      userId: authResult.userId,
      brandProfileId: getAiToolBrandProfileId(body.context),
      brandProfile: await resolveAiToolBrandProfile(body.context),
    });

    const createdRun = await prisma.$transaction(async (tx) => {
      const run = await tx.aiToolRun.create({
        data: {
          toolKey: body.toolKey,
          status: "ACTIVE",
          userId: authResult.userId,
          projectId: body.context.projectId ?? null,
          worksheetId: body.context.worksheetId ?? null,
          worksheetBlockId: body.context.worksheetBlockId ?? null,
          context: body.context as unknown as Prisma.InputJsonValue,
          state: (result.state ?? {}) as Prisma.InputJsonValue,
        },
      });

      if (result.messages.length > 0) {
        await tx.aiToolMessage.createMany({
          data: createStoredMessageData(result.messages, 0).map((message) => ({
            runId: run.id,
            role: message.role,
            kind: message.kind,
            payload: message.payload,
            sequence: message.sequence,
          })),
        });
      }

      return tx.aiToolRun.findUniqueOrThrow({
        where: { id: run.id },
        include: {
          messages: {
            orderBy: { sequence: "asc" },
          },
        },
      });
    });

    return NextResponse.json(serializeAiToolRun(createdRun));
  } catch (error) {
    console.error("POST /api/ai-tools/runs error:", error);
    return NextResponse.json({ error: "Failed to create AI tool run" }, { status: 500 });
  }
}