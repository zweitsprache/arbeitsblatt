"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Upload, X } from "lucide-react";
import { useEBook } from "@/store/ebook-store";
import { useUpload } from "@/lib/use-upload";
import { useCallback } from "react";

export function CoverSettingsPanel() {
  const t = useTranslations("ebook");
  const { state, dispatch } = useEBook();
  const { upload, isUploading } = useUpload();
  const { coverSettings } = state;

  const updateCover = useCallback(
    (updates: Partial<typeof coverSettings>) => {
      dispatch({ type: "UPDATE_COVER", payload: updates });
    },
    [dispatch]
  );

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await upload(file);
      if (result?.url) {
        updateCover({ coverImage: result.url });
      }
    } catch (err) {
      console.error("Failed to upload cover image:", err);
    }
  };

  const handleRemoveImage = () => {
    updateCover({ coverImage: null });
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b bg-background">
        <h2 className="text-lg font-semibold">{t("coverSettings")}</h2>
        <p className="text-sm text-muted-foreground">
          Customize the cover page of your e-book
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Cover Image */}
          <div className="space-y-3">
            <Label>{t("cover")}</Label>
            {coverSettings.coverImage ? (
              <div className="relative group">
                <img
                  src={coverSettings.coverImage}
                  alt="Cover"
                  className="w-full aspect-[3/4] object-cover rounded-lg border"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={handleRemoveImage}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full aspect-[3/4] border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">
                  {isUploading ? "Uploading..." : "Click to upload cover image"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={isUploading}
                />
              </label>
            )}
          </div>

          <Separator />

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="cover-title">{t("titlePlaceholder")}</Label>
            <Input
              id="cover-title"
              value={coverSettings.title}
              onChange={(e) => updateCover({ title: e.target.value })}
              placeholder={t("titlePlaceholder")}
            />
          </div>

          {/* Subtitle */}
          <div className="space-y-2">
            <Label htmlFor="cover-subtitle">{t("subtitlePlaceholder")}</Label>
            <Input
              id="cover-subtitle"
              value={coverSettings.subtitle}
              onChange={(e) => updateCover({ subtitle: e.target.value })}
              placeholder={t("subtitlePlaceholder")}
            />
          </div>

          {/* Author */}
          <div className="space-y-2">
            <Label htmlFor="cover-author">{t("author")}</Label>
            <Input
              id="cover-author"
              value={coverSettings.author}
              onChange={(e) => updateCover({ author: e.target.value })}
              placeholder={t("author")}
            />
          </div>

          <Separator />

          {/* Show Logo */}
          <div className="flex items-center justify-between">
            <Label htmlFor="show-logo">{t("showLogo")}</Label>
            <Switch
              id="show-logo"
              checked={coverSettings.showLogo}
              onCheckedChange={(checked) => updateCover({ showLogo: checked })}
            />
          </div>

          {/* Background Color */}
          <div className="space-y-2">
            <Label htmlFor="bg-color">{t("backgroundColor")}</Label>
            <div className="flex gap-2">
              <Input
                id="bg-color"
                type="color"
                value={coverSettings.backgroundColor}
                onChange={(e) =>
                  updateCover({ backgroundColor: e.target.value })
                }
                className="w-12 h-10 p-1 cursor-pointer"
              />
              <Input
                value={coverSettings.backgroundColor}
                onChange={(e) =>
                  updateCover({ backgroundColor: e.target.value })
                }
                className="flex-1"
              />
            </div>
          </div>

          {/* Text Color */}
          <div className="space-y-2">
            <Label htmlFor="text-color">{t("textColor")}</Label>
            <div className="flex gap-2">
              <Input
                id="text-color"
                type="color"
                value={coverSettings.textColor}
                onChange={(e) => updateCover({ textColor: e.target.value })}
                className="w-12 h-10 p-1 cursor-pointer"
              />
              <Input
                value={coverSettings.textColor}
                onChange={(e) => updateCover({ textColor: e.target.value })}
                className="flex-1"
              />
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
