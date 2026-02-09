/**
 * Translations that are defined in code rather than in i18nexus.
 *
 * WHY: i18nexus is the source of truth for translations and overwrites
 * the local JSON files via `i18nexus listen` / `i18nexus pull`.
 * Any keys added locally to the JSON files get wiped on the next sync
 * if they don't exist in the i18nexus project.
 *
 * For translations that are tightly coupled to code (block definitions,
 * AI modal UI strings), we define them here so they can never be lost.
 * The JSON files can still override these if the keys exist in i18nexus.
 *
 * HOW TO ADD NEW TRANSLATIONS:
 * 1. Add the namespace + keys here with en + de values
 * 2. Use `useTranslations("yourNamespace")` in your component as usual
 * 3. That's it — no need to touch JSON files or i18nexus
 */

import { BLOCK_LIBRARY } from "@/types/worksheet";

type TranslationMap = Record<string, string>;
type LocaleTranslations = Record<string, TranslationMap>;

// ─── Block sidebar labels (derived from BLOCK_LIBRARY) ──────

export function getBlockTranslations(locale: string): TranslationMap {
  const merged: TranslationMap = {};
  for (const def of BLOCK_LIBRARY) {
    const localized = def.translations?.[locale];
    merged[def.labelKey] = localized?.label ?? def.label;
    merged[def.descriptionKey] = localized?.description ?? def.description;
  }
  return merged;
}

// ─── AI Verb Table Modal ────────────────────────────────────

const aiVerbTable: LocaleTranslations = {
  en: {
    title: "Generate Verb Conjugation",
    stepVerb: "Verb",
    stepTense: "Tense",
    stepGenerate: "Generate",
    stepVerbDesc: "Enter the verb infinitive",
    stepTenseDesc: "Choose the tense",
    stepGeneratingDesc: "AI is generating conjugations…",
    stepReviewDesc: "Review and apply",
    verbLabel: "Verb",
    verbPlaceholder: "e.g. machen, spielen, lesen…",
    verbHelp: "Enter the infinitive form of the verb",
    tensePraesens: "Präsens",
    tensePraesensDesc: "Present tense",
    tensePraeteritum: "Präteritum",
    tensePraeteritumDesc: "Simple past",
    tensePerfekt: "Perfekt",
    tensePerfektDesc: "Present perfect (two-part)",
    tensePlusquamperfekt: "Plusquamperfekt",
    tensePlusquamperfektDesc: "Past perfect (two-part)",
    tenseFutur1: "Futur I",
    tenseFutur1Desc: "Future tense (two-part)",
    twoPartLabel: "two-part",
    generating: "Generating conjugation for \"{verb}\"…",
    tenseLabel: "Tense",
    colPerson: "Person",
    colPronoun: "Pronoun",
    colConjugation: "Conjugation",
    colConjugation2: "Prefix / Particle",
    singular: "Singular",
    plural: "Plural",
    applyToBlock: "Apply to Block",
    generationFailed: "Generation failed. Please try again.",
  },
  de: {
    title: "Verbkonjugation generieren",
    stepVerb: "Verb",
    stepTense: "Zeitform",
    stepGenerate: "Generieren",
    stepVerbDesc: "Geben Sie den Infinitiv ein",
    stepTenseDesc: "Wählen Sie die Zeitform",
    stepGeneratingDesc: "KI generiert Konjugationen…",
    stepReviewDesc: "Überprüfen und anwenden",
    verbLabel: "Verb",
    verbPlaceholder: "z.B. machen, spielen, lesen…",
    verbHelp: "Geben Sie die Infinitivform des Verbs ein",
    tensePraesens: "Präsens",
    tensePraesensDesc: "Gegenwartsform",
    tensePraeteritum: "Präteritum",
    tensePraeteritumDesc: "Einfache Vergangenheit",
    tensePerfekt: "Perfekt",
    tensePerfektDesc: "Vollendete Gegenwart (zweiteilig)",
    tensePlusquamperfekt: "Plusquamperfekt",
    tensePlusquamperfektDesc: "Vollendete Vergangenheit (zweiteilig)",
    tenseFutur1: "Futur I",
    tenseFutur1Desc: "Zukunftsform (zweiteilig)",
    twoPartLabel: "zweiteilig",
    generating: "Konjugation für \"{verb}\" wird generiert…",
    tenseLabel: "Zeitform",
    colPerson: "Person",
    colPronoun: "Pronomen",
    colConjugation: "Konjugation",
    colConjugation2: "Präfix / Partikel",
    singular: "Singular",
    plural: "Plural",
    applyToBlock: "In Block übernehmen",
    generationFailed: "Generierung fehlgeschlagen. Bitte erneut versuchen.",
  },
};

// ─── Registry of all code-defined namespaces ────────────────

const CODE_NAMESPACES: Record<string, LocaleTranslations> = {
  aiVerbTable,
};

/**
 * Merge code-defined translations into the messages loaded from JSON.
 * JSON values take precedence (so i18nexus overrides still work),
 * but missing keys are filled from code.
 */
export function mergeCodeTranslations(
  messages: Record<string, unknown>,
  locale: string
): Record<string, unknown> {
  const result = { ...messages };

  // Merge block translations
  const existingBlocks = (result.blocks ?? {}) as TranslationMap;
  const codeBlocks = getBlockTranslations(locale);
  result.blocks = { ...codeBlocks, ...existingBlocks };

  // Merge all other code-defined namespaces
  for (const [ns, translations] of Object.entries(CODE_NAMESPACES)) {
    const existing = (result[ns] ?? {}) as TranslationMap;
    const codeValues = translations[locale] ?? translations.en ?? {};
    result[ns] = { ...codeValues, ...existing };
  }

  return result;
}
