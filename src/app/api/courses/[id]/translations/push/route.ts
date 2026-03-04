import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";
import {
  extractTranslatableStrings,
  getAiInstructions,
} from "@/lib/course-translation";
import {
  getNamespaces,
  createNamespace,
  importStrings,
  createString,
} from "@/lib/i18nexus";
import {
  CourseModule,
  CourseCoverSettings,
  CourseSettings,
} from "@/types/course";

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

  // Build a CourseDocument-like object for extraction
  const doc = {
    id: course.id,
    title: course.title,
    slug: course.slug,
    structure: course.structure as unknown as CourseModule[],
    coverSettings: course.coverSettings as unknown as CourseCoverSettings,
    settings: course.settings as unknown as CourseSettings,
    published: course.published,
    createdAt: course.createdAt.toISOString(),
    updatedAt: course.updatedAt.toISOString(),
    folderId: course.folderId,
    userId: course.userId,
  };

  // Extract all translatable strings
  const strings = extractTranslatableStrings(doc);
  const entries = Object.entries(strings);

  if (entries.length === 0) {
    return NextResponse.json({
      success: true,
      stringCount: 0,
      newStrings: 0,
      message: "No translatable strings found",
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const courseAny = course as any;

  // Use a dedicated namespace per course (slug-based for readability)
  let namespaceName = (courseAny.i18nexusNamespace ?? null) as string | null;

  if (!namespaceName) {
    namespaceName = course.slug || `course-${course.id}`;

    // Create namespace in i18nexus if it doesn't exist yet
    const existing = await getNamespaces();
    if (!existing.some((ns) => ns.title === namespaceName)) {
      await createNamespace(namespaceName!);
    }

    // Store namespace reference on course record
    await prisma.course.update({
      where: { id },
      data: { i18nexusNamespace: namespaceName } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    });
  }

// Bulk-update existing base language values (does NOT create new keys)
  try {
    await importStrings(namespaceName, { de: strings }, true, true);
  } catch {
    // importStrings may fail on large payloads; continue with createString
  }

  // Create strings one-by-one to trigger machine translation.
  // createString creates new keys; duplicates return 422 and are skipped.
  let created = 0;
  let total = 0;
  for (const [key, value] of entries) {
    total++;
    try {
      const aiInstructions = getAiInstructions(key, value);
      await createString(key, value, namespaceName, aiInstructions);
      created++;
    } catch {
      // 422 = duplicate key (already exists) — expected for existing strings
    }

    // Rate limit: ~8 requests per second
    if (total % 8 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return NextResponse.json({
    success: true,
    stringCount: entries.length,
    newStrings: created,
    namespace: namespaceName,
  });
}
