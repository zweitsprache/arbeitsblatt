import {
  FreeFormElement,
  FreeFormScene,
  FreeFormViewportState,
} from "@/types/worksheet";

export type FreeFormAxis = "horizontal" | "vertical";

export interface FreeFormGuide {
  id: string;
  orientation: FreeFormAxis;
  offset: number;
  kind: "center" | "edge" | "spacing";
}

export interface FreeFormBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FreeFormSnapResult {
  x: number;
  y: number;
  guides: FreeFormGuide[];
}

const SNAP_THRESHOLD = 8;

export function getElementBoundsAtPosition(element: FreeFormElement, x: number, y: number): FreeFormBounds {
  if (element.type === "circle") {
    return {
      x: x - element.radius,
      y: y - element.radius,
      width: element.radius * 2,
      height: element.radius * 2,
    };
  }

  if (element.type === "text") {
    return {
      x,
      y,
      width: element.width ?? 240,
      height: element.height ?? element.fontSize * (element.lineHeight ?? 1.2),
    };
  }

  return {
    x,
    y,
    width: element.width,
    height: element.height,
  };
}

export function getElementBounds(element: FreeFormElement): FreeFormBounds {
  return getElementBoundsAtPosition(element, element.x, element.y);
}

export function getSelectionBounds(scene: FreeFormScene, ids: string[]): FreeFormBounds | null {
  const selected = scene.elements.filter((element) => ids.includes(element.id));
  if (selected.length === 0) {
    return null;
  }

  const bounds = selected.map(getElementBounds);
  const left = Math.min(...bounds.map((bound) => bound.x));
  const top = Math.min(...bounds.map((bound) => bound.y));
  const right = Math.max(...bounds.map((bound) => bound.x + bound.width));
  const bottom = Math.max(...bounds.map((bound) => bound.y + bound.height));

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}

export function getViewportForFit(scene: FreeFormScene, viewportWidth: number, viewportHeight: number, padding = 96): FreeFormViewportState {
  if (viewportWidth <= 0 || viewportHeight <= 0) {
    return {
      zoom: 1,
      panX: 0,
      panY: 0,
    };
  }

  const zoom = Math.min(
    (viewportWidth - padding * 2) / Math.max(scene.width, 1),
    (viewportHeight - padding * 2) / Math.max(scene.height, 1),
  );
  const safeZoom = Number.isFinite(zoom) ? Math.max(0.1, Math.min(4, zoom)) : 1;

  return {
    zoom: safeZoom,
    panX: viewportWidth / 2 - scene.width * safeZoom / 2,
    panY: viewportHeight / 2 - scene.height * safeZoom / 2,
  };
}

export function getViewportForSelection(
  scene: FreeFormScene,
  selectionIds: string[],
  viewportWidth: number,
  viewportHeight: number,
  padding = 120,
): FreeFormViewportState | null {
  const bounds = getSelectionBounds(scene, selectionIds);
  if (!bounds || viewportWidth <= 0 || viewportHeight <= 0) {
    return null;
  }

  const zoom = Math.min(
    (viewportWidth - padding * 2) / Math.max(bounds.width, 1),
    (viewportHeight - padding * 2) / Math.max(bounds.height, 1),
  );
  const safeZoom = Number.isFinite(zoom) ? Math.max(0.1, Math.min(4, zoom)) : 1;

  return {
    zoom: safeZoom,
    panX: viewportWidth / 2 - (bounds.x + bounds.width / 2) * safeZoom,
    panY: viewportHeight / 2 - (bounds.y + bounds.height / 2) * safeZoom,
  };
}

function toAxisValue(element: FreeFormElement, axis: FreeFormAxis, bound: FreeFormBounds): { start: number; center: number; end: number } {
  if (axis === "horizontal") {
    return {
      start: bound.x,
      center: bound.x + bound.width / 2,
      end: bound.x + bound.width,
    };
  }

  return {
    start: bound.y,
    center: bound.y + bound.height / 2,
    end: bound.y + bound.height,
  };
}

function fromBoundStart(element: FreeFormElement, axis: FreeFormAxis, start: number): number {
  if (axis === "horizontal") {
    return element.type === "circle" ? start + element.radius : start;
  }

  return element.type === "circle" ? start + element.radius : start;
}

function alignElement(element: FreeFormElement, bounds: FreeFormBounds, axis: FreeFormAxis, targetStart: number): FreeFormElement {
  if (axis === "horizontal") {
    return {
      ...element,
      x: fromBoundStart(element, axis, targetStart),
    };
  }

  return {
    ...element,
    y: fromBoundStart(element, axis, targetStart),
  };
}

export function getAlignedElements(scene: FreeFormScene, ids: string[], alignment: "left" | "center" | "right" | "top" | "middle" | "bottom"): FreeFormElement[] {
  const selected = scene.elements.filter((element) => ids.includes(element.id));
  const selectionBounds = getSelectionBounds(scene, ids);
  if (!selectionBounds || selected.length < 2) {
    return scene.elements;
  }

  return scene.elements.map((element) => {
    if (!ids.includes(element.id)) {
      return element;
    }

    const bounds = getElementBounds(element);
    if (alignment === "left") {
      return alignElement(element, bounds, "horizontal", selectionBounds.x);
    }
    if (alignment === "center") {
      return alignElement(element, bounds, "horizontal", selectionBounds.x + selectionBounds.width / 2 - bounds.width / 2);
    }
    if (alignment === "right") {
      return alignElement(element, bounds, "horizontal", selectionBounds.x + selectionBounds.width - bounds.width);
    }
    if (alignment === "top") {
      return alignElement(element, bounds, "vertical", selectionBounds.y);
    }
    if (alignment === "middle") {
      return alignElement(element, bounds, "vertical", selectionBounds.y + selectionBounds.height / 2 - bounds.height / 2);
    }
    return alignElement(element, bounds, "vertical", selectionBounds.y + selectionBounds.height - bounds.height);
  });
}

export function getDistributedElements(scene: FreeFormScene, ids: string[], distribution: "horizontal" | "vertical"): FreeFormElement[] {
  const selected = scene.elements.filter((element) => ids.includes(element.id));
  if (selected.length < 3) {
    return scene.elements;
  }

  const sorted = [...selected].sort((left, right) => {
    const leftBounds = getElementBounds(left);
    const rightBounds = getElementBounds(right);
    return distribution === "horizontal" ? leftBounds.x - rightBounds.x : leftBounds.y - rightBounds.y;
  });

  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const firstBounds = getElementBounds(first);
  const lastBounds = getElementBounds(last);
  const middle = sorted.slice(1, -1);
  const usedSpace = middle.reduce((sum, element) => {
    const bounds = getElementBounds(element);
    return sum + (distribution === "horizontal" ? bounds.width : bounds.height);
  }, 0);
  const totalGap = distribution === "horizontal"
    ? lastBounds.x - (firstBounds.x + firstBounds.width)
    : lastBounds.y - (firstBounds.y + firstBounds.height);
  const gap = (totalGap - usedSpace) / Math.max(sorted.length - 1, 1);

  let cursor = distribution === "horizontal"
    ? firstBounds.x + firstBounds.width + gap
    : firstBounds.y + firstBounds.height + gap;

  const positions = new Map<string, number>();
  for (const element of middle) {
    positions.set(element.id, cursor);
    const bounds = getElementBounds(element);
    cursor += (distribution === "horizontal" ? bounds.width : bounds.height) + gap;
  }

  return scene.elements.map((element) => {
    const nextPosition = positions.get(element.id);
    if (typeof nextPosition !== "number") {
      return element;
    }

    return distribution === "horizontal"
      ? { ...element, x: fromBoundStart(element, "horizontal", nextPosition) }
      : { ...element, y: fromBoundStart(element, "vertical", nextPosition) };
  });
}

function overlapsOnCrossAxis(moving: FreeFormBounds, candidate: FreeFormBounds, axis: FreeFormAxis, threshold: number) {
  if (axis === "horizontal") {
    const movingCenter = moving.y + moving.height / 2;
    const candidateCenter = candidate.y + candidate.height / 2;
    return Math.abs(movingCenter - candidateCenter) <= Math.max(threshold * 2, (moving.height + candidate.height) / 2);
  }

  const movingCenter = moving.x + moving.width / 2;
  const candidateCenter = candidate.x + candidate.width / 2;
  return Math.abs(movingCenter - candidateCenter) <= Math.max(threshold * 2, (moving.width + candidate.width) / 2);
}

function collectAxisCandidates(scene: FreeFormScene, excludedIds: Set<string>, axis: FreeFormAxis) {
  const candidates: Array<{ value: number; kind: "center" | "edge"; sourceId: string }> = [];
  for (const element of scene.elements) {
    if (excludedIds.has(element.id) || element.visible === false) {
      continue;
    }
    const bounds = getElementBounds(element);
    const values = toAxisValue(element, axis, bounds);
    candidates.push({ value: values.start, kind: "edge", sourceId: element.id });
    candidates.push({ value: values.center, kind: "center", sourceId: element.id });
    candidates.push({ value: values.end, kind: "edge", sourceId: element.id });
  }
  return candidates;
}

function getSmartSpacingGuides(
  scene: FreeFormScene,
  movingBounds: FreeFormBounds,
  excludedIds: Set<string>,
  axis: FreeFormAxis,
  threshold: number,
): { start: number; guides: FreeFormGuide[] } | null {
  const candidates = scene.elements
    .filter((element) => !excludedIds.has(element.id) && element.visible !== false)
    .map((element) => ({ element, bounds: getElementBounds(element) }))
    .filter(({ bounds }) => overlapsOnCrossAxis(movingBounds, bounds, axis, threshold))
    .sort((left, right) => axis === "horizontal" ? left.bounds.x - right.bounds.x : left.bounds.y - right.bounds.y);

  if (candidates.length < 2) {
    return null;
  }

  const movingStart = axis === "horizontal" ? movingBounds.x : movingBounds.y;
  const movingEnd = axis === "horizontal" ? movingBounds.x + movingBounds.width : movingBounds.y + movingBounds.height;

  for (let index = 0; index < candidates.length - 1; index += 1) {
    const left = candidates[index].bounds;
    const right = candidates[index + 1].bounds;
    const leftEnd = axis === "horizontal" ? left.x + left.width : left.y + left.height;
    const rightStart = axis === "horizontal" ? right.x : right.y;
    const referenceGap = rightStart - leftEnd;
    if (referenceGap <= 0) {
      continue;
    }

    const currentLeftGap = movingStart - leftEnd;
    const currentRightGap = rightStart - movingEnd;
    if (Math.abs(currentLeftGap - referenceGap) <= threshold && Math.abs(currentRightGap - referenceGap) <= threshold) {
      const nextStart = leftEnd + referenceGap;
      const offset = axis === "horizontal"
        ? movingBounds.y + movingBounds.height / 2
        : movingBounds.x + movingBounds.width / 2;

      return {
        start: nextStart,
        guides: [
          { id: `${axis}-spacing-${index}`, orientation: axis === "horizontal" ? "horizontal" : "vertical", offset, kind: "spacing" },
        ],
      };
    }
  }

  return null;
}

export function getSnappedDragPosition(
  scene: FreeFormScene,
  element: FreeFormElement,
  x: number,
  y: number,
  zoom: number,
  movingIds: string[] = [element.id],
): FreeFormSnapResult {
  const threshold = SNAP_THRESHOLD / Math.max(zoom, 0.1);
  const excludedIds = new Set(movingIds);
  let nextX = x;
  let nextY = y;
  const guides: FreeFormGuide[] = [];

  const sceneCenterCandidates = {
    horizontal: [
      { value: scene.width / 2, kind: "center" as const, sourceId: "scene-center-x" },
    ],
    vertical: [
      { value: scene.height / 2, kind: "center" as const, sourceId: "scene-center-y" },
    ],
  };

  const resolveAxis = (axis: FreeFormAxis, proposedX: number, proposedY: number) => {
    const proposedBounds = getElementBoundsAtPosition(element, proposedX, proposedY);
    const movingValues = toAxisValue(element, axis, proposedBounds);
    const allCandidates = [
      ...collectAxisCandidates(scene, excludedIds, axis),
      ...(axis === "horizontal" ? sceneCenterCandidates.horizontal : sceneCenterCandidates.vertical),
    ];

    let best: { distance: number; start: number; guide: FreeFormGuide } | null = null;
    for (const candidate of allCandidates) {
      const starts = [
        { value: movingValues.start, targetStart: candidate.value },
        { value: movingValues.center, targetStart: candidate.value - (axis === "horizontal" ? proposedBounds.width / 2 : proposedBounds.height / 2) },
        { value: movingValues.end, targetStart: candidate.value - (axis === "horizontal" ? proposedBounds.width : proposedBounds.height) },
      ];

      for (const option of starts) {
        const distance = Math.abs(option.value - candidate.value);
        if (distance > threshold) {
          continue;
        }

        if (!best || distance < best.distance) {
          best = {
            distance,
            start: option.targetStart,
            guide: {
              id: `${axis}-${candidate.sourceId}-${candidate.kind}`,
              orientation: axis,
              offset: candidate.value,
              kind: candidate.kind,
            },
          };
        }
      }
    }

    const spacing = getSmartSpacingGuides(scene, proposedBounds, excludedIds, axis, threshold);
    if (spacing && (!best || spacing.guides[0]?.kind === "spacing")) {
      return {
        start: spacing.start,
        guides: spacing.guides,
      };
    }

    return best ? { start: best.start, guides: [best.guide] } : null;
  };

  const horizontal = resolveAxis("horizontal", nextX, nextY);
  if (horizontal) {
    nextX = fromBoundStart(element, "horizontal", horizontal.start);
    guides.push(...horizontal.guides);
  }

  const vertical = resolveAxis("vertical", nextX, nextY);
  if (vertical) {
    nextY = fromBoundStart(element, "vertical", vertical.start);
    guides.push(...vertical.guides);
  }

  return {
    x: nextX,
    y: nextY,
    guides,
  };
}