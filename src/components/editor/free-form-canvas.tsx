"use client";

import React from "react";
import type Konva from "konva";
import { Circle, Layer, Rect, Stage, Text, Transformer } from "react-konva";
import {
  FreeFormCircleElement,
  FreeFormElement,
  FreeFormElementUpdate,
  FreeFormRectElement,
  FreeFormScene,
  FreeFormTextElement,
} from "@/types/worksheet";

type FreeFormCanvasProps = {
  scene: FreeFormScene;
  width: number;
  height: number;
  selectedId?: string | null;
  interactive?: boolean;
  onSelect?: (id: string | null) => void;
  onMove?: (id: string, x: number, y: number) => void;
  onTransform?: (id: string, updates: FreeFormElementUpdate) => void;
};

export function FreeFormCanvas({
  scene,
  width,
  height,
  selectedId = null,
  interactive = false,
  onSelect,
  onMove,
  onTransform,
}: FreeFormCanvasProps) {
  const scaleX = width / Math.max(scene.width, 1);
  const scaleY = height / Math.max(scene.height, 1);
  const shapeRefs = React.useRef<Record<string, Konva.Node>>({});
  const transformerRef = React.useRef<Konva.Transformer | null>(null);

  const setShapeRef = React.useCallback((id: string, node: Konva.Node | null) => {
    if (node) {
      shapeRefs.current[id] = node;
    } else {
      delete shapeRefs.current[id];
    }
  }, []);

  const renderElement = React.useCallback((element: FreeFormElement) => {
    const commonProps = {
      ref: (node: Konva.Node | null) => setShapeRef(element.id, node),
      x: element.x,
      y: element.y,
      rotation: element.rotation ?? 0,
      visible: element.visible !== false,
      draggable: Boolean(onMove),
      onClick: () => onSelect?.(element.id),
      onTap: () => onSelect?.(element.id),
      onDragEnd: onMove
        ? (event: { target: { x: () => number; y: () => number } }) => onMove(element.id, event.target.x(), event.target.y())
        : undefined,
      shadowColor: selectedId === element.id ? "#0f172a" : undefined,
      shadowBlur: selectedId === element.id ? 8 : 0,
      shadowOpacity: selectedId === element.id ? 0.18 : 0,
    };

    const handleTransformEnd = (event: {
      target: {
        x: () => number;
        y: () => number;
        rotation: () => number;
        scaleX: () => number;
        scaleY: () => number;
        width?: () => number;
        height?: () => number;
        radius?: () => number;
        fontSize?: () => number;
        scale: (value: { x: number; y: number }) => void;
      };
    }) => {
      if (!onTransform) return;
      const node = event.target;
      const nextScaleX = node.scaleX();
      const nextScaleY = node.scaleY();

      if (element.type === "rect") {
        onTransform(element.id, {
          x: node.x(),
          y: node.y(),
          rotation: node.rotation(),
          width: Math.max(24, Math.round((node.width?.() ?? (element as FreeFormRectElement).width) * nextScaleX)),
          height: Math.max(24, Math.round((node.height?.() ?? (element as FreeFormRectElement).height) * nextScaleY)),
        } as Partial<FreeFormRectElement>);
      } else if (element.type === "circle") {
        onTransform(element.id, {
          x: node.x(),
          y: node.y(),
          rotation: node.rotation(),
          radius: Math.max(12, Math.round((node.radius?.() ?? (element as FreeFormCircleElement).radius) * Math.max(nextScaleX, nextScaleY))),
        } as Partial<FreeFormCircleElement>);
      } else {
        onTransform(element.id, {
          x: node.x(),
          y: node.y(),
          rotation: node.rotation(),
          width: Math.max(80, Math.round(((element as FreeFormTextElement).width ?? 240) * nextScaleX)),
          fontSize: Math.max(12, Math.round((node.fontSize?.() ?? (element as FreeFormTextElement).fontSize) * nextScaleY)),
        } as Partial<FreeFormTextElement>);
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
          strokeWidth={element.strokeWidth}
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
          strokeWidth={element.strokeWidth}
        />
      );
    }

    return (
      <Text
        key={element.id}
        {...commonProps}
        onTransformEnd={handleTransformEnd}
        text={element.text}
        fill={element.fill}
        fontSize={element.fontSize}
        fontFamily={element.fontFamily}
        fontStyle={element.fontStyle}
        width={element.width}
      />
    );
  }, [onMove, onSelect, onTransform, selectedId, setShapeRef]);

  React.useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) return;
    const selectedNode = selectedId ? shapeRefs.current[selectedId] : null;
    transformer.nodes(selectedNode ? [selectedNode] : []);
    transformer.getLayer()?.batchDraw();
  }, [selectedId, scene.elements]);

  return (
    <Stage
      width={width}
      height={height}
      scaleX={scaleX}
      scaleY={scaleY}
      listening={interactive}
      onMouseDown={interactive ? (event) => {
        const clickedOnStage = event.target === event.target.getStage();
        if (clickedOnStage) {
          onSelect?.(null);
        }
      } : undefined}
    >
      <Layer>
        <Rect x={0} y={0} width={scene.width} height={scene.height} fill={scene.backgroundColor} />
        {scene.elements.map(renderElement)}
        {interactive ? (
          <Transformer
            ref={transformerRef}
            rotateEnabled
            enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right"]}
            borderStroke="#0f172a"
            anchorFill="#0f172a"
            anchorStroke="#ffffff"
            anchorSize={8}
          />
        ) : null}
      </Layer>
    </Stage>
  );
}
