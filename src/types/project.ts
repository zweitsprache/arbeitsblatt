// ── Brand settings stored as JSON on Client ────────────────────────────

export interface BrandSettings {
  logo?: string; // URL or base64 data URL
  favicon?: string; // URL or base64 data URL
  primaryColor?: string; // hex color
  accentColor?: string; // hex color
  fontFamily?: string; // CSS font-family value
  pageTitle?: string; // custom page / tab title
}

export const DEFAULT_BRAND_SETTINGS: BrandSettings = {};

// ── Client ──────────────────────────────────────────────────────────────

export interface Client {
  id: string;
  name: string;
  slug: string;
  brandSettings: BrandSettings;
  createdAt: string;
  updatedAt: string;
  projects?: Project[];
  _count?: { projects: number };
}

// ── Project ─────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  slug: string;
  clientId: string;
  domain?: string | null;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  client?: Client;
  contents?: ProjectContent[];
  _count?: { contents: number };
}

// ── Content assignment (join table) ─────────────────────────────────────

export type ContentType = "WORKSHEET" | "EBOOK" | "COURSE" | "AI_TOOL";

export interface ProjectContent {
  id: string;
  projectId: string;
  contentType: ContentType;
  contentId: string;
  createdAt: string;
  // Populated on read — not stored in the join table
  title?: string;
  slug?: string;
  published?: boolean;
}
