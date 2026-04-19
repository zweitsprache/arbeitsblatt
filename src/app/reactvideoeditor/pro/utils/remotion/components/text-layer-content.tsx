import React, { useMemo } from "react";
import { useCurrentFrame } from "remotion";
import type { FontInfo } from "@remotion/google-fonts";
import {
  ArrowRight,
  CircleArrowRight,
  BadgeAlert,
  CircleHelp,
  Flag,
  Goal,
  MessageCircle,
  Siren,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { TextOverlay, BlockOverlay } from "../../../types";
import { animationTemplates } from "../../../templates/animation-templates";
import { getAnimationKey } from "../../../adaptors/default-animation-adaptors";
import { useLoadFontFromTextItem } from "../../text/load-font-from-text-item";
import { normalizeVideoFontFamily } from "../../text/normalize-video-font-family";
import {
  extractWorksheetRows,
  normalizeWorksheetItemTimings,
} from "../../../../../../lib/worksheet-row-timing";

interface TextLayerContentProps {
  overlay: TextOverlay | BlockOverlay;
  fontInfos?: Record<string, FontInfo>;
}

export const TextLayerContent: React.FC<TextLayerContentProps> = ({
  overlay,
  fontInfos,
}) => {
  const frame = useCurrentFrame();
  
  // Get font family - handle legacy Tailwind classes for backward compatibility
  const getFontFamily = (): string => {
    const fontValue = overlay.styles.fontFamily;
    
    // Handle legacy Tailwind font classes for backward compatibility
    if (fontValue?.startsWith('font-')) {
      switch (fontValue) {
        case "font-sans":
          return "Inter";
        case "font-serif":
          return "Merriweather";
        case "font-mono":
          return "Roboto Mono";
        case "font-retro":
          return "VT323";
        case "font-league-spartan":
          return "League Spartan";
        case "font-bungee-inline":
          return "Bungee Inline";
        default:
          return "Inter"; // Default fallback for unknown Tailwind classes
      }
    }
    
    // If it's not a Tailwind class, it's already a font family name
    return normalizeVideoFontFamily(fontValue || "Inter");
  };

  const fontFamily = getFontFamily();
  const fontWeight = String(overlay.styles.fontWeight || '400');
  const fontStyle = (overlay.styles.fontStyle || 'normal') as 'normal' | 'italic';
  
  // Use the proper font loading hook
  // During rendering, fontInfos will be provided and fontInfo will be extracted from it
  // In editor, fontInfos will be undefined and font will be fetched from API
  const fontInfo = fontInfos?.[fontFamily] || null;
  useLoadFontFromTextItem({
    fontFamily: fontFamily,
    fontWeight: fontWeight,
    fontStyle: fontStyle,
    fontInfosDuringRendering: fontInfo,
  });

  // Calculate if we're in the exit phase (last 30 frames)
  const isExitPhase = frame >= overlay.durationInFrames - 30;

  // Apply enter animation only during entry phase
  const enterAnimation =
    !isExitPhase && overlay.styles.animation?.enter
      ? animationTemplates[getAnimationKey(overlay.styles.animation.enter)]?.enter(
          frame,
          overlay.durationInFrames
        )
      : {};

  // Apply exit animation only during exit phase
  const exitAnimation =
    isExitPhase && overlay.styles.animation?.exit
      ? animationTemplates[getAnimationKey(overlay.styles.animation.exit)]?.exit(
          frame,
          overlay.durationInFrames
        )
      : {};

  const worksheetTextStyle = overlay.styles.worksheetTextStyle;
  const worksheetHtml = overlay.styles.worksheetHtml;
  const isWhiteLikeColor = (value?: string): boolean => {
    if (!value) return false;
    const normalized = value.trim().toLowerCase();
    return (
      normalized === "white" ||
      normalized === "#fff" ||
      normalized === "#ffffff" ||
      normalized === "rgb(255,255,255)" ||
      normalized === "rgb(255, 255, 255)"
    );
  };

  const worksheetDefaultTextColors: Record<string, string> = {
    standard: "#1a1a1a",
    metadaten: "#1a1a1a",
    rows: "#1a1a1a",
    fragen: "#1a1a1a",
    redemittel: "#1a1a1a",
    kompetenzziele: "#1a1a1a",
    handlungsziele: "#1a1a1a",
    lernziel: "#1a1a1a",
    hinweis: "#475569",
    "hinweis-wichtig": "#0369a1",
    "hinweis-alarm": "#990033",
    example: "#475569",
    "example-standard": "#990033",
    "example-improved": "#3A4F40",
  };

  const worksheetResolvedTextColor = (() => {
    const styleKey = worksheetTextStyle || "standard";
    const defaultColor = worksheetDefaultTextColors[styleKey] || "#1a1a1a";
    const currentColor = overlay.styles.color;

    if (!currentColor || currentColor === "transparent" || isWhiteLikeColor(currentColor)) {
      return defaultColor;
    }

    return currentColor;
  })();

  const hasBorderedWorksheetStyle =
    Boolean(worksheetHtml) &&
    (
      worksheetTextStyle === "lernziel" ||
      worksheetTextStyle === "hinweis" ||
      worksheetTextStyle === "hinweis-wichtig" ||
      worksheetTextStyle === "hinweis-alarm" ||
      worksheetTextStyle === "example" ||
      worksheetTextStyle === "example-standard" ||
      worksheetTextStyle === "example-improved" ||
      worksheetTextStyle === "rows" ||
      worksheetTextStyle === "kompetenzziele" ||
      worksheetTextStyle === "handlungsziele" ||
      worksheetTextStyle === "fragen" ||
      worksheetTextStyle === "redemittel"
    );
  const worksheetVerticalInsetPx = hasBorderedWorksheetStyle ? 1 : 0;

  const isWorksheetRowsStyle =
    worksheetTextStyle === "rows" ||
    worksheetTextStyle === "kompetenzziele" ||
    worksheetTextStyle === "handlungsziele" ||
    worksheetTextStyle === "fragen" ||
    worksheetTextStyle === "redemittel";

  // Memoize font size calculation for performance during resizing
  const fontSize = useMemo(() => {
    const plainForSizing = (overlay.content || "").trim();
    const lines = plainForSizing.split("\n");
    const numLines = lines.length;
    const maxLineLength = Math.max(...lines.map((line) => line.length));
    
    // If no content, return a reasonable default based on container size
    if (!plainForSizing || maxLineLength === 0) {
      return Math.min(48, overlay.height * 0.6);
    }
    
    // Extract actual padding from styles and convert to pixels
    const extractPadding = (paddingStr: string | undefined) => {
      if (!paddingStr) return { vertical: 0, horizontal: 0 };
      
      // Handle different padding formats: "24px", "24px 48px", "24px 48px 24px 48px"
      const values = paddingStr.split(' ').map(v => {
        if (v.endsWith('px')) return parseInt(v);
        if (v.endsWith('em')) return parseInt(v) * 16; // Rough conversion
        return 0;
      });
      
      if (values.length === 1) {
        // Same padding all around: "24px"
        return { vertical: values[0] * 2, horizontal: values[0] * 2 };
      } else if (values.length === 2) {
        // Vertical and horizontal: "24px 48px"
        return { vertical: values[0] * 2, horizontal: values[1] * 2 };
      } else if (values.length === 4) {
        // Top, right, bottom, left: "24px 48px 24px 48px"
        return { vertical: values[0] + values[2], horizontal: values[1] + values[3] };
      }
      return { vertical: values[0] * 2, horizontal: values[0] * 2 }; // fallback
    };
    
    const padding = extractPadding(overlay.styles.padding);
    const actualPaddingVertical = padding.vertical;
    const actualPaddingHorizontal = padding.horizontal;
    
    // Account for borders too
    const borderWidth = overlay.styles.border ? 2 : 0; // Rough estimate for border
    
    const lineHeightFactor = parseFloat(overlay.styles.lineHeight || "1.2");
    
    // Calculate available space accounting for actual padding and borders
    const availableWidth = Math.max(20, overlay.width - actualPaddingHorizontal - (borderWidth * 2));
    const availableHeight = Math.max(20, overlay.height - actualPaddingVertical - (borderWidth * 2));
    
    // Height-based calculation (primary constraint)
    const heightBasedSize = (availableHeight / numLines) / lineHeightFactor;
    
    // Width-based calculation with more realistic character width
    // Use a more generous character width ratio for better scaling
    const avgCharWidthRatio = 0.5; // Less conservative
    const widthBasedSize = availableWidth / (maxLineLength * avgCharWidthRatio);
    
    // Use the more restrictive constraint
    let calculatedSize = Math.min(heightBasedSize, widthBasedSize);
    
    // Apply minimal safety margin - users can resize if needed
    calculatedSize *= 0.95; // Only 5% safety margin
    
    // Gentler penalties for challenging text layouts
    if (maxLineLength > 40) {
      calculatedSize *= Math.max(0.85, 1 - (maxLineLength - 40) / 200);
    }
    
    if (numLines > 4) {
      calculatedSize *= Math.max(0.9, 1 - (numLines - 4) * 0.02);
    }
    
    // Only apply small container penalty for very tiny containers
    if (overlay.width < 60 || overlay.height < 20) {
      calculatedSize *= 0.9;
    }
    
    // Set more generous bounds
    const minSize = Math.max(8, Math.min(16, overlay.height * 0.1));
    const maxSize = Math.min(
      overlay.height * 0.8,  // Much more generous - 80% of height
      overlay.width * 0.15,  // More generous width ratio
      200 // Higher absolute maximum
    );
    
    const finalSize = Math.max(minSize, Math.min(calculatedSize, maxSize));
    
    // Apply font size scale factor if provided
    const fontSizeScale = overlay.styles.fontSizeScale || 1;
    return finalSize * fontSizeScale;
  }, [overlay.width, overlay.height, overlay.content, overlay.styles.padding, overlay.styles.border, overlay.styles.lineHeight, overlay.styles.fontSizeScale]);

  const containerStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center", // Center vertically
    textAlign: overlay.styles.textAlign,
    justifyContent:
      overlay.styles.textAlign === "center"
        ? "center"
        : overlay.styles.textAlign === "right"
        ? "flex-end"
        : "flex-start",
    overflow: hasBorderedWorksheetStyle ? "visible" : "hidden",
    paddingTop: worksheetVerticalInsetPx,
    paddingBottom: worksheetVerticalInsetPx,
    boxSizing: "border-box",
    position: "relative",
    userSelect: "none", // Prevent text selection during overlay interactions
    WebkitUserSelect: "none", // Safari support
    ...(isExitPhase ? exitAnimation : enterAnimation),
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { fontSize: _templateFontSize, ...restStyles } = overlay.styles;

  const useWorksheetSizing = Boolean(worksheetHtml);

  const textStyle: React.CSSProperties = {
    ...restStyles,
    animation: undefined,
    fontSize: useWorksheetSizing ? (overlay.styles.fontSize || "1.45rem") : `${fontSize}px`,
    fontFamily: fontFamily, // Use original font name, not loadedFontFamily
    maxWidth: "100%",
    maxHeight: "100%",
    wordWrap: "break-word",
    whiteSpace: "pre-wrap",
    lineHeight: overlay.styles.lineHeight || "1.2",
    // Only add default padding if template doesn't have padding
    padding: overlay.styles.padding || "0.1em",
    overflow: "hidden",
    textOverflow: "ellipsis",
    boxSizing: "border-box",
    userSelect: "none", // Prevent text selection during overlay interactions
    WebkitUserSelect: "none", // Safari support
    ...(isExitPhase ? exitAnimation : enterAnimation),
  };

  const worksheetTextContentStyle: React.CSSProperties = {
    ...textStyle,
    padding: 0,
    color: worksheetResolvedTextColor,
    backgroundColor: "transparent",
    overflow: "visible",
    textOverflow: "clip",
  };

  const worksheetShellStyle: React.CSSProperties = {
    width: "100%",
    maxHeight: "100%",
    overflow: "hidden",
    boxSizing: "border-box",
    borderRadius: "8px",
    padding: "0.5rem 0.75rem",
  };

  if (worksheetTextStyle === "lernziel") {
    // Handled by dedicated structure below.
  } else if (worksheetTextStyle === "hinweis") {
    worksheetShellStyle.backgroundColor = "#fffbeb";
    worksheetShellStyle.border = "2px solid #f59e0b";
  } else if (worksheetTextStyle === "hinweis-wichtig") {
    worksheetShellStyle.backgroundColor = "#fff7ed";
    worksheetShellStyle.border = "2px solid #f97316";
  } else if (worksheetTextStyle === "hinweis-alarm") {
    worksheetShellStyle.backgroundColor = "#fef2f2";
    worksheetShellStyle.border = "2px solid #ef4444";
  } else if (worksheetTextStyle === "lernziel") {
    worksheetShellStyle.backgroundColor = "#eff6ff";
    worksheetShellStyle.border = "1px solid #bfdbfe";
  } else if (worksheetTextStyle === "kompetenzziele") {
    worksheetShellStyle.backgroundColor = "#f5f3ff";
    worksheetShellStyle.border = "1px solid #ddd6fe";
  } else if (worksheetTextStyle === "handlungsziele") {
    worksheetShellStyle.backgroundColor = "#ecfeff";
    worksheetShellStyle.border = "1px solid #a5f3fc";
  } else if (worksheetTextStyle === "example" || worksheetTextStyle === "example-standard" || worksheetTextStyle === "example-improved") {
    worksheetShellStyle.backgroundColor = "#f8fafc";
    worksheetShellStyle.border = "1px solid #e2e8f0";
  }

  const sanitizeHtml = (html: string): string => {
    return html
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
      .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, "")
      .replace(/\son\w+\s*=\s*(["']).*?\1/gi, "");
  };

  const normalizeWorksheetHtmlSpacing = (html: string): string => {
    const setZeroMargin = (tag: "p" | "ul" | "ol" | "li") => {
      const regex = new RegExp(`<${tag}([^>]*)>`, "gi");
      return (input: string) =>
        input.replace(regex, (_match, attrs: string) => {
          const styleMatch = attrs.match(/\sstyle\s*=\s*(["'])(.*?)\1/i);

          if (styleMatch) {
            const quote = styleMatch[1];
            const existing = styleMatch[2];
            const normalized = /(^|;)\s*margin\s*:/i.test(existing)
              ? existing
              : `${existing}${existing.trim().endsWith(";") || existing.trim().length === 0 ? "" : ";"}margin:0;`;
            return `<${tag}${attrs.replace(styleMatch[0], ` style=${quote}${normalized}${quote}`)}>`;
          }

          return `<${tag}${attrs} style="margin:0;">`;
        });
    };

    return [setZeroMargin("p"), setZeroMargin("ul"), setZeroMargin("ol"), setZeroMargin("li")].reduce(
      (acc, fn) => fn(acc),
      html
    );
  };

  const renderRowsIcon = () => {
    if (worksheetTextStyle === "kompetenzziele") {
      return <Goal size={18} strokeWidth={2.2} />;
    }
    if (worksheetTextStyle === "handlungsziele") {
      return <CircleArrowRight size={18} strokeWidth={2.2} />;
    }
    if (worksheetTextStyle === "fragen") {
      return <CircleHelp size={18} strokeWidth={2.3} />;
    }
    if (worksheetTextStyle === "redemittel") {
      return <MessageCircle size={18} strokeWidth={2.3} />;
    }

    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14" />
        <path d="m12 5 7 7-7 7" />
      </svg>
    );
  };

  // Procedural behaviors keyed off animation.enter for text-only effects
  const enterKey = overlay.styles.animation?.enter;
  const content = overlay.content || "Enter text...";
  let renderedContent: React.ReactNode = content;

  if (enterKey === 'typing') {
    const charDelay = 2; // frames per char
    const speed = 0.5; // multiplier
    const visibleCount = Math.min(
      content.length,
      Math.floor((frame * speed) / Math.max(1, charDelay))
    );
    renderedContent = content.slice(0, visibleCount);
  } 

  const htmlToRender = worksheetHtml
    ? normalizeWorksheetHtmlSpacing(sanitizeHtml(worksheetHtml))
    : "";

  const worksheetPrimary =
    overlay.styles.brandPrimaryColor ||
    (overlay.styles.color && overlay.styles.color !== "transparent" ? overlay.styles.color : "#1a1a1a");

  if (htmlToRender && worksheetTextStyle === "metadaten") {
    return (
      <div style={{ ...containerStyle, alignItems: "flex-start" }}>
        <div style={{ ...worksheetTextContentStyle, marginBottom: "-1.5rem", color: worksheetPrimary }} dangerouslySetInnerHTML={{ __html: htmlToRender }} />
      </div>
    );
  }

  if (htmlToRender && (!worksheetTextStyle || worksheetTextStyle === "standard")) {
    return (
      <div style={{ ...containerStyle, alignItems: "flex-start" }}>
        <div style={{ ...worksheetTextContentStyle, width: "100%" }} dangerouslySetInnerHTML={{ __html: htmlToRender }} />
      </div>
    );
  }

  if (htmlToRender && isWorksheetRowsStyle) {
    const rows = extractWorksheetRows(htmlToRender);
    const rowTimings = normalizeWorksheetItemTimings(overlay.styles.worksheetItemTimings, rows.length);
    const visibleRows = rows
      .map((rowHtml, rowIndex) => {
        const startRatio = rowTimings[rowIndex]?.startRatio ?? 0;
        const endRatio = rowTimings[rowIndex]?.endRatio ?? 1;
        const totalFrames = Math.max(1, overlay.durationInFrames);
        const startFrame = Math.round(startRatio * totalFrames);
        const endFrame = Math.max(startFrame + 1, Math.round(endRatio * totalFrames));

        // Rows are cumulative: after start they stay visible.
        if (frame < startFrame) {
          return null;
        }

        // Keep row entrance snappy: do not stretch animation across long row segments.
        const segmentFrames = Math.max(1, endFrame - startFrame);
        const revealDuration = Math.max(4, Math.min(12, segmentFrames));
        const rawReveal = Math.max(0, Math.min(1, (frame - startFrame) / revealDuration));
        const revealProgress = 1 - Math.pow(1 - rawReveal, 3);

        return {
          rowHtml,
          rowIndex,
          revealProgress,
        };
      })
      .filter((row): row is { rowHtml: string; rowIndex: number; revealProgress: number } => row !== null);

    return (
      <div style={{ ...containerStyle, alignItems: "flex-start" }}>
        <div style={{ width: "100%" }}>
          {visibleRows.map((row, visibleIndex) => (
            <div
              key={`${overlay.id}-row-${row.rowIndex}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.375rem 0",
                lineHeight: "1.35em",
                borderBottom: "1px solid #d1d5db",
                ...(visibleIndex === 0 ? { borderTop: "1px solid #d1d5db" } : {}),
                opacity: row.revealProgress,
                transform: `translateY(${(1 - row.revealProgress) * 6}px)`,
              }}
            >
              <div
                style={{
                  width: 20,
                  minWidth: 20,
                  height: 20,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: worksheetPrimary,
                }}
              >
                {renderRowsIcon()}
              </div>
              <div
                style={{
                  ...worksheetTextContentStyle,
                  flex: 1,
                  minWidth: 0,
                }}
                dangerouslySetInnerHTML={{ __html: row.rowHtml }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (htmlToRender && worksheetTextStyle === "lernziel") {
    return (
      <div style={containerStyle}>
        <div
          style={{
            width: "100%",
            display: "flex",
            border: `1px solid ${worksheetPrimary}`,
            borderRadius: 5,
            overflow: "hidden",
            fontWeight: 600,
            color: worksheetPrimary,
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              width: 32,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: worksheetPrimary,
              color: "#fff",
            }}
          >
            <Flag size={14} />
          </div>
          <div
            style={{
              flex: 1,
              minWidth: 0,
              padding: "0.5rem 1rem",
              backgroundColor: `${worksheetPrimary}14`,
            }}
          >
            <div style={worksheetTextContentStyle} dangerouslySetInnerHTML={{ __html: htmlToRender }} />
          </div>
        </div>
      </div>
    );
  }

  if (htmlToRender && (worksheetTextStyle === "hinweis" || worksheetTextStyle === "hinweis-wichtig" || worksheetTextStyle === "hinweis-alarm")) {
    const cfg =
      worksheetTextStyle === "hinweis-alarm"
        ? { border: "#990033", bg: "#99003308", icon: <Siren className="h-5 w-5" style={{ color: "#990033" }} /> }
        : worksheetTextStyle === "hinweis-wichtig"
          ? { border: "#0369a1", bg: "#0369a108", icon: <BadgeAlert className="h-5 w-5" style={{ color: "#0369a1" }} /> }
          : { border: "#475569", bg: "#47556908", icon: <ArrowRight className="h-5 w-5" style={{ color: "#475569" }} /> };

    return (
      <div style={containerStyle}>
        <div
          style={{
            width: "100%",
            display: "flex",
            border: `1px solid ${cfg.border}`,
            borderRadius: 4,
            background: cfg.bg,
            color: cfg.border,
          }}
        >
          <div
            style={{
              flexShrink: 0,
              width: "2.75rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-start",
              paddingLeft: "1.5rem",
            }}
          >
            {cfg.icon}
          </div>
          <div
            style={{
              flex: 1,
              minWidth: 0,
              padding: "0.5rem 0.75rem 0.5rem 0.7rem",
            }}
          >
            <div style={worksheetTextContentStyle} dangerouslySetInnerHTML={{ __html: htmlToRender }} />
          </div>
        </div>
      </div>
    );
  }

  if (htmlToRender && worksheetTextStyle === "example") {
    return (
      <div style={containerStyle}>
        <div
          style={{
            width: "100%",
            border: "1px dashed #475569",
            borderRadius: 5,
            background: "#fff",
            color: "#475569",
            padding: "0.5rem 1rem",
          }}
        >
          <div style={worksheetTextContentStyle} dangerouslySetInnerHTML={{ __html: htmlToRender }} />
        </div>
      </div>
    );
  }

  if (htmlToRender && (worksheetTextStyle === "example-standard" || worksheetTextStyle === "example-improved")) {
    const cfg =
      worksheetTextStyle === "example-standard"
        ? { color: "#990033", iconBg: "#990033", icon: <ThumbsDown className="h-4 w-4" /> }
        : { color: "#3A4F40", iconBg: "#3A4F40", icon: <ThumbsUp className="h-4 w-4" /> };

    return (
      <div style={containerStyle}>
        <div style={{ width: "100%", display: "flex", alignItems: "stretch", color: cfg.color }}>
          <div
            aria-hidden="true"
            style={{
              flexShrink: 0,
              width: "2rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              background: cfg.iconBg,
              borderRadius: "5px 0 0 5px",
            }}
          >
            {cfg.icon}
          </div>
          <div
            style={{
              flex: 1,
              minWidth: 0,
              border: "1px dashed currentColor",
              borderLeft: 0,
              borderRadius: "0 5px 5px 0",
              padding: "0.5rem 0.75rem 0.5rem 1.5rem",
              background: "#fff",
            }}
          >
            <div style={worksheetTextContentStyle} dangerouslySetInnerHTML={{ __html: htmlToRender }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {htmlToRender ? (
        <div style={worksheetShellStyle}>
          <div style={worksheetTextContentStyle} dangerouslySetInnerHTML={{ __html: htmlToRender }} />
        </div>
      ) : (
        <div style={textStyle}>{renderedContent}</div>
      )}
    </div>
  );
}; 