import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";
import {
  extractTranslatableStrings,
  extractTranslatableStringsForScope,
  getAiInstructions,
} from "@/lib/course-translation";
import {
  CourseModule,
  CourseCoverSettings,
  CourseSettings,
} from "@/types/course";

export const maxDuration = 120;

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/** Target languages for course translation (ISO codes). */
const TARGET_LANGUAGES: Record<string, string> = {
  en: "English",
  uk: "Ukrainian",
};

/**
 * Translate course content (full or scoped) to target languages using Claude.
 *
 * Body params (all optional):
 *  - languages: Record<string, string>  – override target languages
 *  - scope: "cover" | "module" | "topic" | "lesson" – translate only one unit
 *  - scopeId: string – required when scope is module/topic/lesson
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  const { id } = await params;
  const course = await prisma.course.findUnique({
    where: { id, userId },
  });
  if (!course) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);

  // Allow overriding target languages from request body
  let targetLangs = TARGET_LANGUAGES;
  if (body?.languages && typeof body.languages === "object") {
    targetLangs = body.languages;
  }

  // Optional scoped translation
  const scope: string | undefined = body?.scope;
  const scopeId: string | undefined = body?.scopeId;

  const doc = {
    id: course.id,
    title: course.title,
    slug: course.slug,
    structure: course.structure as unknown as CourseModule[],
    coverSettings: course.coverSettings as unknown as CourseCoverSettings,
    settings: course.settings as unknown as CourseSettings,
    published: course.published,
    createdAt: course.createdAt.toISOString(),
    updatedAt: course.updatedAt.toISOString(),
    folderId: course.folderId,
    userId: course.userId,
  };

  // Extract strings — full course or scoped to a single unit
  const strings = scope
    ? extractTranslatableStringsForScope(doc, scope as "cover" | "module" | "topic" | "lesson", scopeId)
    : extractTranslatableStrings(doc);

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
  const existingTranslations = ((course as any).translations ?? {}) as Record<string, Record<string, string>>;
  const previousSource = existingTranslations._source ?? {};

  // Find new or changed keys (delta)
  const delta: Record<string, string> = {};
  for (const [key, value] of Object.entries(strings)) {
    if (previousSource[key] !== value) {
      delta[key] = value;
    }
  }

  // Find removed keys (present in _source but absent from current strings)
  // When translating a specific scope, only consider keys that could belong to
  // that scope — don't treat keys from other scopes as removed.
  let removedKeys: string[];
  if (scope) {
    // Build the set of prefixes this scope covers (e.g. "lesson.abc.", "block.xyz.")
    const scopeKeyPrefixes = new Set(
      Object.keys(strings).map((k) => {
        const parts = k.split(".");
        // "block.{id}" or "lesson.{id}" or "module.{id}" etc.
        return parts.slice(0, 2).join(".") + ".";
      })
    );
    removedKeys = Object.keys(previousSource).filter(
      (k) => !(k in strings) && [...scopeKeyPrefixes].some((p) => k.startsWith(p))
    );
  } else {
    removedKeys = Object.keys(previousSource).filter((k) => !(k in strings));
  }

  if (Object.keys(delta).length === 0 && removedKeys.length === 0) {
    return NextResponse.json({
      success: true,
      stringCount: 0,
      languages: Object.keys(existingTranslations).filter((k) => !k.startsWith("_")),
      message: "All translations are up to date",
    });
  }

  const deltaEntries = Object.entries(delta);

  // Build AI instructions per key for the system prompt
  const specialInstructions: string[] = [];
  for (const [key, value] of deltaEntries) {
    const instruction = getAiInstructions(key, value);
    if (instruction) {
      specialInstructions.push(`- Keys matching "${key}": ${instruction}`);
    }
  }
  const uniqueInstructions = [...new Set(specialInstructions)];

  const stringsJson = JSON.stringify(delta, null, 2);

  try {
    const translatedLanguages: string[] = [];

    // Translate delta strings one language at a time
    const newTranslationsByLang: Record<string, Record<string, string>> = {};

    for (const [langCode, langName] of Object.entries(targetLangs)) {
      const systemPrompt = `You are a professional translator for educational language-learning course content. The source language is German (de).

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
9. This is educational content for German language courses — context matters for quality.

${uniqueInstructions.length > 0 ? `SPECIAL INSTRUCTIONS PER KEY:\n${uniqueInstructions.slice(0, 50).join("\n")}` : ""}

RESPONSE FORMAT:
Return a flat JSON object with the same keys, but values translated into ${langName}.
Example: { "cover.title": "My Course", "cover.subtitle": "Learn German", ... }

Return ONLY valid JSON — no markdown fences, no commentary.`;

      const message = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 16000,
        messages: [
          {
            role: "user",
            content: `Translate the following ${deltaEntries.length} strings into ${langName}:\n\n${stringsJson}`,
          },
        ],
        system: systemPrompt,
      });

      const textBlock = message.content.find((c) => c.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        console.warn(`No AI response for language ${langCode}`);
        continue;
      }

      try {
        let raw = textBlock.text.trim();
        if (raw.startsWith("```")) {
          raw = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
        }
        const langTranslations = JSON.parse(raw);
        if (typeof langTranslations === "object" && Object.keys(langTranslations).length > 0) {
          newTranslationsByLang[langCode] = langTranslations;
          translatedLanguages.push(langCode);
        }
      } catch {
        console.error(`Failed to parse ${langCode} translation response:`, textBlock.text.slice(0, 500));
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

    // Copy existing translations (excluding _source)
    for (const [lang, map] of Object.entries(existingTranslations)) {
      if (!lang.startsWith("_")) {
        merged[lang] = { ...map };
      }
    }

    // Merge new translations into existing per-language maps
    for (const [lang, newMap] of Object.entries(newTranslationsByLang)) {
      merged[lang] = { ...(merged[lang] ?? {}), ...newMap };
    }

    // Remove translations for keys that were deleted from the source
    for (const removedKey of removedKeys) {
      for (const lang of Object.keys(merged)) {
        delete merged[lang][removedKey];
      }
    }

    // Update _source snapshot: merge current strings into existing snapshot
    // For scoped translations, only update the scoped keys
    const updatedSource = { ...previousSource };
    for (const [key, value] of Object.entries(strings)) {
      updatedSource[key] = value;
    }
    for (const removedKey of removedKeys) {
      delete updatedSource[removedKey];
    }
    merged._source = updatedSource;

    // Save to database
    await prisma.course.update({
      where: { id },
      data: {
        translations: merged,
        translatedAt: new Date(),
      } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    });

    return NextResponse.json({
      success: true,
      stringCount: deltaEntries.length,
      languages: translatedLanguages,
      translatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Translation error:", error instanceof Error ? error.message : error);
    const msg = error instanceof Error ? error.message : "Translation failed";
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}
