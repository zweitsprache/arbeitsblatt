import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireAuth } from "@/lib/auth/require-auth";
import {
  VerbPrepositionInput,
  VerbPrepositionItem,
  VerbPrepositionTableEntry,
  VerbPrepositionDeclensionRow,
  GrammatikalFall,
  VerbPrepArticleType,
} from "@/types/grammar-table";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface GenerateRequest {
  input: VerbPrepositionInput;
}

interface AIPrepositionResponse {
  case: GrammatikalFall;
  isReflexive: boolean;
  firstPersonExample?: string;
  declension: VerbPrepositionDeclensionRow;
}

function getArticleInstruction(articleType: VerbPrepArticleType): string {
  switch (articleType) {
    case "bestimmt":
      return `Bestimmter Artikel (der/das/die): z.B. Artikel="den", Adjektiv="nächsten", Nomen="Tag"`;
    case "unbestimmt":
      return `Unbestimmter Artikel (ein/eine): z.B. Artikel="einen", Adjektiv="nächsten", Nomen="Tag". Für Plural: Artikel="" (leer), nur Adjektiv+Nomen`;
    case "nullartikel":
      return `Nullartikel (kein Artikel): Artikel ist IMMER "" (leerer String). z.B. Artikel="", Adjektiv="nächsten", Nomen="Tag". Dies erfordert starke Adjektivendungen.`;
    case "possessiv":
      return `Possessivartikel (mein/meine): z.B. Artikel="meinen", Adjektiv="nächsten", Nomen="Tag"`;
    case "demonstrativ":
      return `Demonstrativartikel (dieser/dieses/diese): z.B. Artikel="diesen", Adjektiv="nächsten", Nomen="Tag"`;
  }
}

async function generateSingleItem(item: VerbPrepositionItem): Promise<VerbPrepositionTableEntry> {
  const articleInstruction = getArticleInstruction(item.articleType);

  const prompt = `Du bist ein Experte für deutsche Grammatik. Generiere die Deklinations-Daten für ein Verb mit Präposition.

Eingabe:
- Verb (Infinitiv): ${item.verb}
- Präposition: ${item.preposition}
- Adjektiv (Grundform): ${item.adjective}
- Artikeltyp: ${item.articleType}
- Nomen: Maskulin="${item.nouns.maskulin}", Neutrum="${item.nouns.neutrum}", Feminin="${item.nouns.feminin}", Plural="${item.nouns.plural}"

AUFGABE 1: Bestimme den Fall (case), den die Kombination Verb + Präposition regiert.
z.B. "sich freuen auf" → Akkusativ, "denken an" → Akkusativ, "träumen von" → Dativ

AUFGABE 2: Prüfe ob das Verb reflexiv ist (beginnt mit "sich").

AUFGABE 3: Erstelle den Beispielsatz in der 1. Person Singular Präsens.
Format: "Ich [konjugiertes Verb] [Reflexivpronomen falls reflexiv] [Präposition]…"
z.B. "Ich freue mich auf…" oder "Ich denke an…" oder "Ich träume von…"
Bei trennbaren Verben: Präfix ans Ende, VOR die Präposition + "…"
WICHTIG: Der Satz endet IMMER mit "…" (Auslassungszeichen) NACH der Präposition.

AUFGABE 4: Dekliniere das Adjektiv mit dem Nomen für alle 4 Genera im bestimmten Fall.
Verwende folgenden Artikeltyp: ${articleInstruction}

Jeder Gender-Eintrag in "declension" hat 3 Felder:
- "article": Der deklinierte Artikel (leerer String "" bei Nullartikel)
- "adjective": Das deklinierte Adjektiv
- "noun": Das Nomen (unverändert)

WICHTIG:
- Verwende IMMER ß (Eszett) für die deutsche Standardorthografie, NICHT ss.
- Die Adjektivdeklination muss zum gewählten Fall UND Artikeltyp passen.
- Nullartikel → starke Adjektivendungen, article ist IMMER ""
- Bestimmter Artikel → schwache Adjektivendungen
- Unbestimmter/Possessiv/Demonstrativ → gemischte Adjektivendungen

Gib NUR dieses JSON zurück, kein anderer Text:
{
  "case": "akkusativ",
  "isReflexive": true,
  "firstPersonExample": "Ich freue mich auf…",
  "declension": {
    "maskulin": { "article": "den", "adjective": "nächsten", "noun": "Tag" },
    "neutrum": { "article": "das", "adjective": "nächste", "noun": "Wochenende" },
    "feminin": { "article": "die", "adjective": "nächste", "noun": "Woche" },
    "plural": { "article": "die", "adjective": "nächsten", "noun": "Ferien" }
  }
}`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
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

  const aiResponse = JSON.parse(jsonText) as AIPrepositionResponse;

  return {
    input: item,
    case: aiResponse.case,
    isReflexive: aiResponse.isReflexive,
    firstPersonExample: aiResponse.firstPersonExample || "",
    declension: aiResponse.declension,
  };
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = (await req.json()) as GenerateRequest;
    const { input } = body;

    if (!input || !input.items || input.items.length === 0) {
      return NextResponse.json(
        { error: "Invalid request. Provide at least one verb+preposition item." },
        { status: 400 }
      );
    }

    // Filter out items with missing required fields
    const validItems = input.items.filter(
      (item) =>
        item.verb.trim() &&
        item.preposition.trim() &&
        item.adjective.trim() &&
        (item.nouns.maskulin.trim() ||
          item.nouns.neutrum.trim() ||
          item.nouns.feminin.trim() ||
          item.nouns.plural.trim())
    );

    if (validItems.length === 0) {
      return NextResponse.json(
        { error: "Invalid request. Provide at least one complete verb+preposition item." },
        { status: 400 }
      );
    }

    // Generate tables for all items
    const entries: VerbPrepositionTableEntry[] = [];
    for (const item of validItems) {
      try {
        const entry = await generateSingleItem(item);
        entries.push(entry);
      } catch (err) {
        console.error(`Failed to generate table for "${item.verb} ${item.preposition}":`, err);
        // Continue with other items
      }
    }

    if (entries.length === 0) {
      return NextResponse.json(
        { error: "Failed to generate any verb+preposition tables" },
        { status: 500 }
      );
    }

    return NextResponse.json(entries);
  } catch (error) {
    console.error("Verb+preposition table generation error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Generation failed: ${message}` },
      { status: 500 }
    );
  }
}
