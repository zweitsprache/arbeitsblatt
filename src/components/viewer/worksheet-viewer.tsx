"use client";

import React, { useState, useCallback } from "react";
import { WorksheetBlock, WorksheetSettings, ViewMode } from "@/types/worksheet";
import { ViewerBlockRenderer } from "./viewer-block-renderer";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";

export function WorksheetViewer({
  title,
  blocks,
  settings,
  mode,
}: {
  title: string;
  blocks: WorksheetBlock[];
  settings: WorksheetSettings;
  mode: ViewMode;
}) {
  const t = useTranslations("viewer");
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [showResults, setShowResults] = useState(false);

  // Filter blocks based on mode visibility
  const visibleBlocks = blocks.filter(
    (b) => b.visibility === "both" || b.visibility === mode
  );

  const pageWidth = settings.pageSize === "a4" ? 794 : 816;

  const hasInteractiveBlocks = visibleBlocks.some(
    (b) =>
      b.type === "multiple-choice" ||
      b.type === "fill-in-blank" ||
      b.type === "open-response" ||
      b.type === "true-false-matrix" ||
      b.type === "matching"
  );

  const updateAnswer = useCallback((blockId: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [blockId]: value }));
  }, []);

  const handleCheckAnswers = () => {
    setShowResults(true);
  };

  const handleReset = () => {
    setAnswers({});
    setShowResults(false);
  };

  return (
    <div className={`min-h-screen ${mode === "print" ? "bg-white" : "bg-muted/30"}`}>
      <div
        className={`mx-auto ${mode === "print" ? "" : "py-8 px-4"}`}
        style={{ maxWidth: pageWidth }}
      >
        {mode === "online" && (
          <div className="bg-background rounded-xl shadow-sm border p-8 mb-4">
            <div className="flex items-center gap-3 mb-1">
              <Image
                src="/logo/arbeitsblatt_logo_icon.svg"
                alt="Arbeitsblatt"
                width={28}
                height={28}
              />
              <h1 className="text-2xl font-bold">{title}</h1>
            </div>
            {settings.showHeader && settings.headerText && (
              <p className="text-sm text-muted-foreground mt-2">{settings.headerText}</p>
            )}
          </div>
        )}

        <div
          className={`${mode === "online" ? "bg-background rounded-xl shadow-sm border p-8" : ""}`}
          style={
            mode === "print"
              ? {
                  padding: `${settings.margins.top}mm ${settings.margins.right}mm ${settings.margins.bottom}mm ${settings.margins.left}mm`,
                  fontSize: settings.fontSize,
                  fontFamily: settings.fontFamily,
                }
              : undefined
          }
        >
          {mode === "print" && settings.showHeader && settings.headerText && (
            <div className="text-center text-sm text-gray-500 mb-4 pb-2 border-b">
              {settings.headerText}
            </div>
          )}

          <div className="space-y-6">
            {visibleBlocks.map((block) => (
              <ViewerBlockRenderer
                key={block.id}
                block={block}
                mode={mode}
                answer={answers[block.id]}
                onAnswer={(value) => updateAnswer(block.id, value)}
                showResults={showResults}
              />
            ))}
          </div>

          {settings.showFooter && settings.footerText && (
            <div className="text-center text-sm text-muted-foreground mt-8 pt-2 border-t">
              {settings.footerText}
            </div>
          )}
        </div>

        {mode === "online" && hasInteractiveBlocks && (
          <div className="flex items-center justify-center gap-3 mt-6 mb-8">
            {!showResults ? (
              <Button size="lg" onClick={handleCheckAnswers} className="gap-2">
                <CheckCircle2 className="h-5 w-5" />
                {t("checkAnswers")}
              </Button>
            ) : (
              <Button size="lg" variant="outline" onClick={handleReset} className="gap-2">
                <RotateCcw className="h-5 w-5" />
                {t("tryAgain")}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
