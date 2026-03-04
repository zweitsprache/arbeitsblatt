"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useCallback, useEffect, useState } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, FolderKanban, Save } from "lucide-react";
import type { Client, BrandSettings } from "@/types/project";

export function ClientDetailView({ clientId }: { clientId: string }) {
  const t = useTranslations("admin");
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [brand, setBrand] = useState<BrandSettings>({});

  const fetchClient = useCallback(async () => {
    try {
      const res = await authFetch(`/api/admin/clients/${clientId}`);
      if (res.ok) {
        const data: Client = await res.json();
        setClient(data);
        setName(data.name);
        setSlug(data.slug);
        setBrand(
          (data.brandSettings as BrandSettings) || {}
        );
      }
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchClient();
  }, [fetchClient]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await authFetch(`/api/admin/clients/${clientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug, brandSettings: brand }),
      });
      if (res.ok) {
        const data = await res.json();
        setClient(data);
      }
    } finally {
      setSaving(false);
    }
  };

  const updateBrand = (key: keyof BrandSettings, value: string) => {
    setBrand((prev) => ({ ...prev, [key]: value || undefined }));
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

  if (!client) {
    return (
      <div className="px-6 py-10 overflow-y-auto flex-1">
        <p className="text-muted-foreground">Not found</p>
      </div>
    );
  }

  return (
    <div className="px-6 py-10 overflow-y-auto flex-1 max-w-3xl">
      {/* Back link + header */}
      <Link
        href="/admin/clients"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("clients")}
      </Link>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t("editClient")}</h1>
        <Button onClick={handleSave} disabled={saving} size="sm">
          <Save className="h-4 w-4 mr-2" />
          {t("save")}
        </Button>
      </div>

      {/* Basic info */}
      <Card className="mb-6">
        <CardContent className="p-5 space-y-4">
          <div>
            <Label>{t("clientName")}</Label>
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
          </div>
        </CardContent>
      </Card>

      {/* Brand settings */}
      <h2 className="text-lg font-semibold mb-3">{t("brandSettings")}</h2>
      <Card className="mb-6">
        <CardContent className="p-5 space-y-4">
          <div>
            <Label>{t("logo")}</Label>
            <Input
              value={brand.logo || ""}
              onChange={(e) => updateBrand("logo", e.target.value)}
              placeholder="https://..."
              className="mt-1"
            />
          </div>
          <div>
            <Label>{t("favicon")}</Label>
            <Input
              value={brand.favicon || ""}
              onChange={(e) => updateBrand("favicon", e.target.value)}
              placeholder="https://..."
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t("primaryColor")}</Label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="color"
                  value={brand.primaryColor || "#000000"}
                  onChange={(e) => updateBrand("primaryColor", e.target.value)}
                  className="h-9 w-9 rounded border cursor-pointer"
                />
                <Input
                  value={brand.primaryColor || ""}
                  onChange={(e) => updateBrand("primaryColor", e.target.value)}
                  placeholder="#000000"
                  className="flex-1"
                />
              </div>
            </div>
            <div>
              <Label>{t("accentColor")}</Label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="color"
                  value={brand.accentColor || "#000000"}
                  onChange={(e) => updateBrand("accentColor", e.target.value)}
                  className="h-9 w-9 rounded border cursor-pointer"
                />
                <Input
                  value={brand.accentColor || ""}
                  onChange={(e) => updateBrand("accentColor", e.target.value)}
                  placeholder="#000000"
                  className="flex-1"
                />
              </div>
            </div>
          </div>
          <div>
            <Label>{t("fontFamily")}</Label>
            <Input
              value={brand.fontFamily || ""}
              onChange={(e) => updateBrand("fontFamily", e.target.value)}
              placeholder="Inter, sans-serif"
              className="mt-1"
            />
          </div>
          <div>
            <Label>{t("pageTitle")}</Label>
            <Input
              value={brand.pageTitle || ""}
              onChange={(e) => updateBrand("pageTitle", e.target.value)}
              placeholder="My Learning Platform"
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Projects list */}
      <h2 className="text-lg font-semibold mb-3">{t("projects")}</h2>
      {client.projects && client.projects.length > 0 ? (
        <div className="space-y-2">
          {client.projects.map((project) => (
            <Link
              key={project.id}
              href={`/admin/projects/${project.id}`}
              className="block"
            >
              <Card className="hover:bg-accent/50 transition-colors">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FolderKanban className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{project.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {project.slug}
                        {project._count &&
                          ` · ${t("contentCount", { count: project._count.contents })}`}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            {t("noProjects")}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
