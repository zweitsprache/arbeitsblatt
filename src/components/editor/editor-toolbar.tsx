"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { authFetch } from "@/lib/auth-fetch";
import { useEditor } from "@/store/editor-store";
import { getEffectiveValue, hasChOverride, replaceEszett } from "@/lib/locale-utils";
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Brand, BrandSettings, DEFAULT_BRAND_SETTINGS } from "@/types/worksheet";
import { countChOverrides } from "@/lib/locale-utils";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Save,
  Printer,
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
} from "lucide-react";
import { WorksheetViewer } from "@/components/viewer/worksheet-viewer";
import { PrintPreview } from "./print-preview";

export function EditorToolbar() {
  const { state, dispatch, save } = useEditor();
  const t = useTranslations("toolbar");
  const tc = useTranslations("common");
  const [showOnlinePreview, setShowOnlinePreview] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showBrandSettings, setShowBrandSettings] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);

  // CH-aware title
  const isChMode = state.localeMode === "CH";
  const titleHasOverride = hasChOverride("_worksheet", "title", state.settings.chOverrides);
  const displayTitle = getEffectiveValue(state.title, "_worksheet", "title", state.localeMode, state.settings.chOverrides);

  const handleTitleChange = (value: string) => {
    if (isChMode) {
      const autoReplaced = replaceEszett(state.title);
      if (value === autoReplaced) {
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

  // Get current brand settings with fallbacks
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

  const handleDownloadPdf = async (preview = false, locale: "DE" | "CH" | "NEUTRAL" = "DE", outputMode: "worksheet" | "solutions" | "both" = "worksheet") => {
    if (!state.worksheetId) {
      alert(t("saveFirst"));
      return;
    }
    const setLoading = preview ? setIsGeneratingPreview : setIsGeneratingPdf;
    setLoading(true);
    try {
      const params = new URLSearchParams({ locale });
      if (outputMode === "solutions") params.set("solutions", "1");
      if (outputMode === "both") params.set("both", "1");
      const res = await authFetch(`/api/worksheets/${state.worksheetId}/pdf-v3?${params}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preview }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(t("pdfFailed", { error: err.error }));
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const shortId = state.worksheetId.slice(0, 16);
      const fileSuffix = locale === "NEUTRAL" ? "DACH" : locale;
      const modeSuffix = outputMode === "solutions" ? "_solutions" : outputMode === "both" ? "_complete" : "";
      a.download = preview
        ? `${shortId}_preview_${fileSuffix}${modeSuffix}.pdf`
        : `${shortId}_${fileSuffix}${modeSuffix}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF download error:", err);
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
        window.history.replaceState(null, "", `/editor/${data.id}`);
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

  const handleLocaleClick = async (locale: "DE" | "CH" | "NEUTRAL") => {
    const mode = pdfLocaleDialog.mode;
    const preview = pdfLocaleDialog.preview ?? false;
    const outputMode = pdfOutputMode;
    setPdfLocaleDialog({ open: false });
    setPdfOutputMode("worksheet");
    if (mode === "cover") {
      handleDownloadCover(locale);
    } else {
      handleDownloadPdf(preview, locale, outputMode);
    }
  };

  return (
    <>
      <div className="h-14 bg-background flex items-center px-4 gap-2 shrink-0">
        {/* Title */}
        <div className="flex items-center gap-1 max-w-[560px]">
          <Input
            value={displayTitle}
            onChange={(e) => handleTitleChange(e.target.value)}
            className={`h-8 font-medium flex-1 ${
              isChMode && titleHasOverride ? "bg-amber-50/50 border-l-2 border-l-amber-400" : ""
            }`}
            placeholder={t("titlePlaceholder")}
          />
          {isChMode && titleHasOverride && (
            <button
              type="button"
              onClick={() => dispatch({ type: "CLEAR_CH_OVERRIDE", payload: { blockId: "_worksheet", fieldPath: "title" } })}
              className="h-6 w-6 flex items-center justify-center rounded hover:bg-red-50 text-amber-500 hover:text-red-500 shrink-0"
              title={t("clearChTitle")}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {state.isDirty && (
          <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
            {tc("unsaved")}
          </Badge>
        )}

        <div className="flex-1" />

        {/* Brand selector */}
        <div className="flex items-center gap-1">
          <Select
            value={state.settings.brand || "edoomio"}
            onValueChange={(value: Brand) =>
              dispatch({ type: "UPDATE_SETTINGS", payload: { brand: value, brandSettings: DEFAULT_BRAND_SETTINGS[value] } })
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
            <TooltipContent>{t("brandSettings")}</TooltipContent>
          </Tooltip>
        </div>

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

        {/* Mode toggle */}
        <div className="flex items-center bg-muted rounded-lg p-0.5">
          <Button
            variant={state.viewMode === "print" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 gap-1.5"
            onClick={() => dispatch({ type: "SET_VIEW_MODE", payload: "print" })}
          >
            <Printer className="h-3.5 w-3.5" />
            {tc("print")}
          </Button>
          <Button
            variant={state.viewMode === "online" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 gap-1.5"
            onClick={() =>
              dispatch({ type: "SET_VIEW_MODE", payload: "online" })
            }
          >
            <Monitor className="h-3.5 w-3.5" />
            {tc("online")}
          </Button>
        </div>


        {/* Print Preview */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => setShowPrintPreview(true)}
            >
              <Printer className="h-3.5 w-3.5" />
              {t("printPreview")}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t("printPreviewTooltip")}</TooltipContent>
        </Tooltip>

        {/* Online Preview */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => setShowOnlinePreview(true)}
            >
              <Eye className="h-3.5 w-3.5" />
              {tc("preview")}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t("previewOnline")}</TooltipContent>
        </Tooltip>


        {/* Actions */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              onClick={save}
              disabled={state.isSaving}
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
              className="h-8 gap-1.5"
              onClick={handlePublish}
              disabled={state.isSaving}
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
                className="h-8 gap-1.5"
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
              className="h-8 gap-1.5"
              onClick={() => setPdfLocaleDialog({ open: true, mode: "cover" })}
              disabled={isGeneratingCover || !state.worksheetId}
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
              className="h-8"
              onClick={() => setPdfLocaleDialog({ open: true, preview: true, mode: "pdf" })}
              disabled={isGeneratingPreview || isGeneratingPdf}
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
              className="h-8"
              onClick={() => setPdfLocaleDialog({ open: true, preview: false, mode: "pdf" })}
              disabled={isGeneratingPdf || isGeneratingPreview}
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
      </div>

      {/* Print Preview Dialog */}
      <PrintPreview open={showPrintPreview} onOpenChange={setShowPrintPreview} />

      {/* PDF Locale Picker Dialog */}
      <Dialog
        open={pdfLocaleDialog.open}
        onOpenChange={(open) => setPdfLocaleDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("pdfLocaleTitle")}</DialogTitle>
            <DialogDescription>{t("pdfLocaleDescription")}</DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-2">
            <Button className="flex-1 gap-2" variant="outline"
              onClick={() => handleLocaleClick("DE")}
            >
              {"🇩🇪 Deutschland (ß)"}
            </Button>
            <Button className="flex-1 gap-2" variant="outline"
              onClick={() => handleLocaleClick("CH")}
            >
              {"🇨🇭 Schweiz (ss)"}
            </Button>
            <Button className="flex-1 gap-2" variant="outline"
              onClick={() => handleLocaleClick("NEUTRAL")}
            >
              {"🌐 Neutral"}
            </Button>
          </div>
          {pdfLocaleDialog.mode !== "cover" && (
          <div className="space-y-2 pt-2 border-t">
            <Label className="text-sm font-medium">{t("pdfContent")}</Label>
            <div className="flex gap-2">
              <Button
                variant={pdfOutputMode === "worksheet" ? "default" : "outline"}
                size="sm"
                className="flex-1 text-xs"
                onClick={() => setPdfOutputMode("worksheet")}
              >
                {t("pdfWorksheetOnly")}
              </Button>
              <Button
                variant={pdfOutputMode === "solutions" ? "default" : "outline"}
                size="sm"
                className="flex-1 text-xs"
                onClick={() => setPdfOutputMode("solutions")}
              >
                {t("pdfSolutionsOnly")}
              </Button>
              <Button
                variant={pdfOutputMode === "both" ? "default" : "outline"}
                size="sm"
                className="flex-1 text-xs"
                onClick={() => setPdfOutputMode("both")}
              >
                {t("pdfBoth")}
              </Button>
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
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Brand Settings Dialog */}
      <Dialog open={showBrandSettings} onOpenChange={setShowBrandSettings}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("brandSettings")} – {state.settings.brand || "edoomio"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm font-medium">{t("brandLogo")}</Label>
              <Input
                value={currentBrandSettings.logo}
                onChange={(e) => updateBrandSettings({ logo: e.target.value })}
                placeholder="/logo/my-logo.svg"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">{t("brandLogoHelp")}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">{t("organization")}</Label>
              <Input
                value={currentBrandSettings.organization}
                onChange={(e) => updateBrandSettings({ organization: e.target.value })}
                placeholder={t("organizationPlaceholder")}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">{t("teacher")}</Label>
              <Input
                value={currentBrandSettings.teacher}
                onChange={(e) => updateBrandSettings({ teacher: e.target.value })}
                placeholder={t("teacherPlaceholder")}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">{t("headerRight")}</Label>
              <textarea
                value={currentBrandSettings.headerRight}
                onChange={(e) => updateBrandSettings({ headerRight: e.target.value })}
                placeholder="HTML..."
                className="mt-1 w-full h-16 px-3 py-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="rounded-md bg-muted/50 p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">{t("availableVariables")}</p>
              <p className="text-xs text-muted-foreground font-mono">
                {"{current_date}"} · {"{current_year}"} · {"{current_page}"} · {"{no_of_pages}"} · {"{organization}"} · {"{teacher}"} · {"{worksheet_uuid}"}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium">{t("footerLeft")}</Label>
              <textarea
                value={currentBrandSettings.footerLeft}
                onChange={(e) => updateBrandSettings({ footerLeft: e.target.value })}
                placeholder="HTML..."
                className="mt-1 w-full h-16 px-3 py-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">{t("footerCenter")}</Label>
              <textarea
                value={currentBrandSettings.footerCenter}
                onChange={(e) => updateBrandSettings({ footerCenter: e.target.value })}
                placeholder="HTML..."
                className="mt-1 w-full h-16 px-3 py-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">{t("footerRight")}</Label>
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
    </>
  );
}
