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
  TableProperties,
  Clock,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { authFetch } from "@/lib/auth-fetch";

interface GrammarTableItem {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  blocks: {
    tableType?: string;
    input?: unknown;
    tableData?: unknown;
  };
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
}

export function GrammarTableDashboard() {
  const t = useTranslations("grammarTableDashboard");
  const tc = useTranslations("common");
  const format = useFormatter();
  const router = useRouter();
  const [tables, setTables] = useState<GrammarTableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<GrammarTableItem[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  const fetchTables = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/worksheets?type=grammar-table");
      const data = await res.json();
      setTables(data);
    } catch (err) {
      console.error("Failed to fetch grammar tables:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

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
          `/api/worksheets?type=grammar-table&search=${encodeURIComponent(search.trim())}`
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

  const deleteTable = async (id: string) => {
    if (!confirm(t("deleteConfirm"))) return;
    try {
      await authFetch(`/api/worksheets/${id}`, { method: "DELETE" });
      if (searchResults) {
        setSearchResults(searchResults.filter((t) => t.id !== id));
      }
      fetchTables();
    } catch (err) {
      console.error("Failed to delete grammar table:", err);
    }
  };

  const displayTables = searchResults !== null ? searchResults : tables;
  const isSearching = searchResults !== null;

  const getTableTypeLabel = (tableType?: string) => {
    switch (tableType) {
      case "adjective-declination":
        return t("adjektivdeklination");
      default:
        return t("grammarTable");
    }
  };

  return (
    <div className="px-6 py-10 overflow-y-auto flex-1">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground mt-1">{t("subtitle")}</p>
        </div>
        <Link href="/editor/grammar-tables">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            {t("newTable")}
          </Button>
        </Link>
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
            : t("searchResults", { count: displayTables.length, query: search })}
        </p>
      )}

      {loading && !isSearching ? (
        <div className="text-center py-12 text-muted-foreground">
          {tc("loading")}
        </div>
      ) : displayTables.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <TableProperties className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">
              {isSearching ? t("noTables") : t("noTablesYet")}
            </h3>
            <p className="text-sm text-muted-foreground/70 mt-1 mb-4">
              {isSearching ? t("tryDifferentSearch") : t("createFirstTable")}
            </p>
            {!isSearching && (
              <Link href="/editor/grammar-tables">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("createTable")}
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {displayTables.map((table) => (
            <div key={table.id} className="group relative">
              <Link href={`/editor/grammar-tables/${table.id}`}>
                <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer h-full">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base line-clamp-1 pr-8">
                        {table.title}
                      </CardTitle>
                      {table.published && (
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
                      {format.dateTime(new Date(table.updatedAt), {
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
                      {getTableTypeLabel(table.blocks?.tableType)}
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
                      onClick={() => router.push(`/editor/grammar-tables/${table.id}`)}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-2" />
                      {tc("edit")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => deleteTable(table.id)}
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
    </div>
  );
}
