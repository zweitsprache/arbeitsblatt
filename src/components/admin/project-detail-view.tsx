"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useCallback, useEffect, useState } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Save,
  Search,
  Plus,
  X,
  FileText,
  BookOpen,
  GraduationCap,
  Bot,
  Monitor,
} from "lucide-react";
import type {
  Project,
  Client,
  ProjectContent,
  ContentType,
} from "@/types/project";

const CONTENT_TYPE_ICONS: Record<
  ContentType,
  React.ComponentType<{ className?: string }>
> = {
  WORKSHEET: FileText,
  EBOOK: BookOpen,
  COURSE: GraduationCap,
  AI_TOOL: Bot,
  PRESENTATION: Monitor,
};

const CONTENT_TYPE_LABEL_KEYS: Record<ContentType, string> = {
  WORKSHEET: "typeWorksheet",
  EBOOK: "typeEbook",
  COURSE: "typeCourse",
  AI_TOOL: "typeAiTool",
  PRESENTATION: "typePresentation",
};

interface SearchResult {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  contentType: ContentType;
}

export function ProjectDetailView({ projectId }: { projectId: string }) {
  const t = useTranslations("admin");

  // Project data
  const [project, setProject] = useState<Project | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [contents, setContents] = useState<ProjectContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [clientId, setClientId] = useState("");
  const [domain, setDomain] = useState("");

  // Content search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<string>("ALL");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const fetchProject = useCallback(async () => {
    try {
      const [projRes, clientRes] = await Promise.all([
        authFetch(`/api/admin/projects/${projectId}`),
        authFetch("/api/admin/clients"),
      ]);
      if (projRes.ok) {
        const data: Project & { contents: ProjectContent[] } =
          await projRes.json();
        setProject(data);
        setName(data.name);
        setSlug(data.slug);
        setClientId(data.clientId);
        setDomain(data.domain || "");
        setContents(data.contents || []);
      }
      if (clientRes.ok) {
        setClients(await clientRes.json());
      }
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await authFetch(`/api/admin/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug, clientId, domain: domain || null }),
      });
      if (res.ok) {
        const data = await res.json();
        setProject(data);
      }
    } finally {
      setSaving(false);
    }
  };

  // Content search
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const params = new URLSearchParams({ q: searchQuery });
      if (searchType !== "ALL") params.set("type", searchType);
      const res = await authFetch(
        `/api/admin/content/search?${params.toString()}`
      );
      if (res.ok) {
        setSearchResults(await res.json());
      }
    } finally {
      setSearching(false);
    }
  }, [searchQuery, searchType]);

  useEffect(() => {
    const timer = setTimeout(handleSearch, 300);
    return () => clearTimeout(timer);
  }, [handleSearch]);

  const handleAssign = async (contentType: ContentType, contentId: string) => {
    const res = await authFetch(
      `/api/admin/projects/${projectId}/content`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType, contentId }),
      }
    );
    if (res.ok) {
      setSearchQuery("");
      setSearchResults([]);
      // Refresh content list
      const contentsRes = await authFetch(
        `/api/admin/projects/${projectId}/content`
      );
      if (contentsRes.ok) setContents(await contentsRes.json());
    }
  };

  const handleUnassign = async (
    contentType: ContentType,
    contentId: string
  ) => {
    const res = await authFetch(
      `/api/admin/projects/${projectId}/content`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType, contentId }),
      }
    );
    if (res.ok) {
      setContents((prev) =>
        prev.filter(
          (c) =>
            !(c.contentType === contentType && c.contentId === contentId)
        )
      );
    }
  };

  const isAssigned = (contentType: ContentType, contentId: string) =>
    contents.some(
      (c) => c.contentType === contentType && c.contentId === contentId
    );

  if (loading) {
    return (
      <div className="px-6 py-10 overflow-y-auto flex-1">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-64 bg-muted rounded mt-6" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="px-6 py-10 overflow-y-auto flex-1">
        <p className="text-muted-foreground">Not found</p>
      </div>
    );
  }

  return (
    <div className="px-6 py-10 overflow-y-auto flex-1 max-w-3xl">
      {/* Back link */}
      <Link
        href="/admin/projects"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("projects")}
      </Link>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t("editProject")}</h1>
        <Button onClick={handleSave} disabled={saving} size="sm">
          <Save className="h-4 w-4 mr-2" />
          {t("save")}
        </Button>
      </div>

      {/* Project settings */}
      <Card className="mb-6">
        <CardContent className="p-5 space-y-4">
          <div>
            <Label>{t("projectName")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>{t("slug")}</Label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {slug || "project"}.domain.com
            </p>
          </div>
          <div>
            <Label>{t("selectClient")}</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder={t("selectClient")} />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t("customDomain")}</Label>
            <Input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="custom.example.com"
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Content assignment */}
      <h2 className="text-lg font-semibold mb-3">{t("contentAssignment")}</h2>

      {/* Search bar */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("searchContent")}
                className="pl-9"
              />
            </div>
            <Select value={searchType} onValueChange={setSearchType}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("allTypes")}</SelectItem>
                <SelectItem value="WORKSHEET">
                  {t("typeWorksheet")}
                </SelectItem>
                <SelectItem value="EBOOK">{t("typeEbook")}</SelectItem>
                <SelectItem value="COURSE">{t("typeCourse")}</SelectItem>
                <SelectItem value="AI_TOOL">{t("typeAiTool")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Search results */}
          {searchQuery.trim() && (
            <div className="mt-3 space-y-1 max-h-64 overflow-y-auto">
              {searching ? (
                <p className="text-sm text-muted-foreground py-2">...</p>
              ) : searchResults.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  {t("noResults")}
                </p>
              ) : (
                searchResults.map((item) => {
                  const Icon = CONTENT_TYPE_ICONS[item.contentType];
                  const assigned = isAssigned(
                    item.contentType,
                    item.id
                  );
                  return (
                    <div
                      key={`${item.contentType}-${item.id}`}
                      className="flex items-center justify-between py-2 px-2 rounded hover:bg-accent/50"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm truncate">
                          {item.title}
                        </span>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {t(CONTENT_TYPE_LABEL_KEYS[item.contentType])}
                        </Badge>
                        {item.published && (
                          <Badge
                            variant="default"
                            className="text-[10px] shrink-0"
                          >
                            Published
                          </Badge>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant={assigned ? "ghost" : "outline"}
                        disabled={assigned}
                        onClick={() =>
                          handleAssign(item.contentType, item.id)
                        }
                        className="shrink-0 ml-2"
                      >
                        {assigned ? (
                          "Assigned"
                        ) : (
                          <>
                            <Plus className="h-3 w-3 mr-1" />
                            {t("addContent")}
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assigned content list */}
      {contents.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            {t("noContent")}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {contents.map((item) => {
            const Icon = CONTENT_TYPE_ICONS[item.contentType];
            return (
              <Card key={item.id}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium truncate">
                      {item.title || item.contentId}
                    </span>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {t(CONTENT_TYPE_LABEL_KEYS[item.contentType])}
                    </Badge>
                    {item.published && (
                      <Badge variant="default" className="text-[10px] shrink-0">
                        Published
                      </Badge>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      handleUnassign(item.contentType, item.contentId)
                    }
                    className="text-destructive hover:text-destructive shrink-0"
                  >
                    <X className="h-3 w-3 mr-1" />
                    {t("removeContent")}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
