"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { WorksheetBlock, ViewMode } from "@/types/worksheet";
import { PresentationSettings, splitBlocksIntoSlides } from "@/types/presentation";
import { ViewerBlockRenderer } from "./viewer-block-renderer";

interface PresentationViewerProps {
  presentationId: string;
  title: string;
  blocks: WorksheetBlock[];
  settings: PresentationSettings;
}

export function PresentationViewer({
  presentationId,
  title,
  blocks,
  settings,
}: PresentationViewerProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = useMemo(() => splitBlocksIntoSlides(blocks), [blocks]);
  const slideCount = slides.length;

  // BroadcastChannel listener — receive slide commands from admin
  useEffect(() => {
    const channel = new BroadcastChannel(`presentation-${presentationId}`);

    channel.onmessage = (event) => {
      const { type, index } = event.data;
      if (type === "GOTO_SLIDE" && typeof index === "number") {
        setCurrentSlide(Math.max(0, Math.min(index, slideCount - 1)));
      }
    };

    return () => channel.close();
  }, [presentationId, slideCount]);

  // Keyboard navigation (standalone)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
        case " ":
        case "PageDown":
          e.preventDefault();
          setCurrentSlide((prev) => Math.min(prev + 1, slideCount - 1));
          break;
        case "ArrowLeft":
        case "ArrowUp":
        case "PageUp":
          e.preventDefault();
          setCurrentSlide((prev) => Math.max(prev - 1, 0));
          break;
        case "Home":
          e.preventDefault();
          setCurrentSlide(0);
          break;
        case "End":
          e.preventDefault();
          setCurrentSlide(slideCount - 1);
          break;
        case "Escape":
          // Exit fullscreen if in fullscreen
          if (document.fullscreenElement) {
            document.exitFullscreen();
          }
          break;
        case "f":
        case "F":
          // Toggle fullscreen
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
          } else {
            document.exitFullscreen();
          }
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [slideCount]);

  // Also broadcast current slide so admin can see position
  useEffect(() => {
    const channel = new BroadcastChannel(`presentation-${presentationId}`);
    channel.postMessage({ type: "SLIDE_CHANGED", index: currentSlide });
    return () => channel.close();
  }, [presentationId, currentSlide]);

  const currentBlocks = slides[currentSlide] ?? [];

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{
        backgroundColor: settings.backgroundColor || "#ffffff",
        fontFamily: settings.fontFamily || "'Asap Condensed', sans-serif",
        fontSize: `${settings.fontSize || 18}px`,
      }}
    >
      {/* Slide container — 16:9 centered */}
      <div
        className="relative w-full h-full flex items-center justify-center"
        style={{ maxWidth: "100vw", maxHeight: "100vh" }}
      >
        <div
          className="relative overflow-hidden"
          style={{
            width: "min(100vw, calc(100vh * 16 / 9))",
            height: "min(100vh, calc(100vw * 9 / 16))",
            backgroundColor: settings.backgroundColor || "#ffffff",
          }}
        >
          {/* Slide content */}
          <div
            className="absolute inset-0 overflow-auto"
            style={{ padding: "40px 60px" }}
          >
            <div className="flex flex-col gap-4">
              {currentBlocks.map((block) => (
                <div key={block.id} className="worksheet-block">
                  <ViewerBlockRenderer
                    block={block}
                    mode={"online" as ViewMode}
                    allBlocks={currentBlocks}
                    brand={settings.brand}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Slide indicator */}
      <div className="fixed bottom-4 right-4 text-xs text-black/30 select-none pointer-events-none">
        {currentSlide + 1} / {slideCount}
      </div>
    </div>
  );
}
