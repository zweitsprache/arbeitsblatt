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
  Upload,
  Download,
  Loader2,
  ExternalLink,
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
  namespace: string | null;
}

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  uk: "Українська",
  de: "Deutsch",
};

export function CourseTranslationDialog() {
  const t = useTranslations("course");
  const { state } = useCourse();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<TranslationStatus | null>(null);
  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [pushResult, setPushResult] = useState<string | null>(null);
  const [pullResult, setPullResult] = useState<string | null>(null);
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
      setPushResult(null);
      setPullResult(null);
      setError(null);
    }
  }, [open, fetchStatus]);

  const handlePush = async () => {
    if (!state.courseId) return;
    setIsPushing(true);
    setError(null);
    setPushResult(null);
    try {
      const res = await authFetch(
        `/api/courses/${state.courseId}/translations/push`,
        { method: "POST" }
      );
      const data = await res.json();
      if (res.ok) {
        setPushResult(
          t("pushSuccess", {
            count: data.stringCount,
            newCount: data.newStrings,
          })
        );
        await fetchStatus();
      } else {
        setError(data.error || "Push failed");
      }
    } catch {
      setError("Push failed — network error");
    } finally {
      setIsPushing(false);
    }
  };

  const handlePull = async () => {
    if (!state.courseId) return;
    setIsPulling(true);
    setError(null);
    setPullResult(null);
    try {
      const res = await authFetch(
        `/api/courses/${state.courseId}/translations/pull`,
        { method: "POST" }
      );
      const data = await res.json();
      if (res.ok) {
        setPullResult(
          t("pullSuccess", { languages: data.languages.join(", ") })
        );
        await fetchStatus();
      } else {
        setError(data.error || "Pull failed");
      }
    } catch {
      setError("Pull failed — network error");
    } finally {
      setIsPulling(false);
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
            <div className="space-y-2 rounded-lg border p-3 text-sm">
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
            <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Success messages */}
          {pushResult && (
            <div className="flex items-center gap-2 rounded-lg border border-green-500/50 bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400">
              <Check className="h-4 w-4 shrink-0" />
              {pushResult}
            </div>
          )}
          {pullResult && (
            <div className="flex items-center gap-2 rounded-lg border border-green-500/50 bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400">
              <Check className="h-4 w-4 shrink-0" />
              {pullResult}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Button
              onClick={handlePush}
              disabled={isPushing || isPulling}
              className="gap-2"
            >
              {isPushing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {isPushing ? t("pushInProgress") : t("pushToI18nexus")}
            </Button>

            <Button
              onClick={handlePull}
              disabled={isPulling || isPushing || !status?.namespace}
              variant="outline"
              className="gap-2"
            >
              {isPulling ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {isPulling ? t("pullInProgress") : t("pullTranslations")}
            </Button>
          </div>

          {/* Link to i18nexus dashboard */}
          {status?.namespace && (
            <a
              href="https://app.i18nexus.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              {t("openInI18nexus")}
            </a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
