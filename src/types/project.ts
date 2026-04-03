// ── Brand settings — re-exported from unified type ─────────────────────

import type { BrandProfile } from "./worksheet";
export type { BrandProfile };

/**
 * @deprecated Inline brand settings on Client — use BrandProfile instead.
 * Kept for backward compat with existing Client.brandSettings JSON data.
 */
export interface ClientBrandSettings {
  logo?: string;
  favicon?: string;
  primaryColor?: string;
  accentColor?: string;
  fontFamily?: string;
  pageTitle?: string;
}

export const DEFAULT_BRAND_SETTINGS: ClientBrandSettings = {};

// ── Client ──────────────────────────────────────────────────────────────

export interface Client {
  id: string;
  name: string;
  slug: string;
  /** @deprecated Use brandProfile instead */
  brandSettings: ClientBrandSettings;
  brandProfileId?: string | null;
  brandProfile?: BrandProfile | null;
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
