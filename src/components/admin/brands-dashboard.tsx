"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useCallback, useEffect, useState } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Palette, Plus, MoreVertical, Pencil, Trash2 } from "lucide-react";
import type { BrandProfile } from "@/types/worksheet";

export function BrandsDashboard() {
  const t = useTranslations("admin");
  const [brands, setBrands] = useState<BrandProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchBrands = useCallback(async () => {
    try {
      const res = await authFetch("/api/brands");
      if (res.ok) {
        setBrands(await res.json());
      }
    } catch (err) {
      console.error("fetchBrands error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  const handleCreate = async () => {
    if (!newName.trim() || !newSlug.trim()) return;
    setCreating(true);
    try {
      const res = await authFetch("/api/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), slug: newSlug.trim() }),
      });
      if (res.ok) {
        setNewName("");
        setNewSlug("");
        setShowNewDialog(false);
        fetchBrands();
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("confirmDeleteBrand"))) return;
    try {
      const res = await authFetch(`/api/brands/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchBrands();
      } else {
        const { error } = await res.json();
        alert(error);
      }
    } catch (err) {
      console.error("delete brand error:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        {t("loading")}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto w-full overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t("brandProfiles")}</h1>
        <Button onClick={() => setShowNewDialog(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          {t("newBrand")}
        </Button>
      </div>

      <div className="grid gap-4">
        {brands.map((brand) => (
          <Card key={brand.id}>
            <CardContent className="flex items-center justify-between py-4">
              <Link
                href={`/admin/brands/${brand.id}`}
                className="flex items-center gap-3 flex-1 min-w-0"
              >
                <div
                  className="w-8 h-8 rounded-full flex-shrink-0"
                  style={{ backgroundColor: brand.primaryColor }}
                />
                <div className="min-w-0">
                  <div className="font-medium truncate">{brand.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {brand.slug} · {brand.bodyFont.split(",")[0]}
                  </div>
                </div>
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/admin/brands/${brand.id}`}>
                      <Pencil className="h-4 w-4 mr-2" />
                      {t("edit")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => handleDelete(brand.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t("delete")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardContent>
          </Card>
        ))}

        {brands.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Palette className="h-12 w-12 mb-4 opacity-30" />
            <p>{t("noBrandsYet")}</p>
          </div>
        )}
      </div>

      {/* New brand dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("newBrand")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("brandName")}</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="My Brand"
              />
            </div>
            <div>
              <Label>{t("brandSlug")}</Label>
              <Input
                value={newSlug}
                onChange={(e) =>
                  setNewSlug(
                    e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9-]/g, "-"),
                  )
                }
                placeholder="my-brand"
              />
            </div>
            <Button
              onClick={handleCreate}
              disabled={creating || !newName.trim() || !newSlug.trim()}
              className="w-full"
            >
              {creating ? t("creating") : t("create")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
