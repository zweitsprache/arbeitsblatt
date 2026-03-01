import {
  CourseModule,
  CourseCoverSettings,
  CourseSettings,
  CourseDocument,
  CourseTranslation,
} from "@/types/course";
import {
  WorksheetBlock,
  TextBlock,
  ColumnsBlock,
} from "@/types/worksheet";

// ─── AI instructions for special content ─────────────────────

const HTML_AI_INSTRUCTIONS =
  "This is HTML content. Translate the text but preserve ALL HTML tags exactly as they are (<p>, <br/>, <strong>, <em>, etc.). Do not add or remove tags.";

const BLANK_AI_INSTRUCTIONS =
  "This text contains {{blank:answer}} markers. Translate the surrounding text but keep the {{blank:...}} syntax exactly. Translate the word inside blank: as well.";

const INLINE_CHOICE_AI_INSTRUCTIONS =
  "This text contains {{option1|option2|option3}} markers. Translate the surrounding text and translate each option inside {{...}}, keeping the | separators and {{}} syntax intact. The first option is always the correct answer.";

const FIX_SENTENCE_AI_INSTRUCTIONS =
  "This sentence has parts separated by ' | '. Translate each part but keep the ' | ' separators exactly as they are.";

const DE_MARKER_AI_INSTRUCTIONS =
  "This text contains {{de:German text}} markers. The German text inside {{de:...}} must be kept EXACTLY as-is (it is vocabulary being taught). Translate the surrounding text naturally so the sentence reads well in the target language despite the embedded German words. Keep the {{de:...}} syntax intact.";

// ─── Extract translatable strings ────────────────────────────

/**
 * Walk a CourseDocument and extract all translatable strings as a flat
 * key→value map. Keys use dot-notation with entity IDs for stability.
 */
export function extractTranslatableStrings(
  course: CourseDocument
): Record<string, string> {
  const strings: Record<string, string> = {};

  // ── Cover settings
  addStr(strings, "cover.title", course.coverSettings.title);
  addStr(strings, "cover.subtitle", course.coverSettings.subtitle);
  addStr(strings, "cover.author", course.coverSettings.author);

  // ── Course settings
  addStr(strings, "settings.description", course.settings.description);

  // ── Structure: modules → topics → lessons → blocks
  for (const mod of course.structure) {
    addStr(strings, `module.${mod.id}.title`, mod.title);
    for (const topic of mod.topics) {
      addStr(strings, `topic.${topic.id}.title`, topic.title);
      for (const lesson of topic.lessons) {
        addStr(strings, `lesson.${lesson.id}.title`, lesson.title);
        extractBlockStrings(lesson.blocks ?? [], strings);
      }
    }
  }

  return strings;
}

// ─── Block extraction ────────────────────────────────────────

function addStr(
  strings: Record<string, string>,
  key: string,
  value: string | undefined | null
) {
  if (value && value.trim()) {
    strings[key] = value;
  }
}

function extractBlockStrings(
  blocks: WorksheetBlock[],
  strings: Record<string, string>
) {
  for (const block of blocks) {
    extractSingleBlockStrings(block, strings);
  }
}

function extractSingleBlockStrings(
  block: WorksheetBlock,
  strings: Record<string, string>
) {
  const p = `block.${block.id}`;

  switch (block.type) {
    // ── Skip non-translatable blocks
    case "spacer":
    case "divider":
    case "logo-divider":
    case "page-break":
    case "writing-lines":
    case "writing-rows":
    case "number-line":
    case "numbered-label":
    case "linked-blocks":
    case "word-search":
    case "text-snippet":     // not translated per spec
    case "job-application":  // form blocks not translated
      break;

    // ── Text block: content only if no set style; comment always
    case "text": {
      const tb = block as TextBlock;
      if (!tb.textStyle || tb.textStyle === "standard" || tb.textStyle === "hinweis" || tb.textStyle === "hinweis-wichtig" || tb.textStyle === "hinweis-alarm") {
        addStr(strings, `${p}.content`, tb.content);
      }
      addStr(strings, `${p}.comment`, tb.comment);
      break;
    }

    // ── Heading
    case "heading":
      addStr(strings, `${p}.content`, block.content);
      break;

    // ── Image
    case "image":
      addStr(strings, `${p}.alt`, block.alt);
      addStr(strings, `${p}.caption`, block.caption);
      break;

    // ── Image cards
    case "image-cards":
      for (const item of block.items) {
        addStr(strings, `${p}.items.${item.id}.text`, item.text);
      }
      break;

    // ── Text cards
    case "text-cards":
      for (const item of block.items) {
        addStr(strings, `${p}.items.${item.id}.text`, item.text);
        addStr(strings, `${p}.items.${item.id}.caption`, item.caption);
      }
      break;

    // ── Multiple choice
    case "multiple-choice":
      addStr(strings, `${p}.question`, block.question);
      for (const opt of block.options) {
        addStr(strings, `${p}.options.${opt.id}.text`, opt.text);
      }
      break;

    // ── Fill-in-blank
    case "fill-in-blank":
      addStr(strings, `${p}.content`, block.content);
      break;

    // ── Fill-in-blank items
    case "fill-in-blank-items":
      for (const item of block.items) {
        addStr(strings, `${p}.items.${item.id}.content`, item.content);
      }
      break;

    // ── Matching
    case "matching":
      addStr(strings, `${p}.instruction`, block.instruction);
      for (const pair of block.pairs) {
        addStr(strings, `${p}.pairs.${pair.id}.left`, pair.left);
        addStr(strings, `${p}.pairs.${pair.id}.right`, pair.right);
      }
      break;

    // ── Two-column fill
    case "two-column-fill":
      addStr(strings, `${p}.instruction`, block.instruction);
      for (const item of block.items) {
        addStr(strings, `${p}.items.${item.id}.left`, item.left);
        addStr(strings, `${p}.items.${item.id}.right`, item.right);
      }
      break;

    // ── Glossary: only definition, NOT term
    case "glossary":
      addStr(strings, `${p}.instruction`, block.instruction);
      for (const pair of block.pairs) {
        addStr(strings, `${p}.pairs.${pair.id}.definition`, pair.definition);
      }
      break;

    // ── Open response
    case "open-response":
      addStr(strings, `${p}.question`, block.question);
      break;

    // ── Word bank
    case "word-bank":
      for (let i = 0; i < block.words.length; i++) {
        addStr(strings, `${p}.words.${i}`, block.words[i]);
      }
      break;

    // ── True/false matrix
    case "true-false-matrix":
      addStr(strings, `${p}.instruction`, block.instruction);
      addStr(strings, `${p}.statementColumnHeader`, block.statementColumnHeader);
      addStr(strings, `${p}.trueLabel`, block.trueLabel);
      addStr(strings, `${p}.falseLabel`, block.falseLabel);
      for (const stmt of block.statements) {
        addStr(strings, `${p}.statements.${stmt.id}.text`, stmt.text);
      }
      break;

    // ── Order items
    case "order-items":
      addStr(strings, `${p}.instruction`, block.instruction);
      for (const item of block.items) {
        addStr(strings, `${p}.items.${item.id}.text`, item.text);
      }
      break;

    // ── Inline choices
    case "inline-choices":
      for (const item of block.items) {
        addStr(strings, `${p}.items.${item.id}.content`, item.content);
      }
      break;

    // ── Sorting categories
    case "sorting-categories":
      addStr(strings, `${p}.instruction`, block.instruction);
      for (const cat of block.categories) {
        addStr(strings, `${p}.categories.${cat.id}.label`, cat.label);
      }
      for (const item of block.items) {
        addStr(strings, `${p}.items.${item.id}.text`, item.text);
      }
      break;

    // ── Unscramble words
    case "unscramble-words":
      addStr(strings, `${p}.instruction`, block.instruction);
      for (const word of block.words) {
        addStr(strings, `${p}.words.${word.id}.word`, word.word);
      }
      break;

    // ── Fix sentences
    case "fix-sentences":
      addStr(strings, `${p}.instruction`, block.instruction);
      for (const item of block.sentences) {
        addStr(strings, `${p}.sentences.${item.id}.sentence`, item.sentence);
      }
      break;

    // ── Complete sentences
    case "complete-sentences":
      addStr(strings, `${p}.instruction`, block.instruction);
      for (const item of block.sentences) {
        addStr(strings, `${p}.sentences.${item.id}.beginning`, item.beginning);
      }
      break;

    // ── Verb table
    case "verb-table":
      addStr(strings, `${p}.verb`, block.verb);
      for (const row of block.singularRows) {
        addStr(strings, `${p}.singularRows.${row.id}.person`, row.person);
        addStr(strings, `${p}.singularRows.${row.id}.detail`, row.detail);
        addStr(strings, `${p}.singularRows.${row.id}.pronoun`, row.pronoun);
        addStr(strings, `${p}.singularRows.${row.id}.conjugation`, row.conjugation);
        if (row.conjugation2)
          addStr(strings, `${p}.singularRows.${row.id}.conjugation2`, row.conjugation2);
      }
      for (const row of block.pluralRows) {
        addStr(strings, `${p}.pluralRows.${row.id}.person`, row.person);
        addStr(strings, `${p}.pluralRows.${row.id}.detail`, row.detail);
        addStr(strings, `${p}.pluralRows.${row.id}.pronoun`, row.pronoun);
        addStr(strings, `${p}.pluralRows.${row.id}.conjugation`, row.conjugation);
        if (row.conjugation2)
          addStr(strings, `${p}.pluralRows.${row.id}.conjugation2`, row.conjugation2);
      }
      break;

    // ── Dialogue
    case "dialogue":
      addStr(strings, `${p}.instruction`, block.instruction);
      for (const item of block.items) {
        addStr(strings, `${p}.items.${item.id}.speaker`, item.speaker);
        addStr(strings, `${p}.items.${item.id}.text`, item.text);
      }
      break;

    // ── Article training
    case "article-training":
      addStr(strings, `${p}.instruction`, block.instruction);
      for (const item of block.items) {
        addStr(strings, `${p}.items.${item.id}.text`, item.text);
      }
      break;

    // ── Chart
    case "chart":
      addStr(strings, `${p}.title`, block.title);
      addStr(strings, `${p}.xAxisLabel`, block.xAxisLabel);
      addStr(strings, `${p}.yAxisLabel`, block.yAxisLabel);
      for (const dp of block.data) {
        addStr(strings, `${p}.data.${dp.id}.label`, dp.label);
      }
      break;

    // ── Email skeleton: only comment is translated
    case "email-skeleton":
      addStr(strings, `${p}.comment`, block.comment);
      break;

    // ── Dos and Don'ts
    case "dos-and-donts":
      addStr(strings, `${p}.dosTitle`, block.dosTitle);
      addStr(strings, `${p}.dontsTitle`, block.dontsTitle);
      for (const item of block.dos) {
        addStr(strings, `${p}.dos.${item.id}.text`, item.text);
      }
      for (const item of block.donts) {
        addStr(strings, `${p}.donts.${item.id}.text`, item.text);
      }
      break;

    // ── Numbered Items
    case "numbered-items":
      for (const item of block.items) {
        addStr(strings, `${p}.items.${item.id}.content`, item.content);
      }
      break;

    // ── Columns: recurse into children
    case "columns": {
      const cb = block as ColumnsBlock;
      for (const col of cb.children) {
        extractBlockStrings(col, strings);
      }
      break;
    }
  }
}

// ─── Determine AI instructions per key ───────────────────────

/**
 * Return appropriate ai_instructions for a given key/value pair,
 * based on the content patterns detected.
 */
export function getAiInstructions(
  key: string,
  value: string
): string | undefined {
  // HTML content (text blocks, email body)
  if (value.includes("<p>") || value.includes("<br") || value.includes("<strong>")) {
    return HTML_AI_INSTRUCTIONS;
  }
  // Fill-in-blank markers
  if (value.includes("{{blank:")) {
    return BLANK_AI_INSTRUCTIONS;
  }
  // Inline choice markers
  if (/\{\{[^}]+\|[^}]+\}\}/.test(value) && !value.includes("{{blank:")) {
    return INLINE_CHOICE_AI_INSTRUCTIONS;
  }
  // Fix-sentences separators
  if (key.includes(".sentence") && value.includes(" | ")) {
    return FIX_SENTENCE_AI_INSTRUCTIONS;
  }
  // German vocabulary markers
  if (value.includes("{{de:")) {
    return DE_MARKER_AI_INSTRUCTIONS;
  }
  return undefined;
}

// ─── Apply translations back to course structure ─────────────

/**
 * Deep-clone the course structure and replace translatable values
 * with their translations. Falls back to original German if missing.
 */
export function applyTranslations(
  course: CourseDocument,
  translations: Record<string, string>
): CourseTranslation {
  // Deep clone
  const structure: CourseModule[] = JSON.parse(
    JSON.stringify(course.structure)
  );
  const coverSettings: CourseCoverSettings = JSON.parse(
    JSON.stringify(course.coverSettings)
  );
  const settings: CourseSettings = JSON.parse(
    JSON.stringify(course.settings)
  );

  function apply(key: string, setter: (val: string) => void) {
    if (translations[key]) {
      setter(translations[key]);
    }
  }

  // ── Cover
  apply("cover.title", (v) => (coverSettings.title = v));
  apply("cover.subtitle", (v) => (coverSettings.subtitle = v));
  apply("cover.author", (v) => (coverSettings.author = v));

  // ── Settings
  apply("settings.description", (v) => (settings.description = v));

  // ── Structure
  for (const mod of structure) {
    apply(`module.${mod.id}.title`, (v) => (mod.title = v));
    for (const topic of mod.topics) {
      apply(`topic.${topic.id}.title`, (v) => (topic.title = v));
      for (const lesson of topic.lessons) {
        apply(`lesson.${lesson.id}.title`, (v) => (lesson.title = v));
        applyBlockTranslations(lesson.blocks ?? [], translations);
      }
    }
  }

  return { structure, coverSettings, settings };
}

function applyBlockTranslations(
  blocks: WorksheetBlock[],
  translations: Record<string, string>
) {
  for (const block of blocks) {
    applySingleBlockTranslations(block, translations);
  }
}

function applySingleBlockTranslations(
  block: WorksheetBlock,
  t: Record<string, string>
) {
  const p = `block.${block.id}`;

  function apply(key: string, setter: (val: string) => void) {
    if (t[key]) setter(t[key]);
  }

  switch (block.type) {
    case "text": {
      if (!block.textStyle || block.textStyle === "standard" || block.textStyle === "hinweis" || block.textStyle === "hinweis-wichtig" || block.textStyle === "hinweis-alarm") {
        apply(`${p}.content`, (v) => (block.content = v));
      }
      apply(`${p}.comment`, (v) => (block.comment = v));
      break;
    }
    case "heading":
      apply(`${p}.content`, (v) => (block.content = v));
      break;
    case "image":
      apply(`${p}.alt`, (v) => (block.alt = v));
      apply(`${p}.caption`, (v) => (block.caption = v));
      break;
    case "image-cards":
      for (const item of block.items)
        apply(`${p}.items.${item.id}.text`, (v) => (item.text = v));
      break;
    case "text-cards":
      for (const item of block.items) {
        apply(`${p}.items.${item.id}.text`, (v) => (item.text = v));
        apply(`${p}.items.${item.id}.caption`, (v) => (item.caption = v));
      }
      break;
    case "multiple-choice":
      apply(`${p}.question`, (v) => (block.question = v));
      for (const opt of block.options)
        apply(`${p}.options.${opt.id}.text`, (v) => (opt.text = v));
      break;
    case "fill-in-blank":
      apply(`${p}.content`, (v) => (block.content = v));
      break;
    case "fill-in-blank-items":
      for (const item of block.items)
        apply(`${p}.items.${item.id}.content`, (v) => (item.content = v));
      break;
    case "matching":
      apply(`${p}.instruction`, (v) => (block.instruction = v));
      for (const pair of block.pairs) {
        apply(`${p}.pairs.${pair.id}.left`, (v) => (pair.left = v));
        apply(`${p}.pairs.${pair.id}.right`, (v) => (pair.right = v));
      }
      break;
    case "two-column-fill":
      apply(`${p}.instruction`, (v) => (block.instruction = v));
      for (const item of block.items) {
        apply(`${p}.items.${item.id}.left`, (v) => (item.left = v));
        apply(`${p}.items.${item.id}.right`, (v) => (item.right = v));
      }
      break;
    case "glossary":
      apply(`${p}.instruction`, (v) => (block.instruction = v));
      for (const pair of block.pairs)
        apply(`${p}.pairs.${pair.id}.definition`, (v) => (pair.definition = v));
      break;
    case "open-response":
      apply(`${p}.question`, (v) => (block.question = v));
      break;
    case "word-bank":
      for (let i = 0; i < block.words.length; i++)
        apply(`${p}.words.${i}`, (v) => (block.words[i] = v));
      break;
    case "true-false-matrix":
      apply(`${p}.instruction`, (v) => (block.instruction = v));
      apply(`${p}.statementColumnHeader`, (v) => (block.statementColumnHeader = v));
      apply(`${p}.trueLabel`, (v) => (block.trueLabel = v));
      apply(`${p}.falseLabel`, (v) => (block.falseLabel = v));
      for (const stmt of block.statements)
        apply(`${p}.statements.${stmt.id}.text`, (v) => (stmt.text = v));
      break;
    case "order-items":
      apply(`${p}.instruction`, (v) => (block.instruction = v));
      for (const item of block.items)
        apply(`${p}.items.${item.id}.text`, (v) => (item.text = v));
      break;
    case "inline-choices":
      for (const item of block.items)
        apply(`${p}.items.${item.id}.content`, (v) => (item.content = v));
      break;
    case "sorting-categories":
      apply(`${p}.instruction`, (v) => (block.instruction = v));
      for (const cat of block.categories)
        apply(`${p}.categories.${cat.id}.label`, (v) => (cat.label = v));
      for (const item of block.items)
        apply(`${p}.items.${item.id}.text`, (v) => (item.text = v));
      break;
    case "unscramble-words":
      apply(`${p}.instruction`, (v) => (block.instruction = v));
      for (const word of block.words)
        apply(`${p}.words.${word.id}.word`, (v) => (word.word = v));
      break;
    case "fix-sentences":
      apply(`${p}.instruction`, (v) => (block.instruction = v));
      for (const item of block.sentences)
        apply(`${p}.sentences.${item.id}.sentence`, (v) => (item.sentence = v));
      break;
    case "complete-sentences":
      apply(`${p}.instruction`, (v) => (block.instruction = v));
      for (const item of block.sentences)
        apply(`${p}.sentences.${item.id}.beginning`, (v) => (item.beginning = v));
      break;
    case "verb-table":
      apply(`${p}.verb`, (v) => (block.verb = v));
      for (const row of block.singularRows) {
        apply(`${p}.singularRows.${row.id}.person`, (v) => (row.person = v));
        apply(`${p}.singularRows.${row.id}.detail`, (v) => { if (row.detail !== undefined) row.detail = v; });
        apply(`${p}.singularRows.${row.id}.pronoun`, (v) => (row.pronoun = v));
        apply(`${p}.singularRows.${row.id}.conjugation`, (v) => (row.conjugation = v));
        apply(`${p}.singularRows.${row.id}.conjugation2`, (v) => { if (row.conjugation2 !== undefined) row.conjugation2 = v; });
      }
      for (const row of block.pluralRows) {
        apply(`${p}.pluralRows.${row.id}.person`, (v) => (row.person = v));
        apply(`${p}.pluralRows.${row.id}.detail`, (v) => { if (row.detail !== undefined) row.detail = v; });
        apply(`${p}.pluralRows.${row.id}.pronoun`, (v) => (row.pronoun = v));
        apply(`${p}.pluralRows.${row.id}.conjugation`, (v) => (row.conjugation = v));
        apply(`${p}.pluralRows.${row.id}.conjugation2`, (v) => { if (row.conjugation2 !== undefined) row.conjugation2 = v; });
      }
      break;
    case "dialogue":
      apply(`${p}.instruction`, (v) => (block.instruction = v));
      for (const item of block.items) {
        apply(`${p}.items.${item.id}.speaker`, (v) => (item.speaker = v));
        apply(`${p}.items.${item.id}.text`, (v) => (item.text = v));
      }
      break;
    case "article-training":
      apply(`${p}.instruction`, (v) => (block.instruction = v));
      for (const item of block.items)
        apply(`${p}.items.${item.id}.text`, (v) => (item.text = v));
      break;
    case "chart":
      apply(`${p}.title`, (v) => { if (block.title !== undefined) block.title = v; });
      apply(`${p}.xAxisLabel`, (v) => { if (block.xAxisLabel !== undefined) block.xAxisLabel = v; });
      apply(`${p}.yAxisLabel`, (v) => { if (block.yAxisLabel !== undefined) block.yAxisLabel = v; });
      for (const dp of block.data)
        apply(`${p}.data.${dp.id}.label`, (v) => (dp.label = v));
      break;
    case "email-skeleton":
      apply(`${p}.comment`, (v) => (block.comment = v));
      break;
    case "dos-and-donts":
      apply(`${p}.dosTitle`, (v) => (block.dosTitle = v));
      apply(`${p}.dontsTitle`, (v) => (block.dontsTitle = v));
      for (const item of block.dos)
        apply(`${p}.dos.${item.id}.text`, (v) => (item.text = v));
      for (const item of block.donts)
        apply(`${p}.donts.${item.id}.text`, (v) => (item.text = v));
      break;
    case "numbered-items":
      for (const item of block.items)
        apply(`${p}.items.${item.id}.content`, (v) => (item.content = v));
      break;
    case "columns": {
      for (const col of (block as ColumnsBlock).children)
        applyBlockTranslations(col, t);
      break;
    }
  }
}
