"use client";

import { useTranslations, useFormatter } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import {
  FileText,
  Clock,
  Search,
  X,
  Download,
  Layers,
  LayoutGrid,
  TableProperties,
  BookOpen,
  Library,
  Loader2,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { LibraryItemPreview } from "./library-item-preview";

interface LibraryItem {
  id: string;
  type: string;
  title: string;
  slug: string;
  description: string | null;
  orientation: "portrait" | "landscape";
  thumbnailUrl: string;
  hasThumbnail: boolean;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

type ContentType = "all" | "worksheet" | "cards" | "flashcards" | "grammar-table" | "ebook";

const typeConfig: Record<string, { icon: React.ComponentType<{ className?: string }>; colorClass: string }> = {
  worksheet: { icon: FileText, colorClass: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  cards: { icon: LayoutGrid, colorClass: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300" },
  flashcards: { icon: Layers, colorClass: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  "grammar-table": { icon: TableProperties, colorClass: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300" },
  ebook: { icon: BookOpen, colorClass: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300" },
};

export function LibraryDashboard() {
  const t = useTranslations("library");
  const tc = useTranslations("common");
  const format = useFormatter();
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ContentType>("all");
  const [searchResults, setSearchResults] = useState<LibraryItem[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [pdfLocaleDialog, setPdfLocaleDialog] = useState<{
    open: boolean;
    item?: LibraryItem;
  }>({ open: false });

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const typeParam = typeFilter !== "all" ? `?type=${typeFilter}` : "";
      const res = await authFetch(`/api/library${typeParam}`);
      const data = await res.json();
      setItems(data);
    } catch (err) {
      console.error("Failed to fetch library items:", err);
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Search with debounce
  useEffect(() => {
    if (!search.trim()) {
      setSearchResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const typeParam = typeFilter !== "all" ? `&type=${typeFilter}` : "";
        const res = await authFetch(
          `/api/library?search=${encodeURIComponent(search.trim())}${typeParam}`
        );
        const data = await res.json();
        setSearchResults(data);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [search, typeFilter]);

  const openDownload = (item: LibraryItem) => {
    if (item.type === "worksheet" || item.type === "grammar-table") {
      setPdfLocaleDialog({ open: true, item });
    } else {
      handleDownload(item);
    }
  };

  const handleDownload = async (item: LibraryItem, locale: "DE" | "CH" | "NEUTRAL" = "DE") => {

    setDownloadingId(item.id);
    try {
      // For worksheets/cards/flashcards, use the worksheet PDF endpoint
      // For grammar tables, use the grammar table PDF endpoint
      let pdfUrl: string;
      if (item.type === "grammar-table") {
        pdfUrl = `/api/worksheets/${item.id}/grammar-table-pdf-v2?locale=${locale}`;
      } else if (item.type === "ebook") {
        pdfUrl = `/api/ebooks/${item.id}/pdf`;
      } else {
        pdfUrl = `/api/worksheets/${item.id}/pdf-v3?locale=${locale}`;
      }

      const res = await authFetch(pdfUrl, { method: "POST" });
      if (!res.ok) {
        let errorMsg = `HTTP ${res.status}`;
        try {
          const err = await res.json();
          errorMsg = err.error || errorMsg;
        } catch { /* response wasn't JSON */ }
        throw new Error(errorMsg);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const shortId = item.id.slice(0, 16);
      const fileSuffix = locale === "NEUTRAL" ? "DACH" : locale;
      a.download = `${shortId}_${fileSuffix}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setDownloadingId(null);
    }
  };

  const getTypeLabel = (type: string): string => {
    switch (type) {
      case "worksheet": return t("typeWorksheet");
      case "cards": return t("typeCards");
      case "flashcards": return t("typeFlashcards");
      case "grammar-table": return t("typeGrammarTable");
      case "ebook": return t("typeEbook");
      default: return type;
    }
  };

  const getItemCountLabel = (item: LibraryItem): string => {
    switch (item.type) {
      case "worksheet": return t("blockCount", { count: item.itemCount });
      case "cards": return t("cardCount", { count: item.itemCount });
      case "flashcards": return t("flashcardCount", { count: item.itemCount });
      case "grammar-table": return t("tableCount", { count: item.itemCount });
      case "ebook": return t("chapterCount", { count: item.itemCount });
      default: return "";
    }
  };

  const displayItems = searchResults !== null ? searchResults : items;
  const isSearching = searchResults !== null;

  return (
    <div className="px-6 py-10 overflow-y-auto flex-1">
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-lg">
            <Library className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
            <p className="text-muted-foreground mt-1">{t("subtitle")}</p>
          </div>
        </div>
      </div>

      {/* Search and filter bar */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-10"
          />
          {search && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-muted rounded"
              onClick={() => setSearch("")}
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
        <Select
          value={typeFilter}
          onValueChange={(val) => setTypeFilter(val as ContentType)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={t("allTypes")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allTypes")}</SelectItem>
            <SelectItem value="worksheet">{t("typeWorksheet")}</SelectItem>
            <SelectItem value="cards">{t("typeCards")}</SelectItem>
            <SelectItem value="flashcards">{t("typeFlashcards")}</SelectItem>
            <SelectItem value="grammar-table">{t("typeGrammarTable")}</SelectItem>
            <SelectItem value="ebook">{t("typeEbook")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Search results info */}
      {isSearching && (
        <p className="text-sm text-muted-foreground mb-4">
          {searchLoading
            ? t("searching")
            : t("searchResults", { count: displayItems.length, query: search })}
        </p>
      )}

      {/* Content */}
      {loading && !isSearching ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          {tc("loading")}
        </div>
      ) : displayItems.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Library className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">
              {isSearching ? t("noResults") : t("noItemsYet")}
            </h3>
            <p className="text-sm text-muted-foreground/70 mt-1">
              {isSearching ? t("tryDifferentSearch") : t("noItemsDescription")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {displayItems.map((item) => {
            const config = typeConfig[item.type] || typeConfig.worksheet;
            const isDownloading = downloadingId === item.id;

            return (
              <Card
                key={item.id}
                className="hover:border-primary/50 hover:shadow-lg transition-all h-full flex flex-col overflow-hidden group"
              >
                {/* Preview area */}
                <LibraryItemPreview
                  type={item.type}
                  orientation={item.orientation}
                  title={item.title}
                  thumbnailUrl={item.thumbnailUrl}
                  hasThumbnail={item.hasThumbnail}
                />

                {/* Content area */}
                <CardContent className="p-4 flex flex-col gap-2 flex-1">
                  {/* Title */}
                  <h3 className="font-semibold text-sm line-clamp-2 leading-snug">
                    {item.title}
                  </h3>

                  {/* Type badge + date */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant="secondary"
                      className={`text-[10px] px-1.5 py-0 ${config.colorClass}`}
                    >
                      {getTypeLabel(item.type)}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      {format.dateTime(new Date(item.updatedAt), {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  {/* Description */}
                  {item.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {item.description}
                    </p>
                  )}

                  {/* Footer: count + download */}
                  <div className="flex items-center justify-between mt-auto pt-2">
                    <p className="text-[11px] text-muted-foreground">
                      {getItemCountLabel(item)}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 h-7 text-xs px-2.5"
                      onClick={() => openDownload(item)}
                      disabled={isDownloading}
                    >
                      {isDownloading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Download className="h-3 w-3" />
                      )}
                      {t("download")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* PDF Locale Picker Dialog */}
      <Dialog
        open={pdfLocaleDialog.open}
        onOpenChange={(open) => {
          if (!open) setPdfLocaleDialog({ open: false });
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("pdfLocaleTitle")}</DialogTitle>
            <DialogDescription>{t("pdfLocaleDescription")}</DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-2">
            <Button className="flex-1 gap-2" variant="outline"
              onClick={() => {
                const item = pdfLocaleDialog.item;
                setPdfLocaleDialog({ open: false });
                if (item) handleDownload(item, "DE");
              }}
            >
              {"🇩🇪 Deutschland (ß)"}
            </Button>
            <Button className="flex-1 gap-2" variant="outline"
              onClick={() => {
                const item = pdfLocaleDialog.item;
                setPdfLocaleDialog({ open: false });
                if (item) handleDownload(item, "CH");
              }}
            >
              {"🇨🇭 Schweiz (ss)"}
            </Button>
            <Button className="flex-1 gap-2" variant="outline"
              onClick={() => {
                const item = pdfLocaleDialog.item;
                setPdfLocaleDialog({ open: false });
                if (item) handleDownload(item, "NEUTRAL");
              }}
            >
              {"🌐 Neutral"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
