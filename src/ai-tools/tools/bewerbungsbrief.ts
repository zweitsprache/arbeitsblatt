import Anthropic from "@anthropic-ai/sdk";
import {
  AiToolCreateRunResult,
  AiToolDefinition,
  AiToolHandlerContext,
  AiToolReplyRequest,
  AiToolRunRecord,
  AiToolStartRequest,
} from "@/ai-tools/types";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const DEFAULT_MODEL = "claude-sonnet-4-20250514";

const LANGUAGE_OPTIONS = [
  { value: "de", label: "Deutsch" },
  { value: "en", label: "English" },
  { value: "uk", label: "Ukrainisch / Ukrainian" },
  { value: "fr", label: "Franzosisch / French" },
  { value: "es", label: "Spanisch / Spanish" },
  { value: "it", label: "Italienisch / Italian" },
  { value: "pt", label: "Portugiesisch / Portuguese" },
  { value: "tr", label: "Turkisch / Turkish" },
  { value: "ar", label: "Arabisch / Arabic" },
  { value: "pl", label: "Polnisch / Polish" },
  { value: "ru", label: "Russisch / Russian" },
] as const;

const YES_NO_LABELS: Record<string, { yes: string; no: string }> = {
  de: { yes: "Ja", no: "Nein" },
  en: { yes: "Yes", no: "No" },
  uk: { yes: "Tak", no: "Ni" },
  fr: { yes: "Oui", no: "Non" },
  es: { yes: "Si", no: "No" },
  it: { yes: "Si", no: "No" },
  pt: { yes: "Sim", no: "Nao" },
  tr: { yes: "Evet", no: "Hayir" },
  ar: { yes: "Naam", no: "La" },
  pl: { yes: "Tak", no: "Nie" },
  ru: { yes: "Da", no: "Net" },
};

interface RequirementQuestion {
  id: string;
  label: string;
  questionDe: string;
  questionNative: string;
}

interface StoredRequirementAnswer {
  requirementId: string;
  label: string;
  questionDe: string;
  questionNative: string;
  answer: "yes" | "no";
}

function getLanguageLabel(code: string): string {
  return LANGUAGE_OPTIONS.find((option) => option.value === code)?.label ?? code;
}

function getSelectedLanguage(value: unknown) {
  return typeof value === "string"
    ? LANGUAGE_OPTIONS.find((option) => option.value === value)
    : undefined;
}

function getYesNoOptions(languageCode: string) {
  const native = YES_NO_LABELS[languageCode] ?? YES_NO_LABELS.en;
  return [
    { value: "yes", label: `Ja / ${native.yes}` },
    { value: "no", label: `Nein / ${native.no}` },
  ];
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

async function generateText(system: string, prompt: string) {
  const message = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 1400,
    system,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = message.content.find((content) => content.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from AI");
  }

  return textBlock.text.trim();
}

function normalizeRequirements(parsed: Record<string, unknown> | null): RequirementQuestion[] {
  const rawRequirements = parsed?.requirements;
  if (!Array.isArray(rawRequirements)) return [];

  return rawRequirements
    .map((entry, index) => {
      if (!entry || typeof entry !== "object") return null;
      const item = entry as Record<string, unknown>;
      if (
        typeof item.label !== "string" ||
        typeof item.questionDe !== "string" ||
        typeof item.questionNative !== "string"
      ) {
        return null;
      }

      return {
        id:
          typeof item.id === "string" && item.id.trim()
            ? item.id.trim()
            : `requirement_${index + 1}`,
        label: item.label.trim(),
        questionDe: item.questionDe.trim(),
        questionNative: item.questionNative.trim(),
      };
    })
    .filter((item): item is RequirementQuestion => item !== null)
    .slice(0, 8);
}

function normalizeStoredAnswers(value: unknown): StoredRequirementAnswer[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;

      const item = entry as Record<string, unknown>;
      if (
        typeof item.requirementId !== "string" ||
        typeof item.label !== "string" ||
        typeof item.questionDe !== "string" ||
        typeof item.questionNative !== "string" ||
        (item.answer !== "yes" && item.answer !== "no")
      ) {
        return null;
      }

      return {
        requirementId: item.requirementId,
        label: item.label,
        questionDe: item.questionDe,
        questionNative: item.questionNative,
        answer: item.answer,
      };
    })
    .filter((item): item is StoredRequirementAnswer => item !== null);
}

async function extractRequirements(jobAd: string, nativeLanguageCode: string): Promise<RequirementQuestion[]> {
  const nativeLanguageLabel = getLanguageLabel(nativeLanguageCode);
  const system = `You extract must-have requirements from German-speaking job ads and turn them into short yes/no interview questions.

Your job:
- Read the job ad carefully.
- Extract only explicit must-have requirements, not optional nice-to-haves.
- Return between 3 and 8 requirements.
- For each requirement, write:
  - a short label in German
  - one polite yes/no question in German starting with either "Haben Sie" or "Verfugen Sie uber"
  - the same yes/no question translated into ${nativeLanguageLabel}
- Keep the wording concise and specific to the ad.
- Do not invent requirements that are not present in the job ad.

Return valid JSON only in this exact shape:
{
  "requirements": [
    {
      "id": "req_1",
      "label": "...",
      "questionDe": "...",
      "questionNative": "..."
    }
  ]
}`;

  const prompt = `Native language: ${nativeLanguageLabel}\n\nJob ad:\n${jobAd}`;
  const text = await generateText(system, prompt);
  const requirements = normalizeRequirements(extractJsonObject(text));

  if (requirements.length > 0) {
    return requirements;
  }

  return [
    {
      id: "req_profile_match",
      label: "Passung zum Anforderungsprofil",
      questionDe: "Haben Sie die zentralen Muss-Anforderungen dieser Stellenanzeige bereits erfullt?",
      questionNative:
        nativeLanguageCode === "de"
          ? "Haben Sie die zentralen Muss-Anforderungen dieser Stellenanzeige bereits erfullt?"
          : "Do you already meet the core mandatory requirements from this job ad?",
    },
  ];
}

function buildNativeLanguageQuestion(): AiToolCreateRunResult["messages"] {
  return [
    {
      kind: "assistant-text",
      payload: {
        text: "Wir starten mit zwei Angaben: Ihrer Erstsprache und der Stellenanzeige. Danach frage ich die Muss-Kriterien einzeln als Ja/Nein-Dialog ab.",
        markdown: false,
      },
    },
    {
      kind: "question-card",
      payload: {
        question: "Was ist Ihre Erstsprache?",
        helperText: "Select your native language so I can ask the must-have questions bilingually.",
        inputType: "select",
        options: LANGUAGE_OPTIONS.map((option) => ({ label: option.label, value: option.value })),
        variableName: "native_language",
      },
    },
  ];
}

function buildRequirementQuestion(requirement: RequirementQuestion, languageCode: string) {
  return {
    kind: "question-card" as const,
    payload: {
      question: `${requirement.questionDe} / ${requirement.questionNative}`,
      helperText: requirement.label,
      inputType: "select" as const,
      options: getYesNoOptions(languageCode),
      variableName: `requirement_${requirement.id}`,
    },
  };
}

function getAnswerLabel(languageCode: string, answer: "yes" | "no") {
  const native = YES_NO_LABELS[languageCode] ?? YES_NO_LABELS.en;
  return answer === "yes" ? `Ja / ${native.yes}` : `Nein / ${native.no}`;
}

export const bewerbungsbriefTool: AiToolDefinition = {
  toolKey: "bewerbungsbrief",
  title: "Bewerbungsbrief",
  description: "Erfasst Erstsprache und Stellenanzeige, extrahiert Muss-Kriterien und fragt sie als bilingualen Ja/Nein-Dialog ab.",
  icon: "Mail",
  category: "workflow",
  supportsStandalone: true,
  supportsWorksheetEmbedding: true,
  contextModes: ["standalone", "worksheet", "lesson"],
  async createRun(request: AiToolStartRequest) {
    const initialInput = request.initialInput?.trim();
    const initialData =
      request.initialData && typeof request.initialData === "object"
        ? request.initialData
        : {};
    const selectedLanguage = getSelectedLanguage(initialData.nativeLanguage);
    const initialJobAd =
      typeof initialData.jobAd === "string" && initialData.jobAd.trim()
        ? initialData.jobAd.trim()
        : initialInput;

    if (selectedLanguage && initialJobAd) {
      const extractedRequirements = await extractRequirements(initialJobAd, selectedLanguage.value);

      return {
        state: {
          step: "waiting_for_requirement_answer",
          nativeLanguage: selectedLanguage.value,
          jobAd: initialJobAd,
          requirements: extractedRequirements,
          requirementIndex: 0,
          answers: [],
        },
        messages: [
          {
            kind: "answer-card",
            payload: {
              label: "Erstsprache",
              answer: selectedLanguage.label,
              variableName: "native_language",
            },
          },
          {
            kind: "answer-card",
            payload: {
              label: "Stellenanzeige",
              answer: initialJobAd,
              variableName: "job_ad",
            },
          },
          {
            kind: "assistant-text",
            payload: {
              text: `Ich habe ${extractedRequirements.length} Muss-Kriterien aus der Anzeige extrahiert. Ich frage sie jetzt einzeln ab.`,
              markdown: false,
            },
          },
          buildRequirementQuestion(extractedRequirements[0], selectedLanguage.value),
        ],
      };
    }

    if (!initialInput) {
      return {
        state: {
          step: "waiting_for_native_language",
          nativeLanguage: null,
          jobAd: null,
          requirements: [],
          answers: [],
        },
        messages: buildNativeLanguageQuestion(),
      };
    }

    return {
      state: {
        step: "waiting_for_native_language",
        nativeLanguage: null,
        jobAd: initialJobAd,
        requirements: [],
        answers: [],
      },
      messages: [
        {
          kind: "assistant-text",
          payload: {
            text: "Ich habe die Stellenanzeige bereits notiert. Wahlen Sie jetzt bitte Ihre Erstsprache fur die bilingualen Muss-Kriterien.",
            markdown: false,
          },
        },
        {
          kind: "question-card",
          payload: {
            question: "Was ist Ihre Erstsprache?",
            helperText: "Select your native language so I can ask the must-have questions bilingually.",
            inputType: "select",
            options: LANGUAGE_OPTIONS.map((option) => ({ label: option.label, value: option.value })),
            variableName: "native_language",
          },
        },
      ],
    };
  },
  async continueRun(
    run: Pick<AiToolRunRecord, "id" | "toolKey" | "context" | "state" | "status">,
    request: AiToolReplyRequest,
    handlerContext: AiToolHandlerContext
  ) {
    void handlerContext;
    const input = request.input?.trim() || "";
    const step =
      typeof run.state.step === "string" ? run.state.step : "waiting_for_native_language";
    const nativeLanguage =
      typeof run.state.nativeLanguage === "string" ? run.state.nativeLanguage : "";
    const jobAd = typeof run.state.jobAd === "string" ? run.state.jobAd : "";
    const requirements = Array.isArray(run.state.requirements)
      ? (run.state.requirements as RequirementQuestion[])
      : [];
    const answers = normalizeStoredAnswers(run.state.answers);
    const requirementIndex =
      typeof run.state.requirementIndex === "number" ? run.state.requirementIndex : 0;

    if (!input) {
      return {
        state: run.state,
        messages: [
          {
            kind: "error-card",
            payload: {
              message: "Bitte geben Sie zuerst eine Antwort ein.",
            },
          },
        ],
      };
    }

    if (step === "waiting_for_native_language") {
      const selectedLanguage = LANGUAGE_OPTIONS.find((option) => option.value === input);
      if (!selectedLanguage) {
        return {
          state: run.state,
          messages: [
            {
              kind: "error-card",
              payload: {
                message: "Bitte wahlen Sie eine Sprache aus der Liste aus.",
              },
            },
          ],
        };
      }

      if (jobAd) {
        const extractedRequirements = await extractRequirements(jobAd, selectedLanguage.value);

        return {
          state: {
            ...run.state,
            step: "waiting_for_requirement_answer",
            nativeLanguage: selectedLanguage.value,
            requirements: extractedRequirements,
            requirementIndex: 0,
            answers: [],
          },
          messages: [
            {
              kind: "answer-card",
              payload: {
                label: "Erstsprache",
                answer: selectedLanguage.label,
                variableName: "native_language",
              },
            },
            {
              kind: "assistant-text",
              payload: {
                text: `Ich habe ${extractedRequirements.length} Muss-Kriterien aus der Anzeige extrahiert. Ich frage sie jetzt einzeln ab.`,
                markdown: false,
              },
            },
            buildRequirementQuestion(extractedRequirements[0], selectedLanguage.value),
          ],
        };
      }

      return {
        state: {
          ...run.state,
          step: "waiting_for_job_ad",
          nativeLanguage: selectedLanguage.value,
        },
        messages: [
          {
            kind: "answer-card",
            payload: {
              label: "Erstsprache",
              answer: selectedLanguage.label,
              variableName: "native_language",
            },
          },
          {
            kind: "question-card",
            payload: {
              question: "Bitte fugen Sie jetzt die Stellenanzeige ein.",
              helperText: "Paste the full job ad so I can extract the must-have requirements.",
              inputType: "textarea",
              variableName: "job_ad",
            },
          },
        ],
      };
    }

    if (step === "waiting_for_job_ad") {
      const extractedRequirements = await extractRequirements(input, nativeLanguage || "en");

      return {
        state: {
          ...run.state,
          step: "waiting_for_requirement_answer",
          jobAd: input,
          requirements: extractedRequirements,
          requirementIndex: 0,
          answers: [],
        },
        messages: [
          {
            kind: "answer-card",
            payload: {
              label: "Stellenanzeige",
              answer: input,
              variableName: "job_ad",
            },
          },
          {
            kind: "assistant-text",
            payload: {
              text: `Ich habe ${extractedRequirements.length} Muss-Kriterien aus der Anzeige extrahiert. Ich frage sie jetzt einzeln ab.`,
              markdown: false,
            },
          },
          buildRequirementQuestion(extractedRequirements[0], nativeLanguage || "en"),
        ],
      };
    }

    if (step === "waiting_for_requirement_answer") {
      if (input !== "yes" && input !== "no") {
        return {
          state: run.state,
          messages: [
            {
              kind: "error-card",
              payload: {
                message: "Bitte antworten Sie mit Ja oder Nein.",
              },
            },
          ],
        };
      }

      const normalizedAnswer: "yes" | "no" = input === "yes" ? "yes" : "no";

      const currentRequirement = requirements[requirementIndex];
      if (!currentRequirement) {
        return {
          state: run.state,
          messages: [
            {
              kind: "error-card",
              payload: {
                message: "Es gibt keine offene Muss-Anforderung mehr in diesem Lauf.",
              },
            },
          ],
        };
      }

      const nextAnswers = [
        ...answers,
        {
          requirementId: currentRequirement.id,
          label: currentRequirement.label,
          questionDe: currentRequirement.questionDe,
          questionNative: currentRequirement.questionNative,
          answer: normalizedAnswer,
        },
      ];
      const nextRequirementIndex = requirementIndex + 1;
      const nextRequirement = requirements[nextRequirementIndex];

      if (nextRequirement) {
        return {
          state: {
            ...run.state,
            answers: nextAnswers,
            requirementIndex: nextRequirementIndex,
          },
          messages: [
            {
              kind: "answer-card",
              payload: {
                label: currentRequirement.label,
                answer: getAnswerLabel(nativeLanguage || "en", normalizedAnswer),
                variableName: currentRequirement.id,
              },
            },
            buildRequirementQuestion(nextRequirement, nativeLanguage || "en"),
          ],
        };
      }

      return {
        state: {
          ...run.state,
          step: "completed",
          answers: nextAnswers,
          requirementIndex: nextRequirementIndex,
        },
        status: "completed",
        finalResult: {
          nativeLanguage,
          jobAd,
          requirements,
          answers: nextAnswers,
        },
        messages: [
          {
            kind: "answer-card",
            payload: {
              label: currentRequirement.label,
              answer: getAnswerLabel(nativeLanguage || "en", normalizedAnswer),
              variableName: currentRequirement.id,
            },
          },
          {
            kind: "review-card",
            payload: {
              title: "Gespeicherte Muss-Kriterien",
              items: nextAnswers.map((answer) => ({
                label: answer.label,
                value: `${answer.questionDe} / ${answer.questionNative}\n${getAnswerLabel(nativeLanguage || "en", answer.answer)}`,
              })),
            },
          },
          {
            kind: "result-card",
            payload: {
              title: "Zwischenergebnis",
              text: "Die Antworten zu den Muss-Kriterien sind gespeichert. Im nachsten Schritt kann daraus der Bewerbungsbrief aufgebaut werden.",
              markdown: false,
            },
          },
        ],
      };
    }

    return {
      state: run.state,
      messages: [
        {
          kind: "error-card",
          payload: {
            message: "Der aktuelle Bewerbungsbrief-Lauf befindet sich in einem unbekannten Zustand.",
          },
        },
      ],
    };
  },
};