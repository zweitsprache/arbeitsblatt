/**
 * Deterministic regular German verb conjugation engine.
 *
 * Generates the forms a **regular (weak)** verb *would* have,
 * so we can diff them against the AI-generated *actual* forms
 * and derive character-level irregularity highlights.
 */

import type {
  PersonKey,
  VerbConjugationTable,
  TenseHighlights,
} from "@/types/grammar-table";

// ─── Constants ───────────────────────────────────────────────

const ALL_PERSONS: PersonKey[] = [
  "ich", "du", "Sie_sg", "er_sie_es",
  "wir", "ihr", "Sie_pl", "sie_pl",
];

/** Inseparable prefixes — Partizip II gets NO "ge-" */
const INSEPARABLE_PREFIXES = [
  "be", "emp", "ent", "er", "ge", "miss", "ver", "zer",
];

/** Stem-final clusters that trigger e-epenthesis before -st / -t */
const EPENTHESIS_ENDINGS = ["tm", "dm", "chn", "fn", "gn"];
const EPENTHESIS_SINGLE = ["t", "d"];

function needsEpenthesis(stem: string): boolean {
  const lower = stem.toLowerCase();
  for (const e of EPENTHESIS_ENDINGS) {
    if (lower.endsWith(e)) return true;
  }
  for (const e of EPENTHESIS_SINGLE) {
    if (lower.endsWith(e)) return true;
  }
  return false;
}

// ─── Stem extraction ─────────────────────────────────────────

/**
 * Extract the base verb (without separable prefix or "sich") and
 * the grammatical stem used for conjugation.
 *
 * Examples:
 *   machen   → stem "mach"
 *   arbeiten → stem "arbeit"
 *   handeln  → stem "handel"  (strip -n, not -en)
 *   wandern  → stem "wander"
 *   tun      → stem "tu"      (strip -n)
 */
export function extractStem(
  infinitive: string,
  separablePrefix?: string,
): string {
  // Strip separable prefix to get the base verb
  let base = infinitive;
  if (separablePrefix && base.startsWith(separablePrefix)) {
    base = base.slice(separablePrefix.length);
  }

  // -eln / -ern verbs: strip only -n  →  stem keeps the -el / -er
  if (base.endsWith("eln") || base.endsWith("ern")) {
    return base.slice(0, -1); // "handeln" → "handel", "wandern" → "wander"
  }
  // Standard: strip -en
  if (base.endsWith("en")) {
    return base.slice(0, -2);
  }
  // Fallback: strip -n  (tun → tu, sein → sei)
  if (base.endsWith("n")) {
    return base.slice(0, -1);
  }
  return base;
}

// ─── Detect inseparable prefix on the base verb ──────────────

function hasInseparablePrefix(baseInfinitive: string): boolean {
  for (const p of INSEPARABLE_PREFIXES) {
    if (baseInfinitive.startsWith(p)) return true;
  }
  return false;
}

/** Get the base infinitive (without separable prefix) */
function getBaseInfinitive(
  infinitive: string,
  separablePrefix?: string,
): string {
  if (separablePrefix && infinitive.startsWith(separablePrefix)) {
    return infinitive.slice(separablePrefix.length);
  }
  return infinitive;
}

// ─── Präsens ─────────────────────────────────────────────────

const PRAESENS_ENDINGS: Record<PersonKey, string> = {
  ich: "e",
  du: "st",
  Sie_sg: "en",
  er_sie_es: "t",
  wir: "en",
  ihr: "t",
  Sie_pl: "en",
  sie_pl: "en",
};

export function regularPraesens(stem: string, person: PersonKey): string {
  const ending = PRAESENS_ENDINGS[person];
  const epenthesis = needsEpenthesis(stem);

  // e-epenthesis: insert "e" before -st and -t (only for du, er/sie/es, ihr)
  if (epenthesis && (ending === "st" || ending === "t") &&
      (person === "du" || person === "er_sie_es" || person === "ihr")) {
    return stem + "e" + ending;
  }

  return stem + ending;
}

// ─── Partizip II ─────────────────────────────────────────────

export function regularPartizipII(
  stem: string,
  separablePrefix?: string,
  baseInfinitive?: string,
): string {
  const epenthesis = needsEpenthesis(stem);
  const suffix = epenthesis ? "et" : "t";

  // Inseparable prefix → no "ge-"
  if (baseInfinitive && hasInseparablePrefix(baseInfinitive)) {
    return (separablePrefix || "") + stem + suffix;
  }

  // Separable prefix → prefix + ge + stem + t/et
  if (separablePrefix) {
    return separablePrefix + "ge" + stem + suffix;
  }

  // Standard → ge + stem + t/et
  return "ge" + stem + suffix;
}

// ─── Präteritum ──────────────────────────────────────────────

const PRAETERITUM_ENDINGS: Record<PersonKey, string> = {
  ich: "",
  du: "st",
  Sie_sg: "n",
  er_sie_es: "",
  wir: "n",
  ihr: "t",
  Sie_pl: "n",
  sie_pl: "n",
};

export function regularPraeteritum(stem: string, person: PersonKey): string {
  const ending = PRAETERITUM_ENDINGS[person];
  const epenthesis = needsEpenthesis(stem);
  const teSuffix = epenthesis ? "ete" : "te";

  return stem + teSuffix + ending;
}

// ─── Generate all regular forms for a verb ───────────────────

export interface RegularForms {
  praesens: string;      // main field
  partizipII: string;    // partizip field (same for all persons)
  praeteritum: string;   // main field
}

export function generateRegularForms(
  infinitive: string,
  isSeparable: boolean,
  separablePrefix?: string,
): Record<PersonKey, RegularForms> {
  const prefix = isSeparable ? separablePrefix : undefined;
  const baseInf = getBaseInfinitive(infinitive, prefix);
  const stem = extractStem(infinitive, prefix);
  const partizip = regularPartizipII(stem, prefix, baseInf);

  const result: Partial<Record<PersonKey, RegularForms>> = {};
  for (const person of ALL_PERSONS) {
    result[person] = {
      praesens: regularPraesens(stem, person),
      partizipII: partizip,
      praeteritum: regularPraeteritum(stem, person),
    };
  }
  return result as Record<PersonKey, RegularForms>;
}

// ─── Character-level diff ────────────────────────────────────

/**
 * Compare regular (expected) vs actual (AI-generated) form.
 * Returns [start, end) ranges marking the irregular portion
 * of the *actual* string, or undefined if forms are identical.
 *
 * Strategy: find longest common prefix and suffix, highlight
 * the middle section that differs. For a completely different
 * string, returns [[0, actual.length]].
 */
export function computeHighlightRanges(
  regular: string,
  actual: string,
): [number, number][] | undefined {
  if (regular === actual) return undefined;

  // Find common prefix length
  let prefixLen = 0;
  const minLen = Math.min(regular.length, actual.length);
  while (prefixLen < minLen && regular[prefixLen] === actual[prefixLen]) {
    prefixLen++;
  }

  // Find common suffix length (not overlapping with prefix)
  let suffixLen = 0;
  while (
    suffixLen < minLen - prefixLen &&
    regular[regular.length - 1 - suffixLen] === actual[actual.length - 1 - suffixLen]
  ) {
    suffixLen++;
  }

  const highlightStart = prefixLen;
  let highlightEnd = actual.length - suffixLen;

  // Edge case: pure deletion — suffix matching consumed all differing chars
  // in the actual string. Back off suffix to expose at least 1 char.
  while (highlightStart >= highlightEnd && suffixLen > 0) {
    suffixLen--;
    highlightEnd = actual.length - suffixLen;
  }

  if (highlightStart >= highlightEnd) {
    // Strings differ but no chars can be highlighted — highlight all
    return [[0, actual.length]];
  }

  return [[highlightStart, highlightEnd]];
}

// ─── Attach highlights to a VerbConjugationTable ─────────────

/**
 * Given a VerbConjugationTable with correct (AI-generated) forms
 * but NO highlights, compute deterministic highlights by diffing
 * each form against its regular counterpart.
 *
 * Mutates and returns the same object for convenience.
 */
export function attachHighlights(
  table: VerbConjugationTable,
): VerbConjugationTable {
  const { isSeparable, separablePrefix } = table;

  // Derive the bare infinitive for stem extraction
  // Handle "sich ...", "sich etwas ...", "sich Mühe geben" etc.
  // The actual verb infinitive is the last word (or last two words for separable verbs)
  let infinitive = table.input.verb;
  
  // Strip everything before the core verb:
  // "sich etwas abgewöhnen" → "abgewöhnen"
  // "sich Mühe geben" → "geben"  
  // "sich freuen" → "freuen"
  // "machen" → "machen"
  const words = infinitive.trim().split(/\s+/);
  if (words.length > 1) {
    // For separable verbs, the prefix is stored separately — just take the last word
    // For "sich Sorgen machen", last word is "machen" which is the verb
    infinitive = words[words.length - 1];
    
    // Re-attach separable prefix if it was part of the original infinitive
    // e.g., "sich etwas abgewöhnen" with separablePrefix="ab" — last word is "abgewöhnen" ✓
    // e.g., "sich freuen" — last word is "freuen" ✓
  }

  const regular = generateRegularForms(infinitive, isSeparable, separablePrefix);

  for (const person of ALL_PERSONS) {
    const personConj = table.conjugations[person];
    if (!personConj) continue;

    const reg = regular[person];

    // ── Präsens: diff "main" field ──
    const praesens = personConj.praesens;
    if (praesens?.main) {
      const ranges = computeHighlightRanges(reg.praesens, praesens.main);
      if (ranges) {
        praesens.highlights = {
          ...praesens.highlights,
          main: ranges,
        };
      } else {
        // Remove main highlights if form is regular
        if (praesens.highlights) {
          delete praesens.highlights.main;
          if (Object.keys(praesens.highlights).length === 0) {
            delete praesens.highlights;
          }
        }
      }
    }

    // ── Perfekt: diff "partizip" field (same for all persons) ──
    const perfekt = personConj.perfekt;
    if (perfekt?.partizip) {
      const ranges = computeHighlightRanges(reg.partizipII, perfekt.partizip);
      if (ranges) {
        perfekt.highlights = {
          ...perfekt.highlights,
          partizip: ranges,
        } as TenseHighlights;
      } else {
        if (perfekt.highlights) {
          delete (perfekt.highlights as Record<string, unknown>).partizip;
          if (Object.keys(perfekt.highlights).length === 0) {
            delete perfekt.highlights;
          }
        }
      }
    }

    // ── Präteritum: diff "main" field ──
    const praeteritum = personConj.praeteritum;
    if (praeteritum?.main) {
      const ranges = computeHighlightRanges(reg.praeteritum, praeteritum.main);
      if (ranges) {
        praeteritum.highlights = {
          ...praeteritum.highlights,
          main: ranges,
        };
      } else {
        if (praeteritum.highlights) {
          delete praeteritum.highlights.main;
          if (Object.keys(praeteritum.highlights).length === 0) {
            delete praeteritum.highlights;
          }
        }
      }
    }
  }

  return table;
}
