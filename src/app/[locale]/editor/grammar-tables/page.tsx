import { GrammarTableEditor } from "@/components/grammar-table-editor/grammar-table-editor";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { setRequestLocale } from "next-intl/server";

export default async function NewGrammarTablePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <DashboardLayout>
      <GrammarTableEditor />
    </DashboardLayout>
  );
}
