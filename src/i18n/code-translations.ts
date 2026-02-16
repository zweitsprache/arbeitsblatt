/**
 * Block-label fallback: when new block types are added in code (BLOCK_LIBRARY)
 * but haven't been uploaded to i18nexus yet, we derive labels from the
 * BLOCK_LIBRARY definitions so the UI doesn't show raw translation keys.
 *
 * All "real" translations now live in i18nexus and are pulled into
 * src/messages/{locale}.json. JSON values always take precedence over
 * these fallbacks; this file just prevents blank labels for brand-new blocks.
 *
 * HOW TO ADD NEW TRANSLATIONS:
 * 1. Add them in the i18nexus dashboard (or edit the JSON and run
 *    `npm run i18n:import:all` then `npm run i18n:pull`)
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

  // Merge block translations (fallback for new block types not yet in i18nexus)
  const existingBlocks = (result.blocks ?? {}) as TranslationMap;
  const codeBlocks = getBlockTranslations(locale);
  result.blocks = { ...codeBlocks, ...existingBlocks };

  return result;
}
