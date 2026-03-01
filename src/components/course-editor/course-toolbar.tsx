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
import { Save, Loader2, ArrowLeft, Eye } from "lucide-react";
import { useCourse } from "@/store/course-store";
import { Link } from "@/i18n/navigation";
import { CourseTranslationDialog } from "./course-translation-dialog";

export function CourseToolbar() {
  const t = useTranslations("course");
  const tc = useTranslations("common");
  const tt = useTranslations("toolbar");
  const { state, dispatch, save } = useCourse();

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: "SET_TITLE", payload: e.target.value });
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2 border-b bg-background">
      {/* Back button */}
      <Link href="/courses">
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
        {/* Translations */}
        {state.courseId && <CourseTranslationDialog />}

        {/* Preview */}
        {state.courseId && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href={
                  state.selectedLessonId && state.selectedModuleId && state.selectedTopicId
                    ? `/course/${state.slug}/${state.selectedModuleId}/${state.selectedTopicId}/${state.selectedLessonId}`
                    : `/course/${state.slug}`
                }
                target="_blank"
              >
                <Button variant="outline" size="sm" className="gap-2">
                  <Eye className="h-4 w-4" />
                  {t("preview")}
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent>{t("preview")}</TooltipContent>
          </Tooltip>
        )}

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
