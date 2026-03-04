import { setRequestLocale } from "next-intl/server";
import { ProjectDetailView } from "@/components/admin/project-detail-view";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  return <ProjectDetailView projectId={id} />;
}
