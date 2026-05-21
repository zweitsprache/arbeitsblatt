"use client";

import React from "react";
import dynamic from "next/dynamic";
import { ArrowDown, ArrowUp, CaseSensitive, Circle, Eye, EyeOff, Layers3, Square, Type } from "lucide-react";
import {
  FreeFormBlock,
  FreeFormCircleElement,
  FreeFormElement,
  FreeFormElementUpdate,
  FreeFormRectElement,
  FreeFormScene,
  FreeFormTextElement,
} from "@/types/worksheet";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslations } from "next-intl";

const FreeFormCanvas = dynamic(
  () => import("./free-form-canvas").then((module) => module.FreeFormCanvas),
  { ssr: false }
);

type FreeFormToolPanel = "text" | "shapes" | "layers";

type FreeFormEditorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  block: FreeFormBlock;
  onChange: (updates: Partial<FreeFormBlock>) => void;
};

function updateSceneElement(scene: FreeFormScene, elementId: string, updater: (element: FreeFormElement) => FreeFormElement) {
  return {
    ...scene,
    elements: scene.elements.map((element) => (element.id === elementId ? updater(element) : element)),
  };
}

function moveSceneElement(scene: FreeFormScene, elementId: string, direction: "up" | "down") {
  const index = scene.elements.findIndex((element) => element.id === elementId);
  if (index === -1) return scene;
  const targetIndex = direction === "up" ? Math.min(scene.elements.length - 1, index + 1) : Math.max(0, index - 1);
  if (targetIndex === index) return scene;
  const nextElements = [...scene.elements];
  const [item] = nextElements.splice(index, 1);
  nextElements.splice(targetIndex, 0, item);
  return { ...scene, elements: nextElements };
}

export function FreeFormPreview({ scene, title }: { scene: FreeFormScene; title?: string }) {
  const previewWidth = 560;
  const previewHeight = Math.max(180, Math.round((scene.height / Math.max(scene.width, 1)) * previewWidth));

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
        <span>{title || "Free Form"}</span>
        <span>Preview</span>
      </div>
      <div className="overflow-auto bg-slate-100 p-3">
        <div className="mx-auto w-fit rounded-md border border-slate-200 bg-white shadow-sm">
          <FreeFormCanvas scene={scene} width={previewWidth} height={previewHeight} />
        </div>
      </div>
    </div>
  );
}

export function FreeFormEditorDialog({ open, onOpenChange, block, onChange }: FreeFormEditorDialogProps) {
  const t = useTranslations("blockRenderer");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [activePanel, setActivePanel] = React.useState<FreeFormToolPanel>("text");
  const canvasViewportRef = React.useRef<HTMLDivElement | null>(null);
  const [canvasViewportSize, setCanvasViewportSize] = React.useState({ width: 0, height: 0 });
  const scene = block.scene;
  const selectedElement = scene.elements.find((element) => element.id === selectedId) ?? null;

  React.useEffect(() => {
    if (!open) {
      setSelectedId(null);
      setActivePanel("text");
    }
  }, [open]);

  React.useEffect(() => {
    const node = canvasViewportRef.current;
    if (!node) return;

    const updateSize = () => {
      setCanvasViewportSize({
        width: node.clientWidth,
        height: node.clientHeight,
      });
    };

    updateSize();

    const resizeObserver = new ResizeObserver(() => {
      updateSize();
    });

    resizeObserver.observe(node);
    return () => resizeObserver.disconnect();
  }, [open]);

  const updateScene = React.useCallback((nextScene: FreeFormScene) => {
    onChange({ scene: nextScene });
  }, [onChange]);

  const addRect = React.useCallback(() => {
    updateScene({
      ...scene,
      elements: [
        ...scene.elements,
        {
          id: `rect-${Date.now()}`,
          type: "rect",
          x: 80,
          y: 80,
          width: 220,
          height: 120,
          fill: "#bfdbfe",
          stroke: "#2563eb",
          strokeWidth: 2,
          cornerRadius: 18,
          visible: true,
        } as FreeFormRectElement,
      ],
    });
  }, [scene, updateScene]);

  const addCircle = React.useCallback(() => {
    updateScene({
      ...scene,
      elements: [
        ...scene.elements,
        {
          id: `circle-${Date.now()}`,
          type: "circle",
          x: 200,
          y: 180,
          radius: 64,
          fill: "#fde68a",
          stroke: "#d97706",
          strokeWidth: 2,
          visible: true,
        } as FreeFormCircleElement,
      ],
    });
  }, [scene, updateScene]);

  const addText = React.useCallback(() => {
    updateScene({
      ...scene,
      elements: [
        ...scene.elements,
        {
          id: `text-${Date.now()}`,
          type: "text",
          x: 120,
          y: 120,
          text: "Text",
          fill: "#0f172a",
          fontSize: 34,
          width: 360,
          visible: true,
        } as FreeFormTextElement,
      ],
    });
  }, [scene, updateScene]);

  const addTextPreset = React.useCallback((preset: { text: string; fontSize: number; width: number; fontStyle?: string }) => {
    updateScene({
      ...scene,
      elements: [
        ...scene.elements,
        {
          id: `text-${Date.now()}`,
          type: "text",
          x: 140,
          y: 120,
          text: preset.text,
          fill: "#0f172a",
          fontSize: preset.fontSize,
          width: preset.width,
          fontStyle: preset.fontStyle,
          visible: true,
        } as FreeFormTextElement,
      ],
    });
  }, [scene, updateScene]);

  const updateSelected = React.useCallback((updater: (element: FreeFormElement) => FreeFormElement) => {
    if (!selectedId) return;
    updateScene(updateSceneElement(scene, selectedId, updater));
  }, [scene, selectedId, updateScene]);

  const updateSelectedPosition = React.useCallback((id: string, x: number, y: number) => {
    updateScene(updateSceneElement(scene, id, (current) => ({ ...current, x, y })));
  }, [scene, updateScene]);

  const updateSelectedTransform = React.useCallback((id: string, updates: FreeFormElementUpdate) => {
    updateScene(updateSceneElement(scene, id, (current) => ({ ...current, ...updates })));
  }, [scene, updateScene]);

  const removeSelected = React.useCallback(() => {
    if (!selectedId) return;
    updateScene({
      ...scene,
      elements: scene.elements.filter((element) => element.id !== selectedId),
    });
    setSelectedId(null);
  }, [scene, selectedId, updateScene]);

  const toggleSelectedVisibility = React.useCallback((elementId: string) => {
    updateScene(updateSceneElement(scene, elementId, (element) => ({
      ...element,
      visible: element.visible === false ? true : false,
    })));
  }, [scene, updateScene]);

  const moveSelectedLayer = React.useCallback((direction: "up" | "down") => {
    if (!selectedId) return;
    updateScene(moveSceneElement(scene, selectedId, direction));
  }, [scene, selectedId, updateScene]);

  const fittedCanvasSize = React.useMemo(() => {
    const availableWidth = Math.max(canvasViewportSize.width - 48, 320);
    const availableHeight = Math.max(canvasViewportSize.height - 48, 240);
    const scale = Math.min(
      availableWidth / Math.max(scene.width, 1),
      availableHeight / Math.max(scene.height, 1),
      1,
    );

    return {
      width: Math.max(1, Math.floor(scene.width * scale)),
      height: Math.max(1, Math.floor(scene.height * scale)),
    };
  }, [canvasViewportSize.height, canvasViewportSize.width, scene.height, scene.width]);

  const toolPanels: Array<{
    id: FreeFormToolPanel;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: "text", label: t("freeFormToolText"), icon: Type },
    { id: "shapes", label: t("freeFormToolShapes"), icon: Square },
    { id: "layers", label: t("freeFormToolLayers"), icon: Layers3 },
  ];

  const textPresets = [
    { id: "heading", label: t("freeFormPresetHeading"), description: t("freeFormPresetHeadingHint"), text: "Create heading", fontSize: 42, width: 420, fontStyle: "bold" },
    { id: "subheading", label: t("freeFormPresetSubheading"), description: t("freeFormPresetSubheadingHint"), text: "Create sub heading", fontSize: 28, width: 420 },
    { id: "body", label: t("freeFormPresetBody"), description: t("freeFormPresetBodyHint"), text: "Create body text", fontSize: 18, width: 360 },
  ] as const;

  const selectedElementLabel = selectedElement
    ? selectedElement.type === "text"
      ? t("freeFormToolText")
      : selectedElement.type === "rect"
        ? t("freeFormShapeRectangle")
        : t("freeFormShapeCircle")
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[calc(100vh-1.5rem)] w-[calc(100vw-1.5rem)] max-w-none sm:max-w-none p-0 overflow-hidden" showCloseButton>
        <DialogTitle className="sr-only">{t("freeFormPanelTitle")}</DialogTitle>
        <div className="grid h-full grid-cols-[64px_300px_minmax(0,1fr)_280px] bg-[#f4f4f2] xl:grid-cols-[72px_340px_minmax(0,1fr)_300px]">
          <div className="flex min-h-0 flex-col border-r border-slate-200 bg-white">
            <div className="flex h-16 items-center justify-center border-b border-slate-200 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              FF
            </div>
            <div className="flex-1 space-y-1 p-2">
              {toolPanels.map(({ id, label, icon: Icon }) => {
                const active = activePanel === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActivePanel(id)}
                    className={`flex w-full flex-col items-center justify-center gap-1 rounded-xl px-2 py-3 text-[11px] font-medium transition-colors ${
                      active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex min-h-0 flex-col border-r border-slate-200 bg-white">
            <div className="min-h-0 flex-1 overflow-auto px-5 py-5">
              {activePanel === "text" ? (
                <div className="space-y-5">
                  <Button type="button" variant="outline" className="h-8 w-full justify-start" onClick={addText}>
                    <CaseSensitive className="mr-2 h-4 w-4" />
                    {t("freeFormAddText")}
                  </Button>
                  <div className="space-y-2">
                    {textPresets.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => addTextPreset(preset)}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left transition-colors hover:bg-slate-50"
                      >
                        <div className="text-sm font-semibold text-slate-900">{preset.label}</div>
                        <div className="mt-1 text-xs text-slate-500">{preset.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {activePanel === "shapes" ? (
                <div className="space-y-5">
                  <div className="grid gap-3">
                    <button
                      type="button"
                      onClick={addRect}
                      className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left transition-colors hover:bg-slate-50"
                    >
                      <Square className="h-5 w-5 text-slate-700" />
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{t("freeFormShapeRectangle")}</div>
                        <div className="text-xs text-slate-500">{t("freeFormShapeRectangleHint")}</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={addCircle}
                      className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left transition-colors hover:bg-slate-50"
                    >
                      <Circle className="h-5 w-5 text-slate-700" />
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{t("freeFormShapeCircle")}</div>
                        <div className="text-xs text-slate-500">{t("freeFormShapeCircleHint")}</div>
                      </div>
                    </button>
                  </div>
                </div>
              ) : null}

              {activePanel === "layers" ? (
                <div className="space-y-5">
                  <div className="space-y-2">
                    {scene.elements.map((element, index) => {
                      const selected = element.id === selectedId;
                      const label = element.type === "text"
                        ? `${t("freeFormToolText")} ${index + 1}`
                        : element.type === "rect"
                          ? `${t("freeFormShapeRectangle")} ${index + 1}`
                          : `${t("freeFormShapeCircle")} ${index + 1}`;
                      return (
                        <button
                          key={element.id}
                          type="button"
                          onClick={() => setSelectedId(element.id)}
                          className={`flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left text-sm transition-colors ${
                            selected ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <span>{label}</span>
                          <span className="flex items-center gap-1">
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(event) => {
                                event.stopPropagation();
                                toggleSelectedVisibility(element.id);
                              }}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  toggleSelectedVisibility(element.id);
                                }
                              }}
                              className={`rounded p-1 ${selected ? "hover:bg-white/10" : "hover:bg-slate-100"}`}
                              title={element.visible === false ? t("freeFormShowLayer") : t("freeFormHideLayer")}
                            >
                              {element.visible === false ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </span>
                            <span className={`text-[10px] uppercase tracking-[0.18em] ${selected ? "text-white/70" : "text-slate-400"}`}>
                              {element.type}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex min-h-0 flex-col bg-[#efefec]">
            <div ref={canvasViewportRef} className="min-h-0 flex-1 overflow-auto p-8">
              <div className="mx-auto flex min-h-full items-center justify-center">
                <div className="rounded-[28px] border border-slate-300 bg-white p-3 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
                  <FreeFormCanvas
                    scene={scene}
                    width={fittedCanvasSize.width}
                    height={fittedCanvasSize.height}
                    interactive
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                    onMove={updateSelectedPosition}
                    onTransform={updateSelectedTransform}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-col border-l border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="text-sm font-semibold text-slate-900">{t("freeFormElements")}</div>
              <div className="mt-1 text-xs text-slate-500">
                {selectedElementLabel ?? t("freeFormNoSelection")}
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto px-5 py-4 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Background</label>
                <Input type="color" value={scene.backgroundColor} onChange={(event) => updateScene({ ...scene, backgroundColor: event.target.value })} className="h-10" />
              </div>
              {selectedElement ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <Button type="button" variant="outline" className="h-8" onClick={() => moveSelectedLayer("up")}>
                      <ArrowUp className="mr-2 h-4 w-4" />
                      {t("freeFormLayerForward")}
                    </Button>
                    <Button type="button" variant="outline" className="h-8" onClick={() => moveSelectedLayer("down")}>
                      <ArrowDown className="mr-2 h-4 w-4" />
                      {t("freeFormLayerBackward")}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium uppercase tracking-wide text-slate-500">X</label>
                    <Input type="number" value={Math.round(selectedElement.x)} onChange={(event) => updateSelected((element) => ({ ...element, x: Number(event.target.value) }))} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Y</label>
                    <Input type="number" value={Math.round(selectedElement.y)} onChange={(event) => updateSelected((element) => ({ ...element, y: Number(event.target.value) }))} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium uppercase tracking-wide text-slate-500">{t("freeFormFill")}</label>
                    <Input type="color" value={selectedElement.fill} onChange={(event) => updateSelected((element) => ({ ...element, fill: event.target.value }))} className="h-10" />
                  </div>
                  {selectedElement.type === "text" ? (
                    <>
                      <div className="space-y-2">
                        <label className="text-xs font-medium uppercase tracking-wide text-slate-500">{t("freeFormText")}</label>
                        <textarea
                          value={selectedElement.text}
                          onChange={(event) => updateSelected((element) => ({ ...(element as FreeFormTextElement), text: event.target.value }))}
                          className="min-h-28 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Font Size</label>
                        <Input type="number" value={selectedElement.fontSize} onChange={(event) => updateSelected((element) => ({ ...(element as FreeFormTextElement), fontSize: Number(event.target.value) }))} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium uppercase tracking-wide text-slate-500">{t("freeFormWidth")}</label>
                        <Input type="number" value={selectedElement.width ?? 360} onChange={(event) => updateSelected((element) => ({ ...(element as FreeFormTextElement), width: Number(event.target.value) }))} />
                      </div>
                    </>
                  ) : null}
                  {selectedElement.type === "rect" ? (
                    <>
                      <div className="space-y-2">
                        <label className="text-xs font-medium uppercase tracking-wide text-slate-500">{t("freeFormWidth")}</label>
                        <Input type="number" value={selectedElement.width} onChange={(event) => updateSelected((element) => ({ ...(element as FreeFormRectElement), width: Number(event.target.value) }))} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium uppercase tracking-wide text-slate-500">{t("freeFormHeight")}</label>
                        <Input type="number" value={selectedElement.height} onChange={(event) => updateSelected((element) => ({ ...(element as FreeFormRectElement), height: Number(event.target.value) }))} />
                      </div>
                    </>
                  ) : null}
                  {selectedElement.type === "circle" ? (
                    <div className="space-y-2">
                      <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Radius</label>
                      <Input type="number" value={selectedElement.radius} onChange={(event) => updateSelected((element) => ({ ...(element as FreeFormCircleElement), radius: Number(event.target.value) }))} />
                    </div>
                  ) : null}
                  <Button type="button" variant="destructive" onClick={removeSelected} className="w-full">Remove selected</Button>
                </>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                  {t("freeFormNoSelection")}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}