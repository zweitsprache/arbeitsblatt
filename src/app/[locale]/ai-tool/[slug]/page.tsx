import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getAiToolDefinition } from "@/ai-tools/registry";
import { ToolWorkflowShell } from "@/ai-tools/components/tool-workflow-shell";
import { AiToolBlock } from "@/types/worksheet";

export default async function AiToolStandalonePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const tool = getAiToolDefinition(slug);
  if (!tool) notFound();

  const block: AiToolBlock = {
    id: `standalone-${tool.toolKey}`,
    type: "ai-tool",
    toolKey: tool.toolKey,
    toolTitle: tool.title,
    toolDescription: tool.description,
    latestRunId: "",
    visibility: "online",
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-10 sm:px-8">
        <ToolWorkflowShell block={block} />
      </div>
    </div>
  );
}