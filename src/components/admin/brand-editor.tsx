"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useCallback, useEffect, useState } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react";
import type { BrandProfile, BrandSubProfile } from "@/types/worksheet";
import { Textarea } from "@/components/ui/textarea";

export function BrandEditor({ brandId }: { brandId: string }) {
  const t = useTranslations("admin");
  const [brand, setBrand] = useState<BrandProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Sub-profiles
  const [subProfiles, setSubProfiles] = useState<BrandSubProfile[]>([]);
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [subForm, setSubForm] = useState({
    name: "",
    headerLeftV1: "",
    headerRightV1: "",
    footerLeftV1: "",
    footerRightV1: "",
    headerLeftV2: "",
    headerRightV2: "",
    footerLeftV2: "",
    footerRightV2: "",
  });
  const [savingSub, setSavingSub] = useState(false);

  // Editable fields
  const [form, setForm] = useState({
    name: "",
    slug: "",
    bodyFont: "",
    headlineFont: "",
    headlineWeight: 700,
    subHeadlineFont: "",
    subHeadlineWeight: 700,
    headerFooterFont: "",
    googleFontsUrl: "",
    h1Size: "",
    h1Weight: "" as string | number,
    h2Size: "",
    h2Weight: "" as string | number,
    h3Size: "",
    h3Weight: "" as string | number,
    textBaseSize: "",
    primaryColor: "#1a1a1a",
    accentColor: "",
    logo: "",
    iconLogo: "",
    favicon: "",
    organization: "",
    teacher: "",
    headerRight: "",
    footerLeft: "",
    footerCenter: "",
    footerRight: "",
    pdfFontSize: "" as string | number,
    pdfTranslationScale: "" as string | number,
    pageTitle: "",
  });

  const fetchBrand = useCallback(async () => {
    try {
      const res = await authFetch(`/api/brands/${brandId}`);
      if (res.ok) {
        const data: BrandProfile = await res.json();
        setBrand(data);
        setSubProfiles(data.subProfiles ?? []);
        setForm({
          name: data.name,
          slug: data.slug,
          bodyFont: data.bodyFont,
          headlineFont: data.headlineFont,
          headlineWeight: data.headlineWeight,
          subHeadlineFont: data.subHeadlineFont,
          subHeadlineWeight: data.subHeadlineWeight,
          headerFooterFont: data.headerFooterFont,
          googleFontsUrl: data.googleFontsUrl,
          h1Size: stripPx(data.h1Size),
          h1Weight: data.h1Weight ?? "",
          h2Size: stripPx(data.h2Size),
          h2Weight: data.h2Weight ?? "",
          h3Size: stripPx(data.h3Size),
          h3Weight: data.h3Weight ?? "",
          textBaseSize: stripPx(data.textBaseSize),
          primaryColor: data.primaryColor,
          accentColor: data.accentColor || "",
          logo: data.logo,
          iconLogo: data.iconLogo || "",
          favicon: data.favicon || "",
          organization: data.organization,
          teacher: data.teacher,
          headerRight: data.headerRight,
          footerLeft: data.footerLeft,
          footerCenter: data.footerCenter,
          footerRight: data.footerRight,
          pdfFontSize: data.pdfFontSize ?? "",
          pdfTranslationScale: data.pdfTranslationScale ?? "",
          pageTitle: data.pageTitle || "",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    fetchBrand();
  }, [fetchBrand]);

  const update = (key: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  /** Strip "px" suffix so stored "28px" displays as "28" in number inputs */
  const stripPx = (v: string | null | undefined): string => {
    if (!v) return "";
    return v.replace(/px$/, "");
  };

  /** Append "px" if value is a bare number */
  const ensurePx = (v: string): string | null => {
    if (!v) return null;
    const trimmed = v.trim();
    if (!trimmed) return null;
    // Already has a unit? Keep as-is
    if (/[a-z%]/i.test(trimmed)) return trimmed;
    return `${trimmed}px`;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Auto-fix common URL typos for googleFontsUrl
      let cleanedFontsUrl = form.googleFontsUrl.trim();
      if (cleanedFontsUrl && !cleanedFontsUrl.startsWith("http")) {
        // Fix missing protocol prefix (e.g. "ttps://..." → "https://...")
        const idx = cleanedFontsUrl.indexOf("fonts.googleapis.com");
        if (idx >= 0) {
          cleanedFontsUrl = "https://" + cleanedFontsUrl.substring(idx);
        }
      }

      const payload = {
        ...form,
        googleFontsUrl: cleanedFontsUrl,
        headlineWeight: Number(form.headlineWeight) || 700,
        subHeadlineWeight: Number(form.subHeadlineWeight) || 700,
        pdfFontSize: form.pdfFontSize !== "" ? Number(form.pdfFontSize) : null,
        h1Size: ensurePx(String(form.h1Size)),
        h1Weight: form.h1Weight !== "" ? Number(form.h1Weight) : null,
        h2Size: ensurePx(String(form.h2Size)),
        h2Weight: form.h2Weight !== "" ? Number(form.h2Weight) : null,
        h3Size: ensurePx(String(form.h3Size)),
        h3Weight: form.h3Weight !== "" ? Number(form.h3Weight) : null,
        textBaseSize: ensurePx(String(form.textBaseSize)),
        pdfTranslationScale:
          form.pdfTranslationScale !== ""
            ? Number(form.pdfTranslationScale)
            : null,
        accentColor: form.accentColor || null,
        iconLogo: form.iconLogo || null,
        favicon: form.favicon || null,
        pageTitle: form.pageTitle || null,
      };

      const res = await authFetch(`/api/brands/${brandId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setBrand(await res.json());
      }
    } finally {
      setSaving(false);
    }
  };

  // ─── Sub-profile helpers ────────────────────────────────────

  const resetSubForm = () => {
    setSubForm({
      name: "",
      headerLeftV1: "",
      headerRightV1: "",
      footerLeftV1: "",
      footerRightV1: "",
      headerLeftV2: "",
      headerRightV2: "",
      footerLeftV2: "",
      footerRightV2: "",
    });
    setEditingSubId(null);
  };

  const startEditSub = (sp: BrandSubProfile) => {
    setEditingSubId(sp.id);
    setSubForm({
      name: sp.name,
      headerLeftV1: sp.headerLeftV1,
      headerRightV1: sp.headerRightV1,
      footerLeftV1: sp.footerLeftV1,
      footerRightV1: sp.footerRightV1,
      headerLeftV2: sp.headerLeftV2,
      headerRightV2: sp.headerRightV2,
      footerLeftV2: sp.footerLeftV2,
      footerRightV2: sp.footerRightV2,
    });
  };

  const handleSaveSub = async () => {
    if (!subForm.name.trim()) return;
    setSavingSub(true);
    try {
      if (editingSubId) {
        // Update existing
        const res = await authFetch(
          `/api/brands/${brandId}/sub-profiles/${editingSubId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(subForm),
          },
        );
        if (res.ok) {
          const updated: BrandSubProfile = await res.json();
          setSubProfiles((prev) =>
            prev.map((sp) => (sp.id === updated.id ? updated : sp)),
          );
          resetSubForm();
        }
      } else {
        // Create new
        const res = await authFetch(`/api/brands/${brandId}/sub-profiles`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subForm),
        });
        if (res.ok) {
          const created: BrandSubProfile = await res.json();
          setSubProfiles((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
          resetSubForm();
        }
      }
    } finally {
      setSavingSub(false);
    }
  };

  const handleDeleteSub = async (subId: string) => {
    if (!confirm(t("confirmDeleteSubProfile"))) return;
    try {
      const res = await authFetch(
        `/api/brands/${brandId}/sub-profiles/${subId}`,
        { method: "DELETE" },
      );
      if (res.ok) {
        setSubProfiles((prev) => prev.filter((sp) => sp.id !== subId));
        if (editingSubId === subId) resetSubForm();
      }
    } catch (err) {
      console.error("delete sub-profile error:", err);
    }
  };

  const updateSub = (key: string, value: string) => {
    setSubForm((prev) => ({ ...prev, [key]: value }));
  };

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

  if (!brand) {
    return (
      <div className="px-6 py-10 overflow-y-auto flex-1">
        <p className="text-muted-foreground">Not found</p>
      </div>
    );
  }

  return (
    <div className="px-6 py-10 overflow-y-auto flex-1 max-w-3xl">
      <Link
        href="/admin/brands"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("brandProfiles")}
      </Link>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t("editBrand")}</h1>
        <Button onClick={handleSave} disabled={saving} size="sm">
          <Save className="h-4 w-4 mr-2" />
          {t("save")}
        </Button>
      </div>

      {/* Identity */}
      <h2 className="text-lg font-semibold mb-3">{t("brandIdentity")}</h2>
      <Card className="mb-6">
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t("brandName")}</Label>
              <Input
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>{t("brandSlug")}</Label>
              <Input
                value={form.slug}
                onChange={(e) =>
                  update(
                    "slug",
                    e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                  )
                }
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label>{t("logo")}</Label>
            <Input
              value={form.logo}
              onChange={(e) => update("logo", e.target.value)}
              placeholder="/logo/my-logo.svg"
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t("iconLogo")}</Label>
              <Input
                value={form.iconLogo}
                onChange={(e) => update("iconLogo", e.target.value)}
                placeholder="/logo/my-icon.svg"
                className="mt-1"
              />
            </div>
            <div>
              <Label>{t("favicon")}</Label>
              <Input
                value={form.favicon}
                onChange={(e) => update("favicon", e.target.value)}
                placeholder="/logo/favicon.ico"
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label>{t("pageTitle")}</Label>
            <Input
              value={form.pageTitle}
              onChange={(e) => update("pageTitle", e.target.value)}
              placeholder="My Learning Platform"
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Typography */}
      <h2 className="text-lg font-semibold mb-3">{t("typography")}</h2>
      <Card className="mb-6">
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t("bodyFont")}</Label>
              <Input
                value={form.bodyFont}
                onChange={(e) => update("bodyFont", e.target.value)}
                placeholder="Asap Condensed, sans-serif"
                className="mt-1"
              />
            </div>
            <div>
              <Label>{t("headerFooterFont")}</Label>
              <Input
                value={form.headerFooterFont}
                onChange={(e) => update("headerFooterFont", e.target.value)}
                placeholder="Asap Condensed, sans-serif"
                className="mt-1"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t("headlineFont")}</Label>
              <Input
                value={form.headlineFont}
                onChange={(e) => update("headlineFont", e.target.value)}
                placeholder="Merriweather, serif"
                className="mt-1"
              />
            </div>
            <div>
              <Label>{t("headlineWeight")}</Label>
              <Input
                type="number"
                value={form.headlineWeight}
                onChange={(e) =>
                  update("headlineWeight", Number(e.target.value))
                }
                className="mt-1"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t("subHeadlineFont")}</Label>
              <Input
                value={form.subHeadlineFont}
                onChange={(e) => update("subHeadlineFont", e.target.value)}
                placeholder="Encode Sans, sans-serif"
                className="mt-1"
              />
            </div>
            <div>
              <Label>{t("subHeadlineWeight")}</Label>
              <Input
                type="number"
                value={form.subHeadlineWeight}
                onChange={(e) =>
                  update("subHeadlineWeight", Number(e.target.value))
                }
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label>{t("googleFontsUrl")}</Label>
            <Input
              value={form.googleFontsUrl}
              onChange={(e) => update("googleFontsUrl", e.target.value)}
              placeholder="https://fonts.googleapis.com/css2?family=..."
              className="mt-1"
            />
          </div>

          {/* Heading & text sizes */}
          <div className="pt-2 border-t">
            <p className="text-sm font-medium text-muted-foreground mb-3">{t("fontSizes")}</p>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label>{t("h1Size")} <span className="text-muted-foreground font-normal">px</span></Label>
                <Input
                  type="number"
                  value={form.h1Size}
                  onChange={(e) => update("h1Size", e.target.value)}
                  placeholder="28"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>{t("h1Weight")}</Label>
                <Input
                  type="number"
                  value={form.h1Weight}
                  onChange={(e) => update("h1Weight", e.target.value ? Number(e.target.value) : "")}
                  placeholder="700"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>{t("h2Size")} <span className="text-muted-foreground font-normal">px</span></Label>
                <Input
                  type="number"
                  value={form.h2Size}
                  onChange={(e) => update("h2Size", e.target.value)}
                  placeholder="24"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>{t("h2Weight")}</Label>
                <Input
                  type="number"
                  value={form.h2Weight}
                  onChange={(e) => update("h2Weight", e.target.value ? Number(e.target.value) : "")}
                  placeholder="700"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4 mt-3">
              <div>
                <Label>{t("h3Size")} <span className="text-muted-foreground font-normal">px</span></Label>
                <Input
                  type="number"
                  value={form.h3Size}
                  onChange={(e) => update("h3Size", e.target.value)}
                  placeholder="21"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>{t("h3Weight")}</Label>
                <Input
                  type="number"
                  value={form.h3Weight}
                  onChange={(e) => update("h3Weight", e.target.value ? Number(e.target.value) : "")}
                  placeholder="800"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>{t("textBaseSize")} <span className="text-muted-foreground font-normal">px</span></Label>
                <Input
                  type="number"
                  value={form.textBaseSize}
                  onChange={(e) => update("textBaseSize", e.target.value)}
                  placeholder="21"
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Colors */}
      <h2 className="text-lg font-semibold mb-3">{t("colors")}</h2>
      <Card className="mb-6">
        <CardContent className="p-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t("primaryColor")}</Label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="color"
                  value={form.primaryColor}
                  onChange={(e) => update("primaryColor", e.target.value)}
                  className="h-9 w-9 rounded border cursor-pointer"
                />
                <Input
                  value={form.primaryColor}
                  onChange={(e) => update("primaryColor", e.target.value)}
                  placeholder="#1a1a1a"
                  className="flex-1"
                />
              </div>
            </div>
            <div>
              <Label>{t("accentColor")}</Label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="color"
                  value={form.accentColor || "#000000"}
                  onChange={(e) => update("accentColor", e.target.value)}
                  className="h-9 w-9 rounded border cursor-pointer"
                />
                <Input
                  value={form.accentColor}
                  onChange={(e) => update("accentColor", e.target.value)}
                  placeholder="#000000"
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Layout defaults */}
      <h2 className="text-lg font-semibold mb-3">{t("layoutDefaults")}</h2>
      <Card className="mb-6">
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t("organization")}</Label>
              <Input
                value={form.organization}
                onChange={(e) => update("organization", e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>{t("teacher")}</Label>
              <Input
                value={form.teacher}
                onChange={(e) => update("teacher", e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label>{t("headerRight")}</Label>
            <Input
              value={form.headerRight}
              onChange={(e) => update("headerRight", e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>{t("footerLeft")}</Label>
              <Input
                value={form.footerLeft}
                onChange={(e) => update("footerLeft", e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>{t("footerCenter")}</Label>
              <Input
                value={form.footerCenter}
                onChange={(e) => update("footerCenter", e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>{t("footerRight")}</Label>
              <Input
                value={form.footerRight}
                onChange={(e) => update("footerRight", e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sub-profiles */}
      <h2 className="text-lg font-semibold mb-3">{t("subProfiles")}</h2>
      <Card className="mb-6">
        <CardContent className="p-5 space-y-4">
          {/* Existing sub-profiles list */}
          {subProfiles.length > 0 && (
            <div className="space-y-2">
              {subProfiles.map((sp) => (
                <div
                  key={sp.id}
                  className={`flex items-center justify-between p-3 rounded border cursor-pointer hover:bg-muted/50 ${editingSubId === sp.id ? "border-primary bg-muted/30" : ""}`}
                  onClick={() => startEditSub(sp)}
                >
                  <span className="font-medium">{sp.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSub(sp.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Sub-profile form */}
          <div className="border-t pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                {editingSubId ? t("editSubProfile") : t("newSubProfile")}
              </p>
              {editingSubId && (
                <Button variant="ghost" size="sm" onClick={resetSubForm}>
                  {t("cancel")}
                </Button>
              )}
            </div>
            <div>
              <Label>{t("subProfileName")}</Label>
              <Input
                value={subForm.name}
                onChange={(e) => updateSub("name", e.target.value)}
                placeholder={t("subProfileNamePlaceholder")}
                className="mt-1"
              />
            </div>

            {/* Variant 1 — multiline */}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                {t("variant1Multiline")}
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t("headerLeft")}</Label>
                  <Textarea
                    value={subForm.headerLeftV1}
                    onChange={(e) => updateSub("headerLeftV1", e.target.value)}
                    rows={3}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>{t("headerRight")}</Label>
                  <Textarea
                    value={subForm.headerRightV1}
                    onChange={(e) => updateSub("headerRightV1", e.target.value)}
                    rows={3}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <Label>{t("footerLeft")}</Label>
                  <Textarea
                    value={subForm.footerLeftV1}
                    onChange={(e) => updateSub("footerLeftV1", e.target.value)}
                    rows={3}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>{t("footerRight")}</Label>
                  <Textarea
                    value={subForm.footerRightV1}
                    onChange={(e) => updateSub("footerRightV1", e.target.value)}
                    rows={3}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Variant 2 — single line */}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                {t("variant2SingleLine")}
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t("headerLeft")}</Label>
                  <Input
                    value={subForm.headerLeftV2}
                    onChange={(e) => updateSub("headerLeftV2", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>{t("headerRight")}</Label>
                  <Input
                    value={subForm.headerRightV2}
                    onChange={(e) => updateSub("headerRightV2", e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <Label>{t("footerLeft")}</Label>
                  <Input
                    value={subForm.footerLeftV2}
                    onChange={(e) => updateSub("footerLeftV2", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>{t("footerRight")}</Label>
                  <Input
                    value={subForm.footerRightV2}
                    onChange={(e) => updateSub("footerRightV2", e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            <Button
              onClick={handleSaveSub}
              disabled={savingSub || !subForm.name.trim()}
              size="sm"
            >
              <Save className="h-4 w-4 mr-2" />
              {editingSubId ? t("save") : t("create")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* PDF settings */}
      <h2 className="text-lg font-semibold mb-3">{t("pdfSettings")}</h2>
      <Card className="mb-6">
        <CardContent className="p-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t("pdfTranslationScale")}</Label>
              <Input
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={form.pdfTranslationScale}
                onChange={(e) =>
                  update(
                    "pdfTranslationScale",
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
                placeholder="0.9"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t("pdfTranslationScaleHelp")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
