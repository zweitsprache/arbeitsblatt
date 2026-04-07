"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Bot,
  Search,
  Loader2,
  Blocks,
  Workflow,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

interface AiToolItem {
  toolKey: string;
  title: string;
  description: string;
  category: string;
  supportsStandalone: boolean;
  supportsWorksheetEmbedding: boolean;
  contextModes: string[];
}

export function AiToolDashboard() {
  const t = useTranslations("aiToolDashboard");
  const [tools, setTools] = useState<AiToolItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadRegistryTools() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/ai-tools/registry", { credentials: "include" });

        if (res.status === 401) {
          throw new Error(t("authRequired"));
        }

        if (res.ok) {
          const data = (await res.json()) as AiToolItem[];
          if (!cancelled) setTools(data);
        } else {
          throw new Error(`HTTP ${res.status}`);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t("loadFailed"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadRegistryTools();

    return () => {
      cancelled = true;
    };
  }, [t]);

  const displayedTools = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return tools;
    return tools.filter((tool) =>
      [tool.title, tool.description, tool.category, tool.toolKey]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [search, tools]);

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t("title")}</h1>
            <p className="text-muted-foreground text-sm mt-1">{t("subtitle")}</p>
          </div>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && !loading && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && displayedTools.length === 0 && (
          <div className="text-center py-12">
            <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {search ? t("noSearchResults") : t("noTools")}
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              {search ? t("tryDifferentSearch") : t("browseAvailableTools")}
            </p>
          </div>
        )}

        {!loading && displayedTools.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedTools.map((tool) => (
              tool.supportsStandalone ? (
                <Link
                  key={tool.toolKey}
                  href={`/ai-tool/${tool.toolKey}`}
                  className="block"
                >
                  <Card className="group h-full cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-base truncate group-hover:text-violet-600 transition-colors">
                            {tool.title}
                          </CardTitle>
                          <p className="mt-1 text-xs font-mono text-muted-foreground">{tool.toolKey}</p>
                        </div>
                        <Badge variant="outline" className="shrink-0 text-[10px] uppercase tracking-wide">
                          {tool.category}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {tool.description && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {tool.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Workflow className="h-3.5 w-3.5" />
                          {t("workflowTool")}
                        </div>

                        {tool.supportsWorksheetEmbedding && (
                          <div className="flex items-center gap-1">
                            <Blocks className="h-3.5 w-3.5" />
                            {t("availableInWorksheets")}
                          </div>
                        )}

                        <Badge variant="secondary" className="text-[10px]">
                          {t("standalone")}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ) : (
                <Card key={tool.toolKey} className="group h-full hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base truncate">{tool.title}</CardTitle>
                        <p className="mt-1 text-xs font-mono text-muted-foreground">{tool.toolKey}</p>
                      </div>
                      <Badge variant="outline" className="shrink-0 text-[10px] uppercase tracking-wide">
                        {tool.category}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {tool.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {tool.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Blocks className="h-3.5 w-3.5" />
                        {t("availableInWorksheets")}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )

            ))}
          </div>
        )}
      </div>
    </div>
  );
}
