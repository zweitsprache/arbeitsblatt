"use client";

import React from "react";

type Token =
  | { type: "space"; value: string }
  | { type: "text"; value: string }
  | { type: "syllable"; value: string; key: string };

interface SyllableArc {
  key: string;
  startX: number;
  endX: number;
  y: number;
  depth: number;
  strokeWidth: number;
}

const WIDE_END_LETTERS = new Set(["m", "M", "v", "V", "w", "W"]);

function pushTextToken(tokens: Token[], value: string) {
  if (!value) return;
  tokens.push({ type: "text", value });
}

function splitSyllablePart(part: string): { leading: string; core: string; trailing: string } {
  const match = part.match(/^(?<leading>[^\p{L}\p{M}]*)((?<core>[\p{L}\p{M}]+(?:[\u2019'\-][\p{L}\p{M}]+)*)?)(?<trailing>[^\p{L}\p{M}]*)$/u);

  return {
    leading: match?.groups?.leading ?? "",
    core: match?.groups?.core ?? "",
    trailing: match?.groups?.trailing ?? "",
  };
}

function tokenizeSyllables(content: string): Token[] {
  const chunks = content.split(/(\s+)/);
  const tokens: Token[] = [];
  let syllableIndex = 0;

  for (const chunk of chunks) {
    if (!chunk) continue;
    if (/^\s+$/.test(chunk)) {
      tokens.push({ type: "space", value: chunk });
      continue;
    }

    const parts = chunk.split("%%");
    if (parts.length === 1) {
      pushTextToken(tokens, chunk);
      continue;
    }

    for (const part of parts) {
      if (!part) continue;
      const { leading, core, trailing } = splitSyllablePart(part);

      if (!core) {
        pushTextToken(tokens, part);
        continue;
      }

      pushTextToken(tokens, leading);

      tokens.push({ type: "syllable", value: core, key: `syllable-${syllableIndex}` });
      syllableIndex += 1;

      pushTextToken(tokens, trailing);
    }
  }

  return tokens;
}

function buildArcPath(startX: number, endX: number, y: number, depth: number): string {
  const width = endX - startX;
  const controlOffset = width * 0.22;

  return [
    `M ${startX} ${y}`,
    `C ${startX + controlOffset} ${y + depth}`,
    `${endX - controlOffset} ${y + depth}`,
    `${endX} ${y}`,
  ].join(" ");
}

export function SyllablesDisplay({
  content,
  className,
  textClassName,
  arcColor = "currentColor",
}: {
  content: string;
  className?: string;
  textClassName?: string;
  arcColor?: string;
}) {
  const tokens = React.useMemo(() => tokenizeSyllables(content), [content]);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const syllableRefs = React.useRef(new Map<string, HTMLSpanElement>());
  const firstLetterRefs = React.useRef(new Map<string, HTMLSpanElement>());
  const lastLetterRefs = React.useRef(new Map<string, HTMLSpanElement>());
  const [arcs, setArcs] = React.useState<SyllableArc[]>([]);
  const [svgMetrics, setSvgMetrics] = React.useState({ width: 0, height: 12, paddingBottom: 12 });
  const animationFrameRef = React.useRef<number | null>(null);

  const setSyllableRef = React.useCallback((key: string, element: HTMLSpanElement | null) => {
    if (element) {
      syllableRefs.current.set(key, element);
      return;
    }

    syllableRefs.current.delete(key);
  }, []);

  const setFirstLetterRef = React.useCallback((key: string, element: HTMLSpanElement | null) => {
    if (element) {
      firstLetterRefs.current.set(key, element);
      return;
    }

    firstLetterRefs.current.delete(key);
  }, []);

  const setLastLetterRef = React.useCallback((key: string, element: HTMLSpanElement | null) => {
    if (element) {
      lastLetterRefs.current.set(key, element);
      return;
    }

    lastLetterRefs.current.delete(key);
  }, []);

  const measure = React.useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const nextArcs: SyllableArc[] = [];
    let maxBottom = 0;

    tokens.forEach((token) => {
      if (token.type !== "syllable") return;

      const syllableEl = syllableRefs.current.get(token.key);
      const firstLetterEl = firstLetterRefs.current.get(token.key);
      const lastLetterEl = lastLetterRefs.current.get(token.key);
      if (!syllableEl || !firstLetterEl || !lastLetterEl) return;

      const syllableHeight = syllableEl.offsetHeight;
      const lastChar = token.value.slice(-1);
      const baselineOffset = Math.max(2, Math.min(8, syllableHeight * 0.12));
      const depth = Math.max(6, Math.min(18, syllableHeight * 0.34));
      const strokeWidth = Math.max(1.25, Math.min(2.5, syllableHeight * 0.06));
      const startX = firstLetterEl.offsetLeft + firstLetterEl.offsetWidth / 2;
      const endX = token.value.length === 1
        ? startX
        : lastLetterEl.offsetLeft + lastLetterEl.offsetWidth * (WIDE_END_LETTERS.has(lastChar) ? 0.75 : 0.5);
      const y = syllableEl.offsetTop + syllableHeight + baselineOffset;

      nextArcs.push({ key: token.key, startX, endX, y, depth, strokeWidth });
      maxBottom = Math.max(maxBottom, y + depth + strokeWidth);
    });

    setArcs(nextArcs);
    setSvgMetrics({
      width: Math.ceil(container.offsetWidth),
      height: Math.ceil(maxBottom),
      paddingBottom: nextArcs.length > 0 ? Math.max(0, Math.ceil(maxBottom - container.offsetHeight)) : 0,
    });
  }, [tokens]);

  const scheduleMeasure = React.useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      animationFrameRef.current = null;
      measure();
    });
  }, [measure]);

  React.useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    measure();

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(container);
    syllableRefs.current.forEach((element) => resizeObserver.observe(element));
    firstLetterRefs.current.forEach((element) => resizeObserver.observe(element));
    lastLetterRefs.current.forEach((element) => resizeObserver.observe(element));
    window.addEventListener("resize", scheduleMeasure);

    const handleBeforePrint = () => {
      scheduleMeasure();
      requestAnimationFrame(measure);
    };

    window.addEventListener("beforeprint", handleBeforePrint);

    const mediaQuery = typeof window.matchMedia === "function" ? window.matchMedia("print") : null;
    const handlePrintMediaChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        scheduleMeasure();
        return;
      }

      requestAnimationFrame(measure);
    };

    mediaQuery?.addEventListener?.("change", handlePrintMediaChange);

    const fonts = document.fonts;
    const handleFontsDone = () => {
      scheduleMeasure();
    };

    fonts?.ready.then(() => {
      handleFontsDone();
    }).catch(() => {
      // Ignore font readiness failures and keep the last valid measurement.
    });
    fonts?.addEventListener?.("loadingdone", handleFontsDone);
    fonts?.addEventListener?.("loadingerror", handleFontsDone);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.removeEventListener("resize", scheduleMeasure);
      window.removeEventListener("beforeprint", handleBeforePrint);
      mediaQuery?.removeEventListener?.("change", handlePrintMediaChange);
      fonts?.removeEventListener?.("loadingdone", handleFontsDone);
      fonts?.removeEventListener?.("loadingerror", handleFontsDone);
      resizeObserver.disconnect();
    };
  }, [measure, scheduleMeasure]);

  return (
    <div className={className} style={{ display: "inline-block" }}>
      <div
        ref={containerRef}
        className={textClassName}
        style={{
          position: "relative",
          display: "inline-block",
          lineHeight: 1.2,
          whiteSpace: "pre-wrap",
          paddingBottom: svgMetrics.paddingBottom,
        }}
      >
        {tokens.map((token, index) => {
          if (token.type === "space") {
            return <span key={`space-${index}`}>{token.value}</span>;
          }

          if (token.type === "text") {
            return <span key={`text-${index}`}>{token.value}</span>;
          }

          return (
            <span key={token.key} ref={(element) => setSyllableRef(token.key, element)}>
              <span ref={(element) => setFirstLetterRef(token.key, element)}>{token.value.slice(0, 1)}</span>
              {token.value.length > 2 ? token.value.slice(1, -1) : null}
              {token.value.length > 1 ? (
                <span ref={(element) => setLastLetterRef(token.key, element)}>{token.value.slice(-1)}</span>
              ) : (
                <span
                  ref={(element) => setLastLetterRef(token.key, element)}
                  aria-hidden="true"
                  style={{ display: "inline-block", width: 0, overflow: "hidden" }}
                />
              )}
            </span>
          );
        })}

        {arcs.length > 0 && svgMetrics.width > 0 && svgMetrics.height > 0 ? (
          <svg
            aria-hidden="true"
            width={svgMetrics.width}
            height={svgMetrics.height}
            viewBox={`0 0 ${svgMetrics.width} ${svgMetrics.height}`}
            style={{
              pointerEvents: "none",
              position: "absolute",
              left: 0,
              top: 0,
              width: `${svgMetrics.width}px`,
              height: `${svgMetrics.height}px`,
              overflow: "visible",
            }}
          >
            {arcs.map((arc) => (
              <path
                key={arc.key}
                d={buildArcPath(arc.startX, arc.endX, arc.y, arc.depth)}
                fill="none"
                stroke={arcColor}
                strokeWidth={arc.strokeWidth}
                strokeLinecap="round"
              />
            ))}
          </svg>
        ) : null}
      </div>
    </div>
  );
}