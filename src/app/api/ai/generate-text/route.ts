import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface GenerateRequest {
  thema: string;
  textsorte: string;
  niveau: string;
  leseransprache: "direkt-sie" | "neutral-man";
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GenerateRequest;
    const { thema, textsorte, niveau, leseransprache } = body;

    if (!thema || !textsorte || !niveau || !leseransprache) {
      return NextResponse.json(
        { error: "Alle Felder müssen ausgefüllt sein." },
        { status: 400 }
      );
    }

    const prompt = `Du bist Autor:in für didaktisch hochwertige Lesetexte im Bereich Deutsch als Zweitsprache (Erwachsene). Erzeuge einen flüssigen, attraktiven und sprachlich korrekten Text auf ${niveau} zum Thema «${thema}» in der Textsorte «${textsorte}».
Wichtig: Verwende ausschliesslich die in der Niveau-Merkmal-Liste für ${niveau} freigegebenen Strukturen (kumulativ). Höhere Strukturen sind verboten. Orthografie: DE-CH (ss statt ß; CH-Varianz wie «Spital», «Velo» ist zulässig, wenn passend).

Leseransprache: ${leseransprache === "direkt-sie" ? "direkt-sie – Verwende Sie/Ihnen/Ihr(e), Verbform 3. Person Plural. Höflich, zugewandt; kein Imperativ auf A1 (stattdessen Aussagesätze/Ja-Nein-Fragen)." : "neutral-man – Verwende «man», Verbform 3. Person Singular. Kein Passiv verwenden wo möglich (→ «man + Modalverb»). Keine direkte Anrede, keine Leserfragen. Possessiv: vermeide «sein/ihr» → nutze «die eigene…/das eigene…» oder Umschreibungen."}

GLOBALE QUALITÄTSKRITERIEN:
• Flüssigkeit und Lesbarkeit: klare, natürliche Sätze; kein Telegrafstil; stimmiger Rhythmus.
• Kohäsion: thematische Fortschreibung, saubere Referenzen (Pronomen/Wiederaufnahmen), Konnektoren gemäss Niveau.
• Erwachsenenrelevanz: alltags-, berufs- oder gesellschaftsnah; respektvoll, inklusiv, kultursensibel.
• DE-CH-Standard: ss statt ß; CH-Varianz zulässig («Spital», «Tram», «Billet»).
• Wortschatz: bevorzugt hochfrequente, konkrete Lexik; kein unnötiger Jargon.
• Fehlerfreiheit: Grammatik, Orthografie, Zeichensetzung korrekt.
• Konsistenz der Leseransprache: durchgehend «${leseransprache === "direkt-sie" ? "Sie" : "man"}».
• Inklusive Sprache: neutrale Formen («Mitarbeitende», «Lehrpersonen») oder Gender durch «:» («Mitarbeiter:innen»).
• Neutralität: keine bewertenden, romantisierenden, verniedlichenden oder moralisierenden Aussagen.

LÄNGENSTEUERUNG (Wortzahl und Absatzzahl):
• A1.1: 90–140 Wörter, 3 Absätze
• A1.2: 130–180 Wörter, 3–4 Absätze
• A2.1: 170–240 Wörter, 4 Absätze
• A2.2: 220–320 Wörter, 4–5 Absätze
• B1.1: 300–420 Wörter, 5 Absätze
• B1.2: 380–520 Wörter, 5–6 Absätze
Für Dialoge gilt die Längensteuerung nicht; die Länge richtet sich nach dem natürlichen Dialogverlauf.

TEXTSPEZIFISCHE VORGABEN (nach Textsorte):
• Sachtext/Bericht: klarer Lead; Absätze mit Themensätzen; neutrale Tonalität; keine direkte Leseransprache.
• Nachricht/Meldung: W-Fragen in den ersten Sätzen, sachlich; keine direkte Leseransprache.
• Porträt: Person, Kontext, charakteristische Details; indirekte Rede erst ab A2.2.
• Interview/Dialog: Sprecherwechsel mit «Person A», «Person B»; stufengerechte Fragen/Antworten.
• Erzählung/Blog: einfache Chronologie; klare Zeitmarker gemäss Niveau.
• Kommentar (empfohlen ab B1.1): These – Begründung – Fazit; vorsichtige Bewertung.

NIVEAU-MERKMAL-LISTE (kumulativ, strikt):

A1.1:
• Grammatik: Präsens (regelmässige Verben; sein, haben); Personalpronomen; Artikel Singular Nominativ und sehr einfacher Akkusativ; Plural (Basis); keine Nebensätze.
• Konnektoren: und, oder, aber.
• Syntax: Aussagesatz, Ja/Nein-Frage, W-Frage; Satzlänge Ø 5–8 Wörter; keine Inversion.
• Wortschatz: sehr hoher Alltagsbezug; Ortsangaben ohne komplexe Präpositionalketten.
• NICHT verwenden: Perfekt, Modalverben, Nebensätze, komplexe Dativ/Genitiv, trennbare Verben.

A1.2 (kumulativ zu A1.1):
• Grammatik: Perfekt (häufige Verben); Modalverben Präsens mit Infinitiv am Satzende; trennbare Verben; einfache Dativ-Phrase mit «mit»; Kontraktionen im/am/zum/zur.
• Konnektoren: denn; Zeitmarker: zuerst, dann, danach, später; um X Uhr; oft/manchmal/immer/nie.
• Syntax: Inversion nach Vorfeld möglich; Satzlänge Ø 6–12 Wörter.
• NICHT verwenden: weil/dass/ob/Relativsätze, Präteritum (ausser war/hatte), Passiv, Konjunktiv II.

A2.1 (kumulativ):
• Grammatik: Nebensatz mit weil (Verb > Ende); Inversion nach Voranstellung; Präteritum von sein, haben, Modalverben; Wechselpräpositionen einfach.
• Konnektoren: weil, deshalb, also, ausserdem (sparsam).
• Syntax: Satzlänge Ø 8–14 Wörter; max. 1 Nebensatz pro Satz.
• NICHT verwenden: dass/ob/wenn-Sätze, Relativsätze, zu-Infinitiv, Passiv, Konjunktiv II.

A2.2 (kumulativ):
• Grammatik: Nebensätze mit dass, wenn, ob; Komparativ/Superlativ; Konjunktiv II (würde+Inf, könnte, sollte).
• Konnektoren: ausserdem, jedoch, trotzdem, während (Präposition).
• Syntax: Satzlänge Ø 10–16 Wörter; 1–2 Nebensätze pro Satz; einfache indirekte Rede mit dass.
• NICHT verwenden: Passiv, Plusquamperfekt, komplexe Relativketten, Partizipialattribute.

B1.1 (kumulativ):
• Grammatik: Relativsatz einfach; zu-Infinitiv und um…zu; Passiv Präsens einfach; Plusquamperfekt linear; obwohl, damit; erweiterte Objekt-/Präpositionalgruppen.
• Konnektoren: trotzdem, daher, allerdings, jedoch, einerseits…andererseits (einfach).
• Syntax: Satzlänge Ø 12–18 Wörter; bis 2 Nebensätze; indirekte Rede mit dass.
• NICHT verwenden: Futur I als Pflichtform, Passiv Perfekt, partizipiale Verdichtungen, verschachtelte Relativketten.

B1.2 (kumulativ):
• Grammatik: Relativsätze mit Präposition (einfach); obwohl, bevor, nachdem, seit/seitdem; Zustandspassiv; behutsame Partizip-Attribute.
• Konnektoren: folglich, somit, hingegen, darüber hinaus (massvoll).
• Syntax: Satzlänge Ø 12–22 Wörter; Variation der Satzanfänge; Thema–Rhema-Gliederung.

WORTSCHATZSTEUERUNG:
• A1.x: 85–90 % sehr hochfrequente Wörter; neue Wörter sofort kontextualisieren.
• A2.x: 75–85 % hochfrequent; fachnahe Wörter sparsam, durch Kontext gestützt.
• B1.x: 65–75 % hochfrequent; Abstrakta gezielt, stets anschaulich.

KOHÄSION UND STIL:
• Referenz: konsistente Nennung/Ersetzung ohne Ambiguität.
• Themenführung: pro Absatz ein klarer Fokus; am Ende kurzer Abschluss-/Ausblicksatz.
• Klang: natürliche Prosodie; keine übermässigen Wiederholungen; moderate Variation bei Satzanfängen.

AUSGABEFORMAT — Antworte AUSSCHLIESSLICH mit einem JSON-Objekt (KEIN Markdown, KEINE Code-Blöcke):
{
  "titel": "Prägnanter Titel (3–8 Wörter)",
  "teaser": "Untertitel/Teaser (1 Satz, max. 140 Zeichen)",
  "absaetze": ["Absatz 1 Text...", "Absatz 2 Text...", ...],
  "glossar": [{"lemma": "Wort", "erklaerung": "einfache Erklärung"}, ...]
}

Das Glossar soll 6–12 stufengerechte Einträge enthalten.
Nur den Text liefern (keine Aufgaben, keine Meta-Erklärungen, keine Kommentare).`;

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

    const textBlock = message.content.find((c) => c.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "No text response from AI" },
        { status: 500 }
      );
    }

    let result: {
      titel: string;
      teaser: string;
      absaetze: string[];
      glossar: { lemma: string; erklaerung: string }[];
    };
    try {
      let raw = textBlock.text.trim();
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

    if (
      !result.titel ||
      !result.teaser ||
      !Array.isArray(result.absaetze) ||
      !Array.isArray(result.glossar)
    ) {
      return NextResponse.json(
        { error: "Invalid AI response shape", raw: textBlock.text },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("AI text generation error:", error);
    return NextResponse.json(
      { error: "AI generation failed" },
      { status: 500 }
    );
  }
}
