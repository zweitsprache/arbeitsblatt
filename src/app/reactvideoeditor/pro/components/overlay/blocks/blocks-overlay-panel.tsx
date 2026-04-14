import React from "react";
import { OverlayType } from "../../../types";
import type { TextOverlay, BlockOverlay } from "../../../types";
import type { TextBlock, TextBlockStyle } from "@/types/worksheet";
import { useEditorContext } from "../../../contexts/editor-context";
import { Button } from "../../ui/button";
import { Label } from "../../ui/label";
import { Separator } from "../../ui/separator";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import { ViewerBlockRenderer } from "@/components/viewer/viewer-block-renderer";
import { normalizeVideoFontFamily } from "../../../utils/text/normalize-video-font-family";

const TEXT_STYLE_OPTIONS: { value: TextBlockStyle; label: string }[] = [
  { value: "standard", label: "Standard" },
  { value: "example", label: "Beispiel" },
  { value: "example-standard", label: "Beispiel (Standard)" },
  { value: "example-improved", label: "Beispiel (Verbessert)" },
  { value: "fragen", label: "Fragen" },
  { value: "hinweis", label: "Hinweis" },
  { value: "hinweis-wichtig", label: "Hinweis (Wichtig)" },
  { value: "hinweis-alarm", label: "Hinweis (Alarm)" },
  { value: "lernziel", label: "Lernziel" },
  { value: "kompetenzziele", label: "Kompetenzziele" },
  { value: "handlungsziele", label: "Handlungsziele" },
  { value: "redemittel", label: "Redemittel" },
];

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

function estimateInitialBlockHeight(contentHtml: string, style: TextBlockStyle): number {
  const plain = stripHtml(contentHtml);
  const paragraphCount = Math.max(1, (contentHtml.match(/<(p|li)\b/gi) || []).length);
  const lineBreakCount = (contentHtml.match(/<br\s*\/?>/gi) || []).length;
  const textLines = Math.max(
    paragraphCount + lineBreakCount,
    Math.ceil(Math.max(plain.length, 1) / 42)
  );

  const lineHeight = 30;
  const verticalPadding =
    style === "lernziel" ||
    style === "hinweis" ||
    style === "hinweis-wichtig" ||
    style === "hinweis-alarm"
      ? 28
      : style === "example" || style === "example-standard" || style === "example-improved"
        ? 24
        : 16;

  const estimated = textLines * lineHeight + verticalPadding;
  return Math.max(72, Math.min(estimated, 260));
}

function resolveTextStyles(style: TextBlockStyle) {
  const styles: Record<TextBlockStyle, { color: string; backgroundColor: string }> = {
    standard: { color: "#1a1a1a", backgroundColor: "transparent" },
    example: { color: "#1f2937", backgroundColor: "#fef3c7" },
    "example-standard": { color: "#1f2937", backgroundColor: "#dbeafe" },
    "example-improved": { color: "#1f2937", backgroundColor: "#d1fae5" },
    fragen: { color: "#8b5cf6", backgroundColor: "transparent" },
    hinweis: { color: "#f59e0b", backgroundColor: "rgba(254, 243, 199, 0.2)" },
    "hinweis-wichtig": { color: "#ef4444", backgroundColor: "rgba(254, 242, 242, 0.2)" },
    "hinweis-alarm": { color: "#dc2626", backgroundColor: "rgba(254, 226, 226, 0.2)" },
    lernziel: { color: "#1a1a1a", backgroundColor: "transparent" },
    kompetenzziele: { color: "#1a1a1a", backgroundColor: "transparent" },
    handlungsziele: { color: "#1a1a1a", backgroundColor: "transparent" },
    redemittel: { color: "#3b82f6", backgroundColor: "transparent" },
    metadaten: { color: "#1a1a1a", backgroundColor: "transparent" },
    rows: { color: "#1a1a1a", backgroundColor: "transparent" },
  };

  return styles[style] || { color: "#1a1a1a", backgroundColor: "transparent" };
}

export function BlocksOverlayPanel() {
  const { addOverlay, overlays, currentFrame, fps, setSelectedOverlayId, selectedOverlayId, changeOverlay, brandSettings } = useEditorContext();

  const selectedOverlay = overlays.find((o) => o.id === selectedOverlayId);
  const isTextOverlay =
    selectedOverlay?.type === OverlayType.BLOCKS ||
    (selectedOverlay?.type === OverlayType.TEXT && !!selectedOverlay.styles.worksheetTextStyle);

  const [newBlockContent, setNewBlockContent] = React.useState("<p>Das ist ein Textblock.</p>");
  const [newBlockStyle, setNewBlockStyle] = React.useState<TextBlockStyle>("standard");
  const measureRef = React.useRef<HTMLDivElement | null>(null);

  const brandFontFamily = React.useMemo(
    () => normalizeVideoFontFamily(brandSettings.bodyFont),
    [brandSettings.bodyFont]
  );

  React.useEffect(() => {
    if (!isTextOverlay || !selectedOverlay) return;
    const textOverlay = selectedOverlay as TextOverlay | BlockOverlay;
    const overlayHtml = textOverlay.styles.worksheetHtml;
    const overlayStyle = textOverlay.styles.worksheetTextStyle as TextBlockStyle | undefined;

    setNewBlockContent(overlayHtml && overlayHtml.length > 0 ? overlayHtml : `<p>${textOverlay.content || ""}</p>`);
    setNewBlockStyle(overlayStyle ?? "standard");
  }, [isTextOverlay, selectedOverlay]);

  const activeBlockOverlay = isTextOverlay && selectedOverlay
    ? (selectedOverlay as TextOverlay | BlockOverlay)
    : null;

  const measuredTextBlock: TextBlock | null = activeBlockOverlay
    ? {
        id: `measure-${activeBlockOverlay.id}`,
        type: "text",
        content: newBlockContent,
        textStyle: newBlockStyle,
        visibility: "both",
      }
    : null;

  React.useLayoutEffect(() => {
    if (!activeBlockOverlay || !measureRef.current) return;

    const nextHeight = Math.max(48, Math.ceil(measureRef.current.getBoundingClientRect().height));
    if (Math.abs(nextHeight - activeBlockOverlay.height) <= 2) {
      return;
    }

    changeOverlay(activeBlockOverlay.id, (overlay) => {
      if (overlay.type !== OverlayType.TEXT && overlay.type !== OverlayType.BLOCKS) {
        return overlay;
      }

      return {
        ...overlay,
        height: nextHeight,
      };
    });
  }, [activeBlockOverlay, newBlockContent, newBlockStyle, brandSettings.bodyFont, brandSettings.primaryColor, changeOverlay]);

  // If a text overlay is selected, show its editor
  if (isTextOverlay && selectedOverlay) {
    const textOverlay = selectedOverlay as TextOverlay;

    // Create a TextBlock representation for preview
    const textBlock: TextBlock = {
      id: `preview-${textOverlay.id}`,
      type: "text",
      content: newBlockContent,
      textStyle: newBlockStyle,
      visibility: "both",
    };

    const handleContentChange = (html: string) => {
      setNewBlockContent(html);
      const plainContent = stripHtml(html) || "(empty)";
      changeOverlay(textOverlay.id, (o) => {
        if (o.type !== OverlayType.TEXT && o.type !== OverlayType.BLOCKS) return o;
        return {
          ...o,
          content: plainContent,
          styles: {
            ...o.styles,
            worksheetHtml: html,
          },
        };
      });
    };

    const handleStyleChange = (style: TextBlockStyle) => {
      setNewBlockStyle(style);
      const { color, backgroundColor } = resolveTextStyles(style);
      changeOverlay(textOverlay.id, (o) => {
        if (o.type !== OverlayType.TEXT && o.type !== OverlayType.BLOCKS) return o;
        return {
          ...o,
          styles: {
            ...o.styles,
            color,
            backgroundColor,
            worksheetTextStyle: style,
            brandPrimaryColor: brandSettings.primaryColor,
          },
        };
      });
    };

    return (
      <div className="space-y-4 p-4">
        <div>
          <h3 className="text-sm font-semibold mb-3">Edit Text Block</h3>
        </div>

        <div>
          <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 block">
            Content
          </Label>
          <RichTextEditor
            content={newBlockContent}
            onChange={handleContentChange}
            placeholder="Text content..."
          />
        </div>

        <Separator />

        <div>
          <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 block">
            Style
          </Label>
          <select
            value={newBlockStyle}
            onChange={(e) => handleStyleChange(e.target.value as TextBlockStyle)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {TEXT_STYLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <Separator />

        <div>
          <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 block">
            Preview
          </Label>
          <div className="border border-slate-200 rounded-md p-4 bg-white">
            <ViewerBlockRenderer
              block={textBlock}
              mode="online"
              primaryColor={brandSettings.primaryColor}
              bodyFont={brandSettings.bodyFont}
            />
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelectedOverlayId(null)}
        >
          Deselect
        </Button>

        {measuredTextBlock && (
          <div
            aria-hidden="true"
            style={{
              position: "fixed",
              left: -20000,
              top: 0,
              width: activeBlockOverlay?.width ?? 1040,
              visibility: "hidden",
              pointerEvents: "none",
              zIndex: -1,
              background: "white",
            }}
          >
            <div ref={measureRef}>
              <ViewerBlockRenderer
                block={measuredTextBlock}
                mode="online"
                primaryColor={brandSettings.primaryColor}
                bodyFont={brandSettings.bodyFont}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // No text overlay selected - show "add" panel
  return (
    <div className="space-y-4 p-4">
      <div>
        <h3 className="text-sm font-semibold mb-3">Text Blocks</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Click to add a text block to the timeline, then select it to edit.
        </p>
      </div>

      <Button
        onClick={() => {
          const newId = overlays.reduce((max, overlay) => Math.max(max, overlay.id), 0) + 1;
          const { color, backgroundColor } = resolveTextStyles(newBlockStyle);
          const plainContent = stripHtml(newBlockContent) || "(empty text block)";
          const overlayHeight = estimateInitialBlockHeight(newBlockContent, newBlockStyle);

          const overlay: BlockOverlay = {
            id: newId,
            type: OverlayType.BLOCKS,
            content: plainContent,
            from: currentFrame,
            durationInFrames: Math.max(1, Math.round(fps * 4)),
            row: 0,
            left: 120,
            top: 220,
            width: 1040,
            height: overlayHeight,
            rotation: 0,
            isDragging: false,
            styles: {
              fontSize: "1.45rem",
              fontWeight: "400",
              color,
              backgroundColor,
              fontFamily: brandFontFamily,
              fontStyle: "normal",
              textDecoration: "none",
              lineHeight: "1.35",
              textAlign: "left",
              opacity: 1,
              zIndex: 4,
              transform: "none",
              worksheetHtml: newBlockContent,
              worksheetTextStyle: newBlockStyle,
              brandPrimaryColor: brandSettings.primaryColor,
            },
          };

          addOverlay(overlay);
          setSelectedOverlayId(newId);
        }}
        className="w-full"
      >
        Add Text Block
      </Button>
    </div>
  );
}
