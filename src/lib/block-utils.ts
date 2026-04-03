import { v4 as uuidv4 } from "uuid";
import { WorksheetBlock } from "@/types/worksheet";

/**
 * Deep-clone an array of blocks, assigning fresh UUIDs to every block id.
 * Recurses into `columns` children and `accordion` item children so that
 * nested block ids are also replaced.
 */
export function deepCloneBlocksWithNewIds(blocks: WorksheetBlock[]): WorksheetBlock[] {
  return blocks.map((block) => {
    const cloned = JSON.parse(JSON.stringify(block)) as WorksheetBlock;
    cloned.id = uuidv4();

    if (cloned.type === "columns") {
      cloned.children = cloned.children.map((col) =>
        deepCloneBlocksWithNewIds(col)
      );
    } else if (cloned.type === "accordion") {
      cloned.items = cloned.items.map((item) => ({
        ...item,
        children: deepCloneBlocksWithNewIds(item.children),
      }));
    }

    return cloned;
  });
}
