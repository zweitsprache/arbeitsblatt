"use client";

import React, { useState, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { useEditor } from "@/store/editor-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Save,
  Play,
  Monitor,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { splitBlocksIntoSlides } from "@/types/presentation";

export function PresentationToolbar() {
  const { state, dispatch, save } = useEditor();
  const t = useTranslations("presentationToolbar");
  const locale = useLocale();
  const [channelRef, setChannelRef] = useState<BroadcastChannel | null>(null);

  const slides = useMemo(() => splitBlocksIntoSlides(state.blocks), [state.blocks]);
  const slideCount = slides.length;

  // Current slide index (derived from which page-break region the selected block is in)
  const currentSlideIndex = useMemo(() => {
    if (!state.selectedBlockId) return 0;
    for (let i = 0; i < slides.length; i++) {
      if (slides[i].some((b) => b.id === state.selectedBlockId)) return i;
    }
    return 0;
  }, [slides, state.selectedBlockId]);

  const handlePresent = useCallback(async () => {
    // Save before presenting
    if (state.isDirty) {
      await save();
    }

    const slug = state.slug;
    if (!slug) return;

    // Open viewer in new window
    const viewerUrl = `/${locale}/presentation/${slug}`;
    const viewerWindow = window.open(viewerUrl, "_blank", "noopener");

    // Set up BroadcastChannel for sync
    if (channelRef) channelRef.close();
    const channel = new BroadcastChannel(`presentation-${state.worksheetId}`);
    setChannelRef(channel);

    // Send initial slide position after a short delay (give viewer time to load)
    setTimeout(() => {
      channel.postMessage({ type: "GOTO_SLIDE", index: 0 });
    }, 1000);
  }, [state.isDirty, state.slug, state.worksheetId, locale, save, channelRef]);

  const sendSlide = useCallback((index: number) => {
    if (channelRef) {
      channelRef.postMessage({ type: "GOTO_SLIDE", index });
    }
  }, [channelRef]);

  const handlePrevSlide = useCallback(() => {
    const newIndex = Math.max(0, currentSlideIndex - 1);
    sendSlide(newIndex);
  }, [currentSlideIndex, sendSlide]);

  const handleNextSlide = useCallback(() => {
    const newIndex = Math.min(slideCount - 1, currentSlideIndex + 1);
    sendSlide(newIndex);
  }, [currentSlideIndex, slideCount, sendSlide]);

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b bg-background shrink-0">
      {/* Title */}
      <Input
        value={state.title}
        onChange={(e) => dispatch({ type: "SET_TITLE", payload: e.target.value })}
        className="w-64 text-sm font-medium"
        placeholder={t("untitledPresentation")}
      />

      {/* Slide counter */}
      <Badge variant="secondary" className="text-xs">
        {slideCount} {slideCount === 1 ? t("slide") : t("slides")}
      </Badge>

      <div className="flex-1" />

      {/* Slide navigation (only shown when BroadcastChannel is active) */}
      {channelRef && (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrevSlide}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground min-w-[3rem] text-center">
            {currentSlideIndex + 1} / {slideCount}
          </span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNextSlide}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Present button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="default" size="sm" onClick={handlePresent} disabled={!state.worksheetId}>
            <Play className="h-4 w-4 mr-1.5" />
            {t("present")}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t("presentTooltip")}</TooltipContent>
      </Tooltip>

      {/* Save */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={save}
            disabled={!state.isDirty || state.isSaving}
          >
            {state.isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t("save")}</TooltipContent>
      </Tooltip>

      {/* Status */}
      {state.isDirty && (
        <span className="text-xs text-muted-foreground">{t("unsaved")}</span>
      )}
    </div>
  );
}
