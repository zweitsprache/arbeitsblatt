import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireAuth } from "@/lib/auth/require-auth";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MAX_CONTEXT_LENGTH = 12000;

export interface QuizQuestion {
  question: string;
  options: string[];
  correct: number; // index into options[]
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await req.json();
    const { lessonContext, courseTitle, lessonTitle, locale } = body as {
      lessonContext: string;
      courseTitle: string;
      lessonTitle: string;
      locale: string;
    };

    if (!lessonContext) {
      return NextResponse.json(
        { error: "Lesson context is required." },
        { status: 400 }
      );
    }

    const trimmedContext = lessonContext.slice(0, MAX_CONTEXT_LENGTH);

    const lang = locale === "de" ? "German" : "English";

    const systemPrompt = `You generate quiz questions for an educational platform. Respond ONLY with valid JSON — no commentary, no markdown fences, no explanation.

CURRENT COURSE: "${courseTitle}"
CURRENT LESSON: "${lessonTitle}"

LESSON CONTENT:
---
${trimmedContext}
---

RULES:
1. Generate 4-6 questions that test the student's understanding of the lesson content.
2. Use a mix of multiple-choice (4 options) and true/false (2 options: the first option is the true-equivalent, the second is the false-equivalent) questions.
3. For true/false questions in ${lang}: use "${locale === "de" ? "Wahr" : "True"}" and "${locale === "de" ? "Falsch" : "False"}" as options.
4. Write all questions and options in ${lang}.
5. Make questions educational — test comprehension, not trick questions.
6. "correct" is the 0-based index of the correct option.

Respond with exactly this JSON structure:
{"questions":[{"question":"...","options":["A","B","C","D"],"correct":0}]}`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: "user", content: "Generate the quiz now." }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Parse JSON — strip possible markdown fences just in case
    const cleaned = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const parsed = JSON.parse(cleaned) as {
      questions: QuizQuestion[];
    };

    if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
      throw new Error("Invalid quiz response structure");
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Course quiz error:", error);
    return NextResponse.json(
      { error: "Failed to generate quiz." },
      { status: 500 }
    );
  }
}
