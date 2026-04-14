import { Overlay, OverlayType } from "@/app/reactvideoeditor/pro/types";
import { WorksheetBlock } from "@/types/worksheet";

type MapperOptions = {
  fps?: number;
  headingSeconds?: number;
  textSeconds?: number;
  imageSeconds?: number;
};

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

export function worksheetBlocksToRveOverlays(
  blocks: WorksheetBlock[],
  options: MapperOptions = {}
): Overlay[] {
  const fps = options.fps ?? 30;
  const headingFrames = Math.max(1, Math.round((options.headingSeconds ?? 3) * fps));
  const textFrames = Math.max(1, Math.round((options.textSeconds ?? 4) * fps));
  const imageFrames = Math.max(1, Math.round((options.imageSeconds ?? 5) * fps));

  const overlays: Overlay[] = [];
  let id = 1;
  let cursorFrom = 0;

  for (const block of blocks) {
    if (block.type === "page-break") {
      continue;
    }

    if (block.type === "heading") {
      overlays.push({
        id: id++,
        type: OverlayType.TEXT,
        content: block.content,
        from: cursorFrom,
        durationInFrames: headingFrames,
        row: 0,
        left: 120,
        top: 96,
        width: 1040,
        height: 100,
        rotation: 0,
        isDragging: false,
        styles: {
          fontSize: block.level === 1 ? "3rem" : block.level === 2 ? "2.4rem" : "2rem",
          fontWeight: "700",
          color: "#FFFFFF",
          backgroundColor: "",
          fontFamily: "font-league-spartan",
          fontStyle: "normal",
          textDecoration: "none",
          lineHeight: "1.15",
          textAlign: "left",
          opacity: 1,
          zIndex: 5,
          transform: "none",
        },
      });
      cursorFrom += headingFrames;
      continue;
    }

    if (block.type === "text") {
      const content = stripHtml(block.content);
      if (!content) {
        continue;
      }

      overlays.push({
        id: id++,
        type: OverlayType.TEXT,
        content,
        from: cursorFrom,
        durationInFrames: textFrames,
        row: 0,
        left: 120,
        top: 220,
        width: 1040,
        height: 260,
        rotation: 0,
        isDragging: false,
        styles: {
          fontSize: "1.45rem",
          fontWeight: "400",
          color: "#F5F5F5",
          backgroundColor: "",
          fontFamily: "font-asap-condensed",
          fontStyle: "normal",
          textDecoration: "none",
          lineHeight: "1.35",
          textAlign: "left",
          opacity: 1,
          zIndex: 4,
          transform: "none",
        },
      });
      cursorFrom += textFrames;
      continue;
    }

    if (block.type === "image" && block.src) {
      overlays.push({
        id: id++,
        type: OverlayType.IMAGE,
        src: block.src,
        content: block.alt || block.caption || "Worksheet image",
        from: cursorFrom,
        durationInFrames: imageFrames,
        row: 1,
        left: 80,
        top: 80,
        width: 1120,
        height: 560,
        rotation: 0,
        isDragging: false,
        styles: {
          opacity: 1,
          zIndex: 2,
          transform: "none",
          objectFit: "contain",
          borderRadius: "16px",
        },
      });
      cursorFrom += imageFrames;
    }
  }

  return overlays;
}
