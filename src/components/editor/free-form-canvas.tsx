"use client";

import React from "react";
import type Konva from "konva";
import { Circle, Group, Layer, Line, Rect, Stage, Text, Transformer } from "react-konva";
import {
  FreeFormElement,
  FreeFormElementUpdate,
  FreeFormScene,
  FreeFormTextElement,
  FreeFormViewportState,
} from "@/types/worksheet";
import type { FreeFormEditorTool } from "./free-form-editor-store";
import {
  FreeFormGuide,
  getElementBounds,
  getElementBoundsAtPosition,
  getSnappedDragPosition,
} from "./free-form-editor-geometry";

type FreeFormCanvasProps = {
  scene: FreeFormScene;
  width: number;
  height: number;
  defaultFontFamily?: string;
  fontVersion?: number;
  selectionIds?: string[];
  hoveredId?: string | null;
  viewport?: FreeFormViewportState;
  activeTool?: FreeFormEditorTool;
  interactive?: boolean;
  canPan?: boolean;
  guides?: FreeFormGuide[];
  focusedTextId?: string | null;
  onSelect?: (ids: string[]) => void;
  onHover?: (id: string | null) => void;
  onMove?: (id: string, x: number, y: number) => void;
  onTransform?: (id: string, updates: FreeFormElementUpdate) => void;
  onViewportChange?: (viewport: Partial<FreeFormViewportState>) => void;
  onGuidesChange?: (guides: FreeFormGuide[]) => void;
  onDoubleClickText?: (id: string) => void;
  onInlineTextChange?: (id: string, text: string) => void;
  onInlineTextBlur?: () => void;
};

type SelectionRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const PREVIEW_PADDING = 24;

function getPreviewViewport(scene: FreeFormScene, width: number, height: number): FreeFormViewportState {
  const zoom = Math.min(
    (width - PREVIEW_PADDING * 2) / Math.max(scene.width, 1),
    (height - PREVIEW_PADDING * 2) / Math.max(scene.height, 1),
  );
  const safeZoom = Number.isFinite(zoom) ? Math.max(0.1, zoom) : 1;

  return {
    zoom: safeZoom,
    panX: width / 2 - scene.width * safeZoom / 2,
    panY: height / 2 - scene.height * safeZoom / 2,
  };
}

function getPointerInScene(stage: Konva.Stage, viewport: FreeFormViewportState) {
  const pointer = stage.getPointerPosition();
  if (!pointer) {
    return null;
  }

  return {
    x: (pointer.x - viewport.panX) / viewport.zoom,
    y: (pointer.y - viewport.panY) / viewport.zoom,
  };
}

function intersectsSelection(bounds: ReturnType<typeof getElementBounds>, selection: SelectionRect) {
  return !(
    bounds.x > selection.x + selection.width ||
    bounds.x + bounds.width < selection.x ||
    bounds.y > selection.y + selection.height ||
    bounds.y + bounds.height < selection.y
  );
}

function normalizeSelectionRect(rect: SelectionRect): SelectionRect {
  const x = rect.width >= 0 ? rect.x : rect.x + rect.width;
  const y = rect.height >= 0 ? rect.y : rect.y + rect.height;

  return {
    x,
    y,
    width: Math.abs(rect.width),
    height: Math.abs(rect.height),
  };
}

function getKonvaFontStyle(element: FreeFormTextElement) {
  const parts = new Set<string>();
  if (typeof element.fontWeight === "number" ? element.fontWeight >= 600 : element.fontWeight === "bold") {
    parts.add("bold");
  }
  if (element.fontStyle?.includes("bold")) {
    parts.add("bold");
  }
  if (element.fontStyle?.includes("italic")) {
    parts.add("italic");
  }
  return Array.from(parts).join(" ") || "normal";
}

export function FreeFormCanvas({
  scene,
  width,
  height,
  defaultFontFamily,
  fontVersion = 0,
  selectionIds = [],
  hoveredId = null,
  viewport,
  activeTool = "select",
  interactive = false,
  canPan = false,
  guides = [],
  focusedTextId = null,
  onSelect,
  onHover,
  onMove,
  onTransform,
  onViewportChange,
  onGuidesChange,
  onDoubleClickText,
  onInlineTextChange,
  onInlineTextBlur,
}: FreeFormCanvasProps) {
  const stageRef = React.useRef<Konva.Stage | null>(null);
  const transformerRef = React.useRef<Konva.Transformer | null>(null);
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);
  const textInputRef = React.useRef<HTMLTextAreaElement | null>(null);
  const shapeRefs = React.useRef<Record<string, Konva.Node>>({});
  const selectionStartRef = React.useRef<{ x: number; y: number } | null>(null);
  const panningRef = React.useRef<{ clientX: number; clientY: number; panX: number; panY: number } | null>(null);
  const [selectionRect, setSelectionRect] = React.useState<SelectionRect | null>(null);
  const [editingText, setEditingText] = React.useState("");

  const resolvedViewport = viewport ?? getPreviewViewport(scene, width, height);
  const focusedTextElement = React.useMemo(
    () => scene.elements.find((element): element is FreeFormTextElement => element.id === focusedTextId && element.type === "text") ?? null,
    [focusedTextId, scene.elements],
  );

  React.useEffect(() => {
    if (!focusedTextElement) {
      setEditingText("");
      return;
    }

    setEditingText(focusedTextElement.text);
  }, [focusedTextElement]);

  React.useEffect(() => {
    if (!focusedTextElement || !textInputRef.current) {
      return;
    }

    textInputRef.current.focus();
    textInputRef.current.select();
  }, [focusedTextElement]);

  const setShapeRef = React.useCallback((id: string, node: Konva.Node | null) => {
    if (node) {
      shapeRefs.current[id] = node;
      return;
    }
    delete shapeRefs.current[id];
  }, []);

  const commitSelectionRect = React.useCallback(() => {
    if (!selectionRect) {
      return;
    }

    const normalized = normalizeSelectionRect(selectionRect);
    if (normalized.width < 4 && normalized.height < 4) {
      setSelectionRect(null);
      return;
    }

    const ids = scene.elements
      .filter((element) => element.visible !== false)
      .filter((element) => intersectsSelection(getElementBounds(element), normalized))
      .map((element) => element.id);

    onSelect?.(ids);
    setSelectionRect(null);
  }, [onSelect, scene.elements, selectionRect]);

  const renderElement = React.useCallback((element: FreeFormElement) => {
    const selected = selectionIds.includes(element.id);
    const draggable = interactive && activeTool === "select" && !canPan && !element.locked;
    const commonProps = {
      ref: (node: Konva.Node | null) => setShapeRef(element.id, node),
      x: element.x,
      y: element.y,
      rotation: element.rotation ?? 0,
      opacity: element.opacity ?? 1,
      visible: element.visible !== false,
      draggable,
      onMouseEnter: () => onHover?.(element.id),
      onMouseLeave: () => onHover?.(null),
      onClick: (event: Konva.KonvaEventObject<MouseEvent>) => {
        if (!interactive) {
          return;
        }

        if (event.evt.shiftKey) {
          if (selected) {
            onSelect?.(selectionIds.filter((id) => id !== element.id));
          } else {
            onSelect?.([...selectionIds, element.id]);
          }
          return;
        }

        onSelect?.([element.id]);
      },
      onTap: () => onSelect?.([element.id]),
      onDragMove: (event: Konva.KonvaEventObject<DragEvent>) => {
        if (!interactive) {
          return;
        }

        const snapped = getSnappedDragPosition(scene, element, event.target.x(), event.target.y(), resolvedViewport.zoom);
        if (snapped.x !== event.target.x() || snapped.y !== event.target.y()) {
          event.target.position({ x: snapped.x, y: snapped.y });
        }
        onGuidesChange?.(snapped.guides);
      },
      onDragEnd: (event: Konva.KonvaEventObject<DragEvent>) => {
        onGuidesChange?.([]);
        onMove?.(element.id, event.target.x(), event.target.y());
      },
      shadowColor: selected ? "#0f172a" : hoveredId === element.id ? "#334155" : undefined,
      shadowBlur: selected ? 12 : hoveredId === element.id ? 8 : 0,
      shadowOpacity: selected ? 0.16 : hoveredId === element.id ? 0.12 : 0,
    };

    const handleTransformEnd = (event: Konva.KonvaEventObject<Event>) => {
      if (!onTransform) {
        return;
      }

      const node = event.target;
      const nextScaleX = node.scaleX();
      const nextScaleY = node.scaleY();

      if (element.type === "rect") {
        onTransform(element.id, {
          x: node.x(),
          y: node.y(),
          rotation: node.rotation(),
          width: Math.max(24, Math.round(element.width * nextScaleX)),
          height: Math.max(24, Math.round(element.height * nextScaleY)),
        });
      } else if (element.type === "circle") {
        onTransform(element.id, {
          x: node.x(),
          y: node.y(),
          rotation: node.rotation(),
          radius: Math.max(12, Math.round(element.radius * Math.max(nextScaleX, nextScaleY))),
        });
      } else {
        onTransform(element.id, {
          x: node.x(),
          y: node.y(),
          rotation: node.rotation(),
          width: Math.max(80, Math.round((element.width ?? 240) * nextScaleX)),
          height: typeof element.height === "number" ? Math.max(24, Math.round(element.height * nextScaleY)) : undefined,
          fontSize: Math.max(12, Math.round(element.fontSize * nextScaleY)),
        });
      }

      node.scale({ x: 1, y: 1 });
    };

    if (element.type === "rect") {
      return (
        <Rect
          key={element.id}
          {...commonProps}
          onTransformEnd={handleTransformEnd}
          width={element.width}
          height={element.height}
          fill={element.fill}
          stroke={element.stroke}
          strokeWidth={selected ? Math.max(2, element.strokeWidth ?? 0) : element.strokeWidth}
          cornerRadius={element.cornerRadius}
        />
      );
    }

    if (element.type === "circle") {
      return (
        <Circle
          key={element.id}
          {...commonProps}
          onTransformEnd={handleTransformEnd}
          radius={element.radius}
          fill={element.fill}
          stroke={element.stroke}
          strokeWidth={selected ? Math.max(2, element.strokeWidth ?? 0) : element.strokeWidth}
        />
      );
    }

    return (
      <Text
        key={element.id}
        {...commonProps}
        onTransformEnd={handleTransformEnd}
        onDblClick={() => onDoubleClickText?.(element.id)}
        onDblTap={() => onDoubleClickText?.(element.id)}
        text={element.text}
        fill={element.fill}
        fontSize={element.fontSize}
        fontFamily={element.fontFamily?.trim() || defaultFontFamily}
        fontStyle={getKonvaFontStyle(element)}
        width={element.width}
        height={element.height}
        align={element.textAlign}
        lineHeight={element.lineHeight}
        letterSpacing={element.letterSpacing}
      />
    );
  }, [activeTool, canPan, defaultFontFamily, hoveredId, interactive, onDoubleClickText, onGuidesChange, onHover, onMove, onSelect, onTransform, resolvedViewport.zoom, scene, selectionIds, setShapeRef]);

  React.useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) {
      return;
    }

    const nodes = selectionIds
      .map((id) => shapeRefs.current[id])
      .filter((node): node is Konva.Node => Boolean(node));

    transformer.nodes(nodes);
    transformer.getLayer()?.batchDraw();
  }, [selectionIds, scene.elements]);

  React.useEffect(() => {
    const stage = stageRef.current;
    if (!stage) {
      return;
    }

    stage.getLayers().forEach((layer) => layer.batchDraw());
  }, [fontVersion, guides, height, scene.elements, selectionRect, selectionIds, width]);

  const editingBounds = focusedTextElement ? getElementBounds(focusedTextElement) : null;

  return (
    <div ref={wrapperRef} className="relative h-full w-full overflow-hidden">
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        listening={interactive}
        onWheel={interactive ? (event) => {
        event.evt.preventDefault();
        const stage = event.target.getStage();
        if (!stage || !onViewportChange) {
          return;
        }

        const pointer = stage.getPointerPosition();
        if (!pointer) {
          return;
        }

        const nextZoom = event.evt.deltaY > 0
          ? Math.max(0.1, resolvedViewport.zoom * 0.9)
          : Math.min(4, resolvedViewport.zoom * 1.1);
        const scenePointX = (pointer.x - resolvedViewport.panX) / resolvedViewport.zoom;
        const scenePointY = (pointer.y - resolvedViewport.panY) / resolvedViewport.zoom;

        onViewportChange({
          zoom: nextZoom,
          panX: pointer.x - scenePointX * nextZoom,
          panY: pointer.y - scenePointY * nextZoom,
        });
      } : undefined}
        onMouseDown={interactive ? (event) => {
        const stage = stageRef.current;
        if (!stage) {
          return;
        }

        const target = event.target;
        const targetName = target.name();
        const blankTarget = target === stage || targetName === "workspace-background" || targetName === "artboard-background";
        const pointer = getPointerInScene(stage, resolvedViewport);
        if (!pointer) {
          return;
        }

        if (canPan || activeTool === "hand") {
          panningRef.current = {
            clientX: event.evt.clientX,
            clientY: event.evt.clientY,
            panX: resolvedViewport.panX,
            panY: resolvedViewport.panY,
          };
          return;
        }

        if (activeTool === "select" && blankTarget) {
          selectionStartRef.current = pointer;
          setSelectionRect({ x: pointer.x, y: pointer.y, width: 0, height: 0 });
          onSelect?.([]);
        }
      } : undefined}
        onMouseMove={interactive ? (event) => {
        if (panningRef.current && onViewportChange) {
          onViewportChange({
            panX: panningRef.current.panX + (event.evt.clientX - panningRef.current.clientX),
            panY: panningRef.current.panY + (event.evt.clientY - panningRef.current.clientY),
          });
          return;
        }

        const stage = stageRef.current;
        if (!stage || !selectionStartRef.current) {
          return;
        }

        const pointer = getPointerInScene(stage, resolvedViewport);
        if (!pointer) {
          return;
        }

        setSelectionRect({
          x: selectionStartRef.current.x,
          y: selectionStartRef.current.y,
          width: pointer.x - selectionStartRef.current.x,
          height: pointer.y - selectionStartRef.current.y,
        });
      } : undefined}
        onMouseUp={interactive ? () => {
        panningRef.current = null;
        selectionStartRef.current = null;
        commitSelectionRect();
        onGuidesChange?.([]);
      } : undefined}
      >
        <Layer>
          <Rect name="workspace-background" x={0} y={0} width={width} height={height} fill="#f1f5f9" />
          <Group x={resolvedViewport.panX} y={resolvedViewport.panY} scaleX={resolvedViewport.zoom} scaleY={resolvedViewport.zoom}>
            <Rect x={12} y={16} width={scene.width} height={scene.height} fill="#94a3b8" opacity={0.12} cornerRadius={18} />
            <Rect name="artboard-background" x={0} y={0} width={scene.width} height={scene.height} fill={scene.backgroundColor} cornerRadius={18} />
            {guides.map((guide) => guide.orientation === "vertical" ? (
              <Line
                key={guide.id}
                points={[guide.offset, 0, guide.offset, scene.height]}
                stroke={guide.kind === "spacing" ? "#16a34a" : "#2563eb"}
                strokeWidth={1 / resolvedViewport.zoom}
                dash={[8 / resolvedViewport.zoom, 8 / resolvedViewport.zoom]}
              />
            ) : (
              <Line
                key={guide.id}
                points={[0, guide.offset, scene.width, guide.offset]}
                stroke={guide.kind === "spacing" ? "#16a34a" : "#2563eb"}
                strokeWidth={1 / resolvedViewport.zoom}
                dash={[8 / resolvedViewport.zoom, 8 / resolvedViewport.zoom]}
              />
            ))}
            {scene.elements.map(renderElement)}
            {selectionRect ? (() => {
              const normalized = normalizeSelectionRect(selectionRect);
              return (
                <Rect
                  x={normalized.x}
                  y={normalized.y}
                  width={normalized.width}
                  height={normalized.height}
                  fill="#2563eb"
                  opacity={0.08}
                  stroke="#2563eb"
                  strokeWidth={1 / resolvedViewport.zoom}
                  dash={[8 / resolvedViewport.zoom, 8 / resolvedViewport.zoom]}
                />
              );
            })() : null}
            {interactive ? (
              <Transformer
                ref={transformerRef}
                rotateEnabled
                flipEnabled={false}
                enabledAnchors={["top-left", "top-center", "top-right", "middle-left", "middle-right", "bottom-left", "bottom-center", "bottom-right"]}
                borderStroke="#0f172a"
                borderStrokeWidth={1 / resolvedViewport.zoom}
                anchorFill="#0f172a"
                anchorStroke="#ffffff"
                anchorSize={10 / resolvedViewport.zoom}
              />
            ) : null}
          </Group>
        </Layer>
      </Stage>
      {focusedTextElement && editingBounds ? (
        <textarea
          ref={textInputRef}
          value={editingText}
          onChange={(event) => setEditingText(event.target.value)}
          onBlur={() => {
            onInlineTextChange?.(focusedTextElement.id, editingText);
            onInlineTextBlur?.();
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              setEditingText(focusedTextElement.text);
              onInlineTextBlur?.();
            }
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              event.preventDefault();
              onInlineTextChange?.(focusedTextElement.id, editingText);
              onInlineTextBlur?.();
            }
          }}
          className="absolute resize-none rounded-md border border-blue-300 bg-white/95 px-2 py-1 shadow-lg outline-none ring-2 ring-blue-200"
          style={{
            left: resolvedViewport.panX + editingBounds.x * resolvedViewport.zoom,
            top: resolvedViewport.panY + editingBounds.y * resolvedViewport.zoom,
            width: Math.max(120, editingBounds.width * resolvedViewport.zoom),
            minHeight: Math.max(40, editingBounds.height * resolvedViewport.zoom),
            fontFamily: focusedTextElement.fontFamily?.trim() || defaultFontFamily,
            fontSize: focusedTextElement.fontSize * resolvedViewport.zoom,
            lineHeight: String(focusedTextElement.lineHeight ?? 1.2),
            letterSpacing: `${(focusedTextElement.letterSpacing ?? 0) * resolvedViewport.zoom}px`,
            color: focusedTextElement.fill,
            textAlign: focusedTextElement.textAlign ?? "left",
            transform: focusedTextElement.rotation ? `rotate(${focusedTextElement.rotation}deg)` : undefined,
            transformOrigin: "top left",
          }}
        />
      ) : null}
    </div>
  );
}
