/**
 * Cleanup script: remove orphaned keys from the "default" namespace in i18nexus.
 *
 * Background: Before switching to per-course namespaces, all course strings
 * were pushed to the default namespace. Now each course has its own namespace,
 * so the old keys in "default" are duplicates.
 *
 * Usage:
 *   npx tsx scripts/cleanup-i18nexus-default-namespace.ts          # dry run
 *   npx tsx scripts/cleanup-i18nexus-default-namespace.ts --delete  # actually delete
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config(); // fallback to .env

const BASE_URL = "https://api.i18nexus.com/project_resources";
const API_KEY = process.env.I18NEXUS_API_KEY!;
const ACCESS_TOKEN = process.env.I18NEXUS_PERSONAL_ACCESS_TOKEN!;

if (!API_KEY || !ACCESS_TOKEN) {
  console.error("Missing I18NEXUS_API_KEY or I18NEXUS_PERSONAL_ACCESS_TOKEN in .env");
  process.exit(1);
}

const dryRun = !process.argv.includes("--delete");

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

async function getNamespaces(): Promise<{ id: string; title: string }[]> {
  const res = await fetch(readUrl("namespaces.json"));
  if (!res.ok) throw new Error(`getNamespaces failed: ${res.status}`);
  const data = await res.json();
  return data.collection;
}

async function getBaseStrings(namespace: string): Promise<{ key: string; value: string }[]> {
  // Use the translations endpoint with the base language to get keys in a namespace
  // First, find the base language
  const langRes = await fetch(readUrl("languages.json"));
  if (!langRes.ok) throw new Error(`getLanguages failed: ${langRes.status}`);
  const langData = await langRes.json();
  const baseLang = langData.collection.find((l: { base_language: boolean }) => l.base_language);
  if (!baseLang) throw new Error("No base language found");

  const res = await fetch(readUrl(`translations/${baseLang.full_code}/${namespace}.json`));
  if (!res.ok) {
    if (res.status === 404) return []; // namespace might be empty
    throw new Error(`getTranslations failed: ${res.status}`);
  }
  const nested = await res.json();

  // Flatten nested object to dot-notation keys
  const result: { key: string; value: string }[] = [];
  function flatten(obj: Record<string, unknown>, prefix = "") {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof value === "string") {
        result.push({ key: fullKey, value });
      } else if (value && typeof value === "object" && !Array.isArray(value)) {
        flatten(value as Record<string, unknown>, fullKey);
      }
    }
  }
  flatten(nested);
  return result;
}

async function deleteString(key: string, namespace: string): Promise<void> {
  const res = await fetch(readUrl("base_strings.json"), {
    method: "DELETE",
    headers: writeHeaders(),
    body: JSON.stringify({ id: { key, namespace } }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`deleteString "${key}" failed: ${res.status} — ${text}`);
  }
}

async function main() {
  console.log("Fetching namespaces...");
  const namespaces = await getNamespaces();
  console.log(`Found ${namespaces.length} namespaces:`);
  for (const ns of namespaces) {
    console.log(`  - "${ns.title}" (${ns.id})`);
  }

  const defaultNs = namespaces.find(
    (ns) => ns.title === "default" || ns.title === "Default"
  );
  if (!defaultNs) {
    console.log("\nNo 'default' namespace found — nothing to clean up.");
    return;
  }

  // Get course-specific namespaces (everything that isn't "default")
  const courseNamespaces = namespaces.filter(
    (ns) => ns.title !== "default" && ns.title !== "Default"
  );

  // Get strings from the default namespace
  console.log(`\nFetching strings from "${defaultNs.title}" namespace...`);
  const defaultStrings = await getBaseStrings(defaultNs.title);
  console.log(`Found ${defaultStrings.length} strings in default namespace.`);

  if (defaultStrings.length === 0) {
    console.log("Nothing to clean up.");
    return;
  }

  // Collect keys from all course-specific namespaces for comparison
  const courseKeys = new Map<string, string[]>(); // key → [namespace1, namespace2, ...]
  for (const ns of courseNamespaces) {
    console.log(`Fetching strings from "${ns.title}"...`);
    const strings = await getBaseStrings(ns.title);
    for (const s of strings) {
      if (!courseKeys.has(s.key)) courseKeys.set(s.key, []);
      courseKeys.get(s.key)!.push(ns.title);
    }
    // Rate limit
    await new Promise((r) => setTimeout(r, 500));
  }

  // Find duplicates: keys in default that also exist in a course namespace
  const duplicates = defaultStrings.filter((s) => courseKeys.has(s.key));
  const orphans = defaultStrings.filter((s) => !courseKeys.has(s.key));

  console.log(`\n=== Summary ===`);
  console.log(`Total strings in default namespace: ${defaultStrings.length}`);
  console.log(`Duplicates (also in course ns):     ${duplicates.length}`);
  console.log(`Orphans (only in default):          ${orphans.length}`);

  if (duplicates.length > 0) {
    console.log(`\nDuplicate keys (first 20):`);
    for (const s of duplicates.slice(0, 20)) {
      console.log(`  "${s.key}" → also in: ${courseKeys.get(s.key)!.join(", ")}`);
    }
  }

  if (orphans.length > 0) {
    console.log(`\nOrphan keys (first 20):`);
    for (const s of orphans.slice(0, 20)) {
      console.log(`  "${s.key}" = "${s.value?.substring(0, 60)}..."`);
    }
  }

  if (dryRun) {
    console.log(`\n🔍 DRY RUN — no changes made.`);
    console.log(`Run with --delete to remove all ${defaultStrings.length} strings from the default namespace.`);
    return;
  }

  // Delete ALL strings from the default namespace (both duplicates and orphans)
  console.log(`\n🗑️  Deleting ${defaultStrings.length} strings from default namespace...`);
  let deleted = 0;
  let failed = 0;

  for (let i = 0; i < defaultStrings.length; i++) {
    const s = defaultStrings[i];
    try {
      await deleteString(s.key, defaultNs.title);
      deleted++;
    } catch (err) {
      failed++;
      console.error(`  ✗ Failed to delete "${s.key}": ${err}`);
    }

    // Rate limit: 1 per second
    await new Promise((r) => setTimeout(r, 1000));

    if ((i + 1) % 10 === 0) {
      console.log(`  Progress: ${i + 1}/${defaultStrings.length} (${deleted} deleted, ${failed} failed)`);
    }
  }

  console.log(`\n✅ Done: ${deleted} deleted, ${failed} failed.`);
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
