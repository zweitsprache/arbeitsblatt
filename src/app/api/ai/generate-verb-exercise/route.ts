import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireAuth } from "@/lib/auth/require-auth";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ExerciseItem {
  verb: string;
  pronoun: string;
  tense: string;
  sentence: string; // sentence with ___ placeholder for the verb form
}

interface GenerateRequest {
  /** Verbs with their conjugation data – simplified: just infinitives + person assignments */
  items: {
    verb: string;
    pronoun: string;
    tense: string;
    tenseLabel: string;
    isSeparable?: boolean;
    separablePrefix?: string;
    isReflexive?: boolean;
  }[];
  level: string; // A1.1, A1.2, A2.1, A2.2, B1.1, B1.2
  context: string; // optional theme/topic instruction
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = (await req.json()) as GenerateRequest;
    const { items, level, context } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "No items provided." },
        { status: 400 }
      );
    }

    if (items.length > 60) {
      return NextResponse.json(
        { error: "Too many items. Maximum 60." },
        { status: 400 }
      );
    }

    const contextInstruction = context?.trim()
      ? `\nThematischer Kontext für die Sätze: ${context.trim()}\n`
      : "";

    const itemsList = items
      .map(
        (item, i) => {
          let desc = `${i + 1}. Verb: "${item.verb}" | Pronomen: "${item.pronoun}" | Zeitform: ${item.tenseLabel}`;
          if (item.isSeparable && item.separablePrefix && item.tenseLabel !== "Perfekt") {
            desc += ` | TRENNBAR: Präfix "${item.separablePrefix}" muss an der richtigen Stelle im Satz stehen`;
          }          if (item.isReflexive) {
            desc += ` | REFLEXIV: Reflexivpronomen muss im Satz stehen, NICHT im ___`;
          }          return desc;
        }
      )
      .join("\n");

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `Du bist ein Deutsch-als-Fremdsprache-Lehrer. Erstelle Übungssätze für Verbkonjugation.

Sprachniveau: ${level}
${contextInstruction}
Für jeden der folgenden Einträge erstelle GENAU EINEN deutschen Satz. Der Satz muss:
- Das angegebene Pronomen als Subjekt verwenden
- Das angegebene Verb in der angegebenen Zeitform erfordern
- Die Stelle, an der die konjugierte Verbform stehen soll, mit ___ markieren
- Dem Sprachniveau ${level} entsprechen (Wortschatz, Satzkomplexität)
- Natürlich und alltagsnah klingen
- KEINE andere Form des gleichen Verbs im Satz enthalten

WICHTIG für zusammengesetzte Zeitformen (Perfekt):
- Bei Perfekt-Sätzen soll ___ die GESAMTE Verbform ersetzen (Hilfsverb + Partizip), z.B.: "Ich ___ nach Berlin." (für "bin gefahren")

WICHTIG für trennbare Verben (Präsens/Präteritum):
- ___ ersetzt NUR den konjugierten Stammteil (OHNE Präfix)
- Das abgetrennte Präfix muss an seiner natürlichen Position im Satz stehen (normalerweise am Satzende)
- Beispiel für "abholen" (Präsens): "Du ___ mich vom Bahnhof ab." (die richtige Antwort wäre "holst")
- Beispiel für "aufstehen" (Präsens): "Ich ___ um 7 Uhr auf." (die richtige Antwort wäre "stehe")

WICHTIG für reflexive Verben:
- ___ ersetzt NUR die konjugierte Verbform (OHNE Reflexivpronomen)
- Das Reflexivpronomen (mich/dich/sich/uns/euch) muss im Satz an seiner natürlichen Position stehen
- Beispiel für "sich ausruhen" (Präsens): "Er ___ sich nach der Arbeit aus." (die richtige Antwort wäre "ruht")
- Bei Perfekt geh das Reflexivpronomen in den ___: "Er ___ nach der Arbeit." (für "hat sich ausgeruht")

WICHTIG: Jeder Satz muss so formuliert sein, dass das Pronomen und der Kontext eindeutig die korrekte Verbform bestimmen.

Einträge:
${itemsList}

Antworte NUR mit einem validen JSON-Array. Jedes Element muss haben:
- "index": die Nummer des Eintrags (1-basiert)
- "sentence": der Satz mit ___ als Platzhalter

Kein Markdown, nur rohes JSON.

Beispiel:
[{"index":1,"sentence":"Ich ___ gerne Fussball."},{"index":2,"sentence":"Du ___ mich vom Bahnhof ab."}]`,
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

    let sentences: { index: number; sentence: string }[];
    try {
      let raw = textBlock.text.trim();
      if (raw.startsWith("```")) {
        raw = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }
      sentences = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI response", raw: textBlock.text },
        { status: 500 }
      );
    }

    if (
      !Array.isArray(sentences) ||
      !sentences.every(
        (s) => typeof s.index === "number" && typeof s.sentence === "string"
      )
    ) {
      return NextResponse.json(
        { error: "Invalid AI response shape", raw: textBlock.text },
        { status: 500 }
      );
    }

    return NextResponse.json({ sentences });
  } catch (error) {
    console.error("AI verb exercise generation error:", error);
    return NextResponse.json(
      { error: "AI generation failed" },
      { status: 500 }
    );
  }
}
