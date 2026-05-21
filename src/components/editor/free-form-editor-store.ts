"use client";

import React from "react";
import { nanoid } from "nanoid";
import {
  FreeFormElement,
  FreeFormElementType,
  FreeFormElementUpdate,
  FreeFormScene,
  FreeFormTextElement,
  FreeFormViewportState,
  normalizeFreeFormScene,
} from "@/types/worksheet";
import {
  FreeFormGuide,
  getAlignedElements,
  getDistributedElements,
  getSelectionBounds,
  getViewportForFit,
  getViewportForSelection,
} from "./free-form-editor-geometry";

export type FreeFormEditorTool = "select" | "hand" | "text" | "rect" | "circle";
export type FreeFormAlignment = "left" | "center" | "right" | "top" | "middle" | "bottom";
export type FreeFormDistribution = "horizontal" | "vertical";

export interface FreeFormTransientTransform {
  ids: string[];
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FreeFormClipboard {
  elements: FreeFormElement[];
}

export interface FreeFormEditorState {
  scene: FreeFormScene;
  selectionIds: string[];
  hoveredId: string | null;
  focusedTextId: string | null;
  viewport: FreeFormViewportState;
  activeTool: FreeFormEditorTool;
  clipboard: FreeFormClipboard | null;
  history: {
    past: FreeFormScene[];
    future: FreeFormScene[];
  };
  snapping: {
    enabled: boolean;
    guides: FreeFormGuide[];
  };
  transientTransform: FreeFormTransientTransform | null;
}

export type FreeFormCommand =
  | { type: "add-element"; element: FreeFormElement; select?: boolean }
  | { type: "update-element"; id: string; updates: FreeFormElementUpdate }
  | { type: "transform-element"; id: string; updates: FreeFormElementUpdate }
  | { type: "delete-elements"; ids: string[] }
  | { type: "duplicate-elements"; ids: string[] }
  | { type: "reorder-element"; id: string; mode: "forward" | "backward" | "front" | "back" }
  | { type: "group-elements"; ids: string[]; groupId?: string }
  | { type: "ungroup-elements"; ids: string[] }
  | { type: "lock-elements"; ids: string[]; locked: boolean }
  | { type: "toggle-visibility"; ids: string[] }
  | { type: "set-scene-background"; backgroundColor: string }
  | { type: "align-elements"; ids: string[]; alignment: FreeFormAlignment }
  | { type: "distribute-elements"; ids: string[]; distribution: FreeFormDistribution };

type FreeFormEditorAction =
  | { type: "hydrate-scene"; scene: FreeFormScene }
  | { type: "run-command"; command: FreeFormCommand }
  | { type: "select"; ids: string[] }
  | { type: "set-hovered"; id: string | null }
  | { type: "set-focused-text"; id: string | null }
  | { type: "set-tool"; tool: FreeFormEditorTool }
  | { type: "set-viewport"; viewport: Partial<FreeFormViewportState> }
  | { type: "set-guides"; guides: FreeFormGuide[] }
  | { type: "set-snapping"; enabled: boolean }
  | { type: "set-transient-transform"; transform: FreeFormTransientTransform | null }
  | { type: "copy-selection" }
  | { type: "paste-clipboard" }
  | { type: "undo" }
  | { type: "redo" };

type FreeFormCommandResult = {
  scene: FreeFormScene;
  selectionIds?: string[];
};

export const DEFAULT_FREE_FORM_VIEWPORT: FreeFormViewportState = {
  zoom: 1,
  panX: 0,
  panY: 0,
};

function cloneElement<T extends FreeFormElement>(element: T): T {
  return { ...element };
}

function cloneScene(scene: FreeFormScene): FreeFormScene {
  return {
    ...scene,
    elements: scene.elements.map((element) => cloneElement(element)),
  };
}

function serializeScene(scene: FreeFormScene): string {
  return JSON.stringify(scene);
}

function sanitizeSelection(scene: FreeFormScene, selectionIds: string[]): string[] {
  const knownIds = new Set(scene.elements.map((element) => element.id));
  return selectionIds.filter((id) => knownIds.has(id));
}

function getOrderedElements(scene: FreeFormScene): FreeFormElement[] {
  return [...scene.elements]
    .sort((left, right) => (left.zIndex ?? 0) - (right.zIndex ?? 0))
    .map((element, index) => ({
      ...element,
      zIndex: index,
    }));
}

function renormalizeScene(scene: FreeFormScene): FreeFormScene {
  return normalizeFreeFormScene({
    ...scene,
    elements: getOrderedElements(scene),
  });
}

function updateElements(scene: FreeFormScene, ids: string[], updater: (element: FreeFormElement) => FreeFormElement): FreeFormScene {
  const idSet = new Set(ids);
  return renormalizeScene({
    ...scene,
    elements: scene.elements.map((element) => (idSet.has(element.id) ? updater(element) : element)),
  });
}

function reorderElement(scene: FreeFormScene, id: string, mode: "forward" | "backward" | "front" | "back"): FreeFormScene {
  const ordered = getOrderedElements(scene);
  const index = ordered.findIndex((element) => element.id === id);
  if (index < 0) {
    return scene;
  }

  const next = [...ordered];
  const [target] = next.splice(index, 1);

  if (mode === "front") {
    next.push(target);
  } else if (mode === "back") {
    next.unshift(target);
  } else if (mode === "forward") {
    next.splice(Math.min(index + 1, next.length), 0, target);
  } else {
    next.splice(Math.max(0, index - 1), 0, target);
  }

  return renormalizeScene({
    ...scene,
    elements: next,
  });
}

function duplicateElement(element: FreeFormElement, index: number): FreeFormElement {
  const id = `${element.type}-${nanoid(8)}`;
  const base = {
    ...cloneElement(element),
    id,
    x: element.x + 24,
    y: element.y + 24,
    name: `${element.name ?? element.type} copy ${index + 1}`,
  };

  if (base.type === "text") {
    return {
      ...base,
      text: base.text,
    } satisfies FreeFormTextElement;
  }

  return base;
}

export function executeFreeFormCommand(scene: FreeFormScene, command: FreeFormCommand, selectionIds: string[]): FreeFormCommandResult {
  if (command.type === "add-element") {
    const topZ = scene.elements.reduce((max, element) => Math.max(max, element.zIndex ?? 0), -1);
    const element = {
      ...cloneElement(command.element),
      zIndex: topZ + 1,
    };

    return {
      scene: renormalizeScene({
        ...scene,
        elements: [...scene.elements, element],
      }),
      selectionIds: command.select === false ? selectionIds : [element.id],
    };
  }

  if (command.type === "update-element" || command.type === "transform-element") {
    return {
      scene: updateElements(scene, [command.id], (element) => ({ ...element, ...command.updates })),
    };
  }

  if (command.type === "delete-elements") {
    const ids = new Set(command.ids);
    return {
      scene: renormalizeScene({
        ...scene,
        elements: scene.elements.filter((element) => !ids.has(element.id)),
      }),
      selectionIds: selectionIds.filter((id) => !ids.has(id)),
    };
  }

  if (command.type === "duplicate-elements") {
    const selected = getOrderedElements(scene).filter((element) => command.ids.includes(element.id));
    if (selected.length === 0) {
      return { scene };
    }

    const duplicates = selected.map(duplicateElement);
    return {
      scene: renormalizeScene({
        ...scene,
        elements: [...scene.elements, ...duplicates],
      }),
      selectionIds: duplicates.map((element) => element.id),
    };
  }

  if (command.type === "reorder-element") {
    return {
      scene: reorderElement(scene, command.id, command.mode),
    };
  }

  if (command.type === "group-elements") {
    const groupId = command.groupId ?? `group-${nanoid(8)}`;
    return {
      scene: updateElements(scene, command.ids, (element) => ({ ...element, groupId })),
      selectionIds: command.ids,
    };
  }

  if (command.type === "ungroup-elements") {
    return {
      scene: updateElements(scene, command.ids, (element) => ({ ...element, groupId: null })),
      selectionIds: command.ids,
    };
  }

  if (command.type === "lock-elements") {
    return {
      scene: updateElements(scene, command.ids, (element) => ({ ...element, locked: command.locked })),
      selectionIds: command.ids,
    };
  }

  if (command.type === "toggle-visibility") {
    return {
      scene: updateElements(scene, command.ids, (element) => ({ ...element, visible: element.visible === false })),
      selectionIds: command.ids,
    };
  }

  if (command.type === "set-scene-background") {
    return {
      scene: normalizeFreeFormScene({
        ...scene,
        backgroundColor: command.backgroundColor,
      }),
    };
  }

  if (command.type === "align-elements") {
    return {
      scene: renormalizeScene({
        ...scene,
        elements: getAlignedElements(scene, command.ids, command.alignment),
      }),
      selectionIds: command.ids,
    };
  }

  return {
    scene: renormalizeScene({
      ...scene,
      elements: getDistributedElements(scene, command.ids, command.distribution),
    }),
    selectionIds: command.ids,
  };
}

export function createInitialFreeFormEditorState(scene: FreeFormScene): FreeFormEditorState {
  return {
    scene: normalizeFreeFormScene(scene),
    selectionIds: [],
    hoveredId: null,
    focusedTextId: null,
    viewport: DEFAULT_FREE_FORM_VIEWPORT,
    activeTool: "select",
    clipboard: null,
    history: {
      past: [],
      future: [],
    },
    snapping: {
      enabled: true,
      guides: [],
    },
    transientTransform: null,
  };
}

export function freeFormEditorReducer(state: FreeFormEditorState, action: FreeFormEditorAction): FreeFormEditorState {
  if (action.type === "hydrate-scene") {
    const scene = normalizeFreeFormScene(action.scene);
    return {
      ...state,
      scene,
      selectionIds: sanitizeSelection(scene, state.selectionIds),
      history: {
        past: [],
        future: [],
      },
      transientTransform: null,
    };
  }

  if (action.type === "run-command") {
    const previousScene = cloneScene(state.scene);
    const result = executeFreeFormCommand(state.scene, action.command, state.selectionIds);
    if (serializeScene(previousScene) === serializeScene(result.scene)) {
      return state;
    }

    return {
      ...state,
      scene: result.scene,
      selectionIds: sanitizeSelection(result.scene, result.selectionIds ?? state.selectionIds),
      history: {
        past: [...state.history.past, previousScene],
        future: [],
      },
      focusedTextId: result.selectionIds && result.selectionIds.length === 1 ? state.focusedTextId : null,
      transientTransform: null,
    };
  }

  if (action.type === "select") {
    return {
      ...state,
      selectionIds: sanitizeSelection(state.scene, action.ids),
      focusedTextId: action.ids.length === 1 && action.ids[0] === state.focusedTextId ? state.focusedTextId : null,
    };
  }

  if (action.type === "set-hovered") {
    return {
      ...state,
      hoveredId: action.id,
    };
  }

  if (action.type === "set-focused-text") {
    return {
      ...state,
      focusedTextId: action.id,
    };
  }

  if (action.type === "set-tool") {
    return {
      ...state,
      activeTool: action.tool,
    };
  }

  if (action.type === "set-viewport") {
    return {
      ...state,
      viewport: {
        ...state.viewport,
        ...action.viewport,
      },
    };
  }

  if (action.type === "set-guides") {
    return {
      ...state,
      snapping: {
        ...state.snapping,
        guides: action.guides,
      },
    };
  }

  if (action.type === "set-snapping") {
    return {
      ...state,
      snapping: {
        ...state.snapping,
        enabled: action.enabled,
      },
    };
  }

  if (action.type === "set-transient-transform") {
    return {
      ...state,
      transientTransform: action.transform,
    };
  }

  if (action.type === "copy-selection") {
    const elements = state.scene.elements
      .filter((element) => state.selectionIds.includes(element.id))
      .map((element) => cloneElement(element));

    return {
      ...state,
      clipboard: elements.length > 0 ? { elements } : state.clipboard,
    };
  }

  if (action.type === "paste-clipboard") {
    if (!state.clipboard || state.clipboard.elements.length === 0) {
      return state;
    }

    const duplicates = state.clipboard.elements.map(duplicateElement);
    const scene = renormalizeScene({
      ...state.scene,
      elements: [...state.scene.elements, ...duplicates],
    });

    return {
      ...state,
      scene,
      selectionIds: duplicates.map((element) => element.id),
      history: {
        past: [...state.history.past, cloneScene(state.scene)],
        future: [],
      },
    };
  }

  if (action.type === "undo") {
    const previous = state.history.past[state.history.past.length - 1];
    if (!previous) {
      return state;
    }

    return {
      ...state,
      scene: previous,
      selectionIds: sanitizeSelection(previous, state.selectionIds),
      history: {
        past: state.history.past.slice(0, -1),
        future: [cloneScene(state.scene), ...state.history.future],
      },
      transientTransform: null,
    };
  }

  if (action.type === "redo") {
    const next = state.history.future[0];
    if (!next) {
      return state;
    }

    return {
      ...state,
      scene: next,
      selectionIds: sanitizeSelection(next, state.selectionIds),
      history: {
        past: [...state.history.past, cloneScene(state.scene)],
        future: state.history.future.slice(1),
      },
      transientTransform: null,
    };
  }

  return state;
}

export function useFreeFormEditorStore(scene: FreeFormScene, onSceneChange: (scene: FreeFormScene) => void) {
  const [state, dispatch] = React.useReducer(freeFormEditorReducer, scene, createInitialFreeFormEditorState);
  const incomingScene = React.useMemo(() => normalizeFreeFormScene(scene), [scene]);
  const incomingSerialized = React.useMemo(() => serializeScene(incomingScene), [incomingScene]);
  const previousIncomingRef = React.useRef(incomingSerialized);
  const previousCommittedRef = React.useRef(incomingSerialized);

  React.useEffect(() => {
    if (incomingSerialized === previousCommittedRef.current) {
      previousIncomingRef.current = incomingSerialized;
      return;
    }

    previousIncomingRef.current = incomingSerialized;
    dispatch({ type: "hydrate-scene", scene: incomingScene });
  }, [incomingScene, incomingSerialized]);

  React.useEffect(() => {
    const serialized = serializeScene(state.scene);
    if (serialized === previousIncomingRef.current || serialized === previousCommittedRef.current) {
      return;
    }

    previousCommittedRef.current = serialized;
    onSceneChange(state.scene);
  }, [onSceneChange, state.scene]);

  const runCommand = React.useCallback((command: FreeFormCommand) => {
    dispatch({ type: "run-command", command });
  }, []);

  const commands = React.useMemo(() => ({
    run: runCommand,
    addElement: (element: FreeFormElement, select = true) => runCommand({ type: "add-element", element, select }),
    updateElement: (id: string, updates: FreeFormElementUpdate) => runCommand({ type: "update-element", id, updates }),
    transformElement: (id: string, updates: FreeFormElementUpdate) => runCommand({ type: "transform-element", id, updates }),
    deleteElements: (ids: string[]) => runCommand({ type: "delete-elements", ids }),
    duplicateElements: (ids: string[]) => runCommand({ type: "duplicate-elements", ids }),
    reorderElement: (id: string, mode: "forward" | "backward" | "front" | "back") => runCommand({ type: "reorder-element", id, mode }),
    groupElements: (ids: string[]) => runCommand({ type: "group-elements", ids }),
    ungroupElements: (ids: string[]) => runCommand({ type: "ungroup-elements", ids }),
    lockElements: (ids: string[], locked: boolean) => runCommand({ type: "lock-elements", ids, locked }),
    toggleVisibility: (ids: string[]) => runCommand({ type: "toggle-visibility", ids }),
    setSceneBackground: (backgroundColor: string) => runCommand({ type: "set-scene-background", backgroundColor }),
    alignElements: (ids: string[], alignment: FreeFormAlignment) => runCommand({ type: "align-elements", ids, alignment }),
    distributeElements: (ids: string[], distribution: FreeFormDistribution) => runCommand({ type: "distribute-elements", ids, distribution }),
  }), [runCommand]);

  return {
    state,
    dispatch,
    commands,
    canUndo: state.history.past.length > 0,
    canRedo: state.history.future.length > 0,
  };
}

export function createFreeFormElement(type: FreeFormElementType, overrides: Partial<FreeFormElement> = {}): FreeFormElement {
  const id = `${type}-${nanoid(8)}`;
  if (type === "rect") {
    return normalizeFreeFormScene({
      width: 1200,
      height: 800,
      backgroundColor: "#ffffff",
      elements: [{
        id,
        type,
        name: "Rectangle",
        x: 120,
        y: 120,
        width: 220,
        height: 140,
        fill: "#bfdbfe",
        stroke: "#2563eb",
        strokeWidth: 2,
        cornerRadius: 20,
        ...overrides,
      }],
    }).elements[0];
  }

  if (type === "circle") {
    return normalizeFreeFormScene({
      width: 1200,
      height: 800,
      backgroundColor: "#ffffff",
      elements: [{
        id,
        type,
        name: "Circle",
        x: 220,
        y: 220,
        radius: 64,
        fill: "#fde68a",
        stroke: "#d97706",
        strokeWidth: 2,
        ...overrides,
      }],
    }).elements[0];
  }

  return normalizeFreeFormScene({
    width: 1200,
    height: 800,
    backgroundColor: "#ffffff",
    elements: [{
      id,
      type,
      name: "Text",
      x: 140,
      y: 140,
      text: "Text",
      fill: "#0f172a",
      fontSize: 34,
      width: 360,
      lineHeight: 1.2,
      letterSpacing: 0,
      textAlign: "left",
      autoSize: "auto-height",
      ...overrides,
    }],
  }).elements[0];
}