import { describe, expect, it } from "vitest";
import { parseBlankContent, parseBlankToken, renderBlankTokensInRichHtml, renderBlankTokensInText } from "@/lib/fill-in-blank";
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

  it("accepts blanks as an alias for blank", () => {
    const token = parseBlankToken("{{blanks,xl:answer}}");

    expect(token).toEqual({ noSpace: false, raw: "blank,xl:answer" });
    expect(parseBlankContent(token?.raw || "")).toEqual({
      answer: "answer",
      width: { widthMultiplier: 3, characterWidth: null },
    });
    expect(renderBlankTokensInHtml("Hello {{blanks,xl:world}}")).toContain('data-answer="world"');
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

  it("renders blank tokens in plain text and rich html safely", () => {
    const plain = renderBlankTokensInText("A < B {{blank:word}}");
    expect(plain).toContain("A &lt; B");
    expect(renderBlankTokensInRichHtml("<p>A&nbsp;{{blanks:word}}</p>")).toContain("A&nbsp;");
    expect(renderBlankTokensInRichHtml("<p>A&nbsp;{{blanks:word}}</p>")).not.toContain("A&amp;nbsp;");
  });

  it("keeps original margins and emits layout probes for rendered blanks", () => {
    const lineStart = renderBlankTokensInRichHtml("<p>{{blank:word}}</p>");
    const inline = renderBlankTokensInRichHtml("<p>Line {{blank:word}}</p>");
    const blankRun = renderBlankTokensInRichHtml("<p>{{blank:a}} {{blank:b}}</p>");
    const attached = renderBlankTokensInRichHtml("<p>ge{{blank*:macht}}</p>");

    expect(lineStart).toContain('class="mx-1"');
    expect(lineStart).toContain('data-blank-probe="true"');
    expect(lineStart).not.toContain("margin-left:0");
    expect(inline).toContain('class="mx-1"');
    expect(inline).not.toContain("margin-left:0");
    expect(blankRun.match(/data-blank-probe="true"/g)?.length).toBe(2);
    expect(attached).not.toContain('class="mr-1"');
    expect(attached).not.toContain('class="mx-1"');
  });
});
