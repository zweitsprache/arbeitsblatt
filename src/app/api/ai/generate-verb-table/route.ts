import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireAuth } from "@/lib/auth/require-auth";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

type Tense =
  | "praesens"
  | "praeteritum"
  | "perfekt"
  | "plusquamperfekt"
  | "futur1";

interface GenerateRequest {
  verb: string; // infinitive form
  tense: Tense;
}

interface ConjugationRow {
  person: string;
  detail?: string;
  pronoun: string;
  conjugation: string;
  conjugation2?: string;
}

interface GenerateResponse {
  verb: string;
  splitConjugation: boolean;
  singularRows: ConjugationRow[];
  pluralRows: ConjugationRow[];
}

const ALWAYS_TWO_PART: Tense[] = ["perfekt", "plusquamperfekt"];

const TENSE_LABELS: Record<Tense, string> = {
  praesens: "Präsens",
  praeteritum: "Präteritum",
  perfekt: "Perfekt",
  plusquamperfekt: "Plusquamperfekt",
  futur1: "Futur I",
};

export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = (await req.json()) as GenerateRequest;
    const { verb, tense } = body;

    if (!verb || !tense) {
      return NextResponse.json(
        { error: "Invalid request. Provide verb and tense." },
        { status: 400 }
      );
    }

    const isAlwaysTwoPart = ALWAYS_TWO_PART.includes(tense);
    const tenseLabel = TENSE_LABELS[tense] || tense;

    let tenseInstruction = "";
    if (tense === "praesens") {
      tenseInstruction = `Conjugate the verb "${verb}" in Präsens.

IMPORTANT: First, determine if "${verb}" is a TRENNBARES VERB (separable verb, e.g. aufstehen, anfangen, einkaufen, mitnehmen, etc.).

If "${verb}" IS a separable verb:
- Set "isTrennbar": true in the response
- Put the conjugated verb stem in "conjugation" and the separated prefix in "conjugation2"
- Example for "aufstehen": conjugation="stehe", conjugation2="auf" (for ich)

If "${verb}" is NOT a separable verb:
- Set "isTrennbar": false in the response
- Put the full conjugated form in "conjugation". Do NOT include a "conjugation2" field.
- Example for "machen": conjugation="mache" (for ich)`;
    } else if (tense === "perfekt") {
      tenseInstruction = `Conjugate the verb "${verb}" in Perfekt.
Perfekt uses a helping verb (haben or sein) + past participle (Partizip II).
Put the helping verb (conjugated form of haben/sein) in "conjugation" and the past participle in "conjugation2".
Example for "machen": conjugation="habe", conjugation2="gemacht" (for ich).`;
    } else if (tense === "plusquamperfekt") {
      tenseInstruction = `Conjugate the verb "${verb}" in Plusquamperfekt.
Plusquamperfekt uses the Präteritum of the helping verb (hatte/war) + past participle (Partizip II).
Put the helping verb (Präteritum form of haben/sein) in "conjugation" and the past participle in "conjugation2".
Example for "machen": conjugation="hatte", conjugation2="gemacht" (for ich).`;
    } else {
      tenseInstruction = `Conjugate the verb "${verb}" in ${tenseLabel}. Put the full conjugated form in "conjugation". Do NOT include a "conjugation2" field.`;
    }

    const twoPartHint = tense === "praesens"
      ? '"conjugation2": "..." (ONLY if trennbar),'
      : isAlwaysTwoPart
        ? '"conjugation2": "...",'
        : '';

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `You are a German language expert. ${tenseInstruction}

Return a JSON object with the following structure:
{
  "verb": "${verb}",${tense === "praesens" ? '\n  "isTrennbar": true/false,' : ''}
  "singularRows": [
    { "person": "1. Person", "pronoun": "ich", "conjugation": "...", ${twoPartHint} },
    { "person": "2. Person", "detail": "informell", "pronoun": "du", "conjugation": "...", ${twoPartHint} },
    { "person": "2. Person", "detail": "formell", "pronoun": "Sie", "conjugation": "...", ${twoPartHint} },
    { "person": "3. Person", "pronoun": "er / sie / es", "conjugation": "...", ${twoPartHint} }
  ],
  "pluralRows": [
    { "person": "1. Person", "pronoun": "wir", "conjugation": "...", ${twoPartHint} },
    { "person": "2. Person", "detail": "informell", "pronoun": "ihr", "conjugation": "...", ${twoPartHint} },
    { "person": "2. Person", "detail": "formell", "pronoun": "Sie", "conjugation": "...", ${twoPartHint} },
    { "person": "3. Person", "pronoun": "sie", "conjugation": "...", ${twoPartHint} }
  ]
}

IMPORTANT RULES:
- Each row MUST have "person", "pronoun" and "conjugation" fields.
- The "detail" field is only for the 2. Person to distinguish "informell" and "formell".
- All conjugations must be grammatically correct German.
- Do NOT wrap in markdown code blocks, just output raw JSON.
- Respond ONLY with valid JSON, nothing else.`,
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

    let result: GenerateResponse;
    try {
      let raw = textBlock.text.trim();
      if (raw.startsWith("```")) {
        raw = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }
      const parsed = JSON.parse(raw);
      // For praesens, AI tells us if it's trennbar; for perfekt/plusquam always split; otherwise never
      const isSplit = tense === "praesens"
        ? parsed.isTrennbar === true
        : isAlwaysTwoPart;
      result = {
        verb: parsed.verb || verb,
        splitConjugation: isSplit,
        singularRows: parsed.singularRows,
        pluralRows: parsed.pluralRows,
      };
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI response", raw: textBlock.text },
        { status: 500 }
      );
    }

    // Validate shape
    const validateRows = (rows: ConjugationRow[]) =>
      Array.isArray(rows) &&
      rows.every(
        (r) =>
          typeof r.person === "string" &&
          typeof r.pronoun === "string" &&
          typeof r.conjugation === "string"
      );

    if (!validateRows(result.singularRows) || !validateRows(result.pluralRows)) {
      return NextResponse.json(
        { error: "Invalid AI response shape", raw: textBlock.text },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("AI verb table generation error:", error);
    return NextResponse.json(
      { error: "AI generation failed" },
      { status: 500 }
    );
  }
}
