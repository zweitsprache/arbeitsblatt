import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";
import { hasLocale } from "next-intl";
import { mergeCodeTranslations } from "./code-translations";
import { readFile } from "node:fs/promises";
import path from "node:path";

async function loadMessages(locale: string): Promise<Record<string, unknown>> {
  // In development, read from disk to avoid stale module cache for JSON imports.
  if (process.env.NODE_ENV === "development") {
    const filePath = path.join(process.cwd(), "src", "messages", `${locale}.json`);
    const content = await readFile(filePath, "utf8");
    return JSON.parse(content) as Record<string, unknown>;
  }

  return ((await import(`../messages/${locale}.json`)).default ?? {}) as Record<string, unknown>;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const raw = await loadMessages(locale);

  return {
    locale,
    messages: mergeCodeTranslations(raw, locale),
  };
});
