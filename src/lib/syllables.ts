import Hypher from "hypher";
import hyphenationDe from "hyphenation.de";

const hypher = new Hypher(hyphenationDe);

export function stripSyllableMarkers(text: string): string {
  return text.replace(/%%/g, "");
}

export function syllabifyGermanText(text: string): string {
  const normalized = stripSyllableMarkers(text);

  return normalized.replace(/\p{L}+/gu, (word) => {
    const parts = hypher.hyphenate(word);
    return parts.length > 1 ? parts.join("%%") : `${word}%%`;
  });
}