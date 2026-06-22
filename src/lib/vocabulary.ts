import { z } from "zod";

/* =========================================================================
 *  Wortschatz-Schema · "Treffpunkt Schweiz"
 *  Single Source of Truth für:
 *   - Anthropic tool input_schema (via z.toJSONSchema)
 *   - TypeScript-Typen (z.infer)
 *   - Validierung vor dem Prisma-Insert
 * =========================================================================*/

/* ---------- Enums / gemeinsame Bausteine ---------------------------------*/

export const Pos = z.enum([
  "noun",
  "verb",
  "adjective",
  "adverb",
  "pronoun",
  "preposition",
  "conjunction",
  "interjection",
  "phrase",
]);
export type Pos = z.infer<typeof Pos>;
export const POS_VALUES = Pos.options;

export const Register = z
  .enum(["neutral", "formal", "informal", "vulgar", "literary", "technical"])
  .nullable();

export const Confidence = z.enum(["high", "medium", "low"]);

export const Pronunciation = z.object({
  ipa: z.string().nullable(),
  syllables: z.string().nullable(),
  stress: z.number().int().nullable(),
  audio: z.string().url().nullable(),
});

export const Source = z.object({
  book: z.literal("Treffpunkt Schweiz"),
  lesson: z.number().int(),
  lesson_title: z.string().nullable(),
  module: z.string(),
  module_title: z.string().nullable(),
  page: z.number().int().nullable(),
  photo_id: z.string().nullable(),
});

export const Example = z.object({
  text: z.string(),
  translation: z.string().nullable().optional(),
});

/* =========================================================================
 *  POS-spezifische Blöcke (discriminated union über "pos")
 * =========================================================================*/

export const NounData = z.object({
  pos: z.literal("noun"),
  gender: z.enum(["m", "f", "n"]),
  genitive_sg: z.string().nullable(),
  plural: z.string().nullable(),
  plural_type: z.string().nullable(),
  declension: z.enum(["strong", "weak", "mixed"]).nullable(),
  countability: z.enum(["countable", "uncountable", "collective"]).nullable(),
  diminutive: z.string().nullable(),
  compound_parts: z.array(z.string()).nullable(),
  is_proper_noun: z.boolean().default(false),
});

export const StemChangeType = z.enum([
  "e_to_i",
  "e_to_ie",
  "a_to_ae",
  "au_to_aeu",
  "o_to_oe",
  "suppletive",
  "none",
]);

export const AUXILIARY_VALUES = ["haben", "sein"] as const;
export const REGULARITY_VALUES = ["weak", "strong", "mixed", "irregular"] as const;
export const STEM_CHANGE_VALUES = StemChangeType.options;

export const StemChange = z.object({
  has_change: z.boolean(),
  type: StemChangeType,
  from_vowel: z.string().nullable(),
  to_vowel: z.string().nullable(),
  affected_forms: z.array(z.string()),
  pattern_label: z.string().nullable(),
  examples: z.record(z.string(), z.string()).nullable(),
});

export const Ablaut = z.object({
  has_ablaut: z.boolean(),
  class: z.string().nullable(),
  pattern: z.string().nullable(),
  vowels: z
    .object({
      present: z.string().nullable(),
      past: z.string().nullable(),
      participle: z.string().nullable(),
    })
    .nullable(),
});

export const PrincipalParts = z.object({
  praesens_3sg: z.string().nullable(),
  praeteritum: z.string().nullable(),
  partizip_2: z.string().nullable(),
});

export const PrepositionalObject = z
  .object({
    preposition: z.string(),
    case: z.enum(["nominative", "accusative", "dative", "genitive"]),
  })
  .nullable();

export const VerbData = z.object({
  pos: z.literal("verb"),
  infinitive: z.string(),
  auxiliary: z.enum(AUXILIARY_VALUES),
  regularity: z.enum(REGULARITY_VALUES),
  separable: z.boolean().default(false),
  separable_prefix: z.string().nullable(),
  reflexive: z.enum(["none", "accusative", "dative"]).default("none"),
  principal_parts: PrincipalParts,
  stem_change: StemChange,
  ablaut: Ablaut,
  valency: z.number().int().nullable(),
  case_government: z.array(z.string()),
  prepositional_object: PrepositionalObject,
  transitivity: z.enum(["transitive", "intransitive", "ditransitive"]).nullable(),
  konjunktiv_2: z.string().nullable(),
  imperative: z
    .object({
      du: z.string().nullable(),
      ihr: z.string().nullable(),
      Sie: z.string().nullable(),
    })
    .nullable(),
});

export const AdjectiveData = z.object({
  pos: z.literal("adjective"),
  comparative: z.string().nullable(),
  superlative: z.string().nullable(),
  comparison: z.enum(["regular", "irregular", "none"]).nullable(),
  usage: z.enum(["attributive", "predicative", "both"]).nullable(),
  case_government: z.string().nullable(),
  prepositional_object: PrepositionalObject,
  antonym: z.string().nullable(),
  is_indeclinable: z.boolean().default(false),
});

export const AdverbData = z.object({
  pos: z.literal("adverb"),
  type: z.enum([
    "temporal",
    "local",
    "modal",
    "causal",
    "interrogative",
    "pronominal",
    "conjunctional",
    "other",
  ]),
  comparable: z.boolean().default(false),
  comparative: z.string().nullable(),
  superlative: z.string().nullable(),
});

export const PronounData = z.object({
  pos: z.literal("pronoun"),
  type: z.enum([
    "personal",
    "possessive",
    "reflexive",
    "demonstrative",
    "relative",
    "interrogative",
    "indefinite",
    "reciprocal",
  ]),
  person: z.number().int().nullable(),
  number: z.enum(["sg", "pl", "both"]).nullable(),
  gender: z.enum(["m", "f", "n", "all"]).nullable(),
  formality: z.enum(["informal", "formal", "neutral"]).nullable(),
  case: z
    .enum(["nominative", "accusative", "dative", "genitive", "all"])
    .nullable(),
  declension_paradigm: z.record(z.string(), z.string()).nullable(),
});

export const PrepositionData = z.object({
  pos: z.literal("preposition"),
  case_government: z.enum([
    "accusative",
    "dative",
    "genitive",
    "two-way",
    "variable",
  ]),
  is_two_way: z.boolean().default(false),
  type: z.enum(["local", "temporal", "modal", "causal", "other"]).nullable(),
  contractions: z.array(z.string()).nullable(),
});

export const ConjunctionData = z.object({
  pos: z.literal("conjunction"),
  type: z.enum(["coordinating", "subordinating", "correlative", "adverbial"]),
  word_order: z.enum(["none", "verb_final", "verb_second", "verb_first"]),
  correlate: z.string().nullable(),
});

export const InterjectionData = z.object({
  pos: z.literal("interjection"),
  function: z.enum([
    "greeting",
    "farewell",
    "agreement",
    "disagreement",
    "surprise",
    "pain",
    "filler",
    "other",
  ]),
  regional: z.string().nullable(),
});

export const PhraseData = z.object({
  pos: z.literal("phrase"),
  phrase_type: z.literal("redemittel"),
  redemittel_function: z.enum([
    "greeting",
    "farewell",
    "question",
    "answer",
    "request",
    "chunk",
    "collocation",
    "idiom",
    "other",
  ]),
  literal_meaning: z.string().nullable(),
  pattern: z.string().nullable(),
  fixedness: z.enum(["fixed", "semi-fixed", "free"]).nullable(),
  answer_to: z.string().nullable(),
});

export const PosData = z.discriminatedUnion("pos", [
  NounData,
  VerbData,
  AdjectiveData,
  AdverbData,
  PronounData,
  PrepositionData,
  ConjunctionData,
  InterjectionData,
  PhraseData,
]);
export type PosData = z.infer<typeof PosData>;

/* =========================================================================
 *  Core-Eintrag
 * =========================================================================*/

export const Entry = z
  .object({
    id: z.string().regex(/^L\d{2}-[A-Z]-\d{4}$/),
    lemma: z.string().min(1),
    pos: Pos,
    level: z.string().default("A1"),
    frequency_rank: z.number().int().nullable().optional(),
    pronunciation: Pronunciation,
    source: Source,
    examples: z.array(Example).default([]),
    register: Register,
    domain: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    notes: z.string().nullable(),
    date_added: z.string(),
    extraction_confidence: Confidence,
    pos_data: PosData,
  })
  .refine((entry) => entry.pos === entry.pos_data.pos, {
    message: "pos und pos_data.pos müssen übereinstimmen",
    path: ["pos_data", "pos"],
  })
  .refine(
    (entry) =>
      entry.pos_data.pos !== "verb" ||
      !entry.pos_data.stem_change.has_change ||
      entry.pos_data.regularity !== "weak",
    {
      message:
        "Verb mit stem_change.has_change=true darf nicht regularity 'weak' sein",
      path: ["pos_data", "regularity"],
    }
  )
  .refine(
    (entry) =>
      entry.pos_data.pos !== "verb" ||
      !entry.pos_data.separable ||
      !!entry.pos_data.separable_prefix,
    {
      message: "Trennbares Verb braucht separable_prefix",
      path: ["pos_data", "separable_prefix"],
    }
  );

export type Entry = z.infer<typeof Entry>;

export const EntriesPayload = z.object({
  entries: z.array(Entry),
});
export type EntriesPayload = z.infer<typeof EntriesPayload>;

export const vocabularyEntrySchema = Entry;
export const vocabularyToolInputSchema = EntriesPayload;
export type VocabularyEntryInput = Entry;
export type VocabularyToolInput = EntriesPayload;

export type VocabularyConsistencyIssue = {
  index: number;
  lemma: string;
  message: string;
};

export function normalizeVocabularyEntry(entry: VocabularyEntryInput) {
  return {
    ...entry,
    lemma: entry.lemma.trim(),
    level: "A1",
    source: {
      ...entry.source,
      book: "Treffpunkt Schweiz" as const,
      module: entry.source.module.trim().toUpperCase(),
    },
    domain: entry.domain ?? [],
    tags: (entry.tags ?? []).map((tag) => tag.trim()).filter(Boolean),
  };
}

export function findVocabularyConsistencyIssues(
  entries: VocabularyEntryInput[]
): VocabularyConsistencyIssue[] {
  return entries.flatMap((entry, index) => {
    if (
      entry.pos_data.pos === "verb" &&
      entry.pos_data.stem_change.has_change &&
      entry.pos_data.regularity === "weak"
    ) {
      return [
        {
          index,
          lemma: entry.lemma,
          message:
            "stem_change.has_change=true markiert einen Praesens-Stammvokalwechsel; regularity darf deshalb nicht weak sein.",
        },
      ];
    }

    if (
      entry.pos_data.pos === "verb" &&
      entry.pos_data.separable &&
      !entry.pos_data.separable_prefix
    ) {
      return [
        {
          index,
          lemma: entry.lemma,
          message: "Trennbare Verben brauchen separable_prefix.",
        },
      ];
    }

    return [];
  });
}

export function buildVocabularyToolInputSchema() {
  return z.toJSONSchema(vocabularyToolInputSchema, {
    target: "draft-7",
    unrepresentable: "any",
  });
}

export function buildEntryId(lesson: number, module: string, sequence: number) {
  return `L${String(lesson).padStart(2, "0")}-${module.toUpperCase()}-${String(
    sequence
  ).padStart(4, "0")}`;
}
