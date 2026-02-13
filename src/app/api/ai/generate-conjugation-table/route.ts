import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireAuth } from "@/lib/auth/require-auth";
import {
  ConjugationInput,
  VerbConjugationTable,
  PersonKey,
  PersonConjugations,
} from "@/types/grammar-table";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface GenerateRequest {
  input: ConjugationInput;
}

interface AIConjugationResponse {
  isSeparable: boolean;
  separablePrefix?: string;
  isReflexive: boolean;
  conjugations: Record<PersonKey, PersonConjugations>;
}

async function generateSingleVerb(verb: string): Promise<VerbConjugationTable> {
  const prompt = `Du bist ein Experte für deutsche Grammatik. Generiere die Konjugationen für ein deutsches Verb.

Eingabe-Verb (Infinitiv): ${verb}

Erstelle die Konjugation für ALLE 8 Personen in 3 Zeitformen: Präsens, Perfekt, Präteritum.

PRÜFE:
1. Ist das Verb TRENNBAR? (z.B. "abholen" → "hole ab", "sich abmelden" → "melde mich ab")
   Trennbare Präfixe: ab, an, auf, aus, bei, ein, los, mit, nach, vor, weg, zu, zurück, etc.
2. Ist das Verb REFLEXIV? (z.B. "sich freuen", "sich vorstellen", "sich abmelden")

Die 8 Personen-Keys mit Reflexivpronomen:
- "ich": mich/mir
- "du": dich/dir
- "Sie_sg": sich
- "er_sie_es": sich
- "wir": uns
- "ihr": euch
- "Sie_pl": sich
- "sie_pl": sich

Für JEDE Person und JEDE Zeitform:

**Präsens & Präteritum:**
- main = konjugierter Stamm/Verbform
- prefix = abgetrenntes Präfix (nur bei trennbaren Verben)
- reflexive = Reflexivpronomen (nur bei reflexiven Verben: mich/dich/sich/uns/euch)

**Perfekt:**
- auxiliary = Hilfsverb (haben/sein konjugiert)
- partizip = Partizip II
- reflexive = Reflexivpronomen (nur bei reflexiven Verben)

BEISPIEL für "sich abmelden" (trennbar + reflexiv):
{
  "isSeparable": true,
  "separablePrefix": "ab",
  "isReflexive": true,
  "conjugations": {
    "ich": {
      "praesens": { "main": "melde", "reflexive": "mich", "prefix": "ab" },
      "perfekt": { "auxiliary": "habe", "reflexive": "mich", "partizip": "abgemeldet" },
      "praeteritum": { "main": "meldete", "reflexive": "mich", "prefix": "ab" }
    },
    "du": {
      "praesens": { "main": "meldest", "reflexive": "dich", "prefix": "ab" },
      "perfekt": { "auxiliary": "hast", "reflexive": "dich", "partizip": "abgemeldet" },
      "praeteritum": { "main": "meldetest", "reflexive": "dich", "prefix": "ab" }
    },
    ...
  }
}

BEISPIEL für "sich freuen" (reflexiv, nicht trennbar):
{
  "isSeparable": false,
  "isReflexive": true,
  "conjugations": {
    "ich": {
      "praesens": { "main": "freue", "reflexive": "mich" },
      "perfekt": { "auxiliary": "habe", "reflexive": "mich", "partizip": "gefreut" },
      "praeteritum": { "main": "freute", "reflexive": "mich" }
    },
    ...
  }
}

BEISPIEL für "abholen" (trennbar, nicht reflexiv):
{
  "isSeparable": true,
  "separablePrefix": "ab",
  "isReflexive": false,
  "conjugations": {
    "ich": {
      "praesens": { "main": "hole", "prefix": "ab" },
      "perfekt": { "auxiliary": "habe", "partizip": "abgeholt" },
      "praeteritum": { "main": "holte", "prefix": "ab" }
    },
    ...
  }
}

BEISPIEL für "machen" (weder trennbar noch reflexiv):
{
  "isSeparable": false,
  "isReflexive": false,
  "conjugations": {
    "ich": {
      "praesens": { "main": "mache" },
      "perfekt": { "auxiliary": "habe", "partizip": "gemacht" },
      "praeteritum": { "main": "machte" }
    },
    ...
  }
}

Beachte:
- "sein"-Verben im Perfekt: verwendet "ist/sind/bin/bist" statt "haben"
- Starke Verben: unregelmäßige Stammänderungen
- Dativ-Reflexivpronomen (mir/dir/sich/uns/euch/sich) bei Verben wie "sich vorstellen", "sich merken"

Gib NUR das JSON zurück, kein anderer Text:`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const textContent = message.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No response from AI");
  }

  // Parse the JSON response
  let jsonText = textContent.text.trim();
  if (jsonText.startsWith("```json")) {
    jsonText = jsonText.slice(7);
  } else if (jsonText.startsWith("```")) {
    jsonText = jsonText.slice(3);
  }
  if (jsonText.endsWith("```")) {
    jsonText = jsonText.slice(0, -3);
  }
  jsonText = jsonText.trim();

  const aiResponse = JSON.parse(jsonText) as AIConjugationResponse;
  
  // Build the final table with input
  const tableData: VerbConjugationTable = {
    input: { verb },
    isSeparable: aiResponse.isSeparable,
    separablePrefix: aiResponse.separablePrefix,
    isReflexive: aiResponse.isReflexive || false,
    conjugations: aiResponse.conjugations,
  };
  
  return tableData;
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = (await req.json()) as GenerateRequest;
    const { input } = body;

    if (!input || !input.verbs || input.verbs.length === 0) {
      return NextResponse.json(
        { error: "Invalid request. Provide at least one verb infinitive." },
        { status: 400 }
      );
    }

    // Filter out empty verbs
    const verbs = input.verbs.map(v => v.trim().toLowerCase()).filter(v => v !== "");
    
    if (verbs.length === 0) {
      return NextResponse.json(
        { error: "Invalid request. Provide at least one verb infinitive." },
        { status: 400 }
      );
    }

    // Generate tables for all verbs
    const tables: VerbConjugationTable[] = [];
    for (const verb of verbs) {
      try {
        const table = await generateSingleVerb(verb);
        tables.push(table);
      } catch (err) {
        console.error(`Failed to generate table for verb "${verb}":`, err);
        // Continue with other verbs
      }
    }

    if (tables.length === 0) {
      return NextResponse.json(
        { error: "Failed to generate any conjugation tables" },
        { status: 500 }
      );
    }

    return NextResponse.json(tables);
  } catch (error) {
    console.error("Conjugation table generation error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Generation failed: ${message}` },
      { status: 500 }
    );
  }
}
