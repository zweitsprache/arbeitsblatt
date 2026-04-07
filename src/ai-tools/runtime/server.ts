import {
  AiToolCard,
  AiToolCardKind,
  AiToolMessageRecord,
  AiToolMessageRole,
  AiToolRunRecord,
  AiToolRunStatus,
} from "@/ai-tools/types";

type PrismaRunStatus = "ACTIVE" | "COMPLETED" | "ERROR" | "ARCHIVED";
type PrismaMessageRole = "USER" | "ASSISTANT" | "SYSTEM";
type PrismaMessageKind =
  | "USER_TEXT"
  | "ASSISTANT_TEXT"
  | "QUESTION_CARD"
  | "ANSWER_CARD"
  | "REVIEW_CARD"
  | "RESULT_CARD"
  | "ERROR_CARD"
  | "SYSTEM_STATUS";

type StoredMessage = {
  id: string;
  runId: string;
  role: PrismaMessageRole;
  kind: PrismaMessageKind;
  payload: unknown;
  sequence: number;
  createdAt: Date;
};

type StoredRun = {
  id: string;
  toolKey: string;
  status: PrismaRunStatus;
  userId: string | null;
  projectId: string | null;
  worksheetId: string | null;
  worksheetBlockId: string | null;
  context: unknown;
  state: unknown;
  finalResult: unknown;
  createdAt: Date;
  updatedAt: Date;
  finishedAt: Date | null;
  messages?: StoredMessage[];
};

const runStatusToPrisma: Record<AiToolRunStatus, PrismaRunStatus> = {
  active: "ACTIVE",
  completed: "COMPLETED",
  error: "ERROR",
  archived: "ARCHIVED",
};

const prismaStatusToRun: Record<PrismaRunStatus, AiToolRunStatus> = {
  ACTIVE: "active",
  COMPLETED: "completed",
  ERROR: "error",
  ARCHIVED: "archived",
};

const cardKindToPrisma: Record<AiToolCardKind, PrismaMessageKind> = {
  "assistant-text": "ASSISTANT_TEXT",
  "user-text": "USER_TEXT",
  "question-card": "QUESTION_CARD",
  "answer-card": "ANSWER_CARD",
  "review-card": "REVIEW_CARD",
  "result-card": "RESULT_CARD",
  "error-card": "ERROR_CARD",
  "system-status": "SYSTEM_STATUS",
};

const prismaKindToCard: Record<PrismaMessageKind, AiToolCardKind> = {
  ASSISTANT_TEXT: "assistant-text",
  USER_TEXT: "user-text",
  QUESTION_CARD: "question-card",
  ANSWER_CARD: "answer-card",
  REVIEW_CARD: "review-card",
  RESULT_CARD: "result-card",
  ERROR_CARD: "error-card",
  SYSTEM_STATUS: "system-status",
};

const prismaRoleToMessageRole: Record<PrismaMessageRole, AiToolMessageRole> = {
  USER: "user",
  ASSISTANT: "assistant",
  SYSTEM: "system",
};

export function getCardRole(card: AiToolCard): PrismaMessageRole {
  switch (card.kind) {
    case "user-text":
    case "answer-card":
      return "USER";
    case "system-status":
      return "SYSTEM";
    default:
      return "ASSISTANT";
  }
}

export function toPrismaRunStatus(status: AiToolRunStatus): PrismaRunStatus {
  return runStatusToPrisma[status];
}

export function toPrismaMessageKind(kind: AiToolCardKind): PrismaMessageKind {
  return cardKindToPrisma[kind];
}

export function createStoredMessageData(cards: AiToolCard[], startSequence: number) {
  return cards.map((card, index) => ({
    role: getCardRole(card),
    kind: toPrismaMessageKind(card.kind),
    payload: card.payload,
    sequence: startSequence + index,
  }));
}

export function serializeAiToolMessage(message: StoredMessage): AiToolMessageRecord {
  return {
    id: message.id,
    runId: message.runId,
    role: prismaRoleToMessageRole[message.role],
    kind: prismaKindToCard[message.kind],
    payload: (message.payload ?? {}) as AiToolMessageRecord["payload"],
    sequence: message.sequence,
    createdAt: message.createdAt.toISOString(),
  };
}

export function serializeAiToolRun(run: StoredRun): AiToolRunRecord {
  return {
    id: run.id,
    toolKey: run.toolKey,
    status: prismaStatusToRun[run.status],
    userId: run.userId ?? undefined,
    projectId: run.projectId ?? undefined,
    worksheetId: run.worksheetId ?? undefined,
    worksheetBlockId: run.worksheetBlockId ?? undefined,
    context: ((run.context as Record<string, unknown> | null) ?? {}) as AiToolRunRecord["context"],
    state: ((run.state as Record<string, unknown> | null) ?? {}) as Record<string, unknown>,
    finalResult: (run.finalResult as Record<string, unknown> | null) ?? null,
    createdAt: run.createdAt.toISOString(),
    updatedAt: run.updatedAt.toISOString(),
    finishedAt: run.finishedAt?.toISOString() ?? null,
    messages: run.messages?.map(serializeAiToolMessage),
  };
}