"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import { Bot, Loader2, RotateCcw, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { AiToolPublicMetadata, AiToolRunRecord } from "@/ai-tools/types";
import { AiToolBlock } from "@/types/worksheet";

interface ToolWorkflowShellProps {
  block: AiToolBlock;
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
  const [toolMeta, setToolMeta] = React.useState<AiToolPublicMetadata | null>(null);
  const [run, setRun] = React.useState<AiToolRunRecord | null>(null);
  const [initialInput, setInitialInput] = React.useState("");
  const [replyInput, setReplyInput] = React.useState("");
  const [loadingMeta, setLoadingMeta] = React.useState(true);
  const [loadingRun, setLoadingRun] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [resumeDisabled, setResumeDisabled] = React.useState(false);

  const contextMode = React.useMemo(
    () => (block.id.startsWith("standalone-") ? "standalone" : "worksheet"),
    [block.id]
  );

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
      if (!block.toolKey || !toolMeta || resumeDisabled) return;

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
  }, [block.id, block.latestRunId, block.toolKey, contextMode, resumeDisabled, t, toolMeta]);

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
          },
          initialInput: initialInput.trim() || undefined,
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
      setReplyInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("tryAgain"));
    } finally {
      setSubmitting(false);
    }
  };

  const sendReply = async () => {
    if (!run || !replyInput.trim() || submitting || run.status !== "active") return;
    setSubmitting(true);
    setError(null);

    const input = replyInput.trim();
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

                const optimisticMessages = (payload.messages || []).map((message, index) => ({
                  id: `optimistic-${prev.id}-${Date.now()}-${index}`,
                  runId: prev.id,
                  role: message.kind === "user-text" || message.kind === "answer-card" ? "user" : "assistant",
                  kind: message.kind,
                  payload: message.payload,
                  sequence: (prev.messages?.at(-1)?.sequence ?? -1) + index + 1,
                  createdAt: new Date().toISOString(),
                }));

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

                nextMessages[nextMessages.length - 1] = {
                  ...lastMessage,
                  payload: {
                    ...lastMessage.payload,
                    text:
                      typeof lastMessage.payload.text === "string"
                        ? lastMessage.payload.text + payload.text
                        : payload.text,
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

  const resetRun = () => {
    setResumeDisabled(true);
    setRun(null);
    setInitialInput("");
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
      <div className="text-sm text-muted-foreground text-center py-4">
        {error || t("aiToolNotConfigured")}
      </div>
    );
  }

  const title = block.toolTitle || toolMeta.title;
  const description = block.toolDescription || toolMeta.description;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Bot className="h-4 w-4 text-violet-500" />
        <h3 className="text-base font-semibold">{title}</h3>
      </div>

      {description && <p className="text-sm text-muted-foreground">{description}</p>}

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-sm p-3">
          {error}
        </div>
      )}

      {run ? (
        <>
          <div className="space-y-3">
            {(run.messages || []).map((message) => {
              const isUser = message.role === "user";

              return (
                <div
                  key={message.id}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={
                      isUser
                        ? "max-w-[85%] rounded-md px-3.5 py-3 text-[15px] leading-relaxed shadow-sm bg-violet-600 text-white"
                        : "max-w-[88%] rounded-md px-3.5 py-3 text-[15px] leading-relaxed shadow-sm bg-[rgba(245,245,244,0.9)] text-slate-800"
                    }
                  >
                    {message.kind === "assistant-text" && typeof message.payload.text === "string" ? (
                      <MarkdownText text={message.payload.text} />
                    ) : null}

                    {message.kind === "user-text" && typeof message.payload.text === "string" ? (
                      <span>{message.payload.text}</span>
                    ) : null}

                    {message.kind === "question-card" && typeof message.payload.question === "string" ? (
                      <div className="space-y-1">
                        <p className="font-medium">{message.payload.question}</p>
                        {typeof message.payload.helperText === "string" && (
                          <p className="text-sm text-muted-foreground">{message.payload.helperText}</p>
                        )}
                      </div>
                    ) : null}

                    {message.kind === "answer-card" && typeof message.payload.answer === "string" ? (
                      <div className="space-y-1">
                        {typeof message.payload.label === "string" && (
                          <p className="text-xs uppercase tracking-wide opacity-70">{message.payload.label}</p>
                        )}
                        <p>{message.payload.answer}</p>
                      </div>
                    ) : null}

                    {message.kind === "review-card" && Array.isArray(message.payload.items) ? (
                      <div className="space-y-2">
                        <p className="font-medium">{String(message.payload.title || "")}</p>
                        <div className="space-y-1.5">
                          {message.payload.items.map((item, index) => (
                            <div key={`${message.id}-${index}`} className="rounded-sm border border-slate-200 bg-white/70 px-3 py-2 text-sm">
                              <div className="font-medium">{String(item.label)}</div>
                              <div className="text-muted-foreground whitespace-pre-wrap">{String(item.value)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {message.kind === "result-card" && typeof message.payload.text === "string" ? (
                      <div className="space-y-2">
                        {typeof message.payload.title === "string" && message.payload.title && (
                          <p className="font-medium">{message.payload.title}</p>
                        )}
                        {message.payload.markdown ? (
                          <MarkdownText text={message.payload.text} />
                        ) : (
                          <div className="whitespace-pre-wrap">{message.payload.text}</div>
                        )}
                      </div>
                    ) : null}

                    {message.kind === "error-card" && typeof message.payload.message === "string" ? (
                      <div className="text-red-700">{message.payload.message}</div>
                    ) : null}

                    {message.kind === "system-status" && typeof message.payload.status === "string" ? (
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">
                        {message.payload.label || message.payload.status}
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
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-sm border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {t("aiToolNewRun")}
            </button>
          </div>

          {run.status === "active" && (
            <div className="flex items-end gap-2">
              <textarea
                value={replyInput}
                onChange={(e) => setReplyInput(e.target.value)}
                placeholder={t("aiToolReplyPlaceholder")}
                className="w-full min-h-[88px] p-3 rounded-sm border border-slate-200 bg-white text-sm resize-y focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
              <button
                type="button"
                onClick={sendReply}
                disabled={submitting || !replyInput.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-sm bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {t("aiToolSubmit")}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-3">
          <textarea
            value={initialInput}
            onChange={(e) => setInitialInput(e.target.value)}
            placeholder={t("aiToolInputPlaceholder")}
            className="w-full min-h-[120px] p-3 rounded-sm border border-slate-200 bg-white text-sm resize-y focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={createRun}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-sm bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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