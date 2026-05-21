"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { authFetch } from "@/lib/auth-fetch";
import { BLOCK_LIBRARY } from "@/types/worksheet";
import {
  ALL_BLOCK_TYPES,
  APP_ROLES,
  AppRole,
  AppUserRecord,
  DASHBOARD_SECTION_KEYS,
  DashboardSectionKey,
  DEFAULT_EDITOR_FEATURES,
  EDITOR_ROLES,
  RoleAccessRecord,
  RoleAccessSettings,
  WORKSHEET_EDITOR_FEATURE_KEYS,
  WorksheetEditorFeatureKey,
  getDefaultRoleSettings,
  normalizeRoleAccessSettings,
} from "@/types/user-access";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Save, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { isAdmin } from "@/lib/auth/is-admin";

const SIDEBAR_SECTION_LABEL_KEYS: Record<DashboardSectionKey, string> = {
  dashboard: "dashboard",
  library: "library",
  worksheet: "worksheet",
  flashcards: "flashcards",
  cards: "cards",
  games: "games",
  ebooks: "ebooks",
  courses: "courses",
  grammarTables: "grammarTables",
  presentations: "presentations",
  covers: "covers",
  aiTools: "aiTools",
  account: "account",
  admin: "admin",
};

const FEATURE_LABEL_KEYS: Record<WorksheetEditorFeatureKey, string> = {
  addBlocks: "featureAddBlocks",
  deleteBlocks: "featureDeleteBlocks",
  duplicateBlocks: "featureDuplicateBlocks",
  editBlockSettings: "featureEditBlockSettings",
  editTitle: "featureEditTitle",
  editWorksheetSettings: "featureEditWorksheetSettings",
  exportWorksheet: "featureExportWorksheet",
  manageBlockVisibility: "featureManageBlockVisibility",
  previewWorksheet: "featurePreviewWorksheet",
  publishWorksheet: "featurePublishWorksheet",
  reorderBlocks: "featureReorderBlocks",
  saveWorksheet: "featureSaveWorksheet",
};

const ROLE_LABEL_KEYS: Record<AppRole, string> = {
  platinum: "tierPlatinum",
  gold: "tierGold",
  silver: "tierSilver",
  bronze: "tierBronze",
  user: "roleUser",
};

type Tab = "templates" | "users";

export function UserAccessDashboard() {
  const t = useTranslations("admin");
  const ts = useTranslations("sidebar");
  const tb = useTranslations("blocks");

  const [tab, setTab] = useState<Tab>("templates");
  const [templates, setTemplates] = useState<RoleAccessRecord[]>([]);
  const [users, setUsers] = useState<AppUserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRole, setActiveRole] = useState<AppRole>("platinum");
  const [draft, setDraft] = useState<RoleAccessSettings | null>(null);
  const [saving, setSaving] = useState(false);

  const blockGroups = useMemo(
    () =>
      Object.entries(
        BLOCK_LIBRARY.reduce<Record<string, typeof BLOCK_LIBRARY>>((acc, block) => {
          if (!acc[block.category]) acc[block.category] = [];
          acc[block.category].push(block);
          return acc;
        }, {}),
      ).sort(([left], [right]) => left.localeCompare(right)),
    [],
  );

  const fetchAll = useCallback(async () => {
    try {
      const [templateResponse, usersResponse] = await Promise.all([
        authFetch("/api/admin/role-access"),
        authFetch("/api/admin/user-access"),
      ]);

      if (templateResponse.ok) {
        const next = (await templateResponse.json()) as RoleAccessRecord[];
        setTemplates(next);
      }

      if (usersResponse.ok) {
        const next = (await usersResponse.json()) as AppUserRecord[];
        setUsers(next);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    const template = templates.find((entry) => entry.role === activeRole);
    setDraft(
      template ? normalizeRoleAccessSettings(activeRole, template.settings) : getDefaultRoleSettings(activeRole),
    );
  }, [templates, activeRole]);

  const setSidebarSectionEnabled = (section: DashboardSectionKey, enabled: boolean) => {
    setDraft((current) => {
      if (!current) return current;
      const next = enabled
        ? Array.from(new Set([...current.sidebarSections, section]))
        : current.sidebarSections.filter((item) => item !== section);
      return { ...current, sidebarSections: next };
    });
  };

  const setFeatureEnabled = (feature: WorksheetEditorFeatureKey, enabled: boolean) => {
    setDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        worksheetEditor: {
          ...current.worksheetEditor,
          features: { ...current.worksheetEditor.features, [feature]: enabled },
        },
      };
    });
  };

  const setBlockAllowed = (blockType: string, enabled: boolean) => {
    setDraft((current) => {
      if (!current) return current;
      const next = enabled
        ? Array.from(new Set([...current.worksheetEditor.allowedBlockTypes, blockType]))
        : current.worksheetEditor.allowedBlockTypes.filter((item) => item !== blockType);
      return {
        ...current,
        worksheetEditor: {
          ...current.worksheetEditor,
          allowedBlockTypes: next as typeof current.worksheetEditor.allowedBlockTypes,
        },
      };
    });
  };

  const handleSaveTemplate = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const response = await authFetch("/api/admin/role-access", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: activeRole, settings: draft }),
      });
      if (response.ok) {
        await fetchAll();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleResetTemplate = () => {
    setDraft(getDefaultRoleSettings(activeRole));
  };

  const handleUpdateUserRole = async (record: AppUserRecord, role: AppRole) => {
    const response = await authFetch(`/api/admin/user-access/${record.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (response.ok) {
      await fetchAll();
    }
  };

  const handleDeleteUser = async (record: AppUserRecord) => {
    if (!confirm(t("confirmDeleteUserAccess"))) return;
    const response = await authFetch(`/api/admin/user-access/${record.id}`, { method: "DELETE" });
    if (response.ok) {
      await fetchAll();
    }
  };

  if (loading) {
    return (
      <div className="px-6 py-10 overflow-y-auto flex-1">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-56" />
          <div className="h-4 bg-muted rounded w-72" />
          <div className="h-[520px] bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-10 overflow-y-auto flex-1">
      <h1 className="text-2xl font-bold mb-1">{t("accessManagement")}</h1>
      <p className="text-sm text-muted-foreground mb-6">{t("accessManagementSubtitle")}</p>

      <div className="flex gap-2 mb-6 border-b">
        <button
          type="button"
          onClick={() => setTab("templates")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === "templates"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-muted-foreground hover:text-slate-700"
          }`}
        >
          {t("rolePermissions")}
        </button>
        <button
          type="button"
          onClick={() => setTab("users")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === "users"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-muted-foreground hover:text-slate-700"
          }`}
        >
          {t("userAssignments")}
        </button>
      </div>

      {tab === "templates" ? (
        <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <div className="bg-slate-50 rounded-sm overflow-hidden">
            <div className="px-3 pt-3 pb-3 space-y-3">
              <div className="rounded-md border border-dashed bg-white p-3 text-sm">
                <div className="flex items-center gap-2 font-medium">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                  {t("roleAdmin")}
                </div>
                <div className="text-xs text-muted-foreground mt-1">{t("roleAdminHelp")}</div>
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md mb-2">
                  {t("editorTiers")}
                </div>
                <div className="space-y-1.5">
                  {EDITOR_ROLES.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setActiveRole(role)}
                      className={`w-full text-left rounded-md border bg-white px-3 py-2 text-sm transition-colors ${
                        activeRole === role
                          ? "border-slate-900 bg-slate-50"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <p className="text-sm font-medium leading-none">{t(ROLE_LABEL_KEYS[role])}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md mb-2">
                  {t("otherRoles")}
                </div>
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => setActiveRole("user")}
                    className={`w-full text-left rounded-md border bg-white px-3 py-2 text-sm transition-colors ${
                      activeRole === "user"
                        ? "border-slate-900 bg-slate-50"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <p className="text-sm font-medium leading-none">{t("roleUser")}</p>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {!draft ? null : (
            <Card>
              <CardContent className="p-5 space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold">{t(ROLE_LABEL_KEYS[activeRole])}</h2>
                    <p className="text-sm text-muted-foreground">{t("roleTemplateHelp")}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleResetTemplate}>
                      {t("resetToDefaults")}
                    </Button>
                    <Button size="sm" onClick={handleSaveTemplate} disabled={saving}>
                      <Save className="h-4 w-4 mr-2" />
                      {t("save")}
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md mb-2">
                      {t("visibleSidebarSections")}
                    </div>
                    <p className="text-sm text-muted-foreground">{t("visibleSidebarSectionsHelp")}</p>
                  </div>
                  <div className="grid gap-x-6 md:grid-cols-2 xl:grid-cols-3 border-t border-border">
                    {DASHBOARD_SECTION_KEYS.filter((section) => section !== "admin").map((section) => {
                      const enabled = draft.sidebarSections.includes(section);
                      return (
                        <label
                          key={section}
                          className="flex h-8 items-center justify-between gap-3 border-b border-border text-sm"
                        >
                          <span>{ts(SIDEBAR_SECTION_LABEL_KEYS[section])}</span>
                          <Switch
                            checked={enabled}
                            onCheckedChange={(checked) => setSidebarSectionEnabled(section, checked)}
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md mb-2">
                      {t("editorFeatures")}
                    </div>
                    <p className="text-sm text-muted-foreground">{t("editorFeaturesHelp")}</p>
                  </div>
                  <div className="grid gap-x-6 md:grid-cols-2 xl:grid-cols-3 border-t border-border">
                    {WORKSHEET_EDITOR_FEATURE_KEYS.map((feature) => {
                      const enabled = draft.worksheetEditor.features[feature] ?? DEFAULT_EDITOR_FEATURES[feature];
                      return (
                        <label
                          key={feature}
                          className="flex h-8 items-center justify-between gap-3 border-b border-border text-sm"
                        >
                          <span>{t(FEATURE_LABEL_KEYS[feature])}</span>
                          <Switch
                            checked={enabled}
                            onCheckedChange={(checked) => setFeatureEnabled(feature, checked)}
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md mb-2">
                        {t("allowedBlocks")}
                      </div>
                      <p className="text-sm text-muted-foreground">{t("allowedBlocksHelp")}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setDraft((current) =>
                            current
                              ? {
                                  ...current,
                                  worksheetEditor: {
                                    ...current.worksheetEditor,
                                    allowedBlockTypes: [...ALL_BLOCK_TYPES],
                                  },
                                }
                              : current,
                          )
                        }
                      >
                        {t("enableAllBlocks")}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setDraft((current) =>
                            current
                              ? {
                                  ...current,
                                  worksheetEditor: { ...current.worksheetEditor, allowedBlockTypes: [] },
                                }
                              : current,
                          )
                        }
                      >
                        {t("disableAllBlocks")}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {blockGroups.map(([category, blocks]) => (
                      <div key={category}>
                        <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider px-2 py-1.5 bg-slate-100 rounded-md mb-2">
                          {category}
                        </div>
                        <div className="grid gap-x-6 md:grid-cols-2 xl:grid-cols-3 border-t border-border">
                          {blocks.map((block) => {
                            const enabled = draft.worksheetEditor.allowedBlockTypes.includes(block.type);
                            return (
                              <label
                                key={block.type}
                                className="flex h-8 items-center justify-between gap-3 border-b border-border text-sm"
                              >
                                <span>{tb(block.labelKey)}</span>
                                <Switch
                                  checked={enabled}
                                  onCheckedChange={(checked) => setBlockAllowed(block.type, checked)}
                                />
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="p-5">
            {users.length === 0 ? (
              <div className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
                <UserRound className="h-10 w-10 mx-auto mb-3 opacity-50" />
                {t("noUserAccessEntries")}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-3 py-2 font-medium">{t("userName")}</th>
                      <th className="px-3 py-2 font-medium">{t("userEmail")}</th>
                      <th className="px-3 py-2 font-medium">{t("authUserId")}</th>
                      <th className="px-3 py-2 font-medium">{t("role")}</th>
                      <th className="px-3 py-2 font-medium" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2">{user.name || "—"}</td>
                        <td className="px-3 py-2">{user.email || "—"}</td>
                        <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{user.userId}</td>
                        <td className="px-3 py-2">
                          {isAdmin(user.userId) ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-1 text-xs font-medium text-amber-900">
                              <ShieldCheck className="h-3 w-3" />
                              {t("roleAdmin")}
                            </span>
                          ) : (
                            <Select
                              value={user.role}
                              onValueChange={(value) => handleUpdateUserRole(user, value as AppRole)}
                            >
                              <SelectTrigger className="w-[160px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {APP_ROLES.map((role) => (
                                  <SelectItem key={role} value={role}>
                                    {t(ROLE_LABEL_KEYS[role])}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {!isAdmin(user.userId) && (
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(user)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
