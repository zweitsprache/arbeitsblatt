"use client";

import React from "react";
import { useTranslations } from "next-intl";
import {
  useDroppable,
} from "@dnd-kit/core";
import { useEditor } from "@/store/editor-store";
import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { resolveBrandFontFamilyOverride } from "@/lib/brand-font-utils";
import { filterBlocksByDisplay } from "@/lib/block-visibility";
import { getFontBaselineAdjustment } from "@/lib/font-baseline";
import {
  getPageDimensionsMm,
  getPageDimensionsPx,
  getPrintBodyHeightPx,
  getPrintFooterReservePx,
  mmToPx,
  PRINT_HEADER_HEIGHT_MM,
} from "@/lib/print-layout";
import { buildPrintFrame } from "@/lib/print-frame";
import {
  applyBrandOverrides,
  BLOCK_LIBRARY,
  type BlockType,
  resolveBrandLogo,
  resolveSubProfileHeaderFooter,
  type WorksheetBlock,
} from "@/types/worksheet";
import { ViewerBlockRenderer } from "@/components/viewer/viewer-block-renderer";


function DropIndicator({ isActive }: { isActive: boolean }) {
  return (
    <div
      className={`relative transition-all duration-200 ${isActive ? "h-1" : "h-0"}`}
    >
      {isActive && (
        <div className="absolute inset-x-0 top-0 flex items-center">
          <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
          <div className="flex-1 h-0.5 bg-primary" />
          <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
        </div>
      )}
    </div>
  );
}

function BlockDropZone({
  id,
  side,
}: {
  id: string;
  side: "before" | "after";
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`absolute left-0 right-0 z-20 ${side === "before" ? "-top-3 h-6" : "-bottom-3 h-6"}`}
    >
      <div
        className={`pointer-events-none absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-sky-500 transition-opacity ${
          isOver ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}

function BlockInsertPopover({
  index,
  side,
  targetBlockId,
}: {
  index: number;
  side: "before" | "after";
  targetBlockId: string;
}) {
  const tb = useTranslations("blocks");
  const tc = useTranslations("common");
  const { state, access, dispatch, addBlock, canAddBlockType } = useEditor();
  const [open, setOpen] = React.useState(false);
  const availableBlocks = React.useMemo(
    () => BLOCK_LIBRARY.filter((definition) => canAddBlockType(definition.type as BlockType)),
    [canAddBlockType],
  );
  const canMoveSelectedHere =
    access.features.reorderBlocks &&
    !!state.selectedBlockId &&
    state.selectedBlockId !== targetBlockId;

  if (availableBlocks.length === 0 && !canMoveSelectedHere) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`absolute left-1/2 z-30 flex h-5 -translate-x-1/2 items-center gap-1 rounded-full border border-sky-300 bg-white px-2 text-[10px] font-medium text-sky-700 opacity-0 shadow-sm transition-opacity hover:bg-sky-50 group-hover/worksheet-block:opacity-100 focus-visible:opacity-100 ${
            side === "before" ? "-top-2.5" : "-bottom-2.5"
          }`}
          onClick={(event) => event.stopPropagation()}
        >
          <Plus className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="center"
        side="right"
        className="z-50 w-72 p-1"
        onClick={(event) => event.stopPropagation()}
      >
        {canMoveSelectedHere ? (
          <button
            type="button"
            className="mb-1 flex w-full items-center justify-between rounded-[4px] bg-sky-50 px-2 py-1.5 text-left text-xs font-semibold text-sky-800 hover:bg-sky-100"
            onClick={() => {
              if (!state.selectedBlockId) return;
              dispatch({
                type: "MOVE_BLOCK",
                payload: {
                  activeId: state.selectedBlockId,
                  overId: targetBlockId,
                  position: side === "before" ? "above" : "below",
                },
              });
              setOpen(false);
            }}
          >
            <span>{tc("move")}</span>
            <span className="text-[10px] font-normal text-sky-700">{side}</span>
          </button>
        ) : null}
        <div className="max-h-80 overflow-auto">
          {availableBlocks.map((definition) => (
            <button
              key={definition.type}
              type="button"
              className="flex w-full flex-col rounded-[4px] px-2 py-1.5 text-left hover:bg-slate-100"
              onClick={() => {
                addBlock(definition.type as BlockType, index);
                setOpen(false);
              }}
            >
              <span className="text-xs font-semibold leading-tight">{tb(definition.labelKey)}</span>
              <span className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{tb(definition.descriptionKey)}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function BlockStructureToolbar({
  block,
}: {
  block: WorksheetBlock;
}) {
  const tc = useTranslations("common");
  const tb = useTranslations("blockRenderer");
  const { state, access, dispatch, duplicateBlock, moveBlockByStep } = useEditor();
  const blockIndex = state.blocks.findIndex((candidate) => candidate.id === block.id);
  const canMoveUp = access.features.reorderBlocks && blockIndex > 0;
  const canMoveDown = access.features.reorderBlocks && blockIndex >= 0 && blockIndex < state.blocks.length - 1;
  const canDuplicate = access.features.duplicateBlocks;
  const canDelete = access.features.deleteBlocks;

  return (
    <div
      className="absolute -top-8 left-0 z-40 flex gap-1 rounded-md border border-slate-200 bg-white p-1 opacity-0 shadow-sm transition-opacity group-hover/worksheet-block:opacity-100 group-focus-within/worksheet-block:opacity-100"
      onClick={(event) => event.stopPropagation()}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="rounded p-1 hover:bg-slate-100 disabled:opacity-35 disabled:hover:bg-transparent"
            disabled={!canMoveUp}
            onClick={() => moveBlockByStep(block.id, "up")}
          >
            <ArrowUp className="h-3.5 w-3.5 text-slate-600" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-xs">{tb("moveBlockUp")}</p>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="rounded p-1 hover:bg-slate-100 disabled:opacity-35 disabled:hover:bg-transparent"
            disabled={!canMoveDown}
            onClick={() => moveBlockByStep(block.id, "down")}
          >
            <ArrowDown className="h-3.5 w-3.5 text-slate-600" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-xs">{tb("moveBlockDown")}</p>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="rounded p-1 hover:bg-slate-100 disabled:opacity-35 disabled:hover:bg-transparent"
            disabled={!canDuplicate}
            onClick={() => duplicateBlock(block.id)}
          >
            <Copy className="h-3.5 w-3.5 text-slate-600" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-xs">{tc("duplicate")}</p>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="rounded p-1 hover:bg-red-50 disabled:opacity-35 disabled:hover:bg-transparent"
            disabled={!canDelete}
            onClick={() => dispatch({ type: "REMOVE_BLOCK", payload: block.id })}
          >
            <Trash2 className="h-3.5 w-3.5 text-red-600" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-xs">{tc("delete")}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

function EmptyDropZone() {
  const t = useTranslations("canvas");
  const { setNodeRef, isOver } = useDroppable({ id: "canvas-drop-zone" });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col items-center justify-center min-h-[400px] text-muted-foreground rounded-lg border-2 border-dashed transition-colors
        ${isOver ? "border-primary bg-primary/5" : "border-transparent"}`}
    >
      <Plus className="h-12 w-12 mb-4 opacity-30" />
      <p className="text-lg font-medium opacity-50">
        {t("dragBlocksHere")}
      </p>
      <p className="text-sm opacity-30 mt-1">
        {t("orDoubleClick")}
      </p>
    </div>
  );
}

export function WorksheetCanvas({
  activeId,
  overId,
  overPosition,
  showPageGuides = true,
}: {
  activeId: string | null;
  overId: string | null;
  overPosition: "above" | "below";
  showPageGuides?: boolean;
}) {
  const { state, dispatch } = useEditor();
  const { setNodeRef: setCanvasRef, isOver: isCanvasOver } = useDroppable({ id: "canvas-drop-zone" });
  const blockRefs = React.useRef<Map<string, HTMLDivElement>>(new Map());

  const clearSelectionIfWorkspaceClick = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      dispatch({ type: "SELECT_BLOCK", payload: null });
    }
  }, [dispatch]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isPresentationMode = (state.settings as any)._presentationMode === true;
  const isLandscape = state.settings.orientation === "landscape" || state.settings.orientation === "landscape-canva";
  const isCanvaLandscape = state.settings.orientation === "landscape-canva";

  // Page dimensions (A4/Letter at 96 DPI, landscape swaps those values)
  // NOTE: mm strings are the source of truth for the sheet — this matches @page
  // size in the print/PDF path exactly. The px value is used only for the
  // JS pagination arithmetic that still lives in this component.
  const { widthMm: pageWidthMm, heightMm: pageHeightMm } = getPageDimensionsMm(state.settings);
  const { heightPx: printPageHeight } = getPageDimensionsPx(state.settings);
  const pageHeight = isPresentationMode ? 630 : printPageHeight;

  // ─── Resolve header/footer from brand settings ─────────────
  const resolvedProfile = applyBrandOverrides(
    state.brandProfile,
    state.settings.brandOverrides,
  );
  const fontStylesheetUrls = Array.from(
    new Set(resolvedProfile.googleFontsUrl?.trim() ? [resolvedProfile.googleFontsUrl.trim()] : []),
  );
  const resolvedBodyFontFamily = resolvedProfile.bodyFont || "'Encode Sans Semi Condensed', sans-serif";
  const brandKey = (state.settings.brand || "worksheet").replace(/[^a-zA-Z0-9_-]+/g, "-");
  const exampleFontOverride = resolveBrandFontFamilyOverride(resolvedProfile.exampleTextFont, {
    fallbackFontFamily: resolvedBodyFontFamily,
    generatedFamilyNamePrefix: `worksheet-example-${brandKey}`,
  });

  const nonEmpty = (value?: string | null, fallback?: string) => {
    const v = value?.trim();
    return v ? v : fallback ?? "";
  };
  const resolvedHeadlineFont = nonEmpty(resolvedProfile.headlineFont, resolvedBodyFontFamily);

  const brandHeaderFooter = {
    logo: resolveBrandLogo(resolvedProfile, "full"),
    organization: resolvedProfile.organization,
    teacher: resolvedProfile.teacher,
    headerLeft: "",
    headerRight: nonEmpty(state.settings.brandOverrides?.headerRight, resolvedProfile.headerRight),
    footerLeft: nonEmpty(state.settings.brandOverrides?.footerLeft, resolvedProfile.footerLeft),
    footerCenter: nonEmpty(state.settings.brandOverrides?.footerCenter, resolvedProfile.footerCenter),
    footerRight: nonEmpty(state.settings.brandOverrides?.footerRight, resolvedProfile.footerRight),
  };

  // Apply sub-profile header/footer overrides (variant 1 = multiline)
  const subHeaders = resolveSubProfileHeaderFooter(resolvedProfile, state.settings.subProfileId, 1);
  if (subHeaders) {
    brandHeaderFooter.headerLeft = subHeaders.headerLeft;
    brandHeaderFooter.headerRight = subHeaders.headerRight;
    brandHeaderFooter.footerLeft = subHeaders.footerLeft;
    brandHeaderFooter.footerRight = subHeaders.footerRight;
  }

  // Replace template variables (online/editor mode — no page numbers)
  const replaceVariables = (html: string): string => {
    const now = new Date();
    const dateStr = now.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" });
    return html
      .replace(/\{current_date\}/g, dateStr)
      .replace(/\{current_year\}/g, String(now.getFullYear()))
      .replace(/\{organization\}/g, brandHeaderFooter.organization || "")
      .replace(/\{teacher\}/g, brandHeaderFooter.teacher || "")
      .replace(/\{worksheet_uuid\}/g, (state.worksheetId || "").toUpperCase())
      .replace(/\{current_page\}/g, "")
      .replace(/\{no_of_pages\}/g, "");
  };

  const hasLogo = !!brandHeaderFooter.logo;
  const processedHeaderLeft = replaceVariables(brandHeaderFooter.headerLeft || "");
  const processedHeaderRight = replaceVariables(brandHeaderFooter.headerRight || "");
  const processedFooterLeft = replaceVariables(brandHeaderFooter.footerLeft || "");
  const processedFooterCenter = replaceVariables(brandHeaderFooter.footerCenter || "");
  const processedFooterRight = replaceVariables(brandHeaderFooter.footerRight || "");
  const hasHeaderLeft = !!processedHeaderLeft;
  const hasHeaderRight = !!processedHeaderRight;
  const hasFooterLeft = !!processedFooterLeft;
  const hasFooterCenter = !!processedFooterCenter || !!state.settings.footerText;
  const hasFooterRight = !!processedFooterRight;
  const showHeader = state.settings.showHeader && (hasLogo || hasHeaderLeft || hasHeaderRight);
  const showFooter = state.settings.showFooter && (hasFooterLeft || hasFooterCenter || hasFooterRight);
  const headerFooterFont =
    resolvedProfile.headerFooterFont?.trim() || "'Encode Sans', sans-serif";
  const resolvedBodyFontSize = resolvedProfile.textBaseSize || `${state.settings.fontSize || 12.5}px`;
  const normalizeWeight = (value: unknown, fallback: number): number => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Number(value.trim());
      if (Number.isFinite(parsed)) return parsed;
    }
    return fallback;
  };
  const resolvedHeadlineWeight = normalizeWeight(resolvedProfile.headlineWeight, 700);
  const resolvedH1Weight = normalizeWeight(resolvedProfile.h1Weight, resolvedHeadlineWeight);
  const resolvedH2Weight = normalizeWeight(resolvedProfile.h2Weight, resolvedHeadlineWeight);
  const resolvedH3Weight = normalizeWeight(resolvedProfile.h3Weight, resolvedHeadlineWeight);
  const resolvedH4Weight = normalizeWeight(resolvedProfile.h4Weight, resolvedHeadlineWeight);
  const resolvedH1HeadingNumberWeight = normalizeWeight(resolvedProfile.h1HeadingNumberWeight, resolvedH1Weight);
  const resolvedH2HeadingNumberWeight = normalizeWeight(resolvedProfile.h2HeadingNumberWeight, resolvedH2Weight);
  const resolvedH3HeadingNumberWeight = normalizeWeight(resolvedProfile.h3HeadingNumberWeight, resolvedH3Weight);
  const resolvedH4HeadingNumberWeight = normalizeWeight(resolvedProfile.h4HeadingNumberWeight, resolvedH4Weight);
  const headingNumberFormats = {
    h1: resolvedProfile.h1NumberFormat || "numbers",
    h2: resolvedProfile.h2NumberFormat || "numbers",
    h3: resolvedProfile.h3NumberFormat || "numbers",
    h4: resolvedProfile.h4NumberFormat || "numbers",
  };
  const headingColors = {
    h1: resolvedProfile.h1HeadingColor || "primary",
    h2: resolvedProfile.h2HeadingColor || "primary",
    h3: resolvedProfile.h3HeadingColor || "primary",
    h4: resolvedProfile.h4HeadingColor || "primary",
  };
  const headingNumberColors = {
    h1: resolvedProfile.h1HeadingNumberColor || "primary",
    h2: resolvedProfile.h2HeadingNumberColor || "primary",
    h3: resolvedProfile.h3HeadingNumberColor || "primary",
    h4: resolvedProfile.h4HeadingNumberColor || "primary",
  };
  const headingBottomMargins = {
    h1: resolvedProfile.h1BottomMargin,
    h2: resolvedProfile.h2BottomMargin,
    h3: resolvedProfile.h3BottomMargin,
    h4: resolvedProfile.h4BottomMargin,
  };
  const itemNumberFormat = resolvedProfile.itemNumberFormat || "default";
  const canvasBackgroundColor = resolvedProfile.primaryColor
    ? `color-mix(in srgb, ${resolvedProfile.primaryColor} 6%, white)`
    : "#f1f5f9";

  const footerReserveHeight = getPrintFooterReservePx(state.settings, showFooter);

  // Usable height for body content = page height minus header/footer regions
  const usableHeight = getPrintBodyHeightPx(state.settings, pageHeight, showHeader, showFooter);

  const blockGap = resolvedProfile.blockGap || "1.5rem";

  const parseGapToPx = React.useCallback((value: string): number => {
    const trimmed = value.trim();
    const numeric = Number.parseFloat(trimmed);
    if (!Number.isFinite(numeric)) return 24;
    if (trimmed.endsWith("px")) return numeric;
    if (trimmed.endsWith("mm")) return mmToPx(numeric);
    if (trimmed.endsWith("rem")) return numeric * 16;
    return numeric;
  }, []);
  const blockGapPx = parseGapToPx(blockGap);

  const isCardSheetBlock = (block: WorksheetBlock) => (
    block.type === "domino" ||
    block.type === "flashcards" ||
    block.type === "aufgabenkarten" ||
    block.type === "bingo-cards" ||
    block.type === "quartett" ||
    block.type === "taboo" ||
    block.type === "syllable-cards"
  );

  // ─── Shared print/PDF frame: applies the same .print-worksheet-root
  //     .print-skin-final class chain + CSS variables to the editor canvas
  //     that the print/PDF viewer uses. This is what keeps editor typography
  //     (fonts, headings, block gaps, TipTap heading sizes/weights, block
  //     spacing rules in globals.css) identical to the Puppeteer PDF output.
  const hasBlock = (type: WorksheetBlock["type"]) => state.blocks.some((b) => b.type === type);
  const hasTabooBlock = hasBlock("taboo");
  const hasTenStopWordTabooBlock = state.blocks.some(
    (b) =>
      b.type === "taboo" &&
      (b.stopWordCount === 10 || b.items.some((item) => item.subitems.length > 4)),
  );
  const useDedicatedTabooPrintHeader = isLandscape && hasTabooBlock;
  const useDedicatedTabooPrintFooter = isLandscape && hasTabooBlock && showFooter;
  const printFrame = buildPrintFrame({
    settings: state.settings,
    resolvedProfile,
    activeBodyFont: resolvedBodyFontFamily,
    headlineFont: resolvedHeadlineFont,
    headerFooterFont,
    resolvedBodyFontSize,
    resolvedLetterSpacing: resolvedProfile.letterSpacing?.trim() || "",
    reserveFooter: showFooter,
    isLandscape,
    isCanvaLandscape,
    presence: {
      domino: hasBlock("domino"),
      flashcards: hasBlock("flashcards"),
      aufgabenkarten: hasBlock("aufgabenkarten"),
      cardPairs: hasBlock("card-pairs"),
      quartett: hasBlock("quartett"),
      taboo: hasBlock("taboo"),
      tabooTen: hasTenStopWordTabooBlock,
      syllableCards: hasBlock("syllable-cards"),
    },
  });


  const getSiblingGapPx = React.useCallback((previousBlock: WorksheetBlock | undefined, block: WorksheetBlock): number => {
    if (!previousBlock) return 0;
    if (previousBlock.type === "page-break") return 0;
    if (isCardSheetBlock(previousBlock) && isCardSheetBlock(block)) return 0;

    return blockGapPx;
  }, [blockGapPx]);

  const visibleBlocks = React.useMemo(
    () => filterBlocksByDisplay(state.blocks, "worksheetPrint"),
    [state.blocks],
  );

  type CanvasBlockUnit = {
    renderId: string;
    sourceBlockId: string;
    block: WorksheetBlock;
    isContinuation: boolean;
  };

  const canvasBlockUnits = React.useMemo<CanvasBlockUnit[]>(() => {
    return visibleBlocks.flatMap((block) => {
      const isSentenceRowsBlock =
        block.type === "fix-sentences" ||
        block.type === "transform-sentences" ||
        block.type === "complete-sentences" ||
        block.type === "start-sentences";

      if (!isSentenceRowsBlock || block.sentences.length <= 1) {
        return [{
          renderId: block.id,
          sourceBlockId: block.id,
          block,
          isContinuation: false,
        }];
      }

      return block.sentences.map((sentence, index) => ({
        renderId: `${block.id}:sentence:${sentence.id}`,
        sourceBlockId: block.id,
        block: {
          ...block,
          instruction: index === 0 ? block.instruction : "",
          sentences: [sentence],
          previewSentenceStartIndex: index,
          ...(block.type === "fix-sentences" ||
          block.type === "transform-sentences"
            ? { showFirstAsExample: index === 0 ? block.showFirstAsExample : false }
            : {}),
        } as unknown as WorksheetBlock,
        isContinuation: index > 0,
      }));
    });
  }, [visibleBlocks]);

  const sourceBlockIndexById = React.useMemo(() => {
    const map = new Map<string, number>();
    state.blocks.forEach((block, index) => map.set(block.id, index));
    return map;
  }, [state.blocks]);

  const canvasUnitIndexByRenderId = React.useMemo(() => {
    const map = new Map<string, number>();
    canvasBlockUnits.forEach((unit, index) => map.set(unit.renderId, index));
    return map;
  }, [canvasBlockUnits]);

  const instructionIndexByBlockId = React.useMemo(() => {
    const map = new Map<string, number>();
    let instructionCount = 0;
    for (const block of visibleBlocks) {
      if (
        (block.type === "heading" && block.level === 3) ||
        (block.type === "numbered-heading" && block.level === 3) ||
        (block.type === "page-break" && (block as { restartPageNumbering?: boolean }).restartPageNumbering)
      ) {
        instructionCount = 0;
        continue;
      }
      if ("instruction" in block && block.instruction && typeof block.instruction === "string" && block.instruction.trim()) {
        map.set(block.id, instructionCount);
        instructionCount++;
      }
    }
    return map;
  }, [visibleBlocks]);

  // ─── Block height measurement ───────────────────────────────
  // We measure block heights outside the render loop (previously the pagination
  // useMemo read blockRefs.current.get(...).offsetHeight during render, which
  // both violated react-hooks/refs and returned stale values on the first pass
  // and on any intra-block edit that didn't touch state.blocks).
  //
  // Approach: after commit, observe every rendered .worksheet-block wrapper
  // with a ResizeObserver, write measured px heights into state, and let the
  // pagination useMemo depend on that state. This means:
  //   1. Content-driven changes (TipTap edits, image loads, font swaps) update
  //      pagination in the same tick they change layout.
  //   2. The pagination algorithm reads from stable state, never from refs.
  //   3. The measurement runs in the exact .print-worksheet-root
  //      .print-skin-final .print-body-content context that the PDF uses
  //      (from Phase 1), so offsetHeight matches the PDF's block height.
  const [blockHeights, setBlockHeights] = React.useState<Record<string, number>>({});

  // Track the block ids currently in state.blocks so the observer effect can
  // detach stale observers when a block is removed.
  const blockIds = React.useMemo(() => canvasBlockUnits.map((unit) => unit.renderId), [canvasBlockUnits]);

  React.useLayoutEffect(() => {
    const activeIds = new Set(blockIds);

    // Seed heights synchronously so the first paginated render can use real
    // values instead of the 100px estimate.
    setBlockHeights((prev) => {
      let changed = false;
      const next: Record<string, number> = {};
      for (const id of blockIds) {
        const el = blockRefs.current.get(id);
        const measured = el ? el.offsetHeight : prev[id] ?? 0;
        next[id] = measured;
        if (measured !== prev[id]) changed = true;
      }
      // Also drop stale ids
      for (const id of Object.keys(prev)) {
        if (!activeIds.has(id)) changed = true;
      }
      return changed ? next : prev;
    });

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      setBlockHeights((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          const id = el.dataset.blockId;
          if (!id || !activeIds.has(id)) continue;
          const height = el.offsetHeight;
          if (next[id] !== height) {
            next[id] = height;
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    });

    for (const id of blockIds) {
      const el = blockRefs.current.get(id);
      if (el) observer.observe(el);
    }

    // Drop refs for removed blocks so the map doesn't leak detached nodes.
    for (const id of Array.from(blockRefs.current.keys())) {
      if (!activeIds.has(id)) blockRefs.current.delete(id);
    }

    return () => observer.disconnect();
  }, [blockIds]);

  // Break blocks into pages based on measured heights.
  const pages = React.useMemo(() => {
    type CanvasPage = { pageNum: number; blocks: CanvasBlockUnit[]; height: number };
    const result: CanvasPage[] = [];
    let currentPage: CanvasPage = { pageNum: 0, blocks: [], height: 0 };

    for (const unit of canvasBlockUnits) {
      const block = unit.block;
      // Fallback only when a block hasn't been measured yet (first mount).
      // A stale zero measurement should not make pagination think a block is free.
      const measuredBlockHeight = blockHeights[unit.renderId];
      const blockHeight = measuredBlockHeight && measuredBlockHeight > 0 ? measuredBlockHeight : 100;

      const isManualBreak = block.type === "page-break";

      const previousUnit = currentPage.blocks[currentPage.blocks.length - 1];
      let interBlockGap = previousUnit?.sourceBlockId === unit.sourceBlockId
        ? 0
        : getSiblingGapPx(previousUnit?.block, block);
      const prospectiveHeight = currentPage.height + (isManualBreak ? 0 : interBlockGap) + blockHeight;

      // If adding this block would exceed the page, start a new page.
      if (
        !isManualBreak &&
        prospectiveHeight > usableHeight &&
        currentPage.blocks.length > 0
      ) {
        result.push(currentPage);
        currentPage = { pageNum: result.length, blocks: [], height: 0 };
        interBlockGap = 0;
      }

      currentPage.blocks.push(unit);
      if (!isManualBreak) {
        currentPage.height += interBlockGap + blockHeight;
      }

      // Manual page break: finalize this page so following blocks start on a new page
      if (isManualBreak) {
        result.push(currentPage);
        currentPage = { pageNum: result.length, blocks: [], height: 0 };
      }
    }

    if (currentPage.blocks.length > 0) {
      result.push(currentPage);
    }

    return result;
    // React Compiler flags `usableHeight` as "may be modified later" — it is a
    // plain const derived from settings/state, so this is a false positive.
    // eslint-disable-next-line react-hooks/preserve-manual-memoization
  }, [canvasBlockUnits, blockHeights, usableHeight, getSiblingGapPx]);

  return (
    <div
      className="flex-1 overflow-auto canvas-scroll"
      style={{ backgroundColor: canvasBackgroundColor, scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      {fontStylesheetUrls.map((href) => (
        <link key={href} rel="stylesheet" href={href} />
      ))}
      {exampleFontOverride.fontFaceCss ? <style>{exampleFontOverride.fontFaceCss}</style> : null}
      <div className="flex justify-center pt-4 pb-8 px-4" onMouseDown={clearSelectionIfWorkspaceClick}>
          <div
            className={isPresentationMode ? undefined : printFrame.className}
            style={{
              ...(isPresentationMode ? {} : printFrame.cssVars),
              display: "flex",
              flexDirection: "column",
              gap: "32px",
            }}
          >
            {state.blocks.length === 0 ? (
              <div className="relative">
                <div
                  ref={setCanvasRef}
                  style={{
                    width: `${pageWidthMm}mm`,
                    height: `${pageHeightMm}mm`,
                    padding: isPresentationMode
                      ? "40px 60px"
                      : `${showHeader ? `${PRINT_HEADER_HEIGHT_MM}mm` : 0} 20mm ${showFooter ? `${footerReserveHeight}px` : 0} 20mm`,
                    backgroundColor: "white",
                    borderRadius: "4px",
                    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
                    boxSizing: "border-box",
                    overflow: "hidden",
                  }}
                >
                  <EmptyDropZone />
                </div>
              </div>
            ) : (
              pages.map((page) => (
                <div
                  key={`page-${page.pageNum}`}
                  className="relative"
                  style={{
                    width: `${pageWidthMm}mm`,
                    backgroundColor: "white",
                    borderRadius: "4px",
                    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
                  }}
                >
                  <div
                    style={{
                      ["--worksheet-example-font" as string]: exampleFontOverride.fontFamily,
                      ["--worksheet-original-example-font" as string]: exampleFontOverride.fontFamily,
                      ["--font-baseline-adjustment" as string]: getFontBaselineAdjustment(resolvedBodyFontFamily),
                      fontFamily: resolvedBodyFontFamily,
                      height: isPresentationMode ? pageHeight : `${pageHeightMm}mm`,
                      position: "relative",
                      boxSizing: "border-box",
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column",
                    }}
                    onClick={(e) => {
                      if (e.target === e.currentTarget) {
                        dispatch({ type: "SELECT_BLOCK", payload: null });
                      }
                    }}
                  >
                    {/* Header (brand) — fixed 30mm region, mirrors .print-header-content */}
                    {showHeader && !useDedicatedTabooPrintHeader && (
                      <div
                        aria-hidden="true"
                        className="print-header-content"
                        style={{
                          height: `${PRINT_HEADER_HEIGHT_MM}mm`,
                          padding: "15mm 15mm 0 20mm",
                          boxSizing: "border-box",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: "12px",
                          fontFamily: headerFooterFont,
                          fontSize: "7pt",
                          color: "#666",
                          lineHeight: 1.5,
                          flexShrink: 0,
                        }}
                      >
                        <div>
                          {hasHeaderLeft ? (
                            <span dangerouslySetInnerHTML={{ __html: processedHeaderLeft }} />
                          ) : (
                            hasHeaderRight && <span dangerouslySetInnerHTML={{ __html: processedHeaderRight }} />
                          )}
                        </div>
                        <div style={{ textAlign: "right", display: "flex", alignItems: "flex-start", gap: "12px" }}>
                          {hasHeaderLeft && hasHeaderRight && (
                            <span dangerouslySetInnerHTML={{ __html: processedHeaderRight }} />
                          )}
                          {hasLogo && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={brandHeaderFooter.logo} alt="" style={{ height: "8mm", width: "auto" }} />
                          )}
                        </div>
                      </div>
                    )}

                    {showHeader && useDedicatedTabooPrintHeader && !hasTenStopWordTabooBlock && (
                      <div
                        aria-hidden="true"
                        className="print-taboo-header"
                        style={{
                          position: "absolute",
                          top: "15mm",
                          left: "20mm",
                          right: "15mm",
                          zIndex: 10,
                          pointerEvents: "none",
                        }}
                      >
                        <div>
                          {hasHeaderLeft ? (
                            <span dangerouslySetInnerHTML={{ __html: processedHeaderLeft }} />
                          ) : (
                            hasHeaderRight && <span dangerouslySetInnerHTML={{ __html: processedHeaderRight }} />
                          )}
                        </div>
                        <div style={{ textAlign: "right", display: "flex", alignItems: "flex-start", justifyContent: "flex-end", gap: "12px" }}>
                          {hasHeaderLeft && hasHeaderRight && (
                            <span dangerouslySetInnerHTML={{ __html: processedHeaderRight }} />
                          )}
                          {hasLogo && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={brandHeaderFooter.logo} alt="" style={{ height: "8mm", width: "auto" }} />
                          )}
                        </div>
                      </div>
                    )}

                    {/* Blocks on this page — body region with left/right padding only */}
                    <div
                      className="print-body-content"
                      style={{
                        flex: "1 1 auto",
                        minHeight: 0,
                        paddingLeft: useDedicatedTabooPrintHeader ? 0 : "20mm",
                        paddingRight: useDedicatedTabooPrintHeader ? 0 : "20mm",
                        fontSize: resolvedBodyFontSize,
                      }}
                    >
                      <div
                        className="worksheet-blocks-container"
                        data-instruction-badge-style={resolvedProfile.instructionBadgeStyle || "default"}
                        style={{ ["--viewer-instruction-badge-color" as string]: resolvedProfile.instructionBadgeColor || resolvedProfile.primaryColor }}
                      >
                      {page.blocks.map((unit, blockIndex) => {
                        const block = unit.block;
                        const isDragging = !!activeId;
                        const isOverThis = overId === block.id;
                        const isActiveBlock = activeId === block.id;
                        const isSelectedBlock = state.selectedBlockId === block.id;
                        const sourceBlockIndex = sourceBlockIndexById.get(unit.sourceBlockId);
                        const globalUnitIndex = canvasUnitIndexByRenderId.get(unit.renderId) ?? -1;
                        const previousGlobalUnit = globalUnitIndex > 0 ? canvasBlockUnits[globalUnitIndex - 1] : undefined;
                        const nextGlobalUnit = globalUnitIndex >= 0 ? canvasBlockUnits[globalUnitIndex + 1] : undefined;
                        const isFirstSourceUnit = previousGlobalUnit?.sourceBlockId !== unit.sourceBlockId;
                        const isLastSourceUnit = nextGlobalUnit?.sourceBlockId !== unit.sourceBlockId;
                        const showAbove =
                          blockIndex === 0 &&
                          isDragging &&
                          isOverThis &&
                          !isActiveBlock &&
                          overPosition === "above";

                        const showBelow =
                          isDragging &&
                          isOverThis &&
                          !isActiveBlock &&
                          (blockIndex > 0 || overPosition === "below");
                        const wrapperStyle: React.CSSProperties | undefined = {
                          ...(unit.isContinuation ? { marginTop: 0 } : {}),
                          ...(block.type === "numbered-items" && resolvedProfile.blockGap
                            ? { marginTop: `calc(2 * ${resolvedProfile.blockGap})`, marginBottom: `calc(2 * ${resolvedProfile.blockGap})` }
                            : {}),
                        };

                        return (
                          <React.Fragment key={unit.renderId}>
                            {blockIndex === 0 && isDragging && (
                              <DropIndicator isActive={showAbove} />
                            )}
                            <div
                              ref={(el) => {
                                // Callback refs run during commit, not render. Writing to
                                // blockRefs here is safe; the react-hooks/refs rule can't
                                // distinguish inline callback refs from render-time reads.
                                // eslint-disable-next-line react-hooks/refs
                                if (el) blockRefs.current.set(unit.renderId, el);
                              }}
                              data-block-id={unit.renderId}
                              className={`worksheet-block worksheet-block-${block.type} group/worksheet-block relative ${
                                isSelectedBlock ? "outline outline-1 outline-offset-4 outline-sky-400" : ""
                              }`}
                              {...(unit.isContinuation ? { "data-continuation": "true" } : {})}
                              {...(block.type === "text" && !!(block as { tightTop?: boolean }).tightTop ? { "data-tight": "true" } : {})}
                              {...(block.type === "heading" ? { "data-heading-level": String((block as { level: number }).level), "data-heading-bilingual": String(!!(block as { bilingual?: boolean }).bilingual) } : {})}
                              {...(block.type === "numbered-heading" ? { "data-heading-level": String((block as { level: number }).level), "data-heading-bilingual": String(!!(block as { bilingual?: boolean }).bilingual), "data-numbered-heading": "true" } : {})}
                              {...(block.type === "text" && (block as { textStyle?: string }).textStyle ? { "data-text-style": (block as { textStyle?: string }).textStyle } : {})}
                              {...(block.type === "page-break" && (block as { restartPageNumbering?: boolean }).restartPageNumbering ? { "data-restart-page-numbering": "true" } : {})}
                              style={Object.keys(wrapperStyle).length > 0 ? wrapperStyle : undefined}
                              onClick={(event) => {
                                event.stopPropagation();
                                dispatch({ type: "SELECT_BLOCK", payload: block.id });
                              }}
                            >
                              {isFirstSourceUnit ? (
                                <BlockDropZone id={`canvas-insert-before-${unit.sourceBlockId}`} side="before" />
                              ) : null}
                              {isLastSourceUnit ? (
                                <BlockDropZone id={`canvas-insert-after-${unit.sourceBlockId}`} side="after" />
                              ) : null}
                              {isFirstSourceUnit && sourceBlockIndex !== undefined ? (
                                <BlockInsertPopover index={sourceBlockIndex} side="before" targetBlockId={unit.sourceBlockId} />
                              ) : null}
                              <BlockStructureToolbar block={block} />
                              <ViewerBlockRenderer
                                block={block}
                                mode="print"
                                primaryColor={resolvedProfile.primaryColor}
                                accentColor={resolvedProfile.accentColor}
                                interactiveColor={resolvedProfile.interactiveColor}
                                headlineFont={resolvedHeadlineFont}
                                headingWeights={{ h1: resolvedH1Weight, h2: resolvedH2Weight, h3: resolvedH3Weight, h4: resolvedH4Weight }}
                                headingNumberWeights={{ h1: resolvedH1HeadingNumberWeight, h2: resolvedH2HeadingNumberWeight, h3: resolvedH3HeadingNumberWeight, h4: resolvedH4HeadingNumberWeight }}
                                headingNumberFormats={headingNumberFormats}
                                headingColors={headingColors}
                                headingNumberColors={headingNumberColors}
                                headingBottomMargins={headingBottomMargins}
                                itemNumberFormat={itemNumberFormat}
                                showSolutions={false}
                                allBlocks={visibleBlocks}
                                brand={state.settings.brand || "edoomio"}
                                brandProfile={resolvedProfile}
                                bodyFont={resolvedBodyFontFamily}
                                originalBodyFont={resolvedBodyFontFamily}
                                bodyFontSize={resolvedBodyFontSize}
                                instructionIndex={instructionIndexByBlockId.get(block.id)}
                                blockGap={resolvedProfile.blockGap}
                              />
                              {isLastSourceUnit && sourceBlockIndex !== undefined ? (
                                <BlockInsertPopover index={sourceBlockIndex + 1} side="after" targetBlockId={unit.sourceBlockId} />
                              ) : null}
                            </div>
                            {isDragging && !isActiveBlock && (
                              <DropIndicator isActive={showBelow} />
                            )}
                          </React.Fragment>
                        );
                      })}
                      </div>
                    </div>

                    {/* Footer (brand) — fixed 25mm region */}
                    {showFooter && !useDedicatedTabooPrintFooter && (
                      <div
                        aria-hidden="true"
                        className="print-footer-content"
                        style={{
                          height: `${footerReserveHeight}px`,
                          padding: "0 15mm 8mm 15mm",
                          boxSizing: "border-box",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-end",
                          gap: "12px",
                          fontFamily: headerFooterFont,
                          fontSize: "7pt",
                          color: "#666",
                          lineHeight: 1.5,
                          flexShrink: 0,
                        }}
                      >
                        <div style={{ flex: "0 1 45%", minWidth: 0 }}>
                          {hasFooterLeft && <span dangerouslySetInnerHTML={{ __html: processedFooterLeft }} />}
                        </div>
                        <div style={{ flex: "0 0 10%", minWidth: 0, textAlign: "center" }}>
                          {processedFooterCenter ? (
                            <span dangerouslySetInnerHTML={{ __html: processedFooterCenter }} />
                          ) : state.settings.footerText ? (
                            <span>{state.settings.footerText}</span>
                          ) : null}
                        </div>
                        <div style={{ flex: "0 1 45%", minWidth: 0, textAlign: "right" }}>
                          {hasFooterRight && <span dangerouslySetInnerHTML={{ __html: processedFooterRight }} />}
                        </div>
                      </div>
                    )}

                    {showFooter && useDedicatedTabooPrintFooter && !hasTenStopWordTabooBlock && (
                      <div
                        aria-hidden="true"
                        className="print-taboo-footer"
                        style={{
                          position: "absolute",
                          left: "15mm",
                          right: "15mm",
                          bottom: "8mm",
                          zIndex: 10,
                          pointerEvents: "none",
                        }}
                      >
                        <div>
                          {hasFooterLeft && <span dangerouslySetInnerHTML={{ __html: processedFooterLeft }} />}
                        </div>
                        <div>
                          {processedFooterCenter ? (
                            <span dangerouslySetInnerHTML={{ __html: processedFooterCenter }} />
                          ) : state.settings.footerText ? (
                            <span>{state.settings.footerText}</span>
                          ) : null}
                        </div>
                        <div>
                          {hasFooterRight && <span dangerouslySetInnerHTML={{ __html: processedFooterRight }} />}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
      </div>
    </div>
  );
}
