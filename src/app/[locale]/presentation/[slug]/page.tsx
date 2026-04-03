import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { WorksheetBlock, WorksheetSettings, DEFAULT_SETTINGS } from "@/types/worksheet";
import { PresentationSettings, DEFAULT_PRESENTATION_SETTINGS } from "@/types/presentation";
import { PresentationViewer } from "@/components/viewer/presentation-viewer";

export default async function PresentationViewerPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const presentation = await prisma.presentation.findUnique({
    where: { slug },
  });

  if (!presentation) {
    notFound();
  }

  const blocks = presentation.blocks as unknown as WorksheetBlock[];
  const settings: PresentationSettings = {
    ...DEFAULT_PRESENTATION_SETTINGS,
    ...(presentation.settings as unknown as Partial<PresentationSettings>),
  };

  // Collect linked worksheet IDs
  const linkedIds = new Set<string>();
  for (const block of blocks) {
    if (block.type === "linked-blocks") {
      linkedIds.add(block.worksheetId);
    }
  }

  // Fetch linked worksheets
  const worksheets: Record<string, { blocks: WorksheetBlock[] }> = {};
  if (linkedIds.size > 0) {
    const worksheetsData = await prisma.worksheet.findMany({
      where: { id: { in: Array.from(linkedIds) } },
      select: { id: true, blocks: true },
    });
    for (const ws of worksheetsData) {
      worksheets[ws.id] = {
        blocks: ws.blocks as unknown as WorksheetBlock[],
      };
    }
  }

  // Expand linked-blocks inline
  const expandedBlocks = blocks.flatMap((block) => {
    if (block.type === "linked-blocks" && worksheets[block.worksheetId]) {
      return worksheets[block.worksheetId].blocks;
    }
    return [block];
  });

  return (
    <PresentationViewer
      presentationId={presentation.id}
      title={presentation.title}
      blocks={expandedBlocks}
      settings={settings}
    />
  );
}
