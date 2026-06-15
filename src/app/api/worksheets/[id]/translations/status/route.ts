import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";
import { extractWorksheetStrings } from "@/lib/worksheet-translation";
import { WorksheetBlock, WorksheetSettings } from "@/types/worksheet";

// GET /api/worksheets/[id]/translations/status
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  const { id } = await params;
  const worksheet = await prisma.worksheet.findUnique({
    where: { id, userId },
  });
  if (!worksheet) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const translations = ((worksheet as any).translations ?? {}) as Record<string, Record<string, string>>;
  const languages = Object.keys(translations).filter((k) => !k.startsWith("_"));

  const blocks = (worksheet.blocks as unknown as WorksheetBlock[]) ?? [];
  const settings = (worksheet.settings as unknown as WorksheetSettings) ?? {};
  const strings = extractWorksheetStrings(blocks);
  const stringCount = Object.keys(strings).length;
  const targetLanguages = settings.translationLanguages ?? [];

  // ── Staleness detection ─────────────────────────────────────
  // Mirror the delta logic of the translate route: a worksheet is "stale"
  // when its current content no longer matches what was last translated.
  // This catches edits made after translating (e.g. new headings) that would
  // otherwise silently fall back to German in translated PDFs.
  const previousSource = (translations._source ?? {}) as Record<string, string>;
  const trackedLanguages = languages.length > 0 ? languages : targetLanguages;
  const staleKeys = new Set<string>();
  for (const lang of trackedLanguages) {
    const langMap = translations[lang] ?? {};
    for (const [key, value] of Object.entries(strings)) {
      if (previousSource[key] !== value || typeof langMap[key] !== "string") {
        staleKeys.add(key);
      }
    }
  }
  const removedKeys = Object.keys(previousSource).filter((k) => !(k in strings));
  const staleCount = staleKeys.size;
  // Only meaningful once at least one translation exists.
  const isStale = languages.length > 0 && (staleCount > 0 || removedKeys.length > 0);

  return NextResponse.json({
    hasTranslations: languages.length > 0,
    languages,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    translatedAt: (worksheet as any).translatedAt ?? null,
    stringCount,
    targetLanguages,
    isStale,
    staleCount,
    removedCount: removedKeys.length,
  });
}
