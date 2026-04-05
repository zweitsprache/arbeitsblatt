import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";
import { extractWorksheetStrings } from "@/lib/worksheet-translation";
import { getAiInstructions } from "@/lib/course-translation";
import { WorksheetBlock, WorksheetSettings } from "@/types/worksheet";

export const maxDuration = 120;

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/** Human-readable names for known target language codes. */
const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  uk: "Ukrainian",
  fr: "French",
  es: "Spanish",
  it: "Italian",
  pt: "Portuguese",
  tr: "Turkish",
  ar: "Arabic",
  pl: "Polish",
  ru: "Russian",
};

const MAX_CHUNK_JSON_BYTES = 12000;
const MAX_CHUNK_KEYS = 80;
const MAX_SPECIAL_INSTRUCTIONS = 50;

type TranslationMap = Record<string, string>;
type TranslationEntries = Array<[string, string]>;

function buildSpecialInstructions(entries: TranslationEntries): string[] {
  const specialInstructions: string[] = [];

  for (const [key, value] of entries) {
    const instruction = getAiInstructions(key, value);
    if (instruction) {
      specialInstructions.push(`- Keys matching "${key}": ${instruction}`);
    }
  }

  return [...new Set(specialInstructions)].slice(0, MAX_SPECIAL_INSTRUCTIONS);
}

function buildSystemPrompt(
  langName: string,
  langCode: string,
  specialInstructions: string[]
) {
  return `You are a professional translator for educational language-learning worksheet content. The source language is German (de).

TASK: Translate ALL provided strings into ${langName} (${langCode}).

CRITICAL RULES:
1. Preserve ALL JSON keys exactly as-is — only translate the values.
2. Preserve HTML tags exactly (<p>, <br>, <strong>, <em>, <ul>, <li>, etc.).
3. Preserve {{blank:...}} syntax. Translate the word inside the blank too.
4. Preserve {{option1|option2|...}} inline choice syntax. Keep {{}} and | characters. Translate each option. The first option is always the correct answer.
5. Preserve {{de:...}} markers — keep the German text inside as-is, translate surrounding text.
6. Preserve ' | ' separators in fix-sentence exercises — translate each part separately.
7. Keep technical identifiers, IDs, and special markers unchanged.
8. Translations should be natural and appropriate for language learners.
9. This is educational content for German language learners — context matters for quality.
10. For glossary definitions: translate naturally. The glossary terms (left column) remain in German — only definitions (right column) are translated.

${specialInstructions.length > 0 ? `SPECIAL INSTRUCTIONS PER KEY:\n${specialInstructions.join("\n")}` : ""}

RESPONSE FORMAT:
Return a flat JSON object with the same keys, but values translated into ${langName}.
Example: { "block.abc.content": "My heading", "block.xyz.pairs.p1.definition": "My definition" }

Return ONLY valid JSON — no markdown fences, no commentary.`;
}

function chunkTranslationEntries(entries: TranslationEntries): TranslationEntries[] {
  const chunks: TranslationEntries[] = [];
  let currentChunk: TranslationEntries = [];
  let currentChunkBytes = 2;

  for (const entry of entries) {
    const entryBytes = Buffer.byteLength(
      JSON.stringify({ [entry[0]]: entry[1] }),
      "utf8"
    );

    if (
      currentChunk.length > 0 &&
      (currentChunk.length >= MAX_CHUNK_KEYS ||
        currentChunkBytes + entryBytes > MAX_CHUNK_JSON_BYTES)
    ) {
      chunks.push(currentChunk);
      currentChunk = [];
      currentChunkBytes = 2;
    }

    currentChunk.push(entry);
    currentChunkBytes += entryBytes;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}

function parseTranslationResponse(
  rawText: string,
  stopReason: string | null | undefined,
  langCode: string,
  chunkIndex: number
): TranslationMap | null {
  try {
    let raw = rawText.trim();
    raw = raw.replace(/^```[a-z]*\s*\n?/i, "").replace(/\n?```\s*$/, "");

    const firstBrace = raw.indexOf("{");
    const lastBrace = raw.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      raw = raw.slice(firstBrace, lastBrace + 1);
    }

    if (stopReason === "max_tokens" && !raw.endsWith("}")) {
      const lastCompleteComma = raw.lastIndexOf(",\n");
      const lastCompleteQuote = raw.lastIndexOf('"\n');
      const cutoff = Math.max(lastCompleteComma, lastCompleteQuote);
      if (cutoff > 0) {
        raw = raw.slice(0, cutoff) + "\n}";
        console.warn(
          `[translate] ${langCode} chunk ${chunkIndex + 1}: truncated response salvaged at offset ${cutoff}`
        );
      }
    }

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      console.warn(
        `[translate] ${langCode} chunk ${chunkIndex + 1}: Parsed response was not an object`
      );
      return null;
    }

    const translationMap: TranslationMap = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string") {
        translationMap[key] = value;
      }
    }

    return translationMap;
  } catch (parseErr) {
    console.error(
      `[translate] ${langCode} chunk ${chunkIndex + 1}: JSON parse failed:`,
      parseErr instanceof Error ? parseErr.message : parseErr
    );
    console.error(
      `[translate] ${langCode} chunk ${chunkIndex + 1}: Raw response (first 500):`,
      rawText.slice(0, 500)
    );
    return null;
  }
}

/**
 * Translate worksheet content to target languages using Claude.
 *
 * Body params (all optional):
 *  - languages: Record<string, string> – override target languages map { "en": "English" }
 *    Falls back to worksheet settings.translationLanguages if not provided.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  const { id } = await params;
  const worksheet = await prisma.worksheet.findUnique({
    where: { id, userId },
  });
  if (!worksheet) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const force = body?.force === true;

  const blocks = (worksheet.blocks as unknown as WorksheetBlock[]) ?? [];
  const settings = (worksheet.settings as unknown as WorksheetSettings) ?? {};

  // Determine target languages:
  // 1. Explicit override from request body
  // 2. Worksheet settings.translationLanguages
  let targetLangs: Record<string, string>;
  if (body?.languages && typeof body.languages === "object") {
    targetLangs = body.languages;
  } else {
    const langCodes: string[] = settings.translationLanguages ?? [];
    if (langCodes.length === 0) {
      return NextResponse.json(
        { error: "No target languages configured. Set translationLanguages in worksheet settings." },
        { status: 400 }
      );
    }
    targetLangs = Object.fromEntries(
      langCodes.map((code) => [code, LANGUAGE_NAMES[code] ?? code])
    );
  }

  // Extract all translatable strings from blocks
  const strings = extractWorksheetStrings(blocks);

  if (Object.keys(strings).length === 0) {
    return NextResponse.json({
      success: true,
      stringCount: 0,
      languages: [],
      message: "No translatable strings found",
    });
  }

  // ── Delta detection ─────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existingTranslations = ((worksheet as any).translations ?? {}) as Record<string, Record<string, string>>;
  const previousSource = existingTranslations._source ?? {};

  const allEntries = Object.entries(strings);
  const pendingEntriesByLang: Record<string, TranslationEntries> = {};
  const pendingKeys = new Set<string>();

  for (const langCode of Object.keys(targetLangs)) {
    const existingLangTranslations = existingTranslations[langCode] ?? {};
    const pendingEntries = allEntries.filter(
      ([key, value]) =>
        force ||
        previousSource[key] !== value ||
        typeof existingLangTranslations[key] !== "string"
    );

    pendingEntriesByLang[langCode] = pendingEntries;
    for (const [key] of pendingEntries) {
      pendingKeys.add(key);
    }
  }

  const removedKeys = Object.keys(previousSource).filter((k) => !(k in strings));

  if (!force && pendingKeys.size === 0 && removedKeys.length === 0) {
    return NextResponse.json({
      success: true,
      stringCount: 0,
      languages: Object.keys(existingTranslations).filter((k) => !k.startsWith("_")),
      message: "All translations are up to date",
    });
  }

  // ── Removal-only: no AI call needed, just clean up ────────
  if (!force && pendingKeys.size === 0 && removedKeys.length > 0) {
    const merged: Record<string, Record<string, string>> = {};
    for (const [lang, map] of Object.entries(existingTranslations)) {
      if (!lang.startsWith("_")) merged[lang] = { ...map };
    }
    for (const removedKey of removedKeys) {
      for (const lang of Object.keys(merged)) delete merged[lang][removedKey];
    }
    const updatedSource = { ...previousSource };
    for (const removedKey of removedKeys) delete updatedSource[removedKey];
    merged._source = updatedSource;
    await prisma.worksheet.update({
      where: { id },
      data: { translations: merged, translatedAt: new Date() } as Parameters<typeof prisma.worksheet.update>[0]["data"],
    });
    return NextResponse.json({
      success: true,
      stringCount: 0,
      languages: Object.keys(merged).filter((k) => !k.startsWith("_")),
      message: `Removed ${removedKeys.length} obsolete translation key(s)`,
    });
  }

  console.log(
    `[translate] Pending unique keys=${pendingKeys.size}, removed=${removedKeys.length}, force=${force}, per-language=${JSON.stringify(
      Object.fromEntries(
        Object.entries(pendingEntriesByLang).map(([langCode, entries]) => [
          langCode,
          entries.length,
        ])
      )
    )}`
  );

  try {
    const translatedLanguages: string[] = [];
    const newTranslationsByLang: Record<string, Record<string, string>> = {};

    for (const [langCode, langName] of Object.entries(targetLangs)) {
      const pendingEntries = pendingEntriesByLang[langCode] ?? [];
      if (pendingEntries.length === 0) {
        continue;
      }

      const chunks = chunkTranslationEntries(pendingEntries);
      const mergedChunkTranslations: TranslationMap = {};

      console.log(
        `[translate] ${langCode}: translating ${pendingEntries.length} keys in ${chunks.length} chunk(s)`
      );

      for (const [chunkIndex, chunkEntries] of chunks.entries()) {
        const chunkMap = Object.fromEntries(chunkEntries);
        const chunkJson = JSON.stringify(chunkMap, null, 2);
        const systemPrompt = buildSystemPrompt(
          langName,
          langCode,
          buildSpecialInstructions(chunkEntries)
        );

        const message = await client.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 16000,
          messages: [
            {
              role: "user",
              content: `Translate the following ${chunkEntries.length} strings into ${langName}:\n\n${chunkJson}`,
            },
          ],
          system: systemPrompt,
        });

        console.log(
          `[translate] ${langCode} chunk ${chunkIndex + 1}/${chunks.length}: stop_reason=${message.stop_reason}, content_blocks=${message.content.length}`
        );

        const textBlock = message.content.find((content) => content.type === "text");
        if (!textBlock || textBlock.type !== "text") {
          console.warn(
            `[translate] ${langCode} chunk ${chunkIndex + 1}/${chunks.length}: No text block in AI response`
          );
          continue;
        }

        console.log(
          `[translate] ${langCode} chunk ${chunkIndex + 1}/${chunks.length}: response length=${textBlock.text.length}, first 200 chars: ${textBlock.text.slice(0, 200)}`
        );

        const parsedChunk = parseTranslationResponse(
          textBlock.text,
          message.stop_reason,
          langCode,
          chunkIndex
        );

        if (!parsedChunk || Object.keys(parsedChunk).length === 0) {
          console.warn(
            `[translate] ${langCode} chunk ${chunkIndex + 1}/${chunks.length}: Parsed OK but empty object`
          );
          continue;
        }

        Object.assign(mergedChunkTranslations, parsedChunk);
        console.log(
          `[translate] ${langCode} chunk ${chunkIndex + 1}/${chunks.length}: parsed ${Object.keys(parsedChunk).length} keys`
        );
      }

      if (Object.keys(mergedChunkTranslations).length > 0) {
        newTranslationsByLang[langCode] = mergedChunkTranslations;
        translatedLanguages.push(langCode);
        console.log(
          `[translate] ${langCode}: merged ${Object.keys(mergedChunkTranslations).length} translated keys across ${chunks.length} chunk(s)`
        );
      } else {
        console.warn(`[translate] ${langCode}: No valid chunk translations`);
      }
    }

    if (translatedLanguages.length === 0) {
      return NextResponse.json(
        { error: "AI returned no valid translations" },
        { status: 500 }
      );
    }

    // ── Merge with existing translations ────────────────────────
    const merged: Record<string, Record<string, string>> = {};

    for (const [lang, map] of Object.entries(existingTranslations)) {
      if (!lang.startsWith("_")) {
        merged[lang] = { ...map };
      }
    }

    for (const [lang, newMap] of Object.entries(newTranslationsByLang)) {
      merged[lang] = { ...(merged[lang] ?? {}), ...newMap };
    }

    // Remove translations for keys that were deleted from source
    for (const removedKey of removedKeys) {
      for (const lang of Object.keys(merged)) {
        delete merged[lang][removedKey];
      }
    }

    // Update _source snapshot
    const updatedSource = { ...previousSource };
    for (const [key, value] of Object.entries(strings)) {
      updatedSource[key] = value;
    }
    for (const removedKey of removedKeys) {
      delete updatedSource[removedKey];
    }
    merged._source = updatedSource;

    // Save to database
    await prisma.worksheet.update({
      where: { id },
      data: {
        translations: merged,
        translatedAt: new Date(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    });

    return NextResponse.json({
      success: true,
      stringCount: pendingKeys.size,
      languages: translatedLanguages,
      translatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Worksheet translation error:", error instanceof Error ? error.message : error);
    const msg = error instanceof Error ? error.message : "Translation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
