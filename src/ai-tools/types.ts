export type AiToolRunStatus = "active" | "completed" | "error" | "archived";

export type AiToolCardKind =
  | "assistant-text"
  | "user-text"
  | "question-card"
  | "answer-card"
  | "review-card"
  | "result-card"
  | "error-card"
  | "system-status";

export type AiToolMessageRole = "user" | "assistant" | "system";

export type AiToolContextMode = "standalone" | "worksheet" | "lesson";

export interface AiToolRunContext {
  mode: AiToolContextMode;
  worksheetId?: string;
  worksheetBlockId?: string;
  projectId?: string;
  locale?: string;
  sourceText?: string;
  metadata?: Record<string, unknown>;
}

export interface AiToolBaseCard<TPayload extends Record<string, unknown>> {
  kind: AiToolCardKind;
  payload: TPayload;
}

export interface AssistantTextCard
  extends AiToolBaseCard<{
    text: string;
    markdown?: boolean;
  }> {
  kind: "assistant-text";
}

export interface UserTextCard
  extends AiToolBaseCard<{
    text: string;
  }> {
  kind: "user-text";
}

export interface QuestionCard
  extends AiToolBaseCard<{
    question: string;
    helperText?: string;
    inputType?: "text" | "textarea" | "select";
    options?: Array<{ label: string; value: string }>;
    choiceStyle?: "dropdown" | "buttons";
    submitMode?: "manual" | "immediate";
    selectedValue?: string;
    selectedLabel?: string;
    variableName?: string;
  }> {
  kind: "question-card";
}

export interface AnswerCard
  extends AiToolBaseCard<{
    label?: string;
    answer: string;
    variableName?: string;
  }> {
  kind: "answer-card";
}

export interface ReviewCard
  extends AiToolBaseCard<{
    title: string;
    items: Array<{ label: string; value: string }>;
  }> {
  kind: "review-card";
}

export interface ResultCard
  extends AiToolBaseCard<{
    title?: string;
    text: string;
    markdown?: boolean;
  }> {
  kind: "result-card";
}

export interface ErrorCard
  extends AiToolBaseCard<{
    message: string;
  }> {
  kind: "error-card";
}

export interface SystemStatusCard
  extends AiToolBaseCard<{
    status: "thinking" | "ready" | "waiting-for-user" | "completed";
    label?: string;
  }> {
  kind: "system-status";
}

export type AiToolCard =
  | AssistantTextCard
  | UserTextCard
  | QuestionCard
  | AnswerCard
  | ReviewCard
  | ResultCard
  | ErrorCard
  | SystemStatusCard;

export interface AiToolMessageRecord {
  id: string;
  runId: string;
  role: AiToolMessageRole;
  kind: AiToolCardKind;
  payload: AiToolCard["payload"];
  sequence: number;
  createdAt: string;
}

export interface AiToolRunRecord {
  id: string;
  toolKey: string;
  status: AiToolRunStatus;
  userId?: string;
  projectId?: string;
  worksheetId?: string;
  worksheetBlockId?: string;
  context: AiToolRunContext;
  state: Record<string, unknown>;
  finalResult?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  finishedAt?: string | null;
  messages?: AiToolMessageRecord[];
}

export interface AiToolPublicMetadata {
  toolKey: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  supportsStandalone: boolean;
  supportsWorksheetEmbedding: boolean;
  contextModes: AiToolContextMode[];
}

export interface AiToolStartRequest {
  toolKey: string;
  context: AiToolRunContext;
  initialInput?: string;
  initialData?: Record<string, unknown>;
  blockOverrides?: {
    title?: string;
    description?: string;
  };
}

export interface AiToolReplyRequest {
  input?: string;
  suppressUserMessage?: boolean;
  action?: {
    type: string;
    payload?: Record<string, unknown>;
  };
  expectedSequence?: number;
}

export interface AiToolHandlerContext {
  locale?: string;
  userId?: string;
}

export interface AiToolCreateRunResult {
  state?: Record<string, unknown>;
  messages: AiToolCard[];
}

export interface AiToolContinueRunResult {
  state?: Record<string, unknown>;
  messages: AiToolCard[];
  finalResult?: Record<string, unknown> | null;
  status?: AiToolRunStatus;
}

export interface AiToolStreamContinueResult {
  state?: Record<string, unknown>;
  status?: AiToolRunStatus;
  finalResult?: Record<string, unknown> | null;
  prefixMessages: AiToolCard[];
  streamedMessage: Extract<AiToolCard, { kind: "assistant-text" | "result-card" }>;
  textStream: AsyncIterable<string>;
}

export interface AiToolDefinition {
  toolKey: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  supportsStandalone: boolean;
  supportsWorksheetEmbedding: boolean;
  contextModes: AiToolContextMode[];
  createRun: (
    request: AiToolStartRequest,
    handlerContext: AiToolHandlerContext
  ) => Promise<AiToolCreateRunResult>;
  continueRun: (
    run: Pick<AiToolRunRecord, "id" | "toolKey" | "context" | "state" | "status">,
    request: AiToolReplyRequest,
    handlerContext: AiToolHandlerContext
  ) => Promise<AiToolContinueRunResult>;
  streamContinueRun?: (
    run: Pick<AiToolRunRecord, "id" | "toolKey" | "context" | "state" | "status">,
    request: AiToolReplyRequest,
    handlerContext: AiToolHandlerContext
  ) => Promise<AiToolStreamContinueResult>;
}