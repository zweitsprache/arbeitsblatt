import { setRequestLocale } from "next-intl/server";
import { BrandEditor } from "@/components/admin/brand-editor";

export default async function BrandDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  return <BrandEditor brandId={id} />;
}
