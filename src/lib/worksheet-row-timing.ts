export type WorksheetItemTiming = {
  rowIndex: number;
  startRatio: number;
  endRatio: number;
};

const ROW_STYLE_SET = new Set([
  "rows",
  "kompetenzziele",
  "handlungsziele",
  "fragen",
  "redemittel",
]);

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

const getEffectiveMinGap = (rowCount: number, minGap: number): number => {
  if (rowCount <= 0) return 0;
  const maxPossibleGap = 1 / rowCount;
  return clamp(minGap, 0, Math.max(0, maxPossibleGap - 0.000001));
};

export const isWorksheetRowsStyle = (style?: string): boolean => {
  if (!style) return false;
  return ROW_STYLE_SET.has(style);
};

export const extractWorksheetRows = (html: string): string[] => {
  const rows = Array.from(
    html.matchAll(/<li\b[^>]*>[\s\S]*?<\/li>|<p\b[^>]*>[\s\S]*?<\/p>/gi),
    (match) => match[0]
  );

  if (rows.length === 0) return [html];

  return rows.map((row) => {
    if (!/^<li\b/i.test(row)) return row;

    const inner = row.replace(/^<li\b[^>]*>/i, "").replace(/<\/li>$/i, "").trim();
    if (/^<p\b/i.test(inner)) return inner;

    return `<p>${inner}</p>`;
  });
};

const getDefaultWorksheetItemTimings = (rowCount: number): WorksheetItemTiming[] => {
  if (rowCount <= 0) return [];

  return Array.from({ length: rowCount }, (_, rowIndex) => {
    const startRatio = rowIndex / rowCount;
    const endRatio = (rowIndex + 1) / rowCount;

    return {
      rowIndex,
      startRatio,
      endRatio,
    };
  });
};

const getDefaultBoundaries = (rowCount: number): number[] => {
  if (rowCount <= 0) return [0, 1];
  return Array.from({ length: rowCount + 1 }, (_, index) => index / rowCount);
};

const timingsToBoundaries = (
  rawTimings: WorksheetItemTiming[] | undefined,
  rowCount: number
): number[] => {
  const boundaries = getDefaultBoundaries(rowCount);
  if (!rawTimings || rawTimings.length === 0 || rowCount <= 0) {
    return boundaries;
  }

  for (let rowIndex = 1; rowIndex < rowCount; rowIndex++) {
    const fromRow = rawTimings.find((timing) => timing.rowIndex === rowIndex);
    const fromIndex = rawTimings[rowIndex];
    const candidate = fromRow ?? fromIndex;

    if (!candidate || typeof candidate.startRatio !== "number" || Number.isNaN(candidate.startRatio)) {
      continue;
    }

    boundaries[rowIndex] = clamp(candidate.startRatio, 0, 1);
  }

  const lastRowFromId = rawTimings.find((timing) => timing.rowIndex === rowCount - 1);
  const lastRowFromIndex = rawTimings[rowCount - 1];
  const lastRow = lastRowFromId ?? lastRowFromIndex;
  if (lastRow && typeof lastRow.endRatio === "number" && !Number.isNaN(lastRow.endRatio)) {
    boundaries[rowCount] = clamp(lastRow.endRatio, 0, 1);
  }

  boundaries[0] = 0;
  boundaries[rowCount] = 1;
  return boundaries;
};

const normalizeBoundaries = (
  rawBoundaries: number[],
  rowCount: number,
  minGap: number
): number[] => {
  if (rowCount <= 0) return [0, 1];

  const effectiveMinGap = getEffectiveMinGap(rowCount, minGap);
  const boundaries = [...rawBoundaries];

  if (boundaries.length !== rowCount + 1) {
    return normalizeBoundaries(getDefaultBoundaries(rowCount), rowCount, minGap);
  }

  boundaries[0] = 0;
  boundaries[rowCount] = 1;

  for (let i = 1; i < rowCount; i++) {
    const previous = boundaries[i - 1];
    const minValue = previous + effectiveMinGap;
    const maxValue = 1 - (rowCount - i) * effectiveMinGap;
    const current = Number.isFinite(boundaries[i]) ? boundaries[i] : getDefaultBoundaries(rowCount)[i];
    boundaries[i] = clamp(current, minValue, maxValue);
  }

  return boundaries;
};

const boundariesToTimings = (boundaries: number[]): WorksheetItemTiming[] => {
  const rowCount = boundaries.length - 1;
  if (rowCount <= 0) return [];

  return Array.from({ length: rowCount }, (_, rowIndex) => {
    const startRatio = boundaries[rowIndex];
    const endRatio = boundaries[rowIndex + 1];

    return {
      rowIndex,
      startRatio,
      endRatio,
    };
  });
};

export const normalizeWorksheetItemTimings = (
  rawTimings: WorksheetItemTiming[] | undefined,
  rowCount: number,
  minGap = 0.015
): WorksheetItemTiming[] => {
  if (rowCount <= 0) return [];

  if (!rawTimings || rawTimings.length === 0) {
    return getDefaultWorksheetItemTimings(rowCount);
  }

  const boundaries = timingsToBoundaries(rawTimings, rowCount);
  const normalizedBoundaries = normalizeBoundaries(boundaries, rowCount, minGap);
  return boundariesToTimings(normalizedBoundaries);
};

const updateWorksheetBoundaryTiming = (
  currentTimings: WorksheetItemTiming[] | undefined,
  rowCount: number,
  boundaryIndex: number,
  newRatio: number,
  minGap = 0.015
): WorksheetItemTiming[] => {
  const normalized = normalizeWorksheetItemTimings(currentTimings, rowCount, minGap);
  if (rowCount <= 0) return normalized;

  // Keep the absolute first and last boundaries pinned to 0 and 1.
  if (boundaryIndex <= 0 || boundaryIndex >= rowCount) {
    return normalized;
  }

  const boundaries = timingsToBoundaries(normalized, rowCount);
  boundaries[boundaryIndex] = clamp(newRatio, 0, 1);

  const normalizedBoundaries = normalizeBoundaries(boundaries, rowCount, minGap);
  return boundariesToTimings(normalizedBoundaries);
};

export const updateWorksheetItemTimingStart = (
  currentTimings: WorksheetItemTiming[] | undefined,
  rowCount: number,
  rowIndex: number,
  newStartRatio: number
): WorksheetItemTiming[] => {
  return updateWorksheetBoundaryTiming(currentTimings, rowCount, rowIndex, newStartRatio);
};

export const updateWorksheetItemTimingEnd = (
  currentTimings: WorksheetItemTiming[] | undefined,
  rowCount: number,
  rowIndex: number,
  newEndRatio: number
): WorksheetItemTiming[] => {
  return updateWorksheetBoundaryTiming(currentTimings, rowCount, rowIndex + 1, newEndRatio);
};
