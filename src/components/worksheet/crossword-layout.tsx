"use client";

import React from "react";
import { CrosswordPlacement } from "@/types/worksheet";

type CrosswordLayoutProps = {
  grid: string[][];
  placements: CrosswordPlacement[];
  showSolutions?: boolean;
  clueTextClassName?: string;
  cellSize?: string;
  fixedCellSize?: boolean;
  clueNumberFormat?: string;
  renderClueNumber?: (clueNumber: number) => React.ReactNode;
  clueListClassName?: string;
  twoColumnClues?: boolean;
};

function formatClueNumberLabel(index: number, format: string | null | undefined): string {
  if (format === "numbers-with-period") return `${index}.`;
  return String(index).padStart(2, "0");
}

export function CrosswordLayout({
  grid,
  placements,
  showSolutions = false,
  clueTextClassName = "text-foreground",
  cellSize = "2rem",
  fixedCellSize = false,
  clueNumberFormat = "default",
  renderClueNumber,
  clueListClassName = "",
  twoColumnClues = false,
}: CrosswordLayoutProps) {
  const normalized = React.useMemo(() => {
    if (grid.length === 0 || grid[0]?.length === 0) {
      return { grid, placements };
    }

    let minRow = Number.POSITIVE_INFINITY;
    let maxRow = Number.NEGATIVE_INFINITY;
    let minCol = Number.POSITIVE_INFINITY;
    let maxCol = Number.NEGATIVE_INFINITY;

    for (let rowIndex = 0; rowIndex < grid.length; rowIndex += 1) {
      for (let colIndex = 0; colIndex < grid[rowIndex].length; colIndex += 1) {
        if (grid[rowIndex][colIndex].length === 0) continue;
        minRow = Math.min(minRow, rowIndex);
        maxRow = Math.max(maxRow, rowIndex);
        minCol = Math.min(minCol, colIndex);
        maxCol = Math.max(maxCol, colIndex);
      }
    }

    if (!Number.isFinite(minRow) || !Number.isFinite(minCol)) {
      return { grid, placements };
    }

    const trimmedGrid = grid
      .slice(minRow, maxRow + 1)
      .map((row) => row.slice(minCol, maxCol + 1));

    const normalizedPlacements = placements.map((placement) => ({
      ...placement,
      row: placement.row - minRow,
      col: placement.col - minCol,
      labelRow: placement.labelRow - minRow,
      labelCol: placement.labelCol - minCol,
    }));

    return { grid: trimmedGrid, placements: normalizedPlacements };
  }, [grid, placements]);

  const numberMap = React.useMemo(
    () => new Map(normalized.placements.map((placement) => [`${placement.row},${placement.col}`, placement.clueNumber])),
    [normalized.placements],
  );

  const occupiedGrid = React.useMemo(
    () => normalized.grid.map((row) => row.map((cell) => cell.length > 0)),
    [normalized.grid],
  );

  if (normalized.grid.length === 0) return null;

  const columnCount = normalized.grid[0]?.length ?? 0;
  const effectiveCellSize = fixedCellSize
    ? cellSize
    : `min(${cellSize}, calc((100% - 1px) / ${columnCount}))`;
  const fixedTableWidth = `calc(${cellSize} * ${columnCount})`;

  const renderClueRow = (placement: CrosswordPlacement, extraClassName: string) => (
    <div
      key={`${placement.itemId}-${placement.direction}`}
      className={`flex items-start gap-2 leading-5 py-2 ${extraClassName}`}
    >
      {renderClueNumber ? (
        renderClueNumber(placement.clueNumber)
      ) : clueNumberFormat === "numbers-with-period" ? (
        <span className="w-6 shrink-0 font-medium leading-none tabular-nums text-foreground">
          {formatClueNumberLabel(placement.clueNumber, clueNumberFormat)}
        </span>
      ) : (
        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-foreground bg-white text-[11px] font-semibold leading-none tabular-nums text-foreground">
          {formatClueNumberLabel(placement.clueNumber, clueNumberFormat)}
        </span>
      )}
      <span className={clueTextClassName}>{placement.hint}</span>
    </div>
  );

  return (
    <div className="flex flex-col gap-7">
      <table
        className="border-collapse bg-transparent"
        style={{
          borderSpacing: 0,
          tableLayout: "fixed",
          maxWidth: "100%",
          width: fixedCellSize ? fixedTableWidth : undefined,
        }}
      >
        <colgroup>
          {Array.from({ length: columnCount }).map((_, index) => (
            <col key={index} style={{ width: effectiveCellSize }} />
          ))}
        </colgroup>
        <tbody>
          {normalized.grid.map((row, rowIndex) => (
            <tr key={rowIndex} style={{ height: effectiveCellSize }}>
              {row.map((cell, colIndex) => {
                const clueNumber = numberMap.get(`${rowIndex},${colIndex}`);
                const isGapCell = cell === "-" || cell === " ";
                const showsGapMarker = cell === "-";
                const isSpaceCell = cell === " ";
                const isOccupiedCell = occupiedGrid[rowIndex][colIndex];
                const isLetterCell = isOccupiedCell && !isGapCell;

                const cellBackground = !isOccupiedCell
                  ? "bg-transparent"
                  : isSpaceCell
                    ? "bg-neutral-300"
                    : "bg-white";

                return (
                  <td
                    key={`${rowIndex}-${colIndex}`}
                    className={`p-0 ${cellBackground}`}
                    style={{
                      border: isOccupiedCell ? "1px solid var(--color-foreground)" : "none",
                    }}
                  >
                    <div
                      className="relative overflow-hidden"
                      style={{ width: "100%", aspectRatio: "1 / 1" }}
                    >
                      {clueNumber ? (
                        <span className="pointer-events-none absolute left-0.5 top-0.5 z-10 text-[10px] font-semibold leading-none text-foreground">
                          {clueNumber}
                        </span>
                      ) : null}
                      {isLetterCell && showSolutions ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-sm font-semibold uppercase leading-none">{cell}</span>
                        </div>
                      ) : null}
                      {isGapCell && showsGapMarker ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-sm font-semibold leading-none text-muted-foreground">-</span>
                        </div>
                      ) : null}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {twoColumnClues ? (
        <div className={`grid grid-cols-2 items-start gap-x-8 ${clueListClassName}`}>
          {(() => {
            const placements = normalized.placements;
            const mid = Math.ceil(placements.length / 2);
            return [placements.slice(0, mid), placements.slice(mid)]
              .filter((column) => column.length > 0)
              .map((column, columnIndex) => (
                <div key={columnIndex} className="min-w-0 border-y border-border">
                  {column.map((placement, index) =>
                    renderClueRow(placement, index > 0 ? "border-t border-border" : ""),
                  )}
                </div>
              ));
          })()}
        </div>
      ) : (
        <div className={`min-w-0 pt-3 ${clueListClassName}`}>
          {normalized.placements.map((placement, index) =>
            renderClueRow(placement, index > 0 ? "border-t border-border" : "pt-0"),
          )}
        </div>
      )}
    </div>
  );
}