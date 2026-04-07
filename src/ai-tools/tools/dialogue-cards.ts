import Anthropic from "@anthropic-ai/sdk";
import {
  AiToolCreateRunResult,
  AiToolDefinition,
  AiToolHandlerContext,
  AiToolReplyRequest,
  AiToolRunRecord,
  AiToolStreamContinueResult,
  AiToolStartRequest,
} from "@/ai-tools/types";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const DEFAULT_MODEL = "claude-sonnet-4-20250514";

const LOCALE_NAMES: Record<string, string> = {
  de: "German",
  en: "English",
  uk: "Ukrainian",
  fr: "French",
  es: "Spanish",
  it: "Italian",
  pt: "Portuguese",
  tr: "Turkish",
  ar: "Arabic",
  pl: "Polish",
  ru: "Russian",
};

interface FollowUpQuestionPayload {
  question: string;
  helperText?: string;
}

function getResponseLanguage(locale?: string): string {
  return LOCALE_NAMES[locale ?? ""] ?? "English";
}

async function generateText(system: string, prompt: string) {
  const message = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 900,
    system,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = message.content.find((content) => content.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from AI");
  }

  return textBlock.text.trim();
}

async function* streamGeneratedText(system: string, prompt: string) {
  const stream = await client.messages.stream({
    model: DEFAULT_MODEL,
    max_tokens: 900,
    system,
    messages: [{ role: "user", content: prompt }],
  });

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      yield event.delta.text;
    }
  }
}

function extractJsonObject(text: string): Record<string, unknown> | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;

  try {
    return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function generateFollowUpQuestion(sourceInput: string, locale?: string): Promise<FollowUpQuestionPayload> {
  const responseLanguage = getResponseLanguage(locale);
  const system = `You design exactly one high-leverage follow-up question for an AI workflow.

Your job:
- Read the user's original source input.
- Ask one follow-up question that will materially improve the final result.
- The question must collect missing constraints such as audience, tone, level, output format, or instructional goal.
- Keep it concise and specific.
- Respond in ${responseLanguage}.

Return valid JSON only with this exact shape:
{
  "question": "...",
  "helperText": "..."
}`;

  const prompt = `Original input:\n\n${sourceInput}`;
  const text = await generateText(system, prompt);
  const parsed = extractJsonObject(text);

  if (!parsed || typeof parsed.question !== "string") {
    return {
      question:
        responseLanguage === "German"
          ? "Was soll ich im Endergebnis besonders berücksichtigen?"
          : "What should I prioritize in the final result?",
      helperText:
        responseLanguage === "German"
          ? "Zum Beispiel Zielgruppe, Ton, Schwierigkeitsgrad oder Format."
          : "For example: audience, tone, difficulty level, or output format.",
    };
  }

  return {
    question: parsed.question.trim(),
    helperText: typeof parsed.helperText === "string" ? parsed.helperText.trim() : undefined,
  };
}

async function generateFinalResult(sourceInput: string, followUpAnswer: string, locale?: string) {
  const responseLanguage = getResponseLanguage(locale);
  const system = `You are an educational AI workflow tool.

Your task:
- Use the original input and one follow-up answer to produce the best possible final result.
- Be concrete, useful, and well-structured.
- Do not describe the workflow; just deliver the result.
- Use light Markdown for readability.
- Respond in ${responseLanguage}.`;

  const prompt = `Original input:\n\n${sourceInput}\n\nFollow-up instruction:\n\n${followUpAnswer}`;
  return generateText(system, prompt);
}

function getFinalResultPrompt(sourceInput: string, followUpAnswer: string, locale?: string) {
  const responseLanguage = getResponseLanguage(locale);
  return {
    system: `You are an educational AI workflow tool.

Your task:
- Use the original input and one follow-up answer to produce the best possible final result.
- Be concrete, useful, and well-structured.
- Do not describe the workflow; just deliver the result.
- Use light Markdown for readability.
- Respond in ${responseLanguage}.`,
    prompt: `Original input:\n\n${sourceInput}\n\nFollow-up instruction:\n\n${followUpAnswer}`,
  };
}

function buildInitialMessages(request: AiToolStartRequest): AiToolCreateRunResult["messages"] {
  const prompt = request.initialInput?.trim();

  if (!prompt) {
    return [
      {
        kind: "assistant-text",
        payload: {
          text: "Describe the task or source material you want to work from.",
          markdown: false,
        },
      },
      {
        kind: "question-card",
        payload: {
          question: "What should the AI work on?",
          helperText: "Paste the original input or describe the goal.",
          inputType: "textarea",
          variableName: "source_input",
        },
      },
    ];
  }

  return [
    {
      kind: "user-text",
      payload: { text: prompt },
    },
    {
      kind: "assistant-text",
      payload: {
        text: "I have the original input. Next I need one focused follow-up answer before generating the final result.",
        markdown: false,
      },
    },
    {
      kind: "question-card",
      payload: {
        question: "What should I prioritize in the final output?",
        helperText: "For example: tone, audience, difficulty level, or target format.",
        inputType: "textarea",
        variableName: "follow_up_answer",
      },
    },
  ];
}

export const dialogueCardsTool: AiToolDefinition = {
  toolKey: "dialogue-cards",
  title: "Dialogue Cards",
  description: "Collect an initial prompt, ask a focused follow-up question, then produce a final AI-ready result.",
  icon: "MessagesSquare",
  category: "workflow",
  supportsStandalone: true,
  supportsWorksheetEmbedding: true,
  contextModes: ["standalone", "worksheet", "lesson"],
  async createRun(request: AiToolStartRequest, handlerContext: AiToolHandlerContext) {
    const initialInput = request.initialInput?.trim();

    if (initialInput) {
      const followUp = await generateFollowUpQuestion(initialInput, handlerContext.locale);

      return {
        state: {
          step: "waiting_for_follow_up",
          sourceInput: initialInput,
          followUpQuestion: followUp.question,
        },
        messages: [
          {
            kind: "user-text",
            payload: { text: initialInput },
          },
          {
            kind: "assistant-text",
            payload: {
              text:
                getResponseLanguage(handlerContext.locale) === "German"
                  ? "Ich habe den Ausgangstext. Eine gezielte Rückfrage reicht aus, um das Endergebnis deutlich zu verbessern."
                  : "I have the source input. One focused follow-up answer will improve the final result significantly.",
              markdown: false,
            },
          },
          {
            kind: "question-card",
            payload: {
              question: followUp.question,
              helperText: followUp.helperText,
              inputType: "textarea",
              variableName: "follow_up_answer",
            },
          },
        ],
      };
    }

    return {
      state: {
        step: "waiting_for_source_input",
        sourceInput: null,
      },
      messages: buildInitialMessages(request),
    };
  },
  async continueRun(
    run: Pick<AiToolRunRecord, "id" | "toolKey" | "context" | "state" | "status">,
    request: AiToolReplyRequest,
    handlerContext: AiToolHandlerContext
  ) {
    const input = request.input?.trim() || "";
    const step = typeof run.state.step === "string" ? run.state.step : "waiting_for_source_input";
    const sourceInput = typeof run.state.sourceInput === "string" ? run.state.sourceInput : "";

    if (!input) {
      return {
        state: run.state,
        messages: [
          {
            kind: "error-card",
            payload: {
              message:
                getResponseLanguage(handlerContext.locale) === "German"
                  ? "Bitte gib zuerst eine Antwort ein."
                  : "Please enter a reply first.",
            },
          },
        ],
      };
    }

    if (step === "waiting_for_source_input") {
      const followUp = await generateFollowUpQuestion(input, handlerContext.locale);

      return {
        state: {
          ...run.state,
          step: "waiting_for_follow_up",
          sourceInput: input,
          followUpQuestion: followUp.question,
        },
        messages: [
          {
            kind: "answer-card",
            payload: {
              label: "Original input",
              answer: input,
              variableName: "source_input",
            },
          },
          {
            kind: "question-card",
            payload: {
              question: followUp.question,
              helperText: followUp.helperText,
              inputType: "textarea",
              variableName: "follow_up_answer",
            },
          },
        ],
      };
    }

    const finalText = await generateFinalResult(sourceInput, input, handlerContext.locale);

    return {
      state: {
        ...run.state,
        step: "completed",
        followUpAnswer: input,
      },
      status: "completed",
      finalResult: {
        sourceInput,
        followUpAnswer: input,
        output: finalText,
      },
      messages: [
        {
          kind: "answer-card",
          payload: {
            label: "Priority",
            answer: input,
            variableName: "follow_up_answer",
          },
        },
        {
          kind: "review-card",
          payload: {
            title: "Collected inputs",
            items: [
              { label: "Original input", value: sourceInput },
              { label: "Priority", value: input },
            ],
          },
        },
        {
          kind: "result-card",
          payload: {
            title:
              getResponseLanguage(handlerContext.locale) === "German"
                ? "Ergebnis"
                : "Result",
            text: finalText,
            markdown: true,
          },
        },
      ],
    };
  },
  async streamContinueRun(
    run: Pick<AiToolRunRecord, "id" | "toolKey" | "context" | "state" | "status">,
    request: AiToolReplyRequest,
    handlerContext: AiToolHandlerContext
  ): Promise<AiToolStreamContinueResult> {
    const input = request.input?.trim() || "";
    const step = typeof run.state.step === "string" ? run.state.step : "waiting_for_source_input";
    const sourceInput = typeof run.state.sourceInput === "string" ? run.state.sourceInput : "";

    if (step !== "waiting_for_follow_up") {
      throw new Error("Streaming is only available for the final generation step.");
    }

    if (!input) {
      throw new Error(
        getResponseLanguage(handlerContext.locale) === "German"
          ? "Bitte gib zuerst eine Antwort ein."
          : "Please enter a reply first."
      );
    }

    const { system, prompt } = getFinalResultPrompt(sourceInput, input, handlerContext.locale);

    return {
      state: {
        ...run.state,
        step: "completed",
        followUpAnswer: input,
      },
      status: "completed",
      finalResult: {
        sourceInput,
        followUpAnswer: input,
      },
      prefixMessages: [
        {
          kind: "answer-card",
          payload: {
            label: "Priority",
            answer: input,
            variableName: "follow_up_answer",
          },
        },
        {
          kind: "review-card",
          payload: {
            title: "Collected inputs",
            items: [
              { label: "Original input", value: sourceInput },
              { label: "Priority", value: input },
            ],
          },
        },
      ],
      streamedMessage: {
        kind: "result-card",
        payload: {
          title:
            getResponseLanguage(handlerContext.locale) === "German"
              ? "Ergebnis"
              : "Result",
          text: "",
          markdown: true,
        },
      },
      textStream: streamGeneratedText(system, prompt),
    };
  },
};