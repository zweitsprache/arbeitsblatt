import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { WorksheetViewer } from "@/components/viewer/worksheet-viewer";
import { DEFAULT_SETTINGS, TabooBlock, WorksheetSettings } from "@/types/worksheet";
import { getQuartettExportState } from "@/lib/quartett-export-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function TabooExportPreviewPage({
  params,
}: {
  params: Promise<{ locale: string; exportId: string }>;
}) {
  const { locale, exportId } = await params;
  setRequestLocale(locale);

  const exportState = getQuartettExportState(exportId);
  if (!exportState) {
    notFound();
  }

  const block = exportState.block as TabooBlock;
  const isTenStopWordVariant = block.stopWordCount === 10 || block.items.some((item) => item.subitems.length > 4);
  const settings: WorksheetSettings = {
    ...DEFAULT_SETTINGS,
    ...exportState.settings,
    orientation: isTenStopWordVariant ? "portrait" : (exportState.settings.orientation ?? DEFAULT_SETTINGS.orientation),
  };
  const effectiveOrientation = settings.orientation === "portrait" ? "portrait" : "landscape";
  const pageSizeCss = effectiveOrientation === "landscape" ? "297mm 210mm" : "210mm 297mm";

  return (
    <>
      <style>{`
        @page { size: ${pageSizeCss}; margin: 0; }
        html, body { margin: 0; background: #fff; }
      `}</style>
      <WorksheetViewer
        title={exportState.title}
        blocks={[block]}
        settings={settings}
        mode="print"
        worksheetId={exportState.worksheetId || ""}
        initialLocale={locale}
        brandProfile={exportState.brandProfile || undefined}
      />
    </>
  );
}
