"use client";

import React, { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Loader2, Download, Folder } from "lucide-react";
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

export default function PublicLibraryPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const brandSlug = params.brandId as string;

  const [brandId, setBrandId] = useState<string>("");
  const [pdfs, setPdfs] = useState<PDFItem[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);

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
      fetchLibraryData();
    }
  }, [brandId]);

  useEffect(() => {
    fetchPublishedPdfs();
  }, [brandId, selectedFolderId, selectedCategoryId, selectedTagIds]);

  const fetchLibraryData = async () => {
    try {
      const [foldersRes, categoriesRes, tagsRes] = await Promise.all([
        fetch(`/api/brands/${brandId}/library/folders`),
        fetch(`/api/brands/${brandId}/library/categories`),
        fetch(`/api/brands/${brandId}/library/tags`),
      ]);

      if (foldersRes.ok) {
        const data = await foldersRes.json();
        setFolders(data.folders || []);
      }

      if (categoriesRes.ok) {
        const data = await categoriesRes.json();
        setCategories(data.categories || []);
      }

      if (tagsRes.ok) {
        const data = await tagsRes.json();
        setTags(data.tags || []);
      }
    } catch (error) {
      console.error("Error fetching library data:", error);
    }
  };

  const fetchPublishedPdfs = async () => {
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
        const data = await res.json();
        setPdfs(data.pdfs || []);
      }
    } catch (error) {
      console.error("Error fetching PDFs:", error);
    } finally {
      setLoading(false);
    }
  };

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-gray-900">PDF Library</h1>
          <p className="mt-2 text-lg text-gray-600">
            Browse and download worksheets and materials
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Folder Filter */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
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
                      {"─".repeat(folder.level)}{folder.level > 0 ? " " : ""}
                      {folder.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
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

          {/* Tag Filter */}
          {tags.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Tags
              </label>
              <div className="flex flex-wrap gap-2">
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
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      selectedTagIds.includes(tag.id)
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
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

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pdfs.map((pdf) => (
              <div
                key={pdf.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden flex flex-col"
              >
                {/* Preview Image */}
                {pdf.previewImagePath ? (
                  <div className="relative w-full h-48 bg-gray-100">
                    <img
                      src={pdf.previewImagePath}
                      alt={pdf.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-48 w-full items-center justify-center bg-gray-100 px-4 text-center text-sm text-gray-500">
                    Preview unavailable
                  </div>
                )}

                <div className="p-6 flex flex-col flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                    {pdf.title}
                  </h3>

                  {pdf.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {pdf.description}
                    </p>
                  )}

                  {/* Folder */}
                  <div className="mb-3">
                    <Badge variant="secondary">{pdf.folder.name}</Badge>
                  </div>

                  {/* Category */}
                  {pdf.category && (
                    <div className="mb-3">
                      <Badge variant="outline">{pdf.category.name}</Badge>
                    </div>
                  )}

                  {/* Tags */}
                  {pdf.tags.length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-2">
                      {pdf.tags.map((t) => (
                        <Badge key={t.tag.id} variant="secondary" className="text-xs">
                          {t.tag.name}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Download Button */}
                  <Button
                    onClick={() => handleDownload(pdf)}
                    disabled={downloading === pdf.id}
                    className="w-full gap-2 mt-auto"
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
      </div>
    </div>
  );
}
