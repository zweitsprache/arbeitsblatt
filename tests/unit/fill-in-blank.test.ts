import { describe, expect, it } from "vitest";
import { parseBlankContent, parseBlankToken } from "@/lib/fill-in-blank";
import { solveFlashcardBlankText } from "@/lib/domino";
import { renderBlankTokensInHtml } from "@/lib/table-html";

describe("fill-in-blank token parsing", () => {
  it("keeps the existing answer-first width syntax", () => {
    expect(parseBlankContent("answer,3")).toEqual({
      answer: "answer",
      width: { widthMultiplier: 3, characterWidth: null },
    });
    expect(parseBlankContent("answer,1ch")).toEqual({
      answer: "answer",
      width: { widthMultiplier: 1, characterWidth: 1 },
    });
  });

  it("supports front-loaded named width syntax", () => {
    const token = parseBlankToken("{{blank,xl:answer}}");

    expect(token).toEqual({ noSpace: false, raw: "blank,xl:answer" });
    expect(parseBlankContent(token?.raw || "")).toEqual({
      answer: "answer",
      width: { widthMultiplier: 3, characterWidth: null },
    });
  });

  it("supports front-loaded numeric and character widths", () => {
    expect(parseBlankContent(parseBlankToken("{{blank,2:answer}}")?.raw || "")).toEqual({
      answer: "answer",
      width: { widthMultiplier: 2, characterWidth: null },
    });
    expect(parseBlankContent(parseBlankToken("{{blank,1ch:a}}")?.raw || "")).toEqual({
      answer: "a",
      width: { widthMultiplier: 1, characterWidth: 1 },
    });
  });

  it("preserves the no-space modifier with front-loaded widths", () => {
    expect(parseBlankToken("{{blank*,lg:answer}}")).toEqual({
      noSpace: true,
      raw: "blank,lg:answer",
    });
  });

  it("uses the shared parser in helper replacements", () => {
    expect(solveFlashcardBlankText("Hello {{blank,xl:world}}")).toBe("Hello world");
    expect(renderBlankTokensInHtml("Hello {{blank,xl:world}}")).toContain('data-answer="world"');
  });
});
