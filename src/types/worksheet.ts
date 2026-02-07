// ─── Visibility ──────────────────────────────────────────────
export type BlockVisibility = "both" | "print" | "online";

// ─── View mode ───────────────────────────────────────────────
export type ViewMode = "print" | "online";

// ─── Block types ─────────────────────────────────────────────
export type BlockType =
  | "heading"
  | "text"
  | "image"
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
  | "sorting-categories";

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
}

// ─── Image block ─────────────────────────────────────────────
export interface ImageBlock extends BlockBase {
  type: "image";
  src: string;
  alt: string;
  width?: number;
  caption?: string;
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
  statements: {
    id: string;
    text: string;
    correctAnswer: boolean; // true = True, false = False
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
// Text with inline choices marked as {{choice:option1|option2|*correctOption|option3}}
// The correct option is prefixed with *
export interface InlineChoicesBlock extends BlockBase {
  type: "inline-choices";
  content: string;
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
}

// ─── Union type ──────────────────────────────────────────────
export type WorksheetBlock =
  | HeadingBlock
  | TextBlock
  | ImageBlock
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
  | SortingCategoriesBlock;

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
  fontFamily: "Inter, sans-serif",
};

// ─── Block library definitions ──────────────────────────────
export interface BlockDefinition {
  type: BlockType;
  label: string;
  description: string;
  icon: string; // lucide icon name
  category: "layout" | "content" | "interactive";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  defaultData: Record<string, any> & { type: BlockType; visibility: BlockVisibility };
}

export const BLOCK_LIBRARY: BlockDefinition[] = [
  // Layout blocks
  {
    type: "heading",
    label: "Heading",
    description: "Title or section heading",
    icon: "Heading",
    category: "content",
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
    icon: "Type",
    category: "content",
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
    icon: "Image",
    category: "content",
    defaultData: {
      type: "image",
      src: "",
      alt: "",
      visibility: "both",
    },
  },
  {
    type: "spacer",
    label: "Spacer",
    description: "Add vertical spacing",
    icon: "Space",
    category: "layout",
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
    icon: "Minus",
    category: "layout",
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
    icon: "Columns2",
    category: "layout",
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
    icon: "CircleDot",
    category: "interactive",
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
    icon: "TextCursorInput",
    category: "interactive",
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
    icon: "ArrowLeftRight",
    category: "interactive",
    defaultData: {
      type: "matching",
      instruction: "Match the items on the left with the items on the right.",
      pairs: [
        { id: "p1", left: "Item 1", right: "Match 1" },
        { id: "p2", left: "Item 2", right: "Match 2" },
        { id: "p3", left: "Item 3", right: "Match 3" },
      ],
      visibility: "both",
    },
  },
  {
    type: "open-response",
    label: "Open Response",
    description: "Free-form writing area",
    icon: "PenLine",
    category: "interactive",
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
    icon: "LayoutList",
    category: "interactive",
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
    icon: "CheckSquare",
    category: "interactive",
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
    icon: "ListOrdered",
    category: "interactive",
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
    icon: "TextSelect",
    category: "interactive",
    defaultData: {
      type: "inline-choices",
      content: "In {{choice:1889|*1988|1898}} he was born in London.",
      visibility: "both",
    },
  },
  {
    type: "word-search",
    label: "Word Search",
    description: "Word search puzzle grid",
    icon: "Search",
    category: "interactive",
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
    icon: "Group",
    category: "interactive",
    defaultData: {
      type: "sorting-categories",
      instruction: "Sort the following items into the correct categories.",
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
      visibility: "both",
    },
  },
];
