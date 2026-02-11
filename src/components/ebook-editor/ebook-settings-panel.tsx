"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEBook } from "@/store/ebook-store";
import { useCallback } from "react";
import { Brand, DEFAULT_BRAND_SETTINGS } from "@/types/worksheet";

export function EBookSettingsPanel() {
  const t = useTranslations("ebook");
  const { state, dispatch } = useEBook();
  const { settings } = state;

  const updateSettings = useCallback(
    (updates: Partial<typeof settings>) => {
      dispatch({ type: "UPDATE_SETTINGS", payload: updates });
    },
    [dispatch]
  );

  const handleBrandChange = (brand: Brand) => {
    updateSettings({
      brand,
      brandSettings: DEFAULT_BRAND_SETTINGS[brand],
    });
  };

  return (
    <div className="w-72 bg-background border-l flex flex-col shrink-0">
      {/* Header */}
      <div className="p-3 border-b">
        <h2 className="font-semibold text-sm">{t("settings")}</h2>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* Page Settings */}
          <div className="space-y-3">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Page
            </Label>

            {/* Page Size */}
            <div className="space-y-1.5">
              <Label htmlFor="page-size" className="text-sm">
                Page Size
              </Label>
              <Select
                value={settings.pageSize}
                onValueChange={(value) =>
                  updateSettings({ pageSize: value as "a4" | "letter" })
                }
              >
                <SelectTrigger id="page-size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="a4">A4</SelectItem>
                  <SelectItem value="letter">Letter</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Orientation */}
            <div className="space-y-1.5">
              <Label htmlFor="orientation" className="text-sm">
                Orientation
              </Label>
              <Select
                value={settings.orientation}
                onValueChange={(value) =>
                  updateSettings({
                    orientation: value as "portrait" | "landscape",
                  })
                }
              >
                <SelectTrigger id="orientation">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="portrait">Portrait</SelectItem>
                  <SelectItem value="landscape">Landscape</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* TOC Settings */}
          <div className="space-y-3">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t("tableOfContents")}
            </Label>

            <div className="flex items-center justify-between">
              <Label htmlFor="show-toc" className="text-sm">
                {t("showToc")}
              </Label>
              <Switch
                id="show-toc"
                checked={settings.showToc}
                onCheckedChange={(checked) => updateSettings({ showToc: checked })}
              />
            </div>

            {settings.showToc && (
              <div className="space-y-1.5">
                <Label htmlFor="toc-title" className="text-sm">
                  {t("tocTitle")}
                </Label>
                <Input
                  id="toc-title"
                  value={settings.tocTitle}
                  onChange={(e) => updateSettings({ tocTitle: e.target.value })}
                  placeholder={t("tableOfContents")}
                />
              </div>
            )}
          </div>

          <Separator />

          {/* Page Numbers */}
          <div className="space-y-3">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Page Numbers
            </Label>

            <div className="flex items-center justify-between">
              <Label htmlFor="show-page-numbers" className="text-sm">
                {t("showPageNumbers")}
              </Label>
              <Switch
                id="show-page-numbers"
                checked={settings.showPageNumbers}
                onCheckedChange={(checked) =>
                  updateSettings({ showPageNumbers: checked })
                }
              />
            </div>

            {settings.showPageNumbers && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="page-number-position" className="text-sm">
                    {t("pageNumberPosition")}
                  </Label>
                  <Select
                    value={settings.pageNumberPosition}
                    onValueChange={(value) =>
                      updateSettings({
                        pageNumberPosition: value as
                          | "footer-center"
                          | "footer-right"
                          | "footer-left",
                      })
                    }
                  >
                    <SelectTrigger id="page-number-position">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="footer-left">Footer Left</SelectItem>
                      <SelectItem value="footer-center">Footer Center</SelectItem>
                      <SelectItem value="footer-right">Footer Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="page-number-format" className="text-sm">
                    {t("pageNumberFormat")}
                  </Label>
                  <Select
                    value={settings.pageNumberFormat}
                    onValueChange={(value) =>
                      updateSettings({
                        pageNumberFormat: value as "numeric" | "roman" | "dash",
                      })
                    }
                  >
                    <SelectTrigger id="page-number-format">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="numeric">1, 2, 3...</SelectItem>
                      <SelectItem value="roman">I, II, III...</SelectItem>
                      <SelectItem value="dash">- 1 -, - 2 -...</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="start-page-number" className="text-sm">
                    Start from page
                  </Label>
                  <Input
                    id="start-page-number"
                    type="number"
                    min={1}
                    value={settings.startPageNumber}
                    onChange={(e) =>
                      updateSettings({
                        startPageNumber: parseInt(e.target.value) || 1,
                      })
                    }
                  />
                </div>
              </>
            )}
          </div>

          <Separator />

          {/* Header/Footer */}
          <div className="space-y-3">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t("footerSettings")}
            </Label>

            <div className="flex items-center justify-between">
              <Label htmlFor="show-header" className="text-sm">
                Show Header
              </Label>
              <Switch
                id="show-header"
                checked={settings.showHeader}
                onCheckedChange={(checked) =>
                  updateSettings({ showHeader: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="show-footer" className="text-sm">
                Show Footer
              </Label>
              <Switch
                id="show-footer"
                checked={settings.showFooter}
                onCheckedChange={(checked) =>
                  updateSettings({ showFooter: checked })
                }
              />
            </div>

            {settings.showFooter && (
              <div className="space-y-1.5">
                <Label htmlFor="footer-text" className="text-sm">
                  Footer Text
                </Label>
                <Input
                  id="footer-text"
                  value={settings.footerText}
                  onChange={(e) =>
                    updateSettings({ footerText: e.target.value })
                  }
                  placeholder="Footer text..."
                />
              </div>
            )}
          </div>

          <Separator />

          {/* Brand */}
          <div className="space-y-3">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Brand
            </Label>

            <div className="space-y-1.5">
              <Label htmlFor="brand" className="text-sm">
                Brand Preset
              </Label>
              <Select
                value={settings.brand}
                onValueChange={(value) => handleBrandChange(value as Brand)}
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
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
