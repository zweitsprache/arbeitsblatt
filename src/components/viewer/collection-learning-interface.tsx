"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

interface Flashcard {
  id: string;
  front: {
    text: string;
    image?: string;
  };
  back: {
    text: string;
    image?: string;
  };
}

interface CollectionSet {
  id: string;
  order: number;
  worksheet?: {
    id: string;
    title: string;
    blocks?: Flashcard[];
  };
}

interface CollectionLearningInterfaceProps {
  sets: CollectionSet[];
  selectedSetId: string | null;
  mode: "sequential" | "individual";
}

export function CollectionLearningInterface({
  sets,
  selectedSetId,
  mode,
}: CollectionLearningInterfaceProps) {
  const t = useTranslations("collectionViewer");
  const tc = useTranslations("common");

  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Reset card state when the selected set or learning mode changes.
  useEffect(() => {
    setCardIndex(0);
    setIsFlipped(false);
  }, [selectedSetId, mode]);

  // Get current set
  const currentSet = useMemo(() => {
    if (mode === "individual" && selectedSetId) {
      return sets.find((s) => s.id === selectedSetId);
    } else if (mode === "sequential") {
      return sets[0];
    }
    return undefined;
  }, [sets, selectedSetId, mode]);

  // Get all cards
  const allCards = useMemo(() => {
    if (mode === "sequential") {
      // Flatten all cards from all sets in order
      return sets.flatMap((set) => 
        (set.worksheet?.blocks || []).map((card, idx) => ({
          ...card,
          setOrder: set.order,
          setTitle: set.worksheet?.title || "",
          cardIndexInSet: idx,
        }))
      );
    } else if (currentSet?.worksheet?.blocks) {
      return currentSet.worksheet.blocks.map((card, idx) => ({
        ...card,
        setOrder: currentSet.order,
        setTitle: currentSet.worksheet?.title || "",
        cardIndexInSet: idx,
      }));
    }
    return [];
  }, [sets, currentSet, mode]);

  if (!currentSet || allCards.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border">
        <p className="text-gray-600">
          {mode === "individual"
            ? t("selectSetToStartLearning")
            : t("noCardsAvailable")}
        </p>
      </div>
    );
  }

  const currentCard = allCards[cardIndex] ?? allCards[0];
  const hasMore = cardIndex < allCards.length - 1;
  const hasPrev = cardIndex > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <div className="text-sm text-gray-600">
            {mode === "sequential" ? (
              <>
                {t("set")} {currentCard.setOrder + 1} • {currentCard.setTitle}
              </>
            ) : (
              <>{currentCard.setTitle}</>
            )}
          </div>
          <div className="text-sm font-medium text-gray-900">
            {t("card")} {cardIndex + 1} / {allCards.length}
          </div>
        </div>
      </div>

      {/* Flashcard */}
      <div
        onClick={() => setIsFlipped(!isFlipped)}
        className="cursor-pointer min-h-64 sm:min-h-96 bg-white border-2 border-gray-200 rounded-lg px-10 py-4 sm:px-16 sm:py-8 flex items-center justify-center shadow-sm hover:shadow-md transition-shadow"
      >
        <div className="text-center max-w-full overflow-hidden">
          <div className="text-lg sm:text-3xl md:text-4xl font-normal leading-snug text-gray-900 break-words">
            {isFlipped ? currentCard.back.text : currentCard.front.text}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-2 justify-between items-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setCardIndex(Math.max(0, cardIndex - 1));
            setIsFlipped(false);
          }}
          disabled={!hasPrev}
          className="flex items-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">{tc("previous")}</span>
        </Button>

        <div className="text-xs text-gray-600 text-center flex-1">
          {cardIndex + 1} / {allCards.length}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setCardIndex(Math.min(allCards.length - 1, cardIndex + 1));
            setIsFlipped(false);
          }}
          disabled={!hasMore}
          className="flex items-center gap-2"
        >
          <span className="hidden sm:inline">{tc("next")}</span>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-1">
        <div
          className="bg-blue-600 h-1 rounded-full transition-all"
          style={{ width: `${((cardIndex + 1) / allCards.length) * 100}%` }}
        />
      </div>
    </div>
  );
}
