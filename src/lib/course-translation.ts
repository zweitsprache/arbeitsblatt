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
  HeadingBlock,
  TextSnippetBlock,
  ColumnsBlock,
  AccordionBlock,
  NumberedItemsBlock,
  NumberedLabelBlock,
} from "@/types/worksheet";

const TRANSLATABLE_TEXT_STYLES = new Set([
  "standard",
  "hinweis",
  "hinweis-wichtig",
  "hinweis-alarm",
  "lernziel",
  "rows",
  "fragen",
  "kompetenzziele",
  "handlungsziele",
  "redemittel",
]);

function isTranslatableTextStyle(style?: string): boolean {
  return !style || TRANSLATABLE_TEXT_STYLES.has(style);
}

// ─── AI instructions for special content ─────────────────────

const HTML_AI_INSTRUCTIONS =
  "HTML content. Translate text only, preserve all HTML tags exactly.";

const SNIPPET_BREAK_AI_INSTRUCTIONS =
  "HTML content. Translate text only, preserve all HTML tags exactly. CRITICAL: preserve every <hr data-snippet-break=\"\"> tag exactly as-is — do not remove, alter, or close it differently. These are item separators and must remain intact.";

const BLANK_AI_INSTRUCTIONS =
  "Translate text, keep {{blank:...}} syntax. Translate word inside blank: too.";

const INLINE_CHOICE_AI_INSTRUCTIONS =
  "Translate text and options in {{...|...}}. Keep {{}} and | syntax. First option = correct.";

const FIX_SENTENCE_AI_INSTRUCTIONS =
  "Translate each part, keep ' | ' separators exactly.";

const DE_MARKER_AI_INSTRUCTIONS =
  "Keep {{de:...}} German text as-is. Translate surrounding text naturally.";

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
    addStr(strings, `module.${mod.id}.shortTitle`, mod.shortTitle);
    extractBlockStrings(mod.blocks ?? [], strings);
    for (const topic of mod.topics) {
      addStr(strings, `topic.${topic.id}.title`, topic.title);
      addStr(strings, `topic.${topic.id}.shortTitle`, topic.shortTitle);
      extractBlockStrings(topic.blocks ?? [], strings);
      for (const lesson of topic.lessons) {
        addStr(strings, `lesson.${lesson.id}.title`, lesson.title);
        addStr(strings, `lesson.${lesson.id}.shortTitle`, lesson.shortTitle);
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

type TranslationFieldSetter = (value: string) => void;
type TranslationFieldVisitor = (
  key: string,
  getValue: () => string | undefined | null,
  setValue?: TranslationFieldSetter
) => void;

function forEachBlockTranslationField(
  block: WorksheetBlock,
  visit: TranslationFieldVisitor
) {
  const p = `block.${block.id}`;
  const add = (
    suffix: string,
    getValue: () => string | undefined | null,
    setValue?: TranslationFieldSetter
  ) => {
    visit(`${p}.${suffix}`, getValue, setValue);
  };

  switch (block.type) {
    case "text": {
      const tb = block as TextBlock;
      if (!tb.skipTranslation && isTranslatableTextStyle(tb.textStyle)) {
        add("content", () => tb.content, (v) => {
          tb.content = v;
        });
        add("comment", () => tb.comment, (v) => {
          tb.comment = v;
        });
      }
      break;
    }

    case "heading": {
      if (!(block as HeadingBlock).skipTranslation) {
        add("content", () => block.content, (v) => {
          block.content = v;
        });
      }
      break;
    }

    case "image": {
      add("alt", () => block.alt, (v) => {
        block.alt = v;
      });
      add("caption", () => block.caption, (v) => {
        block.caption = v;
      });
      break;
    }

    case "image-cards": {
      for (const item of block.items) {
        add(`items.${item.id}.text`, () => item.text, (v) => {
          item.text = v;
        });
      }
      break;
    }

    case "text-cards": {
      for (const item of block.items) {
        add(`items.${item.id}.text`, () => item.text, (v) => {
          item.text = v;
        });
        add(`items.${item.id}.caption`, () => item.caption, (v) => {
          item.caption = v;
        });
      }
      break;
    }

    case "multiple-choice": {
      add("question", () => block.question, (v) => {
        block.question = v;
      });
      for (const opt of block.options) {
        add(`options.${opt.id}.text`, () => opt.text, (v) => {
          opt.text = v;
        });
      }
      break;
    }

    case "fill-in-blank": {
      add("content", () => block.content, (v) => {
        block.content = v;
      });
      break;
    }

    case "fill-in-blank-items": {
      for (const item of block.items) {
        add(`items.${item.id}.content`, () => item.content, (v) => {
          item.content = v;
        });
      }
      break;
    }

    case "matching": {
      add("instruction", () => block.instruction, (v) => {
        block.instruction = v;
      });
      for (const pair of block.pairs) {
        add(`pairs.${pair.id}.left`, () => pair.left, (v) => {
          pair.left = v;
        });
        add(`pairs.${pair.id}.right`, () => pair.right, (v) => {
          pair.right = v;
        });
      }
      break;
    }

    case "two-column-fill": {
      add("instruction", () => block.instruction, (v) => {
        block.instruction = v;
      });
      for (const item of block.items) {
        add(`items.${item.id}.left`, () => item.left, (v) => {
          item.left = v;
        });
        add(`items.${item.id}.right`, () => item.right, (v) => {
          item.right = v;
        });
      }
      break;
    }

    case "glossary": {
      add("instruction", () => block.instruction, (v) => {
        block.instruction = v;
      });
      for (const pair of block.pairs) {
        add(`pairs.${pair.id}.definition`, () => pair.definition, (v) => {
          pair.definition = v;
        });
      }
      break;
    }

    case "open-response": {
      add("question", () => block.question, (v) => {
        block.question = v;
      });
      break;
    }

    case "word-bank": {
      for (let i = 0; i < block.words.length; i++) {
        add(`words.${i}`, () => block.words[i], (v) => {
          block.words[i] = v;
        });
      }
      break;
    }

    case "order-items": {
      add("instruction", () => block.instruction, (v) => {
        block.instruction = v;
      });
      for (const item of block.items) {
        add(`items.${item.id}.text`, () => item.text, (v) => {
          item.text = v;
        });
      }
      break;
    }

    case "inline-choices": {
      for (const item of block.items) {
        add(`items.${item.id}.content`, () => item.content, (v) => {
          item.content = v;
        });
      }
      break;
    }

    case "sorting-categories": {
      add("instruction", () => block.instruction, (v) => {
        block.instruction = v;
      });
      for (const cat of block.categories) {
        add(`categories.${cat.id}.label`, () => cat.label, (v) => {
          cat.label = v;
        });
      }
      for (const item of block.items) {
        add(`items.${item.id}.text`, () => item.text, (v) => {
          item.text = v;
        });
      }
      break;
    }

    case "fix-sentences": {
      add("instruction", () => block.instruction, (v) => {
        block.instruction = v;
      });
      for (const item of block.sentences) {
        add(`sentences.${item.id}.sentence`, () => item.sentence, (v) => {
          item.sentence = v;
        });
      }
      break;
    }

    case "complete-sentences": {
      add("instruction", () => block.instruction, (v) => {
        block.instruction = v;
      });
      for (const item of block.sentences) {
        add(`sentences.${item.id}.beginning`, () => item.beginning, (v) => {
          item.beginning = v;
        });
      }
      break;
    }

    case "verb-table": {
      add("verb", () => block.verb, (v) => {
        block.verb = v;
      });
      for (const row of block.singularRows) {
        add(`singularRows.${row.id}.person`, () => row.person, (v) => {
          row.person = v;
        });
        add(`singularRows.${row.id}.detail`, () => row.detail, (v) => {
          if (row.detail !== undefined) row.detail = v;
        });
        add(`singularRows.${row.id}.pronoun`, () => row.pronoun, (v) => {
          row.pronoun = v;
        });
        add(`singularRows.${row.id}.conjugation`, () => row.conjugation, (v) => {
          row.conjugation = v;
        });
        add(`singularRows.${row.id}.conjugation2`, () => row.conjugation2, (v) => {
          if (row.conjugation2 !== undefined) row.conjugation2 = v;
        });
      }
      for (const row of block.pluralRows) {
        add(`pluralRows.${row.id}.person`, () => row.person, (v) => {
          row.person = v;
        });
        add(`pluralRows.${row.id}.detail`, () => row.detail, (v) => {
          if (row.detail !== undefined) row.detail = v;
        });
        add(`pluralRows.${row.id}.pronoun`, () => row.pronoun, (v) => {
          row.pronoun = v;
        });
        add(`pluralRows.${row.id}.conjugation`, () => row.conjugation, (v) => {
          row.conjugation = v;
        });
        add(`pluralRows.${row.id}.conjugation2`, () => row.conjugation2, (v) => {
          if (row.conjugation2 !== undefined) row.conjugation2 = v;
        });
      }
      break;
    }

    case "dialogue": {
      add("instruction", () => block.instruction, (v) => {
        block.instruction = v;
      });
      for (const item of block.items) {
        add(`items.${item.id}.speaker`, () => item.speaker, (v) => {
          item.speaker = v;
        });
        add(`items.${item.id}.text`, () => item.text, (v) => {
          item.text = v;
        });
      }
      break;
    }

    case "article-training": {
      add("instruction", () => block.instruction, (v) => {
        block.instruction = v;
      });
      for (const item of block.items) {
        add(`items.${item.id}.text`, () => item.text, (v) => {
          item.text = v;
        });
      }
      break;
    }

    case "chart": {
      add("title", () => block.title, (v) => {
        if (block.title !== undefined) block.title = v;
      });
      add("xAxisLabel", () => block.xAxisLabel, (v) => {
        if (block.xAxisLabel !== undefined) block.xAxisLabel = v;
      });
      add("yAxisLabel", () => block.yAxisLabel, (v) => {
        if (block.yAxisLabel !== undefined) block.yAxisLabel = v;
      });
      for (const dp of block.data) {
        add(`data.${dp.id}.label`, () => dp.label, (v) => {
          dp.label = v;
        });
      }
      break;
    }

    case "email-skeleton": {
      add("comment", () => block.comment, (v) => {
        block.comment = v;
      });
      break;
    }

    case "dos-and-donts": {
      add("dosTitle", () => block.dosTitle, (v) => {
        block.dosTitle = v;
      });
      add("dontsTitle", () => block.dontsTitle, (v) => {
        block.dontsTitle = v;
      });
      for (const item of block.dos) {
        add(`dos.${item.id}.text`, () => item.text, (v) => {
          item.text = v;
        });
      }
      for (const item of block.donts) {
        add(`donts.${item.id}.text`, () => item.text, (v) => {
          item.text = v;
        });
      }
      break;
    }

    case "text-comparison": {
      add("leftContent", () => block.leftContent, (v) => {
        block.leftContent = v;
      });
      add("rightContent", () => block.rightContent, (v) => {
        block.rightContent = v;
      });
      add("comment", () => block.comment, (v) => {
        block.comment = v;
      });
      break;
    }

    case "numbered-items": {
      if (!(block as NumberedItemsBlock).skipTranslation) {
        for (const item of block.items) {
          add(`items.${item.id}.content`, () => item.content, (v) => {
            item.content = v;
          });
        }
      }
      break;
    }

    case "table": {
      add("content", () => block.content, (v) => {
        block.content = v;
      });
      add("caption", () => block.caption, (v) => {
        if (block.caption !== undefined) block.caption = v;
      });
      break;
    }

    case "checklist": {
      for (const item of block.items) {
        add(`items.${item.id}.content`, () => item.content, (v) => {
          item.content = v;
        });
      }
      break;
    }

    case "schedule": {
      for (const item of block.items) {
        add(`items.${item.id}.title`, () => item.title, (v) => {
          item.title = v;
        });
        add(`items.${item.id}.description`, () => item.description, (v) => {
          item.description = v;
        });
      }
      break;
    }

    case "website": {
      if (!block.skipTranslation) {
        for (const item of block.items) {
          add(`items.${item.id}.description`, () => item.category || item.description, (v) => {
            item.category = v;
            item.description = "";
          });
        }
      }
      break;
    }

    case "text-snippet": {
      add("content", () => (block as TextSnippetBlock).content, (v) => {
        (block as TextSnippetBlock).translatedContent = v;
      });
      break;
    }

    case "numbered-label": {
      if (!(block as NumberedLabelBlock).skipTranslation) {
        add("prefix", () => block.prefix, (v) => {
          block.prefix = v;
        });
        add("suffix", () => block.suffix, (v) => {
          block.suffix = v;
        });
      }
      break;
    }

    // non-translatable block types
    case "spacer":
    case "divider":
    case "logo-divider":
    case "page-break":
    case "writing-lines":
    case "writing-rows":
    case "number-line":
    case "linked-blocks":
    case "word-search":
    case "job-application":
    case "columns":
    case "accordion":
      break;
  }
}

export function extractBlockStrings(
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
    // ── Columns: recurse into children
    case "columns": {
      const cb = block as ColumnsBlock;
      for (const col of cb.children) {
        extractBlockStrings(col, strings);
      }
      break;
    }

    // ── Accordion: extract titles + recurse into children
    case "accordion": {
      const ab = block as AccordionBlock;
      for (const item of ab.items) {
        addStr(strings, `${p}.items.${item.id}.title`, item.title);
        extractBlockStrings(item.children, strings);
      }
      break;
    }

    // ── Checklist
    case "checklist":
      forEachBlockTranslationField(block, (key, getValue) => {
        addStr(strings, key, getValue());
      });
      break;

    default:
      forEachBlockTranslationField(block, (key, getValue) => {
        addStr(strings, key, getValue());
      });
      break;
  }
}

// ─── Extract translatable strings for a specific scope ───────

export type TranslationScope = "cover" | "module" | "topic" | "lesson";

/**
 * Extract translatable strings for a single structural unit.
 * Unlike extractTranslatableStrings(), this only returns keys
 * belonging to the specified scope — no children are included.
 */
export function extractTranslatableStringsForScope(
  course: CourseDocument,
  scope: TranslationScope,
  scopeId?: string
): Record<string, string> {
  const strings: Record<string, string> = {};

  switch (scope) {
    case "cover":
      addStr(strings, "cover.title", course.coverSettings.title);
      addStr(strings, "cover.subtitle", course.coverSettings.subtitle);
      addStr(strings, "cover.author", course.coverSettings.author);
      addStr(strings, "settings.description", course.settings.description);
      break;

    case "module": {
      const mod = course.structure.find((m) => m.id === scopeId);
      if (mod) {
        addStr(strings, `module.${mod.id}.title`, mod.title);
        addStr(strings, `module.${mod.id}.shortTitle`, mod.shortTitle);
        extractBlockStrings(mod.blocks ?? [], strings);
      }
      break;
    }

    case "topic": {
      for (const mod of course.structure) {
        const topic = mod.topics.find((t) => t.id === scopeId);
        if (topic) {
          addStr(strings, `topic.${topic.id}.title`, topic.title);
          addStr(strings, `topic.${topic.id}.shortTitle`, topic.shortTitle);
          extractBlockStrings(topic.blocks ?? [], strings);
          break;
        }
      }
      break;
    }

    case "lesson": {
      outer: for (const mod of course.structure) {
        for (const topic of mod.topics) {
          const lesson = topic.lessons.find((l) => l.id === scopeId);
          if (lesson) {
            addStr(strings, `lesson.${lesson.id}.title`, lesson.title);
            addStr(strings, `lesson.${lesson.id}.shortTitle`, lesson.shortTitle);
            extractBlockStrings(lesson.blocks ?? [], strings);
            break outer;
          }
        }
      }
      break;
    }
  }

  return strings;
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
  // Snippet break markers — check before generic HTML so the stricter instruction takes priority
  if (value.includes("data-snippet-break")) {
    return SNIPPET_BREAK_AI_INSTRUCTIONS;
  }
  // HTML content (text blocks, tables, lists, etc.)
  // Use a generic tag detector so <ul>/<li> and other markup also get strict preserve-tags instructions.
  if (/<\/?[a-z][^>]*>/i.test(value)) {
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
  course: { structure: CourseModule[]; coverSettings: CourseCoverSettings; settings: CourseSettings },
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
    apply(`module.${mod.id}.shortTitle`, (v) => (mod.shortTitle = v));
    applyBlockTranslations(mod.blocks ?? [], translations);
    for (const topic of mod.topics) {
      apply(`topic.${topic.id}.title`, (v) => (topic.title = v));
      apply(`topic.${topic.id}.shortTitle`, (v) => (topic.shortTitle = v));
      applyBlockTranslations(topic.blocks ?? [], translations);
      for (const lesson of topic.lessons) {
        apply(`lesson.${lesson.id}.title`, (v) => (lesson.title = v));
        apply(`lesson.${lesson.id}.shortTitle`, (v) => (lesson.shortTitle = v));
        applyBlockTranslations(lesson.blocks ?? [], translations);
      }
    }
  }

  return { structure, coverSettings, settings };
}

export function applyBlockTranslations(
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
  switch (block.type) {
    case "columns": {
      for (const col of (block as ColumnsBlock).children)
        applyBlockTranslations(col, t);
      break;
    }
    case "accordion": {
      const ab = block as AccordionBlock;
      for (const item of ab.items) {
        const key = `block.${block.id}.items.${item.id}.title`;
        const translated = t[key];
        if (translated) item.title = translated;
        applyBlockTranslations(item.children, t);
      }
      break;
    }
    default:
      forEachBlockTranslationField(block, (key, _getValue, setValue) => {
        const translated = t[key];
        if (translated && setValue) {
          setValue(translated);
        }
      });
      break;
  }
}
