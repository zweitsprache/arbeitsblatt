import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth/server";
import { RveSpikeEditor } from "@/components/video-editor/rve-spike-editor";

export const dynamic = "force-dynamic";

export default async function VideoEditorSpikePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  let session;
  try {
    const result = await auth.getSession();
    session = result.data;
  } catch {
    redirect(`/${locale}/auth/sign-in`);
  }

  if (!session?.user) {
    redirect(`/${locale}/auth/sign-in`);
  }

  return <main className="h-dvh w-full overflow-hidden bg-background"><RveSpikeEditor /></main>;
}
