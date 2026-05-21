import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireAuth } from "@/lib/auth/require-auth";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface GenerateRequest {
  prompt: string;
  count?: number;
  blockType?: "matching" | "pronunciation";
  existingPairs?: Array<{ left: string; right: string }>;
  leftHeader?: string;
  rightHeader?: string;
}

interface GeneratedPair {
  left: string;
  right: string;
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = (await req.json()) as GenerateRequest;
    const {
      prompt,
      count,
      blockType = "matching",
      existingPairs = [],
      leftHeader,
      rightHeader,
    } = body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length < 3) {
      return NextResponse.json(
        { error: "Provide a prompt with at least 3 characters." },
        { status: 400 }
      );
    }

    if (count !== undefined && (!Number.isInteger(count) || count < 1)) {
      return NextResponse.json(
        { error: "Count must be a positive integer." },
        { status: 400 }
      );
    }

    const sanitizedExistingPairs = existingPairs
      .filter(
        (pair): pair is GeneratedPair =>
          !!pair &&
          typeof pair.left === "string" &&
          typeof pair.right === "string" &&
          (pair.left.trim().length > 0 || pair.right.trim().length > 0)
      )
      .slice(0, 8)
      .map((pair) => ({
        left: pair.left.trim(),
        right: pair.right.trim(),
      }));

    const blockInstruction = blockType === "pronunciation"
      ? "Generate pronunciation-focused pairs. The left side should usually be a word, phrase, or spelling form. The right side should be the matching pronunciation, phonetic spelling, or sound-based counterpart that fits a pronunciation matching exercise."
      : "Generate clear matching pairs for a worksheet. Each left item must have exactly one unambiguous right-side match. Keep the items concise and classroom-appropriate.";

    const headerInstruction = [leftHeader?.trim(), rightHeader?.trim()].some(Boolean)
      ? `Follow these column headers if they help: left header = \"${leftHeader?.trim() || ""}\", right header = \"${rightHeader?.trim() || ""}\".`
      : "";

    const existingPairsInstruction = sanitizedExistingPairs.length > 0
      ? `If useful, match the tone, language, and difficulty of these existing pairs:\n${JSON.stringify(sanitizedExistingPairs)}`
      : "";

    const requestedCountInstruction = count !== undefined
      ? `Create exactly ${count} matching pairs for a student worksheet.`
      : "Create the full set of matching pairs requested by the user prompt. If the prompt describes a complete finite set or a range, include the entire set with no omissions.";

    const rulesCountInstruction = count !== undefined
      ? `- Return exactly ${count} pairs.`
      : "- Return the full number of pairs implied by the prompt.";

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: count !== undefined
        ? Math.min(8192, Math.max(1400, count * 120))
        : 8192,
      messages: [
        {
          role: "user",
          content: `${requestedCountInstruction}

IMPORTANT: Detect the language of the user's prompt and write ALL generated content in that same language.
${blockInstruction}
${headerInstruction}

User prompt:
${prompt.trim()}

${existingPairsInstruction}

Rules:
${rulesCountInstruction}
- Keep each side short enough for a worksheet matching exercise.
- Do not number items.
- Do not include explanations, headings, or markdown.
- Avoid duplicate left or right values.
- Make sure each pair is distinct and internally consistent.

Respond ONLY with a valid JSON array. Each item must be an object with:
- "left": string
- "right": string

Example:
[{"left":"Hund","right":"dog"},{"left":"Katze","right":"cat"}]`,
        },
      ],
    });

    const textBlock = message.content.find((content) => content.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "No text response from AI" },
        { status: 500 }
      );
    }

    let pairs: GeneratedPair[];
    try {
      let raw = textBlock.text.trim();
      if (raw.startsWith("```")) {
        raw = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }
      pairs = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI response", raw: textBlock.text },
        { status: 500 }
      );
    }

    if (
      !Array.isArray(pairs) ||
      pairs.length === 0 ||
      !pairs.every(
        (pair) =>
          pair &&
          typeof pair.left === "string" &&
          pair.left.trim().length > 0 &&
          typeof pair.right === "string" &&
          pair.right.trim().length > 0
      )
    ) {
      return NextResponse.json(
        { error: "Invalid AI response shape", raw: textBlock.text },
        { status: 500 }
      );
    }

    return NextResponse.json({
      pairs: (count !== undefined ? pairs.slice(0, count) : pairs).map((pair) => ({
        left: pair.left.trim(),
        right: pair.right.trim(),
      })),
    });
  } catch (error) {
    console.error("AI matching generation error:", error);
    return NextResponse.json(
      { error: "AI generation failed" },
      { status: 500 }
    );
  }
}