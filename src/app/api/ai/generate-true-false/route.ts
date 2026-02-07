import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface GenerateRequest {
  context: string;
  count: number;
  style: "verbatim" | "paraphrased";
  order: "chronological" | "mixed";
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GenerateRequest;
    const { context, count, style = "paraphrased", order = "mixed" } = body;

    if (!context || !count || count < 1 || count > 20) {
      return NextResponse.json(
        { error: "Invalid request. Provide context and count (1-20)." },
        { status: 400 }
      );
    }

    const styleInstruction = style === "verbatim"
      ? "CRITICAL STYLE RULE: The statements MUST use wording taken DIRECTLY and EXACTLY from the provided context. Copy phrases, clauses, and sentences from the source text as closely as possible. The student should be able to find the exact (or near-exact) wording in the original text. Do NOT rephrase, do NOT use synonyms, do NOT restructure sentences. For false statements, change only a single key detail (a number, name, or fact) while keeping the rest of the original wording intact."
      : "Paraphrase the information from the context. Statements should convey the same meaning but use different wording — do NOT copy phrases verbatim from the text. Use synonyms, restructure sentences, and express ideas in your own words.";

    const orderInstruction = order === "chronological"
      ? "IMPORTANT: The statements MUST appear in the same order as the information appears in the source context. The first statement should relate to information near the beginning of the text, and the last statement should relate to information near the end."
      : "The statements should appear in a randomized order — do NOT follow the order of the source context.";

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Based on the following context, generate exactly ${count} true/false statements for a student worksheet. Each statement should be a clear factual claim that is either definitively true or false based on the provided context.

IMPORTANT: Detect the language of the context and write ALL statements in that SAME language. If the context is in German, write German statements. If in French, write French statements. Etc.

The statements should be formulated at the same level of difficulty as the source context. Match the vocabulary, sentence complexity, and conceptual depth of the original material.

${styleInstruction}

${orderInstruction}

Context:
${context}

Respond ONLY with a valid JSON array. Each element must have:
- "text": the statement (string, in the same language as the context)
- "correctAnswer": whether the statement is true (boolean)

Mix true and false statements roughly evenly. Make sure the statements are varied, interesting, and test understanding of the material — not just trivial recall. Keep statements concise (one sentence). Do NOT wrap in markdown code blocks, just output raw JSON.

Example format:
[{"text":"The sun is a star.","correctAnswer":true},{"text":"Water boils at 50°C.","correctAnswer":false}]`,
        },
      ],
    });

    // Extract text content from the response
    const textBlock = message.content.find((c) => c.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "No text response from AI" },
        { status: 500 }
      );
    }

    // Parse the JSON array from the response
    let statements: { text: string; correctAnswer: boolean }[];
    try {
      // Strip potential markdown code fences
      let raw = textBlock.text.trim();
      if (raw.startsWith("```")) {
        raw = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }
      statements = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI response", raw: textBlock.text },
        { status: 500 }
      );
    }

    // Validate shape
    if (
      !Array.isArray(statements) ||
      !statements.every(
        (s) =>
          typeof s.text === "string" && typeof s.correctAnswer === "boolean"
      )
    ) {
      return NextResponse.json(
        { error: "Invalid AI response shape", raw: textBlock.text },
        { status: 500 }
      );
    }

    return NextResponse.json({ statements });
  } catch (error) {
    console.error("AI generation error:", error);
    return NextResponse.json(
      { error: "AI generation failed" },
      { status: 500 }
    );
  }
}
