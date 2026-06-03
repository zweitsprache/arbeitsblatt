"use client";

import { useTranslations, useFormatter } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  FileText,
  Folder,
  FolderPlus,
  FolderOpen,
  ChevronRight,
  ChevronLeft,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  FolderInput,
  Home,
  X,
  Copy,
  Printer,
  Loader2,
  BookOpen,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { ImportFromCourseDialog } from "./import-from-course-dialog";
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
  type?: string;
  title: string;
  slug: string;
  published: boolean;
  blocks: unknown[];
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
}

export function WorksheetDashboard() {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const format = useFormatter();
  const router = useRouter();
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [worksheets, setWorksheets] = useState<WorksheetItem[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
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
  const [renameWorksheetId, setRenameWorksheetId] = useState<string | null>(null);
  const [renameWorksheetTitle, setRenameWorksheetTitle] = useState("");
  const [moveWorksheetId, setMoveWorksheetId] = useState<string | null>(null);
  const [moveTargetFolders, setMoveTargetFolders] = useState<FolderItem[]>([]);
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);
  const [pdfLocaleDialog, setPdfLocaleDialog] = useState<{
    open: boolean;
    worksheetId?: string;
    worksheetTitle?: string;
  }>({ open: false });
  const [importCourseOpen, setImportCourseOpen] = useState(false);

  const fetchContents = useCallback(async (folderId: string | null) => {
    setLoading(true);
    try {
      const folderParam = folderId || "root";
      const [foldersRes, worksheetsRes] = await Promise.all([
        authFetch(`/api/folders?parentId=${folderId || ""}`),
        authFetch(`/api/worksheets?folderId=${folderParam}`),
      ]);

      if (foldersRes.ok) {
        const nextFolders: FolderItem[] = await foldersRes.json();
        setFolders(nextFolders);
      } else {
        const details = await foldersRes.text().catch(() => "");
        console.warn("Failed to fetch folders:", foldersRes.status, details);
      }

      if (worksheetsRes.ok) {
        const nextWorksheets: WorksheetItem[] = await worksheetsRes.json();
        setWorksheets(nextWorksheets);
      } else {
        const details = await worksheetsRes.text().catch(() => "");
        console.warn("Failed to fetch worksheets:", worksheetsRes.status, details);
      }
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
        if (!res.ok) { setSearchResults([]); return; }
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

  const refreshSearchResults = useCallback(async () => {
    if (!search.trim()) {
      setSearchResults(null);
      return;
    }

    setSearchLoading(true);
    try {
      const res = await authFetch(
        `/api/worksheets?search=${encodeURIComponent(search.trim())}`
      );
      if (!res.ok) {
        setSearchResults([]);
        return;
      }
      const data = await res.json();
      setSearchResults(data);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, [search]);

  const navigateToFolder = async (folderId: string) => {
    setCurrentFolderId(folderId);
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

  const renameWorksheet = async () => {
    const trimmedTitle = renameWorksheetTitle.trim();
    if (!renameWorksheetId || !trimmedTitle) return;

    try {
      await authFetch(`/api/worksheets/${renameWorksheetId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmedTitle }),
      });

      setWorksheets((prev) =>
        prev.map((ws) =>
          ws.id === renameWorksheetId ? { ...ws, title: trimmedTitle } : ws
        )
      );

      if (searchResults !== null) {
        await refreshSearchResults();
      }

      setRenameWorksheetId(null);
      setRenameWorksheetTitle("");
      fetchContents(currentFolderId);
    } catch (err) {
      console.error("Failed to rename worksheet:", err);
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

  const duplicateWorksheet = async (worksheetId: string) => {
    try {
      await authFetch(`/api/worksheets/${worksheetId}/duplicate`, { method: "POST" });
      fetchContents(currentFolderId);
    } catch (err) {
      console.error("Failed to duplicate worksheet:", err);
    }
  };

  const downloadPdf = async (worksheetId: string, worksheetTitle: string, locale: "DE" | "CH" | "NEUTRAL" = "DE") => {
    setGeneratingPdfId(worksheetId);
    try {
      const res = await authFetch(`/api/worksheets/${worksheetId}/pdf-v3?locale=${locale}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preview: false }),
      });
      if (!res.ok) {
        let errorMsg = `HTTP ${res.status}`;
        try {
          const err = await res.json();
          errorMsg = err.error || errorMsg;
        } catch { /* response wasn't JSON */ }
        alert(t("pdfFailed", { error: errorMsg }));
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const shortId = worksheetId.slice(0, 16);
      const fileSuffix = locale === "NEUTRAL" ? "DACH" : locale;
      a.download = `${shortId}_${fileSuffix}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF download error:", err);
    } finally {
      setGeneratingPdfId(null);
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
  const worksheetPageSize = 30;
  const [worksheetPage, setWorksheetPage] = useState(1);
  const totalWorksheetPages = Math.max(
    1,
    Math.ceil(displayWorksheets.length / worksheetPageSize)
  );
  const pagedWorksheets = displayWorksheets.slice(
    (worksheetPage - 1) * worksheetPageSize,
    worksheetPage * worksheetPageSize
  );

  useEffect(() => {
    setWorksheetPage(1);
  }, [currentFolderId, search]);

  useEffect(() => {
    setWorksheetPage((current) => Math.min(current, totalWorksheetPages));
  }, [totalWorksheetPages]);

  return (
    <div className="px-6 py-10 overflow-y-auto scrollbar-hide flex-1">
      {/* Page header */}
      <div className="mb-6">
        <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
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
          <Link href="/editor" className="w-full">
            <Button className="w-full gap-2 bg-[#2b2b43] text-white hover:bg-[#2b2b43]/90 font-extrabold">
              <Plus className="h-4 w-4" />
              {t("newWorksheet")}
            </Button>
          </Link>
          <Button
            variant="outline"
            className="w-full gap-2 !border-sky-700 dark:!border-sky-700 bg-[#ECF3F9] text-slate-900 hover:bg-[#DDEAF6] hover:text-slate-900 hover:!border-sky-700 font-extrabold"
            onClick={() => {
              setNewFolderName("");
              setNewFolderOpen(true);
            }}
          >
            <FolderPlus className="h-4 w-4" />
            {t("newFolder")}
          </Button>
          <Button
            variant="outline"
            className="w-full gap-2 font-extrabold"
            onClick={() => setImportCourseOpen(true)}
          >
            <BookOpen className="h-4 w-4" />
            {t("importFromCourse")}
          </Button>
        </div>
      </div>

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
            <section className="mb-6">
              <h2 className="mb-3 block w-full rounded-[4px] bg-[#ECF3F9] px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-700">
                Ordner
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {folders.map((folder) => (
                  <div
                    key={folder.id}
                    className="group flex items-center gap-3 p-3 rounded-[4px] border !border-sky-700 hover:!border-sky-700 hover:shadow-sm transition-all cursor-pointer"
                    onClick={() => navigateToFolder(folder.id)}
                  >
                    <FolderOpen className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">
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
            </section>
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
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setImportCourseOpen(true)}>
                      <BookOpen className="h-4 w-4 mr-2" />
                      {t("importFromCourse")}
                    </Button>
                    <Link href="/editor">
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        {t("createWorksheet")}
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : displayWorksheets.length > 0 ? (
            <section>
              <h2 className="mb-3 block w-full rounded-[4px] bg-[#2b2b43]/10 px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-700">
                Arbeitsblätter
              </h2>

              {totalWorksheetPages > 1 && (
                <div className="flex items-center justify-between gap-3 mb-3">
                  <p className="text-xs text-muted-foreground">
                    Seite {worksheetPage} von {totalWorksheetPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setWorksheetPage((page) => Math.max(1, page - 1))}
                      disabled={worksheetPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      {tc("previous")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setWorksheetPage((page) => Math.min(totalWorksheetPages, page + 1))
                      }
                      disabled={worksheetPage === totalWorksheetPages}
                    >
                      {tc("next")}
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {pagedWorksheets.map((ws) => (
                  <div
                    key={ws.id}
                    className="group flex items-center gap-3 p-3 rounded-[4px] border !border-[#2b2b43] hover:!border-[#2b2b43] hover:shadow-sm transition-all cursor-pointer"
                    onClick={() => router.push(`/editor/${ws.id}`)}
                  >
                    <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm truncate">{ws.title}</p>
                        {ws.published && (
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {tc("published")}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {format.dateTime(new Date(ws.updatedAt), {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                        {" | "}
                        {Array.isArray(ws.blocks)
                          ? t("blockCount", { count: ws.blocks.length })
                          : tc("empty")}
                      </p>
                    </div>
                    <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
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
                            onClick={() => {
                              setRenameWorksheetId(ws.id);
                              setRenameWorksheetTitle(ws.title);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5 mr-2" />
                            {tc("rename")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => duplicateWorksheet(ws.id)}>
                            <Copy className="h-3.5 w-3.5 mr-2" />
                            {t("duplicateWorksheet")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openMoveDialog(ws.id)}>
                            <FolderInput className="h-3.5 w-3.5 mr-2" />
                            {t("moveToFolder")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              setPdfLocaleDialog({
                                open: true,
                                worksheetId: ws.id,
                                worksheetTitle: ws.title,
                              })
                            }
                            disabled={generatingPdfId === ws.id}
                          >
                            {generatingPdfId === ws.id ? (
                              <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                            ) : (
                              <Printer className="h-3.5 w-3.5 mr-2" />
                            )}
                            {t("downloadPdf")}
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

              {totalWorksheetPages > 1 && (
                <div className="flex items-center justify-between gap-3 mt-3">
                  <p className="text-xs text-muted-foreground">
                    Seite {worksheetPage} von {totalWorksheetPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setWorksheetPage((page) => Math.max(1, page - 1))}
                      disabled={worksheetPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      {tc("previous")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setWorksheetPage((page) => Math.min(totalWorksheetPages, page + 1))
                      }
                      disabled={worksheetPage === totalWorksheetPages}
                    >
                      {tc("next")}
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </section>
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

      <Dialog
        open={renameWorksheetId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRenameWorksheetId(null);
            setRenameWorksheetTitle("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("renameWorksheetTitle")}</DialogTitle>
            <DialogDescription>{t("renameWorksheetDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={renameWorksheetTitle}
              onChange={(e) => setRenameWorksheetTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && renameWorksheet()}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setRenameWorksheetId(null);
                  setRenameWorksheetTitle("");
                }}
              >
                {tc("cancel")}
              </Button>
              <Button
                onClick={renameWorksheet}
                disabled={!renameWorksheetTitle.trim()}
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

      {/* PDF Locale Picker Dialog */}
      <Dialog
        open={pdfLocaleDialog.open}
        onOpenChange={(open) => setPdfLocaleDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("pdfLocaleTitle")}</DialogTitle>
            <DialogDescription>{t("pdfLocaleDescription")}</DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-2">
            <Button className="flex-1 gap-2" variant="outline"
              onClick={() => {
                setPdfLocaleDialog({ open: false });
                if (pdfLocaleDialog.worksheetId) {
                  downloadPdf(pdfLocaleDialog.worksheetId, pdfLocaleDialog.worksheetTitle || "", "DE");
                }
              }}
            >
              {"🇩🇪 Deutschland (ß)"}
            </Button>
            <Button className="flex-1 gap-2" variant="outline"
              onClick={() => {
                setPdfLocaleDialog({ open: false });
                if (pdfLocaleDialog.worksheetId) {
                  downloadPdf(pdfLocaleDialog.worksheetId, pdfLocaleDialog.worksheetTitle || "", "CH");
                }
              }}
            >
              {"🇨🇭 Schweiz (ss)"}
            </Button>
            <Button className="flex-1 gap-2" variant="outline"
              onClick={() => {
                setPdfLocaleDialog({ open: false });
                if (pdfLocaleDialog.worksheetId) {
                  downloadPdf(pdfLocaleDialog.worksheetId, pdfLocaleDialog.worksheetTitle || "", "NEUTRAL");
                }
              }}
            >
              {"🌐 Neutral"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ImportFromCourseDialog
        open={importCourseOpen}
        onOpenChange={setImportCourseOpen}
      />
    </div>
  );
}
