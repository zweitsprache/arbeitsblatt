import { WorksheetBlock } from "@/types/worksheet";
import {
  extractBlockStrings,
  applyBlockTranslations,
} from "@/lib/course-translation";

/**
 * Extract all translatable strings from a flat worksheet block array.
 * Returns a flat map of dot-notation keys → German source values.
 * e.g. { "block.abc123.content": "Hallo Welt" }
 */
export function extractWorksheetStrings(
  blocks: WorksheetBlock[]
): Record<string, string> {
  const strings: Record<string, string> = {};
  extractBlockStrings(blocks, strings);
  return strings;
}

/**
 * Apply a flat translation map to a set of worksheet blocks.
 * Deep-clones the blocks so the originals are not mutated.
 * Falls back to the original value for any key not present in translations.
 */
export function applyWorksheetTranslations(
  blocks: WorksheetBlock[],
  translations: Record<string, string>
): WorksheetBlock[] {
  const cloned: WorksheetBlock[] = JSON.parse(JSON.stringify(blocks));
  applyBlockTranslations(cloned, translations);
  return cloned;
}
