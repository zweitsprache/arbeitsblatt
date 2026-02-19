"use client";

import { useTranslations, useFormatter } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Layers,
  Clock,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  X,
  TableProperties,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { GenerateFromGrammarTableModal } from "@/components/flashcard-editor/generate-from-grammar-table-modal";

interface FlashcardSetItem {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  blocks: unknown[]; // flashcard items stored in blocks JSON
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
}

export function FlashcardDashboard() {
  const t = useTranslations("flashcardDashboard");
  const tc = useTranslations("common");
  const format = useFormatter();
  const router = useRouter();
  const [flashcardSets, setFlashcardSets] = useState<FlashcardSetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<FlashcardSetItem[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [generateModalOpen, setGenerateModalOpen] = useState(false);

  const fetchFlashcards = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/worksheets?type=flashcards");
      const data = await res.json();
      setFlashcardSets(data);
    } catch (err) {
      console.error("Failed to fetch flashcards:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlashcards();
  }, [fetchFlashcards]);

  // Search with debounce
  useEffect(() => {
    if (!search.trim()) {
      setSearchResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await authFetch(
          `/api/worksheets?type=flashcards&search=${encodeURIComponent(search.trim())}`
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
  }, [search]);

  const deleteFlashcardSet = async (id: string) => {
    if (!confirm(t("deleteFlashcards"))) return;
    try {
      await authFetch(`/api/worksheets/${id}`, { method: "DELETE" });
      if (searchResults) {
        setSearchResults(searchResults.filter((fs) => fs.id !== id));
      }
      fetchFlashcards();
    } catch (err) {
      console.error("Failed to delete flashcard set:", err);
    }
  };

  const displaySets = searchResults !== null ? searchResults : flashcardSets;
  const isSearching = searchResults !== null;

  return (
    <div className="px-6 py-10 overflow-y-auto flex-1">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground mt-1">{t("subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setGenerateModalOpen(true)}
          >
            <TableProperties className="h-4 w-4" />
            {t("generateFromTable")}
          </Button>
          <Link href="/editor/flashcards">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              {t("newFlashcards")}
            </Button>
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
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

      {isSearching && (
        <p className="text-sm text-muted-foreground mb-4">
          {searchLoading
            ? t("searching")
            : t("searchResults", { count: displaySets.length, query: search })}
        </p>
      )}

      {loading && !isSearching ? (
        <div className="text-center py-12 text-muted-foreground">
          {tc("loading")}
        </div>
      ) : displaySets.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Layers className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">
              {isSearching ? t("noFlashcards") : t("noFlashcardsYet")}
            </h3>
            <p className="text-sm text-muted-foreground/70 mt-1 mb-4">
              {isSearching ? t("tryDifferentSearch") : t("createFirstFlashcards")}
            </p>
            {!isSearching && (
              <Link href="/editor/flashcards">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("createFlashcards")}
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {displaySets.map((fs) => (
            <div key={fs.id} className="group relative">
              <Link href={`/editor/flashcards/${fs.id}`}>
                <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer h-full">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base line-clamp-1 pr-8">
                        {fs.title}
                      </CardTitle>
                      {fs.published && (
                        <Badge
                          variant="secondary"
                          className="text-xs shrink-0 ml-2"
                        >
                          {tc("published")}
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="flex items-center gap-1 text-xs">
                      <Clock className="h-3 w-3" />
                      {format.dateTime(new Date(fs.updatedAt), {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">
                      {Array.isArray(fs.blocks)
                        ? t("cardCount", { count: fs.blocks.length })
                        : tc("empty")}
                    </p>
                  </CardContent>
                </Card>
              </Link>
              {/* Actions */}
              <div className="absolute top-3 right-3 z-10">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => router.push(`/editor/flashcards/${fs.id}`)}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-2" />
                      {tc("edit")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => deleteFlashcardSet(fs.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-2" />
                      {tc("delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      <GenerateFromGrammarTableModal
        open={generateModalOpen}
        onOpenChange={setGenerateModalOpen}
      />
    </div>
  );
}
