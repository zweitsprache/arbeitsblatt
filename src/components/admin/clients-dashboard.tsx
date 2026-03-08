"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useCallback, useEffect, useState } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import {
  Building2,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  FolderKanban,
} from "lucide-react";
import type { Client } from "@/types/project";

export function ClientsDashboard() {
  const t = useTranslations("admin");
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchClients = useCallback(async () => {
    try {
      const res = await authFetch("/api/admin/clients");
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      } else {
        console.error("Failed to fetch clients:", res.status, await res.text());
      }
    } catch (err) {
      console.error("fetchClients error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await authFetch("/api/admin/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (res.ok) {
        setNewName("");
        setShowNewDialog(false);
        fetchClients();
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("confirmDeleteClient"))) return;
    await authFetch(`/api/admin/clients/${id}`, { method: "DELETE" });
    fetchClients();
  };

  if (loading) {
    return (
      <div className="px-6 py-10 overflow-y-auto flex-1">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-4 bg-muted rounded w-64" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-10 overflow-y-auto flex-1">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold">{t("clients")}</h1>
        <Button onClick={() => setShowNewDialog(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          {t("createClient")}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        {t("clientsSubtitle")}
      </p>

      {/* Client grid */}
      {clients.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">{t("noClients")}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setShowNewDialog(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t("createClient")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <Card key={client.id} className="group relative">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <Link
                    href={`/admin/clients/${client.id}`}
                    className="flex-1 min-w-0"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold truncate">
                          {client.name}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {client.slug}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3">
                      <span className="flex items-center gap-1">
                        <FolderKanban className="h-3.5 w-3.5" />
                        {t("projectCount", {
                          count: client._count?.projects ?? 0,
                        })}
                      </span>
                    </div>
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/admin/clients/${client.id}`}>
                          <Pencil className="h-4 w-4 mr-2" />
                          {t("editClient")}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(client.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t("deleteClient")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* New client dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("createClient")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium">{t("clientName")}</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t("clientName")}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowNewDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!newName.trim() || creating}
              >
                {t("createClient")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
