import type { CSSProperties } from "react";

export type BlankWidthSpec = {
  widthMultiplier: number;
  characterWidth: number | null;
};

export type BlankSpacing = {
  className: string;
  style?: CSSProperties;
};

function multiplyInnerRegularSpaces(text: string, multiplier: number): string {
  if (!text || text.length < 3) return text;

  let out = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === " ") {
      const prev = i > 0 ? text[i - 1] : "";
      const next = i < text.length - 1 ? text[i + 1] : "";
      const prevVisible = prev !== "" && !/\s/.test(prev);
      const nextVisible = next !== "" && !/\s/.test(next);
      out += prevVisible && nextVisible ? "\u00A0".repeat(multiplier) : ch;
      continue;
    }
    out += ch;
  }

  return out;
}

export function doubleInnerRegularSpaces(text: string): string {
  return multiplyInnerRegularSpaces(text, 2);
}

export function tripleInnerRegularSpaces(text: string): string {
  return multiplyInnerRegularSpaces(text, 3);
}

export function parseBlankContent(raw: string): { answer: string; width: BlankWidthSpec } {
  const commaIdx = raw.lastIndexOf(",");
  let answer = raw.trim();
  let widthMultiplier = 1;
  let characterWidth: number | null = null;

  if (commaIdx !== -1) {
    answer = raw.substring(0, commaIdx).trim();
    const widthToken = raw.substring(commaIdx + 1).trim();
    const characterMatch = widthToken.match(/^(\d+(?:\.\d+)?)\s*(?:ch|c)$/i);

    if (characterMatch) {
      characterWidth = Number(characterMatch[1]);
    } else {
      const parsed = Number(widthToken);
      if (!Number.isNaN(parsed)) widthMultiplier = parsed;
    }
  }

  return {
    answer,
    width: {
      widthMultiplier,
      characterWidth,
    },
  };
}

export function getBlankWidthStyle(width: BlankWidthSpec, interactive: boolean): CSSProperties {
  if (width.characterWidth !== null) {
    const squareSize = `${width.characterWidth * 1.4}rem`;
    return {
      width: squareSize,
      height: squareSize,
      minWidth: squareSize,
      minHeight: squareSize,
      maxWidth: squareSize,
      maxHeight: squareSize,
      flex: "0 0 auto",
      aspectRatio: "1 / 1",
      boxSizing: "border-box",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 0,
      overflow: "hidden",
      whiteSpace: "nowrap",
    };
  }

  if (width.widthMultiplier === 0) {
    return { flex: 1 };
  }

  return interactive
    ? { width: `${112 * width.widthMultiplier}px` }
    : { minWidth: `${80 * width.widthMultiplier}px` };
}

export function getBlankSpacing(
  width: BlankWidthSpec,
  noSpace: boolean,
  nextPart?: string,
): BlankSpacing {
  if (noSpace) {
    return { className: "" };
  }

  if (width.characterWidth === null) {
    return { className: "mx-1" };
  }

  const style: CSSProperties = {
    marginLeft: "0.125rem",
    marginRight: "0.125rem",
  };

  const next = nextPart || "";
  const nextBlankMatch = next.match(/^\{\{blank\*?(?::(.+))?\}\}$/);
  if (nextBlankMatch) {
    const nextRaw = nextBlankMatch[1] || "";
    const { width: nextWidth } = parseBlankContent(nextRaw);
    if (nextWidth.characterWidth !== null) {
      return { className: "", style };
    }
  }

  if (/^\s/.test(next)) {
    return { className: "", style: { ...style, marginRight: "0.75rem" } };
  }

  if (/^[.?!]/.test(next)) {
    return { className: "", style: { ...style, marginRight: "0.75rem" } };
  }

  if (/\S/.test(next)) {
    return { className: "", style };
  }

  return { className: "", style };
}