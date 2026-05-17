import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireAuth } from "@/lib/auth/require-auth";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface GenerateRequest {
  word: string;
  locale?: string;
  worksheetTitle?: string;
  blockTitle?: string;
}

interface GenerateResponse {
  stopWords: string[];
}

function normalizeStopWord(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = (await req.json()) as GenerateRequest;
    const word = body.word?.trim();
    const locale = body.locale?.trim() || "de";
    const worksheetTitle = body.worksheetTitle?.trim() || "";
    const blockTitle = body.blockTitle?.trim() || "";

    if (!word) {
      return NextResponse.json(
        { error: "A target word is required." },
        { status: 400 }
      );
    }

    const contextLines = [
      worksheetTitle ? `Worksheet title/theme: ${worksheetTitle}` : "",
      blockTitle ? `Block title/theme: ${blockTitle}` : "",
      `Locale hint: ${locale}`,
    ].filter(Boolean).join("\n");

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: `You are generating forbidden clue words for a TABOO classroom card game.

Target word: ${word}
${contextLines ? `\nAdditional context:\n${contextLines}\n` : ""}

Task: Return EXACTLY 4 stop words or very short stop phrases that a player would naturally want to say when trying to describe the target word.

Rules:
- Detect the language from the target word and context, and write all stop words in that same language.
- Each stop word should be short, ideally 1 to 2 words.
- Always use the singular form for nouns.
- Choose strong semantic associations such as synonym, category, function, context, typical example, location, person, or object strongly linked to the target.
- The 4 stop words should be diverse, not near-duplicates.
- Do NOT include the target word itself.
- Do NOT include compounds, phrases, or hyphenations that contain the target word.
- Do NOT include simple inflections, plural forms, gender variants, declensions, conjugations, or obvious derivations of the target word.
- Do NOT use first-letter hints, rhyme hints, translations, or overly generic filler words.
- Avoid duplicates.

Respond ONLY with valid JSON in this exact format:
{"stopWords":["...","...","...","..."]}`,
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

    let parsed: GenerateResponse;
    try {
      let raw = textBlock.text.trim();
      if (raw.startsWith("```")) {
        raw = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }
      parsed = JSON.parse(raw) as GenerateResponse;
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI response", raw: textBlock.text },
        { status: 500 }
      );
    }

    if (!Array.isArray(parsed.stopWords)) {
      return NextResponse.json(
        { error: "Invalid AI response shape", raw: textBlock.text },
        { status: 500 }
      );
    }

    const normalizedWord = normalizeStopWord(word).toLocaleLowerCase(locale);
    const targetWordPattern = new RegExp(escapeRegex(normalizedWord), "i");
    const stopWords = Array.from(
      new Set(
        parsed.stopWords
          .map((entry) => normalizeStopWord(String(entry)))
          .filter(Boolean)
      )
    ).filter((entry) => {
      const normalizedEntry = entry.toLocaleLowerCase(locale);
      return normalizedEntry !== normalizedWord && !targetWordPattern.test(normalizedEntry);
    });

    if (stopWords.length !== 4) {
      return NextResponse.json(
        { error: "AI did not return 4 valid stop words", raw: textBlock.text },
        { status: 500 }
      );
    }

    return NextResponse.json({ stopWords });
  } catch (error) {
    console.error("AI TABOO stop-word generation error:", error);
    return NextResponse.json(
      { error: "AI generation failed" },
      { status: 500 }
    );
  }
}