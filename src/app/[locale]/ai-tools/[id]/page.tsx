import { prisma } from "@/lib/prisma";
import { AiToolEditor } from "@/components/ai-tool-editor/ai-tool-editor";
import { AiToolProvider } from "@/store/ai-tool-store";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { AiToolDocument, AiToolField, AiToolSettings, DEFAULT_AI_TOOL_SETTINGS } from "@/types/ai-tool";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function EditAiToolPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
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

  const tool = await prisma.aiTool.findUnique({
    where: { id, userId: session.user.id },
  });

  if (!tool) {
    notFound();
  }

  const doc: AiToolDocument = {
    id: tool.id,
    title: tool.title,
    slug: tool.slug,
    description: tool.description || "",
    fields: tool.fields as unknown as AiToolField[],
    promptTemplate: tool.promptTemplate,
    settings: {
      ...DEFAULT_AI_TOOL_SETTINGS,
      ...(tool.settings as unknown as Partial<AiToolSettings>),
    },
    published: tool.published,
    createdAt: tool.createdAt.toISOString(),
    updatedAt: tool.updatedAt.toISOString(),
  };

  return (
    <DashboardLayout>
      <AiToolProvider initialData={doc}>
        <AiToolEditor />
      </AiToolProvider>
    </DashboardLayout>
  );
}
