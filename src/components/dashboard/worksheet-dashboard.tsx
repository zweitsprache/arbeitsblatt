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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  FileText,
  Clock,
  Folder,
  FolderPlus,
  FolderOpen,
  ChevronRight,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  FolderInput,
  Home,
  X,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { authFetch } from "@/lib/auth-fetch";

interface FolderItem {
  id: string;
  name: string;
  parentId: string | null;
  _count: {
    children: number;
    worksheets: number;
  };
}

interface WorksheetItem {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  blocks: unknown[];
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface BreadcrumbItem {
  id: string | null;
  name: string;
}

export function WorksheetDashboard() {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const format = useFormatter();
  const router = useRouter();
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [worksheets, setWorksheets] = useState<WorksheetItem[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { id: null, name: "__HOME__" },
  ]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<WorksheetItem[] | null>(
    null
  );
  const [searchLoading, setSearchLoading] = useState(false);

  // Dialog states
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renameFolderId, setRenameFolderId] = useState<string | null>(null);
  const [renameFolderName, setRenameFolderName] = useState("");
  const [moveWorksheetId, setMoveWorksheetId] = useState<string | null>(null);
  const [moveTargetFolders, setMoveTargetFolders] = useState<FolderItem[]>([]);

  const fetchContents = useCallback(async (folderId: string | null) => {
    setLoading(true);
    try {
      const folderParam = folderId || "root";
      const [foldersRes, worksheetsRes] = await Promise.all([
        authFetch(`/api/folders?parentId=${folderId || ""}`),
        authFetch(`/api/worksheets?folderId=${folderParam}`),
      ]);
      const foldersData = await foldersRes.json();
      const worksheetsData = await worksheetsRes.json();
      setFolders(foldersData);
      setWorksheets(worksheetsData);
    } catch (err) {
      console.error("Failed to fetch contents:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContents(currentFolderId);
  }, [currentFolderId, fetchContents]);

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
          `/api/worksheets?search=${encodeURIComponent(search.trim())}`
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

  const navigateToFolder = async (folderId: string, folderName: string) => {
    setCurrentFolderId(folderId);
    setBreadcrumbs((prev) => [...prev, { id: folderId, name: folderName }]);
  };

  const navigateToBreadcrumb = (index: number) => {
    const crumb = breadcrumbs[index];
    setCurrentFolderId(crumb.id);
    setBreadcrumbs(breadcrumbs.slice(0, index + 1));
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await authFetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newFolderName.trim(),
          parentId: currentFolderId,
        }),
      });
      setNewFolderName("");
      setNewFolderOpen(false);
      fetchContents(currentFolderId);
    } catch (err) {
      console.error("Failed to create folder:", err);
    }
  };

  const renameFolder = async () => {
    if (!renameFolderId || !renameFolderName.trim()) return;
    try {
      await authFetch(`/api/folders/${renameFolderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: renameFolderName.trim() }),
      });
      setRenameFolderId(null);
      setRenameFolderName("");
      fetchContents(currentFolderId);
    } catch (err) {
      console.error("Failed to rename folder:", err);
    }
  };

  const deleteFolder = async (folderId: string) => {
    if (!confirm(t("deleteFolder"))) return;
    try {
      await authFetch(`/api/folders/${folderId}`, { method: "DELETE" });
      fetchContents(currentFolderId);
    } catch (err) {
      console.error("Failed to delete folder:", err);
    }
  };

  const deleteWorksheet = async (worksheetId: string) => {
    if (!confirm(t("deleteWorksheet"))) return;
    try {
      await authFetch(`/api/worksheets/${worksheetId}`, { method: "DELETE" });
      if (searchResults) {
        setSearchResults(searchResults.filter((ws) => ws.id !== worksheetId));
      }
      fetchContents(currentFolderId);
    } catch (err) {
      console.error("Failed to delete worksheet:", err);
    }
  };

  const moveWorksheetToFolder = async (targetFolderId: string | null) => {
    if (!moveWorksheetId) return;
    try {
      await authFetch(`/api/worksheets/${moveWorksheetId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId: targetFolderId }),
      });
      setMoveWorksheetId(null);
      fetchContents(currentFolderId);
    } catch (err) {
      console.error("Failed to move worksheet:", err);
    }
  };

  const openMoveDialog = async (worksheetId: string) => {
    setMoveWorksheetId(worksheetId);
    try {
      // Fetch all root folders for move target selection
      const res = await authFetch("/api/folders?parentId=");
      const data = await res.json();
      setMoveTargetFolders(data);
    } catch {
      setMoveTargetFolders([]);
    }
  };

  const displayWorksheets = searchResults !== null ? searchResults : worksheets;
  const isSearching = searchResults !== null;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 overflow-y-auto flex-1">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => {
              setNewFolderName("");
              setNewFolderOpen(true);
            }}
          >
            <FolderPlus className="h-4 w-4" />
            {t("newFolder")}
          </Button>
          <Link href="/editor">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              {t("newWorksheet")}
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

      {/* Breadcrumbs */}
      {!isSearching && (
        <nav className="flex items-center gap-1 mb-4 text-sm">
          {breadcrumbs.map((crumb, i) => (
            <React.Fragment key={crumb.id ?? "root"}>
              {i > 0 && (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              )}
              <button
                onClick={() => navigateToBreadcrumb(i)}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-muted transition-colors ${
                  i === breadcrumbs.length - 1
                    ? "font-medium text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {i === 0 ? (
                  <Home className="h-3.5 w-3.5" />
                ) : (
                  <Folder className="h-3.5 w-3.5" />
                )}
                {crumb.name === "__HOME__" ? tc("home") : crumb.name}
              </button>
            </React.Fragment>
          ))}
        </nav>
      )}

      {isSearching && (
        <p className="text-sm text-muted-foreground mb-4">
          {searchLoading
            ? t("searching")
            : t("searchResults", { count: displayWorksheets.length, query: search })}
        </p>
      )}

      {loading && !isSearching ? (
        <div className="text-center py-12 text-muted-foreground">
          {tc("loading")}
        </div>
      ) : (
        <>
          {/* Folders */}
          {!isSearching && folders.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-6">
              {folders.map((folder) => (
                <div
                  key={folder.id}
                  className="group flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer"
                  onClick={() => navigateToFolder(folder.id, folder.name)}
                >
                  <FolderOpen className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {folder.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {folder._count.children > 0 &&
                        t("folderCount", { count: folder._count.children })}
                      {folder._count.children > 0 &&
                        folder._count.worksheets > 0 &&
                        " · "}
                      {folder._count.worksheets > 0 &&
                        t("worksheetCount", { count: folder._count.worksheets })}
                      {folder._count.children === 0 &&
                        folder._count.worksheets === 0 &&
                        tc("empty")}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenameFolderId(folder.id);
                          setRenameFolderName(folder.name);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5 mr-2" />
                        {tc("rename")}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteFolder(folder.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                        {tc("delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}

          {/* Worksheets */}
          {displayWorksheets.length === 0 && folders.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground">
                  {isSearching ? t("noWorksheets") : t("noWorksheetsYet")}
                </h3>
                <p className="text-sm text-muted-foreground/70 mt-1 mb-4">
                  {isSearching
                    ? t("tryDifferentSearch")
                    : t("createFirstWorksheet")}
                </p>
                {!isSearching && (
                  <Link href="/editor">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      {t("createWorksheet")}
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ) : displayWorksheets.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {displayWorksheets.map((ws) => (
                <div key={ws.id} className="group relative">
                  <Link href={`/editor/${ws.id}`}>
                    <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer h-full">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-base line-clamp-1 pr-8">
                            {ws.title}
                          </CardTitle>
                          {ws.published && (
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
                          {format.dateTime(new Date(ws.updatedAt), {
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
                          {Array.isArray(ws.blocks)
                            ? t("blockCount", { count: ws.blocks.length })
                            : tc("empty")}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                  {/* Worksheet actions */}
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
                        <DropdownMenuItem onClick={() => router.push(`/editor/${ws.id}`)}>
                          <Pencil className="h-3.5 w-3.5 mr-2" />
                          {tc("edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => openMoveDialog(ws.id)}
                        >
                          <FolderInput className="h-3.5 w-3.5 mr-2" />
                          {t("moveToFolder")}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => deleteWorksheet(ws.id)}
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
          ) : null}
        </>
      )}

      {/* New Folder Dialog */}
      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("newFolderTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder={t("folderNamePlaceholder")}
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createFolder()}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setNewFolderOpen(false)}
              >
                {tc("cancel")}
              </Button>
              <Button onClick={createFolder} disabled={!newFolderName.trim()}>
                {tc("create")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Folder Dialog */}
      <Dialog
        open={renameFolderId !== null}
        onOpenChange={(open) => {
          if (!open) setRenameFolderId(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("renameFolderTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder={t("folderNamePlaceholder")}
              value={renameFolderName}
              onChange={(e) => setRenameFolderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && renameFolder()}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setRenameFolderId(null)}
              >
                {tc("cancel")}
              </Button>
              <Button
                onClick={renameFolder}
                disabled={!renameFolderName.trim()}
              >
                {tc("rename")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Move Worksheet Dialog */}
      <Dialog
        open={moveWorksheetId !== null}
        onOpenChange={(open) => {
          if (!open) setMoveWorksheetId(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("moveToFolder")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <button
              className="flex items-center gap-2 w-full p-2 rounded hover:bg-muted transition-colors text-sm"
              onClick={() => moveWorksheetToFolder(null)}
            >
              <Home className="h-4 w-4 text-muted-foreground" />
              {t("rootNoFolder")}
            </button>
            {moveTargetFolders.map((folder) => (
              <button
                key={folder.id}
                className="flex items-center gap-2 w-full p-2 rounded hover:bg-muted transition-colors text-sm"
                onClick={() => moveWorksheetToFolder(folder.id)}
              >
                <Folder className="h-4 w-4 text-muted-foreground" />
                {folder.name}
              </button>
            ))}
            {moveTargetFolders.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t("noFoldersAvailable")}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
