// ─── Visibility ──────────────────────────────────────────────
export type BlockVisibility = "both" | "print" | "online";

export interface BlockDisplayOn {
  course?: boolean;
  worksheetOnline?: boolean;
  worksheetPrint?: boolean;
}

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
  | "complete-sentences"
  | "transform-sentences"
  | "verb-table"
  | "text-cards"
  | "glossary"
  | "article-training"
  | "chart"
  | "numbered-label"
  | "two-column-fill"
  | "dialogue"
  | "fill-in-blank-items"
  | "page-break"
  | "writing-lines"
  | "writing-rows"
  | "linked-blocks"
  | "text-snippet"
  | "email-skeleton"
  | "job-application"
  | "dos-and-donts"
  | "numbered-items"
  | "logo-divider"
  | "ai-prompt"
  | "ai-tool"
  | "table"
  | "text-comparison"
  | "accordion"
  | "audio"
  | "schedule"
  | "website"
  | "checklist"
  | "grid";

// ─── Base block ──────────────────────────────────────────────
export interface BlockBase {
  id: string;
  type: BlockType;
  visibility: BlockVisibility;
  displayOn?: BlockDisplayOn;
}

// ─── Heading block ───────────────────────────────────────────
export interface HeadingBlock extends BlockBase {
  type: "heading";
  content: string;
  level: 1 | 2 | 3;
  bilingual?: boolean;
  skipTranslation?: boolean;
}

// ─── Text / Rich-text block ─────────────────────────────────
export type TextBlockStyle = "standard" | "example" | "example-standard" | "example-improved" | "example-primary" | "example-secondary" | "frame" | "frame-primary" | "frame-secondary" | "fragen" | "hinweis" | "hinweis-wichtig" | "hinweis-alarm" | "lernziel" | "kompetenzziele" | "handlungsziele" | "redemittel" | "metadaten" | "rows";

export interface TextBlock extends BlockBase {
  type: "text";
  content: string; // HTML string for WYSIWYG
  textStyle?: TextBlockStyle;
  comment?: string;
  imageSrc?: string;
  imageAlign?: "left" | "right";
  imageScale?: number; // 10-100, percentage of container width
  bilingual?: boolean; // Show original + translation side-by-side in translated worksheets
  bilingualDivider?: boolean; // Show vertical divider in bilingual two-column layout
  skipTranslation?: boolean;
  tightTop?: boolean; // Collapse block gap above so spacing equals p-to-p spacing
}

// ─── Image block ─────────────────────────────────────────────
export type ImageBlockStyle = "standard" | "example";

export interface ImageBlock extends BlockBase {
  type: "image";
  src: string;
  alt: string;
  width?: number;
  height?: number;
  caption?: string;
  imageStyle?: ImageBlockStyle;
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

// ─── Logo Divider block ──────────────────────────────────────
export interface LogoDividerBlock extends BlockBase {
  type: "logo-divider";
}

// ─── Table block ─────────────────────────────────────────────
export type TableStyle = "default" | "striped" | "bordered" | "minimal";

export interface TableBlock extends BlockBase {
  type: "table";
  content: string;
  tableStyle?: TableStyle;
  caption?: string;
  columnWidths?: number[];
  bilingual?: boolean;
  firstRowAsExample?: boolean;
  skipTranslation?: boolean;
}

export const BRAND_ICON_LOGOS: Record<string, string> = {
  edoomio: "/logo/arbeitsblatt_logo_icon.svg",
  lingostar: "/logo/lingostar_logo_icon_flat.svg",
  "agi-frauenfeld": "/logo/logo-stadt-frauenfeld.svg",
};

// ─── Multiple-choice block ──────────────────────────────────
export interface MultipleChoiceOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface MultipleChoiceBlock extends BlockBase {
  type: "multiple-choice";
  instruction: string;
  question: string;
  options: MultipleChoiceOption[];
  allowMultiple: boolean;
}

// ─── Fill-in-blank block ────────────────────────────────────
export interface FillInBlankBlock extends BlockBase {
  type: "fill-in-blank";
  // Text with blanks marked as {{blank:answer}}
  content: string;
  instruction?: string;
}

// ─── Fill-in-blank items block ──────────────────────────────
export interface FillInBlankItem {
  id: string;
  content: string; // text with {{blank:answer}} gaps
}

export interface FillInBlankItemsBlock extends BlockBase {
  type: "fill-in-blank-items";
  instruction: string;
  items: FillInBlankItem[];
  showWordBank: boolean;
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
  example?: string;
}

export interface GlossaryBlock extends BlockBase {
  type: "glossary";
  instruction: string;
  pairs: GlossaryPair[];
  leftColWidth?: 25 | 33 | 50 | 66;
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
  columnBgColors?: string[];
  columnBorderColors?: string[];
  columnBorders?: boolean[];
  /** @deprecated Use columnBorders[] instead */
  showBorder?: boolean;
}

// ─── Grid block (layout) ─────────────────────────────────────
export interface GridBlock extends BlockBase {
  type: "grid";
  rows: number;
  cols: number;
  rowGap: number;
  colGap: number;
  children: WorksheetBlock[][]; // flat array of cells, length = rows * cols
}

// ─── True/False Matrix block ─────────────────────────────────
export interface TrueFalseMatrixBlock extends BlockBase {
  type: "true-false-matrix";
  instruction: string;
  statementColumnHeader?: string;
  trueLabel?: string;
  falseLabel?: string;
  showPill?: boolean;
  statements: {
    id: string;
    text: string;
    correctAnswer: boolean; // true = True, false = False
  }[];
  statementOrder?: string[]; // persisted shuffled order of statement IDs (Fisher-Yates)
}

// ─── Article Training block ──────────────────────────────────
export type ArticleAnswer = "der" | "das" | "die";

export interface ArticleTrainingBlock extends BlockBase {
  type: "article-training";
  instruction?: string;
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
  showPill?: boolean;
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
  instruction?: string;
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
  showPill?: boolean;
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
  showFirstAsExample?: boolean;
}

// ─── Complete Sentences block ───────────────────────────────
export interface CompleteSentenceItem {
  id: string;
  beginning: string; // sentence beginning the user must complete
}

export interface CompleteSentencesBlock extends BlockBase {
  type: "complete-sentences";
  instruction: string;
  sentences: CompleteSentenceItem[];
}

export interface TransformSentencesBlock extends BlockBase {
  type: "transform-sentences";
  instruction: string;
  sentences: TransformSentenceItem[];
  showFirstAsExample?: boolean;
}

export interface TransformSentenceItem {
  id: string;
  beginning: string;
  solution?: string;
}

// ─── Verb Table block ───────────────────────────────────────
export type VerbTableTense = "praesens" | "praeteritum" | "perfekt" | "plusquamperfekt" | "futur1" | "konjunktiv2";

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
  tense?: VerbTableTense; // which tense was generated
  showInfinitive?: boolean; // show/hide infinitive header (default true)
  infinitiveOverride?: string; // override text for infinitive display
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
  bilingual?: boolean;
  skipTranslation?: boolean;
}

// ─── Page Break block ────────────────────────────────────────
export interface PageBreakBlock extends BlockBase {
  type: "page-break";
  restartPageNumbering?: boolean;
}

// ─── Writing Lines block ─────────────────────────────────────
export interface WritingLinesBlock extends BlockBase {
  type: "writing-lines";
  lineCount: number;
  lineSpacing: number; // px height per line row
}

// ─── Writing Rows block ──────────────────────────────────────
export interface WritingRowsBlock extends BlockBase {
  type: "writing-rows";
  rowCount: number;
}

// ─── Text Snippet block ──────────────────────────────────────
export interface TextSnippetBlock extends BlockBase {
  type: "text-snippet";
  content: string; // HTML string for WYSIWYG
  /** Populated by applyTranslations – holds the translated HTML while content stays DE. */
  translatedContent?: string;
  /** When true, render original and translation side-by-side in two columns. */
  bilingual?: boolean;
}

// ─── Email Skeleton block ─────────────────────────────────────
export type EmailSkeletonStyle = "none" | "standard" | "teal";

export interface EmailAttachment {
  id: string;
  name: string;
}

export interface EmailSkeletonBlock extends BlockBase {
  type: "email-skeleton";
  from: string;
  to: string;
  subject: string;
  body: string; // HTML string for WYSIWYG
  emailStyle: EmailSkeletonStyle;
  attachments: EmailAttachment[];
  comment?: string;
}

// ─── Job Application block ────────────────────────────────────
export type JobApplicationStyle = "none" | "standard" | "teal";

export interface JobApplicationBlock extends BlockBase {
  type: "job-application";
  firstName: string;
  applicantName: string;
  email: string;
  phone: string;
  position: string;
  message: string; // HTML string for WYSIWYG
  applicationStyle: JobApplicationStyle;
  comment?: string;
}

// ─── Text Comparison block ───────────────────────────────────
export interface TextComparisonBlock extends BlockBase {
  type: "text-comparison";
  leftContent: string;  // HTML rich text
  rightContent: string; // HTML rich text
  comment?: string;
}

// ─── Dos and Don'ts block ────────────────────────────────────
export interface DosAndDontsItem {
  id: string;
  text: string;
}

export interface DosAndDontsBlock extends BlockBase {
  type: "dos-and-donts";
  layout: "horizontal" | "vertical";
  showTitles: boolean;
  dosTitle: string;
  dontsTitle: string;
  dos: DosAndDontsItem[];
  donts: DosAndDontsItem[];
}

// ─── Numbered Items block ─────────────────────────────────────
export interface NumberedItem {
  id: string;
  content: string; // HTML string for WYSIWYG
}

export interface NumberedItemsBlock extends BlockBase {
  type: "numbered-items";
  items: NumberedItem[];
  startNumber: number;
  bgColor?: string;
  borderRadius?: number;
  bilingual?: boolean;
  skipTranslation?: boolean;
}

// ─── Checklist block ────────────────────────────────────────
export interface ChecklistItem {
  id: string;
  content: string; // HTML string for WYSIWYG
  writingLines?: number;
}

export interface ChecklistBlock extends BlockBase {
  type: "checklist";
  items: ChecklistItem[];
  bilingual?: boolean;
}

// ─── Accordion block ─────────────────────────────────────────
export interface AccordionItem {
  id: string;
  title: string;
  children: WorksheetBlock[];
}

export interface AccordionBlock extends BlockBase {
  type: "accordion";
  items: AccordionItem[];
  showNumbers?: boolean;
}

// ─── Audio block ─────────────────────────────────────────────
export interface AudioBlock extends BlockBase {
  type: "audio";
  src: string;       // audio file URL
  title?: string;    // optional display title
}

// ─── Schedule block ──────────────────────────────────────────
export interface ScheduleItem {
  id: string;
  date: string;  // YYYY-MM-DD
  start: string; // HH:mm
  end: string;   // HH:mm
  room: string;
  title: string;
  description: string;
}

export interface ScheduleBlock extends BlockBase {
  type: "schedule";
  items: ScheduleItem[];
  bilingual?: boolean;
  showDate?: boolean;
  showRoom?: boolean;
  showHeader?: boolean;
}

// ─── Website block ───────────────────────────────────────────
export interface WebsiteItem {
  id: string;
  title: string;
  url: string;
  category: string;
  description: string;
  image?: string;
  aggregator?: boolean;
  pageBreakAfter?: boolean;
}

export interface WebsiteBlock extends BlockBase {
  type: "website";
  title: string;
  level: 1 | 2 | 3;
  items: WebsiteItem[];
  bilingual?: boolean;
  skipTranslation?: boolean;
}

// ─── AI Prompt block ─────────────────────────────────────────
export interface AiPromptBlock extends BlockBase {
  type: "ai-prompt";
  instructions: string;       // instructions shown to the user
  description: string;        // block description / label
  variableName: string;       // name for the textarea value, used in prompt shortcode
  prompt: string;             // prompt template with {{variableName}} shortcode
  userInput: string;          // current textarea value (runtime)
  aiResult: string;           // AI response (runtime)
}

// ─── AI Tool block ───────────────────────────────────────────
export interface AiToolBlock extends BlockBase {
  type: "ai-tool";
  toolKey: string;          // references code-owned AI tool registry entry
  toolTitle: string;        // display name
  toolDescription: string;  // display description
  latestRunId?: string;     // current session run id for workflow tools
}

// ─── Linked Blocks block ─────────────────────────────────────
export interface LinkedBlocksBlock extends BlockBase {
  type: "linked-blocks";
  worksheetId: string;
  worksheetTitle: string;
  worksheetSlug: string;
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
  | CompleteSentencesBlock
  | TransformSentencesBlock
  | VerbTableBlock
  | GlossaryBlock
  | ArticleTrainingBlock
  | ChartBlock
  | NumberedLabelBlock
  | TwoColumnFillBlock
  | DialogueBlock
  | FillInBlankItemsBlock
  | PageBreakBlock
  | WritingLinesBlock
  | WritingRowsBlock
  | LinkedBlocksBlock
  | TextSnippetBlock
  | EmailSkeletonBlock
  | JobApplicationBlock
  | TextComparisonBlock
  | DosAndDontsBlock
  | NumberedItemsBlock
  | ChecklistBlock
  | LogoDividerBlock
  | AccordionBlock
  | AudioBlock
  | ScheduleBlock
  | WebsiteBlock
  | AiPromptBlock
  | AiToolBlock
  | TableBlock
  | GridBlock;

// ─── Brand types ────────────────────────────────────────────

/**
 * DB-backed brand profile. All brand-specific settings live here.
 * Worksheets reference a brand by slug and inherit everything.
 */
export interface TranslationFontOverride {
  fontFamily: string;
  googleFontsUrl?: string | null;
}

export type TranslationFontOverrides = Record<string, TranslationFontOverride>;

export interface BrandGameSettings {
  kartenpaare?: {
    itemABackImage?: string | null;
    itemBBackImage?: string | null;
  };
}

export interface BrandProfile {
  id: string;
  name: string;
  slug: string;

  // Typography
  bodyFont: string;
  headlineFont: string;
  headlineWeight: number;
  subHeadlineFont: string;
  subHeadlineWeight: number;
  headerFooterFont: string;
  googleFontsUrl: string;
  translationFontOverrides?: TranslationFontOverrides | null;

  // Font sizes & weights per heading level and text base
  h1Size?: string | null;
  h1Weight?: number | null;
  h2Size?: string | null;
  h2Weight?: number | null;
  h3Size?: string | null;
  h3Weight?: number | null;
  textBaseSize?: string | null;

  // Colors
  primaryColor: string;
  accentColor?: string | null;
  interactiveColor: string;

  // Assets
  logo: string;
  iconLogo?: string | null;
  favicon?: string | null;

  // Layout defaults
  organization: string;
  teacher: string;
  headerRight: string;
  footerLeft: string;
  footerCenter: string;
  footerRight: string;

  // PDF settings
  pdfFontSize?: number | null;
  pdfTranslationScale?: number | null;

  // Game settings
  gameSettings?: BrandGameSettings | null;

  // Meta
  pageTitle?: string | null;

  createdAt?: string;
  updatedAt?: string;

  // Sub-profiles
  subProfiles?: BrandSubProfile[];
}

/**
 * Sub-profile for a brand. Provides two variants of header/footer content:
 * - Variant 1 (v1): multiline (detailed)
 * - Variant 2 (v2): single line (compact)
 * Layouts choose which variant to use.
 */
export interface BrandSubProfile {
  id: string;
  name: string;
  brandProfileId: string;

  // Variant 1 — multiline
  headerLeftV1: string;
  headerRightV1: string;
  footerLeftV1: string;
  footerRightV1: string;

  // Variant 2 — single line
  headerLeftV2: string;
  headerRightV2: string;
  footerLeftV2: string;
  footerRightV2: string;

  createdAt?: string;
  updatedAt?: string;
}

/** Per-worksheet overrides — only layout fields can be overridden. */
export interface BrandOverrides {
  logo?: string;
  organization?: string;
  teacher?: string;
  headerRight?: string;
  footerLeft?: string;
  footerCenter?: string;
  footerRight?: string;
}

// ─── Legacy Brand types (backward compat) ───────────────────
/** @deprecated Use BrandProfile.slug instead */
export type Brand = string;

/** @deprecated Use BrandOverrides instead */
export interface BrandSettings {
  logo: string;
  organization: string;
  teacher: string;
  headerRight: string;
  footerLeft: string;
  footerCenter: string;
  footerRight: string;
}

/** @deprecated Fonts now live on BrandProfile */
export interface BrandFonts {
  bodyFont: string;
  headlineFont: string;
  headlineWeight: number;
  subHeadlineFont: string;
  subHeadlineWeight: number;
  headerFooterFont: string;
  googleFontsUrl: string;
  primaryColor: string;
}

/** @deprecated Use BrandProfile from API. Kept as static fallback. */
export const DEFAULT_BRAND_SETTINGS: Record<string, BrandSettings> = {
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
  "agi-frauenfeld": {
    logo: "/logo/logo-stadt-frauenfeld.svg",
    organization: "",
    teacher: "",
    headerRight: "",
    footerLeft: "",
    footerCenter: "",
    footerRight: "",
  },
};

/** @deprecated Use BrandProfile from API. Kept as static fallback. */
export const BRAND_FONTS: Record<string, BrandFonts> = {
  edoomio: {
    bodyFont: "Asap Condensed, sans-serif",
    headlineFont: "Asap Condensed, sans-serif",
    headlineWeight: 700,
    subHeadlineFont: "Asap Condensed, sans-serif",
    subHeadlineWeight: 700,
    headerFooterFont: "Asap Condensed, sans-serif",
    googleFontsUrl: "https://fonts.googleapis.com/css2?family=Asap+Condensed:wght@400;600;700&display=swap",
    primaryColor: "#1a1a1a",
  },
  lingostar: {
    bodyFont: "Encode Sans, sans-serif",
    headlineFont: "Merriweather, serif",
    headlineWeight: 400,
    subHeadlineFont: "Encode Sans, sans-serif",
    subHeadlineWeight: 600,
    headerFooterFont: "Encode Sans, sans-serif",
    googleFontsUrl: "https://fonts.googleapis.com/css2?family=Encode+Sans:wght@400;500;600&family=Merriweather:wght@400;700&family=Nunito:wght@400;600;700;800&display=swap",
    primaryColor: "#3a4f40",
  },
  "agi-frauenfeld": {
    bodyFont: "Encode Sans Semi Condensed, sans-serif",
    headlineFont: "Encode Sans Semi Condensed, sans-serif",
    headlineWeight: 700,
    subHeadlineFont: "Encode Sans Semi Condensed, sans-serif",
    subHeadlineWeight: 700,
    headerFooterFont: "Encode Sans Semi Condensed, sans-serif",
    googleFontsUrl: "https://fonts.googleapis.com/css2?family=Encode+Sans+Semi+Condensed:wght@100;200;300;400;500;600;700;800;900&display=swap",
    primaryColor: "#e75325",
  },
};

/**
 * Build a BrandProfile from the static fallback constants.
 * Used when the DB profile is not yet loaded.
 */
export function getStaticBrandProfile(slug: string): BrandProfile {
  const fonts = BRAND_FONTS[slug] ?? BRAND_FONTS["edoomio"];
  const settings = DEFAULT_BRAND_SETTINGS[slug] ?? DEFAULT_BRAND_SETTINGS["edoomio"];
  return {
    id: "",
    name: slug,
    slug,
    bodyFont: fonts.bodyFont,
    headlineFont: fonts.headlineFont,
    headlineWeight: fonts.headlineWeight,
    subHeadlineFont: fonts.subHeadlineFont,
    subHeadlineWeight: fonts.subHeadlineWeight,
    headerFooterFont: fonts.headerFooterFont,
    googleFontsUrl: fonts.googleFontsUrl,
    translationFontOverrides: {},
    primaryColor: fonts.primaryColor,
    interactiveColor: "#0ea5e9",
    logo: settings.logo,
    iconLogo: BRAND_ICON_LOGOS[slug] ?? BRAND_ICON_LOGOS["edoomio"],
    organization: settings.organization,
    teacher: settings.teacher,
    headerRight: settings.headerRight,
    footerLeft: settings.footerLeft,
    footerCenter: settings.footerCenter,
    footerRight: settings.footerRight,
  };
}

/**
 * Apply per-worksheet brandOverrides on top of a BrandProfile.
 */
export function applyBrandOverrides(
  profile: BrandProfile,
  overrides?: BrandOverrides | null,
): BrandProfile {
  if (!overrides) return profile;
  return { ...profile, ...stripUndefined(overrides) };
}

export function resolveTranslationFontOverride(
  profile: BrandProfile,
  locale?: string | null,
): TranslationFontOverride | null {
  const normalizedLocale = locale?.trim().toLowerCase();
  if (!normalizedLocale) return null;

  const overrides = profile.translationFontOverrides;
  if (!overrides) return null;

  const directMatch = overrides[normalizedLocale];
  if (directMatch?.fontFamily?.trim()) {
    return directMatch;
  }

  const baseLocale = normalizedLocale.split("-")[0];
  if (baseLocale && baseLocale !== normalizedLocale) {
    const baseMatch = overrides[baseLocale];
    if (baseMatch?.fontFamily?.trim()) {
      return baseMatch;
    }
  }

  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function stripUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  for (const key of Object.keys(obj) as (keyof T)[]) {
    if (obj[key] !== undefined) result[key] = obj[key];
  }
  return result;
}

/** Resolved header/footer fields from a sub-profile variant. */
export interface SubProfileHeaderFooter {
  headerLeft: string;
  headerRight: string;
  footerLeft: string;
  footerRight: string;
}

/**
 * Resolve sub-profile header/footer overrides.
 * @param profile   The brand profile (must include subProfiles array)
 * @param subProfileId  The selected sub-profile ID (from worksheet settings)
 * @param variant   Which variant to use: 1 = multiline, 2 = single line
 * @returns Resolved header/footer fields, or null if no sub-profile found
 */
export function resolveSubProfileHeaderFooter(
  profile: BrandProfile,
  subProfileId: string | undefined,
  variant: 1 | 2 = 1,
): SubProfileHeaderFooter | null {
  if (!subProfileId || !profile.subProfiles?.length) return null;
  const sp = profile.subProfiles.find((s) => s.id === subProfileId);
  if (!sp) return null;
  if (variant === 2) {
    return {
      headerLeft: sp.headerLeftV2,
      headerRight: sp.headerRightV2,
      footerLeft: sp.footerLeftV2,
      footerRight: sp.footerRightV2,
    };
  }
  return {
    headerLeft: sp.headerLeftV1,
    headerRight: sp.headerRightV1,
    footerLeft: sp.footerLeftV1,
    footerRight: sp.footerRightV1,
  };
}

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
  /** @deprecated Use brandOverrides instead. Kept for backward compat with existing data. */
  brandSettings: BrandSettings;
  /** Per-worksheet overrides on top of the brand profile (layout fields only). */
  brandOverrides?: BrandOverrides;
  /** Selected sub-profile ID (overrides header/footer with variant content) */
  subProfileId?: string;
  chOverrides?: ChOverrides;
  coverSubtitle: string;       // Subtitle shown on the cover page
  coverInfoText: string;       // Info text shown below the cover images
  coverImages: string[];       // Up to 4 cover images for the title page
  coverImageBorder: boolean;   // Show border around cover images
  /** ISO language codes to translate into, e.g. ["en", "uk"] */
  translationLanguages?: string[];
  /** @deprecated Use BrandProfile.pdfFontSize. Kept for backward compat. */
  pdfFontSize?: number;
  /** @deprecated Use BrandProfile.pdfTranslationScale. Kept for backward compat. */
  pdfTranslationScale?: number;
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
  margins: { top: 20, right: 20, bottom: 113, left: 20 },
  showHeader: true,
  showFooter: true,
  headerText: "",
  footerText: "",
  fontSize: 12.5,
  fontFamily: "Asap Condensed, sans-serif",
  brand: "edoomio",
  brandSettings: DEFAULT_BRAND_SETTINGS["edoomio"],
  coverSubtitle: "Arbeitsblatt",
  coverInfoText: "",
  coverImages: [],
  coverImageBorder: false,
  translationLanguages: [],
};

// ─── Block library definitions ──────────────────────────────
export interface BlockDefinition {
  type: BlockType;
  label: string;
  description: string;
  labelKey: string; // i18n key in "blocks" namespace
  descriptionKey: string; // i18n key in "blocks" namespace
  icon: string; // lucide icon name
  category: "layout" | "content" | "images" | "vocabulary" | "mockup" | "numbering" | "memory-aids" | "multimedia" | "interactive" | "ai-tools";
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
      bilingualDivider: false,
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
    category: "images",
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
    category: "images",
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
    type: "logo-divider",
    label: "Logo Divider",
    description: "Centered brand logo as section divider",
    labelKey: "logoDivider",
    descriptionKey: "logoDividerDesc",
    icon: "Sparkles",
    category: "layout",
    translations: { de: { label: "Logo-Trenner", description: "Zentriertes Markenlogo als Abschnittsteiler" } },
    defaultData: {
      type: "logo-divider",
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
      columnBgColors: ["", ""],
      columnBorderColors: ["", ""],
      columnBorders: [true, true],
      showBorder: true,
      visibility: "both",
    },
  },
  {
    type: "grid",
    label: "Grid",
    description: "Grid layout with rows and columns",
    labelKey: "gridLabel",
    descriptionKey: "gridDesc",
    icon: "Grid3X3",
    category: "layout",
    translations: { de: { label: "Raster", description: "Raster-Layout mit Zeilen und Spalten" } },
    defaultData: {
      type: "grid",
      rows: 2,
      cols: 2,
      rowGap: 16,
      colGap: 16,
      children: [[], [], [], []],
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
      instruction: "Choose the correct answer.",
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
    type: "fill-in-blank-items",
    label: "Fill in the Blank (Items)",
    description: "Numbered sentences with blanks to fill in",
    labelKey: "fillInBlankItems",
    descriptionKey: "fillInBlankItemsDesc",
    icon: "TextCursorInput",
    category: "interactive",
    translations: { de: { label: "Lückentext (Sätze)", description: "Nummerierte Sätze mit Lücken zum Ausfüllen" } },
    defaultData: {
      type: "fill-in-blank-items",
      instruction: "Complete the sentences.",
      items: [
        { id: "fib1", content: "The {{blank:cat}} sat on the mat." },
        { id: "fib2", content: "She {{blank:goes}} to school every day." },
        { id: "fib3", content: "They {{blank:have}} a big house." },
      ],
      showWordBank: false,
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
      words: ["Hello", "World", "Search", "Find"],
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
    type: "complete-sentences",
    label: "Complete Sentences",
    description: "Complete sentence beginnings",
    labelKey: "completeSentences",
    descriptionKey: "completeSentencesDesc",
    icon: "TextCursorInput",
    category: "interactive",
    translations: { de: { label: "Sätze vervollständigen", description: "Satzanfänge vervollständigen" } },
    defaultData: {
      type: "complete-sentences",
      instruction: "Vervollständige die Sätze.",
      sentences: [
        { id: "cs1", beginning: "Ich gehe gerne …" },
        { id: "cs2", beginning: "Am Wochenende …" },
      ],
      visibility: "both",
    },
  },
  {
    type: "transform-sentences",
    label: "Transform Sentences",
    description: "Rewrite sentences in a different form",
    labelKey: "transformSentences",
    descriptionKey: "transformSentencesDesc",
    icon: "ArrowLeftRight",
    category: "interactive",
    translations: { de: { label: "Sätze umformen", description: "Sätze in anderer Form umschreiben" } },
    defaultData: {
      type: "transform-sentences",
      instruction: "Formen Sie die Sätze um.",
      sentences: [
        { id: "ts1", beginning: "Ich gehe gerne ins Kino." },
        { id: "ts2", beginning: "Er hat das Buch gelesen." },
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
    category: "vocabulary",
    translations: { de: { label: "Glossar", description: "Begriffe und Definitionen" } },
    defaultData: {
      type: "glossary",
      instruction: "",
      pairs: [
        { id: "g1", term: "Term 1", definition: "Definition 1", example: "" },
        { id: "g2", term: "Term 2", definition: "Definition 2", example: "" },
        { id: "g3", term: "Term 3", definition: "Definition 3", example: "" },
      ],
      leftColWidth: 25,
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
    category: "images",
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
    category: "numbering",
    translations: { de: { label: "Nummerierung", description: "Fortlaufende Nummerierung mit optionalem Text" } },
    defaultData: {
      type: "numbered-label",
      startNumber: 1,
      prefix: "",
      suffix: "",
      visibility: "both",
    },
  },
  {
    type: "page-break",
    label: "Page Break",
    description: "Force a page break in print/PDF",
    labelKey: "pageBreak",
    descriptionKey: "pageBreakDesc",
    icon: "FileOutput",
    category: "layout",
    translations: { de: { label: "Seitenumbruch", description: "Seitenumbruch im Druck/PDF erzwingen" } },
    defaultData: {
      type: "page-break",
      visibility: "print",
    },
  },
  {
    type: "writing-lines",
    label: "Writing Lines",
    description: "Dashed lines for handwriting",
    labelKey: "writingLines",
    descriptionKey: "writingLinesDesc",
    icon: "PenLine",
    category: "layout",
    translations: { de: { label: "Schreiblinien", description: "Gestrichelte Linien zum Schreiben" } },
    defaultData: {
      type: "writing-lines",
      lineCount: 5,
      lineSpacing: 24,
      visibility: "both",
    },
  },
  {
    type: "writing-rows",
    label: "Writing Rows",
    description: "Numbered rows with writing lines",
    labelKey: "writingRows",
    descriptionKey: "writingRowsDesc",
    icon: "Rows3",
    category: "layout",
    translations: { de: { label: "Schreibzeilen", description: "Nummerierte Zeilen mit Schreiblinien" } },
    defaultData: {
      type: "writing-rows",
      rowCount: 5,
      visibility: "both",
    },
  },
  {
    type: "text-snippet",
    label: "Text Snippet",
    description: "Text block with copy-to-clipboard",
    labelKey: "textSnippet",
    descriptionKey: "textSnippetDesc",
    icon: "ClipboardCopy",
    category: "vocabulary",
    translations: { de: { label: "Textbaustein", description: "Textblock mit Kopieren-Funktion" } },
    defaultData: {
      type: "text-snippet",
      content: "<p>Enter text here...</p>",
      visibility: "both",
    },
  },
{
  type: "email-skeleton",
  label: "Email",
  description: "Simulated email message",
  labelKey: "emailSkeleton",
  descriptionKey: "emailSkeletonDesc",
  icon: "Mail",
  category: "mockup",
  translations: { de: { label: "E-Mail", description: "Simulierte E-Mail-Nachricht" } },
  defaultData: {
    type: "email-skeleton",
    from: "anna@example.com",
    to: "ben@example.com",
    subject: "Betreff",
    body: "<p>Hallo Ben,</p><p>…</p><p>Viele Grüße<br/>Anna</p>",
    emailStyle: "none",
    attachments: [],
    visibility: "both",
  },
},
{
  type: "job-application",
  label: "Job Application",
  description: "Simulated job application form",
  labelKey: "jobApplication",
  descriptionKey: "jobApplicationDesc",
  icon: "ClipboardList",
  category: "mockup",
  translations: { de: { label: "Bewerbung", description: "Simuliertes Bewerbungsformular" } },
  defaultData: {
    type: "job-application",
    firstName: "Anna",
    applicantName: "Müller",
    email: "anna@example.com",
    phone: "+49 123 456789",
    position: "Verkäufer/in",
    message: "<p>Sehr geehrte Damen und Herren,</p><p>…</p><p>Mit freundlichen Grüßen<br/>Anna Müller</p>",
    applicationStyle: "none",
    visibility: "both",
  },
},
{
  type: "text-comparison",
  label: "Text Comparison",
  description: "Compare two text variants side by side",
  labelKey: "textComparison",
  descriptionKey: "textComparisonDesc",
  icon: "Columns2",
  category: "content",
  translations: { de: { label: "Textvergleich", description: "Zwei Textvarianten nebeneinander vergleichen" } },
  defaultData: {
    type: "text-comparison",
    leftContent: "<p></p>",
    rightContent: "<p></p>",
    visibility: "both",
  },
},
{
  type: "dos-and-donts",
  label: "Dos & Don'ts",
  description: "List of recommended and discouraged actions",
  labelKey: "dosAndDonts",
  descriptionKey: "dosAndDontsDesc",
  icon: "ListChecks",
  category: "memory-aids",
  translations: { de: { label: "Dos & Don'ts", description: "Empfohlene und nicht empfohlene Handlungen" } },
  defaultData: {
    type: "dos-and-donts",
    layout: "horizontal",
    showTitles: true,
    dosTitle: "Do",
    dontsTitle: "Don't",
    dos: [
      { id: crypto.randomUUID(), text: "" },
    ],
    donts: [
      { id: crypto.randomUUID(), text: "" },
    ],
    visibility: "both",
  },
},
{
  type: "numbered-items",
  label: "Numbered Items",
  description: "Numbered text items with rich content",
  labelKey: "numberedItems",
  descriptionKey: "numberedItemsDesc",
  icon: "ListOrdered",
  category: "numbering",
  translations: { de: { label: "Nummerierte Punkte", description: "Nummerierte Textabschnitte" } },
  defaultData: {
    type: "numbered-items",
    items: [
      { id: crypto.randomUUID(), content: "" },
    ],
    startNumber: 1,
    bgColor: "",
    borderRadius: 6,
    visibility: "both",
  },
},
{
  type: "accordion",
  label: "Accordion",
  description: "Collapsible sections with nested blocks",
  labelKey: "accordion",
  descriptionKey: "accordionDesc",
  icon: "ChevronDown",
  category: "content",
  translations: { de: { label: "Akkordeon", description: "Aufklappbare Abschnitte mit verschachtelten Blöcken" } },
  defaultData: {
    type: "accordion",
    items: [
      { id: crypto.randomUUID(), title: "", children: [] },
    ],
    showNumbers: false,
    visibility: "both",
  },
},
{
  type: "checklist",
  label: "Checklist",
  description: "Item list with checkboxes and rich text",
  labelKey: "checklist",
  descriptionKey: "checklistDesc",
  icon: "CheckSquare",
  category: "memory-aids",
  translations: { de: { label: "Checkliste", description: "Aufzählung mit Checkboxen und formatiertem Text" } },
  defaultData: {
    type: "checklist",
    items: [
      { id: crypto.randomUUID(), content: "" },
    ],
    bilingual: false,
    visibility: "both",
  },
},
// ── AI Tools ──────────────────────────────────────────────────
{
  type: "ai-prompt",
  label: "AI Prompt",
  description: "Text input with AI processing",
  labelKey: "aiPrompt",
  descriptionKey: "aiPromptDesc",
  icon: "Sparkles",
  category: "ai-tools",
  translations: { de: { label: "KI-Prompt", description: "Texteingabe mit KI-Verarbeitung" } },
  defaultData: {
    type: "ai-prompt",
    instructions: "",
    description: "",
    variableName: "eingabe",
    prompt: "{{eingabe}}",
    userInput: "",
    aiResult: "",
    visibility: "online",
  },
},
{
  type: "ai-tool",
  label: "AI Tool",
  description: "Form-based AI agent with custom fields",
  labelKey: "aiTool",
  descriptionKey: "aiToolDesc",
  icon: "Bot",
  category: "ai-tools",
  translations: { de: { label: "KI-Tool", description: "Formularbasierter KI-Agent mit benutzerdefinierten Feldern" } },
  defaultData: {
    type: "ai-tool",
    toolKey: "",
    toolTitle: "",
    toolDescription: "",
    latestRunId: "",
    visibility: "online",
  },
},
// ── Table ─────────────────────────────────────────────────────
{
  type: "table",
  label: "Table",
  description: "Flexible table with rich text cells",
  labelKey: "table",
  descriptionKey: "tableDesc",
  icon: "Table",
  category: "content",
  translations: { de: { label: "Tabelle", description: "Flexible Tabelle mit formatierbaren Zellen" } },
  defaultData: {
    type: "table",
    content: '<table><tbody><tr><th colspan="1" rowspan="1"><p></p></th><th colspan="1" rowspan="1"><p></p></th><th colspan="1" rowspan="1"><p></p></th></tr><tr><td colspan="1" rowspan="1"><p></p></td><td colspan="1" rowspan="1"><p></p></td><td colspan="1" rowspan="1"><p></p></td></tr><tr><td colspan="1" rowspan="1"><p></p></td><td colspan="1" rowspan="1"><p></p></td><td colspan="1" rowspan="1"><p></p></td></tr></tbody></table>',
    tableStyle: "default",
    visibility: "both",
  },
},
// ── Audio ─────────────────────────────────────────────────────
{
  type: "audio",
  label: "Audio",
  description: "Audio player with playback controls",
  labelKey: "audio",
  descriptionKey: "audioDesc",
  icon: "Volume2",
  category: "multimedia",
  translations: { de: { label: "Audio", description: "Audioplayer mit Wiedergabesteuerung" } },
  defaultData: {
    type: "audio",
    src: "",
    title: "",
    visibility: "online",
  },
},
// ── Schedule ──────────────────────────────────────────────────
{
  type: "schedule",
  label: "Schedule",
  description: "Timetable with start/end times, title and description",
  labelKey: "schedule",
  descriptionKey: "scheduleDesc",
  icon: "Clock",
  category: "content",
  translations: { de: { label: "Zeitplan", description: "Zeitplan mit Start-/Endzeit, Titel und Beschreibung" } },
  defaultData: {
    type: "schedule",
    bilingual: false,
    showDate: false,
    showRoom: false,
    showHeader: false,
    items: [
      { id: "s1", date: "", start: "08:00", end: "09:30", room: "", title: "Titel 1", description: "" },
      { id: "s2", date: "", start: "09:45", end: "11:15", room: "", title: "Titel 2", description: "" },
      { id: "s3", date: "", start: "11:30", end: "13:00", room: "", title: "Titel 3", description: "" },
    ],
    visibility: "both",
  },
},
{
  type: "website",
  label: "Website",
  description: "Two-column website cards with image, link, category and description",
  labelKey: "website",
  descriptionKey: "websiteDesc",
  icon: "Globe",
  category: "mockup",
  translations: { de: { label: "Website", description: "Zweispaltige Website-Karten mit Bild, Link, Kategorie und Beschreibung" } },
  defaultData: {
    type: "website",
    title: "Website",
    level: 2,
    bilingual: false,
    skipTranslation: false,
    items: [
      {
        id: crypto.randomUUID(),
        title: "Website title",
        url: "https://example.com",
        category: "Category",
        description: "Short description",
        image: "",
        aggregator: false,
        pageBreakAfter: false,
      },
      {
        id: crypto.randomUUID(),
        title: "Another website",
        url: "https://example.org",
        category: "Category",
        description: "Another short description",
        image: "",
        aggregator: false,
        pageBreakAfter: false,
      },
    ],
    visibility: "both",
  },
},
];
