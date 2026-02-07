import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface GenerateRequest {
  context: string;
  count: number;
  optionsPerQuestion: number;
  style: "verbatim" | "paraphrased";
  order: "chronological" | "mixed";
}

interface GeneratedQuestion {
  question: string;
  options: { text: string; isCorrect: boolean }[];
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GenerateRequest;
    const { context, count, optionsPerQuestion = 4, style = "paraphrased", order = "mixed" } = body;

    if (!context || !count || count < 1 || count > 20) {
      return NextResponse.json(
        { error: "Invalid request. Provide context and count (1-20)." },
        { status: 400 }
      );
    }

    if (optionsPerQuestion < 2 || optionsPerQuestion > 6) {
      return NextResponse.json(
        { error: "Options per question must be between 2 and 6." },
        { status: 400 }
      );
    }

    const styleInstruction = style === "verbatim"
      ? "CRITICAL STYLE RULE: The questions and answer options MUST use wording taken DIRECTLY and EXACTLY from the provided context. Copy phrases, clauses, and sentences from the source text as closely as possible. The student should be able to find the exact (or near-exact) wording in the original text. Do NOT rephrase, do NOT use synonyms, do NOT restructure sentences."
      : "Paraphrase the information from the context. Questions and options should convey the same meaning but use different wording — do NOT copy phrases verbatim from the text. Use synonyms, restructure sentences, and express ideas in your own words.";

    const orderInstruction = order === "chronological"
      ? "IMPORTANT: The questions MUST appear in the same order as the information appears in the source context. The first question should relate to information near the beginning of the text, and the last question should relate to information near the end."
      : "The questions should appear in a randomized order — do NOT follow the order of the source context.";

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `Based on the following context, generate exactly ${count} multiple-choice questions for a student worksheet. Each question should have exactly ${optionsPerQuestion} answer options, with exactly ONE correct answer.

IMPORTANT: Detect the language of the context and write ALL questions and options in that SAME language. If the context is in German, write German. If in French, write French. Etc.

The questions should be formulated at the same level of difficulty as the source context. Match the vocabulary, sentence complexity, and conceptual depth of the original material.

${styleInstruction}

${orderInstruction}

Context:
${context}

Respond ONLY with a valid JSON array. Each element must have:
- "question": the question text (string, in the same language as the context)
- "options": an array of exactly ${optionsPerQuestion} objects, each with:
  - "text": the option text (string)
  - "isCorrect": whether this is the correct answer (boolean, exactly one must be true)

Make sure wrong options are plausible distractors — not obviously wrong. Vary the position of the correct answer across questions. Do NOT wrap in markdown code blocks, just output raw JSON.

Example format:
[{"question":"What is the capital of France?","options":[{"text":"London","isCorrect":false},{"text":"Paris","isCorrect":true},{"text":"Berlin","isCorrect":false},{"text":"Madrid","isCorrect":false}]}]`,
        },
      ],
    });

    const textBlock = message.content.find((c) => c.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "No text response from AI" },
        { status: 500 }
      );
    }

    let questions: GeneratedQuestion[];
    try {
      let raw = textBlock.text.trim();
      if (raw.startsWith("```")) {
        raw = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }
      questions = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI response", raw: textBlock.text },
        { status: 500 }
      );
    }

    if (
      !Array.isArray(questions) ||
      !questions.every(
        (q) =>
          typeof q.question === "string" &&
          Array.isArray(q.options) &&
          q.options.every(
            (o: { text: unknown; isCorrect: unknown }) =>
              typeof o.text === "string" && typeof o.isCorrect === "boolean"
          )
      )
    ) {
      return NextResponse.json(
        { error: "Invalid AI response shape", raw: textBlock.text },
        { status: 500 }
      );
    }

    return NextResponse.json({ questions });
  } catch (error) {
    console.error("AI MCQ generation error:", error);
    return NextResponse.json(
      { error: "AI generation failed" },
      { status: 500 }
    );
  }
}
