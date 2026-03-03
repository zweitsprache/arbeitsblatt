// ─── AI Tool Field Types ─────────────────────────────────────
export type AiToolFieldType =
  | "text"
  | "textarea"
  | "select"
  | "number"
  | "checkbox"
  | "radio";

// ─── Field option (for select / radio) ──────────────────────
export interface AiToolFieldOption {
  id: string;
  label: string;
  value: string;
}

// ─── Field definition ────────────────────────────────────────
export interface AiToolField {
  id: string;
  type: AiToolFieldType;
  label: string;
  variableName: string;
  placeholder?: string;
  required?: boolean;
  options?: AiToolFieldOption[];   // for select / radio
  min?: number;                    // for number
  max?: number;                    // for number
  defaultValue?: string;
}

// ─── Tool settings ───────────────────────────────────────────
export interface AiToolSettings {
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export const DEFAULT_AI_TOOL_SETTINGS: AiToolSettings = {
  model: "claude-sonnet-4-20250514",
  maxTokens: 4096,
  temperature: 0.7,
};

// ─── AI Tool document ────────────────────────────────────────
export interface AiToolDocument {
  id: string;
  title: string;
  slug: string;
  description: string;
  fields: AiToolField[];
  promptTemplate: string;
  settings: AiToolSettings;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}
