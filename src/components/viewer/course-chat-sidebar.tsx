"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useLocale, useTranslations } from "next-intl";
import { useCourse } from "./course-context";
import { BRAND_FONTS } from "@/types/worksheet";
import { authFetch } from "@/lib/auth-fetch";
import {
  MessageCircle,
  Send,
  Bot,
  X,
  Loader2,
  BookOpen,
  Languages,
  Lightbulb,
  CircleHelp,
  Check,
  XIcon,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";

// ─── Types ──────────────────────────────────────────────────

interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
}

interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
  displayContent?: string;
  quiz?: QuizQuestion[];
}

// ─── Quiz Block Component ───────────────────────────────────

function QuizBlock({ questions }: { questions: QuizQuestion[] }) {
  const t = useTranslations("courseChat");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});

  const handleSelect = (optIdx: number) => {
    if (revealed[currentIdx]) return;
    setAnswers((prev) => ({ ...prev, [currentIdx]: optIdx }));
    setRevealed((prev) => ({ ...prev, [currentIdx]: true }));
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((prev) => prev + 1);
    }
  };

  const correctCount = Object.entries(answers).filter(
    ([qIdx, optIdx]) => questions[Number(qIdx)]?.correct === optIdx
  ).length;
  const allDone = Object.keys(revealed).length === questions.length;
  const isCurrentRevealed = revealed[currentIdx];
  const isLast = currentIdx === questions.length - 1;

  const handleReset = () => {
    setAnswers({});
    setRevealed({});
    setCurrentIdx(0);
  };

  const q = questions[currentIdx];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold flex items-center gap-1.5">
          <CircleHelp className="h-3.5 w-3.5" />
          {t("quizTitle")}
        </p>
        <span className="text-xs text-muted-foreground">
          {currentIdx + 1} / {questions.length}
        </span>
      </div>

      <div className="space-y-1.5">
        <p className="text-sm font-medium">{q.question}</p>
        <div className="grid gap-1.5">
          {q.options.map((opt, optIdx) => {
            const isSelected = answers[currentIdx] === optIdx;
            const isCorrect = q.correct === optIdx;

            let btnClass =
              "w-full text-left px-3 py-2 text-sm rounded-lg border transition-colors ";
            if (isCurrentRevealed) {
              if (isCorrect) {
                btnClass +=
                  "border-green-500 bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-300";
              } else if (isSelected && !isCorrect) {
                btnClass +=
                  "border-red-500 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300";
              } else {
                btnClass += "opacity-50 border-border";
              }
            } else {
              btnClass +=
                "hover:bg-background/80 hover:border-primary/30 cursor-pointer border-border";
            }

            return (
              <button
                key={optIdx}
                className={btnClass}
                onClick={() => handleSelect(optIdx)}
                disabled={isCurrentRevealed}
              >
                <span className="flex items-center gap-2">
                  <span className="shrink-0 w-5 h-5 rounded-full border flex items-center justify-center text-xs font-medium">
                    {isCurrentRevealed && isCorrect ? (
                      <Check className="h-3 w-3 text-green-600" />
                    ) : isCurrentRevealed && isSelected ? (
                      <XIcon className="h-3 w-3 text-red-600" />
                    ) : (
                      String.fromCharCode(65 + optIdx)
                    )}
                  </span>
                  {opt}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {isCurrentRevealed && !isLast && (
        <button
          onClick={handleNext}
          className="w-full px-3 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {t("quizNext")}
        </button>
      )}

      {allDone && (
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <p className="text-sm font-medium">
            {t("quizScore", { correct: correctCount, total: questions.length })}
          </p>
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border bg-background hover:bg-muted transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            {t("quizRetry")}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Chat Sidebar Component ─────────────────────────────────

interface CourseChatSidebarProps {
  open: boolean;
  onClose: () => void;
  lessonContext: string;
  lessonTitle: string;
}

export function CourseChatSidebar({
  open,
  onClose,
  lessonContext,
  lessonTitle,
}: CourseChatSidebarProps) {
  const t = useTranslations("courseChat");
  const locale = useLocale();
  const { brand, title: courseTitle } = useCourse();
  const brandFonts = BRAND_FONTS[brand || "edoomio"];

  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const prevLessonRef = useRef(lessonTitle);

  // Reset chat when lesson changes
  useEffect(() => {
    if (prevLessonRef.current !== lessonTitle) {
      prevLessonRef.current = lessonTitle;
      setMessages([]);
      setIsStreaming(false);
      abortRef.current?.abort();
    }
  }, [lessonTitle]);

  // Show welcome message when chat has no messages and lesson is available
  const welcomeMessage: ChatMessage | null =
    messages.length === 0 && lessonTitle
      ? { id: "welcome", role: "assistant", content: t("welcomeMessage") }
      : null;

  const displayMessages = welcomeMessage
    ? [welcomeMessage, ...messages]
    : messages;

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayMessages]);

  const sendMessage = useCallback(async (overrideText?: string, displayLabel?: string) => {
    const text = (overrideText ?? inputValue).trim();
    if (!text || isStreaming || !lessonContext) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      ...(displayLabel ? { displayContent: displayLabel } : {}),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    if (!overrideText) setInputValue("");
    setIsStreaming(true);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    const assistantId = `assistant-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "" },
    ]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const apiMessages = newMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await authFetch("/api/ai/course-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          lessonContext,
          courseTitle,
          lessonTitle,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") break;

          try {
            const parsed = JSON.parse(payload);
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.text) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + parsed.text }
                    : m
                )
              );
            }
          } catch {
            // Skip malformed SSE lines
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      // Show error in the assistant message
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId && !m.content
            ? { ...m, content: t("errorMessage") }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [inputValue, isStreaming, lessonContext, messages, courseTitle, lessonTitle, t]);

  const noLesson = !lessonContext;

  // Get selected text from the content area for "translate" preset
  const getSelectedText = useCallback((): string => {
    const selection = window.getSelection();
    return selection?.toString().trim() ?? "";
  }, []);

  const handleSummary = useCallback(() => {
    if (isStreaming || noLesson) return;
    sendMessage(t("presetSummaryPrompt"), t("presetSummary"));
  }, [isStreaming, noLesson, sendMessage, t]);

  const handleTranslate = useCallback(() => {
    if (isStreaming || noLesson) return;
    const selected = getSelectedText();
    if (!selected) return;
    sendMessage(t("presetTranslatePrompt", { text: selected }), t("presetTranslate"));
  }, [isStreaming, noLesson, getSelectedText, sendMessage, t]);

  const handleReflect = useCallback(() => {
    if (isStreaming || noLesson) return;
    const selected = getSelectedText();
    if (!selected) return;
    sendMessage(t("presetReflectPrompt", { text: selected }), t("presetReflect"));
  }, [isStreaming, noLesson, getSelectedText, sendMessage, t]);

  const handleQuiz = useCallback(async () => {
    if (isStreaming || noLesson) return;
    setIsStreaming(true);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: t("presetQuizPrompt"),
      displayContent: t("presetQuiz"),
    };
    const assistantId = `assistant-quiz-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: assistantId, role: "assistant", content: "" },
    ]);

    try {
      const res = await authFetch("/api/ai/course-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonContext, courseTitle, lessonTitle, locale }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: t("quizReady"), quiz: data.questions }
            : m
        )
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: t("errorMessage") } : m
        )
      );
    } finally {
      setIsStreaming(false);
    }
  }, [isStreaming, noLesson, lessonContext, courseTitle, lessonTitle, locale, t]);

  return (
    <div
      className={cn(
        "hidden lg:flex shrink-0 relative transition-all duration-300",
        open ? "w-[380px]" : "w-0"
      )}
    >
      <aside
        className={cn(
          "flex flex-col w-[380px] h-full rounded-lg border bg-background overflow-hidden transition-all duration-300",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        style={{ fontFamily: brandFonts.bodyFont }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">{t("title")}</p>
            <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Messages area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 chat-scroll"
        >
          {noLesson ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground text-center px-4">
                {t("noLesson")}
              </p>
            </div>
          ) : (
            <>
              {/* Preset prompt buttons */}
              <div className="flex flex-wrap gap-2 mb-2">
                <button
                  onClick={handleSummary}
                  disabled={isStreaming}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border bg-background hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <BookOpen className="h-3 w-3" />
                  {t("presetSummary")}
                </button>
                <button
                  onClick={handleTranslate}
                  disabled={isStreaming}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border bg-background hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Languages className="h-3 w-3" />
                  {t("presetTranslate")}
                </button>
                <button
                  onClick={handleReflect}
                  disabled={isStreaming}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border bg-background hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Lightbulb className="h-3 w-3" />
                  {t("presetReflect")}
                </button>
                <button
                  onClick={handleQuiz}
                  disabled={isStreaming}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border bg-background hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CircleHelp className="h-3 w-3" />
                  {t("presetQuiz")}
                </button>
              </div>
              {displayMessages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-2.5",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {msg.role === "assistant" && (
                  <div className="flex items-start">
                    <div className="flex items-center justify-center h-7 w-7 rounded-full bg-primary/10 shrink-0 mt-0.5">
                      <Bot className="h-3.5 w-3.5 text-primary" />
                    </div>
                  </div>
                )}
                <div
                  className={cn(
                    "rounded-xl px-3.5 py-2.5 text-base leading-snug",
                    msg.role === "user"
                      ? "max-w-[85%] bg-primary text-primary-foreground rounded-br-sm"
                      : msg.quiz
                        ? "w-full bg-muted rounded-bl-sm"
                        : "max-w-[85%] bg-muted rounded-bl-sm"
                  )}
                >
                  {msg.quiz ? (
                    <QuizBlock questions={msg.quiz} />
                  ) : msg.content ? (
                    msg.role === "assistant" ? (
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
                        {msg.content}
                      </ReactMarkdown>
                    ) : (
                      msg.displayContent ?? msg.content
                    )
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              </div>
            ))}
            </>
          )}
        </div>

        {/* Input area */}
        <div className="border-t p-3">
          <div className="flex items-start gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={
                  noLesson ? t("noLessonShort") : t("inputPlaceholder")
                }
                disabled={noLesson || isStreaming}
                className="w-full resize-none rounded-lg border bg-muted/30 px-3 py-2.5 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 min-h-[40px] max-h-[120px] disabled:opacity-50 disabled:cursor-not-allowed"
                rows={1}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />
            </div>
            <Button
              size="icon"
              className="h-[40px] w-[40px] shrink-0 rounded-lg"
              disabled={!inputValue.trim() || isStreaming || noLesson}
              onClick={() => sendMessage()}
            >
              {isStreaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            {t("disclaimer")}
          </p>
        </div>

        <style>{`
          .chat-scroll::-webkit-scrollbar { width: 4px; }
          .chat-scroll::-webkit-scrollbar-track { background: transparent; }
          .chat-scroll::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }
          .chat-scroll::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
        `}</style>
      </aside>
    </div>
  );
}
