import Anthropic from "@anthropic-ai/sdk";
import { getBrandPromptContext } from "@/ai-tools/runtime/brand-context";
import {
  AiToolBrandProfile,
  AiToolCreateRunResult,
  AiToolContinueRunResult,
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

type RequirementGroup =
  | "formal_qualification"
  | "professional_experience"
  | "hard_skills"
  | "language_skills"
  | "soft_skills"
  | "other_requirements";

interface RequirementQuestion {
  id: string;
  label: string;
  group: RequirementGroup;
  questionDe: string;
  questionNative: string;
}

interface StoredRequirementAnswer {
  requirementId: string;
  label: string;
  group: RequirementGroup;
  questionDe: string;
  questionNative: string;
  answer: "yes" | "no";
  description: string | undefined;
}

const REQUIREMENT_GROUP_LABELS: Record<RequirementGroup, string> = {
  formal_qualification: "Ausbildung und formale Qualifikation",
  professional_experience: "Berufserfahrung",
  hard_skills: "Fachkompetenzen (Hard Skills)",
  language_skills: "Sprachkenntnisse",
  soft_skills: "Personliche Kompetenzen (Soft Skills)",
  other_requirements: "Sonstige Anforderungen",
};

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
    max_tokens: 1600,
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
  function normalizeGroup(
    rawRequirements: unknown,
    group: RequirementGroup,
    offset: number
  ): RequirementQuestion[] {
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
              : `${group}_${offset + index + 1}`,
          label: item.label.trim(),
          group,
          questionDe: item.questionDe.trim(),
          questionNative: item.questionNative.trim(),
        };
      })
      .filter((item): item is RequirementQuestion => item !== null);
  }

  const formalQualifications = normalizeGroup(
    parsed?.formalQualifications,
    "formal_qualification",
    0
  );
  const professionalExperience = normalizeGroup(
    parsed?.professionalExperience,
    "professional_experience",
    formalQualifications.length
  );
  const hardSkills = normalizeGroup(
    parsed?.hardSkills,
    "hard_skills",
    formalQualifications.length + professionalExperience.length
  );
  const languageSkills = normalizeGroup(
    parsed?.languageSkills,
    "language_skills",
    formalQualifications.length + professionalExperience.length + hardSkills.length
  );
  const softSkills = normalizeGroup(
    parsed?.softSkills,
    "soft_skills",
    formalQualifications.length + professionalExperience.length + hardSkills.length + languageSkills.length
  );
  const otherRequirements = normalizeGroup(
    parsed?.otherRequirements,
    "other_requirements",
    formalQualifications.length +
      professionalExperience.length +
      hardSkills.length +
      languageSkills.length +
      softSkills.length
  );

  return [
    ...formalQualifications,
    ...professionalExperience,
    ...hardSkills,
    ...languageSkills,
    ...softSkills,
    ...otherRequirements,
  ].slice(0, 14);
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
        (item.group !== "formal_qualification" &&
          item.group !== "professional_experience" &&
          item.group !== "hard_skills" &&
          item.group !== "language_skills" &&
          item.group !== "soft_skills" &&
          item.group !== "other_requirements") ||
        typeof item.questionDe !== "string" ||
        typeof item.questionNative !== "string" ||
        (item.answer !== "yes" && item.answer !== "no")
      ) {
        return null;
      }

      return {
        requirementId: item.requirementId,
        label: item.label,
        group: item.group,
        questionDe: item.questionDe,
        questionNative: item.questionNative,
        answer: item.answer,
        description: typeof item.description === "string" ? item.description : undefined,
      };
    })
    .filter((item): item is StoredRequirementAnswer => item !== null);
}

async function extractRequirements(jobAd: string, nativeLanguageCode: string): Promise<RequirementQuestion[]> {
  const nativeLanguageLabel = getLanguageLabel(nativeLanguageCode);
  const system = `You extract relevant qualification requirements from German-speaking job ads and turn them into short yes/no interview questions.

Your job:
- Read the job ad carefully.
- Classify extracted requirements into these six fixed groups:
  - formalQualifications: Schulabschluss, Lehre, Studium, Diplome, Zertifikate, Weiterbildungen
  - professionalExperience: Anzahl Jahre, Branchenerfahrung, Fuhrungserfahrung, Projekterfahrung
  - hardSkills: Fachwissen, Methodenkenntnisse, Tools, Software, technische Fahigkeiten
  - languageSkills: Muttersprache, Fremdsprachen, language levels like Deutsch C2 or Englisch B2
  - softSkills: Kommunikationsfahigkeit, Teamfahigkeit, Selbststandigkeit, Belastbarkeit, Flexibilitat
  - otherRequirements: Fuhrerschein, Reisebereitschaft, Arbeitsbewilligung, Wohnort, Verfugbarkeit, physical or scheduling constraints that do not fit better elsewhere
- Use the job ad wording to place each requirement into exactly one best-fitting group.
- If a category is not present, return an empty array for it.
- Prefer explicit requirements over vague employer marketing language.
- Return at most 3 items per category and at most 14 items total.
- For each requirement, write:
  - a short label in German
  - one polite yes/no question in German starting with either "Haben Sie" or "Verfugen Sie uber"
  - the same yes/no question translated into ${nativeLanguageLabel}
- Keep the wording concise and specific to the ad.
- Do not invent requirements that are not present in the job ad.

Return valid JSON only in this exact shape:
{
  "formalQualifications": [
    {
      "id": "formal_1",
      "label": "...",
      "questionDe": "...",
      "questionNative": "..."
    }
  ],
  "professionalExperience": [
    {
      "id": "experience_1",
      "label": "...",
      "questionDe": "...",
      "questionNative": "..."
    }
  ],
  "hardSkills": [
    {
      "id": "hard_1",
      "label": "...",
      "questionDe": "...",
      "questionNative": "..."
    }
  ],
  "languageSkills": [
    {
      "id": "language_1",
      "label": "...",
      "questionDe": "...",
      "questionNative": "..."
    }
  ],
  "softSkills": [
    {
      "id": "soft_1",
      "label": "...",
      "questionDe": "...",
      "questionNative": "..."
    }
  ],
  "otherRequirements": [
    {
      "id": "other_1",
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
      group: "formal_qualification",
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
        text: "Wir starten mit zwei Angaben: Ihrer Erstsprache und der Stellenanzeige. Danach frage ich die Anforderungsgruppen einzeln als Ja/Nein-Dialog ab.",
        markdown: false,
      },
    },
    {
      kind: "question-card",
      payload: {
        question: "Was ist Ihre Erstsprache?",
        helperText: "Select your native language so I can ask the qualification questions bilingually.",
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
      question: requirement.questionDe,
      helperText: requirement.questionNative,
      sectionLabel: REQUIREMENT_GROUP_LABELS[requirement.group],
      inputType: "select" as const,
      choiceStyle: "buttons" as const,
      submitMode: "immediate" as const,
      options: getYesNoOptions(languageCode),
      variableName: `requirement_${requirement.id}`,
    },
  };
}

function buildFollowUpPrompt(requirement: RequirementQuestion) {
  const normalizedLabel = requirement.label.toLowerCase();
  const mentionsCertificate =
    normalizedLabel.includes("zert") ||
    normalizedLabel.includes("zertif") ||
    normalizedLabel.includes("diplom") ||
    normalizedLabel.includes("abschluss") ||
    normalizedLabel.includes("qualifikation");
  const mentionsLanguage =
    normalizedLabel.includes("deutsch") ||
    normalizedLabel.includes("engl") ||
    normalizedLabel.includes("sprache") ||
    normalizedLabel.includes("c1") ||
    normalizedLabel.includes("c2") ||
    normalizedLabel.includes("b1") ||
    normalizedLabel.includes("b2");
  const mentionsExperience =
    normalizedLabel.includes("erfahrung") ||
    normalizedLabel.includes("projekt") ||
    normalizedLabel.includes("beruf") ||
    normalizedLabel.includes("praxis") ||
    normalizedLabel.includes("lead") ||
    normalizedLabel.includes("fuhr");

  if (mentionsCertificate || requirement.group === "formal_qualification") {
    return {
      question: `Wann haben Sie ${requirement.label} erworben?`,
      helperText: `Nennen Sie kurz Abschluss, Zertifikat oder Weiterbildung und wann Sie diese Qualifikation erhalten haben.`,
      placeholder: "Zum Beispiel: IHK-Zertifikat 2023, Weiterbildung im Mai 2024 abgeschlossen.",
    };
  }

  if (mentionsLanguage || requirement.group === "language_skills") {
    return {
      question: `Wie nutzen Sie ${requirement.label} in der Praxis?`,
      helperText: "Beschreiben Sie kurz Ihr Niveau und in welchen beruflichen Situationen Sie die Sprache anwenden.",
      placeholder: "Zum Beispiel: Deutsch C1, taegliche Kommunikation mit Kund:innen und schriftliche Dokumentation.",
    };
  }

  if (mentionsExperience || requirement.group === "professional_experience") {
    return {
      question: `Beschreiben Sie kurz Ihre Erfahrung mit ${requirement.label}.`,
      helperText: "Welche Aufgaben haben Sie dabei ubernommen und in welchem Kontext?",
      placeholder: "Zum Beispiel: 3 Jahre Erfahrung in der Logistik, Planung von Touren und Koordination mit dem Lagerteam.",
    };
  }

  if (requirement.group === "hard_skills") {
    return {
      question: `Wie haben Sie ${requirement.label} bisher eingesetzt?`,
      helperText: "Beschreiben Sie kurz Aufgaben, Tools oder konkrete Anwendungsfalle.",
      placeholder: "Zum Beispiel: Arbeit mit Excel fur Auswertungen, Terminplanung und Reporting im Tagesgeschaft.",
    };
  }

  if (requirement.group === "soft_skills") {
    return {
      question: `Woran zeigt sich ${requirement.label} in Ihrer Arbeit?`,
      helperText: "Nennen Sie kurz eine Situation oder Aufgabe, in der diese personliche Kompetenz wichtig war.",
      placeholder: "Zum Beispiel: Ruhige Kommunikation mit Kund:innen auch in stressigen Situationen.",
    };
  }

  return {
    question: `Bitte erlautern Sie kurz ${requirement.label}.`,
    helperText: "Geben Sie kurz an, wie diese Anforderung bei Ihnen konkret erfullt ist.",
    placeholder: "Zum Beispiel: Seit 2022 Fuhrerschein Klasse B und sofort verfugbar fur Schichtarbeit.",
  };
}

function buildDescriptionQuestion(requirement: RequirementQuestion) {
  const followUp = buildFollowUpPrompt(requirement);

  return {
    kind: "question-card" as const,
    payload: {
      question: followUp.question,
      helperText: followUp.helperText,
      sectionLabel: REQUIREMENT_GROUP_LABELS[requirement.group],
      inputType: "textarea" as const,
      placeholder: followUp.placeholder,
      variableName: `requirement_description_${requirement.id}`,
    },
  };
}

function getAnswerLabel(languageCode: string, answer: "yes" | "no") {
  const native = YES_NO_LABELS[languageCode] ?? YES_NO_LABELS.en;
  return answer === "yes" ? `Ja / ${native.yes}` : `Nein / ${native.no}`;
}

function buildAnswersReviewItems(answers: StoredRequirementAnswer[], languageCode: string) {
  return answers.map((answer) => ({
    label: `${REQUIREMENT_GROUP_LABELS[answer.group]}: ${answer.label}`,
    value: `${answer.questionDe} / ${answer.questionNative}\n${getAnswerLabel(languageCode, answer.answer)}${answer.description ? `\n${answer.description}` : ""}`,
  }));
}

async function generateApplicationLetterDraft(
  jobAd: string,
  answers: StoredRequirementAnswer[],
  nativeLanguage: string,
  brandProfile?: AiToolBrandProfile
) {
  const positiveAnswers = answers.filter((answer) => answer.answer === "yes");
  const brandContext = getBrandPromptContext(brandProfile);
  const positiveSummary = positiveAnswers
    .map((answer) => {
      const detail = answer.description?.trim();
      return `- ${REQUIREMENT_GROUP_LABELS[answer.group]} | ${answer.label}${detail ? `: ${detail}` : ""}`;
    })
    .join("\n");
  const negativeSummary = answers
    .filter((answer) => answer.answer === "no")
    .map((answer) => `- ${REQUIREMENT_GROUP_LABELS[answer.group]} | ${answer.label}`)
    .join("\n");

  const system = `You write a first draft of a professional German job application letter (Bewerbungsschreiben / Anschreiben).

Rules:
- Write in German.
- Use only information supported by the job ad and the confirmed applicant answers.
- Do not invent names, employers, dates, achievements, or qualifications.
- If company name or contact person is missing, use generic wording like "Sehr geehrte Damen und Herren".
- Keep the tone professional, credible, and specific.
- Structure the output as a complete short cover letter with salutation, 2 to 4 short paragraphs, and a polite closing.
- Emphasize confirmed strengths from the applicant answers.
- Do not mention requirements the applicant answered with "no" unless necessary; if there are few confirmed matches, stay honest and motivation-focused.
- Do not add bullet points. Return plain letter text only.
- If a brand profile is provided, align tone and wording with that brand where useful.
- Do not mention internal brand settings, fonts, or colors in the letter unless the task explicitly requires it.`;

  const prompt = `${brandContext ? `${brandContext}\n\n` : ""}Applicant native language: ${getLanguageLabel(nativeLanguage)}

Job ad:
${jobAd}

Confirmed matching qualifications:
${positiveSummary || "- No confirmed yes answers were captured."}

Requirements answered with no:
${negativeSummary || "- None"}`;

  try {
    return await generateText(system, prompt);
  } catch {
    const intro = "Sehr geehrte Damen und Herren,";
    const body = positiveAnswers.length
      ? `mit grossem Interesse bewerbe ich mich auf die ausgeschriebene Position. Besonders passend zu Ihrem Anforderungsprofil sind meine Erfahrungen und Qualifikationen in den Bereichen ${positiveAnswers
          .slice(0, 3)
          .map((answer) => answer.label)
          .join(", ")}.`
      : "mit grossem Interesse bewerbe ich mich auf die ausgeschriebene Position. Die beschriebenen Aufgaben und Anforderungen sprechen mich sehr an.";
    const detail = positiveAnswers
      .slice(0, 2)
      .map((answer) => answer.description?.trim())
      .filter((entry): entry is string => Boolean(entry))
      .join(" ");

    return [
      intro,
      "",
      body,
      detail,
      "Gerne mochte ich meine Motivation und meine Eignung in einem personlichen Gesprach naher erlautern.",
      "",
      "Mit freundlichen Grussen",
      "[Ihr Name]",
    ]
      .filter(Boolean)
      .join("\n");
  }
}

async function buildCompletedRunResult({
  runState,
  nativeLanguage,
  jobAd,
  requirements,
  answers,
  requirementIndex,
  brandProfile,
}: {
  runState: Record<string, unknown>;
  nativeLanguage: string;
  jobAd: string;
  requirements: RequirementQuestion[];
  answers: StoredRequirementAnswer[];
  requirementIndex: number;
  brandProfile?: AiToolBrandProfile;
}): Promise<AiToolContinueRunResult> {
  const draft = await generateApplicationLetterDraft(
    jobAd,
    answers,
    nativeLanguage || "de",
    brandProfile
  );

  return {
    state: {
      ...runState,
      step: "completed",
      pendingRequirementId: null,
      answers,
      requirementIndex,
      draft,
    },
    status: "completed",
    finalResult: {
      nativeLanguage,
      jobAd,
      requirements,
      answers,
      draft,
    },
    messages: [
      {
        kind: "review-card",
        payload: {
          title: "Gespeicherte Anforderungsgruppen",
          items: buildAnswersReviewItems(answers, nativeLanguage || "en"),
        },
      },
      {
        kind: "result-card",
        payload: {
          title: "Entwurf Bewerbungsbrief",
          text: draft,
          markdown: true,
        },
      },
    ],
  };
}

export const bewerbungsbriefTool: AiToolDefinition = {
  toolKey: "bewerbungsbrief",
  title: "Bewerbungsbrief",
  description:
    "Erfasst Erstsprache und Stellenanzeige, extrahiert Qualifikationsgruppen und fragt sie als bilingualen Ja/Nein-Dialog ab.",
  icon: "Mail",
  category: "workflow",
  supportsStandalone: true,
  supportsWorksheetEmbedding: true,
  contextModes: ["standalone", "worksheet", "lesson"],
  async createRun(request: AiToolStartRequest) {
    const initialInput = request.initialInput?.trim();
    const initialData =
      request.initialData && typeof request.initialData === "object"
        ? (request.initialData as Record<string, unknown>)
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
          pendingRequirementId: null,
        },
        messages: [buildRequirementQuestion(extractedRequirements[0], selectedLanguage.value)],
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
          pendingRequirementId: null,
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
        pendingRequirementId: null,
      },
      messages: [
        {
          kind: "assistant-text",
          payload: {
            text: "Ich habe die Stellenanzeige bereits notiert. Wahlen Sie jetzt bitte Ihre Erstsprache fur die bilingualen Fragen.",
            markdown: false,
          },
        },
        {
          kind: "question-card",
          payload: {
            question: "Was ist Ihre Erstsprache?",
            helperText: "Select your native language so I can ask the qualification questions bilingually.",
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
    const pendingRequirementId =
      typeof run.state.pendingRequirementId === "string" ? run.state.pendingRequirementId : "";

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
            pendingRequirementId: null,
          },
          messages: [buildRequirementQuestion(extractedRequirements[0], selectedLanguage.value)],
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
              helperText:
                "Paste the full job ad so I can extract the qualification categories from it.",
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
          pendingRequirementId: null,
        },
        messages: [buildRequirementQuestion(extractedRequirements[0], nativeLanguage || "en")],
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

      const currentRequirement = requirements[requirementIndex];
      if (!currentRequirement) {
        return {
          state: run.state,
          messages: [
            {
              kind: "error-card",
              payload: {
                message: "Es gibt keine offene Anforderung mehr in diesem Lauf.",
              },
            },
          ],
        };
      }

      const nextAnswers: StoredRequirementAnswer[] = [
        ...answers,
        {
          requirementId: currentRequirement.id,
          label: currentRequirement.label,
          group: currentRequirement.group,
          questionDe: currentRequirement.questionDe,
          questionNative: currentRequirement.questionNative,
          answer: input,
          description: undefined,
        },
      ];

      if (input === "yes") {
        return {
          state: {
            ...run.state,
            step: "waiting_for_requirement_description",
            pendingRequirementId: currentRequirement.id,
            answers: nextAnswers,
          },
          messages: [buildDescriptionQuestion(currentRequirement)],
        };
      }

      const nextRequirementIndex = requirementIndex + 1;
      const nextRequirement = requirements[nextRequirementIndex];

      if (nextRequirement) {
        return {
          state: {
            ...run.state,
            answers: nextAnswers,
            requirementIndex: nextRequirementIndex,
            pendingRequirementId: null,
          },
          messages: [buildRequirementQuestion(nextRequirement, nativeLanguage || "en")],
        };
      }

      return buildCompletedRunResult({
        runState: run.state,
        nativeLanguage,
        jobAd,
        requirements,
        answers: nextAnswers,
        requirementIndex: nextRequirementIndex,
        brandProfile: handlerContext.brandProfile,
      });
    }

    if (step === "waiting_for_requirement_description") {
      const currentRequirement = requirements.find((requirement) => requirement.id === pendingRequirementId);
      if (!currentRequirement) {
        return {
          state: run.state,
          messages: [
            {
              kind: "error-card",
              payload: {
                message: "Die Beschreibung konnte keiner offenen Anforderung zugeordnet werden.",
              },
            },
          ],
        };
      }

      const nextAnswers = answers.map((answer) =>
        answer.requirementId === currentRequirement.id
          ? {
              ...answer,
              description: input,
            }
          : answer
      );
      const nextRequirementIndex = requirementIndex + 1;
      const nextRequirement = requirements[nextRequirementIndex];

      if (nextRequirement) {
        return {
          state: {
            ...run.state,
            step: "waiting_for_requirement_answer",
            pendingRequirementId: null,
            answers: nextAnswers,
            requirementIndex: nextRequirementIndex,
          },
          messages: [buildRequirementQuestion(nextRequirement, nativeLanguage || "en")],
        };
      }

      return buildCompletedRunResult({
        runState: run.state,
        nativeLanguage,
        jobAd,
        requirements,
        answers: nextAnswers,
        requirementIndex: nextRequirementIndex,
        brandProfile: handlerContext.brandProfile,
      });
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