import { BLOCK_LIBRARY, BlockType } from "@/types/worksheet";

export const DASHBOARD_SECTION_KEYS = [
  "dashboard",
  "library",
  "worksheet",
  "flashcards",
  "cards",
  "games",
  "ebooks",
  "courses",
  "grammarTables",
  "presentations",
  "covers",
  "aiTools",
  "account",
  "admin",
] as const;

export type DashboardSectionKey = (typeof DASHBOARD_SECTION_KEYS)[number];

export const WORKSHEET_EDITOR_FEATURE_KEYS = [
  "addBlocks",
  "deleteBlocks",
  "duplicateBlocks",
  "editBlockSettings",
  "editTitle",
  "editWorksheetSettings",
  "exportWorksheet",
  "manageBlockVisibility",
  "previewWorksheet",
  "publishWorksheet",
  "reorderBlocks",
  "saveWorksheet",
] as const;

export type WorksheetEditorFeatureKey = (typeof WORKSHEET_EDITOR_FEATURE_KEYS)[number];

/** Stored roles. `admin` is implicit (env-based) and never persisted. */
export const APP_ROLES = ["platinum", "gold", "silver", "bronze", "user"] as const;
export type AppRole = (typeof APP_ROLES)[number];

export const EDITOR_ROLES: AppRole[] = ["platinum", "gold", "silver", "bronze"];
export const DEFAULT_NEW_USER_ROLE: AppRole = "bronze";

export interface RoleAccessSettings {
  sidebarSections: DashboardSectionKey[];
  worksheetEditor: {
    allowedBlockTypes: BlockType[];
    features: Record<WorksheetEditorFeatureKey, boolean>;
  };
}

export interface RoleAccessRecord {
  role: AppRole;
  settings: RoleAccessSettings;
  updatedAt: string;
}

/** Per-user record. Stores only the role assignment — no per-user permissions. */
export interface AppUserRecord {
  id: string;
  userId: string;
  email: string | null;
  name: string | null;
  role: AppRole;
  createdAt: string;
  updatedAt: string;
}

export interface EffectiveWorksheetEditorAccess {
  allowedBlockTypes: BlockType[];
  features: Record<WorksheetEditorFeatureKey, boolean>;
}

export interface EffectiveUserAccess {
  isAdmin: boolean;
  role: AppRole | "admin";
  sidebarSections: DashboardSectionKey[];
  worksheetEditor: EffectiveWorksheetEditorAccess;
}

export interface CurrentUserAccessPayload {
  user: AppUserRecord;
  effectiveAccess: EffectiveUserAccess;
}

export const ALL_BLOCK_TYPES: BlockType[] = BLOCK_LIBRARY.map((definition) => definition.type);

export const DEFAULT_EDITOR_FEATURES: Record<WorksheetEditorFeatureKey, boolean> = {
  addBlocks: true,
  deleteBlocks: true,
  duplicateBlocks: true,
  editBlockSettings: true,
  editTitle: true,
  editWorksheetSettings: true,
  exportWorksheet: true,
  manageBlockVisibility: true,
  previewWorksheet: true,
  publishWorksheet: true,
  reorderBlocks: true,
  saveWorksheet: true,
};

const DEFAULT_EDITOR_SECTIONS: DashboardSectionKey[] = DASHBOARD_SECTION_KEYS.filter(
  (section) => section !== "admin",
);

const DEFAULT_USER_SECTIONS: DashboardSectionKey[] = ["worksheet", "account"];

function isDashboardSectionKey(value: unknown): value is DashboardSectionKey {
  return typeof value === "string" && DASHBOARD_SECTION_KEYS.includes(value as DashboardSectionKey);
}

function isWorksheetEditorFeatureKey(value: unknown): value is WorksheetEditorFeatureKey {
  return (
    typeof value === "string" &&
    WORKSHEET_EDITOR_FEATURE_KEYS.includes(value as WorksheetEditorFeatureKey)
  );
}

function isBlockType(value: unknown): value is BlockType {
  return typeof value === "string" && ALL_BLOCK_TYPES.includes(value as BlockType);
}

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && (APP_ROLES as readonly string[]).includes(value);
}

export function normalizeAppRole(value: unknown): AppRole {
  return isAppRole(value) ? value : DEFAULT_NEW_USER_ROLE;
}

export function getDefaultSidebarSections(role: AppRole): DashboardSectionKey[] {
  return role === "user" ? DEFAULT_USER_SECTIONS : DEFAULT_EDITOR_SECTIONS;
}

export function getDefaultRoleSettings(role: AppRole): RoleAccessSettings {
  return {
    sidebarSections: getDefaultSidebarSections(role),
    worksheetEditor: {
      allowedBlockTypes: [...ALL_BLOCK_TYPES],
      features: { ...DEFAULT_EDITOR_FEATURES },
    },
  };
}

export function normalizeRoleAccessSettings(role: AppRole, raw: unknown): RoleAccessSettings {
  const defaults = getDefaultRoleSettings(role);

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return defaults;
  }

  const input = raw as {
    sidebarSections?: unknown;
    worksheetEditor?: { allowedBlockTypes?: unknown; features?: unknown };
  };

  const sidebarSections = Array.isArray(input.sidebarSections)
    ? input.sidebarSections.filter(isDashboardSectionKey)
    : null;

  const allowedBlockTypes = Array.isArray(input.worksheetEditor?.allowedBlockTypes)
    ? input.worksheetEditor!.allowedBlockTypes!.filter(isBlockType)
    : null;

  const features: Record<WorksheetEditorFeatureKey, boolean> = { ...defaults.worksheetEditor.features };
  const rawFeatures = input.worksheetEditor?.features;
  if (rawFeatures && typeof rawFeatures === "object" && !Array.isArray(rawFeatures)) {
    for (const [key, value] of Object.entries(rawFeatures)) {
      if (isWorksheetEditorFeatureKey(key) && typeof value === "boolean") {
        features[key] = value;
      }
    }
  }

  const normalizedAllowedBlockTypes = (() => {
    const base = Array.from(new Set(allowedBlockTypes ?? defaults.worksheetEditor.allowedBlockTypes));

    // Backward compatibility: when new block types are added in code,
    // older persisted role settings should automatically pick them up.
    for (const blockType of defaults.worksheetEditor.allowedBlockTypes) {
      if (!base.includes(blockType)) {
        base.push(blockType);
      }
    }

    return base;
  })();

  return {
    sidebarSections: Array.from(
      new Set((sidebarSections ?? defaults.sidebarSections).filter((section) => section !== "admin")),
    ),
    worksheetEditor: {
      allowedBlockTypes: normalizedAllowedBlockTypes,
      features,
    },
  };
}

export const FULL_WORKSHEET_EDITOR_ACCESS: EffectiveWorksheetEditorAccess = {
  allowedBlockTypes: [...ALL_BLOCK_TYPES],
  features: { ...DEFAULT_EDITOR_FEATURES },
};

const FULL_ADMIN_ACCESS: EffectiveUserAccess = {
  isAdmin: true,
  role: "admin",
  sidebarSections: [...DASHBOARD_SECTION_KEYS],
  worksheetEditor: {
    allowedBlockTypes: [...FULL_WORKSHEET_EDITOR_ACCESS.allowedBlockTypes],
    features: { ...FULL_WORKSHEET_EDITOR_ACCESS.features },
  },
};

export function buildEffectiveUserAccess(
  role: AppRole,
  template: RoleAccessSettings,
  isAdmin: boolean,
): EffectiveUserAccess {
  if (isAdmin) {
    return {
      ...FULL_ADMIN_ACCESS,
      sidebarSections: [...FULL_ADMIN_ACCESS.sidebarSections],
      worksheetEditor: {
        allowedBlockTypes: [...FULL_ADMIN_ACCESS.worksheetEditor.allowedBlockTypes],
        features: { ...FULL_ADMIN_ACCESS.worksheetEditor.features },
      },
    };
  }

  return {
    isAdmin: false,
    role,
    sidebarSections: template.sidebarSections.filter((section) => section !== "admin"),
    worksheetEditor: {
      allowedBlockTypes: [...template.worksheetEditor.allowedBlockTypes],
      features: { ...template.worksheetEditor.features },
    },
  };
}

export function canUseEditorFeature(
  access: EffectiveWorksheetEditorAccess,
  feature: WorksheetEditorFeatureKey,
): boolean {
  return access.features[feature] !== false;
}

export function isBlockTypeAllowed(
  access: EffectiveWorksheetEditorAccess,
  blockType: BlockType,
): boolean {
  if (blockType === "lueckenzeilen" && !access.allowedBlockTypes.includes("lueckenzeilen")) {
    return access.allowedBlockTypes.includes("dialogue");
  }

  if (blockType === "table-cloud" && !access.allowedBlockTypes.includes("table-cloud")) {
    return access.allowedBlockTypes.includes("table");
  }

  return access.allowedBlockTypes.includes(blockType);
}
