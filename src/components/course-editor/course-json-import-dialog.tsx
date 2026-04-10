"use client";

import { useRef, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCourse } from "@/store/course-store";
import { parseCourseStructureImport } from "@/types/course";
import { AlertCircle, Upload } from "lucide-react";

const SAMPLE_STRUCTURE_JSON = `[
  {
    "title": "Module 1",
    "topics": [
      {
        "title": "Topic 1",
        "lessons": [
          { "title": "Lesson 1" }
        ]
      }
    ]
  }
]`;

export function CourseJsonImportDialog() {
  const t = useTranslations("course");
  const tc = useTranslations("common");
  const { state, dispatch } = useCourse();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);

  const resetState = () => {
    setJsonText("");
    setError(null);
    setIsLoadingFile(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) resetState();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setIsLoadingFile(true);
    setError(null);

    try {
      const text = await file.text();
      setJsonText(text);
    } catch {
      setError(t("jsonImportFileReadFailed"));
    } finally {
      setIsLoadingFile(false);
    }
  };

  const handleImport = () => {
    try {
      const parsed = JSON.parse(jsonText);
      const structure = parseCourseStructureImport(parsed);

      if (
        state.structure.length > 0 &&
        !confirm(t("jsonImportReplaceConfirm"))
      ) {
        return;
      }

      dispatch({ type: "REPLACE_STRUCTURE", payload: structure });
      handleOpenChange(false);
    } catch {
      setError(t("jsonImportInvalid"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Upload className="h-4 w-4" />
              {t("jsonImport")}
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>{t("jsonImportTooltip")}</TooltipContent>
      </Tooltip>

      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("jsonImportTitle")}</DialogTitle>
          <DialogDescription>{t("jsonImportDescription")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoadingFile}
            >
              {t("jsonImportFile")}
            </Button>
            <Input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="course-json-import">{t("jsonImportFieldLabel")}</Label>
            <Textarea
              id="course-json-import"
              value={jsonText}
              onChange={(event) => {
                setJsonText(event.target.value);
                if (error) setError(null);
              }}
              placeholder={SAMPLE_STRUCTURE_JSON}
              className="min-h-72 font-mono text-xs"
              spellCheck={false}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-sm border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
              {tc("cancel")}
            </Button>
            <Button
              type="button"
              onClick={handleImport}
              disabled={jsonText.trim().length === 0 || isLoadingFile}
            >
              {t("jsonImportApply")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}