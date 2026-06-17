"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { authFetch } from "@/lib/auth-fetch";
import { useEditor } from "@/store/editor-store";
import { hasChOverride } from "@/lib/locale-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Brand, BrandOverrides, BrandSubProfile, DEFAULT_BRAND_SETTINGS, applyBrandOverrides } from "@/types/worksheet";
import { countChOverrides } from "@/lib/locale-utils";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  useRouter,
  usePathname,
} from "next/navigation";
import {
  Save,
  Monitor,
  Globe,
  Download,
  Eye,
  Undo2,
  Redo2,
  Settings,
  Link,
  Copy,
  Check,
  ExternalLink,
  X,
  Loader2,
  ImageDown,
  AlertTriangle,
} from "lucide-react";
import { WorksheetViewer } from "@/components/viewer/worksheet-viewer";
import { PrintPreview } from "./print-preview";
import { cn } from "@/lib/utils";
import { PublishModal } from "@/components/library/publish-modal";
import { Upload } from "lucide-react";

export function EditorToolbar({
  editorVersion = "v1",
}: {
  editorVersion?: "v1" | "v2";
}) {
  const { state, access, dispatch, save } = useEditor();
  const t = useTranslations("toolbar");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [showOnlinePreview, setShowOnlinePreview] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showBrandSettings, setShowBrandSettings] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);

  // CH is base title; DE is override mode
  const isDeOverrideMode = state.localeMode === "DE";
  const titleHasOverride = hasChOverride("_worksheet", "title", state.settings.chOverrides);
  const titleOverride = state.settings.chOverrides?._worksheet?.title;
  const displayTitle = isDeOverrideMode && titleOverride !== undefined ? titleOverride : state.title;

  const handleTitleChange = (value: string) => {
    if (isDeOverrideMode) {
      if (value === state.title) {
        dispatch({ type: "CLEAR_CH_OVERRIDE", payload: { blockId: "_worksheet", fieldPath: "title" } });
      } else {
        dispatch({ type: "SET_CH_OVERRIDE", payload: { blockId: "_worksheet", fieldPath: "title", value } });
      }
    } else {
      dispatch({ type: "SET_TITLE", payload: value });
    }
  };
  const [pdfLocaleDialog, setPdfLocaleDialog] = useState<{
    open: boolean;
    preview?: boolean;
    mode?: "pdf" | "cover";
  }>({ open: false });
  const [pdfOutputMode, setPdfOutputMode] = useState<"worksheet" | "solutions" | "both">("worksheet");
  const [pdfLangs, setPdfLangs] = useState<Set<string>>(new Set(["de"]));
  const [pdfTranslationOnly, setPdfTranslationOnly] = useState(false);
  const [pdfTranslationStale, setPdfTranslationStale] = useState<{ isStale: boolean; staleCount: number } | null>(null);
  // When the PDF dialog opens, check whether translations are out of date so we
  // can warn before generating a translated PDF that would silently fall back to German.
  useEffect(() => {
    if (!pdfLocaleDialog.open || !state.worksheetId) {
      setPdfTranslationStale(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch(`/api/worksheets/${state.worksheetId}/translations/status`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled) setPdfTranslationStale({ isStale: !!data.isStale, staleCount: data.staleCount ?? 0 });
      } catch {
        /* silent */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pdfLocaleDialog.open, state.worksheetId]);
  const editorV2Enabled = process.env.NEXT_PUBLIC_ENABLE_EDITOR_V2 === "1";
  const cardBlocksForceCanva = state.blocks.some((block) => block.type === "domino" || block.type === "flashcards" || block.type === "aufgabenkarten");
  const effectivePdfFormat = cardBlocksForceCanva ? "landscape-canva" : (state.settings.orientation || "portrait");
  const canEditTitle = access.features.editTitle;
  const canEditWorksheetSettings = access.features.editWorksheetSettings;
  const canPreviewWorksheet = access.features.previewWorksheet;
  const canExportWorksheet = access.features.exportWorksheet;
  const canSaveWorksheet = access.features.saveWorksheet;
  const canPublishWorksheet = access.features.publishWorksheet;

  const handleOpenPrintPreviewInNewTab = async (showSolutions = false) => {
    if (!state.slug) {
      alert(t("saveFirst"));
      return;
    }
    if (state.isDirty) {
      await save();
    }
    const params = new URLSearchParams({ scale: "140" });
    if (showSolutions) {
      params.set("solutions", "1");
    }
    window.open(`/${locale}/worksheet/${state.slug}/print?${params.toString()}`, "_blank", "noopener,noreferrer");
  };

  const togglePdfLang = (code: string) => {
    setPdfLangs((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        if (next.size > 1) next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  // Get current brand settings with fallbacks — merge brand profile with per-worksheet overrides
  const resolvedBrand = applyBrandOverrides(state.brandProfile, state.settings.brandOverrides);
  const toLegacyBrandSettings = (updates: Partial<BrandOverrides> = {}) => {
    const merged = { ...resolvedBrand, ...updates };
    return {
      logo: merged.logo || merged.iconLogo || "",
      organization: merged.organization || "",
      teacher: merged.teacher || "",
      headerRight: merged.headerRight || "",
      footerLeft: merged.footerLeft || "",
      footerCenter: merged.footerCenter || "",
      footerRight: merged.footerRight || "",
    };
  };

  const updateBrandOverrides = (updates: Partial<BrandOverrides>) => {
    dispatch({
      type: "UPDATE_SETTINGS",
      payload: {
        brandOverrides: { ...state.settings.brandOverrides, ...updates },
        // Keep legacy brandSettings in sync for backward compat
        brandSettings: toLegacyBrandSettings(updates),
      },
    });
  };

  const handleDownloadPdf = async (preview = false, locale: "DE" | "CH" | "NEUTRAL" = "DE", outputMode: "worksheet" | "solutions" | "both" = "worksheet", lang: string = "de", translationOnly = false) => {
    if (!state.worksheetId) {
      alert(t("saveFirst"));
      return;
    }
    const setLoading = preview ? setIsGeneratingPreview : setIsGeneratingPdf;
    setLoading(true);
    try {
      const params = new URLSearchParams({ locale });
      params.set("orientation", effectivePdfFormat);
      if (outputMode === "solutions") params.set("solutions", "1");
      if (outputMode === "both") params.set("both", "1");
      if (lang && lang !== "de") params.set("lang", lang);
      if (lang && lang !== "de" && translationOnly) params.set("translationOnly", "1");
      const res = await authFetch(`/api/worksheets/${state.worksheetId}/pdf-v3?${params}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preview }),
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
      const fileSuffix = locale === "NEUTRAL" ? "DACH" : locale;
      const langSuffix = lang && lang !== "de" ? `_${lang.toUpperCase()}${translationOnly ? "_only" : ""}` : "";
      const modeSuffix = outputMode === "solutions" ? "_solutions" : outputMode === "both" ? "_complete" : "";
      a.download = preview
        ? `${shortId}_preview_${fileSuffix}${langSuffix}${modeSuffix}.pdf`
        : `${shortId}_${fileSuffix}${langSuffix}${modeSuffix}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF download error:", err);
      alert(t("pdfFailed", { error: err instanceof Error ? err.message : "Unknown error" }));
    } finally {
      const setLoading = preview ? setIsGeneratingPreview : setIsGeneratingPdf;
      setLoading(false);
    }
  };

  const shareUrl = state.slug
    ? `${window.location.origin}/worksheet/${state.slug}`
    : null;

  const handleDownloadCover = async (locale: "DE" | "CH" | "NEUTRAL" = "DE") => {
    if (!state.worksheetId) {
      alert(t("saveFirst"));
      return;
    }
    setIsGeneratingCover(true);
    try {
      const res = await authFetch(
        `/api/worksheets/${state.worksheetId}/cover?locale=${locale}`,
        { method: "POST" }
      );
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
      const fileSuffix = locale === "NEUTRAL" ? "DACH" : locale;
      a.download = `${shortId}_cover_${fileSuffix}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Cover download error:", err);
    } finally {
      setIsGeneratingCover(false);
    }
  };

  const handlePublish = async () => {
    const willPublish = !state.published;
    dispatch({ type: "SET_PUBLISHED", payload: willPublish });
    // Auto-save after toggling published state
    // We need to save with the new published value, so we do it manually
    dispatch({ type: "SET_SAVING", payload: true });
    try {
      const method = state.worksheetId ? "PUT" : "POST";
      const url = state.worksheetId
        ? `/api/worksheets/${state.worksheetId}`
        : "/api/worksheets";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: state.title,
          blocks: state.blocks,
          settings: state.settings,
          published: willPublish,
        }),
      });
      const data = await res.json();
      if (!state.worksheetId && data.id) {
        dispatch({
          type: "LOAD_WORKSHEET",
          payload: {
            id: data.id,
            title: data.title,
            slug: data.slug,
            blocks: data.blocks,
            settings: data.settings,
            published: data.published,
          },
        });
        const basePath = editorVersion === "v2" ? "editor-v2" : "editor";
        window.history.replaceState(null, "", `/${locale}/${basePath}/${data.id}`);
      }
      dispatch({ type: "MARK_SAVED" });
    } catch (err) {
      console.error("Publish save failed:", err);
      dispatch({ type: "SET_SAVING", payload: false });
    }
  };

  const handleCopyLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSwitchEditorVersion = () => {
    const targetBase = editorVersion === "v2" ? "editor" : "editor-v2";
    const target = state.worksheetId
      ? `/${locale}/${targetBase}/${state.worksheetId}`
      : `/${locale}/${targetBase}`;
    if (target !== pathname) {
      router.push(target);
    }
  };

  const handleLocaleClick = async (locale: "DE" | "CH" | "NEUTRAL") => {
    const mode = pdfLocaleDialog.mode;
    const preview = pdfLocaleDialog.preview ?? false;
    const outputMode = pdfOutputMode;
    const langs = Array.from(pdfLangs);
    const translationOnly = pdfTranslationOnly;
    setPdfLocaleDialog({ open: false });
    setPdfOutputMode("worksheet");
    setPdfLangs(new Set(["de"]));
    setPdfTranslationOnly(false);
    if (mode === "cover") {
      handleDownloadCover(locale);
    } else {
      for (const lang of langs) {
        await handleDownloadPdf(preview, locale, outputMode, lang, translationOnly);
      }
    }
  };

  // Available translation languages for this worksheet (from settings)
  const worksheetTranslationLangs = state.settings.translationLanguages ?? [];
  const LANG_LABELS: Record<string, string> = { de: "Deutsch", en: "Englisch", uk: "Ukrainisch", fr: "Französisch", es: "Spanisch", it: "Italienisch", pt: "Portugiesisch", tr: "Türkisch", pl: "Polnisch", ar: "Arabisch", ru: "Russisch", hu: "Ungarisch", ps: "Paschtu", fa: "Farsi/Dari", cs: "Tschechisch", ur: "Urdu" };
  const terracottaOutlineButtonClass = "!border-[#c8553d] !bg-transparent !text-[#c8553d] hover:!bg-transparent hover:!text-[#c8553d] hover:!border-[#c8553d] font-extrabold";
  const terracottaSolidButtonClass = "!border-[#c8553d] !bg-[#c8553d] !text-white hover:!bg-[#b54d38] hover:!border-[#b54d38] font-extrabold";

  return (
    <>
      <div className="relative z-10 h-14 bg-background flex items-center px-4 gap-2 shrink-0 shadow-[0_3px_10px_rgba(15,23,42,0.10)] border-b border-slate-200/50">
        {state.isDirty && (
          <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
            {tc("unsaved")}
          </Badge>
        )}

        {state.settings.orientation !== "portrait" && (
          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 border-blue-200">
            {state.settings.orientation === "landscape-canva"
              ? t("pdfOrientationLandscapeCanva")
              : t("landscapeMode")}
          </Badge>
        )}

        <div className="flex-1" />

        {editorV2Enabled && (
          <Button
            variant="outline"
            size="sm"
            className={cn("h-8 gap-1.5", terracottaOutlineButtonClass)}
            onClick={handleSwitchEditorVersion}
          >
            {editorVersion === "v2" ? t("editorSwitchToV1") : t("editorSwitchToV2")}
          </Button>
        )}

        {/* Print Preview */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn("h-8 w-36 px-2", terracottaOutlineButtonClass)}
                disabled={!canPreviewWorksheet}
                onClick={() => setShowPrintPreview(true)}
              >
                <Eye className="h-3.5 w-3.5 shrink-0" />
                <span className="flex-1 text-center">Übersetzungen</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("printPreviewTooltip")}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn("h-8 w-36 px-2", terracottaOutlineButtonClass)}
                disabled={!canPreviewWorksheet || !state.slug}
                onClick={() => void handleOpenPrintPreviewInNewTab(false)}
                aria-label={t("openInNewTab")}
              >
                <Eye className="h-3.5 w-3.5 shrink-0" />
                <span className="flex-1 text-center">Arbeitsblatt</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("openInNewTab")}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn("h-8 w-36 px-2", terracottaOutlineButtonClass)}
                disabled={!canPreviewWorksheet || !state.slug}
                onClick={() => void handleOpenPrintPreviewInNewTab(true)}
                aria-label={`${t("openInNewTab")} (${t("pdfSolutionsOnly")})`}
              >
                <Eye className="h-3.5 w-3.5 shrink-0" />
                <span className="flex-1 text-center">Lösungen</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{`${t("openInNewTab")} (${t("pdfSolutionsOnly")})`}</TooltipContent>
          </Tooltip>
        </div>

        {/* Online Preview */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn("h-8 w-36 px-2", terracottaOutlineButtonClass)}
              disabled={!canPreviewWorksheet}
              onClick={() => setShowOnlinePreview(true)}
            >
              <Eye className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1 text-center">Online</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t("previewOnline")}</TooltipContent>
        </Tooltip>


        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn("h-8 gap-1.5", terracottaOutlineButtonClass)}
              onClick={save}
              disabled={state.isSaving || !canSaveWorksheet}
            >
              <Save className="h-3.5 w-3.5" />
              {state.isSaving ? tc("saving") : tc("save")}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t("saveTooltip")}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={state.published ? "default" : "outline"}
              size="sm"
              className={cn(
                "h-8 gap-1.5",
                state.published ? terracottaSolidButtonClass : terracottaOutlineButtonClass,
              )}
              onClick={handlePublish}
              disabled={state.isSaving || !canPublishWorksheet}
            >
              <Globe className="h-3.5 w-3.5" />
              {state.published ? tc("published") : tc("publish")}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {state.published
              ? t("clickToUnpublish")
              : t("publishTooltip")}
          </TooltipContent>
        </Tooltip>

        {state.published && shareUrl && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn("h-8 gap-1.5", terracottaOutlineButtonClass)}
                onClick={handleCopyLink}
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-green-600" />
                ) : (
                  <Link className="h-3.5 w-3.5" />
                )}
                {copied ? t("copied") : t("copyLink")}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{shareUrl}</TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn("h-8 gap-1.5", terracottaOutlineButtonClass)}
              disabled={!canExportWorksheet || isGeneratingCover || !state.worksheetId}
              onClick={() => setPdfLocaleDialog({ open: true, mode: "cover" })}
            >
              {isGeneratingCover ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ImageDown className="h-3.5 w-3.5" />
              )}
              Cover
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t("downloadCover")}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn("h-8", terracottaOutlineButtonClass)}
              disabled={!canExportWorksheet || isGeneratingPreview || isGeneratingPdf}
              onClick={() => setPdfLocaleDialog({ open: true, preview: true, mode: "pdf" })}
            >
              {isGeneratingPreview ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isGeneratingPreview ? t("generatingPdf") : t("downloadPreviewPdf")}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn("h-8", terracottaOutlineButtonClass)}
              disabled={!canExportWorksheet || isGeneratingPdf || isGeneratingPreview}
              onClick={() => setPdfLocaleDialog({ open: true, preview: false, mode: "pdf" })}
            >
              {isGeneratingPdf ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isGeneratingPdf ? t("generatingPdf") : t("downloadPdf")}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn("h-8", terracottaOutlineButtonClass)}
              disabled={!state.worksheetId}
              onClick={() => setShowPublishModal(true)}
            >
              <Upload className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Publish to Library</TooltipContent>
        </Tooltip>
      </div>

      {/* Print Preview Dialog */}
      <PrintPreview
        open={showPrintPreview}
        onOpenChange={setShowPrintPreview}
        engine={editorVersion === "v2" ? "pagedjs" : "default"}
      />

      {/* PDF Locale Picker Dialog */}
      <Dialog
        open={pdfLocaleDialog.open}
        onOpenChange={(open) => setPdfLocaleDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("pdfLocaleTitle")}</DialogTitle>
            <DialogDescription>{t("pdfLocaleDescription")}</DialogDescription>
          </DialogHeader>
          {worksheetTranslationLangs.length > 0 && pdfLocaleDialog.mode !== "cover" && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">{t("translatedLanguages")}</Label>
                <button
                  type="button"
                  onClick={() => {
                    const allLangs = ["de", ...worksheetTranslationLangs];
                    setPdfLangs((prev) =>
                      prev.size === allLangs.length ? new Set(["de"]) : new Set(allLangs)
                    );
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {pdfLangs.size === worksheetTranslationLangs.length + 1 ? t("deselectAll") : t("selectAll")}
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {["de", ...worksheetTranslationLangs.slice().sort((a, b) => (LANG_LABELS[a] ?? a).localeCompare(LANG_LABELS[b] ?? b, "de"))].map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => togglePdfLang(code)}
                    className={`rounded-sm border px-2.5 py-1 text-xs font-medium transition-colors ${
                      pdfLangs.has(code)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input bg-background text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {LANG_LABELS[code] ?? code.toUpperCase()}
                  </button>
                ))}
              </div>
              {Array.from(pdfLangs).some((code) => code !== "de") && (
                <div className="space-y-2 pt-2">
                  <Label className="text-sm font-medium">{t("pdfTranslationMode")}</Label>
                  <div className="grid grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => setPdfTranslationOnly(false)}
                      className={`rounded-sm border px-2.5 py-1 text-xs font-medium transition-colors ${
                        !pdfTranslationOnly
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input bg-background text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t("pdfBilingual")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPdfTranslationOnly(true)}
                      className={`rounded-sm border px-2.5 py-1 text-xs font-medium transition-colors ${
                        pdfTranslationOnly
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input bg-background text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t("pdfTranslationOnly")}
                    </button>
                  </div>
                </div>
              )}
              {pdfTranslationStale?.isStale && Array.from(pdfLangs).some((code) => code !== "de") && (
                <div className="flex items-start gap-2 rounded-sm border border-amber-500/50 bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>{t("pdfTranslationStale", { count: pdfTranslationStale.staleCount })}</span>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2 pt-1">
            <Label className="text-sm font-medium">{t("countryContext")}</Label>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleLocaleClick("DE")}
                className="rounded-sm border border-input bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Deutschland
              </button>
              <button
                type="button"
                onClick={() => handleLocaleClick("CH")}
                className="rounded-sm border border-input bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Schweiz
              </button>
              <button
                type="button"
                onClick={() => handleLocaleClick("NEUTRAL")}
                className="rounded-sm border border-input bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Neutral
              </button>
            </div>
          </div>

          {pdfLocaleDialog.mode !== "cover" && (
          <div className="space-y-2 pt-2">
            <Label className="text-sm font-medium">{t("pdfContent")}</Label>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setPdfOutputMode("worksheet")}
                className={`rounded-sm border px-2.5 py-1 text-xs font-medium transition-colors ${
                  pdfOutputMode === "worksheet"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("pdfWorksheetOnly")}
              </button>
              <button
                type="button"
                onClick={() => setPdfOutputMode("solutions")}
                className={`rounded-sm border px-2.5 py-1 text-xs font-medium transition-colors ${
                  pdfOutputMode === "solutions"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("pdfSolutionsOnly")}
              </button>
              <button
                type="button"
                onClick={() => setPdfOutputMode("both")}
                className={`rounded-sm border px-2.5 py-1 text-xs font-medium transition-colors ${
                  pdfOutputMode === "both"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("pdfBoth")}
              </button>
            </div>
          </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Online Preview Dialog */}
      <Dialog open={showOnlinePreview} onOpenChange={setShowOnlinePreview}>
        <DialogContent className="max-w-4xl h-[90vh] p-0 flex flex-col">
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle>{t("onlinePreview")}</DialogTitle>
              {state.published && shareUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => window.open(shareUrl, "_blank")}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {t("openInNewTab")}
                </Button>
              )}
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-auto bg-muted/30">
            <WorksheetViewer
              title={state.title}
              blocks={state.blocks}
              settings={state.settings}
              mode="online"
              brandProfile={state.brandProfile}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Publish to Library Modal */}
      {state.brandProfile?.id && (
        <PublishModal
          open={showPublishModal}
          onOpenChange={setShowPublishModal}
          worksheetId={state.worksheetId || ""}
          worksheetUpdatedAt={new Date().toISOString()}
          brandId={state.brandProfile.id}
          onSuccess={() => {
            // Could refresh data or show success toast here
          }}
        />
      )}
    </>
  );
}
