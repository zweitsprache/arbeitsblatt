import { WorksheetViewer } from "@/components/viewer/worksheet-viewer";
import { printFixtureBlocks, printFixtureSettings, printFixtureTitle } from "@/lib/print-fixture";
import { getStaticBrandProfile } from "@/types/worksheet";
import { setRequestLocale } from "next-intl/server";

export default async function PrintFixturePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;

  setRequestLocale(locale);

  return (
    <WorksheetViewer
      title={printFixtureTitle}
      blocks={printFixtureBlocks}
      settings={printFixtureSettings}
      mode="print"
      worksheetId="PRINT-FIXTURE"
      showSolutions={sp.solutions === "1"}
      brandProfile={getStaticBrandProfile(printFixtureSettings.brand)}
    />
  );
}