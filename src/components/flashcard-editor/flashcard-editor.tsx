"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FlashcardProvider, useFlashcardEditor, FlashcardLocaleMode } from "@/store/flashcard-store";
import { FlashcardDocument, FlashcardItem, FlashcardSide } from "@/types/flashcard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  getEffectiveValue,
  hasChOverride,
  countChOverrides,
  replaceEszett,
} from "@/lib/locale-utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Save,
  Plus,
  Trash2,
  Copy,
  GripVertical,
  ImagePlus,
  X,
  Loader2,
  Layers,
  Download,
  Upload,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  ImageDown,
  ALargeSmall,
} from "lucide-react";
import { FlashcardRichTextEditor } from "./flashcard-rich-text-editor";
import { useUpload } from "@/lib/use-upload";
import { authFetch } from "@/lib/auth-fetch";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ─── Flashcard side editor ───────────────────────────────────
function FlashcardSideEditor({
  label,
  side,
  cardId,
  sideKey,
  localeMode,
  chOverrides,
  onChange,
  onSetChOverride,
  onClearChOverride,
}: {
  label: string;
  side: FlashcardSide;
  cardId: string;
  sideKey: "front" | "back";
  localeMode: FlashcardLocaleMode;
  chOverrides?: Record<string, Record<string, string>>;
  onChange: (side: FlashcardSide) => void;
  onSetChOverride: (cardId: string, fieldPath: string, value: string) => void;
  onClearChOverride: (cardId: string, fieldPath: string) => void;
}) {
  const t = useTranslations("flashcardEditor");
  const { upload, isUploading } = useUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    try {
      const result = await upload(file);
      if (localeMode === "CH") {
        onSetChOverride(cardId, `${sideKey}.image`, result.url);
      } else {
        onChange({ ...side, image: result.url });
      }
    } catch (err) {
      console.error("[FlashcardEditor] Upload error:", err);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleFileUpload(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const removeImage = () => {
    if (localeMode === "CH") {
      if (hasChOverride(cardId, `${sideKey}.image`, chOverrides)) {
        onClearChOverride(cardId, `${sideKey}.image`);
      } else {
        // Set empty override to hide the DE image in CH
        onSetChOverride(cardId, `${sideKey}.image`, "");
      }
    } else {
      onChange({ ...side, image: undefined, imageAspectRatio: undefined, imageScale: undefined });
    }
  };

  // Resolve effective image for display
  const effectiveImage = localeMode === "CH"
    ? getEffectiveValue(side.image || "", cardId, `${sideKey}.image`, localeMode, chOverrides)
    : side.image;

  return (
    <div className="flex-1 space-y-2">
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {label}
      </label>

      {/* Card preview — matches PDF sub-container proportions (66mm × 37.125mm ≈ 16:9) */}
      <div
        className="relative group rounded overflow-hidden border border-border bg-white"
        style={{ aspectRatio: "66 / 37.125" }}
      >
        {/* Image layer */}
        {effectiveImage ? (
          (() => {
            const CONTAINER_RATIO = 66 / 37.125;
            const arStr = side.imageAspectRatio ?? "1:1";
            const [aw, ah] = arStr.split(":").map(Number);
            const ar = aw / ah;
            const scale = (side.imageScale ?? 100) / 100;
            let imgW: number, imgH: number;
            if (ar >= CONTAINER_RATIO) {
              imgW = 100 * scale;
              imgH = (CONTAINER_RATIO / ar) * 100 * scale;
            } else {
              imgW = (ar / CONTAINER_RATIO) * 100 * scale;
              imgH = 100 * scale;
            }
            return <>
            <img
              src={effectiveImage}
              alt=""
              className="absolute object-cover"
              style={{
                width: `${imgW}%`,
                height: `${imgH}%`,
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
                borderRadius: "2px",
              }}
            />
            {localeMode === "CH" && hasChOverride(cardId, `${sideKey}.image`, chOverrides) && (
              <Badge variant="secondary" className="absolute top-1.5 left-1.5 text-[9px] px-1 h-4 bg-amber-100 text-amber-700 z-10">
                🇨🇭 CH
              </Badge>
            )}
            <button
              className="absolute top-1.5 right-1.5 p-1 rounded-full bg-red-500 hover:bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
              onClick={removeImage}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>;
          })()
        ) : (
          <div
            className={`absolute inset-0 flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${
              isDragOver
                ? "bg-primary/10"
                : "hover:bg-muted/50"
            } text-muted-foreground`}
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            {isUploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : isDragOver ? (
              <>
                <Upload className="h-5 w-5 text-primary" />
                <span className="text-xs text-primary font-medium">{t("dropImage")}</span>
              </>
            ) : (
              <>
                <ImagePlus className="h-4 w-4" />
                <span className="text-[10px]">{t("dragOrClick")}</span>
              </>
            )}
          </div>
        )}

        {/* Text overlay — positioned like PDF */}
        {(() => {
          const effectiveText = getEffectiveValue(side.text, cardId, `${sideKey}.text`, localeMode, chOverrides);
          // Check if content has meaningful text (strip HTML tags for the check)
          const hasContent = effectiveText && effectiveText.replace(/<[^>]*>/g, "").trim();
          return hasContent ? (
          <div
            className="absolute inset-0 flex flex-col items-center px-2 pointer-events-none"
            style={{
              justifyContent:
                side.textPosition === "top" ? "flex-start" :
                side.textPosition === "bottom" ? "flex-end" : "center",
              paddingTop: side.textPosition === "top" ? "4px" : undefined,
              paddingBottom: side.textPosition === "bottom" ? "4px" : undefined,
            }}
          >
            <div
              className="text-center leading-tight bg-white/85 px-1.5 py-0.5 rounded-sm max-w-[90%] break-words [&_p]:m-0"
              style={{
                fontSize: `${Math.max(7, Math.round(((side.fontSize ?? 11) / 11) * 12))}px`,
              }}
              dangerouslySetInnerHTML={{ __html: effectiveText }}
            />
          </div>
        ) : null;
        })()}
      </div>

      {/* Image controls */}
      {side.image && (
        <div className="space-y-2">
          {/* Aspect ratio buttons */}
          <div className="flex gap-1">
            {(["16:9", "4:3", "1:1", "3:4", "9:16"] as const).map((ratio) => (
              <button
                key={ratio}
                className={`flex-1 text-[10px] px-1 py-0.5 rounded border transition-colors ${
                  (side.imageAspectRatio ?? "1:1") === ratio
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border hover:border-primary/50 text-muted-foreground"
                }`}
                onClick={() => onChange({ ...side, imageAspectRatio: ratio })}
              >
                {ratio}
              </button>
            ))}
          </div>
          {/* Scale slider */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground shrink-0">{t("imageScale")}</span>
            <Slider
              value={[side.imageScale ?? 100]}
              min={10}
              max={100}
              step={5}
              onValueChange={([value]) => onChange({ ...side, imageScale: value })}
              className="flex-1"
            />
            <span className="text-[10px] text-muted-foreground w-7 text-right">{side.imageScale ?? 100}%</span>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />

      {/* Text area */}
      <div className="space-y-1">
        <div className="flex items-center gap-1">
          {(["top", "center", "bottom"] as const).map((pos) => {
            const Icon = pos === "top" ? AlignVerticalJustifyStart : pos === "center" ? AlignVerticalJustifyCenter : AlignVerticalJustifyEnd;
            return (
              <button
                key={pos}
                className={`p-1 rounded transition-colors ${
                  (side.textPosition ?? "center") === pos
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}
                onClick={() => onChange({ ...side, textPosition: pos })}
                title={t(`textPosition_${pos}`)}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            );
          })}
          <div className="w-px h-4 bg-border mx-0.5" />
          {/* Text size slider */}
          <ALargeSmall className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <Slider
            value={[side.fontSize ?? 11]}
            min={6}
            max={120}
            step={1}
            onValueChange={([value]) => onChange({ ...side, fontSize: value })}
            className="flex-1"
          />
          <span className="text-[10px] text-muted-foreground w-10 text-right">{side.fontSize ?? 11}pt</span>
        </div>
        <FlashcardRichTextEditor
          content={getEffectiveValue(side.text, cardId, `${sideKey}.text`, localeMode, chOverrides)}
          onChange={(html) => {
            if (localeMode === "CH") {
              const autoReplaced = replaceEszett(side.text);
              if (html === autoReplaced) {
                onClearChOverride(cardId, `${sideKey}.text`);
              } else {
                onSetChOverride(cardId, `${sideKey}.text`, html);
              }
            } else {
              onChange({ ...side, text: html });
            }
          }}
          className={
            localeMode === "CH" && hasChOverride(cardId, `${sideKey}.text`, chOverrides)
              ? "border-l-2 border-l-amber-400 bg-amber-50/50"
              : ""
          }
        />
        {localeMode === "CH" && (
          <div className="flex items-center gap-1 flex-wrap">
            {hasChOverride(cardId, `${sideKey}.text`, chOverrides) && (
              <button
                className="text-[10px] text-amber-600 hover:text-amber-800 underline"
                onClick={() => onClearChOverride(cardId, `${sideKey}.text`)}
              >
                ✕ {t("chOverrideRemove")}
              </button>
            )}
            <p className="text-[10px] text-muted-foreground truncate">
              {"🇩🇪 "}{side.text ? side.text.replace(/<[^>]*>/g, "").substring(0, 60) : "–"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Single flashcard editor row ─────────────────────────────
function FlashcardRow({
  card,
  index,
  isSelected,
  singleSided,
  localeMode,
  chOverrides,
  onSelect,
  onUpdate,
  onRemove,
  onDuplicate,
  onSetChOverride,
  onClearChOverride,
}: {
  card: FlashcardItem;
  index: number;
  isSelected: boolean;
  singleSided: boolean;
  localeMode: FlashcardLocaleMode;
  chOverrides?: Record<string, Record<string, string>>;
  onSelect: () => void;
  onUpdate: (updates: Partial<FlashcardItem>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onSetChOverride: (cardId: string, fieldPath: string, value: string) => void;
  onClearChOverride: (cardId: string, fieldPath: string) => void;
}) {
  const t = useTranslations("flashcardEditor");

  return (
    <div
      className={`group rounded-xl border bg-card transition-all ${
        isSelected
          ? "border-primary shadow-md ring-1 ring-primary/20"
          : "border-border hover:border-primary/30 hover:shadow-sm"
      }`}
      onClick={onSelect}
    >
      {/* Card header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50 bg-muted/30 rounded-t-xl">
        <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab" />
        <span className="text-xs font-medium text-muted-foreground">
          {t("cardNumber", { number: index + 1 })}
        </span>
        <div className="flex-1" />
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">{t("duplicateCard")}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">{t("deleteCard")}</TooltipContent>
        </Tooltip>
      </div>

      {/* Card content — front & back side by side */}
      <div className="flex gap-4 p-4">
        <FlashcardSideEditor
          label={t("front")}
          side={card.front}
          cardId={card.id}
          sideKey="front"
          localeMode={localeMode}
          chOverrides={chOverrides}
          onChange={(front) => onUpdate({ front })}
          onSetChOverride={onSetChOverride}
          onClearChOverride={onClearChOverride}
        />
        {!singleSided && (
          <>
            <div className="w-px bg-border self-stretch" />
            <FlashcardSideEditor
              label={t("back")}
              side={card.back}
              cardId={card.id}
              sideKey="back"
              localeMode={localeMode}
              chOverrides={chOverrides}
              onChange={(back) => onUpdate({ back })}
              onSetChOverride={onSetChOverride}
              onClearChOverride={onClearChOverride}
            />
          </>
        )}
      </div>
    </div>
  );
}

// ─── Inner editor (uses context) ─────────────────────────────
function FlashcardEditorInner({
  initialData,
}: {
  initialData?: FlashcardDocument | null;
}) {
  const { state, dispatch, addCard, duplicateCard, save } = useFlashcardEditor();
  const t = useTranslations("flashcardEditor");
  const tc = useTranslations("common");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);
  const [localeDialog, setLocaleDialog] = useState<{
    open: boolean;
    mode?: "cover" | "pdf";
  }>({ open: false });

  const handleDownloadCover = useCallback(async (locale: "DE" | "CH" = "DE") => {
    if (!state.worksheetId) {
      alert(t("saveFirst"));
      return;
    }
    setIsGeneratingCover(true);
    try {
      const res = await authFetch(`/api/worksheets/${state.worksheetId}/flashcard-cover?locale=${locale}`, {
        method: "POST",
      });
      if (!res.ok) {
        const text = await res.text();
        const err = text ? JSON.parse(text) : { error: `HTTP ${res.status}` };
        alert(t("pdfFailed", { error: err.error }));
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const shortId = state.worksheetId.slice(0, 16);
      a.download = `${shortId}_cover_${locale}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Cover download failed:", err);
    } finally {
      setIsGeneratingCover(false);
    }
  }, [state.worksheetId, t]);

  const handleDownloadPdf = useCallback(async (locale: "DE" | "CH" = "DE") => {
    if (!state.worksheetId) {
      alert(t("saveFirst"));
      return;
    }
    setIsGeneratingPdf(true);
    try {
      const res = await authFetch(`/api/worksheets/${state.worksheetId}/flashcard-pdf?locale=${locale}`);
      if (!res.ok) {
        let errorMsg = `HTTP ${res.status}`;
        try {
          const err = await res.json();
          errorMsg = err.error || errorMsg;
        } catch { /* response wasn't JSON */ }
        alert(t("pdfFailed", { error: errorMsg }));
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const shortId = state.worksheetId.slice(0, 16);
      a.download = `${shortId}_${locale}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF download failed:", err);
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [state.worksheetId, state.title, t]);

  // Load initial data
  useEffect(() => {
    if (initialData) {
      dispatch({
        type: "LOAD",
        payload: {
          id: initialData.id,
          title: initialData.title,
          slug: initialData.slug,
          cards: initialData.cards,
          settings: initialData.settings,
          published: initialData.published,
        },
      });
    }
  }, [initialData, dispatch]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [save]);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-background shrink-0">
        <Layers className="h-5 w-5 text-primary" />
        <Input
          className="max-w-xs text-base font-semibold border-none bg-transparent p-0 h-auto focus-visible:ring-0"
          value={state.title}
          onChange={(e) => dispatch({ type: "SET_TITLE", payload: e.target.value })}
          placeholder={t("titlePlaceholder")}
        />
        <div className="flex-1" />
        <Badge variant="outline" className="text-xs text-muted-foreground">
          {t("cardCount", { count: state.cards.length })}
        </Badge>
        {/* DE / CH locale toggle */}
        <div className="flex items-center bg-muted rounded-lg p-0.5">
          <Button
            variant={state.localeMode === "DE" ? "default" : "ghost"}
            size="sm"
            className={`h-7 px-2.5 gap-1 text-xs ${state.localeMode === "DE" ? "shadow-sm" : ""}`}
            onClick={() => dispatch({ type: "SET_LOCALE_MODE", payload: "DE" })}
          >
            {"🇩🇪"} DE
          </Button>
          <Button
            variant={state.localeMode === "CH" ? "default" : "ghost"}
            size="sm"
            className={`h-7 px-2.5 gap-1 text-xs ${state.localeMode === "CH" ? "shadow-sm" : ""}`}
            onClick={() => dispatch({ type: "SET_LOCALE_MODE", payload: "CH" })}
          >
            {"🇨🇭"} CH
            {countChOverrides(state.settings.chOverrides) > 0 && (
              <Badge variant="secondary" className="ml-0.5 h-4 px-1 text-[10px] bg-amber-100 text-amber-700">
                {countChOverrides(state.settings.chOverrides)}
              </Badge>
            )}
          </Button>
        </div>
        <div className="flex items-center gap-1.5">
          <Switch
            id="single-sided"
            checked={state.settings.singleSided}
            onCheckedChange={(checked) =>
              dispatch({ type: "UPDATE_SETTINGS", payload: { singleSided: checked } })
            }
          />
          <label htmlFor="single-sided" className="text-xs text-muted-foreground cursor-pointer select-none">
            {t("singleSided")}
          </label>
        </div>
        <div className="flex items-center gap-1.5">
          <Switch
            id="pad-empty-cards"
            checked={state.settings.padEmptyCards}
            onCheckedChange={(checked) =>
              dispatch({ type: "UPDATE_SETTINGS", payload: { padEmptyCards: checked } })
            }
          />
          <label htmlFor="pad-empty-cards" className="text-xs text-muted-foreground cursor-pointer select-none">
            {t("padEmptyCards")}
          </label>
        </div>
        {state.isDirty && (
          <Badge variant="secondary" className="text-xs">
            {tc("unsaved")}
          </Badge>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setLocaleDialog({ open: true, mode: "cover" })}
              disabled={isGeneratingCover || !state.worksheetId || state.cards.length === 0}
              className="gap-1.5"
            >
              {isGeneratingCover ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ImageDown className="h-4 w-4" />
              )}
              {t("downloadCover")}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{t("downloadCoverTooltip")}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setLocaleDialog({ open: true, mode: "pdf" })}
              disabled={isGeneratingPdf || !state.worksheetId || state.cards.length === 0}
              className="gap-1.5"
            >
              {isGeneratingPdf ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {t("downloadPdf")}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{t("downloadPdfTooltip")}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant={state.isDirty ? "default" : "outline"}
              onClick={save}
              disabled={state.isSaving}
              className="gap-1.5"
            >
              {state.isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {state.isSaving ? tc("saving") : tc("save")}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">⌘S</TooltipContent>
        </Tooltip>
      </div>

      {/* Card list */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto py-6 px-4 space-y-4">
          {state.cards.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Layers className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">
                {t("noCards")}
              </h3>
              <p className="text-sm text-muted-foreground/70 mt-1 mb-4">
                {t("noCardsDescription")}
              </p>
              <Button onClick={addCard} className="gap-2">
                <Plus className="h-4 w-4" />
                {t("addCard")}
              </Button>
            </div>
          ) : (
            <>
              {state.cards.map((card, idx) => (
                <FlashcardRow
                  key={card.id}
                  card={card}
                  index={idx}
                  isSelected={state.selectedCardId === card.id}
                  singleSided={state.settings.singleSided}
                  localeMode={state.localeMode}
                  chOverrides={state.settings.chOverrides}
                  onSelect={() =>
                    dispatch({ type: "SELECT_CARD", payload: card.id })
                  }
                  onUpdate={(updates) =>
                    dispatch({
                      type: "UPDATE_CARD",
                      payload: { id: card.id, updates },
                    })
                  }
                  onRemove={() =>
                    dispatch({ type: "REMOVE_CARD", payload: card.id })
                  }
                  onDuplicate={() => duplicateCard(card.id)}
                  onSetChOverride={(cardId, fieldPath, value) =>
                    dispatch({ type: "SET_CH_OVERRIDE", payload: { cardId, fieldPath, value } })
                  }
                  onClearChOverride={(cardId, fieldPath) =>
                    dispatch({ type: "CLEAR_CH_OVERRIDE", payload: { cardId, fieldPath } })
                  }
                />
              ))}

              {/* Add card button */}
              <button
                className="w-full py-3 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                onClick={addCard}
              >
                <Plus className="h-4 w-4" />
                <span className="text-sm font-medium">{t("addCard")}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Locale Picker Dialog */}
      <Dialog
        open={localeDialog.open}
        onOpenChange={(open) => setLocaleDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>{t("pdfLocaleTitle")}</DialogTitle>
            <DialogDescription>{t("pdfLocaleDescription")}</DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-2">
            <Button
              className="flex-1 gap-2"
              variant="outline"
              onClick={() => {
                const mode = localeDialog.mode;
                setLocaleDialog({ open: false });
                if (mode === "cover") handleDownloadCover("DE");
                else handleDownloadPdf("DE");
              }}
            >
              🇩🇪 Deutschland (ß)
            </Button>
            <Button
              className="flex-1 gap-2"
              variant="outline"
              onClick={() => {
                const mode = localeDialog.mode;
                setLocaleDialog({ open: false });
                if (mode === "cover") handleDownloadCover("CH");
                else handleDownloadPdf("CH");
              }}
            >
              🇨🇭 Schweiz (ss)
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Exported wrapper ────────────────────────────────────────
export function FlashcardEditor({
  initialData,
}: {
  initialData?: FlashcardDocument | null;
}) {
  return (
    <TooltipProvider>
      <FlashcardProvider>
        <FlashcardEditorInner initialData={initialData} />
      </FlashcardProvider>
    </TooltipProvider>
  );
}
