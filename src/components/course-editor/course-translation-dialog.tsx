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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Languages,
  Loader2,
  Check,
  AlertCircle,
} from "lucide-react";
import { useCourse } from "@/store/course-store";
import { authFetch } from "@/lib/auth-fetch";

interface TranslationStatus {
  hasTranslations: boolean;
  languages: string[];
  translatedAt: string | null;
  stringCount: number;
}

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  uk: "Українська",
  de: "Deutsch",
};

export function CourseTranslationDialog() {
  const t = useTranslations("course");
  const { state, save } = useCourse();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<TranslationStatus | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translateResult, setTranslateResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!state.courseId) return;
    try {
      const res = await authFetch(
        `/api/courses/${state.courseId}/translations/status`
      );
      if (res.ok) {
        setStatus(await res.json());
      }
    } catch {
      // Silently ignore status fetch errors
    }
  }, [state.courseId]);

  useEffect(() => {
    if (open) {
      fetchStatus();
      setTranslateResult(null);
      setError(null);
    }
  }, [open, fetchStatus]);

  const handleTranslate = async () => {
    if (!state.courseId) return;
    setIsTranslating(true);
    setError(null);
    setTranslateResult(null);
    try {
      // Always save current editor state before translating
      if (state.isDirty) {
        await save();
      }

      const res = await authFetch(
        `/api/courses/${state.courseId}/translations/translate`,
        { method: "POST" }
      );
      const data = await res.json();
      if (res.ok) {
        setTranslateResult(
          t("translateSuccess", {
            count: data.stringCount,
            languages: data.languages.join(", "),
          })
        );
        await fetchStatus();
      } else {
        setError(data.error || t("translateFailed"));
      }
    } catch {
      setError(t("translateFailed"));
    } finally {
      setIsTranslating(false);
    }
  };

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
          {/* Status info */}
          {status && (
            <div className="space-y-2 rounded-sm border p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {t("stringCount")}
                </span>
                <span className="font-medium">{status.stringCount}</span>
              </div>

              {status.hasTranslations && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      {t("translatedLanguages")}
                    </span>
                    <div className="flex gap-1">
                      {status.languages.map((lang) => (
                        <Badge key={lang} variant="secondary" className="text-xs">
                          {LANGUAGE_LABELS[lang] || lang}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      {t("lastSynced")}
                    </span>
                    <span className="text-xs">
                      {status.translatedAt
                        ? new Date(status.translatedAt).toLocaleString()
                        : "—"}
                    </span>
                  </div>
                </>
              )}

              {!status.hasTranslations && (
                <p className="text-muted-foreground text-xs">
                  {t("noTranslationsYet")}
                </p>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-sm border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Success message */}
          {translateResult && (
            <div className="flex items-center gap-2 rounded-sm border border-green-500/50 bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400">
              <Check className="h-4 w-4 shrink-0" />
              {translateResult}
            </div>
          )}

          {/* Action */}
          <Button
            onClick={handleTranslate}
            disabled={isTranslating}
            className="w-full gap-2"
          >
            {isTranslating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Languages className="h-4 w-4" />
            )}
            {isTranslating ? t("translateInProgress") : t("translateCourse")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
