import type { WorksheetBlock, WorksheetSettings } from "@/types/worksheet";
import type {
  PageCompositionMeta,
  PageCompositionPage,
  PageCompositionSnapshot,
} from "@/types/page-composition";

function getPageDimensionsPx(settings: WorksheetSettings): { widthPx: number; heightPx: number } {
  const isLandscape = settings.orientation === "landscape" || settings.orientation === "landscape-canva";
  if (settings.pageSize === "letter") {
    return isLandscape ? { widthPx: 1056, heightPx: 816 } : { widthPx: 816, heightPx: 1056 };
  }
  return isLandscape ? { widthPx: 1123, heightPx: 794 } : { widthPx: 794, heightPx: 1123 };
}

function estimateBlockHeightPx(block: WorksheetBlock): number {
  switch (block.type) {
    case "heading":
    case "numbered-heading":
      return 64;
    case "title":
      return 72;
    case "image":
      return 260;
    case "columns":
    case "grid":
      return 280;
    case "accordion":
      return 220;
    case "table":
    case "table-cloud":
    case "image-text-table":
      return 320;
    case "spacer":
      return 36;
    case "gap-spacer":
      return 24;
    case "divider":
      return 24;
    case "page-break":
      return 0;
    default:
      return 160;
  }
}

function buildPageMeta(settings: WorksheetSettings, sourceRevision: number): PageCompositionMeta {
  return {
    pageSize: settings.pageSize,
    orientation: settings.orientation,
    generatedAt: Date.now(),
    sourceRevision,
  };
}

function getPageCapacityPx(settings: WorksheetSettings, pageHeightPx: number): number {
  const verticalMargins = Math.max(0, settings.margins.top) + Math.max(0, settings.margins.bottom);
  const headerReserve = settings.showHeader ? 114 : 0;
  const footerReserve = settings.showFooter ? 95 : 0;
  return Math.max(120, pageHeightPx - verticalMargins - headerReserve - footerReserve);
}

function createEmptyPage(index: number, widthPx: number, heightPx: number, capacityPx: number): PageCompositionPage {
  return {
    id: `page-${index + 1}`,
    index,
    widthPx,
    heightPx,
    capacityPx,
    usedPx: 0,
    blockRefs: [],
    overflowBlockIds: [],
  };
}

export function composePages(
  blocks: WorksheetBlock[],
  settings: WorksheetSettings,
  sourceRevision: number,
): PageCompositionSnapshot {
  const { widthPx, heightPx } = getPageDimensionsPx(settings);
  const capacityPx = getPageCapacityPx(settings, heightPx);

  const pages: PageCompositionPage[] = [];
  const overflowSet = new Set<string>();

  let currentPage = createEmptyPage(0, widthPx, heightPx, capacityPx);
  let pageIndex = 0;

  const pushCurrentPage = () => {
    pages.push(currentPage);
    pageIndex += 1;
    currentPage = createEmptyPage(pageIndex, widthPx, heightPx, capacityPx);
  };

  blocks.forEach((block, order) => {
    if (block.type === "page-break") {
      if (currentPage.blockRefs.length > 0 || pages.length === 0) {
        pushCurrentPage();
      }
      return;
    }

    const estimatedHeight = estimateBlockHeightPx(block);
    const wouldOverflow = currentPage.usedPx + estimatedHeight > currentPage.capacityPx;

    if (wouldOverflow && currentPage.blockRefs.length > 0) {
      pushCurrentPage();
    }

    currentPage.blockRefs.push({
      blockId: block.id,
      order,
    });
    currentPage.usedPx += estimatedHeight;

    if (estimatedHeight > currentPage.capacityPx) {
      currentPage.overflowBlockIds.push(block.id);
      overflowSet.add(block.id);
    }
  });

  if (currentPage.blockRefs.length > 0 || pages.length === 0) {
    pages.push(currentPage);
  }

  return {
    pages,
    overflowBlockIds: Array.from(overflowSet),
    meta: buildPageMeta(settings, sourceRevision),
  };
}
