"use client";

import React, { useState } from "react";
import {
  FileText,
  Layers,
  LayoutGrid,
  TableProperties,
  BookOpen,
  Loader2,
} from "lucide-react";

type Orientation = "portrait" | "landscape";
type ContentType = "worksheet" | "cards" | "flashcards" | "grammar-table" | "ebook";

interface LibraryItemPreviewProps {
  type: string;
  orientation: Orientation;
  title?: string;
  thumbnailUrl?: string;
  hasThumbnail?: boolean;
}

/**
 * Thumbnail preview for library cards.
 * Shows real PDF thumbnails when available, with a CSS paper silhouette as fallback.
 * Both portrait and landscape orientations fit in the same fixed-height container.
 */
export function LibraryItemPreview({
  type,
  orientation,
  title,
  thumbnailUrl,
  hasThumbnail,
}: LibraryItemPreviewProps) {
  const contentType = type as ContentType;
  const isLandscape = orientation === "landscape";

  // Paper aspect ratios (A4: 210×297mm)
  const paperW = isLandscape ? 141 : 100;
  const paperH = isLandscape ? 100 : 141;

  const containerH = 180;
  const maxW = 200;
  const scaleByH = (containerH - 24) / paperH;
  const scaleByW = (maxW - 24) / paperW;
  const scale = Math.min(scaleByH, scaleByW);
  const displayW = Math.round(paperW * scale);
  const displayH = Math.round(paperH * scale);

  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const showThumbnail = thumbnailUrl && !imgError;

  return (
    <div
      className="relative flex items-center justify-center overflow-hidden rounded-t-lg"
      style={{ height: `${containerH}px` }}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 bg-muted/50" />
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "radial-gradient(circle, currentColor 1px, transparent 1px)",
          backgroundSize: "12px 12px",
        }}
      />

      {/* Paper shape */}
      <div
        className="relative bg-white dark:bg-zinc-100 rounded-sm overflow-hidden"
        style={{
          width: `${displayW}px`,
          height: `${displayH}px`,
          boxShadow:
            "0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)",
        }}
      >
        {showThumbnail ? (
          <>
            {/* Real thumbnail image */}
            {!imgLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
              </div>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbnailUrl}
              alt={title || "Preview"}
              loading="lazy"
              className={`w-full h-full object-cover object-top transition-opacity duration-300 ${
                imgLoaded ? "opacity-100" : "opacity-0"
              }`}
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
            />
          </>
        ) : (
          <>
            {/* Fallback: CSS silhouette */}
            <div
              className="absolute top-0 right-0 w-3 h-3"
              style={{
                background:
                  "linear-gradient(225deg, transparent 50%, rgba(0,0,0,0.03) 50%)",
              }}
            />
            <div className="w-full h-full p-[10%] flex flex-col">
              {contentType === "worksheet" && <WorksheetPattern title={title} />}
              {contentType === "cards" && <CardsPattern />}
              {contentType === "flashcards" && <FlashcardsPattern />}
              {contentType === "grammar-table" && <GrammarTablePattern />}
              {contentType === "ebook" && <EbookPattern title={title} />}
            </div>
          </>
        )}
      </div>

      {/* Type icon badge */}
      <TypeBadge type={contentType} />
    </div>
  );
}

/** Worksheet: header bar + text lines */
function WorksheetPattern({ title }: { title?: string }) {
  return (
    <>
      {/* Header bar */}
      <div className="w-full h-[6%] bg-blue-400/30 rounded-sm mb-[6%]" />
      {/* Title line */}
      <div className="w-[70%] h-[4%] bg-zinc-300/80 rounded-full mb-[5%]" />
      {/* Text lines */}
      <div className="space-y-[6%] flex-1">
        <div className="w-full h-[3%] bg-zinc-200/70 rounded-full" />
        <div className="w-[90%] h-[3%] bg-zinc-200/70 rounded-full" />
        <div className="w-[95%] h-[3%] bg-zinc-200/70 rounded-full" />
        <div className="w-[60%] h-[3%] bg-zinc-200/70 rounded-full" />
        {/* Gap for exercise area */}
        <div className="h-[4%]" />
        <div className="w-[40%] h-[3.5%] bg-blue-300/40 rounded-full" />
        <div className="w-full h-[3%] bg-zinc-200/50 rounded-full" />
        <div className="w-full h-[3%] bg-zinc-200/50 rounded-full" />
        <div className="w-[85%] h-[3%] bg-zinc-200/50 rounded-full" />
      </div>
      {/* Truncated title watermark */}
      {title && (
        <div className="absolute bottom-[8%] left-[10%] right-[10%]">
          <p
            className="text-[6px] text-zinc-400/60 font-medium truncate leading-none"
            aria-hidden
          >
            {title}
          </p>
        </div>
      )}
    </>
  );
}

/** Cards: 2×2 card grid */
function CardsPattern() {
  return (
    <div className="grid grid-cols-2 grid-rows-2 gap-[4%] w-full h-full">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-purple-100/60 border border-purple-200/40 rounded-sm flex flex-col items-center justify-center gap-[6%] p-[6%]"
        >
          <div className="w-[50%] h-[30%] bg-purple-200/50 rounded-sm" />
          <div className="w-[70%] h-[8%] bg-purple-200/40 rounded-full" />
          <div className="w-[50%] h-[8%] bg-purple-200/30 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** Flashcards: 3×3 mini card grid */
function FlashcardsPattern() {
  return (
    <div className="grid grid-cols-3 grid-rows-3 gap-[3%] w-full h-full">
      {Array.from({ length: 9 }).map((_, i) => (
        <div
          key={i}
          className="bg-amber-100/50 border border-amber-200/40 rounded-sm flex items-center justify-center"
        >
          <div className="w-[60%] h-[20%] bg-amber-200/50 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** Grammar table: header row + data rows */
function GrammarTablePattern() {
  return (
    <div className="w-full h-full flex flex-col">
      {/* Table header */}
      <div className="flex gap-[2%] mb-[3%]">
        <div className="flex-1 h-[10%] bg-green-400/30 rounded-sm" />
        <div className="flex-1 h-[10%] bg-green-400/30 rounded-sm" />
        <div className="flex-1 h-[10%] bg-green-400/30 rounded-sm" />
        <div className="flex-1 h-[10%] bg-green-400/30 rounded-sm" />
      </div>
      {/* Table rows */}
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex gap-[2%] mb-[2%]">
          <div className="flex-1 h-[7%] bg-green-100/60 rounded-sm" />
          <div className="flex-1 h-[7%] bg-zinc-100/80 rounded-sm" />
          <div className="flex-1 h-[7%] bg-zinc-100/80 rounded-sm" />
          <div className="flex-1 h-[7%] bg-zinc-100/80 rounded-sm" />
        </div>
      ))}
    </div>
  );
}

/** Ebook: cover-like layout with title area */
function EbookPattern({ title }: { title?: string }) {
  return (
    <>
      {/* Cover band */}
      <div className="w-full h-[20%] bg-gradient-to-b from-rose-200/50 to-rose-100/30 rounded-sm mb-[5%] flex items-end px-[5%] pb-[3%]">
        <div className="w-[60%] h-[25%] bg-rose-300/50 rounded-full" />
      </div>
      {/* Text lines */}
      <div className="space-y-[5%] flex-1">
        <div className="w-full h-[3%] bg-zinc-200/70 rounded-full" />
        <div className="w-[92%] h-[3%] bg-zinc-200/70 rounded-full" />
        <div className="w-[88%] h-[3%] bg-zinc-200/70 rounded-full" />
        <div className="w-full h-[3%] bg-zinc-200/70 rounded-full" />
        <div className="w-[75%] h-[3%] bg-zinc-200/70 rounded-full" />
        <div className="h-[3%]" />
        <div className="w-full h-[3%] bg-zinc-200/50 rounded-full" />
        <div className="w-[90%] h-[3%] bg-zinc-200/50 rounded-full" />
      </div>
      {title && (
        <div className="absolute bottom-[8%] left-[10%] right-[10%]">
          <p
            className="text-[6px] text-zinc-400/60 font-medium truncate leading-none"
            aria-hidden
          >
            {title}
          </p>
        </div>
      )}
    </>
  );
}

/** Small icon badge in the bottom-right corner of the preview */
function TypeBadge({ type }: { type: ContentType }) {
  const config: Record<
    ContentType,
    {
      icon: React.ComponentType<{ className?: string }>;
      bg: string;
    }
  > = {
    worksheet: { icon: FileText, bg: "bg-blue-500" },
    cards: { icon: LayoutGrid, bg: "bg-purple-500" },
    flashcards: { icon: Layers, bg: "bg-amber-500" },
    "grammar-table": { icon: TableProperties, bg: "bg-green-500" },
    ebook: { icon: BookOpen, bg: "bg-rose-500" },
  };

  const { icon: Icon, bg } = config[type] || config.worksheet;

  return (
    <div
      className={`absolute bottom-2 right-2 ${bg} text-white p-1 rounded shadow-sm`}
    >
      <Icon className="h-3 w-3" />
    </div>
  );
}
