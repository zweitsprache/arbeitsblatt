import { describe, expect, it } from "vitest";
import {
  getTextMatchingAnswerLetters,
  getTextMatchingCardItems,
  getTextMatchingTextItems,
} from "@/lib/text-matching";

describe("text matching", () => {
  it("matches rows to their own cards when both sides are on the same item", () => {
    const items = [
      { id: "dance", text: "A child wants to dance", content: "<p>Dance class for children</p>" },
      { id: "swim", text: "Someone wants evening swimming", content: "<p>Aqua-Fit in the evening</p>" },
      { id: "extra", content: "<p>Running group</p>" },
    ];

    const cardItems = getTextMatchingCardItems("block-1", items);
    const answerLetters = getTextMatchingAnswerLetters("block-1", items, (index) => String.fromCharCode(64 + index));
    const cardLetterById = new Map(cardItems.map((item, index) => [item.id, String.fromCharCode(65 + index)]));

    expect(getTextMatchingTextItems(items).map((item) => item.id)).toEqual(["dance", "swim"]);
    expect(answerLetters.get("dance")).toBe(cardLetterById.get("dance"));
    expect(answerLetters.get("swim")).toBe(cardLetterById.get("swim"));
  });

  it("renders X for row-only items", () => {
    const items = [
      { id: "row-1", text: "Needs a beginner climbing course" },
      { id: "row-2", text: "Wants to swim" },
      { id: "card-1", content: "<p>Bouldering beginner course</p>" },
      { id: "card-2", content: "<p>Swimming pool day pass</p>" },
    ];

    const answerLetters = getTextMatchingAnswerLetters("block-1", items, (index) => String.fromCharCode(64 + index));

    expect(answerLetters.get("row-1")).toBe("X");
    expect(answerLetters.get("row-2")).toBe("X");
    expect(getTextMatchingCardItems("block-1", items).map((item) => item.id).sort()).toEqual(["card-1", "card-2"]);
  });

  it("keeps card-only items as extra cards without numbered rows", () => {
    const items = [
      { id: "paired", text: "A child wants to dance", content: "<p>Dance class for children</p>" },
      { id: "extra", content: "<p>Running group</p>" },
    ];

    expect(getTextMatchingTextItems(items).map((item) => item.id)).toEqual(["paired"]);
    expect(getTextMatchingCardItems("block-2", items).map((item) => item.id).sort()).toEqual(["extra", "paired"]);
  });
});
