"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CardProvider, useCardEditor } from "@/store/card-store";
import { CardDocument, CardItem, CardLayout, CARDS_PER_PAGE, getImageObjectFit } from "@/types/card";
import { Brand, BrandSettings, DEFAULT_BRAND_SETTINGS } from "@/types/worksheet";
import { authFetch } from "@/lib/auth-fetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Save,
  Plus,
  Trash2,
  Copy,
  GripVertical,
  ImagePlus,
  X,
  Loader2,
  LayoutGrid,
  Upload,
  Eye,
  Settings,
  Settings2,
  Download,
} from "lucide-react";
import { useUpload } from "@/lib/use-upload";
import { Slider } from "@/components/ui/slider";

// ─── Print preview component (A4 landscape, 2×2 grid) ───────

/** Replace brand template variables in header/footer HTML */
function replaceCardVariables(html: string, brandSettings?: BrandSettings): string {
  if (!html) return "";
  const now = new Date();
  const dateStr = now.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" });
  return html
    .replace(/\{current_date\}/g, dateStr)
    .replace(/\{current_year\}/g, String(now.getFullYear()))
    .replace(/\{organization\}/g, brandSettings?.organization || "")
    .replace(/\{teacher\}/g, brandSettings?.teacher || "");
}

function CardPrintPreview() {
  const { state } = useCardEditor();
  const t = useTranslations("cardEditor");
  const { cards, settings } = state;

  const layout = settings.layout || "landscape-4";
  const perPage = CARDS_PER_PAGE[layout];
  const isPortrait = layout === "portrait-2";

  // Card dimensions in mm for margin calculation
  const cardW = isPortrait ? 210 : 148.5;
  const cardH = isPortrait ? 148.5 : 105;

  // Group cards into pages
  const pages: CardItem[][] = [];
  for (let i = 0; i < cards.length; i += perPage) {
    pages.push(cards.slice(i, i + perPage));
  }

  if (cards.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        {t("noCards")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground text-center">
        {t(isPortrait ? "previewDescriptionPortrait" : "previewDescription")}
      </p>
      {pages.map((pageCards, pageIdx) => (
        <div key={pageIdx} className="mx-auto">
          <div
            className="bg-white border border-border shadow-sm mx-auto relative"
            style={{
              width: "100%",
              maxWidth: isPortrait ? "520px" : "740px",
              aspectRatio: isPortrait ? "210 / 297" : "297 / 210",
            }}
          >
            {/* Grid: 2×2 for landscape, 1×2 for portrait */}
            <div
              className={`absolute inset-0 grid ${
                isPortrait
                  ? "grid-cols-1 grid-rows-2"
                  : "grid-cols-2 grid-rows-2"
              }`}
            >
              {Array.from({ length: perPage }).map((_, slot) => {
                const card = pageCards[slot];
                const mX = (10 / cardW) * 100;
                const mY = (10 / cardH) * 100;
                const logoTop = (7 / cardH) * 100;
                const contentW = cardW - 2 * 10;
                const imgRatio = contentW / (contentW * 9 / 16 + 3);
                const imgBottom = (17 / cardH) * 100;
                return (
                  <div
                    key={slot}
                    className="relative flex flex-col overflow-hidden"
                  >
                    {card ? (
                      <>
                        {/* Brand logo — 7mm from top, 10mm from right, 6mm height */}
                        {settings.brandSettings?.logo && (
                          <img
                            src={settings.brandSettings.logo}
                            alt=""
                            className="absolute z-10 object-contain"
                            style={{
                              top: `${logoTop}%`,
                              right: `${mX}%`,
                              height: `${(6 / cardH) * 100}%`,
                              width: "auto",
                            }}
                          />
                        )}
                        {/* Header left text — 5mm from left, 5mm from top */}
                        {settings.brandSettings?.headerRight && (
                          <div
                            className="absolute z-10 text-[5px] leading-tight text-gray-600"
                            style={{
                              top: `${mY}%`,
                              left: `${mX}%`,
                            }}
                            dangerouslySetInnerHTML={{ __html: replaceCardVariables(settings.brandSettings.headerRight, settings.brandSettings) }}
                          />
                        )}
                        {/* Text area — fills space above the image container */}
                        {card.text && (
                          <div
                            className="flex items-center justify-center px-2 pointer-events-none"
                            style={{
                              position: "absolute",
                              top: 0,
                              left: `${mX}%`,
                              right: `${mX}%`,
                              bottom: `calc(${imgBottom}% + ((100% - ${mX * 2}%) / ${imgRatio}) + 1%)`,
                            }}
                          >
                            <span
                              className={`text-center leading-tight max-w-[95%] break-words ${
                                card.textSize === "sm"
                                  ? "text-[6px]"
                                  : card.textSize === "lg"
                                  ? "text-[10px]"
                                  : card.textSize === "xl"
                                  ? "text-xs"
                                  : "text-[8px]"
                              }`}
                            >
                              {card.text}
                            </span>
                          </div>
                        )}
                        {/* Image container — 10mm from left/right, 17mm from bottom */}
                        <div
                          className="absolute overflow-hidden rounded-[1px]"
                          style={{
                            left: `${mX}%`,
                            right: `${mX}%`,
                            bottom: `${imgBottom}%`,
                            aspectRatio: `${imgRatio}`,
                          }}
                        >
                          {card.image ? (
                            <img
                              src={card.image}
                              alt=""
                              className="w-full h-full"
                              style={{
                                ...getImageObjectFit(card.imageRatio),
                                transform: `scale(${(card.imageScale ?? 100) / 100})`,
                              }}
                            />
                          ) : (
                            <div className="w-full h-full bg-muted/20 border border-dashed border-border/40" />
                          )}
                        </div>
                        {/* Empty card placeholder */}
                        {!card.image && !card.text && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-muted-foreground/30 text-[7px]">
                              {t("emptyCard")}
                            </span>
                          </div>
                        )}
                        {/* Three-column footer (matching worksheet layout) */}
                        <div
                          className="absolute z-10 flex justify-between items-end text-[5px] leading-tight text-gray-600"
                          style={{
                            bottom: `${(8 / cardH) * 100}%`,
                            left: `${mX}%`,
                            right: `${mX}%`,
                          }}
                        >
                          <div
                            dangerouslySetInnerHTML={{ __html: replaceCardVariables(settings.brandSettings?.footerLeft || '', settings.brandSettings) }}
                          />
                          <div className="text-right"
                            dangerouslySetInnerHTML={{ __html: replaceCardVariables(settings.brandSettings?.footerRight || '', settings.brandSettings) }}
                          />
                        </div>
                      </>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-muted-foreground/20 text-[7px]">
                          {t("emptySlot")}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Cutting lines */}
            {settings.showCuttingLines && (
              <>
                {/* Vertical center line — landscape only */}
                {!isPortrait && (
                  <div
                    className="absolute top-0 bottom-0 left-1/2 -translate-x-px"
                    style={{
                      width: "1px",
                      borderLeft: `1px ${settings.cuttingLineStyle} #ccc`,
                    }}
                  />
                )}
                {/* Horizontal center line */}
                <div
                  className="absolute left-0 right-0 top-1/2 -translate-y-px"
                  style={{
                    height: "1px",
                    borderTop: `1px ${settings.cuttingLineStyle} #ccc`,
                  }}
                />
              </>
            )}

            {/* Page number */}
            <div className="absolute bottom-1 right-2 text-[8px] text-muted-foreground/40">
              {pageIdx + 1} / {pages.length}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Single card editor tile ─────────────────────────────────
function CardTile({
  card,
  index,
  isSelected,
  onSelect,
  onUpdate,
  onRemove,
  onDuplicate,
}: {
  card: CardItem;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<CardItem>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
}) {
  const t = useTranslations("cardEditor");
  const { state } = useCardEditor();
  const { upload, isUploading } = useUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    try {
      const result = await upload(file);
      // Detect natural aspect ratio
      const ratio = await new Promise<number>((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img.naturalWidth / img.naturalHeight);
        img.onerror = () => resolve(1);
        img.src = result.url;
      });
      onUpdate({ image: result.url, imageRatio: ratio });
    } catch (err) {
      console.error("[CardEditor] Upload error:", err);
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
    onUpdate({ image: undefined, imageScale: undefined, imageRatio: undefined });
  };

  // Card placement depends on layout
  const layout = state.settings.layout || "landscape-4";
  const perPage = CARDS_PER_PAGE[layout];
  const pageIdx = Math.floor(index / perPage) + 1;
  const slotIdx = (index % perPage) + 1;

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
        <span className="text-[10px] text-muted-foreground/50">
          {t("pageSlot", { page: pageIdx, slot: slotIdx })}
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

      {/* Card content */}
      <div className="p-4 space-y-3">
        {/* Card preview — matches print layout: text top, 16:9 image bottom with 4mm margins */}
        <div
          className="relative group/img rounded overflow-hidden border border-border bg-white"
          style={{ aspectRatio: "148.5 / 105" }}
        >
          {/* Brand logo — 7mm from top, 10mm from right, 6mm height */}
          {state.settings.brandSettings?.logo && (
            <img
              src={state.settings.brandSettings.logo}
              alt=""
              className="absolute z-10 object-contain"
              style={{
                top: `${(7 / 105) * 100}%`,
                right: `${(10 / 148.5) * 100}%`,
                height: `${(6 / 105) * 100}%`,
                width: "auto",
              }}
            />
          )}
          {/* Header left text — 10mm from left, 10mm from top */}
          {state.settings.brandSettings?.headerRight && (
            <div
              className="absolute z-10 text-[7px] leading-tight text-gray-600"
              style={{
                top: `${(10 / 105) * 100}%`,
                left: `${(10 / 148.5) * 100}%`,
              }}
              dangerouslySetInnerHTML={{ __html: replaceCardVariables(state.settings.brandSettings.headerRight, state.settings.brandSettings) }}
            />
          )}
          {/* Text area above image */}
          <div
            className="absolute flex items-center justify-center px-2"
            style={{
              top: "2%",
              left: `${(10 / 148.5) * 100}%`,
              right: `${(10 / 148.5) * 100}%`,
              height: "20%",
            }}
          >
            {card.text && (
              <span
                className={`text-center leading-tight max-w-[95%] break-words ${
                  card.textSize === "sm"
                    ? "text-[9px]"
                    : card.textSize === "lg"
                    ? "text-sm"
                    : card.textSize === "xl"
                    ? "text-base font-medium"
                    : "text-xs"
                }`}
              >
                {card.text}
              </span>
            )}
          </div>

          {/* 16:9 image container — 10mm from left/right, 10mm from bottom */}
          <div
            className="absolute overflow-hidden rounded-sm"
            style={{
              left: `${(10 / 148.5) * 100}%`,
              right: `${(10 / 148.5) * 100}%`,
              bottom: `${(10 / 105) * 100}%`,
              aspectRatio: "16 / 9",
            }}
          >
            {card.image ? (
              <>
                <img
                  src={card.image}
                  alt=""
                  className="w-full h-full"
                  style={{
                    ...getImageObjectFit(card.imageRatio),
                    transform: `scale(${(card.imageScale ?? 100) / 100})`,
                  }}
                />
                <button
                  className="absolute top-1.5 right-1.5 p-1 rounded-full bg-red-500 hover:bg-red-600 text-white opacity-0 group-hover/img:opacity-100 transition-opacity z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage();
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <div
                className={`w-full h-full flex flex-col items-center justify-center gap-1 cursor-pointer border border-dashed border-border/60 transition-colors ${
                  isDragOver ? "bg-primary/10" : "hover:bg-muted/50"
                } text-muted-foreground`}
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                {isUploading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : isDragOver ? (
                  <>
                    <Upload className="h-5 w-5 text-primary" />
                    <span className="text-xs text-primary font-medium">
                      {t("dropImage")}
                    </span>
                  </>
                ) : (
                  <>
                    <ImagePlus className="h-5 w-5" />
                    <span className="text-xs">{t("dragOrClick")}</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Three-column footer — 8mm from bottom */}
          <div
            className="absolute z-10 flex justify-between items-end text-[7px] leading-tight text-gray-600"
            style={{
              bottom: `${(8 / 105) * 100}%`,
              left: `${(10 / 148.5) * 100}%`,
              right: `${(10 / 148.5) * 100}%`,
            }}
          >
            <div
              dangerouslySetInnerHTML={{ __html: replaceCardVariables(state.settings.brandSettings?.footerLeft || '', state.settings.brandSettings) }}
            />
            <div className="text-right"
              dangerouslySetInnerHTML={{ __html: replaceCardVariables(state.settings.brandSettings?.footerRight || '', state.settings.brandSettings) }}
            />
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />

        {/* Image controls */}
        {card.image && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground shrink-0">
              {t("imageScale")}
            </span>
            <Slider
              value={[card.imageScale ?? 100]}
              min={10}
              max={200}
              step={5}
              onValueChange={([value]) => onUpdate({ imageScale: value })}
              className="flex-1"
            />
            <span className="text-[10px] text-muted-foreground w-7 text-right">
              {card.imageScale ?? 100}%
            </span>
          </div>
        )}

        {/* Text controls */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1">
            {/* Text size */}
            {(["sm", "md", "lg", "xl"] as const).map((size) => (
              <button
                key={size}
                className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  (card.textSize ?? "md") === size
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdate({ textSize: size });
                }}
              >
                {size.toUpperCase()}
              </button>
            ))}
          </div>
          <textarea
            className="w-full min-h-[48px] resize-y rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            placeholder={t("textPlaceholder")}
            value={card.text}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => onUpdate({ text: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Settings panel ──────────────────────────────────────────
function CardSettingsPanel() {
  const { state, dispatch } = useCardEditor();
  const t = useTranslations("cardEditor");
  const { settings } = state;

  return (
    <div className="space-y-4 p-4 border rounded-xl bg-card">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Settings2 className="h-4 w-4" />
        {t("settings")}
      </h3>

      {/* Layout selector */}
      <div className="space-y-1.5">
        <span className="text-xs text-muted-foreground">{t("layout")}</span>
        <div className="flex gap-1">
          {(["landscape-4", "portrait-2"] as const).map((layout) => (
            <button
              key={layout}
              className={`flex-1 text-xs px-2 py-1.5 rounded border transition-colors ${
                (settings.layout || "landscape-4") === layout
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border hover:border-primary/50 text-muted-foreground"
              }`}
              onClick={() =>
                dispatch({
                  type: "UPDATE_SETTINGS",
                  payload: { layout },
                })
              }
            >
              {t(`layout_${layout}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Cutting lines toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={settings.showCuttingLines}
          onChange={(e) =>
            dispatch({
              type: "UPDATE_SETTINGS",
              payload: { showCuttingLines: e.target.checked },
            })
          }
          className="rounded border-input"
        />
        <span className="text-sm">{t("showCuttingLines")}</span>
      </label>

      {/* Cutting line style */}
      {settings.showCuttingLines && (
        <div className="flex gap-1">
          {(["dashed", "dotted", "solid"] as const).map((style) => (
            <button
              key={style}
              className={`flex-1 text-xs px-2 py-1 rounded border transition-colors ${
                settings.cuttingLineStyle === style
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border hover:border-primary/50 text-muted-foreground"
              }`}
              onClick={() =>
                dispatch({
                  type: "UPDATE_SETTINGS",
                  payload: { cuttingLineStyle: style },
                })
              }
            >
              {t(`lineStyle_${style}`)}
            </button>
          ))}
        </div>
      )}

      {/* Padding */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground shrink-0">
          {t("cardPadding")}
        </span>
        <Slider
          value={[settings.cardPadding]}
          min={0}
          max={10}
          step={1}
          onValueChange={([value]) =>
            dispatch({
              type: "UPDATE_SETTINGS",
              payload: { cardPadding: value },
            })
          }
          className="flex-1"
        />
        <span className="text-xs text-muted-foreground w-8 text-right">
          {settings.cardPadding}mm
        </span>
      </div>
    </div>
  );
}

// ─── Inner editor (uses context) ─────────────────────────────
function CardEditorInner({
  initialData,
}: {
  initialData?: CardDocument | null;
}) {
  const { state, dispatch, addCard, duplicateCard, save } = useCardEditor();
  const t = useTranslations("cardEditor");
  const tt = useTranslations("toolbar");
  const tc = useTranslations("common");
  const [showPreview, setShowPreview] = useState(false);
  const [showBrandSettings, setShowBrandSettings] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Brand settings helpers
  const currentBrandSettings: BrandSettings = {
    ...DEFAULT_BRAND_SETTINGS[state.settings.brand || "edoomio"],
    ...state.settings.brandSettings,
  };

  const updateBrandSettings = (updates: Partial<BrandSettings>) => {
    dispatch({
      type: "UPDATE_SETTINGS",
      payload: {
        brandSettings: { ...currentBrandSettings, ...updates },
      },
    });
  };

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
      if ((e.metaKey || e.ctrlKey) && e.key === "p") {
        e.preventDefault();
        handleDownloadPdf();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [save]);

  // Download PDF via server-side Puppeteer generation
  const handleDownloadPdf = useCallback(async () => {
    if (!state.worksheetId) {
      alert(t("saveFirst"));
      return;
    }
    setIsGeneratingPdf(true);
    try {
      const res = await authFetch(`/api/worksheets/${state.worksheetId}/card-pdf`, {
        method: "POST",
      });
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
      a.download = `${shortId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF download failed:", err);
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [state.worksheetId, state.title, t]);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-background shrink-0">
        <LayoutGrid className="h-5 w-5 text-primary" />
        <Input
          className="max-w-xs text-base font-semibold border-none bg-transparent p-0 h-auto focus-visible:ring-0"
          value={state.title}
          onChange={(e) =>
            dispatch({ type: "SET_TITLE", payload: e.target.value })
          }
          placeholder={t("titlePlaceholder")}
        />

        {/* Brand selector */}
        <div className="flex items-center gap-1">
          <Select
            value={state.settings.brand || "edoomio"}
            onValueChange={(value: string) =>
              dispatch({
                type: "UPDATE_SETTINGS",
                payload: {
                  brand: value as Brand,
                  brandSettings: DEFAULT_BRAND_SETTINGS[value as Brand],
                },
              })
            }
          >
            <SelectTrigger className="h-8 w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="edoomio">edoomio</SelectItem>
              <SelectItem value="lingostar">lingostar</SelectItem>
            </SelectContent>
          </Select>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setShowBrandSettings(true)}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{tt("brandSettings")}</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex-1" />
        <Badge variant="outline" className="text-xs text-muted-foreground">
          {t("cardCount", { count: state.cards.length })}
        </Badge>
        <Badge variant="outline" className="text-xs text-muted-foreground">
          {t("pageCount", {
            count: Math.max(1, Math.ceil(state.cards.length / CARDS_PER_PAGE[state.settings.layout || "landscape-4"])),
          })}
        </Badge>
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
              onClick={handleDownloadPdf}
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
          <TooltipContent side="bottom">
            {t("downloadPdfTooltip")}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant={showPreview ? "default" : "outline"}
              onClick={() => setShowPreview(!showPreview)}
              className="gap-1.5"
            >
              <Eye className="h-4 w-4" />
              {t("preview")}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {t("previewTooltip")}
          </TooltipContent>
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

      {/* Brand Settings Dialog */}
      <Dialog open={showBrandSettings} onOpenChange={setShowBrandSettings}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{tt("brandSettings")} – {state.settings.brand || "edoomio"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm font-medium">{tt("brandLogo")}</Label>
              <Input
                value={currentBrandSettings.logo}
                onChange={(e) => updateBrandSettings({ logo: e.target.value })}
                placeholder="/logo/my-logo.svg"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">{tt("brandLogoHelp")}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">{tt("organization")}</Label>
              <Input
                value={currentBrandSettings.organization}
                onChange={(e) => updateBrandSettings({ organization: e.target.value })}
                placeholder={tt("organizationPlaceholder")}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">{tt("teacher")}</Label>
              <Input
                value={currentBrandSettings.teacher}
                onChange={(e) => updateBrandSettings({ teacher: e.target.value })}
                placeholder={tt("teacherPlaceholder")}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">{tt("headerRight")}</Label>
              <textarea
                value={currentBrandSettings.headerRight}
                onChange={(e) => updateBrandSettings({ headerRight: e.target.value })}
                placeholder="HTML..."
                className="mt-1 w-full h-16 px-3 py-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="rounded-md bg-muted/50 p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">{tt("availableVariables")}</p>
              <p className="text-xs text-muted-foreground font-mono">
                {"{current_date}"} · {"{current_year}"} · {"{organization}"} · {"{teacher}"}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium">{tt("footerLeft")}</Label>
              <textarea
                value={currentBrandSettings.footerLeft}
                onChange={(e) => updateBrandSettings({ footerLeft: e.target.value })}
                placeholder="HTML..."
                className="mt-1 w-full h-16 px-3 py-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">{tt("footerCenter")}</Label>
              <textarea
                value={currentBrandSettings.footerCenter}
                onChange={(e) => updateBrandSettings({ footerCenter: e.target.value })}
                placeholder="HTML..."
                className="mt-1 w-full h-16 px-3 py-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">{tt("footerRight")}</Label>
              <textarea
                value={currentBrandSettings.footerRight}
                onChange={(e) => updateBrandSettings({ footerRight: e.target.value })}
                placeholder="HTML..."
                className="mt-1 w-full h-16 px-3 py-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto py-6 px-4">
          {showPreview ? (
            <CardPrintPreview />
          ) : (
            <div className="space-y-4">
              {/* Settings */}
              <CardSettingsPanel />

              {/* Card list */}
              {state.cards.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <LayoutGrid className="h-12 w-12 text-muted-foreground/30 mb-4" />
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
                  {/* Grid of card editors — 2 columns to match print layout */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {state.cards.map((card, idx) => (
                      <CardTile
                        key={card.id}
                        card={card}
                        index={idx}
                        isSelected={state.selectedCardId === card.id}
                        onSelect={() =>
                          dispatch({
                            type: "SELECT_CARD",
                            payload: card.id,
                          })
                        }
                        onUpdate={(updates) =>
                          dispatch({
                            type: "UPDATE_CARD",
                            payload: { id: card.id, updates },
                          })
                        }
                        onRemove={() =>
                          dispatch({
                            type: "REMOVE_CARD",
                            payload: card.id,
                          })
                        }
                        onDuplicate={() => duplicateCard(card.id)}
                      />
                    ))}
                  </div>

                  {/* Add card button */}
                  <button
                    className="w-full py-3 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                    onClick={addCard}
                  >
                    <Plus className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {t("addCard")}
                    </span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Exported wrapper ────────────────────────────────────────
export function CardEditor({
  initialData,
}: {
  initialData?: CardDocument | null;
}) {
  return (
    <TooltipProvider>
      <CardProvider>
        <CardEditorInner initialData={initialData} />
      </CardProvider>
    </TooltipProvider>
  );
}
