import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireAuth } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/prisma";
import {
  ConjugationInput,
  VerbConjugationTable,
  PersonKey,
  PersonConjugations,
} from "@/types/grammar-table";
import { attachHighlights, normalizeInfinitive } from "@/lib/regular-conjugation";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface GenerateRequest {
  input: ConjugationInput;
  /** Verbs already present in tableData — will be skipped unless forceRegenerate includes them */
  existingVerbs?: string[];
  /** Verbs to forcibly re-generate (bypass cache) */
  forceRegenerate?: string[];
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

WICHTIG: Gib KEINE "highlights" zurück. Gib NUR die korrekten Konjugationsformen zurück.

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
- "sein"-Verben im Perfekt: verwendet "ist/sind/bin/bist/seid" statt "haben"
- Starke Verben: unregelmäßige Stammänderungen
- Dativ-Reflexivpronomen (mir/dir/sich/uns/euch/sich) bei Verben wie "sich vorstellen", "sich merken"
- WICHTIG: Verwende immer die deutsche Standardorthografie mit ß (Eszett), NICHT die Schweizer Schreibweise mit ss. Beispiel: "groß" nicht "gross", "heißen" nicht "heissen", "schließen" nicht "schliessen".

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

  // Deterministic irregularity detection:
  // Generate regular forms programmatically and diff against AI-generated actual forms
  attachHighlights(tableData);
  
  return tableData;
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = (await req.json()) as GenerateRequest;
    const { input, existingVerbs = [], forceRegenerate = [] } = body;

    if (!input || !input.verbs || input.verbs.length === 0) {
      return NextResponse.json(
        { error: "Invalid request. Provide at least one verb infinitive." },
        { status: 400 }
      );
    }

    // Filter out empty verbs (preserve original capitalization)
    const verbs = input.verbs.map(v => v.trim()).filter(v => v !== "");
    
    if (verbs.length === 0) {
      return NextResponse.json(
        { error: "Invalid request. Provide at least one verb infinitive." },
        { status: 400 }
      );
    }

    // Build lookup sets
    const existingSet = new Set(existingVerbs.map(normalizeInfinitive));
    const forceSet = new Set(forceRegenerate.map(normalizeInfinitive));

    // Determine which verbs need processing
    const verbsToProcess = verbs.filter(v => {
      const norm = normalizeInfinitive(v);
      // Always process if force-regenerating
      if (forceSet.has(norm)) return true;
      // Skip if already in tableData
      if (existingSet.has(norm)) return false;
      return true;
    });

    console.log(`[Conjugation] Request: ${verbs.length} verbs, ${existingVerbs.length} existing, ${forceRegenerate.length} forced, ${verbsToProcess.length} to process`);

    const tables: VerbConjugationTable[] = [];
    const fromCache: string[] = [];
    const generated: string[] = [];
    const failed: string[] = [];

    for (const verb of verbsToProcess) {
      const norm = normalizeInfinitive(verb);
      const shouldForce = forceSet.has(norm);

      try {
        // 1. Check global cache (skip if force-regenerating)
        if (!shouldForce) {
          try {
            const cached = await prisma.verbCache.findUnique({
              where: { infinitive: norm },
            });
            if (cached) {
              // Use cached data, but restore the original input.verb casing
              const table = cached.data as unknown as VerbConjugationTable;
              table.input = { verb };
              tables.push(table);
              fromCache.push(verb);
              console.log(`[Conjugation] Cache hit: "${verb}"`);
              continue;
            }
          } catch (cacheErr) {
            // Cache read failed — fall through to AI generation
            console.warn(`[Conjugation] Cache read failed for "${verb}":`, cacheErr);
          }
        }

        // 2. Call AI to generate
        console.log(`[Conjugation] Generating via AI: "${verb}"${shouldForce ? " (forced)" : ""}`);
        const table = await generateSingleVerb(verb);
        tables.push(table);
        generated.push(verb);

        // 3. Write to global cache (upsert) — non-blocking, don't let cache write failures break flow
        try {
          const jsonData = JSON.parse(JSON.stringify(table));
          await prisma.verbCache.upsert({
            where: { infinitive: norm },
            update: { data: jsonData, updatedAt: new Date() },
            create: { infinitive: norm, data: jsonData },
          });
        } catch (cacheErr) {
          console.warn(`[Conjugation] Cache write failed for "${verb}":`, cacheErr);
        }
      } catch (err) {
        console.error(`Failed to generate table for verb "${verb}":`, err);
        failed.push(verb);
        // Continue with other verbs
      }
    }

    console.log(
      `[Conjugation] Done: ${fromCache.length} from cache, ${generated.length} AI-generated, ${failed.length} failed, ${existingVerbs.length} skipped (existing)`
    );

    return NextResponse.json({ tables, fromCache, generated, failed });
  } catch (error) {
    console.error("Conjugation table generation error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Generation failed: ${message}` },
      { status: 500 }
    );
  }
}
