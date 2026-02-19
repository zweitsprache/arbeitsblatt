/**
 * Utility functions for parsing and serializing inline choice markers.
 *
 * New syntax:  {{correct|wrong1|wrong2}}   — first option is always correct
 * Legacy syntax: {{choice:*correct|wrong1|wrong2}} — correct marked with *
 *
 * Both are supported for backward compatibility.
 */

export type ChoiceSegment =
  | { type: "text"; value: string }
  | { type: "choice"; options: string[] }; // first option = correct

/**
 * Regex that matches both new `{{opt|opt}}` and legacy `{{choice:opt|opt}}` markers.
 * Uses a capturing group so `split()` keeps the delimiters.
 */
const CHOICE_SPLIT_RE = /(\{\{(?:choice:)?[^}]+\}\})/g;
const CHOICE_MATCH_RE = /\{\{(?:choice:)?(.+)\}\}/;

/**
 * Parse a content string into alternating text and choice segments.
 * For choice segments, the first option is always the correct answer.
 * Legacy `*`-prefixed correct answers are normalised: the starred option
 * is moved to index 0 and the `*` prefix is stripped.
 */
export function parseChoiceSegments(content: string): ChoiceSegment[] {
  const parts = content.split(CHOICE_SPLIT_RE);
  return parts
    .map((part): ChoiceSegment | null => {
      const match = part.match(CHOICE_MATCH_RE);
      if (match) {
        const rawOptions = match[1].split("|");
        // Normalise: if any option has *, move it to first position
        const starIdx = rawOptions.findIndex((o) => o.startsWith("*"));
        let options: string[];
        if (starIdx >= 0) {
          const correct = rawOptions[starIdx].slice(1); // strip *
          const rest = rawOptions.filter((_, i) => i !== starIdx).map((o) =>
            o.startsWith("*") ? o.slice(1) : o
          );
          options = [correct, ...rest];
        } else {
          options = rawOptions;
        }
        return { type: "choice", options };
      }
      // Keep text segments even if empty (they represent positions between choices)
      return { type: "text", value: part };
    })
    .filter((s): s is ChoiceSegment => s !== null);
}

/**
 * Serialize choice segments back into a content string using the new syntax.
 * First option = correct, no `*` prefix, no `choice:` prefix.
 */
export function serializeChoiceSegments(segments: ChoiceSegment[]): string {
  return segments
    .map((seg) => {
      if (seg.type === "choice") {
        return `{{${seg.options.join("|")}}}`;
      }
      return seg.value;
    })
    .join("");
}

/**
 * Update a specific choice group within a content string.
 * @param content  The full content string
 * @param groupIndex  Zero-based index of the choice group to update
 * @param newOptions  New options array (first = correct)
 * @returns Updated content string
 */
export function updateChoiceGroup(
  content: string,
  groupIndex: number,
  newOptions: string[],
): string {
  const segments = parseChoiceSegments(content);
  let choiceIdx = 0;
  const updated = segments.map((seg) => {
    if (seg.type === "choice") {
      if (choiceIdx === groupIndex) {
        choiceIdx++;
        return { type: "choice" as const, options: newOptions };
      }
      choiceIdx++;
    }
    return seg;
  });
  return serializeChoiceSegments(updated);
}

/**
 * Update a text segment within a content string.
 * @param content  The full content string
 * @param textIndex  Zero-based index counting only text segments
 * @param newText  New text value
 * @returns Updated content string
 */
export function updateTextSegment(
  content: string,
  textIndex: number,
  newText: string,
): string {
  const segments = parseChoiceSegments(content);
  let txtIdx = 0;
  const updated = segments.map((seg) => {
    if (seg.type === "text") {
      if (txtIdx === textIndex) {
        txtIdx++;
        return { type: "text" as const, value: newText };
      }
      txtIdx++;
    }
    return seg;
  });
  return serializeChoiceSegments(updated);
}

/**
 * Insert a new choice group at the end of a content string.
 */
export function insertChoiceAtEnd(content: string): string {
  return content + "{{correct|wrong1|wrong2}}";
}

/**
 * Migrate a content string from legacy syntax to new syntax.
 * {{choice:*correct|wrong1|wrong2}} → {{correct|wrong1|wrong2}}
 * Idempotent: already-new-syntax strings pass through unchanged.
 */
export function migrateChoiceSyntax(content: string): string {
  return serializeChoiceSegments(parseChoiceSegments(content));
}

/**
 * Count the number of choice groups in a content string.
 */
export function countChoiceGroups(content: string): number {
  return parseChoiceSegments(content).filter((s) => s.type === "choice").length;
}

/**
 * Get all choice groups from a content string.
 */
export function getChoiceGroups(content: string): string[][] {
  return parseChoiceSegments(content)
    .filter((s): s is Extract<ChoiceSegment, { type: "choice" }> => s.type === "choice")
    .map((s) => s.options);
}

/**
 * Validate a content string and return warnings.
 */
export function validateChoices(content: string): string[] {
  const warnings: string[] = [];
  const groups = getChoiceGroups(content);
  groups.forEach((options, i) => {
    if (options.length < 2) {
      warnings.push(`Choice ${i + 1}: at least 2 options needed`);
    }
    if (options.some((o) => o.trim() === "")) {
      warnings.push(`Choice ${i + 1}: empty option`);
    }
  });
  return warnings;
}

/**
 * Deterministic shuffle using a simple seed-based PRNG.
 * Returns a new array with elements in shuffled order plus the original
 * index mapping so we can track which option is correct.
 */
export function seededShuffle<T>(
  arr: T[],
  seed: number,
): { item: T; originalIndex: number }[] {
  const indexed = arr.map((item, i) => ({ item, originalIndex: i }));
  // Simple LCG-based PRNG
  let s = seed;
  const random = () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
  // Fisher-Yates shuffle
  for (let i = indexed.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [indexed[i], indexed[j]] = [indexed[j], indexed[i]];
  }
  return indexed;
}

/**
 * Create a numeric seed from a string (for deterministic shuffle).
 */
export function hashSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return hash;
}
