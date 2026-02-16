#!/usr/bin/env node
/**
 * Translation Validation Script
 *
 * Ensures de.json and en.json are structurally identical:
 * - Same namespaces in both files
 * - Same keys in every namespace
 * - No empty string values
 *
 * Run:  node scripts/validate-translations.mjs
 * Exit: 0 if OK, 1 if issues found (blocks the build)
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const LOCALES = ["de", "en"];

// ─── Load all locale files ──────────────────────────────────

const messages = {};
for (const locale of LOCALES) {
  const filePath = resolve(root, `src/messages/${locale}.json`);
  try {
    messages[locale] = JSON.parse(readFileSync(filePath, "utf-8"));
  } catch (err) {
    console.error(`❌ Failed to read ${locale}.json: ${err.message}`);
    process.exit(1);
  }
}

// ─── Collect all namespaces across all locales ──────────────

const allNamespaces = [
  ...new Set(LOCALES.flatMap((l) => Object.keys(messages[l]))),
].sort();

let errors = 0;
let warnings = 0;

// ─── Check each namespace ───────────────────────────────────

for (const ns of allNamespaces) {
  // Collect all keys across all locales for this namespace
  const allKeys = [
    ...new Set(
      LOCALES.flatMap((l) => Object.keys(messages[l]?.[ns] || {}))
    ),
  ].sort();

  for (const locale of LOCALES) {
    const nsObj = messages[locale]?.[ns];

    if (!nsObj) {
      console.error(
        `❌ [${locale}] Entire namespace "${ns}" is missing`
      );
      errors++;
      continue;
    }

    for (const key of allKeys) {
      if (!(key in nsObj)) {
        console.error(
          `❌ [${locale}] Missing key: ${ns}.${key}`
        );
        errors++;
      } else if (nsObj[key] === "") {
        console.warn(
          `⚠️  [${locale}] Empty value: ${ns}.${key}`
        );
        warnings++;
      }
    }
  }
}

// ─── Summary ────────────────────────────────────────────────

const totalKeys = Object.values(messages[LOCALES[0]]).reduce(
  (sum, ns) => sum + Object.keys(ns).length,
  0
);

console.log("");
if (errors > 0) {
  console.error(
    `❌ Validation FAILED: ${errors} missing key(s), ${warnings} warning(s)`
  );
  console.error(
    "   Fix: Add the missing keys in i18nexus, then run: npm run i18n:pull"
  );
  process.exit(1);
} else {
  console.log(
    `✅ Validation passed: ${allNamespaces.length} namespaces, ${totalKeys} keys per locale, ${warnings} warning(s)`
  );
}
