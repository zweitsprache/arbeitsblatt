/**
 * i18nexus API client for course content translation management.
 *
 * Base URL: https://api.i18nexus.com/project_resources
 * - Read endpoints use ?api_key=...
 * - Write endpoints use Authorization: Bearer <personal_access_token>
 */

const BASE_URL = "https://api.i18nexus.com/project_resources";
const API_KEY = process.env.I18NEXUS_API_KEY!;
const ACCESS_TOKEN = process.env.I18NEXUS_PERSONAL_ACCESS_TOKEN!;

// ─── Read helpers ────────────────────────────────────────────

function readUrl(path: string): string {
  const separator = path.includes("?") ? "&" : "?";
  return `${BASE_URL}/${path}${separator}api_key=${API_KEY}`;
}

function writeHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${ACCESS_TOKEN}`,
  };
}

function writeUrl(path: string): string {
  const separator = path.includes("?") ? "&" : "?";
  return `${BASE_URL}/${path}${separator}api_key=${API_KEY}`;
}

// ─── Namespace operations ────────────────────────────────────

export async function getNamespaces(): Promise<
  { id: string; title: string; created_at: number }[]
> {
  const res = await fetch(readUrl("namespaces.json"));
  if (!res.ok) throw new Error(`i18nexus getNamespaces failed: ${res.status}`);
  const data = await res.json();
  return data.collection;
}

export async function createNamespace(title: string): Promise<void> {
  const res = await fetch(writeUrl("namespaces.json"), {
    method: "POST",
    headers: writeHeaders(),
    body: JSON.stringify({ title }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`i18nexus createNamespace failed: ${res.status} — ${text}`);
  }
}

// ─── String operations ──────────────────────────────────────

/**
 * Create a single string in the base language.
 * This triggers machine translation for all project languages automatically.
 */
export async function createString(
  key: string,
  value: string,
  namespace: string,
  aiInstructions?: string
): Promise<void> {
  const body: Record<string, string> = { key, value, namespace };
  if (aiInstructions) body.ai_instructions = aiInstructions;

  const res = await fetch(writeUrl("base_strings.json"), {
    method: "POST",
    headers: writeHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`i18nexus createString failed: ${res.status} — ${text}`);
  }
}

/**
 * Import a batch of strings for one or more languages into a namespace.
 * Does NOT auto-translate — use for re-importing base language content.
 */
export async function importStrings(
  namespace: string,
  languages: Record<string, Record<string, string>>,
  overwrite = true,
  confirm = false
): Promise<void> {
  const res = await fetch(writeUrl("import.json"), {
    method: "POST",
    headers: writeHeaders(),
    body: JSON.stringify({ namespace, languages, overwrite, confirm }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`i18nexus importStrings failed: ${res.status} — ${text}`);
  }
}

/**
 * Delete a string by key and namespace.
 */
export async function deleteString(
  key: string,
  namespace: string
): Promise<void> {
  const res = await fetch(writeUrl("base_strings.json"), {
    method: "DELETE",
    headers: writeHeaders(),
    body: JSON.stringify({ id: { key, namespace } }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`i18nexus deleteString failed: ${res.status} — ${text}`);
  }
}

// ─── Helpers ────────────────────────────────────────────────

/**
 * Flatten a nested object into dot-notation keys.
 * i18nexus returns translations as nested objects (e.g. { module: { abc: { title: "..." } } })
 * but our course translation system uses flat dot-notation keys (e.g. "module.abc.title").
 */
function flattenObject(
  obj: Record<string, unknown>,
  prefix = ""
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      result[fullKey] = value;
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value as Record<string, unknown>, fullKey));
    }
  }
  return result;
}

// ─── Translation retrieval ──────────────────────────────────

/**
 * Get all translations for a specific language and namespace.
 * The i18nexus API returns nested objects; this function flattens them
 * into dot-notation keys for use with applyTranslations().
 */
export async function getTranslations(
  languageCode: string,
  namespace: string
): Promise<Record<string, string>> {
  const res = await fetch(
    readUrl(`translations/${languageCode}/${namespace}.json`)
  );
  if (!res.ok) {
    throw new Error(`i18nexus getTranslations failed: ${res.status}`);
  }
  const nested = await res.json();
  return flattenObject(nested);
}

/**
 * Get all translations for all languages for a namespace.
 * Returns { en: { key: value, ... }, uk: { key: value, ... }, ... }
 */
export async function getAllTranslationsForNamespace(
  namespace: string
): Promise<Record<string, Record<string, string>>> {
  const res = await fetch(readUrl("translations.json"));
  if (!res.ok) {
    throw new Error(`i18nexus getAllTranslations failed: ${res.status}`);
  }
  const all = await res.json();
  // Filter to just the target namespace
  const result: Record<string, Record<string, string>> = {};
  for (const [lang, namespaces] of Object.entries(all)) {
    const ns = namespaces as Record<string, Record<string, string>>;
    if (ns[namespace]) {
      result[lang] = ns[namespace];
    }
  }
  return result;
}

// ─── Languages ──────────────────────────────────────────────

export async function getLanguages(): Promise<
  {
    name: string;
    full_code: string;
    language_code: string;
    base_language: boolean;
  }[]
> {
  const res = await fetch(readUrl("languages.json"));
  if (!res.ok) throw new Error(`i18nexus getLanguages failed: ${res.status}`);
  const data = await res.json();
  return data.collection;
}
