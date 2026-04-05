"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Languages, Loader2, Check, AlertCircle } from "lucide-react";
import { useEditor } from "@/store/editor-store";
import { authFetch } from "@/lib/auth-fetch";

interface TranslationStatus {
  hasTranslations: boolean;
  languages: string[];
  translatedAt: string | null;
  stringCount: number;
  targetLanguages: string[];
}

/** All supported target languages with human-readable labels and flag codes. */
const AVAILABLE_LANGUAGES: { code: string; label: string; flagCode: string }[] = [
  { code: "en", label: "English", flagCode: "gb" },
  { code: "uk", label: "Українська", flagCode: "ua" },
  { code: "fr", label: "Français", flagCode: "fr" },
  { code: "es", label: "Español", flagCode: "es" },
  { code: "it", label: "Italiano", flagCode: "it" },
  { code: "pt", label: "Português", flagCode: "pt" },
  { code: "tr", label: "Türkçe", flagCode: "tr" },
  { code: "pl", label: "Polski", flagCode: "pl" },
  { code: "ar", label: "العربية", flagCode: "sa" },
];

const LANGUAGE_LABELS: Record<string, string> = Object.fromEntries(
  AVAILABLE_LANGUAGES.map(({ code, label }) => [code, label])
);

export function WorksheetTranslationDialog() {
  const t = useTranslations("toolbar");
  const { state, save, dispatch } = useEditor();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<TranslationStatus | null>(null);
  const [selectedLangs, setSelectedLangs] = useState<string[]>([]);
  const [isSavingLangs, setIsSavingLangs] = useState(false);
  const [translationMode, setTranslationMode] = useState<"delta" | "force" | null>(null);
  const [translateResult, setTranslateResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!state.worksheetId) return;
    try {
      const res = await authFetch(`/api/worksheets/${state.worksheetId}/translations/status`);
      if (res.ok) {
        const data: TranslationStatus = await res.json();
        setStatus(data);
        setSelectedLangs(data.targetLanguages ?? []);
      }
    } catch {
      /* silent */
    }
  }, [state.worksheetId]);

  useEffect(() => {
    if (open) {
      fetchStatus();
      setTranslateResult(null);
      setError(null);
    }
  }, [open, fetchStatus]);

  const toggleLanguage = (code: string) => {
    setSelectedLangs((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleSaveLanguages = async () => {
    if (!state.worksheetId) return;
    setIsSavingLangs(true);
    try {
      const newSettings = { ...state.settings, translationLanguages: selectedLangs };
      await authFetch(`/api/worksheets/${state.worksheetId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: newSettings }),
      });
      // Keep editor store in sync so the PDF dialog language selector updates immediately
      dispatch({ type: "UPDATE_SETTINGS", payload: { translationLanguages: selectedLangs } });
      await fetchStatus();
    } catch {
      /* silent */
    } finally {
      setIsSavingLangs(false);
    }
  };

  const handleTranslate = async (force = false) => {
    if (!state.worksheetId) return;
    setTranslationMode(force ? "force" : "delta");
    setError(null);
    setTranslateResult(null);
    try {
      if (state.isDirty) await save();
      const res = await authFetch(
        `/api/worksheets/${state.worksheetId}/translations/translate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ force }),
        }
      );
      const data = await res.json();
      if (res.ok) {
        if (data.stringCount === 0) {
          setTranslateResult(t("translateUpToDate"));
        } else {
          setTranslateResult(
            t("translateSuccess", {
              count: data.stringCount,
              languages: (data.languages as string[]).map((l) => LANGUAGE_LABELS[l] ?? l).join(", "),
            })
          );
        }
        await fetchStatus();
      } else {
        setError(data.error || t("translateFailed"));
      }
    } catch {
      setError(t("translateFailed"));
    } finally {
      setTranslationMode(null);
    }
  };

  // Determine if selected languages differ from saved target languages
  const langsChanged =
    JSON.stringify([...selectedLangs].sort()) !==
    JSON.stringify([...(status?.targetLanguages ?? [])].sort());

  const canTranslate = selectedLangs.length > 0 && !langsChanged;
  const isTranslating = translationMode !== null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Languages className="h-4 w-4" />
              {t("translations")}
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>{t("translationsTooltip")}</TooltipContent>
      </Tooltip>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("translationsTitle")}</DialogTitle>
          <DialogDescription>{t("translationsDescription")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Target language selector */}
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("targetLanguages")}</p>
            <p className="text-xs text-muted-foreground">{t("targetLanguagesHelp")}</p>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_LANGUAGES.map(({ code, label, flagCode }) => {
                const isSelected = selectedLangs.includes(code);
                return (
                  <button
                    key={code}
                    onClick={() => toggleLanguage(code)}
                    className={`flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-xs font-medium transition-colors ${
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input bg-background text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/flags/${flagCode}.svg`}
                      alt=""
                      className="inline-block h-[0.9em] w-[1.2em] rounded-[1px] object-cover"
                    />
                    {label}
                  </button>
                );
              })}
            </div>
            {langsChanged && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleSaveLanguages}
                disabled={isSavingLangs}
                className="gap-2"
              >
                {isSavingLangs ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                Sprachen speichern
              </Button>
            )}
          </div>

          {/* Status */}
          {status && (
            <div className="space-y-2 rounded-sm border p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("stringCount")}</span>
                <span className="font-medium">{status.stringCount}</span>
              </div>
              {status.hasTranslations && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t("translatedLanguages")}</span>
                    <div className="flex gap-1">
                      {status.languages.map((lang) => (
                        <Badge key={lang} variant="secondary" className="text-xs">
                          {LANGUAGE_LABELS[lang] ?? lang}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t("lastSynced")}</span>
                    <span className="text-xs">
                      {status.translatedAt
                        ? new Date(status.translatedAt).toLocaleString()
                        : "—"}
                    </span>
                  </div>
                </>
              )}
              {!status.hasTranslations && (
                <p className="text-xs text-muted-foreground">{t("noTranslationsYet")}</p>
              )}
            </div>
          )}

          {/* Feedback */}
          {error && (
            <div className="flex items-center gap-2 rounded-sm border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
          {translateResult && (
            <div className="flex items-center gap-2 rounded-sm border border-green-500/50 bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400">
              <Check className="h-4 w-4 shrink-0" />
              {translateResult}
            </div>
          )}

          {/* Translate buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => handleTranslate(false)}
              disabled={isTranslating || !canTranslate}
              className="gap-2"
            >
              {translationMode === "delta" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Languages className="h-4 w-4" />
              )}
              {translationMode === "delta" ? t("translateInProgress") : t("translateWorksheet")}
            </Button>
            {status?.hasTranslations && (
              <Button
                onClick={() => handleTranslate(true)}
                disabled={isTranslating || !canTranslate}
                variant="outline"
                className="gap-2"
              >
                {translationMode === "force" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Languages className="h-4 w-4" />
                )}
                {translationMode === "force"
                  ? t("forceRetranslateInProgress")
                  : t("forceRetranslate")}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
