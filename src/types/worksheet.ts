// ─── Visibility ──────────────────────────────────────────────
export type BlockVisibility = "both" | "print" | "online";

// ─── View mode ───────────────────────────────────────────────
export type ViewMode = "print" | "online";

// ─── Block types ─────────────────────────────────────────────
export type BlockType =
  | "heading"
  | "text"
  | "image"
  | "image-cards"
  | "spacer"
  | "divider"
  | "multiple-choice"
  | "fill-in-blank"
  | "matching"
  | "open-response"
  | "word-bank"
  | "number-line"
  | "columns"
  | "true-false-matrix"
  | "order-items"
  | "inline-choices"
  | "word-search"
  | "sorting-categories"
  | "unscramble-words"
  | "fix-sentences"
  | "verb-table"
  | "text-cards"
  | "glossary"
  | "article-training"
  | "chart"
  | "numbered-label"
  | "two-column-fill"
  | "dialogue";

// ─── Base block ──────────────────────────────────────────────
export interface BlockBase {
  id: string;
  type: BlockType;
  visibility: BlockVisibility;
}

// ─── Heading block ───────────────────────────────────────────
export interface HeadingBlock extends BlockBase {
  type: "heading";
  content: string;
  level: 1 | 2 | 3;
}

// ─── Text / Rich-text block ─────────────────────────────────
export interface TextBlock extends BlockBase {
  type: "text";
  content: string; // HTML string for WYSIWYG
  imageSrc?: string;
  imageAlign?: "left" | "right";
  imageScale?: number; // 10-100, percentage of container width
}

// ─── Image block ─────────────────────────────────────────────
export interface ImageBlock extends BlockBase {
  type: "image";
  src: string;
  alt: string;
  width?: number;
  caption?: string;
}

// ─── Image Cards block ───────────────────────────────────────
export interface ImageCardItem {
  id: string;
  src: string;
  alt: string;
  text: string;
}

export interface ImageCardsBlock extends BlockBase {
  type: "image-cards";
  items: ImageCardItem[];
  columns: 2 | 3 | 4;
  imageAspectRatio: "16:9" | "4:3" | "1:1" | "3:4" | "9:16";
  imageScale: number; // 10-100
  showWritingLines: boolean;
  writingLinesCount: number;
  showWordBank: boolean;
}

// ─── Text Cards block ────────────────────────────────────────
export interface TextCardItem {
  id: string;
  text: string;
  caption: string;
}

export interface TextCardsBlock extends BlockBase {
  type: "text-cards";
  items: TextCardItem[];
  columns: 2 | 3 | 4;
  textSize: "xs" | "sm" | "base" | "lg" | "xl" | "2xl";
  textAlign: "left" | "center" | "right";
  textBold: boolean;
  textItalic: boolean;
  showBorder: boolean;
  showWritingLines: boolean;
  writingLinesCount: number;
  showWordBank: boolean;
}

// ─── Spacer block ────────────────────────────────────────────
export interface SpacerBlock extends BlockBase {
  type: "spacer";
  height: number; // px
}

// ─── Divider block ───────────────────────────────────────────
export interface DividerBlock extends BlockBase {
  type: "divider";
  style: "solid" | "dashed" | "dotted";
}

// ─── Multiple-choice block ──────────────────────────────────
export interface MultipleChoiceOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface MultipleChoiceBlock extends BlockBase {
  type: "multiple-choice";
  question: string;
  options: MultipleChoiceOption[];
  allowMultiple: boolean;
}

// ─── Fill-in-blank block ────────────────────────────────────
export interface FillInBlankBlock extends BlockBase {
  type: "fill-in-blank";
  // Text with blanks marked as {{blank:answer}}
  content: string;
}

// ─── Matching block ─────────────────────────────────────────
export interface MatchingPair {
  id: string;
  left: string;
  right: string;
}

export interface MatchingBlock extends BlockBase {
  type: "matching";
  instruction: string;
  pairs: MatchingPair[];
  extendedRows?: boolean;
}

// ─── Two-column fill block ──────────────────────────────────
export interface TwoColumnFillItem {
  id: string;
  left: string;
  right: string;
}

export interface TwoColumnFillBlock extends BlockBase {
  type: "two-column-fill";
  instruction: string;
  items: TwoColumnFillItem[];
  fillSide: "left" | "right";
  colRatio?: "1-1" | "1-2" | "2-1";
  extendedRows?: boolean;
  showWordBank?: boolean;
}

// ─── Glossary block ─────────────────────────────────────────
export interface GlossaryPair {
  id: string;
  term: string;
  definition: string;
}

export interface GlossaryBlock extends BlockBase {
  type: "glossary";
  instruction: string;
  pairs: GlossaryPair[];
}

// ─── Open response block ────────────────────────────────────
export interface OpenResponseBlock extends BlockBase {
  type: "open-response";
  question: string;
  lines: number; // number of answer lines
}

// ─── Word bank block ────────────────────────────────────────
export interface WordBankBlock extends BlockBase {
  type: "word-bank";
  words: string[];
}

// ─── Number line block ──────────────────────────────────────
export interface NumberLineBlock extends BlockBase {
  type: "number-line";
  min: number;
  max: number;
  step: number;
  markers: number[];
}

// ─── Columns block (layout) ─────────────────────────────────
export interface ColumnsBlock extends BlockBase {
  type: "columns";
  columns: number; // 1–4
  children: WorksheetBlock[][];
}

// ─── True/False Matrix block ─────────────────────────────────
export interface TrueFalseMatrixBlock extends BlockBase {
  type: "true-false-matrix";
  instruction: string;
  statementColumnHeader?: string;
  statements: {
    id: string;
    text: string;
    correctAnswer: boolean; // true = True, false = False
  }[];
}

// ─── Article Training block ──────────────────────────────────
export type ArticleAnswer = "der" | "das" | "die";

export interface ArticleTrainingBlock extends BlockBase {
  type: "article-training";
  instruction: string;
  showWritingLine: boolean;
  items: {
    id: string;
    text: string;
    correctArticle: ArticleAnswer;
  }[];
}

// ─── Order Items block ───────────────────────────────────────
export interface OrderItemsBlock extends BlockBase {
  type: "order-items";
  instruction: string;
  items: {
    id: string;
    text: string;
    correctPosition: number; // 1-based correct order
  }[];
}

// ─── Inline Choices block ────────────────────────────────────
// Each item is a sentence with inline choices marked as {{correct|wrong1|wrong2}}
// The FIRST option is always the correct answer (randomised on render).
// Legacy syntax {{choice:*correct|wrong1|wrong2}} is still supported for backward compat.
export interface InlineChoiceItem {
  id: string;
  content: string; // e.g. "Er {{geht|gehe|gehst}} zur Schule." — first option is correct
}

export interface InlineChoicesBlock extends BlockBase {
  type: "inline-choices";
  items: InlineChoiceItem[];
  /** @deprecated — kept for backward compatibility with old data. Use items instead. */
  content?: string;
}

/**
 * Migrate legacy InlineChoicesBlock that only has `content` (single string)
 * into the new `items` array format. Each line becomes one item.
 * Also normalises legacy {{choice:*correct|wrong}} syntax to {{correct|wrong}}.
 */
export function migrateInlineChoicesBlock(block: InlineChoicesBlock): InlineChoiceItem[] {
  if (block.items && block.items.length > 0) {
    return block.items.map((item) => ({
      ...item,
      content: migrateChoiceSyntaxInline(item.content),
    }));
  }
  if (!block.content) return [];
  return block.content.split("\n").filter((line) => line.trim().length > 0).map((line, i) => ({
    id: `ic${Date.now()}-${i}`,
    content: migrateChoiceSyntaxInline(line),
  }));
}

/**
 * Convert legacy {{choice:*correct|wrong1|wrong2}} to {{correct|wrong1|wrong2}}.
 * Moves the *-prefixed option to index 0 and strips both `choice:` and `*`.
 * Idempotent — already-new-syntax strings pass through unchanged.
 */
function migrateChoiceSyntaxInline(content: string): string {
  return content.replace(/\{\{choice:([^}]+)\}\}/g, (_match, inner: string) => {
    const opts = inner.split("|");
    const starIdx = opts.findIndex((o: string) => o.startsWith("*"));
    if (starIdx >= 0) {
      const correct = opts[starIdx].slice(1);
      const rest = opts.filter((_: string, i: number) => i !== starIdx);
      return `{{${[correct, ...rest].join("|")}}}`;
    }
    // No star — just strip the choice: prefix
    return `{{${opts.join("|")}}}`;
  });
}

// ─── Word Search block ──────────────────────────────────────
export interface WordSearchBlock extends BlockBase {
  type: "word-search";
  words: string[];
  gridSize?: number; // deprecated, use gridCols/gridRows
  gridCols: number;
  gridRows: number;
  grid: string[][]; // generated letter grid
  showWordList: boolean;
}

// ─── Sorting Categories block ───────────────────────────────
export interface SortingCategory {
  id: string;
  label: string;
  correctItems: string[]; // item IDs that belong in this category
}

export interface SortingItem {
  id: string;
  text: string;
}

export interface SortingCategoriesBlock extends BlockBase {
  type: "sorting-categories";
  instruction: string;
  categories: SortingCategory[];
  items: SortingItem[];
  showWritingLines: boolean;
}

// ─── Unscramble Words block ─────────────────────────────────
export interface UnscrambleWordItem {
  id: string;
  word: string; // the correct word
}

export interface UnscrambleWordsBlock extends BlockBase {
  type: "unscramble-words";
  instruction: string;
  words: UnscrambleWordItem[];
  keepFirstLetter: boolean; // keep first letter at correct position
  lowercaseAll: boolean; // show all letters in lowercase
  itemOrder?: string[]; // persisted shuffled order of word IDs
}

// ─── Fix Sentences block ────────────────────────────────────
export interface FixSentenceItem {
  id: string;
  sentence: string; // correct sentence with " | " as separators between parts
}

export interface FixSentencesBlock extends BlockBase {
  type: "fix-sentences";
  instruction: string;
  sentences: FixSentenceItem[];
}

// ─── Verb Table block ───────────────────────────────────────
export interface VerbTableRow {
  id: string;
  person: string; // e.g. "1. Person"
  detail?: string; // e.g. "informell" | "formell"
  pronoun: string; // e.g. "ich", "du", "Sie"
  conjugation: string; // correct conjugated form
  conjugation2?: string; // second conjugation (when splitConjugation is true)
  showOverride?: "show" | "hide" | null; // per-row override for conjugation visibility
  showOverride2?: "show" | "hide" | null; // per-row override for conjugation2 visibility
}

export interface VerbTableBlock extends BlockBase {
  type: "verb-table";
  verb: string; // infinitive form
  splitConjugation?: boolean; // split col 4 into two columns
  showConjugations?: boolean; // show conjugation answers globally
  singularRows: VerbTableRow[];
  pluralRows: VerbTableRow[];
}

// ─── Dialogue block ──────────────────────────────────────────
export type DialogueSpeakerIcon = "triangle" | "square" | "diamond" | "circle";

export interface DialogueItem {
  id: string;
  speaker: string;
  icon: DialogueSpeakerIcon;
  text: string; // supports {{blank:answer}} gap syntax
}

export interface DialogueBlock extends BlockBase {
  type: "dialogue";
  instruction: string;
  items: DialogueItem[];
  showWordBank: boolean;
}

// ─── Chart block ─────────────────────────────────────────────
export type ChartType = "bar" | "pie" | "line";

export interface ChartDataPoint {
  id: string;
  label: string;
  value: number;
  color?: string;
}

export interface ChartBlock extends BlockBase {
  type: "chart";
  chartType: ChartType;
  title?: string;
  data: ChartDataPoint[];
  showLegend: boolean;
  showValues: boolean;
  showGrid: boolean;
  xAxisLabel?: string;
  yAxisLabel?: string;
}

// ─── Numbered Label block ────────────────────────────────────
export interface NumberedLabelBlock extends BlockBase {
  type: "numbered-label";
  startNumber: number;
  prefix: string;
  suffix: string;
}

// ─── Union type ──────────────────────────────────────────────
export type WorksheetBlock =
  | HeadingBlock
  | TextBlock
  | ImageBlock
  | ImageCardsBlock
  | TextCardsBlock
  | SpacerBlock
  | DividerBlock
  | MultipleChoiceBlock
  | FillInBlankBlock
  | MatchingBlock
  | OpenResponseBlock
  | WordBankBlock
  | NumberLineBlock
  | ColumnsBlock
  | TrueFalseMatrixBlock
  | OrderItemsBlock
  | InlineChoicesBlock
  | WordSearchBlock
  | SortingCategoriesBlock
  | UnscrambleWordsBlock
  | FixSentencesBlock
  | VerbTableBlock
  | GlossaryBlock
  | ArticleTrainingBlock
  | ChartBlock
  | NumberedLabelBlock
  | TwoColumnFillBlock
  | DialogueBlock;

// ─── Brand types ────────────────────────────────────────────
export type Brand = "edoomio" | "lingostar";

export interface BrandSettings {
  logo: string;
  organization: string;
  teacher: string;
  headerRight: string;
  footerLeft: string;
  footerCenter: string;
  footerRight: string;
}

export interface BrandFonts {
  bodyFont: string;
  headlineFont: string;
  headlineWeight: number;
  headerFooterFont: string;
  googleFontsUrl: string;
  primaryColor: string;
}

export const DEFAULT_BRAND_SETTINGS: Record<Brand, BrandSettings> = {
  edoomio: {
    logo: "/logo/arbeitsblatt_logo_full_brand.svg",
    organization: "",
    teacher: "",
    headerRight: "",
    footerLeft: "",
    footerCenter: "",
    footerRight: "",
  },
  lingostar: {
    logo: "/logo/lingostar_logo_icon_flat.svg",
    organization: "",
    teacher: "",
    headerRight: "",
    footerLeft: "",
    footerCenter: "",
    footerRight: "",
  },
};

export const BRAND_FONTS: Record<Brand, BrandFonts> = {
  edoomio: {
    bodyFont: "Asap Condensed, sans-serif",
    headlineFont: "Asap Condensed, sans-serif",
    headlineWeight: 700,
    headerFooterFont: "Asap Condensed, sans-serif",
    googleFontsUrl: "https://fonts.googleapis.com/css2?family=Asap+Condensed:wght@400;600;700&display=swap",
    primaryColor: "#1a1a1a",
  },
  lingostar: {
    bodyFont: "Encode Sans, sans-serif",
    headlineFont: "Merriweather, serif",
    headlineWeight: 400,
    headerFooterFont: "Encode Sans, sans-serif",
    googleFontsUrl: "https://fonts.googleapis.com/css2?family=Encode+Sans:wght@400;500;600&family=Merriweather:wght@400;700&family=Nunito:wght@400;600;700;800&display=swap",
    primaryColor: "#3a4f40",
  },
};

// ─── CH overrides for Swiss locale ──────────────────────────
/** Per-block, per-field Swiss German text overrides.
 *  Keyed by blockId → fieldPath (dot-notation) → override text.
 *  Example: { "abc123": { "question": "Welches Velo…", "options.1.text": "parkieren" } }
 */
export type ChOverrides = Record<string, Record<string, string>>;

// ─── Worksheet settings ─────────────────────────────────────
export interface WorksheetSettings {
  pageSize: "a4" | "letter";
  orientation: "portrait" | "landscape";
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  showHeader: boolean;
  showFooter: boolean;
  headerText: string;
  footerText: string;
  fontSize: number;
  fontFamily: string;
  brand: Brand;
  brandSettings: BrandSettings;
  chOverrides?: ChOverrides;
  coverSubtitle: string;       // Subtitle shown on the cover page
  coverInfoText: string;       // Info text shown below the cover images
  coverImages: string[];       // Up to 4 cover images for the title page
  coverImageBorder: boolean;   // Show border around cover images
}

// ─── Worksheet document ─────────────────────────────────────
export interface WorksheetDocument {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  blocks: WorksheetBlock[];
  settings: WorksheetSettings;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Default settings ───────────────────────────────────────
export const DEFAULT_SETTINGS: WorksheetSettings = {
  pageSize: "a4",
  orientation: "portrait",
  margins: { top: 20, right: 20, bottom: 20, left: 20 },
  showHeader: true,
  showFooter: true,
  headerText: "",
  footerText: "",
  fontSize: 14,
  fontFamily: "Asap Condensed, sans-serif",
  brand: "edoomio",
  brandSettings: DEFAULT_BRAND_SETTINGS["edoomio"],
  coverSubtitle: "Arbeitsblatt",
  coverInfoText: "",
  coverImages: [],
  coverImageBorder: false,
};

// ─── Block library definitions ──────────────────────────────
export interface BlockDefinition {
  type: BlockType;
  label: string;
  description: string;
  labelKey: string; // i18n key in "blocks" namespace
  descriptionKey: string; // i18n key in "blocks" namespace
  icon: string; // lucide icon name
  category: "layout" | "content" | "interactive";
  /** Per-locale fallback translations (label + description). English uses label/description fields. */
  translations?: Record<string, { label: string; description: string }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  defaultData: Record<string, any> & { type: BlockType; visibility: BlockVisibility };
}

export const BLOCK_LIBRARY: BlockDefinition[] = [
  // Layout blocks
  {
    type: "heading",
    label: "Heading",
    description: "Title or section heading",
    labelKey: "heading",
    descriptionKey: "headingDesc",
    icon: "Heading",
    category: "content",
    translations: { de: { label: "Überschrift", description: "Titel und Überschriften hinzufügen" } },
    defaultData: {
      type: "heading",
      content: "Heading",
      level: 1,
      visibility: "both",
    },
  },
  {
    type: "text",
    label: "Text",
    description: "Rich text paragraph",
    labelKey: "text",
    descriptionKey: "textDesc",
    icon: "Type",
    category: "content",
    translations: { de: { label: "Text", description: "Absätze mit formatiertem Text" } },
    defaultData: {
      type: "text",
      content: "<p>Enter text here...</p>",
      visibility: "both",
    },
  },
  {
    type: "image",
    label: "Image",
    description: "Insert an image",
    labelKey: "image",
    descriptionKey: "imageDesc",
    icon: "Image",
    category: "content",
    translations: { de: { label: "Bild", description: "Bilder und Abbildungen einfügen" } },
    defaultData: {
      type: "image",
      src: "",
      alt: "",
      visibility: "both",
    },
  },
  {
    type: "image-cards",
    label: "Image Cards",
    description: "Grid of images with captions",
    labelKey: "imageCards",
    descriptionKey: "imageCardsDesc",
    icon: "LayoutGrid",
    category: "content",
    translations: { de: { label: "Bildkarten", description: "Bilder im Raster mit Beschriftung" } },
    defaultData: {
      type: "image-cards",
      items: [
        { id: "card1", src: "", alt: "", text: "Caption 1" },
        { id: "card2", src: "", alt: "", text: "Caption 2" },
      ],
      columns: 2,
      imageAspectRatio: "1:1",
      imageScale: 100,
      showWritingLines: false,
      writingLinesCount: 1,
      showWordBank: false,
      visibility: "both",
    },
  },
  {
    type: "text-cards",
    label: "Text Cards",
    description: "Grid of text items with optional writing lines",
    labelKey: "textCards",
    descriptionKey: "textCardsDesc",
    icon: "LayoutList",
    category: "content",
    translations: { de: { label: "Textkarten", description: "Text im Raster mit Schreiblinien" } },
    defaultData: {
      type: "text-cards",
      items: [
        { id: "card1", text: "Text 1", caption: "Caption 1" },
        { id: "card2", text: "Text 2", caption: "Caption 2" },
      ],
      columns: 2,
      textSize: "base",
      textAlign: "center",
      textBold: false,
      textItalic: false,
      showBorder: true,
      showWritingLines: false,
      writingLinesCount: 1,
      showWordBank: false,
      visibility: "both",
    },
  },
  {
    type: "spacer",
    label: "Spacer",
    description: "Add vertical spacing",
    labelKey: "spacer",
    descriptionKey: "spacerDesc",
    icon: "Space",
    category: "layout",
    translations: { de: { label: "Abstand", description: "Vertikalen Abstand hinzufügen" } },
    defaultData: {
      type: "spacer",
      height: 40,
      visibility: "both",
    },
  },
  {
    type: "divider",
    label: "Divider",
    description: "Horizontal line separator",
    labelKey: "divider",
    descriptionKey: "dividerDesc",
    icon: "Minus",
    category: "layout",
    translations: { de: { label: "Trennlinie", description: "Horizontale Trennlinie einfügen" } },
    defaultData: {
      type: "divider",
      style: "solid",
      visibility: "both",
    },
  },
  {
    type: "columns",
    label: "Columns",
    description: "Multi-column layout",
    labelKey: "columnsLabel",
    descriptionKey: "columnsDesc",
    icon: "Columns2",
    category: "layout",
    translations: { de: { label: "Spalten", description: "Inhalt in Spalten anordnen" } },
    defaultData: {
      type: "columns",
      columns: 2,
      children: [[], []],
      visibility: "both",
    },
  },
  // Interactive blocks
  {
    type: "multiple-choice",
    label: "Multiple Choice",
    description: "Question with selectable answers",
    labelKey: "multipleChoice",
    descriptionKey: "multipleChoiceDesc",
    icon: "CircleDot",
    category: "interactive",
    translations: { de: { label: "Multiple Choice", description: "Fragen mit Antwortoptionen" } },
    defaultData: {
      type: "multiple-choice",
      question: "Enter your question here",
      options: [
        { id: "opt1", text: "Option A", isCorrect: true },
        { id: "opt2", text: "Option B", isCorrect: false },
        { id: "opt3", text: "Option C", isCorrect: false },
        { id: "opt4", text: "Option D", isCorrect: false },
      ],
      allowMultiple: false,
      visibility: "both",
    },
  },
  {
    type: "fill-in-blank",
    label: "Fill in the Blank",
    description: "Text with blanks to fill in",
    labelKey: "fillInBlank",
    descriptionKey: "fillInBlankDesc",
    icon: "TextCursorInput",
    category: "interactive",
    translations: { de: { label: "Lückentext", description: "Sätze mit Lücken zum Ausfüllen" } },
    defaultData: {
      type: "fill-in-blank",
      content: "The {{blank:answer}} is the correct word.",
      visibility: "both",
    },
  },
  {
    type: "matching",
    label: "Matching",
    description: "Match items from two columns",
    labelKey: "matching",
    descriptionKey: "matchingDesc",
    icon: "ArrowLeftRight",
    category: "interactive",
    translations: { de: { label: "Zuordnung XXX", description: "Zusammengehörige Paare verbinden" } },
    defaultData: {
      type: "matching",
      instruction: "Match the items on the left with the items on the right.",
      pairs: [
        { id: "p1", left: "Item 1", right: "Match 1" },
        { id: "p2", left: "Item 2", right: "Match 2" },
        { id: "p3", left: "Item 3", right: "Match 3" },
      ],
      extendedRows: false,
      visibility: "both",
    },
  },
  {
    type: "two-column-fill",
    label: "Two-Column Fill",
    description: "Two columns where students fill in one side",
    labelKey: "twoColumnFill",
    descriptionKey: "twoColumnFillDesc",
    icon: "Columns2",
    category: "interactive",
    translations: { de: { label: "Zwei-Spalten-Ausfüllen", description: "Zwei Spalten, eine Seite ausfüllen" } },
    defaultData: {
      type: "two-column-fill",
      instruction: "Fill in the missing items.",
      items: [
        { id: "i1", left: "Item 1", right: "Answer 1" },
        { id: "i2", left: "Item 2", right: "Answer 2" },
        { id: "i3", left: "Item 3", right: "Answer 3" },
      ],
      fillSide: "right",
      colRatio: "1-1",
      extendedRows: false,
      showWordBank: false,
      visibility: "both",
    },
  },
  {
    type: "open-response",
    label: "Open Response",
    description: "Free-form writing area",
    labelKey: "openResponse",
    descriptionKey: "openResponseDesc",
    icon: "PenLine",
    category: "interactive",
    translations: { de: { label: "Offene Antwort", description: "Freitext-Antwortfeld" } },
    defaultData: {
      type: "open-response",
      question: "Write your answer below:",
      lines: 4,
      visibility: "both",
    },
  },
  {
    type: "word-bank",
    label: "Word Bank",
    description: "Bank of words for reference",
    labelKey: "wordBank",
    descriptionKey: "wordBankDesc",
    icon: "LayoutList",
    category: "interactive",
    translations: { de: { label: "Wortbank", description: "Wortsammlung als Hilfestellung" } },
    defaultData: {
      type: "word-bank",
      words: ["word1", "word2", "word3", "word4"],
      visibility: "both",
    },
  },
  {
    type: "true-false-matrix",
    label: "True/False Matrix",
    description: "Evaluate statements as true or false",
    labelKey: "trueFalseMatrix",
    descriptionKey: "trueFalseMatrixDesc",
    icon: "CheckSquare",
    category: "interactive",
    translations: { de: { label: "Richtig/Falsch", description: "Aussagen als richtig oder falsch bewerten" } },
    defaultData: {
      type: "true-false-matrix",
      instruction: "Mark each statement as True or False.",
      statements: [
        { id: "s1", text: "Statement 1", correctAnswer: true },
        { id: "s2", text: "Statement 2", correctAnswer: false },
        { id: "s3", text: "Statement 3", correctAnswer: true },
      ],
      visibility: "both",
    },
  },
  {
    type: "order-items",
    label: "Order Items",
    description: "Put items in the correct order",
    labelKey: "orderItems",
    descriptionKey: "orderItemsDesc",
    icon: "ListOrdered",
    category: "interactive",
    translations: { de: { label: "Reihenfolge", description: "Elemente in die richtige Reihenfolge bringen" } },
    defaultData: {
      type: "order-items",
      instruction: "Put the following items in the correct order.",
      items: [
        { id: "oi1", text: "First item", correctPosition: 1 },
        { id: "oi2", text: "Second item", correctPosition: 2 },
        { id: "oi3", text: "Third item", correctPosition: 3 },
        { id: "oi4", text: "Fourth item", correctPosition: 4 },
      ],
      visibility: "both",
    },
  },
  {
    type: "inline-choices",
    label: "Inline Choices",
    description: "Text with inline multiple choice options",
    labelKey: "inlineChoices",
    descriptionKey: "inlineChoicesDesc",
    icon: "TextSelect",
    category: "interactive",
    translations: { de: { label: "Inline-Auswahl", description: "Auswahlmöglichkeiten im Text" } },
    defaultData: {
      type: "inline-choices",
      items: [
        { id: "ic-default-1", content: "In {{1988|1889|1898}} he was born in London." },
      ],
      visibility: "both",
    },
  },
  {
    type: "word-search",
    label: "Word Search",
    description: "Word search puzzle grid",
    labelKey: "wordSearch",
    descriptionKey: "wordSearchDesc",
    icon: "Search",
    category: "interactive",
    translations: { de: { label: "Wörterrätsel", description: "Versteckte Wörter im Buchstabengitter finden" } },
    defaultData: {
      type: "word-search",
      words: ["HELLO", "WORLD", "SEARCH", "FIND"],
      gridCols: 24,
      gridRows: 12,
      grid: [],
      showWordList: true,
      visibility: "both",
    },
  },
  {
    type: "sorting-categories",
    label: "Sorting Categories",
    description: "Sort items into labeled categories",
    labelKey: "sortingCategories",
    descriptionKey: "sortingCategoriesDesc",
    icon: "Group",
    category: "interactive",
    translations: { de: { label: "Sortieren", description: "Begriffe in Kategorien einordnen" } },
    defaultData: {
      type: "sorting-categories",
      instruction: "",
      categories: [
        { id: "cat1", label: "Category A", correctItems: ["si1", "si2"] },
        { id: "cat2", label: "Category B", correctItems: ["si3", "si4"] },
      ],
      items: [
        { id: "si1", text: "Item 1" },
        { id: "si2", text: "Item 2" },
        { id: "si3", text: "Item 3" },
        { id: "si4", text: "Item 4" },
      ],
      showWritingLines: true,
      visibility: "both",
    },
  },
  {
    type: "unscramble-words",
    label: "Unscramble Words",
    description: "Unscramble jumbled letters to form words",
    labelKey: "unscrambleWords",
    descriptionKey: "unscrambleWordsDesc",
    icon: "Shuffle",
    category: "interactive",
    translations: { de: { label: "Wörter entwirren", description: "Buchstaben in die richtige Reihenfolge bringen" } },
    defaultData: {
      type: "unscramble-words",
      instruction: "",
      words: [
        { id: "uw1", word: "school" },
        { id: "uw2", word: "teacher" },
        { id: "uw3", word: "garden" },
      ],
      keepFirstLetter: false,
      lowercaseAll: false,
      itemOrder: undefined,
      visibility: "both",
    },
  },
  {
    type: "fix-sentences",
    label: "Fix Sentences",
    description: "Reorder sentence parts into correct order",
    labelKey: "fixSentences",
    descriptionKey: "fixSentencesDesc",
    icon: "WrapText",
    category: "interactive",
    translations: { de: { label: "Sätze korrigieren", description: "Fehlerhafte Sätze berichtigen" } },
    defaultData: {
      type: "fix-sentences",
      instruction: "Put the sentence parts in the correct order.",
      sentences: [
        { id: "fs1", sentence: "The cat | sat on | the mat" },
        { id: "fs2", sentence: "I like | to eat | ice cream" },
      ],
      visibility: "both",
    },
  },
  {
    type: "verb-table",
    label: "Verb Table",
    description: "Conjugation table for verbs",
    labelKey: "verbTable",
    descriptionKey: "verbTableDesc",
    icon: "TableProperties",
    category: "interactive",
    translations: { de: { label: "Verbtabelle", description: "Verbkonjugationen üben" } },
    defaultData: {
      type: "verb-table",
      verb: "machen",
      singularRows: [
        { id: "s1", person: "1. Person", pronoun: "ich", conjugation: "mache" },
        { id: "s2", person: "2. Person", detail: "informell", pronoun: "du", conjugation: "machst" },
        { id: "s3", person: "2. Person", detail: "formell", pronoun: "Sie", conjugation: "machen" },
        { id: "s4", person: "3. Person", pronoun: "er / sie / es", conjugation: "macht" },
      ],
      pluralRows: [
        { id: "p1", person: "1. Person", pronoun: "wir", conjugation: "machen" },
        { id: "p2", person: "2. Person", detail: "informell", pronoun: "ihr", conjugation: "macht" },
        { id: "p3", person: "2. Person", detail: "formell", pronoun: "Sie", conjugation: "machen" },
        { id: "p4", person: "3. Person", pronoun: "sie", conjugation: "machen" },
      ],
      visibility: "both",
    },
  },
  {
    type: "glossary",
    label: "Glossary",
    description: "Term-definition list",
    labelKey: "glossary",
    descriptionKey: "glossaryDesc",
    icon: "BookOpen",
    category: "content",
    translations: { de: { label: "Glossar", description: "Begriffe und Definitionen" } },
    defaultData: {
      type: "glossary",
      instruction: "",
      pairs: [
        { id: "g1", term: "Term 1", definition: "Definition 1" },
        { id: "g2", term: "Term 2", definition: "Definition 2" },
        { id: "g3", term: "Term 3", definition: "Definition 3" },
      ],
      visibility: "both",
    },
  },
  {
    type: "article-training",
    label: "Article Training",
    description: "Practice German articles (der/das/die)",
    labelKey: "articleTraining",
    descriptionKey: "articleTrainingDesc",
    icon: "BookA",
    category: "interactive",
    translations: { de: { label: "Artikel-Training", description: "Deutsche Artikel (der/das/die) üben" } },
    defaultData: {
      type: "article-training",
      instruction: "Kreuze den richtigen Artikel an.",
      showWritingLine: true,
      items: [
        { id: "at1", text: "Hund", correctArticle: "der" },
        { id: "at2", text: "Katze", correctArticle: "die" },
        { id: "at3", text: "Haus", correctArticle: "das" },
      ],
      visibility: "both",
    },
  },
  {
    type: "chart",
    label: "Chart",
    description: "Bar, pie, or line chart",
    labelKey: "chart",
    descriptionKey: "chartDesc",
    icon: "BarChart3",
    category: "content",
    translations: { de: { label: "Diagramm", description: "Balken-, Kreis- oder Liniendiagramm" } },
    defaultData: {
      type: "chart",
      chartType: "bar",
      title: "",
      data: [
        { id: "d1", label: "A", value: 40, color: "#6366f1" },
        { id: "d2", label: "B", value: 70, color: "#8b5cf6" },
        { id: "d3", label: "C", value: 55, color: "#a78bfa" },
        { id: "d4", label: "D", value: 90, color: "#c4b5fd" },
      ],
      showLegend: false,
      showValues: true,
      showGrid: true,
      xAxisLabel: "",
      yAxisLabel: "",
      visibility: "both",
    },
  },
  {
    type: "dialogue",
    label: "Dialogue",
    description: "Dialogue with speaker icons and gaps",
    labelKey: "dialogue",
    descriptionKey: "dialogueDesc",
    icon: "MessageCircle",
    category: "interactive",
    translations: { de: { label: "Dialog", description: "Dialog mit Sprechersymbolen und Lücken" } },
    defaultData: {
      type: "dialogue",
      instruction: "",
      items: [
        { id: "dl1", speaker: "A", icon: "triangle", text: "Hello, how are you?" },
        { id: "dl2", speaker: "B", icon: "circle", text: "I am fine, thank you!" },
      ],
      showWordBank: false,
      visibility: "both",
    },
  },
  {
    type: "numbered-label",
    label: "Numbered Label",
    description: "Auto-incrementing numbered label with optional text",
    labelKey: "numberedLabel",
    descriptionKey: "numberedLabelDesc",
    icon: "Hash",
    category: "content",
    translations: { de: { label: "Nummerierung", description: "Fortlaufende Nummerierung mit optionalem Text" } },
    defaultData: {
      type: "numbered-label",
      startNumber: 1,
      prefix: "",
      suffix: "",
      visibility: "both",
    },
  },
];
