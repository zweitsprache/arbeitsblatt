import { BlockDisplayOn, BlockVisibility, WorksheetBlock } from "@/types/worksheet";

export type BlockDisplayContext = "course" | "worksheetOnline" | "worksheetPrint";

function getDisplayOnValue(displayOn: BlockDisplayOn | undefined, context: BlockDisplayContext): boolean | undefined {
  if (!displayOn) return undefined;
  if (context === "course") return displayOn.course;
  if (context === "worksheetOnline") return displayOn.worksheetOnline;
  return displayOn.worksheetPrint;
}

export function shouldDisplayBlock(block: WorksheetBlock, context: BlockDisplayContext): boolean {
  const displayOnValue = getDisplayOnValue(block.displayOn, context);
  if (typeof displayOnValue === "boolean") {
    return displayOnValue;
  }

  const visibility: BlockVisibility = block.visibility ?? "both";

  if (context === "worksheetOnline") {
    return visibility === "both" || visibility === "online";
  }

  if (context === "worksheetPrint") {
    return visibility === "both" || visibility === "print";
  }

  // Backward compatibility: historically all course blocks were shown regardless of visibility.
  return true;
}

export function filterBlocksByDisplay(
  blocks: WorksheetBlock[],
  context: BlockDisplayContext,
): WorksheetBlock[] {
  return blocks.filter((block) => shouldDisplayBlock(block, context));
}
