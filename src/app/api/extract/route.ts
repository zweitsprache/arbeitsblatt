import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  isMissingVocabularyTableError,
  isVocabularySchemaMismatchError,
  prismaDebugDetails,
  vocabularyMigrationErrorResponse,
  vocabularySchemaMismatchErrorResponse,
} from "@/lib/prisma-errors";
import { requireAuth } from "@/lib/auth/require-auth";
import {
  buildEntryId,
  buildVocabularyToolInputSchema,
  findVocabularyConsistencyIssues,
  normalizeVocabularyEntry,
  type VocabularyEntryInput,
  vocabularyToolInputSchema,
} from "@/lib/vocabulary";

type PersistableVocabularyEntry = VocabularyEntryInput & { id: string };

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const runtime = "nodejs";

async function nextSequenceByModule(entries: VocabularyEntryInput[]) {
  const uniqueKeys = Array.from(
    new Set(
      entries.map((entry) => `${entry.source.lesson}:${entry.source.module}`)
    )
  );

  const pairs = await Promise.all(
    uniqueKeys.map(async (key) => {
      const [lessonRaw, module] = key.split(":");
      const lesson = Number(lessonRaw);
      const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
        `
          SELECT "id"
          FROM "Entry"
          WHERE ("source"->>'lesson')::integer = $1
            AND "source"->>'module' = $2
          ORDER BY "id" DESC
          LIMIT 1
        `,
        lesson,
        module
      );
      const latest = rows[0];
      const current = latest?.id.match(/-(\d{4})$/)?.[1];
      return [key, current ? Number(current) : 0] as const;
    })
  );

  return new Map(pairs);
}

async function assignEntryIds(entries: VocabularyEntryInput[]) {
  const counters = await nextSequenceByModule(entries);

  return entries.map((entry): PersistableVocabularyEntry => {
    const key = `${entry.source.lesson}:${entry.source.module}`;
    const next = (counters.get(key) ?? 0) + 1;
    counters.set(key, next);
    return {
      ...entry,
      id: buildEntryId(entry.source.lesson, entry.source.module, next),
    };
  });
}

function toEntryCreate(entry: PersistableVocabularyEntry) {
  return {
    id: entry.id,
    lemma: entry.lemma,
    pos: entry.pos,
    level: "A1",
    frequencyRank: entry.frequency_rank ?? null,
    pronunciation: entry.pronunciation,
    source: entry.source,
    examples: entry.examples,
    register: entry.register ?? null,
    domain: entry.domain ?? [],
    tags: entry.tags ?? [],
    notes: entry.notes ?? null,
    dateAdded: new Date(entry.date_added),
    extractionConfidence: entry.extraction_confidence,
    posData: entry.pos_data,
  };
}

function toVerbDetail(entry: PersistableVocabularyEntry) {
  if (entry.pos_data.pos !== "verb") return null;

  return {
    infinitive: entry.pos_data.infinitive,
    auxiliary: entry.pos_data.auxiliary,
    regularity: entry.pos_data.regularity,
    separable: entry.pos_data.separable,
    separablePrefix: entry.pos_data.separable_prefix,
    reflexive: entry.pos_data.reflexive,
    stemChange: entry.pos_data.stem_change.has_change,
    stemChangeType: entry.pos_data.stem_change.type,
    ablautPattern: entry.pos_data.ablaut.pattern,
    ablautClass: entry.pos_data.ablaut.class,
    prepObject: entry.pos_data.prepositional_object?.preposition ?? null,
    prepCase: entry.pos_data.prepositional_object?.case ?? null,
  };
}

function serializeEntry(entry: {
  id: string;
  lemma: string;
  pos: string;
  level: string;
  frequencyRank: number | null;
  pronunciation: unknown;
  source: unknown;
  examples: unknown;
  register: string | null;
  domain: string[];
  tags: string[];
  notes: string | null;
  dateAdded: Date;
  extractionConfidence: string;
  posData: unknown;
  verbDetail?: unknown;
}) {
  if (!entry) return null;
  return {
    id: entry.id,
    lemma: entry.lemma,
    pos: entry.pos,
    level: entry.level,
    frequency_rank: entry.frequencyRank,
    pronunciation: entry.pronunciation,
    source: entry.source,
    examples: entry.examples,
    register: entry.register,
    domain: entry.domain,
    tags: entry.tags,
    notes: entry.notes,
    date_added: entry.dateAdded.toISOString(),
    extraction_confidence: entry.extractionConfidence,
    pos_data: entry.posData,
    verbDetail: "verbDetail" in entry ? entry.verbDetail : undefined,
  };
}

async function saveEntries(entries: VocabularyEntryInput[]) {
  const withIds = await assignEntryIds(entries);

  return prisma.$transaction(async (tx) => {
    const saved = [];

    for (const entry of withIds) {
      const verbDetail = toVerbDetail(entry);
      const entryData = toEntryCreate(entry);

      const existingRows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        `
          SELECT "id"
          FROM "Entry"
          WHERE "lemma" = $1
            AND ("source"->>'lesson')::integer = $2
            AND "source"->>'module' = $3
          LIMIT 1
        `,
        entry.lemma,
        entry.source.lesson,
        entry.source.module
      );
      const existing = existingRows[0];

      if (existing) {
        await tx.$executeRawUnsafe(
          `
            UPDATE "Entry"
            SET
              "lemma" = $2,
              "pos" = $3::"Pos",
              "level" = $4,
              "frequency_rank" = $5,
              "pronunciation" = $6::jsonb,
              "source" = $7::jsonb,
              "examples" = $8::jsonb,
              "register" = $9,
              "domain" = $10,
              "tags" = $11,
              "notes" = $12,
              "date_added" = $13,
              "extraction_confidence" = $14,
              "pos_data" = $15::jsonb
            WHERE "id" = $1
          `,
          existing.id,
          entryData.lemma,
          entryData.pos,
          entryData.level,
          entryData.frequencyRank,
          JSON.stringify(entryData.pronunciation),
          JSON.stringify(entryData.source),
          JSON.stringify(entryData.examples),
          entryData.register,
          entryData.domain,
          entryData.tags,
          entryData.notes,
          entryData.dateAdded,
          entryData.extractionConfidence,
          JSON.stringify(entryData.posData)
        );
      } else {
        await tx.$executeRawUnsafe(
          `
            INSERT INTO "Entry" (
              "id",
              "lemma",
              "pos",
              "level",
              "frequency_rank",
              "pronunciation",
              "source",
              "examples",
              "register",
              "domain",
              "tags",
              "notes",
              "date_added",
              "extraction_confidence",
              "pos_data"
            )
            VALUES (
              $1,
              $2,
              $3::"Pos",
              $4,
              $5,
              $6::jsonb,
              $7::jsonb,
              $8::jsonb,
              $9,
              $10,
              $11,
              $12,
              $13,
              $14,
              $15::jsonb
            )
          `,
          entryData.id,
          entryData.lemma,
          entryData.pos,
          entryData.level,
          entryData.frequencyRank,
          JSON.stringify(entryData.pronunciation),
          JSON.stringify(entryData.source),
          JSON.stringify(entryData.examples),
          entryData.register,
          entryData.domain,
          entryData.tags,
          entryData.notes,
          entryData.dateAdded,
          entryData.extractionConfidence,
          JSON.stringify(entryData.posData)
        );
      }

      const entryId = existing?.id ?? entryData.id;

      if (verbDetail) {
        await tx.$executeRawUnsafe(
          `
            INSERT INTO "VerbDetail" (
              "entryId",
              "infinitive",
              "auxiliary",
              "regularity",
              "separable",
              "separablePrefix",
              "reflexive",
              "stemChange",
              "stemChangeType",
              "ablautPattern",
              "ablautClass",
              "prepObject",
              "prepCase"
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
            ON CONFLICT ("entryId") DO UPDATE SET
              "infinitive" = EXCLUDED."infinitive",
              "auxiliary" = EXCLUDED."auxiliary",
              "regularity" = EXCLUDED."regularity",
              "separable" = EXCLUDED."separable",
              "separablePrefix" = EXCLUDED."separablePrefix",
              "reflexive" = EXCLUDED."reflexive",
              "stemChange" = EXCLUDED."stemChange",
              "stemChangeType" = EXCLUDED."stemChangeType",
              "ablautPattern" = EXCLUDED."ablautPattern",
              "ablautClass" = EXCLUDED."ablautClass",
              "prepObject" = EXCLUDED."prepObject",
              "prepCase" = EXCLUDED."prepCase"
          `,
          entryId,
          verbDetail.infinitive,
          verbDetail.auxiliary,
          verbDetail.regularity,
          verbDetail.separable,
          verbDetail.separablePrefix,
          verbDetail.reflexive,
          verbDetail.stemChange,
          verbDetail.stemChangeType,
          verbDetail.ablautPattern,
          verbDetail.ablautClass,
          verbDetail.prepObject,
          verbDetail.prepCase
        );
      } else {
        await tx.$executeRawUnsafe(
          `DELETE FROM "VerbDetail" WHERE "entryId" = $1`,
          entryId
        );
      }

      const savedRows = await tx.$queryRawUnsafe<
        Array<{
          id: string;
          lemma: string;
          pos: string;
          level: string;
          frequencyRank: number | null;
          pronunciation: unknown;
          source: unknown;
          examples: unknown;
          register: string | null;
          domain: string[];
          tags: string[];
          notes: string | null;
          dateAdded: Date;
          extractionConfidence: string;
          posData: unknown;
          verbDetail: unknown;
        }>
      >(
        `
          SELECT
            e."id",
            e."lemma",
            e."pos"::text AS "pos",
            e."level",
            e."frequency_rank" AS "frequencyRank",
            e."pronunciation",
            e."source",
            e."examples",
            e."register",
            e."domain",
            e."tags",
            e."notes",
            e."date_added" AS "dateAdded",
            e."extraction_confidence" AS "extractionConfidence",
            e."pos_data" AS "posData",
            CASE
              WHEN v."entryId" IS NULL THEN NULL
              ELSE jsonb_build_object(
                'entryId', v."entryId",
                'infinitive', v."infinitive",
                'auxiliary', v."auxiliary",
                'regularity', v."regularity",
                'separable', v."separable",
                'separablePrefix', v."separablePrefix",
                'reflexive', v."reflexive",
                'stemChange', v."stemChange",
                'stemChangeType', v."stemChangeType",
                'ablautPattern', v."ablautPattern",
                'ablautClass', v."ablautClass",
                'prepObject', v."prepObject",
                'prepCase', v."prepCase"
              )
            END AS "verbDetail"
          FROM "Entry" e
          LEFT JOIN "VerbDetail" v ON v."entryId" = e."id"
          WHERE e."id" = $1
        `,
        entryId
      );

      saved.push(serializeEntry(savedRows[0]));
    }

    return saved;
  });
}

function parseEntriesPayload(value: unknown) {
  const parsed = vocabularyToolInputSchema.safeParse(value);
  if (!parsed.success) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error: "Ungueltige Wortschatzdaten.",
          issues: parsed.error.issues,
        },
        { status: 422 }
      ),
    };
  }

  const entries = parsed.data.entries.map(normalizeVocabularyEntry);
  return { ok: true as const, entries };
}

async function handleSave(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? await req.json()
    : Object.fromEntries(await req.formData());
  const rawEntries =
    typeof body.entries === "string" ? JSON.parse(body.entries) : body.entries;
  const parsed = parseEntriesPayload({ entries: rawEntries });

  if (!parsed.ok) return parsed.response;

  const consistencyIssues = findVocabularyConsistencyIssues(parsed.entries);
  if (consistencyIssues.length > 0) {
    return NextResponse.json(
      {
        error: "Bitte korrigiere die markierten Verb-Annotationen vor dem Speichern.",
        consistencyIssues,
      },
      { status: 422 }
    );
  }

  const entries = await saveEntries(parsed.entries);
  return NextResponse.json({ entries });
}

async function handleExtract(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY ist serverseitig nicht gesetzt." },
      { status: 500 }
    );
  }

  const formData = await req.formData();
  const photo = formData.get("photo");

  if (!(photo instanceof File)) {
    return NextResponse.json(
      { error: "Bitte lade ein Foto als multipart Feld 'photo' hoch." },
      { status: 400 }
    );
  }

  const mediaType = photo.type || "image/jpeg";
  const base64 = Buffer.from(await photo.arrayBuffer()).toString("base64");

  const message = await anthropic.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 4096,
    tools: [
      {
        name: "save_vocabulary",
        description:
          "Liefert exakt strukturierte Entry-Objekte fuer Treffpunkt-Schweiz-Wortschatz. pos_data ist eine wortartenspezifische discriminated union.",
        input_schema: buildVocabularyToolInputSchema() as Anthropic.Tool.InputSchema,
      },
    ],
    tool_choice: { type: "tool", name: "save_vocabulary" },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType as
                | "image/jpeg"
                | "image/png"
                | "image/gif"
                | "image/webp",
              data: base64,
            },
          },
          {
            type: "text",
            text: `Extrahiere den Wortschatz aus diesem Foto einer Seite aus dem Lehrmittel "Treffpunkt Schweiz".

Du MUSST Entry-Objekte exakt nach dem Tool-Schema liefern. Keine vereinfachten Vokabellisten, keine camelCase-Alternativen.

Core-Felder pro Entry:
- id: valides Format L{lesson:02}-{module}-{lfd:04}; der Server ersetzt die laufende Nummer spaeter autoritativ.
- lemma: Grundform/Lemma, nicht Beispielsatz.
- pos: genau eines von noun, verb, adjective, adverb, pronoun, preposition, conjunction, interjection, phrase.
- level: immer "A1".
- frequency_rank: Zahl oder null.
- pronunciation: { ipa, syllables, stress, audio }.
- source.book: immer "Treffpunkt Schweiz".
- source.lesson: grosse gruene Zahl oben links.
- source.lesson_title: Titel neben der Lektion, sonst null.
- source.module: Buchstabe A, B, ... .
- source.module_title: Titel neben dem Modulbuchstaben, sonst null.
- source.page und source.photo_id: Zahl/String oder null.
- examples: Array aus { text, translation }.
- register: neutral/formal/informal/vulgar/literary/technical oder null.
- domain: Array, sonst [].
- tags: Array mit kurzen fachlichen Tags, sonst [].
- notes: String oder null.
- date_added: ISO-Datum als String.
- extraction_confidence: high, medium oder low.
- pos_data.pos MUSS identisch mit pos sein.

pos_data muss exakt zur Wortart passen. Wenn ein Feld nicht sichtbar oder nicht sicher bestimmbar ist, setze null bzw. []:
- noun: gender, genitive_sg, plural, plural_type, declension, countability, diminutive, compound_parts, is_proper_noun.
- verb: infinitive, auxiliary, regularity, separable, separable_prefix, reflexive, principal_parts, stem_change, ablaut, valency, case_government, prepositional_object, transitivity, konjunktiv_2, imperative.
- adjective: comparative, superlative, comparison, usage, case_government, prepositional_object, antonym, is_indeclinable.
- adverb: type, comparable, comparative, superlative.
- pronoun: type, person, number, gender, formality, case, declension_paradigm.
- preposition: case_government, is_two_way, type, contractions.
- conjunction: type, word_order, correlate.
- interjection: function, regional.
- phrase: phrase_type="redemittel", redemittel_function, literal_meaning, pattern, fixedness, answer_to.

Annotiere jede Vokabel linguistisch. Verben muessen stemChange und Ablaut strikt trennen:
- pos_data.stem_change.has_change meint nur Praesens-Stammvokalwechsel in 2./3. Person Singular, z.B. geben->gibt, lesen->liest, fahren->faehrt.
- pos_data.ablaut meint die Stammformen, z.B. geben->gab->gegeben oder kommen->kam->gekommen.
- Ein Verb kann Ablaut ohne stemChange haben, z.B. kommen.
- "heissen" ist stark mit Ablaut, aber stem_change.has_change=false.
- Wenn stem_change.has_change=true, darf regularity nicht weak sein.
- Wenn separable=true, muss separable_prefix gefuellt sein.

Verb-Beispiele fuer die Trennung:
- kommen: regularity="strong", stem_change.has_change=false, stem_change.type="none", ablaut.has_ablaut=true, ablaut.pattern="o-a-o".
- geben: regularity="strong", stem_change.has_change=true, stem_change.type="e_to_i", ablaut.has_ablaut=true, ablaut.pattern="e-a-e".
- heissen: regularity="strong", stem_change.has_change=false, stem_change.type="none", ablaut.has_ablaut=true, ablaut.pattern="ei-ie-ei".

Nutze ausschliesslich das Tool save_vocabulary. Gib keine Freitextantwort.`,
          },
        ],
      },
    ],
  });

  const toolUse = message.content.find(
    (block) => block.type === "tool_use" && block.name === "save_vocabulary"
  );

  if (!toolUse || toolUse.type !== "tool_use") {
    return NextResponse.json(
      { error: "Claude hat kein save_vocabulary Tool-Ergebnis geliefert." },
      { status: 502 }
    );
  }

  const parsed = parseEntriesPayload(toolUse.input);
  if (!parsed.ok) return parsed.response;

  const entries = await assignEntryIds(parsed.entries);
  return NextResponse.json({
    entries,
    consistencyIssues: findVocabularyConsistencyIssues(entries),
  });
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  try {
    const mode = req.nextUrl.searchParams.get("mode");
    if (mode === "save") return handleSave(req);
    return handleExtract(req);
  } catch (error) {
    console.error("POST /api/extract error:", error);
    if (isMissingVocabularyTableError(error)) {
      return NextResponse.json(
        {
          ...vocabularyMigrationErrorResponse(),
          details: prismaDebugDetails(error),
        },
        { status: 500 }
      );
    }
    if (isVocabularySchemaMismatchError(error)) {
      return NextResponse.json(
        {
          ...vocabularySchemaMismatchErrorResponse(),
          details: prismaDebugDetails(error),
        },
        { status: 500 }
      );
    }

    const message = error instanceof Error ? error.message : "Unbekannter Fehler";
    return NextResponse.json(
      { error: message, details: prismaDebugDetails(error) },
      { status: 500 }
    );
  }
}
