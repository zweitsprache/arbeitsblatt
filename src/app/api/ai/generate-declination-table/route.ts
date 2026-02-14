import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireAuth } from "@/lib/auth/require-auth";
import {
  DeclinationInput,
  AdjectiveDeclinationTable,
  CaseSection,
  ArticleGroup,
  GrammatikalFall,
  CASE_PREPOSITIONS,
} from "@/types/grammar-table";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface GenerateRequest {
  input: DeclinationInput;
}

const CASES: GrammatikalFall[] = ["nominativ", "akkusativ", "dativ", "genitiv"];

export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = (await req.json()) as GenerateRequest;
    const { input } = body;

    if (!input || !input.maskulin || !input.neutrum || !input.feminin || !input.plural) {
      return NextResponse.json(
        { error: "Invalid request. Provide adjective/noun for all genders." },
        { status: 400 }
      );
    }

    const prompt = `Du bist ein Experte für deutsche Grammatik. Generiere eine vollständige Adjektivdeklinationstabelle.

Eingabe:
- Maskulin: ${input.maskulin.adjective} ${input.maskulin.noun}
- Neutrum: ${input.neutrum.adjective} ${input.neutrum.noun}
- Feminin: ${input.feminin.adjective} ${input.feminin.noun}
- Plural: ${input.plural.adjective} ${input.plural.noun}

Erstelle für jeden der 4 Fälle (Nominativ, Akkusativ, Dativ, Genitiv) die Deklination mit 3 Artikelgruppen.

WICHTIG: Die Tabelle hat diese EXAKTE Struktur für jeden Fall:

**Gruppe 1 - Bestimmter Artikel (definite):**
- 2 Artikelvarianten: "der/dieser" für Maskulin, "das/dieses" für Neutrum, "die/diese" für Feminin, "die/diese" für Plural
- Adjektiv und Nomen sind für beide Zeilen gleich (werden per rowspan dargestellt)

**Gruppe 2 - Unbestimmter Artikel (indefinite):**
- 3 Artikelvarianten: "ein", "kein", "mein"
- Singular: Adjektiv und Nomen sind für alle 3 Zeilen gleich
- Plural ist SPEZIELL:
  - Zeile 1 (ein): "…" + schwache Adjektivendung + Nomen (ohne Artikel)
  - Zeile 2-3 (kein/mein): "keine/meine" + starke Adjektivendung + Nomen

**Gruppe 3 - Nullartikel (zero):**
- 1 Zeile: "…" als Artikel, starke Adjektivendung

ADJEKTIVENDUNGEN-REGELN:
- Nach bestimmtem Artikel: -e (Nom Sg), -en (alle anderen)
- Nach unbestimmtem Artikel: Adjektiv übernimmt Genussignal wenn Artikel es nicht zeigt
- Nullartikel: Adjektiv trägt volle starke Endung

NOMEN-REGELN:
- Dativ Plural: Nomen erhält -n Endung (außer wenn schon auf -n/-s endend)
- Genitiv Maskulin/Neutrum Singular: Nomen erhält -(e)s Endung

Gib die Antwort als JSON zurück:

{
  "input": { ... },
  "cases": [
    {
      "case": "nominativ",
      "groups": [
        {
          "type": "definite",
          "shared": {
            "maskulin": { "adjective": "DEKLINIERT", "noun": "${input.maskulin.noun}" },
            "neutrum": { "adjective": "DEKLINIERT", "noun": "${input.neutrum.noun}" },
            "feminin": { "adjective": "DEKLINIERT", "noun": "${input.feminin.noun}" },
            "plural": { "adjective": "DEKLINIERT", "noun": "${input.plural.noun}" }
          },
          "articleRows": [
            { "maskulin": "der", "neutrum": "das", "feminin": "die", "plural": "die" },
            { "maskulin": "dieser", "neutrum": "dieses", "feminin": "diese", "plural": "diese" }
          ]
        },
        {
          "type": "indefinite",
          "shared": {
            "maskulin": { "adjective": "DEKLINIERT", "noun": "${input.maskulin.noun}" },
            "neutrum": { "adjective": "DEKLINIERT", "noun": "${input.neutrum.noun}" },
            "feminin": { "adjective": "DEKLINIERT", "noun": "${input.feminin.noun}" },
            "plural": { "adjective": "DEKLINIERT", "noun": "${input.plural.noun}" }
          },
          "articleRows": [
            { "maskulin": "ein", "neutrum": "ein", "feminin": "eine", "plural": "…",
              "pluralOverride": { "adjective": "SCHWACH_DEKLINIERT", "noun": "${input.plural.noun}" } },
            { "maskulin": "kein", "neutrum": "kein", "feminin": "keine", "plural": "keine",
              "pluralOverride": { "adjective": "STARK_DEKLINIERT", "noun": "${input.plural.noun}" } },
            { "maskulin": "mein", "neutrum": "mein", "feminin": "meine", "plural": "meine" }
          ]
        },
        {
          "type": "zero",
          "shared": {
            "maskulin": { "adjective": "STARK_DEKLINIERT", "noun": "${input.maskulin.noun}" },
            "neutrum": { "adjective": "STARK_DEKLINIERT", "noun": "${input.neutrum.noun}" },
            "feminin": { "adjective": "STARK_DEKLINIERT", "noun": "${input.feminin.noun}" },
            "plural": { "adjective": "STARK_DEKLINIERT", "noun": "${input.plural.noun}" }
          },
          "articleRows": [
            { "maskulin": "…", "neutrum": "", "feminin": "…", "plural": "…" }
          ]
        }
      ]
    }
    // ... akkusativ, dativ, genitiv analog
  ]
}

ERSETZE alle "DEKLINIERT", "SCHWACH_DEKLINIERT", "STARK_DEKLINIERT" mit den korrekten Adjektivformen!

Gib NUR valides JSON zurück, keine Markdown-Codeblöcke. Generiere alle 4 Fälle.`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      messages: [
        {
          role: "user",
          content: prompt,
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

    let result: AdjectiveDeclinationTable;
    try {
      let raw = textBlock.text.trim();
      // Remove markdown code blocks if present
      if (raw.startsWith("```")) {
        raw = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }
      result = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI response", raw: textBlock.text },
        { status: 500 }
      );
    }

    // Validate shape
    if (!result.cases || !Array.isArray(result.cases)) {
      return NextResponse.json(
        { error: "Invalid AI response: missing cases array", raw: textBlock.text },
        { status: 500 }
      );
    }

    // Add preposition info to each case
    for (const caseSection of result.cases as CaseSection[]) {
      if (!CASES.includes(caseSection.case)) {
        return NextResponse.json(
          { error: `Invalid case: ${caseSection.case}`, raw: textBlock.text },
          { status: 500 }
        );
      }
      
      // Add prepositions from our reference data
      const prepInfo = CASE_PREPOSITIONS[caseSection.case];
      if (prepInfo.heading) {
        caseSection.prepositionHeading = prepInfo.heading;
        caseSection.prepositions = prepInfo.prepositions;
      }
      
      if (!Array.isArray(caseSection.groups)) {
        return NextResponse.json(
          { error: `Missing groups for case: ${caseSection.case}`, raw: textBlock.text },
          { status: 500 }
        );
      }
      
      for (const group of caseSection.groups as ArticleGroup[]) {
        if (!group.shared || !group.articleRows) {
          return NextResponse.json(
            { error: "Group missing shared or articleRows", raw: textBlock.text },
            { status: 500 }
          );
        }
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("AI declination table generation error:", error);
    return NextResponse.json(
      { error: "AI generation failed" },
      { status: 500 }
    );
  }
}
