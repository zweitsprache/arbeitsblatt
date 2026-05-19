import React from "react";
import type { BingoCardsBlock, BingoCardsItem } from "@/types/worksheet";
import type { ViewMode } from "@/types/worksheet";

const PRINT_CARD_COUNT = 2;

function hasContent(item: BingoCardsItem) {
  return Boolean(item.text?.trim() || item.imageSrc?.trim() || item.answer?.trim());
}

function createSeed(input: string): number {
  let seed = 0;
  for (let index = 0; index < input.length; index += 1) {
    seed = (seed * 31 + input.charCodeAt(index)) >>> 0;
  }
  return seed || 1;
}

function shuffleWithSeed<T>(values: T[], seedInput: string): T[] {
  const result = [...values];
  let seed = createSeed(seedInput);

  for (let index = result.length - 1; index > 0; index -= 1) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const swapIndex = seed % (index + 1);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  return result;
}

function buildCardItems(block: BingoCardsBlock, cardIndex: number): BingoCardsItem[] {
  const requiredCells = block.gridSize * block.gridSize;
  const sourceItems = block.items.filter(hasContent);

  if (sourceItems.length === 0) {
    return Array.from({ length: requiredCells }, (_, index) => ({ id: `empty-${cardIndex}-${index}` }));
  }

  const orderedItems = block.randomize
    ? shuffleWithSeed(sourceItems, `${block.id}-${cardIndex}`)
    : sourceItems;

  const cardItems: BingoCardsItem[] = [];
  for (let index = 0; index < requiredCells; index += 1) {
    cardItems.push(orderedItems[index % orderedItems.length]);
  }

  return cardItems;
}

function renderCell(item: BingoCardsItem, contentType: string) {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full p-1 text-center">
      {(contentType === "text" || contentType === "text-image") && item.text && (
        <span className="block text-base font-medium">{item.text}</span>
      )}
      {(contentType === "image" || contentType === "text-image") && item.imageSrc && (
        <img src={item.imageSrc} alt={item.text || "Bingo"} className="max-h-16 max-w-full mt-1" />
      )}
    </div>
  );
}

function renderGrid(
  items: BingoCardsItem[],
  block: BingoCardsBlock,
  className: string,
  cellClassName: string,
  style?: React.CSSProperties,
) {
  return (
    <div
      className={className}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${block.gridSize}, minmax(0, 1fr))`,
        ...style,
      }}
    >
      {items.map((item, index) => (
        <div key={`${item.id}-${index}`} className={cellClassName}>
          {renderCell(item, block.contentType)}
        </div>
      ))}
    </div>
  );
}

function PrintCard({ block, cardIndex }: { block: BingoCardsBlock; cardIndex: number }) {
  const items = buildCardItems(block, cardIndex);
  const widthMm = block.cardWidthMm ?? 148.5;
  const heightMm = block.cardHeightMm ?? 105;
  const showCuttingLine = block.showCuttingLine !== false;
  const outerPaddingMm = 6;
  const innerBorderMm = 0.35;
  const printableWidthMm = Math.max(20, widthMm - outerPaddingMm * 2 - innerBorderMm * 2);
  const printableHeightMm = Math.max(20, heightMm - outerPaddingMm * 2 - innerBorderMm * 2);
  const cellHeightMm = printableHeightMm / block.gridSize;

  return (
    <div
      className="relative box-border overflow-hidden bg-white"
      style={{
        width: `${widthMm}mm`,
        height: `${heightMm}mm`,
        borderLeft: showCuttingLine ? "1px dashed #94a3b8" : "none",
        borderRight: showCuttingLine ? "1px dashed #94a3b8" : "none",
        borderBottom: showCuttingLine ? "1px dashed #94a3b8" : "none",
        borderTop: showCuttingLine && cardIndex === 0 ? "1px dashed #94a3b8" : "none",
        breakInside: "avoid",
        pageBreakInside: "avoid",
      }}
    >
      <div className="flex h-full w-full flex-col" style={{ padding: `${outerPaddingMm}mm` }}>
        <div className="flex-1 overflow-hidden rounded-sm border border-slate-300 bg-white">
          {renderGrid(
            items,
            block,
            "h-full w-full",
            "flex items-center justify-center border border-slate-300 bg-white p-1 text-center overflow-hidden",
            {
              gridTemplateRows: `repeat(${block.gridSize}, ${cellHeightMm}mm)`,
              gridAutoRows: `${cellHeightMm}mm`,
              width: `${printableWidthMm}mm`,
              height: `${printableHeightMm}mm`,
            }
          )}
        </div>
      </div>
    </div>
  );
}

export function BingoCardsRenderer({ block, mode = "print" }: { block: BingoCardsBlock; mode?: ViewMode }) {
  if (mode === "print") {
    return (
      <div
        className="worksheet-block-bingo-cards bingo-cards-block mx-auto flex w-full max-w-[210mm] flex-col items-center"
        style={{
          breakInside: "avoid",
          pageBreakInside: "avoid",
        }}
      >
        {Array.from({ length: PRINT_CARD_COUNT }, (_, cardIndex) => (
          <PrintCard key={`${block.id}-print-card-${cardIndex}`} block={block} cardIndex={cardIndex} />
        ))}
      </div>
    );
  }

  return (
    <div className="worksheet-block-bingo-cards bingo-cards-block rounded border border-dashed bg-slate-50 p-4 text-sm text-slate-600">
      <div className="font-semibold text-slate-900">Bingo Cards</div>
      <p className="mt-2">
        Print-only block. In print preview and PDF this renders two cards per page at {block.cardWidthMm ?? 148.5} mm x {block.cardHeightMm ?? 105} mm.
      </p>
      <p className="mt-1 text-xs text-slate-500">
        Grid: {block.gridSize} x {block.gridSize} | Items: {block.items.filter(hasContent).length} | Randomize: {block.randomize ? "on" : "off"}
      </p>
      <div className="mt-3 rounded border bg-white p-3 text-xs text-slate-500">
        Open print preview to inspect the final card sheet.
      </div>
    </div>
  );
}
