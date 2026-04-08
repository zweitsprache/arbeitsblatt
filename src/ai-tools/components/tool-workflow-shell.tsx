"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import { Bot, Loader2, RotateCcw, Send } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  AiToolMessageRecord,
  AiToolMessageRole,
  AiToolPublicMetadata,
  AiToolRunRecord,
} from "@/ai-tools/types";
import { AiToolBlock } from "@/types/worksheet";

const BEWERBUNGSBRIEF_LANGUAGE_OPTIONS = [
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

interface ToolWorkflowShellProps {
  block: AiToolBlock;
}

interface ChoiceOption {
  label: string;
  value: string;
}

interface StoredRequirementAnswerView {
  requirementId: string;
  answer: string;
  description: string | undefined;
}

interface ActiveAiToolBrand {
  id: string;
  name: string;
  primaryColor: string;
  accentColor?: string;
}

function MarkdownText({ text }: { text: string }) {
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        ul: ({ children }) => <ul className="list-disc pl-4 mb-2 last:mb-0 space-y-0.5">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 last:mb-0 space-y-0.5">{children}</ol>,
        li: ({ children }) => <li>{children}</li>,
        code: ({ children }) => <code className="bg-background/50 px-1 py-0.5 rounded text-[0.9em]">{children}</code>,
      }}
    >
      {text}
    </ReactMarkdown>
  );
}

export function ToolWorkflowShell({ block }: ToolWorkflowShellProps) {
  const t = useTranslations("viewer");
  const searchParams = useSearchParams();
  const [toolMeta, setToolMeta] = React.useState<AiToolPublicMetadata | null>(null);
  const [run, setRun] = React.useState<AiToolRunRecord | null>(null);
  const [initialInput, setInitialInput] = React.useState("");
  const [startNativeLanguage, setStartNativeLanguage] = React.useState("");
  const [startJobAd, setStartJobAd] = React.useState("");
  const [replyInput, setReplyInput] = React.useState("");
  const [loadingMeta, setLoadingMeta] = React.useState(true);
  const [loadingRun, setLoadingRun] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [resumeDisabled, setResumeDisabled] = React.useState(false);
  const [activeBrand, setActiveBrand] = React.useState<ActiveAiToolBrand | null>(null);

  const activeQuestion = React.useMemo(() => {
    if (!run?.messages?.length || run.status !== "active") return null;

    const lastMessage = run.messages[run.messages.length - 1];
    if (lastMessage.kind !== "question-card") return null;

    const payload = lastMessage.payload;
    if (!("question" in payload) || typeof payload.question !== "string") return null;

    const inputType =
      "inputType" in payload && typeof payload.inputType === "string"
        ? payload.inputType
        : "textarea";
    const options =
      "options" in payload && Array.isArray(payload.options)
        ? payload.options.filter(
            (option): option is { label: string; value: string } =>
              !!option &&
              typeof option === "object" &&
              "label" in option &&
              typeof option.label === "string" &&
              "value" in option &&
              typeof option.value === "string"
          )
        : [];

    const choiceStyle =
      "choiceStyle" in payload && payload.choiceStyle === "buttons"
        ? "buttons"
        : "dropdown";
    const submitMode =
      "submitMode" in payload && payload.submitMode === "immediate"
        ? "immediate"
        : "manual";
    const sectionLabel =
      "sectionLabel" in payload && typeof payload.sectionLabel === "string"
        ? payload.sectionLabel
        : undefined;
    const placeholder =
      "placeholder" in payload && typeof payload.placeholder === "string"
        ? payload.placeholder
        : undefined;

    return {
      inputType: inputType === "select" || inputType === "text" ? inputType : "textarea",
      options,
      choiceStyle,
      submitMode,
      sectionLabel,
      placeholder,
      variableName:
        "variableName" in payload && typeof payload.variableName === "string"
          ? payload.variableName
          : undefined,
    };
  }, [run]);

  const storedRequirementAnswers = React.useMemo(() => {
    const rawAnswers = run?.state?.answers;
    if (!Array.isArray(rawAnswers)) return [] as StoredRequirementAnswerView[];

    return rawAnswers
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null;
        const item = entry as Record<string, unknown>;
        if (typeof item.requirementId !== "string" || typeof item.answer !== "string") {
          return null;
        }

        return {
          requirementId: item.requirementId,
          answer: item.answer,
          description: typeof item.description === "string" ? item.description : undefined,
        };
      })
      .filter((item): item is StoredRequirementAnswerView => item !== null);
  }, [run?.state]);

  const isBewerbungsbrief = block.toolKey === "bewerbungsbrief";
  const brandProfileId = React.useMemo(() => {
    const value = searchParams.get("brand")?.trim();
    return value || undefined;
  }, [searchParams]);
  const primaryButtonStyle = React.useMemo(() => {
    const buttonColor = activeBrand?.accentColor || activeBrand?.primaryColor;
    if (!buttonColor) return undefined;

    return {
      background: buttonColor,
      boxShadow: `0 14px 28px ${buttonColor}40`,
    } as React.CSSProperties;
  }, [activeBrand]);

  const canStartRun = isBewerbungsbrief ? Boolean(startNativeLanguage && startJobAd.trim()) : true;
  const visibleMessages = React.useMemo(() => {
    if (!run?.messages?.length) return [] as AiToolMessageRecord[];

    if (run.status !== "active") {
      return run.messages;
    }

    const lastMessage = run.messages[run.messages.length - 1];
    if (lastMessage?.kind !== "question-card") {
      return run.messages;
    }

    return run.messages.filter((message) => message.id !== lastMessage.id);
  }, [run]);

  React.useEffect(() => {
    let cancelled = false;

    async function loadBrandProfile() {
      if (!brandProfileId) {
        setActiveBrand(null);
        return;
      }

      try {
        const res = await fetch(`/api/brands/${brandProfileId}`, {
          credentials: "include",
        });

        if (!res.ok) {
          if (!cancelled) setActiveBrand(null);
          return;
        }

        const data = (await res.json()) as Record<string, unknown>;
        if (cancelled) return;

        setActiveBrand(
          typeof data.id === "string" &&
            typeof data.name === "string" &&
            typeof data.primaryColor === "string"
            ? {
                id: data.id,
                name: data.name,
                primaryColor: data.primaryColor,
                        accentColor:
                          typeof data.accentColor === "string" ? data.accentColor : undefined,
              }
            : null
        );
      } catch {
        if (!cancelled) setActiveBrand(null);
      }
    }

    void loadBrandProfile();

    return () => {
      cancelled = true;
    };
  }, [brandProfileId]);

  const bewerbungsbriefActiveQuestion = React.useMemo(() => {
    if (!isBewerbungsbrief || !run?.messages?.length || run.status !== "active") return null;

    const lastMessage = run.messages[run.messages.length - 1];
    if (lastMessage.kind !== "question-card") return null;
    return lastMessage;
  }, [isBewerbungsbrief, run]);

  const bewerbungsbriefProgress = React.useMemo(() => {
    if (!isBewerbungsbrief || !run) return null;

    const rawRequirements = Array.isArray(run.state.requirements) ? run.state.requirements : [];
    const total = rawRequirements.length;
    const completed = storedRequirementAnswers.filter(
      (answer) => answer.answer === "no" || Boolean(answer.description?.trim())
    ).length;
    const step = typeof run.state.step === "string" ? run.state.step : "";
    const current =
      total > 0
        ? step === "waiting_for_requirement_description"
          ? Math.min(completed + 1, total)
          : Math.min(completed + 1, total)
        : 0;

    return {
      total,
      completed,
      current,
      percent: total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0,
    };
  }, [isBewerbungsbrief, run, storedRequirementAnswers]);

  const submitReply = async (overrideInput?: string, suppressUserMessage = false) => {
    if (!run || submitting || run.status !== "active") return;

    const input = (overrideInput ?? replyInput).trim();
    if (!input) return;

    setSubmitting(true);
    setError(null);

    const shouldStream = run.state.step === "waiting_for_follow_up";

    try {
      if (shouldStream) {
        const res = await fetch(`/api/ai-tools/runs/${run.id}/stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            input,
            expectedSequence: run.messages?.at(-1)?.sequence,
          }),
        });

        if (res.status === 401) {
          setError(t("aiToolLoginRequired"));
          return;
        }

        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
          throw new Error(body.error || `HTTP ${res.status}`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No stream reader available");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";

          for (const part of parts) {
            const line = part
              .split("\n")
              .find((segment) => segment.startsWith("data: "));
            if (!line) continue;

            const payload = JSON.parse(line.slice(6)) as
              | { type: "ack"; messages: AiToolRunRecord["messages"] }
              | { type: "delta"; text: string }
              | { type: "done"; run: AiToolRunRecord }
              | { type: "error"; error: string };

            if (payload.type === "ack") {
              setRun((prev) => {
                if (!prev) return prev;

                const optimisticMessages: AiToolMessageRecord[] = (payload.messages || []).map(
                  (message, index) => {
                    const role: AiToolMessageRole =
                      message.kind === "user-text" || message.kind === "answer-card"
                        ? "user"
                        : message.kind === "system-status"
                          ? "system"
                          : "assistant";

                    return {
                      id: `optimistic-${prev.id}-${Date.now()}-${index}`,
                      runId: prev.id,
                      role,
                      kind: message.kind,
                      payload: message.payload,
                      sequence: (prev.messages?.at(-1)?.sequence ?? -1) + index + 1,
                      createdAt: new Date().toISOString(),
                    };
                  }
                );

                return {
                  ...prev,
                  messages: [...(prev.messages || []), ...optimisticMessages],
                };
              });
              setReplyInput("");
            }

            if (payload.type === "delta") {
              setRun((prev) => {
                if (!prev?.messages?.length) return prev;

                const nextMessages = [...prev.messages];
                const lastMessage = nextMessages[nextMessages.length - 1];
                if (!lastMessage || lastMessage.kind !== "result-card") return prev;

                const currentText =
                  "text" in lastMessage.payload && typeof lastMessage.payload.text === "string"
                    ? lastMessage.payload.text
                    : "";

                nextMessages[nextMessages.length - 1] = {
                  ...lastMessage,
                  payload: {
                    ...lastMessage.payload,
                    text: currentText + payload.text,
                  },
                };

                return {
                  ...prev,
                  messages: nextMessages,
                };
              });
            }

            if (payload.type === "done") {
              setRun(payload.run);
            }

            if (payload.type === "error") {
              throw new Error(payload.error);
            }
          }
        }
      } else {
        const res = await fetch(`/api/ai-tools/runs/${run.id}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            input,
            suppressUserMessage,
            expectedSequence: run.messages?.at(-1)?.sequence,
          }),
        });

        if (res.status === 401) {
          setError(t("aiToolLoginRequired"));
          return;
        }

        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
          throw new Error(body.error || `HTTP ${res.status}`);
        }

        const data = (await res.json()) as AiToolRunRecord;
        setRun(data);
        setReplyInput("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("tryAgain"));
    } finally {
      setSubmitting(false);
    }
  };

  React.useEffect(() => {
    if (!activeQuestion) return;

    if (activeQuestion.inputType === "select") {
      const isValidOption = activeQuestion.options.some((option) => option.value === replyInput);
      if (!isValidOption) {
        setReplyInput("");
      }
      return;
    }

    if (replyInput && activeQuestion.inputType !== "select") {
      return;
    }
  }, [activeQuestion, replyInput]);

  const contextMode = React.useMemo(
    () => (block.id.startsWith("standalone-") ? "standalone" : "worksheet"),
    [block.id]
  );

  const isStandaloneBewerbungsbrief = isBewerbungsbrief && contextMode === "standalone";

  React.useEffect(() => {
    let cancelled = false;

    async function loadRegistry() {
      setLoadingMeta(true);
      setError(null);
      try {
        const res = await fetch("/api/ai-tools/registry", {
          credentials: "include",
        });

        if (res.status === 401) {
          if (!cancelled) setError(t("aiToolLoginRequired"));
          return;
        }

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = (await res.json()) as AiToolPublicMetadata[];
        const matched = data.find((item) => item.toolKey === block.toolKey) || null;

        if (!cancelled) {
          setToolMeta(matched);
          if (!matched) setError(t("aiToolNotFound"));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t("aiToolNotFound"));
        }
      } finally {
        if (!cancelled) setLoadingMeta(false);
      }
    }

    if (!block.toolKey) {
      setLoadingMeta(false);
      setToolMeta(null);
      return;
    }

    loadRegistry();

    return () => {
      cancelled = true;
    };
  }, [block.toolKey, t]);

  React.useEffect(() => {
    let cancelled = false;

    async function loadLatestRun() {
      if (!block.toolKey || !toolMeta || resumeDisabled || contextMode === "standalone") return;

      setLoadingRun(true);
      try {
        const params = new URLSearchParams({
          toolKey: block.toolKey,
          mode: contextMode,
        });

        if (block.latestRunId) {
          params.set("runId", block.latestRunId);
        }

        if (contextMode === "worksheet") {
          params.set("worksheetBlockId", block.id);
        }

        if (brandProfileId) {
          params.set("brandProfileId", brandProfileId);
        }

        const res = await fetch(`/api/ai-tools/runs?${params.toString()}`, {
          credentials: "include",
        });

        if (res.status === 401) {
          if (!cancelled) setError(t("aiToolLoginRequired"));
          return;
        }

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = (await res.json()) as AiToolRunRecord | null;
        if (!cancelled && data) {
          setRun(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t("tryAgain"));
        }
      } finally {
        if (!cancelled) setLoadingRun(false);
      }
    }

    loadLatestRun();

    return () => {
      cancelled = true;
    };
  }, [block.id, block.latestRunId, block.toolKey, brandProfileId, contextMode, resumeDisabled, t, toolMeta]);

  const createRun = async () => {
    if (!block.toolKey || submitting) return;
    setResumeDisabled(false);
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/ai-tools/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          toolKey: block.toolKey,
          context: {
            mode: contextMode,
            worksheetBlockId: contextMode === "worksheet" ? block.id : undefined,
            metadata: {
              brandProfileId,
            },
          },
          initialInput: isBewerbungsbrief ? undefined : initialInput.trim() || undefined,
          initialData: isBewerbungsbrief
            ? {
                nativeLanguage: startNativeLanguage || undefined,
                jobAd: startJobAd.trim() || undefined,
              }
            : undefined,
          blockOverrides: {
            title: block.toolTitle || undefined,
            description: block.toolDescription || undefined,
          },
        }),
      });

      if (res.status === 401) {
        setError(t("aiToolLoginRequired"));
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(body.error || `HTTP ${res.status}`);
      }

      const data = (await res.json()) as AiToolRunRecord;
      setRun(data);
      setInitialInput("");
      setStartNativeLanguage("");
      setStartJobAd("");
      setReplyInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("tryAgain"));
    } finally {
      setSubmitting(false);
    }
  };

  const sendReply = async () => {
    await submitReply();
  };

  const resetRun = () => {
    setResumeDisabled(true);
    setRun(null);
    setInitialInput("");
    setStartNativeLanguage("");
    setStartJobAd("");
    setReplyInput("");
    setError(null);
  };

  if (loadingMeta || loadingRun) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
      </div>
    );
  }

  if (!block.toolKey || !toolMeta) {
    return (
      <div className="text-cv-sm text-muted-foreground text-center py-4">
        {error || t("aiToolNotConfigured")}
      </div>
    );
  }

  const title = block.toolTitle || toolMeta.title;
  const description = block.toolDescription || toolMeta.description;

  if (isStandaloneBewerbungsbrief) {
    const activeQuestionPayload =
      bewerbungsbriefActiveQuestion && "question" in bewerbungsbriefActiveQuestion.payload
        ? bewerbungsbriefActiveQuestion.payload
        : null;
    const activeQuestionText =
      activeQuestionPayload && typeof activeQuestionPayload.question === "string"
        ? activeQuestionPayload.question
        : null;
    const activeQuestionTranslation =
      activeQuestionPayload && typeof activeQuestionPayload.helperText === "string"
        ? activeQuestionPayload.helperText
        : null;
    const activeQuestionSection =
      activeQuestionPayload && typeof activeQuestionPayload.sectionLabel === "string"
        ? activeQuestionPayload.sectionLabel
        : null;
    const activeQuestionPlaceholder =
      activeQuestionPayload && typeof activeQuestionPayload.placeholder === "string"
        ? activeQuestionPayload.placeholder
        : undefined;
    const activeOptions =
      activeQuestionPayload && Array.isArray(activeQuestionPayload.options)
        ? activeQuestionPayload.options.filter(
            (option): option is ChoiceOption =>
              !!option &&
              typeof option === "object" &&
              "label" in option &&
              typeof option.label === "string" &&
              "value" in option &&
              typeof option.value === "string"
          )
        : [];

    return (
      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="space-y-6 p-6 sm:p-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-sm border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
              <Bot className="h-3.5 w-3.5" />
              Bewerbungsbrief
            </div>
            <div className="max-w-2xl space-y-3">
              <h1 className="text-cv-2xl font-semibold leading-tight text-slate-900">
                Schreiben Sie Ihren Bewerbungsbrief Schritt fur Schritt.
              </h1>
            </div>
          </div>

          {error && (
            <div className="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-cv-sm text-red-700">
              {error}
            </div>
          )}

          {!run ? (
            <div className="max-w-3xl">
              <div className="rounded-sm border border-slate-200 bg-white p-5 sm:p-6">
                <div className="mb-5 space-y-2">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Start
                  </div>
                  <h2 className="text-cv-lg font-semibold text-slate-900">Ihre Ausgangsdaten</h2>
                </div>

                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-cv-sm font-medium text-slate-700">Erstsprache</label>
                    <select
                      value={startNativeLanguage}
                      onChange={(e) => setStartNativeLanguage(e.target.value)}
                      className="w-full rounded-sm border border-slate-200 bg-white px-4 py-3 text-cv-sm text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                    >
                      <option value="">Sprache auswahlen</option>
                      {BEWERBUNGSBRIEF_LANGUAGE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-cv-sm font-medium text-slate-700">Stellenanzeige</label>
                    <textarea
                      value={startJobAd}
                      onChange={(e) => setStartJobAd(e.target.value)}
                      placeholder="Fugen Sie hier die komplette Stellenanzeige ein."
                      className="min-h-[240px] w-full rounded-sm border border-slate-200 bg-white px-4 py-3 text-cv-sm leading-7 text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                    />
                  </div>

                  <div className="border-t border-slate-200 pt-4">
                    <button
                      type="button"
                      onClick={createRun}
                      disabled={submitting || !canStartRun}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-sm bg-slate-900 px-4 py-2 text-cv-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                      style={primaryButtonStyle}
                    >
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Starten
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl space-y-5">
                {run.status === "active" && activeQuestionText ? (
                  <div className="rounded-sm border border-slate-300 bg-white p-6 sm:p-7">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-3">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                            Aktuelle Frage
                          </div>
                          {activeQuestionSection ? (
                            <div className="inline-flex w-fit rounded-sm border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                              {activeQuestionSection}
                            </div>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-3">
                          {bewerbungsbriefProgress ? (
                            <div className="text-right">
                              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                                Fortschritt
                              </div>
                              <div className="mt-1 text-cv-sm font-medium text-slate-700">
                                {`${bewerbungsbriefProgress.current} / ${bewerbungsbriefProgress.total || 1}`}
                              </div>
                            </div>
                          ) : null}
                          <button
                            type="button"
                            onClick={resetRun}
                            className="inline-flex items-center gap-1.5 rounded-sm border border-slate-200 bg-white px-3 py-2 text-cv-sm text-slate-600 transition hover:bg-slate-50"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Neu starten
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3 border-t border-slate-200 pt-5">
                        <div className="text-cv-xl font-semibold leading-9 text-slate-950">
                          {activeQuestionText}
                        </div>
                        {activeQuestionTranslation ? (
                          <div className="max-w-2xl text-cv-sm leading-7 text-slate-600">
                            {activeQuestionTranslation}
                          </div>
                        ) : null}
                      </div>

                      {bewerbungsbriefProgress ? (
                        <div className="h-1.5 overflow-hidden rounded-sm bg-slate-100">
                          <div
                            className="h-full rounded-sm bg-slate-900 transition-all duration-300"
                            style={{ width: `${bewerbungsbriefProgress.percent}%`, background: activeBrand?.accentColor || activeBrand?.primaryColor || undefined }}
                          />
                        </div>
                      ) : null}
                    </div>

                    {activeOptions.length > 0 ? (
                      <div className="mt-8 grid gap-3 sm:grid-cols-2">
                        {activeOptions.map((option) => (
                          <button
                            key={`bewerbungsbrief-active-${option.value}`}
                            type="button"
                            onClick={() => void submitReply(option.value, true)}
                            disabled={submitting}
                            className="rounded-sm border border-slate-300 bg-white px-4 py-3 text-left text-cv-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    ) : activeQuestion?.inputType === "textarea" ? (
                      <div className="mt-6 space-y-3">
                        <textarea
                          value={replyInput}
                          onChange={(e) => setReplyInput(e.target.value)}
                          placeholder={activeQuestionPlaceholder || t("aiToolReplyPlaceholder")}
                          className="min-h-[170px] w-full rounded-sm border border-slate-200 bg-white px-4 py-3 text-cv-sm leading-7 text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                        />
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={sendReply}
                            disabled={submitting || !replyInput.trim()}
                            className="inline-flex items-center gap-2 rounded-sm bg-slate-900 px-4 py-2 text-cv-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                            style={primaryButtonStyle}
                          >
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            Weiter
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {run.status === "completed" ? (
                  <div className="space-y-4">
                    {(run.messages || []).filter((message) => message.kind === "review-card" || message.kind === "result-card").map((message) => {
                      const titlePayload =
                        "title" in message.payload && typeof message.payload.title === "string"
                          ? message.payload.title
                          : null;
                      const reviewItemsPayload =
                        "items" in message.payload && Array.isArray(message.payload.items)
                          ? message.payload.items
                          : null;
                      const textPayload =
                        "text" in message.payload && typeof message.payload.text === "string"
                          ? message.payload.text
                          : null;

                      return (
                        <div
                          key={message.id}
                          className="rounded-sm border border-slate-200 bg-white p-5"
                        >
                          {titlePayload ? (
                            <div className="mb-3 text-cv-lg font-semibold text-slate-900">{titlePayload}</div>
                          ) : null}
                          {message.kind === "review-card" && reviewItemsPayload ? (
                            <div className="space-y-3">
                              {reviewItemsPayload.map((item, index) => (
                                <div key={`${message.id}-${index}`} className="rounded-sm border border-slate-200 bg-slate-50 px-4 py-3">
                                  <div className="text-cv-sm font-semibold text-slate-900">{String(item.label)}</div>
                                  <div className="mt-1 whitespace-pre-wrap text-cv-sm leading-7 text-slate-600">{String(item.value)}</div>
                                </div>
                              ))}
                            </div>
                          ) : null}
                          {message.kind === "result-card" && textPayload ? (
                            <div className="whitespace-pre-wrap text-cv-sm leading-7 text-slate-700">{textPayload}</div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-sm border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <Bot className="h-4 w-4 text-slate-500" />
        <h3 className="text-cv-sm font-semibold">{title}</h3>
      </div>

      {description && <p className="text-cv-sm text-muted-foreground">{description}</p>}

      {error && (
        <div className="text-cv-sm text-red-600 bg-red-50 border border-red-200 rounded-sm p-3">
          {error}
        </div>
      )}

      {run ? (
        <>
          {run.status === "active" && activeQuestion && (
            <div className="rounded-sm border border-slate-300 bg-white p-4 sm:p-5">
              <div className="space-y-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Aktuelle Frage
                </div>
                {"sectionLabel" in (run.messages?.[run.messages.length - 1]?.payload || {}) &&
                typeof (run.messages?.[run.messages.length - 1]?.payload as Record<string, unknown>).sectionLabel === "string" ? (
                  <div className="inline-flex w-fit rounded-sm border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                    {String((run.messages?.[run.messages.length - 1]?.payload as Record<string, unknown>).sectionLabel)}
                  </div>
                ) : null}
                {run.messages?.[run.messages.length - 1]?.kind === "question-card" &&
                "question" in (run.messages[run.messages.length - 1]?.payload || {}) &&
                typeof (run.messages[run.messages.length - 1]?.payload as Record<string, unknown>).question === "string" ? (
                  <div className="text-cv-lg font-semibold leading-8 text-slate-950">
                    {String((run.messages[run.messages.length - 1]?.payload as Record<string, unknown>).question)}
                  </div>
                ) : null}
                {run.messages?.[run.messages.length - 1]?.kind === "question-card" &&
                "helperText" in (run.messages[run.messages.length - 1]?.payload || {}) &&
                typeof (run.messages[run.messages.length - 1]?.payload as Record<string, unknown>).helperText === "string" ? (
                  <p className="text-cv-sm text-muted-foreground">
                    {String((run.messages[run.messages.length - 1]?.payload as Record<string, unknown>).helperText)}
                  </p>
                ) : null}
              </div>
            </div>
          )}

          <div className="space-y-3">
            {visibleMessages.map((message) => {
              const isUser = message.role === "user";
              const textPayload =
                "text" in message.payload && typeof message.payload.text === "string"
                  ? message.payload.text
                  : null;
              const questionPayload =
                "question" in message.payload && typeof message.payload.question === "string"
                  ? message.payload.question
                  : null;
              const optionsPayload =
                "options" in message.payload && Array.isArray(message.payload.options)
                  ? message.payload.options.filter(
                      (option): option is ChoiceOption =>
                        !!option &&
                        typeof option === "object" &&
                        "label" in option &&
                        typeof option.label === "string" &&
                        "value" in option &&
                        typeof option.value === "string"
                    )
                  : [];
              const choiceStylePayload =
                "choiceStyle" in message.payload && message.payload.choiceStyle === "buttons"
                  ? "buttons"
                  : "dropdown";
              const selectedValuePayload =
                "selectedValue" in message.payload && typeof message.payload.selectedValue === "string"
                  ? message.payload.selectedValue
                  : null;
              const variableNamePayload =
                "variableName" in message.payload && typeof message.payload.variableName === "string"
                  ? message.payload.variableName
                  : null;
              const helperTextPayload =
                "helperText" in message.payload && typeof message.payload.helperText === "string"
                  ? message.payload.helperText
                  : null;
              const answerPayload =
                "answer" in message.payload && typeof message.payload.answer === "string"
                  ? message.payload.answer
                  : null;
              const labelPayload =
                "label" in message.payload && typeof message.payload.label === "string"
                  ? message.payload.label
                  : null;
              const reviewItemsPayload =
                "items" in message.payload && Array.isArray(message.payload.items)
                  ? message.payload.items
                  : null;
              const titlePayload =
                "title" in message.payload && typeof message.payload.title === "string"
                  ? message.payload.title
                  : null;
              const markdownPayload =
                "markdown" in message.payload && typeof message.payload.markdown === "boolean"
                  ? message.payload.markdown
                  : false;
              const errorPayload =
                "message" in message.payload && typeof message.payload.message === "string"
                  ? message.payload.message
                  : null;
              const statusPayload =
                "status" in message.payload && typeof message.payload.status === "string"
                  ? message.payload.status
                  : null;

              const storedRequirementAnswer = variableNamePayload?.startsWith("requirement_")
                ? storedRequirementAnswers.find(
                    (entry) => `requirement_${entry.requirementId}` === variableNamePayload
                  )
                : undefined;

              const isInteractiveChoiceCard =
                message.kind === "question-card" &&
                choiceStylePayload === "buttons" &&
                optionsPayload.length > 0 &&
                run.status === "active" &&
                run.messages?.[run.messages.length - 1]?.id === message.id &&
                !storedRequirementAnswer &&
                !selectedValuePayload;

              return (
                <div
                  key={message.id}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={
                      isUser
                        ? "max-w-[85%] rounded-sm px-3.5 py-3 text-[15px] leading-relaxed bg-slate-900 text-white"
                        : "max-w-[88%] rounded-sm border border-slate-200 px-3 py-2.5 text-[15px] leading-relaxed bg-slate-50/45 text-slate-700"
                    }
                    style={isUser ? primaryButtonStyle : undefined}
                  >
                    {message.kind === "assistant-text" && textPayload ? (
                      <MarkdownText text={textPayload} />
                    ) : null}

                    {message.kind === "user-text" && textPayload ? (
                      <span>{textPayload}</span>
                    ) : null}

                    {message.kind === "question-card" && questionPayload ? (
                      <div className="space-y-3">
                        <p className="font-medium">{questionPayload}</p>
                        {helperTextPayload && (
                          <p className="text-cv-sm text-muted-foreground">{helperTextPayload}</p>
                        )}

                        {choiceStylePayload === "buttons" && optionsPayload.length > 0 ? (
                          isInteractiveChoiceCard ? (
                            <div className="flex flex-wrap gap-2 pt-1">
                              {optionsPayload.map((option) => (
                                <button
                                  key={`${message.id}-${option.value}`}
                                  type="button"
                                  onClick={() => {
                                    if (!isInteractiveChoiceCard) return;
                                    void submitReply(option.value, true);
                                  }}
                                  disabled={submitting}
                                  className="rounded-sm border border-slate-200 bg-white px-3 py-1.5 text-cv-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          ) : null
                        ) : null}
                      </div>
                    ) : null}

                    {message.kind === "answer-card" && answerPayload ? (
                      <div className="space-y-1">
                        {labelPayload && (
                          <p className="text-xs uppercase tracking-wide opacity-70">{labelPayload}</p>
                        )}
                        <p>{answerPayload}</p>
                      </div>
                    ) : null}

                    {message.kind === "review-card" && reviewItemsPayload ? (
                      <div className="space-y-2">
                        <p className="font-medium">{String(titlePayload || "")}</p>
                        <div className="space-y-1.5">
                          {reviewItemsPayload.map((item, index) => (
                            <div key={`${message.id}-${index}`} className="rounded-sm border border-slate-200 bg-white/70 px-3 py-2 text-cv-sm">
                              <div className="font-medium">{String(item.label)}</div>
                              <div className="text-muted-foreground whitespace-pre-wrap">{String(item.value)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {message.kind === "result-card" && textPayload ? (
                      <div className="space-y-2">
                        {titlePayload && (
                          <p className="font-medium">{titlePayload}</p>
                        )}
                        {markdownPayload ? (
                          <MarkdownText text={textPayload} />
                        ) : (
                          <div className="whitespace-pre-wrap">{textPayload}</div>
                        )}
                      </div>
                    ) : null}

                    {message.kind === "error-card" && errorPayload ? (
                      <div className="text-red-700">{errorPayload}</div>
                    ) : null}

                    {message.kind === "system-status" && statusPayload ? (
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">
                        {labelPayload || statusPayload}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              {run.status === "completed" ? t("aiToolResult") : toolMeta.category}
            </div>
            <button
              type="button"
              onClick={resetRun}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-sm border border-slate-200 text-slate-600 text-cv-sm hover:bg-slate-50 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {t("aiToolNewRun")}
            </button>
          </div>

          {run.status === "active" && !(activeQuestion?.inputType === "select" && activeQuestion.choiceStyle === "buttons") && (
            <div className="flex items-end gap-2">
              {activeQuestion?.inputType === "select" ? (
                <select
                  value={replyInput}
                  onChange={(e) => setReplyInput(e.target.value)}
                  className="w-full rounded-sm border border-slate-200 bg-white p-3 text-cv-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                >
                  <option value="" disabled>
                    {t("aiToolReplyPlaceholder")}
                  </option>
                  {activeQuestion.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : activeQuestion?.inputType === "text" ? (
                <input
                  type="text"
                  value={replyInput}
                  onChange={(e) => setReplyInput(e.target.value)}
                  placeholder={t("aiToolReplyPlaceholder")}
                  className="w-full rounded-sm border border-slate-200 bg-white p-3 text-cv-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              ) : (
                <textarea
                  value={replyInput}
                  onChange={(e) => setReplyInput(e.target.value)}
                  placeholder={t("aiToolReplyPlaceholder")}
                  className="w-full min-h-[88px] p-3 rounded-sm border border-slate-200 bg-white text-cv-sm resize-y focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              )}
              <button
                type="button"
                onClick={sendReply}
                disabled={submitting || !replyInput.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-sm bg-slate-900 text-white text-cv-sm font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                style={primaryButtonStyle}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {t("aiToolSubmit")}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-3">
          {isBewerbungsbrief ? (
            <>
              <div className="space-y-2">
                <label className="text-cv-sm font-medium text-slate-700">Erstsprache</label>
                <select
                  value={startNativeLanguage}
                  onChange={(e) => setStartNativeLanguage(e.target.value)}
                  className="w-full rounded-sm border border-slate-200 bg-white p-3 text-cv-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                >
                  <option value="">Sprache auswahlen</option>
                  {BEWERBUNGSBRIEF_LANGUAGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-cv-sm font-medium text-slate-700">Stellenanzeige</label>
                <textarea
                  value={startJobAd}
                  onChange={(e) => setStartJobAd(e.target.value)}
                  placeholder="Paste the full job ad here."
                  className="w-full min-h-[180px] rounded-sm border border-slate-200 bg-white p-3 text-cv-sm resize-y focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>
            </>
          ) : (
            <textarea
              value={initialInput}
              onChange={(e) => setInitialInput(e.target.value)}
              placeholder={t("aiToolInputPlaceholder")}
              className="w-full min-h-[120px] p-3 rounded-sm border border-slate-200 bg-white text-cv-sm resize-y focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={createRun}
              disabled={submitting || !canStartRun}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-sm bg-slate-900 text-white text-cv-sm font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              style={primaryButtonStyle}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {t("aiToolStart")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}