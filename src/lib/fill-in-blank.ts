import type { CSSProperties } from "react";

export type BlankWidthSpec = {
  widthMultiplier: number;
  characterWidth: number | null;
};

export type BlankSpacing = {
  className: string;
  style?: CSSProperties;
};

const BLANK_WIDTH_ALIASES: Record<string, BlankWidthSpec> = {
  xs: { widthMultiplier: 0.5, characterWidth: null },
  sm: { widthMultiplier: 0.75, characterWidth: null },
  md: { widthMultiplier: 1, characterWidth: null },
  lg: { widthMultiplier: 2, characterWidth: null },
  xl: { widthMultiplier: 3, characterWidth: null },
};

export const BLANK_TOKEN_PATTERN = String.raw`\{\{blank\*?(?:,[^:}]+)?(?::[^}]*)?\}\}`;

export function parseBlankToken(token: string): { noSpace: boolean; raw: string } | null {
  const match = token.match(/^\{\{blank(\*?)(?:,([^:}]+))?(?::([^}]*))?\}\}$/);
  if (!match) return null;

  const leadingWidth = match[2]?.trim();
  const answer = match[3] || "";
  return {
    noSpace: match[1] === "*",
    raw: leadingWidth ? `blank,${leadingWidth}:${answer}` : answer,
  };
}

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
  let answer = raw.trim();
  let widthMultiplier = 1;
  let characterWidth: number | null = null;

  const applyWidthToken = (token: string): boolean => {
    const widthToken = token.trim();
    const aliasedWidth = BLANK_WIDTH_ALIASES[widthToken.toLowerCase()];
    if (aliasedWidth) {
      widthMultiplier = aliasedWidth.widthMultiplier;
      characterWidth = aliasedWidth.characterWidth;
      return true;
    }

    const characterMatch = widthToken.match(/^(\d+(?:\.\d+)?)\s*(?:ch|c)$/i);
    if (characterMatch) {
      widthMultiplier = 1;
      characterWidth = Number(characterMatch[1]);
      return true;
    }

    const parsed = Number(widthToken);
    if (!Number.isNaN(parsed)) {
      widthMultiplier = parsed;
      characterWidth = null;
      return true;
    }

    return false;
  };

  const colonIdx = raw.indexOf(":");
  const commaBeforeColonIdx = colonIdx === -1 ? -1 : raw.substring(0, colonIdx).lastIndexOf(",");
  if (commaBeforeColonIdx !== -1) {
    const leadingWidthToken = raw.substring(commaBeforeColonIdx + 1, colonIdx);
    if (applyWidthToken(leadingWidthToken)) {
      answer = raw.substring(colonIdx + 1).trim();
    }
  }

  const commaIdx = answer.lastIndexOf(",");
  if (commaIdx !== -1) {
    const trailingWidthToken = answer.substring(commaIdx + 1);
    if (applyWidthToken(trailingWidthToken)) {
      answer = answer.substring(0, commaIdx).trim();
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
  const nextBlank = parseBlankToken(next);
  if (nextBlank) {
    const { width: nextWidth } = parseBlankContent(nextBlank.raw);
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
