import { setRequestLocale } from "next-intl/server";
import { VocabWorkspace } from "@/components/vocabulary/vocab-workspace";

export default async function VocabPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <VocabWorkspace />;
}
