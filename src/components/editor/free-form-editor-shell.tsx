"use client";

import React from "react";
import { Circle, Square, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslations } from "next-intl";
import {
  BrandProfile,
  FreeFormBlock,
  FreeFormElement,
  normalizeFreeFormScene,
} from "@/types/worksheet";
import {
  createFreeFormElement,
  useFreeFormEditorStore,
} from "./free-form-editor-store";
import { getViewportForFit, getViewportForSelection } from "./free-form-editor-geometry";
import { FreeFormCanvas } from "./free-form-canvas";

type FreeFormEditorShellProps = {
  block: FreeFormBlock;
  brandProfile: BrandProfile;
  defaultTextFontFamily: string;
  fontVersion?: number;
  onChange: (updates: Partial<FreeFormBlock>) => void;
};

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable;
}

function getElementLabel(element: FreeFormElement, index: number, t: ReturnType<typeof useTranslations>) {
  if (element.name?.trim()) {
    return element.name;
  }

  if (element.type === "text") {
    return `${t("freeFormToolText")} ${index + 1}`;
  }

  if (element.type === "rect") {
    return `${t("freeFormShapeRectangle")} ${index + 1}`;
  }

  return `${t("freeFormShapeCircle")} ${index + 1}`;
}

export function FreeFormEditorShell({ block, brandProfile, defaultTextFontFamily, fontVersion = 0, onChange }: FreeFormEditorShellProps) {
  const t = useTranslations("blockRenderer");
  const tc = useTranslations("common");
  const normalizedScene = React.useMemo(() => normalizeFreeFormScene(block.scene), [block.scene]);
  const { state, dispatch, commands, canUndo, canRedo } = useFreeFormEditorStore(normalizedScene, (scene) => onChange({ scene }));
  const workspaceRef = React.useRef<HTMLDivElement | null>(null);
  const [workspaceSize, setWorkspaceSize] = React.useState({ width: 0, height: 0 });
  const [spacePressed, setSpacePressed] = React.useState(false);
  const hasFitRef = React.useRef(false);

  const selectedElements = React.useMemo(
    () => state.scene.elements.filter((element) => state.selectionIds.includes(element.id)),
    [state.scene.elements, state.selectionIds],
  );
  const primarySelected = selectedElements[0] ?? null;
  const layerElements = React.useMemo(
    () => [...state.scene.elements].sort((left, right) => (right.zIndex ?? 0) - (left.zIndex ?? 0)),
    [state.scene.elements],
  );

  React.useEffect(() => {
    const node = workspaceRef.current;
    if (!node) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
      setWorkspaceSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    if (workspaceSize.width <= 0 || workspaceSize.height <= 0 || hasFitRef.current) {
      return;
    }

    dispatch({
      type: "set-viewport",
      viewport: getViewportForFit(state.scene, workspaceSize.width, workspaceSize.height),
    });
    hasFitRef.current = true;
  }, [dispatch, state.scene, workspaceSize.height, workspaceSize.width]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space" && !isEditableTarget(event.target)) {
        event.preventDefault();
        setSpacePressed(true);
      }

      const modKey = event.metaKey || event.ctrlKey;
      const editing = isEditableTarget(event.target);

      if (modKey && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          dispatch({ type: "redo" });
        } else {
          dispatch({ type: "undo" });
        }
        return;
      }

      if (modKey && event.key.toLowerCase() === "y") {
        event.preventDefault();
        dispatch({ type: "redo" });
        return;
      }

      if (modKey && event.key.toLowerCase() === "c" && !editing) {
        event.preventDefault();
        dispatch({ type: "copy-selection" });
        return;
      }

      if (modKey && event.key.toLowerCase() === "v" && !editing) {
        event.preventDefault();
        dispatch({ type: "paste-clipboard" });
        return;
      }

      if (modKey && event.key.toLowerCase() === "d" && !editing && state.selectionIds.length > 0) {
        event.preventDefault();
        commands.duplicateElements(state.selectionIds);
        return;
      }

      if (modKey && event.key.toLowerCase() === "g" && !editing && state.selectionIds.length > 1) {
        event.preventDefault();
        const allGrouped = selectedElements.every((element) => element.groupId);
        if (allGrouped && event.shiftKey) {
          commands.ungroupElements(state.selectionIds);
        } else {
          commands.groupElements(state.selectionIds);
        }
        return;
      }

      if ((event.key === "Backspace" || event.key === "Delete") && !editing && state.selectionIds.length > 0) {
        event.preventDefault();
        commands.deleteElements(state.selectionIds);
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        dispatch({ type: "select", ids: [] });
        return;
      }

      if (!editing && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key) && state.selectionIds.length > 0) {
        event.preventDefault();
        const step = event.shiftKey ? 10 : 1;
        const deltaX = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
        const deltaY = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;

        for (const element of selectedElements) {
          commands.updateElement(element.id, {
            x: element.x + deltaX,
            y: element.y + deltaY,
          });
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        setSpacePressed(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [commands, dispatch, selectedElements, state.selectionIds.length]);

  const fitViewport = React.useCallback(() => {
    if (workspaceSize.width <= 0 || workspaceSize.height <= 0) {
      return;
    }

    dispatch({
      type: "set-viewport",
      viewport: getViewportForFit(state.scene, workspaceSize.width, workspaceSize.height),
    });
  }, [dispatch, state.scene, workspaceSize.height, workspaceSize.width]);

  const zoomSelection = React.useCallback(() => {
    if (workspaceSize.width <= 0 || workspaceSize.height <= 0) {
      return;
    }

    const viewport = getViewportForSelection(state.scene, state.selectionIds, workspaceSize.width, workspaceSize.height);
    if (!viewport) {
      return;
    }

    dispatch({ type: "set-viewport", viewport });
  }, [dispatch, state.scene, state.selectionIds, workspaceSize.height, workspaceSize.width]);

  const centerArtboard = React.useCallback((zoom = state.viewport.zoom) => {
    dispatch({
      type: "set-viewport",
      viewport: {
        zoom,
        panX: workspaceSize.width / 2 - state.scene.width * zoom / 2,
        panY: workspaceSize.height / 2 - state.scene.height * zoom / 2,
      },
    });
  }, [dispatch, state.scene.height, state.scene.width, state.viewport.zoom, workspaceSize.height, workspaceSize.width]);

  const addText = React.useCallback(() => {
    commands.addElement(createFreeFormElement("text", { fontFamily: defaultTextFontFamily }));
  }, [commands, defaultTextFontFamily]);

  const addTextPreset = React.useCallback((preset: { text: string; fontSize: number; width: number; fontStyle?: string; fontFamily?: string; fontWeight?: string | number; fill?: string }) => {
    commands.addElement(createFreeFormElement("text", {
      fontFamily: preset.fontFamily ?? defaultTextFontFamily,
      text: preset.text,
      fontSize: preset.fontSize,
      width: preset.width,
      fontStyle: preset.fontStyle,
      fontWeight: preset.fontWeight,
      fill: preset.fill,
    }));
  }, [commands, defaultTextFontFamily]);

  const updatePrimary = React.useCallback((updates: Partial<FreeFormElement>) => {
    if (!primarySelected) {
      return;
    }
    commands.updateElement(primarySelected.id, updates);
  }, [commands, primarySelected]);

  const brandPresets = React.useMemo(() => {
    const accentColor = brandProfile.accentColor?.trim() || brandProfile.primaryColor;
    const exampleFont = brandProfile.exampleTextFont?.trim() || brandProfile.bodyFont;

    return [
      {
        id: "heading",
        label: t("freeFormPresetHeading"),
        description: t("freeFormPresetHeadingHint"),
        text: "Create heading",
        fontSize: 44,
        width: 520,
        fontFamily: brandProfile.headlineFont,
        fontWeight: brandProfile.headlineWeight,
        fill: brandProfile.primaryColor,
      },
      {
        id: "subheading",
        label: t("freeFormPresetSubheading"),
        description: t("freeFormPresetSubheadingHint"),
        text: "Create sub heading",
        fontSize: 28,
        width: 460,
        fontFamily: brandProfile.subHeadlineFont,
        fontWeight: brandProfile.subHeadlineWeight,
        fill: accentColor,
      },
      {
        id: "body",
        label: t("freeFormPresetBody"),
        description: t("freeFormPresetBodyHint"),
        text: "Create body text",
        fontSize: 18,
        width: 420,
        fontFamily: brandProfile.bodyFont,
        fill: "#334155",
      },
      {
        id: "callout",
        label: t("freeFormPresetCallout"),
        description: t("freeFormPresetCalloutHint"),
        text: "Important note",
        fontSize: 22,
        width: 380,
        fontFamily: brandProfile.subHeadlineFont,
        fontWeight: brandProfile.subHeadlineWeight,
        fill: accentColor,
      },
      {
        id: "example",
        label: t("freeFormPresetExample"),
        description: t("freeFormPresetExampleHint"),
        text: "Worked example",
        fontSize: 20,
        width: 360,
        fontFamily: exampleFont,
        fill: brandProfile.primaryColor,
      },
    ] as const;
  }, [brandProfile.accentColor, brandProfile.bodyFont, brandProfile.exampleTextFont, brandProfile.headlineFont, brandProfile.headlineWeight, brandProfile.primaryColor, brandProfile.subHeadlineFont, brandProfile.subHeadlineWeight, t]);

  const panelButtonClass = "border-slate-200 bg-white text-slate-700 hover:bg-slate-50";
  const activePanelButtonClass = "border-slate-900 bg-slate-900 text-white hover:bg-slate-800";

  return (
    <div className="grid h-full grid-rows-[auto_minmax(0,1fr)_200px] bg-[#f8f7f2] text-slate-900">
      <div className="border-b border-[#ddd7cb] bg-[#fffdf8] px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant={state.activeTool === "select" ? "default" : "outline"} className={state.activeTool === "select" ? activePanelButtonClass : panelButtonClass} onClick={() => dispatch({ type: "set-tool", tool: "select" })}>Select</Button>
          <Button type="button" variant={state.activeTool === "hand" ? "default" : "outline"} className={state.activeTool === "hand" ? activePanelButtonClass : panelButtonClass} onClick={() => dispatch({ type: "set-tool", tool: "hand" })}>Hand</Button>
          <Button type="button" variant="outline" className={panelButtonClass} onClick={() => dispatch({ type: "undo" })} disabled={!canUndo}>Undo</Button>
          <Button type="button" variant="outline" className={panelButtonClass} onClick={() => dispatch({ type: "redo" })} disabled={!canRedo}>Redo</Button>
          <div className="mx-2 h-6 w-px bg-slate-200" />
          <Button type="button" variant="outline" className={panelButtonClass} onClick={() => centerArtboard(Math.max(0.1, state.viewport.zoom * 0.9))}>-</Button>
          <Button type="button" variant="outline" className={panelButtonClass} onClick={() => centerArtboard(Math.min(4, state.viewport.zoom * 1.1))}>+</Button>
          <Button type="button" variant="outline" className={panelButtonClass} onClick={fitViewport}>Fit</Button>
          <Button type="button" variant="outline" className={panelButtonClass} onClick={() => centerArtboard(1)}>100%</Button>
          <Button type="button" variant="outline" className={panelButtonClass} onClick={zoomSelection} disabled={state.selectionIds.length === 0}>Selection</Button>
          <Button type="button" variant="outline" className={panelButtonClass} onClick={() => centerArtboard()}>Center</Button>
          <div className="mx-2 h-6 w-px bg-slate-200" />
          <Button type="button" variant="outline" className={panelButtonClass} onClick={() => dispatch({ type: "copy-selection" })} disabled={state.selectionIds.length === 0}>Copy</Button>
          <Button type="button" variant="outline" className={panelButtonClass} onClick={() => dispatch({ type: "paste-clipboard" })}>Paste</Button>
          <Button type="button" variant="outline" className={panelButtonClass} onClick={() => commands.duplicateElements(state.selectionIds)} disabled={state.selectionIds.length === 0}>{tc("duplicate")}</Button>
          <Button type="button" variant="outline" className={panelButtonClass} onClick={() => commands.deleteElements(state.selectionIds)} disabled={state.selectionIds.length === 0}>{tc("delete")}</Button>
          <Button type="button" variant="outline" className={panelButtonClass} onClick={() => commands.groupElements(state.selectionIds)} disabled={state.selectionIds.length < 2}>Group</Button>
          <Button type="button" variant="outline" className={panelButtonClass} onClick={() => commands.ungroupElements(state.selectionIds)} disabled={selectedElements.every((element) => !element.groupId)}>Ungroup</Button>
          <div className="ml-auto flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500 shadow-sm">
            <span>{Math.round(state.viewport.zoom * 100)}%</span>
            <span>Space = pan</span>
          </div>
        </div>
      </div>

      <div className="grid min-h-0 grid-cols-[280px_minmax(0,1fr)_320px]">
        <div className="border-r border-[#ddd7cb] bg-[#fffdf8] p-4">
          <div className="space-y-6 overflow-auto pr-1">
            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Insert</div>
              <Button type="button" variant="outline" className={`w-full justify-start ${panelButtonClass}`} onClick={addText}>
                <Type className="mr-2 h-4 w-4" />
                {t("freeFormAddText")}
              </Button>
              <div className="grid gap-2">
                {brandPresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => addTextPreset(preset)}
                    className="rounded-xl border border-[#e4ddcf] bg-white px-3 py-3 text-left shadow-sm transition hover:border-[#d3c8b1] hover:bg-[#fffaf0]"
                  >
                    <div className="text-sm font-semibold text-slate-900">{preset.label}</div>
                    <div className="mt-1 text-xs text-slate-500">{preset.description}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Shapes</div>
              <Button type="button" variant="outline" className={`w-full justify-start ${panelButtonClass}`} onClick={() => commands.addElement(createFreeFormElement("rect", { fill: `${brandProfile.primaryColor}22`, stroke: brandProfile.primaryColor }))}>
                <Square className="mr-2 h-4 w-4" />
                {t("freeFormShapeRectangle")}
              </Button>
              <Button type="button" variant="outline" className={`w-full justify-start ${panelButtonClass}`} onClick={() => commands.addElement(createFreeFormElement("circle", { fill: `${(brandProfile.accentColor?.trim() || brandProfile.primaryColor)}22`, stroke: brandProfile.accentColor?.trim() || brandProfile.primaryColor }))}>
                <Circle className="mr-2 h-4 w-4" />
                {t("freeFormShapeCircle")}
              </Button>
            </div>

            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Alignment</div>
              <div className="grid grid-cols-3 gap-2">
                <Button type="button" variant="outline" className={panelButtonClass} onClick={() => commands.alignElements(state.selectionIds, "left")} disabled={state.selectionIds.length < 2}>Left</Button>
                <Button type="button" variant="outline" className={panelButtonClass} onClick={() => commands.alignElements(state.selectionIds, "center")} disabled={state.selectionIds.length < 2}>Center</Button>
                <Button type="button" variant="outline" className={panelButtonClass} onClick={() => commands.alignElements(state.selectionIds, "right")} disabled={state.selectionIds.length < 2}>Right</Button>
                <Button type="button" variant="outline" className={panelButtonClass} onClick={() => commands.alignElements(state.selectionIds, "top")} disabled={state.selectionIds.length < 2}>Top</Button>
                <Button type="button" variant="outline" className={panelButtonClass} onClick={() => commands.alignElements(state.selectionIds, "middle")} disabled={state.selectionIds.length < 2}>Middle</Button>
                <Button type="button" variant="outline" className={panelButtonClass} onClick={() => commands.alignElements(state.selectionIds, "bottom")} disabled={state.selectionIds.length < 2}>Bottom</Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="outline" className={panelButtonClass} onClick={() => commands.distributeElements(state.selectionIds, "horizontal")} disabled={state.selectionIds.length < 3}>Distribute X</Button>
                <Button type="button" variant="outline" className={panelButtonClass} onClick={() => commands.distributeElements(state.selectionIds, "vertical")} disabled={state.selectionIds.length < 3}>Distribute Y</Button>
              </div>
            </div>
          </div>
        </div>

        <div className="min-h-0 bg-[#ece6d8]">
          <div ref={workspaceRef} className="h-full min-h-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.85),_rgba(236,230,216,0.85))]">
            <FreeFormCanvas
              scene={state.scene}
              width={Math.max(workspaceSize.width, 640)}
              height={Math.max(workspaceSize.height, 480)}
              defaultFontFamily={defaultTextFontFamily}
              fontVersion={fontVersion}
              selectionIds={state.selectionIds}
              hoveredId={state.hoveredId}
              viewport={state.viewport}
              activeTool={state.activeTool}
              interactive
              canPan={spacePressed || state.activeTool === "hand"}
              guides={state.snapping.guides}
              focusedTextId={state.focusedTextId}
              onSelect={(ids) => dispatch({ type: "select", ids })}
              onHover={(id) => dispatch({ type: "set-hovered", id })}
              onMove={(id, x, y) => commands.updateElement(id, { x, y })}
              onTransform={(id, updates) => commands.transformElement(id, updates)}
              onViewportChange={(viewport) => dispatch({ type: "set-viewport", viewport })}
              onGuidesChange={(guides) => dispatch({ type: "set-guides", guides })}
              onDoubleClickText={(id) => dispatch({ type: "set-focused-text", id })}
              onInlineTextChange={(id, text) => commands.updateElement(id, { text })}
              onInlineTextBlur={() => dispatch({ type: "set-focused-text", id: null })}
            />
          </div>
        </div>

        <div className="border-l border-[#ddd7cb] bg-[#fffdf8] p-4">
          <div className="space-y-4 overflow-auto pr-1">
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Scene</div>
              <Input type="color" value={state.scene.backgroundColor} onChange={(event) => commands.setSceneBackground(event.target.value)} />
            </div>

            {primarySelected ? (
              <>
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Selection</div>
                  <Input value={primarySelected.name ?? ""} onChange={(event) => updatePrimary({ name: event.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.18em] text-slate-500">X</label>
                    <Input type="number" value={Math.round(primarySelected.x)} onChange={(event) => updatePrimary({ x: Number(event.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.18em] text-slate-500">Y</label>
                    <Input type="number" value={Math.round(primarySelected.y)} onChange={(event) => updatePrimary({ y: Number(event.target.value) })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="outline" className={panelButtonClass} onClick={() => commands.lockElements(state.selectionIds, true)} disabled={selectedElements.every((element) => element.locked)}>Lock</Button>
                  <Button type="button" variant="outline" className={panelButtonClass} onClick={() => commands.lockElements(state.selectionIds, false)} disabled={selectedElements.every((element) => !element.locked)}>Unlock</Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="outline" className={panelButtonClass} onClick={() => commands.toggleVisibility(state.selectionIds)}>Toggle visibility</Button>
                  <Input type="number" min={0} max={100} value={Math.round((primarySelected.opacity ?? 1) * 100)} onChange={(event) => updatePrimary({ opacity: Number(event.target.value) / 100 })} />
                </div>

                {primarySelected.type === "text" ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-[0.18em] text-slate-500">Text</label>
                      <textarea
                        value={primarySelected.text}
                        onChange={(event) => commands.updateElement(primarySelected.id, { text: event.target.value })}
                        className="min-h-28 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-300"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <label className="text-xs uppercase tracking-[0.18em] text-slate-500">Font size</label>
                        <Input type="number" value={primarySelected.fontSize} onChange={(event) => commands.updateElement(primarySelected.id, { fontSize: Number(event.target.value) })} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs uppercase tracking-[0.18em] text-slate-500">Width</label>
                        <Input type="number" value={primarySelected.width ?? 360} onChange={(event) => commands.updateElement(primarySelected.id, { width: Number(event.target.value), autoSize: "fixed" })} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-[0.18em] text-slate-500">Font family</label>
                      <Input value={primarySelected.fontFamily ?? defaultTextFontFamily} onChange={(event) => commands.updateElement(primarySelected.id, { fontFamily: event.target.value })} />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <Button type="button" variant={primarySelected.textAlign === "left" ? "default" : "outline"} className={primarySelected.textAlign === "left" ? activePanelButtonClass : panelButtonClass} onClick={() => commands.updateElement(primarySelected.id, { textAlign: "left" })}>Left</Button>
                      <Button type="button" variant={primarySelected.textAlign === "center" ? "default" : "outline"} className={primarySelected.textAlign === "center" ? activePanelButtonClass : panelButtonClass} onClick={() => commands.updateElement(primarySelected.id, { textAlign: "center" })}>Center</Button>
                      <Button type="button" variant={primarySelected.textAlign === "right" ? "default" : "outline"} className={primarySelected.textAlign === "right" ? activePanelButtonClass : panelButtonClass} onClick={() => commands.updateElement(primarySelected.id, { textAlign: "right" })}>Right</Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <label className="text-xs uppercase tracking-[0.18em] text-slate-500">Line height</label>
                        <Input type="number" step="0.1" value={primarySelected.lineHeight ?? 1.2} onChange={(event) => commands.updateElement(primarySelected.id, { lineHeight: Number(event.target.value) })} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs uppercase tracking-[0.18em] text-slate-500">Letter spacing</label>
                        <Input type="number" step="0.1" value={primarySelected.letterSpacing ?? 0} onChange={(event) => commands.updateElement(primarySelected.id, { letterSpacing: Number(event.target.value) })} />
                      </div>
                    </div>
                  </>
                ) : null}

                {primarySelected.type === "rect" ? (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <label className="text-xs uppercase tracking-[0.18em] text-slate-500">Width</label>
                        <Input type="number" value={primarySelected.width} onChange={(event) => commands.updateElement(primarySelected.id, { width: Number(event.target.value) })} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs uppercase tracking-[0.18em] text-slate-500">Height</label>
                        <Input type="number" value={primarySelected.height} onChange={(event) => commands.updateElement(primarySelected.id, { height: Number(event.target.value) })} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-[0.18em] text-slate-500">Corner radius</label>
                      <Input type="number" value={primarySelected.cornerRadius ?? 0} onChange={(event) => commands.updateElement(primarySelected.id, { cornerRadius: Number(event.target.value) })} />
                    </div>
                  </>
                ) : null}

                {primarySelected.type === "circle" ? (
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.18em] text-slate-500">Radius</label>
                    <Input type="number" value={primarySelected.radius} onChange={(event) => commands.updateElement(primarySelected.id, { radius: Number(event.target.value) })} />
                  </div>
                ) : null}

                {primarySelected.type !== "text" ? (
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.18em] text-slate-500">Fill</label>
                    <Input type="color" value={primarySelected.fill} onChange={(event) => commands.updateElement(primarySelected.id, { fill: event.target.value })} />
                  </div>
                ) : null}
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
                {t("freeFormNoSelection")}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-[#ddd7cb] bg-[#fffdf8] px-4 py-3">
        <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          <span>{t("freeFormToolLayers")}</span>
          <span>{layerElements.length} items</span>
        </div>
        <div className="grid max-h-[152px] gap-2 overflow-auto pr-1">
          {layerElements.map((element, index) => {
            const selected = state.selectionIds.includes(element.id);
            const handleSelect = () => dispatch({ type: "select", ids: [element.id] });
            return (
              <div
                key={element.id}
                role="button"
                tabIndex={0}
                onClick={handleSelect}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleSelect();
                  }
                }}
                className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left transition ${selected ? "border-slate-300 bg-[#f4efe4] text-slate-950" : "border-slate-200 bg-white text-slate-800 hover:border-slate-300"}`}
              >
                <div>
                  <div className="text-sm font-medium">{getElementLabel(element, index, t)}</div>
                  <div className={`text-[11px] uppercase tracking-[0.18em] ${selected ? "text-slate-500" : "text-slate-400"}`}>{element.type}</div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span>{element.visible === false ? "Hidden" : "Visible"}</span>
                  <span>{element.locked ? "Locked" : "Editable"}</span>
                  <Button type="button" variant="outline" className={`h-8 border ${selected ? "border-slate-300 bg-white text-slate-950" : "border-slate-200 bg-white text-slate-700"}`} onClick={(event) => {
                    event.stopPropagation();
                    commands.toggleVisibility([element.id]);
                  }}>Eye</Button>
                  <Button type="button" variant="outline" className={`h-8 border ${selected ? "border-slate-300 bg-white text-slate-950" : "border-slate-200 bg-white text-slate-700"}`} onClick={(event) => {
                    event.stopPropagation();
                    commands.reorderElement(element.id, "forward");
                  }}>Up</Button>
                  <Button type="button" variant="outline" className={`h-8 border ${selected ? "border-slate-300 bg-white text-slate-950" : "border-slate-200 bg-white text-slate-700"}`} onClick={(event) => {
                    event.stopPropagation();
                    commands.reorderElement(element.id, "backward");
                  }}>Down</Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}