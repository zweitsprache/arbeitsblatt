import { describe, expect, it } from "vitest";
import { createDefaultFreeFormScene, normalizeFreeFormScene } from "@/types/worksheet";
import {
  createInitialFreeFormEditorState,
  freeFormEditorReducer,
} from "@/components/editor/free-form-editor-store";
import { getDistributedElements } from "@/components/editor/free-form-editor-geometry";

describe("free-form editor reducer", () => {
  it("records history for commands and supports undo/redo", () => {
    const scene = createDefaultFreeFormScene();
    const state = createInitialFreeFormEditorState(scene);

    const selected = freeFormEditorReducer(state, { type: "select", ids: [scene.elements[0].id] });
    const moved = freeFormEditorReducer(selected, {
      type: "run-command",
      command: {
        type: "update-element",
        id: scene.elements[0].id,
        updates: { x: 160, y: 200 },
      },
    });

    expect(moved.scene.elements[0]?.x).toBe(160);
    expect(moved.history.past).toHaveLength(1);

    const undone = freeFormEditorReducer(moved, { type: "undo" });
    expect(undone.scene.elements[0]?.x).toBe(scene.elements[0]?.x);

    const redone = freeFormEditorReducer(undone, { type: "redo" });
    expect(redone.scene.elements[0]?.x).toBe(160);
  });

  it("distributes selected elements based on visual bounds", () => {
    const scene = normalizeFreeFormScene({
      width: 1200,
      height: 800,
      backgroundColor: "#fffdf6",
      elements: [
        { id: "a", type: "rect", x: 0, y: 0, width: 100, height: 80, fill: "#ddd" },
        { id: "b", type: "rect", x: 170, y: 0, width: 100, height: 80, fill: "#ddd" },
        { id: "c", type: "rect", x: 500, y: 0, width: 100, height: 80, fill: "#ddd" },
      ],
    });

    const distributed = getDistributedElements(scene, ["a", "b", "c"], "horizontal");
    const middle = distributed.find((element) => element.id === "b");

    expect(middle?.x).toBe(250);
  });
});