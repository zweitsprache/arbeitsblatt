import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";
import { getTranslations, getLanguages } from "@/lib/i18nexus";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  const { id } = await params;
  const course = await prisma.course.findUnique({
    where: { id, userId },
  });
  if (!course) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const courseAny = course as any;
  const namespaceName = (courseAny.i18nexusNamespace ?? null) as string | null;
  if (!namespaceName) {
    return NextResponse.json(
      { error: "Course has not been pushed to i18nexus yet" },
      { status: 400 }
    );
  }

  // Get all non-base languages from i18nexus
  const languages = await getLanguages();
  const targetLangs = languages.filter((l) => !l.base_language);

  // Fetch translation strings for each target language
  const translations: Record<string, Record<string, string>> = {};
  const fetchedLanguages: string[] = [];

  for (const lang of targetLangs) {
    try {
      const langTranslations = await getTranslations(
        lang.full_code,
        namespaceName
      );

      if (Object.keys(langTranslations).length > 0) {
        translations[lang.full_code] = langTranslations;
        fetchedLanguages.push(lang.full_code);
      }
    } catch {
      // Skip languages that have no translations yet
      console.warn(
        `No translations found for ${lang.full_code} in namespace ${namespaceName}`
      );
    }
  }

  // Save to database
  await prisma.course.update({
    where: { id },
    data: {
      translations,
      translatedAt: new Date(),
    } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
  });

  return NextResponse.json({
    success: true,
    languages: fetchedLanguages,
    translatedAt: new Date().toISOString(),
  });
}
