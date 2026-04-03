"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { useEditor } from "@/store/editor-store";
import { Button } from "@/components/ui/button";
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
import { ZoomIn, ZoomOut, Printer, RotateCcw, Loader2, RefreshCw } from "lucide-react";

const LANG_LABELS: Record<string, string> = {
  de: "Deutsch",
  en: "English",
  uk: "Українська",
  fr: "Français",
  es: "Español",
  it: "Italiano",
  pt: "Português",
  tr: "Türkçe",
  pl: "Polski",
  ar: "العربية",
};

export function PrintPreview({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { state, save } = useEditor();
  const t = useTranslations("printPreview");
  const locale = useLocale();
  const [zoom, setZoom] = useState(70);
  const [loading, setLoading] = useState(true);
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [country, setCountry] = useState<"DE" | "CH">("DE");
  const [lang, setLang] = useState("de");
  const [showSolutions, setShowSolutions] = useState(false);

  const translationLangs = state.settings.translationLanguages ?? [];

  // Build the print URL — same one Puppeteer navigates to
  const buildPrintUrl = useCallback(() => {
    if (!state.slug) return null;
    const params = new URLSearchParams();
    if (country === "CH") params.set("ch", "1");
    if (lang && lang !== "de") params.set("lang", lang);
    if (showSolutions) params.set("solutions", "1");
    params.set("_t", String(Date.now()));
    return `/${locale}/worksheet/${state.slug}/print?${params}`;
  }, [locale, state.slug, country, lang, showSolutions]);

  // Auto-save if dirty, then load the iframe
  useEffect(() => {
    if (!open) {
      setIframeSrc(null);
      setLoading(true);
      return;
    }

    if (!state.worksheetId) return;

    let cancelled = false;

    const loadPreview = async () => {
      if (state.isDirty) {
        setSaving(true);
        await save();
        setSaving(false);
      }
      if (cancelled) return;
      setLoading(true);
      setIframeSrc(buildPrintUrl());
    };

    loadPreview();
    return () => { cancelled = true; };
  }, [open, state.worksheetId, state.isDirty, save, buildPrintUrl]);

  const handleReload = useCallback(async () => {
    setLoading(true);
    if (state.isDirty) {
      setSaving(true);
      await save();
      setSaving(false);
    }
    setIframeSrc(buildPrintUrl());
  }, [state.isDirty, save, buildPrintUrl]);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 10, 150));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 10, 30));
  const handleResetZoom = () => setZoom(70);

  const noWorksheet = !state.worksheetId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[95vw] w-[95vw] h-[95vh] p-0 flex flex-col">
        <DialogHeader className="px-6 py-3 border-b shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Printer className="h-4 w-4" />
              {t("title")}
            </DialogTitle>
            <div className="flex items-center gap-4">
              {/* Country variant */}
              <div className="flex items-center gap-1">
                <Button
                  variant={country === "DE" ? "default" : "outline"}
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setCountry("DE")}
                >
                  DE
                </Button>
                <Button
                  variant={country === "CH" ? "default" : "outline"}
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setCountry("CH")}
                >
                  CH
                </Button>
              </div>

              {/* Translation language */}
              {translationLangs.length > 0 && (
                <Select value={lang} onValueChange={setLang}>
                  <SelectTrigger className="h-7 w-auto min-w-[120px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="de">{LANG_LABELS.de}</SelectItem>
                    {translationLangs.map((code) => (
                      <SelectItem key={code} value={code}>
                        {LANG_LABELS[code] || code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Solutions toggle */}
              <Button
                variant={showSolutions ? "default" : "outline"}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setShowSolutions((s) => !s)}
              >
                {t("solutions")}
              </Button>

              {/* Reload button */}
              <Button variant="ghost" size="sm" className="h-7 gap-1.5" onClick={handleReload} disabled={noWorksheet}>
                <RefreshCw className="h-3 w-3" />
                {t("reload")}
              </Button>

              {/* Zoom controls */}
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomOut}>
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs font-mono w-10 text-center">{zoom}%</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomIn}>
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleResetZoom}>
                  <RotateCcw className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Iframe preview area */}
        <div className="flex-1 overflow-auto bg-muted/50 relative">
          {noWorksheet ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p className="text-sm">{t("saveFirst")}</p>
            </div>
          ) : (
            <>
              {(loading || saving) && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted/80">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm">{saving ? t("saving") : t("loading")}</span>
                  </div>
                </div>
              )}
              {iframeSrc && (
                <div className="mx-auto overflow-hidden" style={{ width: `${794 * zoom / 100}px`, maxWidth: "100%" }}>
                  <iframe
                    src={iframeSrc}
                    className="border-0"
                    scrolling="no"
                    onLoad={() => setLoading(false)}
                    style={{
                      transform: `scale(${zoom / 100})`,
                      transformOrigin: "top left",
                      width: 794,
                      height: 5000,
                    }}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
