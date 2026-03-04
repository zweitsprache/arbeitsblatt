import { setRequestLocale } from "next-intl/server";
import { ClientDetailView } from "@/components/admin/client-detail-view";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  return <ClientDetailView clientId={id} />;
}
