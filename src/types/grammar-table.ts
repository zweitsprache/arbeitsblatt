// ─── Grammar Table types (Adjektivdeklination, Verbkonjugation, etc.) ─────────

import { Brand, BrandSettings, DEFAULT_BRAND_SETTINGS } from "./worksheet";

// ─── Table types ─────────────────────────────────────────────
export type GrammarTableType = "adjective-declination" | "verb-conjugation";

// ─── Adjective Declination types ─────────────────────────────

/** German grammatical cases */
export type GrammatikalFall = "nominativ" | "akkusativ" | "dativ" | "genitiv";

/** German grammatical genders + plural */
export type Genus = "maskulin" | "neutrum" | "feminin" | "plural";

/** User input for generating a declination table */
export interface DeclinationInput {
  maskulin: { adjective: string; noun: string };
  neutrum: { adjective: string; noun: string };
  feminin: { adjective: string; noun: string };
  plural: { adjective: string; noun: string };
}

/**
 * A single cell in the declination table.
 * Each cell has article, adjective, noun.
 */
export interface DeclinationCell {
  article: string;     // der, die, das, ein, …, etc.
  adjective: string;   // nette, netten, nettem, netter, etc.
  noun: string;        // Mann, Frau, Kind, Leute(n), etc.
}

/**
 * A visual row in the table. Some rows have rowspans where
 * adjective/noun are shared with adjacent rows.
 */
export interface TableRow {
  maskulin: DeclinationCell;
  neutrum: DeclinationCell;
  feminin: DeclinationCell;
  plural: DeclinationCell;
  /** Whether this row starts a new visual block (adds separator line above) */
  isBlockStart?: boolean;
}

/**
 * An article group contains multiple rows that share the same
 * adjective declination pattern.
 * 
 * Structure mirrors the HTML:
 * - Definite: der/dieser rows (adjective shared via rowspan)
 * - Indefinite: ein/kein/mein rows (complex plural handling)
 * - Zero: single row with no article
 */
export interface ArticleGroup {
  type: "definite" | "indefinite" | "zero";
  /** 
   * For rendering rowspans: the shared adjective+noun for each gender.
   * Individual rows may override for special cases (e.g., plural indefinite).
   */
  shared: {
    maskulin: { adjective: string; noun: string };
    neutrum: { adjective: string; noun: string };
    feminin: { adjective: string; noun: string };
    plural: { adjective: string; noun: string };
  };
  /** Article variants in this group */
  articleRows: {
    maskulin: string;   // der, dieser, ein, kein, mein, …
    neutrum: string;    // das, dieses, ein, kein, mein, …
    feminin: string;    // die, diese, eine, keine, meine, …
    plural: string;     // die, diese, …, keine, meine, …
    /** Override for plural adjective+noun if different from shared */
    pluralOverride?: { adjective: string; noun: string };
  }[];
  /** Note text for this group (e.g., "*alle, beide, jene...") */
  note?: string;
}

/** A full case section (Nominativ, Akkusativ, etc.) */
export interface CaseSection {
  case: GrammatikalFall;
  groups: ArticleGroup[];
  /** Preposition info for this case (e.g., WOHIN? / WO?) */
  prepositionHeading?: string;
  prepositions?: string[];
}

/** Complete adjective declination table */
export interface AdjectiveDeclinationTable {
  input: DeclinationInput;
  cases: CaseSection[];
}

// ─── Grammar Table Document ──────────────────────────────────

export interface GrammarTableSettings {
  showNotes: boolean;
  showPrepositions: boolean;
  highlightEndings: boolean;
  /** Simplified mode: show only one tense, 3 verbs side by side, infinitive as header */
  simplified: boolean;
  /** Which tenses to show in simplified mode */
  simplifiedTenses: Record<VerbTense, boolean>;
  /** Highlight irregular verb form deviations with yellow background */
  showIrregularHighlights: boolean;
  brand: Brand;
  brandSettings: BrandSettings;
  /** Second title shown on the content page (page 2) */
  contentTitle: string;
  /** Up to 4 cover images for the title page */
  coverImages: string[];
  /** Show border around cover images */
  coverImageBorder: boolean;
}

/** Union type for all grammar table inputs */
export type GrammarTableInput = DeclinationInput | ConjugationInput;

/** Union type for all grammar table data */
export type GrammarTableData = AdjectiveDeclinationTable | VerbConjugationTable[];

export interface GrammarTableDocument {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  tableType: GrammarTableType;
  input: GrammarTableInput;
  tableData: GrammarTableData | null;
  settings: GrammarTableSettings;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_GRAMMAR_TABLE_SETTINGS: GrammarTableSettings = {
  showNotes: true,
  showPrepositions: true,
  highlightEndings: false,
  simplified: false,
  simplifiedTenses: { praesens: true, perfekt: false, praeteritum: false },
  showIrregularHighlights: false,
  brand: "edoomio",
  brandSettings: DEFAULT_BRAND_SETTINGS["edoomio"],
  contentTitle: "",
  coverImages: [],
  coverImageBorder: false,
};

export const DEFAULT_DECLINATION_INPUT: DeclinationInput = {
  maskulin: { adjective: "nett", noun: "Mann" },
  neutrum: { adjective: "nett", noun: "Kind" },
  feminin: { adjective: "nett", noun: "Frau" },
  plural: { adjective: "nett", noun: "Leute" },
};

// ─── Labels for UI ───────────────────────────────────────────

export const CASE_LABELS: Record<GrammatikalFall, { de: string; en: string }> = {
  nominativ: { de: "Nominativ", en: "Nominative" },
  akkusativ: { de: "Akkusativ", en: "Accusative" },
  dativ: { de: "Dativ", en: "Dative" },
  genitiv: { de: "Genitiv", en: "Genitive" },
};

export const GENUS_LABELS: Record<Genus, { de: string; en: string }> = {
  maskulin: { de: "Maskulin", en: "Masculine" },
  neutrum: { de: "Neutrum", en: "Neuter" },
  feminin: { de: "Feminin", en: "Feminine" },
  plural: { de: "Plural", en: "Plural" },
};

export const ARTICLE_GROUP_LABELS: Record<"definite" | "indefinite" | "zero", { de: string; en: string }> = {
  definite: { de: "Bestimmter Artikel", en: "Definite Article" },
  indefinite: { de: "Unbestimmter Artikel", en: "Indefinite Article" },
  zero: { de: "Nullartikel", en: "Zero Article" },
};

// ─── Prepositions reference ──────────────────────────────────

export const CASE_PREPOSITIONS: Record<GrammatikalFall, { heading: string; prepositions: string[] }> = {
  nominativ: {
    heading: "",
    prepositions: [],
  },
  akkusativ: {
    heading: "WOHIN?",
    prepositions: [
      "an, auf, hinter, in, neben, über, unter, vor, zwischen",
      "bis, um, für, durch, ohne, gegen",
    ],
  },
  dativ: {
    heading: "WO?",
    prepositions: [
      "an, auf, hinter, in, neben, über, unter, vor, zwischen",
      "zu, nach, mit, von, seit, bei, aus, gegenüber",
    ],
  },
  genitiv: {
    heading: "",
    prepositions: ["trotz, wegen, während, (an)statt"],
  },
};

// ─── Verb Conjugation types ──────────────────────────────────

/** User input for generating a conjugation table */
export interface ConjugationInput {
  verbs: string[]; // infinitive forms (machen, abholen, etc.)
}

/** German verb tenses */
export type VerbTense = "praesens" | "perfekt" | "praeteritum";

/** Person key for conjugation lookup */
export type PersonKey = 
  | "ich" 
  | "du" 
  | "Sie_sg" 
  | "er_sie_es" 
  | "wir" 
  | "ihr" 
  | "Sie_pl" 
  | "sie_pl";

/** Static row definition for conjugation table */
export interface StaticRowDef {
  personKey: PersonKey;
  person: "1" | "2" | "3";
  formality?: "informell" | "formell";
  pronoun: string;
  section: "singular" | "plural";
}

/** Static structure of German verb conjugation rows */
export const CONJUGATION_ROWS: StaticRowDef[] = [
  // Singular
  { personKey: "ich", person: "1", pronoun: "ich", section: "singular" },
  { personKey: "du", person: "2", formality: "informell", pronoun: "du", section: "singular" },
  { personKey: "Sie_sg", person: "2", formality: "formell", pronoun: "Sie", section: "singular" },
  { personKey: "er_sie_es", person: "3", pronoun: "er / sie / es", section: "singular" },
  // Plural
  { personKey: "wir", person: "1", pronoun: "wir", section: "plural" },
  { personKey: "ihr", person: "2", formality: "informell", pronoun: "ihr", section: "plural" },
  { personKey: "Sie_pl", person: "2", formality: "formell", pronoun: "Sie", section: "plural" },
  { personKey: "sie_pl", person: "3", pronoun: "sie", section: "plural" },
];

/**
 * Character-level highlight ranges [startIndex, endIndex) marking irregular deviations.
 * Each range is inclusive-start, exclusive-end.
 */
export interface TenseHighlights {
  main?: [number, number][];
  prefix?: [number, number][];
  auxiliary?: [number, number][];
  partizip?: [number, number][];
  reflexive?: [number, number][];
}

/** A conjugation for a single person in a tense */
export interface TenseConjugation {
  /** Main conjugated form (e.g., "mache" or "hole") */
  main: string;
  /** Separated prefix for separable verbs (e.g., "ab" for "abholen") */
  prefix?: string;
  /** Reflexive pronoun for reflexive verbs (mich, dich, sich, uns, euch) */
  reflexive?: string;
  /** Auxiliary for Perfekt (habe/hast/hat/haben/habt) */
  auxiliary?: string;
  /** Partizip II for Perfekt (gemacht, abgeholt) */
  partizip?: string;
  /** Character-level irregularity highlights per field */
  highlights?: TenseHighlights;
}

/** Conjugations for all tenses for one person */
export interface PersonConjugations {
  praesens: TenseConjugation;
  perfekt: TenseConjugation;
  praeteritum: TenseConjugation;
}

/** A row in the conjugation table (one person) - legacy format */
export interface ConjugationRow {
  person: "1" | "2" | "3";
  formality?: "informell" | "formell";
  pronoun: string; // ich, du, Sie, er/sie/es, wir, ihr, sie
  praesens: TenseConjugation;
  perfekt: TenseConjugation;
  praeteritum: TenseConjugation;
}

/** Complete verb conjugation table */
export interface VerbConjugationTable {
  input: { verb: string };
  /** Whether the verb is separable (trennbar) */
  isSeparable: boolean;
  /** The separated prefix if applicable */
  separablePrefix?: string;
  /** Whether the verb is reflexive (reflexiv) */
  isReflexive: boolean;
  /** Conjugations indexed by person key */
  conjugations: Record<PersonKey, PersonConjugations>;
}

export const DEFAULT_CONJUGATION_INPUT: ConjugationInput = {
  verbs: ["machen"],
};

export const TENSE_LABELS: Record<VerbTense, { de: string; en: string }> = {
  praesens: { de: "Präsens", en: "Present" },
  perfekt: { de: "Perfekt", en: "Perfect" },
  praeteritum: { de: "Präteritum", en: "Past" },
};

export const TABLE_TYPE_LABELS: Record<GrammarTableType, { de: string; en: string }> = {
  "adjective-declination": { de: "Adjektivdeklination", en: "Adjective Declension" },
  "verb-conjugation": { de: "Verbkonjugation", en: "Verb Conjugation" },
};
