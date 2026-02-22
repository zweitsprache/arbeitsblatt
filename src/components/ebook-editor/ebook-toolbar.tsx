"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Save, Loader2, Download, Eye, ArrowLeft } from "lucide-react";
import { useEBook } from "@/store/ebook-store";
import { Link } from "@/i18n/navigation";
import { useState } from "react";
import { authFetch } from "@/lib/auth-fetch";

export function EBookToolbar() {
  const t = useTranslations("ebook");
  const tc = useTranslations("common");
  const tt = useTranslations("toolbar");
  const { state, dispatch, save } = useEBook();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: "SET_TITLE", payload: e.target.value });
  };

  const handleDownloadPdf = async () => {
    if (!state.ebookId) {
      alert(tt("saveFirst"));
      return;
    }

    setIsGeneratingPdf(true);
    try {
      const res = await authFetch(`/api/ebooks/${state.ebookId}/pdf`);
      if (!res.ok) {
        let errorMsg = `HTTP ${res.status}`;
        try {
          const error = await res.json();
          errorMsg = error.error || errorMsg;
        } catch { /* response wasn't JSON */ }
        throw new Error(errorMsg);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${state.title || "ebook"}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert(tt("pdfFailed", { error: (err as Error).message }));
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2 border-b bg-background">
      {/* Back button */}
      <Link href="/">
        <Button variant="ghost" size="icon" className="shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </Link>

      <Separator orientation="vertical" className="h-6" />

      {/* Title input */}
      <Input
        value={state.title}
        onChange={handleTitleChange}
        placeholder={t("titlePlaceholder")}
        className="max-w-xs font-medium"
      />

      {/* Dirty indicator */}
      {state.isDirty && (
        <Badge variant="outline" className="text-xs">
          {tc("unsaved")}
        </Badge>
      )}

      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Preview */}
        {state.ebookId && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href={`/ebook/${state.slug}`} target="_blank">
                <Button variant="outline" size="sm" className="gap-2">
                  <Eye className="h-4 w-4" />
                  {t("preview")}
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent>{t("preview")}</TooltipContent>
          </Tooltip>
        )}

        {/* Download PDF */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf || !state.ebookId}
            >
              {isGeneratingPdf ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {isGeneratingPdf ? t("generatingPdf") : t("downloadPdf")}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t("downloadPdf")}</TooltipContent>
        </Tooltip>

        {/* Save */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              className="gap-2"
              onClick={save}
              disabled={state.isSaving}
            >
              {state.isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {state.isSaving ? tc("saving") : tc("save")}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{tt("saveTooltip")}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
