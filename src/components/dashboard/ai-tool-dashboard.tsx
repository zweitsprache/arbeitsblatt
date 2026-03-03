"use client";

import { useTranslations, useFormatter } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Bot,
  Clock,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  Copy,
  Loader2,
  FormInput,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { authFetch } from "@/lib/auth-fetch";

interface AiToolItem {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  fields: unknown[];
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export function AiToolDashboard() {
  const t = useTranslations("aiToolDashboard");
  const tc = useTranslations("common");
  const format = useFormatter();
  const router = useRouter();
  const [tools, setTools] = useState<AiToolItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<AiToolItem[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingTool, setDeletingTool] = useState<AiToolItem | null>(null);

  const loadTools = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/ai-tools");
      if (res.ok) {
        const data = await res.json();
        setTools(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTools();
  }, [loadTools]);

  // Search
  useEffect(() => {
    if (!search.trim()) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await authFetch(`/api/ai-tools?search=${encodeURIComponent(search)}`);
        if (res.ok) {
          setSearchResults(await res.json());
        }
      } catch {
        // ignore
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleCreate = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const res = await authFetch("/api/ai-tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled AI Tool" }),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/ai-tools/${data.id}`);
      } else {
        const text = await res.text();
        console.error("Failed to create AI tool:", res.status, text);
      }
    } catch (error) {
      console.error("Failed to create AI tool:", error);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingTool) return;
    try {
      const res = await authFetch(`/api/ai-tools/${deletingTool.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setTools((prev) => prev.filter((t) => t.id !== deletingTool.id));
      }
    } catch {
      // ignore
    } finally {
      setDeleteDialogOpen(false);
      setDeletingTool(null);
    }
  };

  const handleDuplicate = async (tool: AiToolItem) => {
    try {
      // Fetch full tool data first
      const getRes = await authFetch(`/api/ai-tools/${tool.id}`);
      if (!getRes.ok) return;
      const fullTool = await getRes.json();

      const res = await authFetch("/api/ai-tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${fullTool.title} (copy)`,
          description: fullTool.description,
          fields: fullTool.fields,
          promptTemplate: fullTool.promptTemplate,
          settings: fullTool.settings,
        }),
      });
      if (res.ok) {
        loadTools();
      }
    } catch {
      // ignore
    }
  };

  const displayedTools = searchResults ?? tools;

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t("title")}</h1>
            <p className="text-muted-foreground text-sm mt-1">{t("subtitle")}</p>
          </div>
          <Button onClick={handleCreate} disabled={creating}>
            {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            {t("createTool")}
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Empty state */}
        {!loading && displayedTools.length === 0 && (
          <div className="text-center py-12">
            <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {search ? t("noSearchResults") : t("noTools")}
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              {search ? t("tryDifferentSearch") : t("createFirstTool")}
            </p>
            {!search && (
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                {t("createTool")}
              </Button>
            )}
          </div>
        )}

        {/* Search loading */}
        {searchLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("searching")}
          </div>
        )}

        {/* Tool grid */}
        {!loading && displayedTools.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedTools.map((tool) => (
              <Card key={tool.id} className="group hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <Link href={`/ai-tools/${tool.id}`} className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate hover:text-violet-600 transition-colors">
                        {tool.title}
                      </CardTitle>
                    </Link>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/ai-tools/${tool.id}`)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          {tc("edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(tool)}>
                          <Copy className="h-4 w-4 mr-2" />
                          {tc("duplicate")}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => {
                            setDeletingTool(tool);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {tc("delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  {tool.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {tool.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <FormInput className="h-3.5 w-3.5" />
                      {t("fieldCount", { count: Array.isArray(tool.fields) ? tool.fields.length : 0 })}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {format.relativeTime(new Date(tool.updatedAt))}
                    </div>
                    <Badge variant={tool.published ? "default" : "secondary"} className="ml-auto text-[10px]">
                      {tool.published ? tc("published") : tc("draft")}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteTool")}</DialogTitle>
            <DialogDescription>
              {t("deleteToolConfirm", { title: deletingTool?.title || "" })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              {tc("delete")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
