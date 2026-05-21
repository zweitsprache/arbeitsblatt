import { describe, expect, it } from "vitest";
import {
  FREE_FORM_SCENE_VERSION,
  normalizeFreeFormScene,
} from "@/types/worksheet";
import {
  getViewportForFit,
  getViewportForSelection,
} from "@/components/editor/free-form-editor-geometry";

describe("free-form scene normalization", () => {
  it("migrates legacy scenes to the current version with editor metadata", () => {
    const scene = normalizeFreeFormScene({
      width: 600,
      height: 400,
      backgroundColor: "#ffffff",
      elements: [
        { id: "legacy-text", type: "text", x: 10, y: 20, text: "Hello", fill: "#111", fontSize: 24 },
      ],
    });

    expect(scene.version).toBe(FREE_FORM_SCENE_VERSION);
    expect(scene.elements[0]?.name).toBe("Text 1");
    expect(scene.elements[0]?.opacity).toBe(1);
    expect(scene.elements[0]?.zIndex).toBe(0);
  });
});

describe("free-form viewport math", () => {
  const scene = normalizeFreeFormScene({
    width: 1000,
    height: 500,
    backgroundColor: "#fff",
    elements: [
      { id: "one", type: "rect", x: 100, y: 100, width: 200, height: 100, fill: "#ccc" },
      { id: "two", type: "rect", x: 600, y: 250, width: 100, height: 80, fill: "#ccc" },
    ],
  });

  it("computes zoom-to-fit around the artboard", () => {
    const viewport = getViewportForFit(scene, 1400, 900);
    expect(viewport.zoom).toBeGreaterThan(1);
    expect(viewport.panX).toBeGreaterThan(0);
    expect(viewport.panY).toBeGreaterThan(0);
  });

  it("computes zoom-to-selection around selected bounds", () => {
    const viewport = getViewportForSelection(scene, ["one"], 1000, 700);
    expect(viewport).not.toBeNull();
    expect(viewport?.zoom).toBeGreaterThan(1);
    expect(viewport?.panX).toBeLessThan(200);
  });
});