import { GrammarTableEditor } from "@/components/grammar-table-editor/grammar-table-editor";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { setRequestLocale } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function EditGrammarTablePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  return (
    <DashboardLayout>
      <GrammarTableEditor documentId={id} />
    </DashboardLayout>
  );
}
