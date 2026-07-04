"use client";

import React from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEditor } from "@/store/editor-store";
import { WorksheetViewer } from "@/components/viewer/worksheet-viewer";

type Lane = {
  id: string;
  blockId?: string;
  position: "above" | "below";
  top: number;
};

type BlockAnchor = {
  id: string;
  top: number;
  height: number;
};

function DropLane({
  id,
  top,
  active,
  dragging,
}: {
  id: string;
  top: number;
  active: boolean;
  dragging: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const visible = active || isOver;

  return (
    <div
      ref={setNodeRef}
      className={`absolute left-0 right-0 z-20 ${dragging ? "pointer-events-auto" : "pointer-events-none"}`}
      style={{ top: `${top}px`, height: "14px", transform: "translateY(-7px)" }}
    >
      <div className={`h-full w-full transition-opacity ${visible ? "opacity-100" : "opacity-30"}`}>
        <div className={`mx-4 h-full rounded-full border-2 border-dashed ${isOver ? "border-primary bg-primary/15" : "border-primary/50 bg-primary/5"}`} />
      </div>
    </div>
  );
}

function BlockDragHandle({
  blockId,
  top,
  height,
  active,
}: {
  blockId: string;
  top: number;
  height: number;
  active: boolean;
}) {
  const { dispatch } = useEditor();
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: blockId,
    data: { type: "v3-top-level-block", blockId },
  });

  return (
    <div
      className="absolute left-2 z-30 pointer-events-none"
      style={{ top: `${top}px`, height: `${height}px` }}
    >
      <button
        ref={setNodeRef}
        type="button"
        className={`pointer-events-auto mt-2 flex h-7 w-7 items-center justify-center rounded border bg-white shadow-sm transition-colors ${active || isDragging ? "border-primary text-primary" : "border-slate-300 text-slate-500 hover:border-primary/60 hover:text-primary"}`}
        onMouseDown={(event) => {
          event.stopPropagation();
          dispatch({ type: "SELECT_BLOCK", payload: blockId });
        }}
        {...listeners}
        {...attributes}
        aria-label="Drag block"
      >
        <GripVertical className="h-4 w-4" />
      </button>
    </div>
  );
}

function BlockSelectionOverlay({
  blockId,
  top,
  height,
  selected,
  disabled,
}: {
  blockId: string;
  top: number;
  height: number;
  selected: boolean;
  disabled: boolean;
}) {
  const { dispatch } = useEditor();

  return (
    <div
      className="absolute left-0 right-0 z-10"
      style={{ top: `${top}px`, height: `${height}px` }}
    >
      <button
        type="button"
        className={`h-full w-full rounded-sm border-0 bg-transparent transition-colors ${selected ? "" : "hover:bg-primary/[0.03]"} ${disabled ? "pointer-events-none" : "pointer-events-auto"}`}
        onMouseDown={(event) => {
          event.stopPropagation();
          dispatch({ type: "SELECT_BLOCK", payload: blockId });
        }}
        aria-label="Select block"
      />
      {selected && (
        <div className="pointer-events-none absolute bottom-1 left-0 top-1 w-1 rounded-r bg-primary/70" />
      )}
    </div>
  );
}

export function WorksheetCanvasV3({
  activeId,
  overId,
  overPosition,
  showPageGuides,
}: {
  activeId: string | null;
  overId: string | null;
  overPosition: "above" | "below";
  showPageGuides: boolean;
}) {
  const { state, dispatch } = useEditor();
  const t = useTranslations("canvas");
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);
  const [lanes, setLanes] = React.useState<Lane[]>([]);
  const [anchors, setAnchors] = React.useState<BlockAnchor[]>([]);
  const [contentHeight, setContentHeight] = React.useState(0);
  const { setNodeRef: setEmptyRef, isOver: isEmptyOver } = useDroppable({ id: "canvas-drop-zone" });

  const recomputeLanes = React.useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) {
      setLanes([]);
      return;
    }

    const blockEls = Array.from(wrapper.querySelectorAll<HTMLElement>("[data-block-id]"));
    if (blockEls.length === 0) {
      setLanes([]);
      setAnchors([]);
      return;
    }

    const wrapperRect = wrapper.getBoundingClientRect();
    setContentHeight(wrapper.scrollHeight);
    const nextAnchors: BlockAnchor[] = blockEls.map((el) => {
      const blockId = el.dataset.blockId || "";
      const rect = el.getBoundingClientRect();
      return {
        id: blockId,
        top: rect.top - wrapperRect.top,
        height: rect.height,
      };
    });

    const nextLanes: Lane[] = blockEls.map((el) => {
      const blockId = el.dataset.blockId || "";
      const rect = el.getBoundingClientRect();
      return {
        id: `v3-lane-before-${blockId}`,
        blockId,
        position: "above",
        top: rect.top - wrapperRect.top,
      };
    });

    const lastRect = blockEls[blockEls.length - 1]?.getBoundingClientRect();
    if (lastRect) {
      nextLanes.push({
        id: "v3-lane-end",
        position: "below",
        top: lastRect.bottom - wrapperRect.top,
      });
    }

    setAnchors(nextAnchors);
    setLanes(nextLanes);
  }, []);

  React.useEffect(() => {
    recomputeLanes();
  }, [recomputeLanes, state.blocks, state.settings, state.title]);

  React.useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const observer = new ResizeObserver(() => recomputeLanes());
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [recomputeLanes]);

  const isLandscape = state.settings.orientation === "landscape" || state.settings.orientation === "landscape-canva";
  const pageWidth = state.settings.pageSize === "a4"
    ? (isLandscape ? 1123 : 794)
    : (isLandscape ? 1056 : 816);
  const pageHeight = state.settings.pageSize === "a4"
    ? (isLandscape ? 794 : 1123)
    : (isLandscape ? 816 : 1056);
  const pageGap = 20;
  const pageCount = Math.max(1, Math.ceil((contentHeight || pageHeight) / pageHeight));
  const pageFrames = Array.from({ length: pageCount }, (_, i) => i);
  const pageBreakOffsets = Array.from({ length: Math.max(0, pageCount - 1) }, (_, i) => (i + 1) * pageHeight);
  const pageLabel = `${state.settings.pageSize?.toUpperCase() || "A4"} ${isLandscape ? "landscape" : "portrait"}`;

  const clearSelectionIfWorkspaceClick = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      dispatch({ type: "SELECT_BLOCK", payload: null });
    }
  }, [dispatch]);

  return (
    <div
      className="flex-1 overflow-auto canvas-scroll bg-slate-100"
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      onMouseDown={clearSelectionIfWorkspaceClick}
    >
      <div className="mx-auto px-4 py-6" style={{ maxWidth: `${pageWidth + 48}px` }}>
        {state.blocks.length === 0 ? (
          <div
            ref={setEmptyRef}
            className={`flex min-h-[400px] flex-col items-center justify-center rounded-lg border-2 border-dashed bg-white text-muted-foreground ${isEmptyOver ? "border-primary bg-primary/5" : "border-slate-300"}`}
          >
            <p className="text-lg font-medium opacity-60">{t("dragBlocksHere")}</p>
            <p className="mt-1 text-sm opacity-40">{t("orDoubleClick")}</p>
          </div>
        ) : (
          <div className="relative">
            <div className="overflow-visible bg-transparent">
              <style>{`
                .print-worksheet-root {
                  background: transparent !important;
                }
              `}</style>
              <div ref={wrapperRef} className="relative z-10">
                <WorksheetViewer
                  title={state.title}
                  blocks={state.blocks}
                  settings={state.settings}
                  mode="print"
                  worksheetId={state.worksheetId ?? undefined}
                  brandProfile={state.brandProfile}
                />
              </div>
            </div>
            {lanes.map((lane) => {
              const isActive = lane.blockId
                ? overId === lane.blockId && overPosition === lane.position && !!activeId
                : !!activeId;
              return (
                <DropLane
                  key={lane.id}
                  id={lane.id}
                  top={lane.top}
                  active={isActive}
                  dragging={!!activeId}
                />
              );
            })}
            {showPageGuides && pageFrames.map((pageIndex) => (
              <div
                key={`page-frame-${pageIndex}`}
                className="pointer-events-none absolute left-1/2 z-[1]"
                style={{
                  top: `${pageIndex * pageHeight}px`,
                  width: `${pageWidth}px`,
                  height: `${pageHeight}px`,
                  transform: "translateX(-50%)",
                }}
              >
                <div className="absolute inset-0 rounded-sm border border-slate-400/50 bg-white shadow-[inset_0_0_0_1px_rgba(148,163,184,0.15)]" />
                <div className="absolute left-2 top-2 rounded bg-slate-100/95 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                  Page {pageIndex + 1}
                </div>
              </div>
            ))}
            {showPageGuides && pageBreakOffsets.map((offset, index) => (
              <div key={`page-guide-${index}`} className="pointer-events-none absolute left-0 right-0 z-[24]" style={{ top: `${offset}px` }}>
                <div
                  className="absolute left-0 right-0 border-y border-slate-300/80 bg-slate-100"
                  style={{
                    top: `${-pageGap / 2}px`,
                    height: `${pageGap}px`,
                  }}
                >
                  <span className="absolute -top-3 right-3 rounded bg-slate-100/95 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                    Page {index + 2}
                  </span>
                </div>
              </div>
            ))}
            {anchors.map((anchor) => (
              <BlockSelectionOverlay
                key={`selection-${anchor.id}`}
                blockId={anchor.id}
                top={anchor.top}
                height={anchor.height}
                selected={state.selectedBlockId === anchor.id}
                disabled={!!activeId}
              />
            ))}
            {showPageGuides && (
              <div className="pointer-events-none absolute right-3 top-3 z-[35] rounded bg-slate-900/85 px-2 py-1 text-[10px] font-medium text-white">
                {pageLabel} · {pageWidth}x{pageHeight}px
              </div>
            )}
            {anchors.map((anchor) => (
              <BlockDragHandle
                key={`handle-${anchor.id}`}
                blockId={anchor.id}
                top={anchor.top}
                height={anchor.height}
                active={state.selectedBlockId === anchor.id || activeId === anchor.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
