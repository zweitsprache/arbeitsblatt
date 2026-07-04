export type PageComposerMode = "flow" | "page";

export type PageComposerStatus = "idle" | "stale" | "ready";

export interface PageCompositionBlockRef {
  blockId: string;
  order: number;
  /**
   * Optional split metadata for future block-splitting support.
   * Undefined means the block is rendered as a whole on this page.
   */
  splitFromBlockId?: string;
  splitPartIndex?: number;
}

export interface PageCompositionPage {
  id: string;
  index: number;
  widthPx: number;
  heightPx: number;
  capacityPx: number;
  usedPx: number;
  blockRefs: PageCompositionBlockRef[];
  overflowBlockIds: string[];
}

export interface PageCompositionMeta {
  pageSize: "a4" | "letter";
  orientation: "portrait" | "landscape" | "landscape-canva";
  generatedAt: number;
  sourceRevision: number;
}

export interface PageCompositionSnapshot {
  pages: PageCompositionPage[];
  overflowBlockIds: string[];
  meta: PageCompositionMeta;
}

export interface PageCompositionState {
  mode: PageComposerMode;
  status: PageComposerStatus;
  pages: PageCompositionPage[];
  overflowBlockIds: string[];
  meta?: PageCompositionMeta;
  revision: number;
  dirty: boolean;
}

export const INITIAL_PAGE_COMPOSITION_STATE: PageCompositionState = {
  mode: "flow",
  status: "idle",
  pages: [],
  overflowBlockIds: [],
  meta: undefined,
  revision: 0,
  dirty: false,
};
