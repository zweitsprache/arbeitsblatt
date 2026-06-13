// ─── Visibility ──────────────────────────────────────────────
export type BlockVisibility = "both" | "print" | "online";

export interface BlockDisplayOn {
  course?: boolean;
  worksheetOnline?: boolean;
  worksheetPrint?: boolean;
}

// ─── View mode ───────────────────────────────────────────────
export type ViewMode = "print" | "online";

export type InstructionBadgeStyle = "default" | "unboxed-small-letter";

// ─── Block types ─────────────────────────────────────────────
export type BlockType =
  | "heading"
  | "numbered-heading"
  | "text"
  | "syllables"
  | "syllable-cards"
  | "image"
  | "image-cards"
  | "image-text-table"
  | "spacer"
  | "gap-spacer"
  | "divider"
  | "multiple-choice"
  | "fill-in-blank"
  | "matching"
  | "pronunciation"
  | "open-response"
  | "word-bank"
  | "number-line"
  | "columns"
  | "true-false-matrix"
  | "mcq-matrix"
  | "mcq-rows"
  | "order-items"
  | "inline-choices"
  | "crossword"
  | "word-search"
  | "sorting-categories"
  | "correct-spelling"
  | "correct-numbers"
  | "missing-letters"
  | "letter-code"
  | "unscramble-words"
  | "fix-sentences"
  | "complete-sentences"
  | "start-sentences"
  | "reading-comprehension"
  | "transform-sentences"
  | "verb-table"
  | "text-cards"
  | "glossary"
  | "article-training"
  | "chart"
  | "numbered-label"
  | "two-column-fill"
  | "dialogue"
  | "lueckenzeilen"
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
  | "subject"
  | "box"
  | "quartett"
  | "taboo"
  | "logo-divider"
  | "ai-prompt"
  | "ai-tool"
  | "table"
  | "table-cloud"
  | "text-comparison"
  | "accordion"
  | "audio"
  | "schedule"
  | "website"
  | "checklist"
  | "card-pairs"
  | "domino"
  | "flashcards"
  | "aufgabenkarten"
  | "board-game"
  | "grid"
  | "segmentation"
  | "free-form"
  | "bingo-cards";

export type SegmentationCasing = "default" | "uppercase" | "lowercase";

// ─── Bingo Cards block ─────────────────────────────────────
export type BingoCardsGridSize = 3 | 4 | 5;
export type BingoCardsMode = "same" | "qa";
export type BingoCardsContentType = "text" | "image" | "text-image";

export interface BingoCardsItem {
  id: string;
  text?: string;
  imageSrc?: string;
  answer?: string; // for QA mode
}

export interface BingoCardsBlock extends BlockBase {
  type: "bingo-cards";
  gridSize: BingoCardsGridSize;
  mode: BingoCardsMode;
  contentType: BingoCardsContentType;
  items: BingoCardsItem[];
  randomize: boolean;
  csvImport?: string; // raw CSV text, for import UI only
  cardWidthMm?: number; // default 148.5
  cardHeightMm?: number; // default 105
  showCuttingLine?: boolean; // default true
}

// ─── Bingo Cards item count config ─────────────────────────
export const BINGO_CARDS_ITEM_LIMITS: Record<BingoCardsGridSize, { min: number; max: number }> = {
  3: { min: 20, max: 25 },
  4: { min: 30, max: 35 },
  5: { min: 40, max: 50 },
};

export interface SegmentationBlock extends BlockBase {
  type: "segmentation";
  instruction?: string;
  items: { id: string; text: string }[];
  casing: SegmentationCasing;
  showFirstAsExample?: boolean; // always true for now
}

export const FREE_FORM_SCENE_VERSION = 2;

export type FreeFormElementType = "rect" | "circle" | "text";
export type FreeFormTextAlign = "left" | "center" | "right" | "justify";
export type FreeFormTextAutoSize = "auto-height" | "fixed";

export interface FreeFormBaseElement {
  id: string;
  type: FreeFormElementType;
  name?: string;
  x: number;
  y: number;
  rotation?: number;
  visible?: boolean;
  locked?: boolean;
  opacity?: number;
  zIndex?: number;
  groupId?: string | null;
}

export interface FreeFormRectElement extends FreeFormBaseElement {
  type: "rect";
  width: number;
  height: number;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  cornerRadius?: number;
}

export interface FreeFormCircleElement extends FreeFormBaseElement {
  type: "circle";
  radius: number;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
}

export interface FreeFormTextElement extends FreeFormBaseElement {
  type: "text";
  text: string;
  fill: string;
  fontSize: number;
  fontFamily?: string;
  fontStyle?: string;
  fontWeight?: string | number;
  width?: number;
  height?: number;
  lineHeight?: number;
  letterSpacing?: number;
  textAlign?: FreeFormTextAlign;
  autoSize?: FreeFormTextAutoSize;
}

export type FreeFormElement = FreeFormRectElement | FreeFormCircleElement | FreeFormTextElement;

export type FreeFormElementUpdate = Partial<{
  x: number;
  y: number;
  rotation: number;
  visible: boolean;
  locked: boolean;
  opacity: number;
  zIndex: number;
  groupId: string | null;
  name: string;
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  cornerRadius: number;
  radius: number;
  text: string;
  fontSize: number;
  fontFamily: string;
  fontStyle: string;
  fontWeight: string | number;
  lineHeight: number;
  letterSpacing: number;
  textAlign: FreeFormTextAlign;
  autoSize: FreeFormTextAutoSize;
}>;

export interface FreeFormScene {
  version: number;
  width: number;
  height: number;
  backgroundColor: string;
  elements: FreeFormElement[];
}

export interface FreeFormViewportState {
  zoom: number;
  panX: number;
  panY: number;
}

type FreeFormLegacyElement = {
  id?: string;
  type?: FreeFormElementType;
  name?: string;
  x?: number;
  y?: number;
  rotation?: number;
  visible?: boolean;
  locked?: boolean;
  opacity?: number;
  zIndex?: number;
  groupId?: string | null;
  width?: number;
  height?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  cornerRadius?: number;
  radius?: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontStyle?: string;
  fontWeight?: string | number;
  lineHeight?: number;
  letterSpacing?: number;
  textAlign?: FreeFormTextAlign;
  autoSize?: FreeFormTextAutoSize;
};

type FreeFormLegacyScene = {
  version?: number;
  width?: number;
  height?: number;
  backgroundColor?: string;
  elements?: FreeFormLegacyElement[];
};

function clampFreeFormOpacity(opacity: unknown): number {
  if (typeof opacity !== "number" || Number.isNaN(opacity)) {
    return 1;
  }

  return Math.min(1, Math.max(0, opacity));
}

function normalizeFreeFormElement(element: FreeFormLegacyElement, index: number): FreeFormElement {
  const id = typeof element.id === "string" && element.id.trim() ? element.id : `free-form-${index + 1}`;
  const common = {
    id,
    x: typeof element.x === "number" ? element.x : 0,
    y: typeof element.y === "number" ? element.y : 0,
    rotation: typeof element.rotation === "number" ? element.rotation : 0,
    visible: element.visible !== false,
    locked: element.locked === true,
    opacity: clampFreeFormOpacity(element.opacity),
    zIndex: typeof element.zIndex === "number" ? element.zIndex : index,
    groupId: typeof element.groupId === "string" && element.groupId.trim() ? element.groupId : null,
  } satisfies Omit<FreeFormBaseElement, "type">;

  if (element.type === "circle") {
    return {
      ...common,
      type: "circle",
      name: typeof element.name === "string" && element.name.trim() ? element.name : `Circle ${index + 1}`,
      radius: typeof element.radius === "number" ? element.radius : 48,
      fill: typeof element.fill === "string" ? element.fill : "#fde68a",
      stroke: typeof element.stroke === "string" ? element.stroke : undefined,
      strokeWidth: typeof element.strokeWidth === "number" ? element.strokeWidth : undefined,
    };
  }

  if (element.type === "text") {
    return {
      ...common,
      type: "text",
      name: typeof element.name === "string" && element.name.trim() ? element.name : `Text ${index + 1}`,
      text: typeof element.text === "string" ? element.text : "Text",
      fill: typeof element.fill === "string" ? element.fill : "#0f172a",
      fontSize: typeof element.fontSize === "number" ? element.fontSize : 32,
      fontFamily: typeof element.fontFamily === "string" ? element.fontFamily : undefined,
      fontStyle: typeof element.fontStyle === "string" ? element.fontStyle : undefined,
      fontWeight: typeof element.fontWeight === "string" || typeof element.fontWeight === "number" ? element.fontWeight : undefined,
      width: typeof element.width === "number" ? element.width : 320,
      height: typeof element.height === "number" ? element.height : undefined,
      lineHeight: typeof element.lineHeight === "number" ? element.lineHeight : 1.2,
      letterSpacing: typeof element.letterSpacing === "number" ? element.letterSpacing : 0,
      textAlign: element.textAlign === "center" || element.textAlign === "right" || element.textAlign === "justify" ? element.textAlign : "left",
      autoSize: element.autoSize === "fixed" ? "fixed" : "auto-height",
    };
  }

  return {
    ...common,
    type: "rect",
    name: typeof element.name === "string" && element.name.trim() ? element.name : `Rectangle ${index + 1}`,
    width: typeof element.width === "number" ? element.width : 160,
    height: typeof element.height === "number" ? element.height : 120,
    fill: typeof element.fill === "string" ? element.fill : "#dbeafe",
    stroke: typeof element.stroke === "string" ? element.stroke : undefined,
    strokeWidth: typeof element.strokeWidth === "number" ? element.strokeWidth : undefined,
    cornerRadius: typeof element.cornerRadius === "number" ? element.cornerRadius : undefined,
  };
}

export function normalizeFreeFormScene(scene?: FreeFormLegacyScene | FreeFormScene | null): FreeFormScene {
  const nextScene = scene ?? {};
  const normalizedElements = (nextScene.elements ?? []).map(normalizeFreeFormElement);
  const orderedElements = normalizedElements
    .sort((left, right) => (left.zIndex ?? 0) - (right.zIndex ?? 0))
    .map((element, index) => ({
      ...element,
      zIndex: index,
    }));

  return {
    version: FREE_FORM_SCENE_VERSION,
    width: typeof nextScene.width === "number" ? nextScene.width : 1200,
    height: typeof nextScene.height === "number" ? nextScene.height : 800,
    backgroundColor: typeof nextScene.backgroundColor === "string" ? nextScene.backgroundColor : "#fffdf6",
    elements: orderedElements,
  };
}

export function createDefaultFreeFormScene(): FreeFormScene {
  return normalizeFreeFormScene({
    width: 1200,
    height: 800,
    backgroundColor: "#fffdf6",
    elements: [
      {
        id: "ff-rect-1",
        type: "rect",
        name: "Card",
        x: 80,
        y: 80,
        width: 320,
        height: 180,
        fill: "#dbeafe",
        stroke: "#2563eb",
        strokeWidth: 2,
        cornerRadius: 20,
      },
      {
        id: "ff-text-1",
        type: "text",
        name: "Headline",
        x: 120,
        y: 130,
        text: "Double-click the preview to open the editor.",
        fill: "#1e293b",
        fontSize: 34,
        fontStyle: "bold",
        width: 440,
        textAlign: "left",
      },
    ],
  });
}

export interface FreeFormBlock extends BlockBase {
  type: "free-form";
  title: string;
  instruction?: string;
  scene: FreeFormScene;
}

export type ExclusiveWorksheetBlockType = "flashcards" | "aufgabenkarten" | "card-pairs" | "domino" | "quartett" | "taboo" | "syllable-cards";

export const EXCLUSIVE_WORKSHEET_BLOCK_TYPES: ReadonlySet<ExclusiveWorksheetBlockType> = new Set([
  "flashcards",
  "aufgabenkarten",
  "card-pairs",
  "domino",
  "quartett",
  "taboo",
  "syllable-cards",
]);

export function isExclusiveWorksheetBlockType(type: BlockType): type is ExclusiveWorksheetBlockType {
  return EXCLUSIVE_WORKSHEET_BLOCK_TYPES.has(type as ExclusiveWorksheetBlockType);
}

export function canAddBlockTypeToWorksheet(
  existingBlocks: Pick<WorksheetBlock, "type">[],
  candidateType: BlockType,
): boolean {
  const existingExclusiveTypes = new Set<ExclusiveWorksheetBlockType>();

  for (const block of existingBlocks) {
    if (isExclusiveWorksheetBlockType(block.type)) {
      existingExclusiveTypes.add(block.type);
    }
  }

  if (existingExclusiveTypes.size === 0) {
    return !isExclusiveWorksheetBlockType(candidateType) || existingBlocks.length === 0;
  }

  return (
    isExclusiveWorksheetBlockType(candidateType)
    && existingExclusiveTypes.size === 1
    && existingExclusiveTypes.has(candidateType)
  );
}

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
  level: 1 | 2 | 3 | 4;
  bilingual?: boolean;
  skipTranslation?: boolean;
}

export interface NumberedHeadingBlock extends BlockBase {
  type: "numbered-heading";
  content: string;
  level: 1 | 2 | 3 | 4;
  startNumber: number;
  bilingual?: boolean;
  skipTranslation?: boolean;
}

// ─── Text / Rich-text block ─────────────────────────────────
export type TextBlockStyle = "standard" | "example" | "example-standard" | "example-improved" | "example-primary" | "example-secondary" | "frame" | "frame-primary" | "frame-secondary" | "fragen" | "hinweis" | "hinweis-wichtig" | "hinweis-alarm" | "lernziel" | "kompetenzziele" | "handlungsziele" | "redemittel" | "literatur" | "metadaten" | "rows";

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

export interface SyllablesBlock extends BlockBase {
  type: "syllables";
  content: string;
  instruction?: string;
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

export interface ImageTextTableBlock extends BlockBase {
  type: "image-text-table";
  instruction?: string;
  items: ImageCardItem[];
  columns: 2 | 3 | 4 | 5;
  imageAspectRatio: "16:9" | "4:3" | "1:1" | "3:4" | "9:16";
  imageScale: number; // 10-100
  showImageNumberBadge: boolean;
  shuffleItems?: boolean;
  showFirstAsExample?: boolean;
  twoWritingColumns?: boolean;
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

// ─── Gap Spacer block ────────────────────────────────────────
export interface GapSpacerBlock extends BlockBase {
  type: "gap-spacer";
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
  instruction?: string;
  description?: string;
  tableStyle?: TableStyle;
  caption?: string;
  columnWidths?: number[];
  bilingual?: boolean;
  firstRowAsExample?: boolean;
  hideHeader?: boolean;
  skipTranslation?: boolean;
}

export interface TableCloudBlock extends BlockBase {
  type: "table-cloud";
  content: string;
  instruction?: string;
  description?: string;
  tableStyle?: TableStyle;
  caption?: string;
  columnWidths?: number[];
  bilingual?: boolean;
  firstRowAsExample?: boolean;
  hideHeader?: boolean;
  skipTranslation?: boolean;
  cloudRows?: string;
}

const BRAND_ICON_LOGOS_BASE: Record<string, string> = {
  edoomio: "/logo/arbeitsblatt_logo_icon.svg",
  lingostar: "/logo/lingostar_logo_icon_flat.svg",
  "agi-frauenfeld": "/logo/logo-stadt-frauenfeld.svg",
  "theresia-banz": "/logo/theresia_banz.svg",
  "treffpunkt-schweiz": "/brands/treffpunkt_icon.svg",
};

export const BRAND_ICON_LOGOS: Record<string, string> = new Proxy(BRAND_ICON_LOGOS_BASE, {
  get(target, prop, receiver) {
    if (typeof prop !== "string") return Reflect.get(target, prop, receiver);
    return target[prop] ?? target.edoomio;
  },
});

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
  showFirstAsExample?: boolean;
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
  textAboveItems?: string;
  pairs: MatchingPair[];
  pairOrder?: string[];
  extendedRows?: boolean;
  showWordBank?: boolean;
  showFirstAsExample?: boolean;
}

export interface PronunciationBlock extends BlockBase {
  type: "pronunciation";
  instruction: string;
  textAboveItems?: string;
  leftHeader?: string;
  rightHeader?: string;
  pairs: MatchingPair[];
  pairOrder?: string[];
  extendedRows?: boolean;
  showWordBank?: boolean;
  showFirstAsExample?: boolean;
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
  showBorder?: boolean;
}

// ─── Board Game block ───────────────────────────────────────
export interface BoardGameCell {
  id: string;
  text?: string;
  imageUrl?: string;
  speakerIcon?: DialogueSpeakerIcon | null;
}

export interface BoardGameBlock extends BlockBase {
  type: "board-game";
  rows: number;
  cols: number;
  cells: BoardGameCell[];
}

export type DominoTextSize = "s" | "m" | "l" | "xl";

export interface DominoBlock extends BlockBase {
  type: "domino";
  title?: string;
  footer?: string;
  items: BoardGameCell[];
  shufflePairs?: boolean;
  showSpeakerIcons?: boolean;
  textSize?: DominoTextSize;
}

export interface FlashcardsBlock extends BlockBase {
  type: "flashcards";
  title?: string;
  footer?: string;
  items: BoardGameCell[];
  shufflePairs?: boolean;
  textSize?: DominoTextSize;
}

export interface AufgabenkartenItem extends BoardGameCell {
  title?: string;
  task?: string;
  chunks?: string[];
}

export interface AufgabenkartenBlock extends BlockBase {
  type: "aufgabenkarten";
  title?: string;
  subtitle?: string;
  items: AufgabenkartenItem[];
  textSize?: DominoTextSize;
}

export type CardPairsPairingMode = "same" | "different";

export interface CardPairsBlock extends BlockBase {
  type: "card-pairs";
  title?: string;
  footer?: string;
  items: BoardGameCell[];
  shufflePairs?: boolean;
  textSize?: DominoTextSize;
  pairingMode?: CardPairsPairingMode;
}

export interface SyllableCardsBlock extends BlockBase {
  type: "syllable-cards";
  title?: string;
  footer?: string;
  items: BoardGameCell[];
  textSize?: DominoTextSize;
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

export interface MCQMatrixOption {
  id: string;
  text: string;
}

export interface MCQMatrixStatement {
  id: string;
  text: string;
  afterOptionsText?: string;
  correctOptionIds: string[];
}

export interface MCQMatrixBlock extends BlockBase {
  type: "mcq-matrix";
  instruction: string;
  statementColumnHeader?: string;
  showPill?: boolean;
  showFirstAsExample?: boolean;
  wordBank?: string[];
  options: MCQMatrixOption[];
  statements: MCQMatrixStatement[];
  statementOrder?: string[];
}

export interface MCQRowsChoice {
  id: string;
  label?: string;
  text: string;
}

export interface MCQRowsItem {
  id: string;
  text: string;
  choices: MCQRowsChoice[];
  correctChoiceId: string;
}

export interface MCQRowsBlock extends BlockBase {
  type: "mcq-rows";
  instruction?: string;
  showFirstAsExample?: boolean;
  choicesPerItem: number;
  items: MCQRowsItem[];
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
// The first option is the default correct answer.
// Legacy syntax {{choice:*correct|wrong1|wrong2}} is still supported and can mark
// a later option as correct without changing authored order.
export interface InlineChoiceItem {
  id: string;
  content: string;
  isSpacer?: boolean;
}

export interface InlineChoicesBlock extends BlockBase {
  type: "inline-choices";
  items: InlineChoiceItem[];
  instruction?: string;
  shuffleChoices?: boolean;
  showFirstAsExample?: boolean;
  /** @deprecated — kept for backward compatibility with old data. Use items instead. */
  content?: string;
}

export type CrosswordDirection = "across" | "down";

export interface CrosswordItem {
  id: string;
  answer: string;
  hint: string;
}

export interface CrosswordPlacement {
  itemId: string;
  answer: string;
  hint: string;
  row: number;
  col: number;
  labelRow: number;
  labelCol: number;
  direction: CrosswordDirection;
  clueNumber: number;
}

export interface CrosswordBlock extends BlockBase {
  type: "crossword";
  instruction?: string;
  items: CrosswordItem[];
  grid: string[][];
  placements: CrosswordPlacement[];
  generationError?: string | null;
  twoColumnClues?: boolean;
}

/**
 * Migrate legacy InlineChoicesBlock that only has `content` (single string)
 * into the new `items` array format. Each line becomes one item.
 */
export function migrateInlineChoicesBlock(block: InlineChoicesBlock): InlineChoiceItem[] {
  if (block.items && block.items.length > 0) {
    return block.items.map((item) => ({
      ...item,
    }));
  }
  if (!block.content) return [];
  return block.content.split("\n").filter((line) => line.trim().length > 0).map((line, i) => ({
    id: `ic${Date.now()}-${i}`,
    content: line,
  }));
}

// ─── Word Search block ──────────────────────────────────────
export type WordSearchDirection =
  | "leftToRight"
  | "rightToLeft"
  | "upToDown"
  | "downToUp"
  | "nwToSe"
  | "swToNe"
  | "neToSw"
  | "seToNw";

export interface WordSearchBlock extends BlockBase {
  type: "word-search";
  words: string[];
  gridSize?: number; // deprecated, use gridCols/gridRows
  gridCols: number;
  gridRows: number;
  rowHeight?: number;
  grid: string[][]; // generated letter grid
  allowedDirections?: Partial<Record<WordSearchDirection, boolean>>;
  showFirstAsExample?: boolean;
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
  twoColumnCategoryLines?: boolean;
  colorCode?: boolean;
  showFirstAsExample?: boolean;
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

export interface CorrectSpellingItem {
  id: string;
  word: string;
  displayCount?: number;
}

export interface CorrectSpellingBlock extends BlockBase {
  type: "correct-spelling";
  instruction: string;
  words: CorrectSpellingItem[];
  displayCount?: number;
  keepLeftCharacters: number;
  keepRightCharacters: number;
  keepFirstLetter?: boolean;
  keepLastLetter?: boolean;
  showFirstAsExample?: boolean;
  itemOrder?: string[];
}

export interface CorrectNumbersBlock extends BlockBase {
  type: "correct-numbers";
  instruction: string;
  words: CorrectSpellingItem[];
  displayCount?: number;
  keepLeftCharacters: number;
  keepRightCharacters: number;
  equalItemWidth?: boolean;
  showFirstAsExample?: boolean;
  itemOrder?: string[];
}

export interface MissingLettersBlock extends BlockBase {
  type: "missing-letters";
  instruction: string;
  words: CorrectSpellingItem[];
  displayCount?: number;
  keepLeftCharacters: number;
  keepRightCharacters: number;
  keepFirstLetter?: boolean;
  keepLastLetter?: boolean;
  showFirstAsExample?: boolean;
  itemOrder?: string[];
}

export interface LetterCodeItem {
  id: string;
  clue: string;
  word: string;
}

export interface LetterCodeBlock extends BlockBase {
  type: "letter-code";
  instruction?: string;
  items: LetterCodeItem[];
  letterOrder?: string[];
  helperLetters?: string[];
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
  hideSolutionsInSolutionRender?: boolean;
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

// ─── Start Sentences block ──────────────────────────────────
// Variant of complete-sentences where the writing line is rendered above
// the sentence fragment instead of next to it.
export interface StartSentenceItem {
  id: string;
  beginning: string;
  ending?: string;
}

export interface StartSentencesBlock extends BlockBase {
  type: "start-sentences";
  instruction: string;
  sentences: StartSentenceItem[];
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
  src?: string;
}

export interface ReadingComprehensionBlock extends BlockBase {
  type: "reading-comprehension";
  instruction: string;
  readingText?: string;
  letterItemNumbering?: boolean;
  continueNumbering?: boolean;
  trueLabel?: string;
  falseLabel?: string;
  sentences: ReadingComprehensionItem[];
  layoutType?: "default" | "form" | "prefilled-form" | "true-false";
  formFieldLabels?: string[];
  formColumns?: 1 | 2 | 3 | 4;
  showFirstAsExample?: boolean;
}

export interface ReadingComprehensionItem {
  id: string;
  question: string;
  beginning: string;
  correctAnswer?: boolean;
  solution?: string;
  src?: string;
  fieldValues?: string[];
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
  showSpeakers?: boolean;
  showWordBank: boolean;
  showOriginal?: boolean;
  originalColumnRatio?: "1:1" | "3:2";
  originalLeftColWidth?: number;
  showFirstAsExample?: boolean;
}

export interface LueckenzeilenItem {
  id: string;
  text: string; // supports {{blank:answer}} gap syntax
}

export interface LueckenzeilenBlock extends BlockBase {
  type: "lueckenzeilen";
  instruction: string;
  items: LueckenzeilenItem[];
  showWordBank: boolean;
  showOriginal?: boolean;
  originalColumnRatio?: "1:1" | "3:2";
  originalLeftColWidth?: number;
  showFirstAsExample?: boolean;
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

// ─── Subject block ───────────────────────────────────────────
export interface SubjectBlock extends BlockBase {
  type: "subject";
  items: NumberedItem[];
  bgColor?: string;
  borderRadius?: number;
  bilingual?: boolean;
  skipTranslation?: boolean;
}

// ─── Box block ──────────────────────────────────────────────
export interface BoxBlock extends BlockBase {
  type: "box";
  title?: string;
  items: NumberedItem[];
  addTopBlockGap?: boolean;
  borderRadius?: number;
  bilingual?: boolean;
  skipTranslation?: boolean;
}

// ─── Quartett block ─────────────────────────────────────────
export interface QuartettSubItem {
  id: string;
  content: string;
}

export interface QuartettItem {
  id: string;
  title?: string;
  subitems: QuartettSubItem[];
}

export interface QuartettBlock extends BlockBase {
  type: "quartett";
  title?: string;
  showGroupTitle?: boolean;
  showFooter?: boolean;
  items: QuartettItem[];
}

export interface TabooBlock extends BlockBase {
  type: "taboo";
  title?: string;
  subtitle?: string;
  items: QuartettItem[];
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
  | NumberedHeadingBlock
  | TextBlock
  | SyllablesBlock
  | ImageBlock
  | ImageCardsBlock
  | ImageTextTableBlock
  | TextCardsBlock
  | SpacerBlock
  | GapSpacerBlock
  | DividerBlock
  | MultipleChoiceBlock
  | FillInBlankBlock
  | MatchingBlock
  | PronunciationBlock
  | OpenResponseBlock
  | WordBankBlock
  | NumberLineBlock
  | ColumnsBlock
  | TrueFalseMatrixBlock
  | MCQMatrixBlock
  | MCQRowsBlock
  | OrderItemsBlock
  | InlineChoicesBlock
  | CrosswordBlock
  | WordSearchBlock
  | SortingCategoriesBlock
  | CorrectSpellingBlock
  | CorrectNumbersBlock
  | MissingLettersBlock
  | LetterCodeBlock
  | UnscrambleWordsBlock
  | FixSentencesBlock
  | CompleteSentencesBlock
  | StartSentencesBlock
  | ReadingComprehensionBlock
  | TransformSentencesBlock
  | VerbTableBlock
  | GlossaryBlock
  | ArticleTrainingBlock
  | ChartBlock
  | NumberedLabelBlock
  | TwoColumnFillBlock
  | DialogueBlock
  | LueckenzeilenBlock
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
  | SubjectBlock
  | BoxBlock
  | QuartettBlock
  | TabooBlock
  | ChecklistBlock
  | LogoDividerBlock
  | AccordionBlock
  | AudioBlock
  | ScheduleBlock
  | WebsiteBlock
  | DominoBlock
  | CardPairsBlock
  | FlashcardsBlock
  | AufgabenkartenBlock
  | SyllableCardsBlock
  | BoardGameBlock
  | AiPromptBlock
  | AiToolBlock
  | TableBlock
  | TableCloudBlock
  | GridBlock
  | SegmentationBlock
  | FreeFormBlock
  | BingoCardsBlock;

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
  exampleTextFont?: string | null;
  letterSpacing?: string | null;
  googleFontsUrl: string;
  translationFontOverrides?: TranslationFontOverrides | null;

  // Font sizes & weights per heading level and text base
  h1Size?: string | null;
  h1Weight?: number | null;
  h2Size?: string | null;
  h2Weight?: number | null;
  h3Size?: string | null;
  h3Weight?: number | null;
  h4Size?: string | null;
  h4Weight?: number | null;
  h1BottomMargin?: string | null;
  h2BottomMargin?: string | null;
  h3BottomMargin?: string | null;
  h4BottomMargin?: string | null;
  blockGap?: string | null;
  h1NumberFormat?: string | null;
  h2NumberFormat?: string | null;
  h3NumberFormat?: string | null;
  h4NumberFormat?: string | null;
  itemNumberFormat?: string | null;
  h1HeadingColor?: string | null;
  h2HeadingColor?: string | null;
  h3HeadingColor?: string | null;
  h4HeadingColor?: string | null;
  h1HeadingNumberColor?: string | null;
  h2HeadingNumberColor?: string | null;
  h3HeadingNumberColor?: string | null;
  h4HeadingNumberColor?: string | null;
  h1HeadingNumberWeight?: number | null;
  h2HeadingNumberWeight?: number | null;
  h3HeadingNumberWeight?: number | null;
  h4HeadingNumberWeight?: number | null;
  textBaseSize?: string | null;

  // Colors
  primaryColor: string;
  accentColor?: string | null;
  interactiveColor: string;
  instructionBadgeStyle?: InstructionBadgeStyle | null;
  instructionBadgeColor?: string | null;

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
const DEFAULT_BRAND_SETTINGS_BASE: Record<string, BrandSettings> = {
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
  "treffpunkt-schweiz": {
    logo: "/brands/treffpunkt_icon.svg",
    organization: "",
    teacher: "",
    headerRight: "",
    footerLeft: "",
    footerCenter: "",
    footerRight: "",
  },
  "theresia-banz": {
    logo: "/logo/theresia_banz.svg",
    organization: "",
    teacher: "",
    headerRight: "",
    footerLeft: "",
    footerCenter: "",
    footerRight: "",
  },
};

export const DEFAULT_BRAND_SETTINGS: Record<string, BrandSettings> = new Proxy(DEFAULT_BRAND_SETTINGS_BASE, {
  get(target, prop, receiver) {
    if (typeof prop !== "string") return Reflect.get(target, prop, receiver);
    return target[prop] ?? target.edoomio;
  },
});

/** @deprecated Use BrandProfile from API. Kept as static fallback. */
const BRAND_FONTS_BASE: Record<string, BrandFonts> = {
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
    headlineFont: "Encode Sans, sans-serif",
    headlineWeight: 600,
    subHeadlineFont: "Encode Sans, sans-serif",
    subHeadlineWeight: 600,
    headerFooterFont: "Encode Sans, sans-serif",
    googleFontsUrl: "https://fonts.googleapis.com/css2?family=Encode+Sans:wght@400;500;600&display=swap",
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
  "treffpunkt-schweiz": {
    bodyFont: "TheSansB, sans-serif",
    headlineFont: "TheSansB, sans-serif",
    headlineWeight: 700,
    subHeadlineFont: "TheSansB, sans-serif",
    subHeadlineWeight: 700,
    headerFooterFont: "TheSansB, sans-serif",
    googleFontsUrl: "/fonts/thesansb.css",
    primaryColor: "#1a1a1a",
  },
};

export const BRAND_FONTS: Record<string, BrandFonts> = new Proxy(BRAND_FONTS_BASE, {
  get(target, prop, receiver) {
    if (typeof prop !== "string") return Reflect.get(target, prop, receiver);
    return target[prop] ?? target.edoomio;
  },
});

/**
 * Build a BrandProfile from the static fallback constants.
 * Used when the DB profile is not yet loaded.
 */
export function getStaticBrandProfile(slug: string): BrandProfile {
  const fonts = BRAND_FONTS[slug];
  const settings = DEFAULT_BRAND_SETTINGS[slug];
  const hasKnownIcon = Object.prototype.hasOwnProperty.call(BRAND_ICON_LOGOS_BASE, slug);
  const inferredBrandIcon = `/brands/${slug}_icon.svg`;
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
    exampleTextFont: "",
    googleFontsUrl: fonts.googleFontsUrl,
    itemNumberFormat: "default",
    translationFontOverrides: {},
    primaryColor: fonts.primaryColor,
    interactiveColor: "#0ea5e9",
    instructionBadgeStyle: "default",
    instructionBadgeColor: null,
    logo: hasKnownIcon ? settings.logo : inferredBrandIcon,
    iconLogo: hasKnownIcon ? BRAND_ICON_LOGOS[slug] : inferredBrandIcon,
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
  orientation: "portrait" | "landscape" | "landscape-canva";
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
  /** Locale data semantics version (2 = CH base, DE overrides). */
  localeDataVersion?: 2;
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
  margins: { top: 20, right: 20, bottom: 95, left: 20 },
  showHeader: true,
  showFooter: true,
  headerText: "",
  footerText: "",
  fontSize: 12.5,
  fontFamily: "Asap Condensed, sans-serif",
  brand: "edoomio",
  brandSettings: DEFAULT_BRAND_SETTINGS["edoomio"],
  localeDataVersion: 2,
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
  category: "layout" | "content" | "images" | "vocabulary" | "mockup" | "numbering" | "memory-aids" | "multimedia" | "interactive" | "games" | "spelling" | "headings" | "cards" | "ai-tools";
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
    category: "headings",
    translations: { de: { label: "Überschrift", description: "Titel und Überschriften hinzufügen" } },
    defaultData: {
      type: "heading",
      content: "Heading",
      level: 1,
      visibility: "both",
    },
  },
  {
    type: "segmentation",
    label: "Segmentation",
    description: "Split text with vertical lines",
    labelKey: "segmentation",
    descriptionKey: "segmentationDesc",
    icon: "LayoutList",
    category: "spelling",
    translations: { de: { label: "Segmentierung", description: "Text mit Trennlinien aufteilen" } },
    defaultData: {
      type: "segmentation",
      instruction: "Split the text with vertical lines.",
      items: [
        { id: "1", text: "Ich wohne in Zürich." },
        { id: "2", text: "Du kommst aus Bern." }
      ],
      casing: "default",
      showFirstAsExample: true,
      visibility: "both",
    },
  },
  {
    type: "free-form",
    label: "Free Form",
    description: "Canvas block with modal editor and preview",
    labelKey: "freeForm",
    descriptionKey: "freeFormDesc",
    icon: "PenLine",
    category: "images",
    translations: { de: { label: "Freiform", description: "Canvas-Block mit Modal-Editor und Vorschau" } },
    defaultData: {
      type: "free-form",
      title: "Free Form",
      instruction: "Open the editor to arrange shapes and text.",
      scene: {
        width: 1200,
        height: 800,
        backgroundColor: "#fffdf6",
        elements: [
          {
          scene: createDefaultFreeFormScene(),
          }
        ],
      },
      visibility: "both",
    },
  },
  {
    type: "numbered-heading",
    label: "Numbered Heading",
    description: "Heading with automatic numbering",
    labelKey: "numberedHeading",
    descriptionKey: "numberedHeadingDesc",
    icon: "Heading",
    category: "headings",
    translations: { de: { label: "Nummerierte Überschrift", description: "Überschrift mit automatischer Nummerierung" } },
    defaultData: {
      type: "numbered-heading",
      content: "Heading",
      level: 1,
      startNumber: 1,
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
    type: "syllables",
    label: "Sylables",
    description: "Text with syllable arches",
    labelKey: "syllables",
    descriptionKey: "syllablesDesc",
    icon: "Scissors",
    category: "content",
    translations: { de: { label: "Silben", description: "Text mit Silbenbögen" } },
    defaultData: {
      type: "syllables",
      content: "",
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
      showImageNumberBadge: false,
      showWritingLines: false,
      writingLinesCount: 1,
      showWordBank: false,
      visibility: "both",
    },
  },
  {
    type: "image-text-table",
    label: "Image - Text Table",
    description: "Image grid with numbered writing rows below",
    labelKey: "imageTextTable",
    descriptionKey: "imageTextTableDesc",
    icon: "LayoutGrid",
    category: "images",
    translations: { de: { label: "Bild-Text-Tabelle", description: "Bildraster mit nummerierten Schreibzeilen darunter" } },
    defaultData: {
      type: "image-text-table",
      instruction: "",
      items: [
        { id: "card1", src: "", alt: "", text: "Caption 1" },
        { id: "card2", src: "", alt: "", text: "Caption 2" },
      ],
      columns: 2,
      imageAspectRatio: "1:1",
      imageScale: 100,
      showImageNumberBadge: true,
      shuffleItems: false,
      showFirstAsExample: false,
      twoWritingColumns: false,
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
    type: "gap-spacer",
    label: "Gap Spacer",
    description: "Add spacing based on brand blockGap setting",
    labelKey: "gapSpacer",
    descriptionKey: "gapSpacerDesc",
    icon: "Space",
    category: "layout",
    translations: { de: { label: "Block-Abstand", description: "Abstand basierend auf den Markeneinstellungen hinzufügen" } },
    defaultData: {
      type: "gap-spacer",
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
  {
    type: "board-game",
    label: "Board Game",
    description: "8x5 board with text and image cells",
    labelKey: "boardGame",
    descriptionKey: "boardGameDesc",
    icon: "Grid3X3",
    category: "games",
    translations: { de: { label: "Board Game", description: "8x5-Spielfeld mit Text- und Bildzellen" } },
    defaultData: {
      type: "board-game",
      rows: 8,
      cols: 5,
      cells: Array.from({ length: 40 }, (_, index) => ({
        id: `cell-${index + 1}`,
        text: index === 0 ? "ZIEL" : index === 35 ? "START" : "",
        imageUrl: "",
      })),
      visibility: "both",
    },
  },
  {
    type: "domino",
    label: "Domino",
    description: "Domino pairs with text and image items",
    labelKey: "domino",
    descriptionKey: "dominoDesc",
    icon: "Columns2",
    category: "games",
    translations: { de: { label: "Domino", description: "Domino-Paare mit Text- und Bildfeldern" } },
    defaultData: {
      type: "domino",
      title: "",
      footer: "",
      items: Array.from({ length: 8 }, (_, index) => ({
        id: `domino-item-${index + 1}`,
        text: index === 0 ? "START" : index === 7 ? "ZIEL" : "",
        imageUrl: "",
      })),
      shufflePairs: false,
      showSpeakerIcons: false,
      textSize: "m",
      visibility: "both",
    },
  },
  {
    type: "card-pairs",
    label: "Card Pairs",
    description: "Double-sided square matching cards",
    labelKey: "cardPairs",
    descriptionKey: "cardPairsDesc",
    icon: "Square",
    category: "cards",
    translations: { de: { label: "Kartenpaare", description: "Doppelseitige quadratische Kartenpaare" } },
    defaultData: {
      type: "card-pairs",
      title: "",
      footer: "",
      items: Array.from({ length: 8 }, (_, index) => ({
        id: `card-pair-item-${index + 1}`,
        text: "",
        imageUrl: "",
      })),
      shufflePairs: false,
      textSize: "m",
      pairingMode: "same",
      visibility: "both",
    },
  },
  {
    type: "flashcards",
    label: "Flashcards",
    description: "Front and back flashcard pairs",
    labelKey: "flashcards",
    descriptionKey: "flashcardsDesc",
    icon: "RectangleHorizontal",
    category: "cards",
    translations: { de: { label: "Flashcards", description: "Lernkarten mit Vorder- und Rückseite" } },
    defaultData: {
      type: "flashcards",
      title: "",
      footer: "",
      items: Array.from({ length: 8 }, (_, index) => ({
        id: `flashcard-item-${index + 1}`,
        text: "",
        imageUrl: "",
      })),
      shufflePairs: false,
      textSize: "m",
      visibility: "both",
    },
  },
  {
    type: "aufgabenkarten",
    label: "Aufgabenkarten",
    description: "Single-sided task cards",
    labelKey: "aufgabenkarten",
    descriptionKey: "aufgabenkartenDesc",
    icon: "RectangleVertical",
    category: "cards",
    translations: { de: { label: "Aufgabenkarten", description: "Einseitige Aufgabenkarten" } },
    defaultData: {
      type: "aufgabenkarten",
      title: "",
      subtitle: "",
      items: Array.from({ length: 6 }, (_, index) => ({
        id: `aufgabenkarten-item-${index + 1}`,
        title: "",
        task: "",
        chunks: [],
        text: "",
        imageUrl: "",
      })),
      textSize: "m",
      visibility: "both",
    },
  },
  {
    type: "syllable-cards",
    label: "Syllable Cards",
    description: "Single-sided cards with syllable arches",
    labelKey: "syllableCards",
    descriptionKey: "syllableCardsDesc",
    icon: "ClipboardCopy",
    category: "cards",
    translations: { de: { label: "Silbenkarten", description: "Einseitige Karten mit Silbenbögen" } },
    defaultData: {
      type: "syllable-cards",
      title: "",
      footer: "",
      items: Array.from({ length: 8 }, (_, index) => ({
        id: `syllable-card-item-${index + 1}`,
        text: "",
        imageUrl: "",
      })),
      textSize: "xl",
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
      showFirstAsExample: false,
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
      textAboveItems: "",
      pairs: [
        { id: "p1", left: "Item 1", right: "Match 1" },
        { id: "p2", left: "Item 2", right: "Match 2" },
        { id: "p3", left: "Item 3", right: "Match 3" },
      ],
      pairOrder: undefined,
      extendedRows: false,
      showWordBank: false,
      showFirstAsExample: false,
      visibility: "both",
    },
  },
  {
    type: "pronunciation",
    label: "Pronunciation",
    description: "Match words and pronunciations with column headers",
    labelKey: "pronunciation",
    descriptionKey: "pronunciationDesc",
    icon: "ArrowLeftRight",
    category: "interactive",
    translations: { de: { label: "Pronunciation", description: "Wort- und Aussprachepaare mit Spaltenköpfen verbinden" } },
    defaultData: {
      type: "pronunciation",
      instruction: "Match the words with their pronunciation.",
      textAboveItems: "",
      leftHeader: "Word",
      rightHeader: "Pronunciation",
      pairs: [
        { id: "p1", left: "through", right: "/θruː/" },
        { id: "p2", left: "thought", right: "/θɔːt/" },
        { id: "p3", left: "though", right: "/ðoʊ/" },
      ],
      pairOrder: undefined,
      extendedRows: false,
      showWordBank: false,
      showFirstAsExample: false,
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
    type: "mcq-matrix",
    label: "MCQ Matrix",
    description: "Evaluate each statement across multiple options",
    labelKey: "mcqMatrix",
    descriptionKey: "mcqMatrixDesc",
    icon: "CheckSquare",
    category: "interactive",
    translations: { de: { label: "MCQ-Matrix", description: "Aussagen mit mehreren Optionen bewerten" } },
    defaultData: {
      type: "mcq-matrix",
      instruction: "Mark the correct options for each statement.",
      showFirstAsExample: false,
      wordBank: [],
      options: [
        { id: "o1", text: "Option 1" },
        { id: "o2", text: "Option 2" },
        { id: "o3", text: "Option 3" },
      ],
      statements: [
        { id: "s1", text: "Statement 1", correctOptionIds: ["o1"] },
        { id: "s2", text: "Statement 2", correctOptionIds: ["o2", "o3"] },
        { id: "s3", text: "Statement 3", correctOptionIds: ["o3"] },
      ],
      visibility: "both",
    },
  },
  {
    type: "mcq-rows",
    label: "MCQ Rows",
    description: "Each row has its own labeled options",
    labelKey: "mcqRows",
    descriptionKey: "mcqRowsDesc",
    icon: "CheckSquare",
    category: "interactive",
    translations: { de: { label: "MCQ-Zeilen", description: "Jede Zeile hat eigene beschriftete Antworten" } },
    defaultData: {
      type: "mcq-rows",
      instruction: "Choose the correct option in each row.",
      showFirstAsExample: false,
      choicesPerItem: 3,
      items: [
        {
          id: "mr1",
          text: "Capital of Switzerland",
          correctChoiceId: "mr1c1",
          choices: [
            { id: "mr1c1", label: "A", text: "Bern" },
            { id: "mr1c2", label: "B", text: "Zurich" },
            { id: "mr1c3", label: "C", text: "Geneva" },
          ],
        },
        {
          id: "mr2",
          text: "2 + 2 =",
          correctChoiceId: "mr2c2",
          choices: [
            { id: "mr2c1", label: "A", text: "3" },
            { id: "mr2c2", label: "B", text: "4" },
            { id: "mr2c3", label: "C", text: "5" },
          ],
        },
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
      shuffleChoices: true,
      showFirstAsExample: false,
      visibility: "both",
    },
  },
  {
    type: "crossword",
    label: "Crossword",
    description: "Auto-generated crossword from answer and hint pairs",
    labelKey: "crossword",
    descriptionKey: "crosswordDesc",
    icon: "Grid3X3",
    category: "games",
    translations: { de: { label: "Kreuzworträtsel", description: "Automatisch erzeugtes Kreuzworträtsel aus Antwort-Hinweis-Paaren" } },
    defaultData: {
      type: "crossword",
      instruction: "Solve the crossword.",
      items: [
        { id: "cw1", answer: "apple", hint: "A red or green fruit" },
        { id: "cw2", answer: "pear", hint: "A green fruit with a narrow top" },
        { id: "cw3", answer: "grape", hint: "A small fruit that grows in bunches" },
      ],
      grid: [],
      placements: [],
      generationError: null,
      twoColumnClues: false,
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
      rowHeight: 1.9,
      grid: [],
      allowedDirections: {
        leftToRight: true,
        upToDown: true,
      },
      showFirstAsExample: false,
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
      twoColumnCategoryLines: false,
      colorCode: false,
      showFirstAsExample: false,
      visibility: "both",
    },
  },
  {
    type: "correct-spelling",
    label: "Correct Spelling",
    description: "Find the correctly spelled word in each row",
    labelKey: "correctSpelling",
    descriptionKey: "correctSpellingDesc",
    icon: "SpellCheck",
    category: "spelling",
    translations: { de: { label: "Rechtschreibung erkennen", description: "Das korrekt geschriebene Wort in jeder Zeile finden" } },
    defaultData: {
      type: "correct-spelling",
      instruction: "",
      words: [
        { id: "cs1", word: "school", displayCount: 10 },
        { id: "cs2", word: "teacher", displayCount: 10 },
        { id: "cs3", word: "garden", displayCount: 10 },
      ],
      keepLeftCharacters: 0,
      keepRightCharacters: 0,
      equalItemWidth: false,
      showFirstAsExample: false,
      itemOrder: undefined,
      visibility: "both",
    },
  },
  {
    type: "correct-numbers",
    label: "Correct Numbers",
    description: "Find the correctly written number in each row",
    labelKey: "correctNumbers",
    descriptionKey: "correctNumbersDesc",
    icon: "Hash",
    category: "spelling",
    translations: { de: { label: "Zahlen erkennen", description: "Die korrekt geschriebene Zahl in jeder Zeile finden" } },
    defaultData: {
      type: "correct-numbers",
      instruction: "",
      words: [
        { id: "cn1", word: "074 123 45 67", displayCount: 10 },
        { id: "cn2", word: "12'450.80", displayCount: 10 },
        { id: "cn3", word: "1 234 567", displayCount: 10 },
      ],
      keepLeftCharacters: 0,
      keepRightCharacters: 0,
      showFirstAsExample: false,
      itemOrder: undefined,
      visibility: "both",
    },
  },
  {
    type: "missing-letters",
    label: "Missing Letters",
    description: "Show words with one missing letter per variant",
    labelKey: "missingLetters",
    descriptionKey: "missingLettersDesc",
    icon: "SpellCheck",
    category: "spelling",
    translations: { de: { label: "Fehlende Buchstaben", description: "Wörter mit jeweils einem fehlenden Buchstaben anzeigen" } },
    defaultData: {
      type: "missing-letters",
      instruction: "",
      words: [
        { id: "ml1", word: "school", displayCount: 10 },
        { id: "ml2", word: "teacher", displayCount: 10 },
        { id: "ml3", word: "garden", displayCount: 10 },
      ],
      keepLeftCharacters: 0,
      keepRightCharacters: 0,
      showFirstAsExample: false,
      itemOrder: undefined,
      visibility: "both",
    },
  },
  {
    type: "letter-code",
    label: "Letter Code",
    description: "Two-row numbered code grid with square cells",
    labelKey: "letterCode",
    descriptionKey: "letterCodeDesc",
    icon: "Grid3X3",
    category: "spelling",
    translations: { de: { label: "Buchstabencode", description: "Zweizeiliges nummeriertes Code-Raster mit quadratischen Feldern" } },
    defaultData: {
      type: "letter-code",
      instruction: "",
      items: [
        { id: "lc1", clue: "Gebaeude zum Wohnen", word: "HA[U]S" },
        { id: "lc2", clue: "Ort zum Lernen", word: "SCH[U]LE" },
      ],
      letterOrder: undefined,
      helperLetters: [],
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
      hideSolutionsInSolutionRender: false,
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
    type: "start-sentences",
    label: "Start Sentences",
    description: "Sentence beginnings with writing line above",
    labelKey: "startSentences",
    descriptionKey: "startSentencesDesc",
    icon: "TextCursorInput",
    category: "interactive",
    translations: { de: { label: "Sätze beginnen", description: "Satzanfänge mit Schreiblinie darüber" } },
    defaultData: {
      type: "start-sentences",
      instruction: "Beginne den Satz mit dem vorgegebenen Wort.",
      sentences: [
        { id: "ss1", beginning: "… gehe gerne in die Schule." },
        { id: "ss2", beginning: "… spielen wir Fussball." },
      ],
      visibility: "both",
    },
  },
  {
    type: "reading-comprehension",
    label: "Reading Comprehension",
    description: "Answer reading questions with writing lines",
    labelKey: "readingComprehension",
    descriptionKey: "readingComprehensionDesc",
    icon: "BookOpen",
    category: "interactive",
    translations: { de: { label: "Leseverstehen", description: "Fragen zum Text mit Schreiblinien beantworten" } },
    defaultData: {
      type: "reading-comprehension",
      instruction: "Beantworte die Fragen zum Text.",
      readingText: "",
      letterItemNumbering: false,
      continueNumbering: false,
      trueLabel: "",
      falseLabel: "",
      layoutType: "default",
      formFieldLabels: [""],
      formColumns: 2,
      sentences: [
        { id: "rc1", question: "Warum geht Lara früh zur Schule?", beginning: "Lara geht früh zur Schule, weil ...", fieldValues: [""] },
        { id: "rc2", question: "Was macht sie vor dem Unterricht?", beginning: "Vor dem Unterricht ...", fieldValues: [""] },
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
      instruction: "Read the dialogue and complete the gaps.",
      items: [
        { id: "dl1", speaker: "Mary", icon: "triangle", text: "Hello, {{blank:how}} are you?" },
        { id: "dl2", speaker: "Peter", icon: "circle", text: "I am fine, thank you!" },
      ],
      showSpeakers: true,
      showWordBank: false,
      showOriginal: false,
      originalColumnRatio: "1:1",
      originalLeftColWidth: 50,
      showFirstAsExample: false,
      visibility: "both",
    },
  },
  {
    type: "lueckenzeilen",
    label: "Lückenzeilen",
    description: "Gap lines without speaker icons",
    labelKey: "lueckenzeilen",
    descriptionKey: "lueckenzeilenDesc",
    icon: "MessageSquareText",
    category: "interactive",
    translations: { de: { label: "Lückenzeilen", description: "Lückenzeilen ohne Sprecher und Symbole" } },
    defaultData: {
      type: "lueckenzeilen",
      instruction: "Complete the gaps.",
      items: [
        { id: "lz1", text: "Hello, {{blank:how}} are you?" },
        { id: "lz2", text: "I am {{blank:fine}}." },
      ],
      showWordBank: false,
      showOriginal: false,
      originalColumnRatio: "1:1",
      originalLeftColWidth: 50,
      showFirstAsExample: false,
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
  type: "subject",
  label: "Subject",
  description: "Subject items without numbering",
  labelKey: "subject",
  descriptionKey: "subjectDesc",
  icon: "ListOrdered",
  category: "layout",
  translations: { de: { label: "Thema", description: "Themenpunkte ohne Nummerierung" } },
  defaultData: {
    type: "subject",
    items: [
      { id: crypto.randomUUID(), content: "" },
    ],
    bgColor: "",
    borderRadius: 6,
    visibility: "both",
  },
},
{
  type: "box",
  label: "Box",
  description: "Legend-style bordered text group",
  labelKey: "box",
  descriptionKey: "boxDesc",
  icon: "Square",
  category: "layout",
  translations: { de: { label: "Box", description: "Gerahmte Textgruppe mit Titel" } },
  defaultData: {
    type: "box",
    title: "",
    items: [
      { id: crypto.randomUUID(), content: "" },
    ],
    addTopBlockGap: false,
    borderRadius: 6,
    visibility: "both",
  },
},
{
  type: "quartett",
  label: "Quartett",
  description: "Items with four reorderable subitems",
  labelKey: "quartett",
  descriptionKey: "quartettDesc",
  icon: "Grid3X3",
  category: "games",
  translations: { de: { label: "Quartett", description: "Elemente mit vier umsortierbaren Unterpunkten" } },
  defaultData: {
    type: "quartett",
    title: "",
    showGroupTitle: true,
    showFooter: true,
    items: [
      {
        id: crypto.randomUUID(),
        title: "",
        subitems: Array.from({ length: 4 }, () => ({
          id: crypto.randomUUID(),
          content: "",
        })),
      },
    ],
    visibility: "both",
  },
},
{
  type: "taboo",
  label: "Taboo",
  description: "Word cards with four stop words",
  labelKey: "taboo",
  descriptionKey: "tabooDesc",
  icon: "TriangleAlert",
  category: "games",
  translations: { de: { label: "Taboo", description: "Wortkarten mit vier Stoppwörtern" } },
  defaultData: {
    type: "taboo",
    title: "",
    subtitle: "",
    items: [
      {
        id: crypto.randomUUID(),
        title: "",
        subitems: Array.from({ length: 4 }, () => ({
          id: crypto.randomUUID(),
          content: "",
        })),
      },
    ],
    visibility: "both",
  },
},
{
  type: "accordion",
  label: "Accordion",
  description: "Collapsible sections",
  labelKey: "accordion",
  descriptionKey: "accordionDesc",
  icon: "ChevronDown",
  category: "content",
  translations: { de: { label: "Akkordeon", description: "Aufklappbare Abschnitte" } },
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
    description: "",
    tableStyle: "default",
    hideHeader: false,
    visibility: "both",
  },
},
{
  type: "table-cloud",
  label: "Table Cloud",
  description: "Table with randomized word-bank rows above",
  labelKey: "tableCloud",
  descriptionKey: "tableCloudDesc",
  icon: "Table",
  category: "content",
  translations: { de: { label: "Tabelle Wolke", description: "Tabelle mit zufälliger Wortbank darüber" } },
  defaultData: {
    type: "table-cloud",
    content: '<table><tbody><tr><th colspan="1" rowspan="1"><p></p></th><th colspan="1" rowspan="1"><p></p></th><th colspan="1" rowspan="1"><p></p></th></tr><tr><td colspan="1" rowspan="1"><p></p></td><td colspan="1" rowspan="1"><p></p></td><td colspan="1" rowspan="1"><p></p></td></tr><tr><td colspan="1" rowspan="1"><p></p></td><td colspan="1" rowspan="1"><p></p></td><td colspan="1" rowspan="1"><p></p></td></tr></tbody></table>',
    description: "",
    tableStyle: "default",
    hideHeader: false,
    cloudRows: "",
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
      { id: "s1", date: "", start: "", end: "", room: "", title: "", description: "" },
      { id: "s2", date: "", start: "", end: "", room: "", title: "", description: "" },
      { id: "s3", date: "", start: "", end: "", room: "", title: "", description: "" },
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
// ─── Bingo Cards block definition ──────────────────────────
BLOCK_LIBRARY.push({
  type: "bingo-cards",
  label: "Bingo Cards",
  description: "Bingo cards with customizable grid and modes",
  labelKey: "bingoCards",
  descriptionKey: "bingoCardsDesc",
  icon: "Grid3X3",
  category: "games",
  translations: { de: { label: "Bingo-Karten", description: "Bingo-Karten mit anpassbarem Raster und Modi" } },
  defaultData: {
    type: "bingo-cards",
    gridSize: 5,
    mode: "same",
    contentType: "text",
    items: [],
    randomize: true,
    cardWidthMm: 148.5,
    cardHeightMm: 105,
    showCuttingLine: true,
    visibility: "both",
  },
});
