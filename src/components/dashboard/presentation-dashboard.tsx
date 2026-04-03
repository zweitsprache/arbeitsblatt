"use client";

import { useTranslations, useFormatter } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
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
  Monitor,
  Clock,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  Play,
  X,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { WorksheetBlock } from "@/types/worksheet";
import { splitBlocksIntoSlides } from "@/types/presentation";

interface PresentationItem {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  blocks: WorksheetBlock[];
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export function PresentationDashboard() {
  const t = useTranslations("presentationDashboard");
  const tc = useTranslations("common");
  const format = useFormatter();
  const router = useRouter();
  const [presentations, setPresentations] = useState<PresentationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<PresentationItem[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  const fetchPresentations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/presentations");
      if (res.ok) {
        setPresentations(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch presentations:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPresentations();
  }, [fetchPresentations]);

  // Search
  useEffect(() => {
    if (!search.trim()) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await authFetch(`/api/presentations?search=${encodeURIComponent(search)}`);
        if (res.ok) setSearchResults(await res.json());
      } catch {
        // ignore
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm(tc("confirmDelete"))) return;
    try {
      await authFetch(`/api/presentations/${id}`, { method: "DELETE" });
      setPresentations((prev) => prev.filter((p) => p.id !== id));
      if (searchResults) {
        setSearchResults((prev) => prev?.filter((p) => p.id !== id) ?? null);
      }
    } catch (err) {
      console.error("Failed to delete presentation:", err);
    }
  }, [tc, searchResults]);

  const displayItems = searchResults ?? presentations;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <Link href="/presentations/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {t("newPresentation")}
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={`${tc("search")}...`}
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

      {/* Grid */}
      {loading ? (
        <div className="text-center text-muted-foreground py-12">{tc("loading")}</div>
      ) : displayItems.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">
          {search ? tc("noResults") : t("empty")}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayItems.map((item) => {
            const slideCount = splitBlocksIntoSlides(item.blocks).length;
            return (
              <Card key={item.id} className="group relative hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  {/* Preview area */}
                  <div
                    className="mb-3 rounded bg-muted/50 flex items-center justify-center cursor-pointer"
                    style={{ aspectRatio: "16 / 9" }}
                    onClick={() => router.push(`/editor/presentation/${item.id}`)}
                  >
                    <Monitor className="h-10 w-10 text-muted-foreground/30" />
                  </div>

                  {/* Info */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3
                        className="font-medium text-sm truncate cursor-pointer hover:text-primary"
                        onClick={() => router.push(`/editor/presentation/${item.id}`)}
                      >
                        {item.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Badge variant="secondary" className="text-[10px]">
                          {slideCount} {slideCount === 1 ? t("slide") : t("slides")}
                        </Badge>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format.relativeTime(new Date(item.updatedAt))}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/editor/presentation/${item.id}`)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          {tc("edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => window.open(`/presentation/${item.slug}`, "_blank")}>
                          <Play className="h-4 w-4 mr-2" />
                          {t("present")}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {tc("delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
