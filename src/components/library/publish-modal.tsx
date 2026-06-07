"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { authFetch } from "@/lib/auth-fetch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface PublishModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worksheetId: string;
  worksheetUpdatedAt: string;
  brandId: string;
  onSuccess: () => void;
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

export function PublishModal({
  open,
  onOpenChange,
  worksheetId,
  worksheetUpdatedAt,
  brandId,
  onSuccess,
}: PublishModalProps) {
  const t = useTranslations("library");
  const tc = useTranslations("common");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const [folders, setFolders] = useState<Folder[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  // Fetch folders, categories, and tags when modal opens
  useEffect(() => {
    if (open && brandId) {
      fetchLibraryData();
    }
  }, [open, brandId]);

  const fetchLibraryData = async () => {
    setFetching(true);
    try {
      const [foldersRes, categoriesRes, tagsRes] = await Promise.all([
        authFetch(`/api/brands/${brandId}/library/folders`),
        authFetch(`/api/brands/${brandId}/library/categories`),
        authFetch(`/api/brands/${brandId}/library/tags`),
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
    } finally {
      setFetching(false);
    }
  };

  const handlePublish = async () => {
    if (!title || !selectedFolderId) {
      alert(t("required_fields"));
      return;
    }

    setLoading(true);
    try {
      // Generate PDF first (this is a simplified version - in production, you'd call the PDF generation endpoint)
      const pdfRes = await authFetch(
        `/api/worksheets/${worksheetId}/pdf-v3?locale=NEUTRAL`,
        { method: "POST" }
      );

      if (!pdfRes.ok) {
        alert(t("pdf_generation_failed"));
        return;
      }

      const pdfBlob = await pdfRes.blob();

      // Create FormData for file upload
      const formData = new FormData();
      formData.append("file", pdfBlob, `${title}.pdf`);
      formData.append("title", title);
      formData.append("description", description);
      formData.append("folderId", selectedFolderId);
      if (selectedCategoryId) {
        formData.append("categoryId", selectedCategoryId);
      }
      if (worksheetId) {
        formData.append("worksheetId", worksheetId);
      }
      if (worksheetUpdatedAt) {
        formData.append("worksheetUpdatedAt", worksheetUpdatedAt);
      }
      formData.append("tagIds", JSON.stringify(selectedTagIds));

      // Publish to library
      const publishRes = await authFetch(
        `/api/brands/${brandId}/library/publish`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!publishRes.ok) {
        const error = await publishRes.json();
        alert(error.error || t("publish_failed"));
        return;
      }

      alert(t("published_success"));
      onOpenChange(false);
      onSuccess();

      // Reset form
      setTitle("");
      setDescription("");
      setSelectedFolderId("");
      setSelectedCategoryId("");
      setSelectedTagIds([]);
    } catch (error) {
      console.error("Publish error:", error);
      alert(t("publish_error"));
    } finally {
      setLoading(false);
    }
  };

  const flattenFolders = (folders: Folder[]): Array<{ id: string; name: string; level: number }> => {
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("publish_title")}</DialogTitle>
          <DialogDescription>{t("publish_description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <Label htmlFor="title">{t("title")}</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("title_placeholder")}
              disabled={loading || fetching}
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">{t("description")}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("description_placeholder")}
              disabled={loading || fetching}
              rows={3}
            />
          </div>

          {/* Folder Selection */}
          <div>
            <Label htmlFor="folder">{t("folder")} *</Label>
            <Select value={selectedFolderId} onValueChange={setSelectedFolderId} disabled={loading || fetching}>
              <SelectTrigger id="folder">
                <SelectValue placeholder={t("select_folder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {flatFolders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      {"─".repeat(folder.level)}{folder.level > 0 ? " " : ""}{folder.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* Category Selection */}
          <div>
            <Label htmlFor="category">{t("category")}</Label>
            <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId} disabled={loading || fetching}>
              <SelectTrigger id="category">
                <SelectValue placeholder={t("select_category")} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* Tag Selection */}
          {tags.length > 0 && (
            <div>
              <Label>{t("tags")}</Label>
              <div className="space-y-2 mt-2 flex flex-wrap gap-2">
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
                    disabled={loading || fetching}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      selectedTagIds.includes(tag.id)
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50"
                    }`}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="flex-1"
            >
              {tc("cancel")}
            </Button>
            <Button
              onClick={handlePublish}
              disabled={loading || fetching || !title || !selectedFolderId}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {t("publishing")}
                </>
              ) : (
                t("publish")
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
