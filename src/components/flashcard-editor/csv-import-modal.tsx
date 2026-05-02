"use client";

import React, { useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { v4 as uuidv4 } from "uuid";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, FileText, Upload } from "lucide-react";
import { FlashcardItem } from "@/types/flashcard";
import { normalizeToHtml } from "@/lib/markdown-to-html";

interface CsvImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (cards: FlashcardItem[]) => void;
}

function parseDelimitedLine(line: string, separator: string): string[] {
  const parts: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === separator && !inQuotes) {
      parts.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  parts.push(current);
  return parts;
}

function parseCSV(text: string): { cards: FlashcardItem[]; errors: string[] } {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  const cards: FlashcardItem[] = [];
  const errors: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    let separator: string;
    if (line.includes("\t")) {
      separator = "\t";
    } else if (line.includes(";")) {
      separator = ";";
    } else if (line.includes(",")) {
      separator = ",";
    } else {
      cards.push({
        id: uuidv4(),
        front: { text: normalizeToHtml(line) },
        back: { text: "" },
      });
      continue;
    }

    const parts = parseDelimitedLine(line, separator);
    const front = normalizeToHtml(parts[0]?.trim() ?? "");
    const back = normalizeToHtml(parts[1]?.trim() ?? "");

    if (!front && !back) {
      errors.push(`${i + 1}`);
      continue;
    }

    cards.push({
      id: uuidv4(),
      front: { text: front },
      back: { text: back },
    });
  }

  return { cards, errors };
}

function stripTags(value: string): string {
  return value.replace(/<[^>]*>/g, "").trim();
}

export function CsvImportModal({ open, onOpenChange, onImport }: CsvImportModalProps) {
  const t = useTranslations("flashcardEditor");
  const [csvText, setCsvText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { cards, errors } = useMemo(() => parseCSV(csvText), [csvText]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (typeof text === "string") {
        setCsvText(text);
      }
    };
    reader.readAsText(file);

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImport = () => {
    if (cards.length === 0) return;
    onImport(cards);
    setCsvText("");
    onOpenChange(false);
  };

  const handleClose = (value: boolean) => {
    if (!value) setCsvText("");
    onOpenChange(value);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("csvImportTitle")}</DialogTitle>
          <DialogDescription>{t("csvImportDescription")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder={t("csvImportPlaceholder")}
            rows={10}
            className="font-mono text-sm"
          />

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileText className="h-4 w-4" />
              {t("csvImportFile")}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.tsv,.txt,.md,.markdown,.html,.htm"
              className="hidden"
              onChange={handleFileUpload}
            />
            {csvText && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="secondary">{t("csvImportPreview", { count: cards.length })}</Badge>
                {errors.length > 0 && (
                  <span className="flex items-center gap-1 text-amber-600">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {t("csvImportSkipped", { count: errors.length })}
                  </span>
                )}
              </div>
            )}
          </div>

          {cards.length > 0 && (
            <div className="border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-1.5 text-xs font-medium text-muted-foreground w-8">#</th>
                    <th className="text-left px-3 py-1.5 text-xs font-medium text-muted-foreground">{t("front")}</th>
                    <th className="text-left px-3 py-1.5 text-xs font-medium text-muted-foreground">{t("back")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {cards.slice(0, 50).map((card, i) => (
                    <tr key={card.id} className="hover:bg-muted/30">
                      <td className="px-3 py-1.5 text-xs text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-1.5 truncate max-w-[200px]">{stripTags(card.front.text)}</td>
                      <td className="px-3 py-1.5 truncate max-w-[200px]">{stripTags(card.back.text) || "-"}</td>
                    </tr>
                  ))}
                  {cards.length > 50 && (
                    <tr>
                      <td colSpan={3} className="px-3 py-1.5 text-xs text-muted-foreground text-center">
                        ... {t("csvImportMore", { count: cards.length - 50 })}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            {t("csvImportCancel")}
          </Button>
          <Button onClick={handleImport} disabled={cards.length === 0} className="gap-1.5">
            <Upload className="h-4 w-4" />
            {t("csvImportButton", { count: cards.length })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
