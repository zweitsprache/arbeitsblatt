/**
 * Block-label fallback: when new block types are added in code (BLOCK_LIBRARY)
 * but don't yet have entries in the JSON translation files, we derive labels
 * from the BLOCK_LIBRARY definitions so the UI doesn't show raw translation keys.
 *
 * Translations live in src/messages/{locale}.json (edited directly).
 * JSON values always take precedence over these fallbacks; this file just
 * prevents blank labels for brand-new blocks.
 *
 * HOW TO ADD NEW TRANSLATIONS:
 * 1. Edit src/messages/de.json and src/messages/en.json directly
 * 2. Use `useTranslations("yourNamespace")` in your component as usual
 * 3. Run `npm run i18n:validate` to verify both locales are in sync
 */

import { BLOCK_LIBRARY } from "@/types/worksheet";

type TranslationMap = Record<string, string>;

// ─── Block sidebar labels (derived from BLOCK_LIBRARY) ──────

function getBlockTranslations(locale: string): TranslationMap {
  const merged: TranslationMap = {};
  for (const def of BLOCK_LIBRARY) {
    const localized = def.translations?.[locale];
    merged[def.labelKey] = localized?.label ?? def.label;
    merged[def.descriptionKey] = localized?.description ?? def.description;
  }
  return merged;
}

/**
 * Merge BLOCK_LIBRARY fallback labels into the messages loaded from JSON.
 * JSON values (from i18nexus) always take precedence.
 */
export function mergeCodeTranslations(
  messages: Record<string, unknown>,
  locale: string
): Record<string, unknown> {
  const result = { ...messages };

  // Merge block translations (fallback for new block types not yet in JSON files)
  const existingBlocks = (result.blocks ?? {}) as TranslationMap;
  const codeBlocks = getBlockTranslations(locale);
  result.blocks = { ...codeBlocks, ...existingBlocks };

  return result;
}
