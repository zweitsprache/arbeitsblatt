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
  const stringCount = Object.keys(extractWorksheetStrings(blocks)).length;
  const targetLanguages = settings.translationLanguages ?? [];

  return NextResponse.json({
    hasTranslations: languages.length > 0,
    languages,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    translatedAt: (worksheet as any).translatedAt ?? null,
    stringCount,
    targetLanguages,
  });
}
