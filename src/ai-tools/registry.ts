import { AiToolDefinition, AiToolPublicMetadata } from "@/ai-tools/types";
import { bewerbungsbriefTool } from "@/ai-tools/tools/bewerbungsbrief";
import { dialogueCardsTool } from "@/ai-tools/tools/dialogue-cards";

const AI_TOOL_REGISTRY: AiToolDefinition[] = [bewerbungsbriefTool, dialogueCardsTool];

export function getAiToolRegistry(): AiToolDefinition[] {
  return AI_TOOL_REGISTRY;
}

export function getAiToolDefinition(toolKey: string): AiToolDefinition | undefined {
  return AI_TOOL_REGISTRY.find((tool) => tool.toolKey === toolKey);
}

export function getAiToolPublicMetadata(): AiToolPublicMetadata[] {
  return AI_TOOL_REGISTRY.map((tool) => ({
    toolKey: tool.toolKey,
    title: tool.title,
    description: tool.description,
    icon: tool.icon,
    category: tool.category,
    supportsStandalone: tool.supportsStandalone,
    supportsWorksheetEmbedding: tool.supportsWorksheetEmbedding,
    contextModes: tool.contextModes,
  }));
}