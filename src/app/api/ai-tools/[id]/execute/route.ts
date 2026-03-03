import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";
import { AiToolField, AiToolSettings, DEFAULT_AI_TOOL_SETTINGS } from "@/types/ai-tool";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// POST /api/ai-tools/[id]/execute — execute an AI tool with form values
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;

  try {
    const tool = await prisma.aiTool.findUnique({ where: { id } });
    if (!tool || !tool.published) {
      return NextResponse.json({ error: "Tool not found or not published" }, { status: 404 });
    }

    const body = await req.json();
    const { values } = body as { values: Record<string, string> };

    if (!values || typeof values !== "object") {
      return NextResponse.json({ error: "Form values are required" }, { status: 400 });
    }

    const fields = tool.fields as unknown as AiToolField[];
    const settings = {
      ...DEFAULT_AI_TOOL_SETTINGS,
      ...(tool.settings as unknown as Partial<AiToolSettings>),
    };

    // Validate required fields
    for (const field of fields) {
      if (field.required && (!values[field.variableName] || String(values[field.variableName]).trim() === "")) {
        return NextResponse.json(
          { error: `Field "${field.label}" is required` },
          { status: 400 }
        );
      }
    }

    // Interpolate prompt template with form values
    let prompt = tool.promptTemplate;
    for (const field of fields) {
      const value = values[field.variableName] || field.defaultValue || "";
      prompt = prompt.replace(
        new RegExp(`\\{\\{${field.variableName}\\}\\}`, "g"),
        String(value)
      );
    }

    if (!prompt.trim()) {
      return NextResponse.json({ error: "Prompt is empty after interpolation" }, { status: 400 });
    }

    if (prompt.length > 50000) {
      return NextResponse.json({ error: "Prompt too long (max 50000 characters)" }, { status: 400 });
    }

    const message = await client.messages.create({
      model: settings.model || "claude-sonnet-4-20250514",
      max_tokens: settings.maxTokens || 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = message.content.find((c) => c.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "No text response from AI" }, { status: 500 });
    }

    return NextResponse.json({ result: textBlock.text });
  } catch (error) {
    console.error("AI tool execute error:", error);
    return NextResponse.json({ error: "AI tool execution failed" }, { status: 500 });
  }
}
