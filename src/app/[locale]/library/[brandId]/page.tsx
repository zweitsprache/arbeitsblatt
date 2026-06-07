"use client";

import React, { useCallback, useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Loader2, Download, Folder } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PDFItem {
  id: string;
  title: string;
  description?: string;
  previewImagePath?: string;
  folder: {
    id: string;
    name: string;
    slug: string;
  };
  category?: {
    id?: string;
    name: string;
  };
  tags: Array<{
    tag: {
      id: string;
      name: string;
    };
  }>;
}

interface Folder {
  id: string;
  name: string;
  slug: string;
  children: Folder[];
}

interface Category {
  id: string;
  name: string;
}

interface Tag {
  id: string;
  name: string;
}

export default function PublicLibraryPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const brandSlug = params.brandId as string;

  const [brandId, setBrandId] = useState<string>("");
  const [pdfs, setPdfs] = useState<PDFItem[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  const [selectedFolderId, setSelectedFolderId] = useState<string>(
    searchParams.get("folderId") || ""
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    searchParams.get("categoryId") || ""
  );
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    searchParams.getAll("tagIds") || []
  );

  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  const fetchLibraryData = useCallback(async () => {
    try {
      const [foldersRes, categoriesRes, tagsRes] = await Promise.all([
        fetch(`/api/brands/${brandId}/library/folders`),
        fetch(`/api/brands/${brandId}/library/categories`),
        fetch(`/api/brands/${brandId}/library/tags`),
      ]);

      if (foldersRes.ok) {
        const data: { folders?: Folder[] } = await foldersRes.json();
        setFolders(data.folders || []);
      }

      if (categoriesRes.ok) {
        const data: { categories?: Category[] } = await categoriesRes.json();
        setCategories(data.categories || []);
      }

      if (tagsRes.ok) {
        const data: { tags?: Tag[] } = await tagsRes.json();
        setTags(data.tags || []);
      }
    } catch (error) {
      console.error("Error fetching library data:", error);
    }
  }, [brandId]);

  const fetchPublishedPdfs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedFolderId) params.append("folderId", selectedFolderId);
      if (selectedCategoryId) params.append("categoryId", selectedCategoryId);
      selectedTagIds.forEach((tagId) => params.append("tagIds", tagId));

      const res = await fetch(
        `/api/brands/${brandId}/library/published?${params.toString()}`
      );

      if (res.ok) {
        const data: { pdfs?: PDFItem[] } = await res.json();
        setPdfs(data.pdfs || []);
      }
    } catch (error) {
      console.error("Error fetching PDFs:", error);
    } finally {
      setLoading(false);
    }
  }, [brandId, selectedCategoryId, selectedFolderId, selectedTagIds]);

  // First, resolve brand slug to ID
  useEffect(() => {
    const resolveBrand = async () => {
      try {
        const res = await fetch(`/api/brands/by-slug/${brandSlug}`);
        if (res.ok) {
          const data = await res.json();
          setBrandId(data.id);
        }
      } catch (error) {
        console.error("Error resolving brand:", error);
      }
    };
    resolveBrand();
  }, [brandSlug]);

  // Then fetch library data when brandId is available
  useEffect(() => {
    if (brandId) {
      void Promise.resolve().then(fetchLibraryData);
    }
  }, [brandId, fetchLibraryData]);

  useEffect(() => {
    if (!brandId) return;
    void Promise.resolve().then(fetchPublishedPdfs);
  }, [brandId, fetchPublishedPdfs]);

  const handleDownload = async (pdf: PDFItem) => {
    setDownloading(pdf.id);
    try {
      const res = await fetch(
        `/api/brands/${brandId}/library/published/${pdf.id}/download`
      );

      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${pdf.title}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Download error:", error);
      alert("Failed to download PDF");
    } finally {
      setDownloading(null);
    }
  };

  const flattenFolders = (folders: Folder[]) => {
    const result: Array<{ id: string; name: string; level: number }> = [];
    const traverse = (folder: Folder, level: number) => {
      result.push({ id: folder.id, name: folder.name, level });
      folder.children?.forEach((child) => traverse(child, level + 1));
    };
    folders.forEach((folder) => traverse(folder, 0));
    return result;
  };

  const flatFolders = flattenFolders(folders);

  return (
    <DashboardLayout>
      <div className="px-6 py-10 overflow-y-auto scrollbar-hide flex-1">
        <div className="mb-6">
          <div className="grid w-full gap-3 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Folder
              </label>
              <Select value={selectedFolderId || "all"} onValueChange={(val) => setSelectedFolderId(val === "all" ? "" : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Folders" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">All Folders</SelectItem>
                    {flatFolders.map((folder) => (
                      <SelectItem key={folder.id} value={folder.id}>
                        {"-".repeat(folder.level)}{folder.level > 0 ? " " : ""}
                        {folder.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Category
              </label>
              <Select value={selectedCategoryId || "all"} onValueChange={(val) => setSelectedCategoryId(val === "all" ? "" : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {tags.length > 0 && (
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Tags
                </label>
                <div className="flex min-h-10 flex-wrap items-center gap-2">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => {
                        if (selectedTagIds.includes(tag.id)) {
                          setSelectedTagIds(selectedTagIds.filter((id) => id !== tag.id));
                        } else {
                          setSelectedTagIds([...selectedTagIds, tag.id]);
                        }
                      }}
                      className={`rounded-[4px] border px-2.5 py-1 text-xs font-semibold transition-colors ${
                        selectedTagIds.includes(tag.id)
                          ? "border-[#c8553d] bg-[#c8553d] text-white"
                          : "border-slate-300 bg-background text-slate-700 hover:border-slate-500"
                      }`}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <section>
          <h2 className="mb-3 block w-full rounded-[4px] bg-sky-100 px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-sky-800">
            PDF Library
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : pdfs.length === 0 ? (
            <div className="text-center py-12">
              <Folder className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No PDFs found</h3>
              <p className="text-gray-500 mt-2">
                Try adjusting your filters or browse other categories
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pdfs.map((pdf) => (
                <div
                  key={pdf.id}
                  className="flex overflow-hidden rounded-[4px] border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                >
                  {pdf.previewImagePath ? (
                    <div className="h-48 w-36 shrink-0 bg-gray-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={pdf.previewImagePath}
                        alt={pdf.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-48 w-36 shrink-0 items-center justify-center bg-gray-100 px-3 text-center text-xs text-gray-500">
                      Preview unavailable
                    </div>
                  )}

                  <div className="flex min-w-0 flex-1 flex-col p-4">
                    <h3 className="mb-2 line-clamp-2 text-sm font-bold text-slate-900">
                      {pdf.title}
                    </h3>

                    {pdf.description && (
                      <p className="mb-3 line-clamp-2 text-xs text-slate-600">
                        {pdf.description}
                      </p>
                    )}

                    <div className="mb-3 flex flex-wrap gap-2">
                      <Badge variant="secondary">{pdf.folder.name}</Badge>
                      {pdf.category && (
                        <Badge variant="outline">{pdf.category.name}</Badge>
                      )}
                      {pdf.tags.map((t) => (
                        <Badge key={t.tag.id} variant="secondary" className="text-xs">
                          {t.tag.name}
                        </Badge>
                      ))}
                    </div>

                    <Button
                      onClick={() => handleDownload(pdf)}
                      disabled={downloading === pdf.id}
                      className="mt-auto w-full gap-2 !bg-[#c8553d] !text-white hover:!bg-[#b54d38]"
                    >
                      {downloading === pdf.id ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Downloading...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4" />
                          Download PDF
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
