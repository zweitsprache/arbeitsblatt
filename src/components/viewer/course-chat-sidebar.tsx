"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useCourse } from "./course-context";
import { BRAND_FONTS } from "@/types/worksheet";
import {
  MessageCircle,
  Send,
  Bot,
  X,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Sample messages for UI preview ─────────────────────────

interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
}

const PLACEHOLDER_MESSAGES: ChatMessage[] = [
  {
    id: "1",
    role: "assistant",
    content: "👋 Hallo! Ich bin dein Kurs-Assistent. Stelle mir eine Frage zum aktuellen Kursinhalt.",
  },
];

// ─── Chat Sidebar Component ─────────────────────────────────

interface CourseChatSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function CourseChatSidebar({ open, onClose }: CourseChatSidebarProps) {
  const t = useTranslations("courseChat");
  const { brand } = useCourse();
  const brandFonts = BRAND_FONTS[brand || "edoomio"];
  const [inputValue, setInputValue] = useState("");
  const [messages] = useState<ChatMessage[]>(PLACEHOLDER_MESSAGES);

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
        <div className="flex-1 overflow-y-auto p-4 space-y-4 chat-scroll">
          {messages.map((msg) => (
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
                  "max-w-[85%] rounded-xl px-3.5 py-2.5 text-base leading-snug",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted rounded-bl-sm"
                )}
              >
                {msg.content}
              </div>
            </div>
          ))}
        </div>

        {/* Input area */}
        <div className="border-t p-3">
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={t("inputPlaceholder")}
                className="w-full resize-none rounded-lg border bg-muted/30 px-3 py-2.5 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 min-h-[40px] max-h-[120px]"
                rows={1}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    // No functionality yet
                  }
                }}
              />
            </div>
            <Button
              size="icon"
              className="h-[40px] w-[40px] shrink-0 rounded-lg"
              disabled={!inputValue.trim()}
            >
              <Send className="h-4 w-4" />
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

// ─── Toggle Button (floating) ───────────────────────────────

interface ChatToggleButtonProps {
  open: boolean;
  onClick: () => void;
}

export function ChatToggleButton({ open, onClick }: ChatToggleButtonProps) {
  const t = useTranslations("courseChat");

  if (open) return null;

  return (
    <button
      onClick={onClick}
      className="hidden lg:flex items-center justify-center h-10 w-10 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
      aria-label={t("openChat")}
    >
      <MessageCircle className="h-5 w-5" />
    </button>
  );
}
