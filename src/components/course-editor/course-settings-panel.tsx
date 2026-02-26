"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCourse } from "@/store/course-store";
import { useCallback } from "react";
import { Brand } from "@/types/worksheet";
import { SidebarTheme } from "@/types/course";

interface CourseSettingsPanelProps {
  isFullPanel?: boolean;
}

export function CourseSettingsPanel({ isFullPanel }: CourseSettingsPanelProps) {
  const t = useTranslations("course");
  const tc = useTranslations("common");
  const { state, dispatch } = useCourse();
  const { settings, coverSettings } = state;

  const updateSettings = useCallback(
    (updates: Partial<typeof settings>) => {
      dispatch({ type: "UPDATE_SETTINGS", payload: updates });
    },
    [dispatch]
  );

  const updateCover = useCallback(
    (updates: Partial<typeof coverSettings>) => {
      dispatch({ type: "UPDATE_COVER", payload: updates });
    },
    [dispatch]
  );

  const content = (
    <div className="p-3 space-y-4">
      {/* Course Settings */}
      <div className="space-y-3">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {t("courseInfo")}
        </Label>

        {/* Language Level */}
        <div className="space-y-1.5">
          <Label htmlFor="language-level" className="text-sm">
            {t("languageLevel")}
          </Label>
          <Select
            value={settings.languageLevel || ""}
            onValueChange={(value) =>
              updateSettings({ languageLevel: value })
            }
          >
            <SelectTrigger id="language-level">
              <SelectValue placeholder={t("selectLevel")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="A1">A1</SelectItem>
              <SelectItem value="A2">A2</SelectItem>
              <SelectItem value="B1">B1</SelectItem>
              <SelectItem value="B2">B2</SelectItem>
              <SelectItem value="C1">C1</SelectItem>
              <SelectItem value="C2">C2</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <Label htmlFor="description" className="text-sm">
            {t("descriptionLabel")}
          </Label>
          <Textarea
            id="description"
            value={settings.description || ""}
            onChange={(e) => updateSettings({ description: e.target.value })}
            placeholder={t("descriptionPlaceholder")}
            rows={3}
          />
        </div>

        {/* Brand */}
        <div className="space-y-1.5">
          <Label htmlFor="brand" className="text-sm">
            {t("brand")}
          </Label>
          <Select
            value={settings.brand || "edoomio"}
            onValueChange={(value: Brand) =>
              updateSettings({ brand: value })
            }
          >
            <SelectTrigger id="brand">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="edoomio">Edoomio</SelectItem>
              <SelectItem value="lingostar">LingoStar</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sidebar Theme */}
        <div className="space-y-1.5">
          <Label htmlFor="sidebar-theme" className="text-sm">
            {t("sidebarTheme")}
          </Label>
          <Select
            value={settings.sidebarTheme || "dark"}
            onValueChange={(value: SidebarTheme) =>
              updateSettings({ sidebarTheme: value })
            }
          >
            <SelectTrigger id="sidebar-theme">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dark">{t("sidebarDark")}</SelectItem>
              <SelectItem value="light">{t("sidebarLight")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      {/* Cover Settings */}
      <div className="space-y-3">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {t("coverSettings")}
        </Label>

        {/* Cover Title */}
        <div className="space-y-1.5">
          <Label htmlFor="cover-title" className="text-sm">
            {tc("title")}
          </Label>
          <Input
            id="cover-title"
            value={coverSettings.title}
            onChange={(e) => updateCover({ title: e.target.value })}
            placeholder={t("titlePlaceholder")}
          />
        </div>

        {/* Cover Subtitle */}
        <div className="space-y-1.5">
          <Label htmlFor="cover-subtitle" className="text-sm">
            {t("subtitle")}
          </Label>
          <Input
            id="cover-subtitle"
            value={coverSettings.subtitle}
            onChange={(e) => updateCover({ subtitle: e.target.value })}
            placeholder={t("subtitlePlaceholder")}
          />
        </div>

        {/* Author */}
        <div className="space-y-1.5">
          <Label htmlFor="cover-author" className="text-sm">
            {t("author")}
          </Label>
          <Input
            id="cover-author"
            value={coverSettings.author}
            onChange={(e) => updateCover({ author: e.target.value })}
          />
        </div>

        {/* Background Color */}
        <div className="space-y-1.5">
          <Label htmlFor="bg-color" className="text-sm">
            {t("backgroundColor")}
          </Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              id="bg-color"
              value={coverSettings.backgroundColor}
              onChange={(e) => updateCover({ backgroundColor: e.target.value })}
              className="w-8 h-8 rounded border cursor-pointer"
            />
            <Input
              value={coverSettings.backgroundColor}
              onChange={(e) => updateCover({ backgroundColor: e.target.value })}
              className="flex-1"
            />
          </div>
        </div>

        {/* Text Color */}
        <div className="space-y-1.5">
          <Label htmlFor="text-color" className="text-sm">
            {t("textColor")}
          </Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              id="text-color"
              value={coverSettings.textColor}
              onChange={(e) => updateCover({ textColor: e.target.value })}
              className="w-8 h-8 rounded border cursor-pointer"
            />
            <Input
              value={coverSettings.textColor}
              onChange={(e) => updateCover({ textColor: e.target.value })}
              className="flex-1"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Publish */}
      <div className="space-y-3">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {t("publishing")}
        </Label>
        <div className="flex items-center justify-between">
          <Label htmlFor="published" className="text-sm">
            {tc("published")}
          </Label>
          <Switch
            id="published"
            checked={state.published}
            onCheckedChange={(checked) =>
              dispatch({ type: "SET_PUBLISHED", payload: checked })
            }
          />
        </div>
      </div>
    </div>
  );

  if (isFullPanel) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b bg-background">
          <h2 className="text-lg font-semibold">{t("courseSettings")}</h2>
          <p className="text-sm text-muted-foreground">{t("courseSettingsDescription")}</p>
        </div>
        <ScrollArea className="flex-1">
          <div className="max-w-lg mx-auto py-4">
            {content}
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="w-72 bg-background border-l flex flex-col shrink-0">
      <div className="p-3 border-b">
        <h2 className="font-semibold text-sm">{t("settings")}</h2>
      </div>
      <ScrollArea className="flex-1">{content}</ScrollArea>
    </div>
  );
}
