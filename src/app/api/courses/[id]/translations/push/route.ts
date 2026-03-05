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

  // Use a dedicated namespace per course (slug-based for readability)
  let namespaceName = (course.i18nexusNamespace ?? null) as string | null;

  // Always verify the namespace exists in i18nexus (it may have been deleted)
  const existing = await getNamespaces();

  if (!namespaceName) {
    namespaceName = course.slug || `course-${course.id}`;
  }

  if (!existing.some((ns) => ns.title === namespaceName)) {
    await createNamespace(namespaceName!);
  }

  // Store namespace reference on course record (idempotent)
  if (!course.i18nexusNamespace) {
    await prisma.course.update({
      where: { id },
      data: { i18nexusNamespace: namespaceName } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    });
  }

  // 1. Create strings one-by-one FIRST to trigger machine translation.
  //    New keys get created + auto-translated; existing keys return 422.
  //    IMPORTANT: This MUST run before importStrings, because importStrings
  //    creates new keys WITHOUT triggering auto-translation.
  let created = 0;
  let skipped = 0;
  let errors = 0;
  const errorMessages: string[] = [];
  // Track keys that already exist (422) — only these should be bulk-updated
  const existingKeys: string[] = [];
  // Track keys that failed — must NOT be imported (would create without auto-translate)
  const failedKeys = new Set<string>();

  for (let i = 0; i < entries.length; i++) {
    const [key, value] = entries[i];

    // Retry loop with exponential backoff for 429 rate limits
    let attempt = 0;
    const MAX_RETRIES = 4;
    while (attempt <= MAX_RETRIES) {
      try {
        const aiInstructions = getAiInstructions(key, value);
        await createString(key, value, namespaceName, aiInstructions);
        created++;
        break; // success → exit retry loop
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("422")) {
          // 422 = duplicate key (already exists) — expected
          skipped++;
          existingKeys.push(key);
          break;
        } else if (msg.includes("429") && attempt < MAX_RETRIES) {
          // 429 = rate limited — wait and retry with exponential backoff
          const delay = 1000 * Math.pow(2, attempt); // 1s, 2s, 4s, 8s
          await new Promise((resolve) => setTimeout(resolve, delay));
          attempt++;
        } else {
          // Non-retryable error or max retries exhausted
          errors++;
          failedKeys.add(key);
          if (errorMessages.length < 3) {
            errorMessages.push(msg);
          }
          break;
        }
      }
    }

    // Throttle: 1 request per second to stay well within i18nexus limits
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // 2. Bulk-update base language values for EXISTING strings only.
  //    This ensures changed German text is synced to i18nexus.
  //    CRITICAL: We MUST NOT include failed keys here — importStrings would
  //    create them without triggering auto-translation, permanently preventing
  //    them from ever being auto-translated via createString.
  let importError: string | null = null;
  if (existingKeys.length > 0) {
    const existingStrings: Record<string, string> = {};
    for (const key of existingKeys) {
      existingStrings[key] = strings[key];
    }
    try {
      await importStrings(namespaceName, { de: existingStrings }, true, true);
    } catch (err) {
      importError = err instanceof Error ? err.message : String(err);
    }
  }

  return NextResponse.json({
    success: errors === 0,
    stringCount: entries.length,
    newStrings: created,
    skippedStrings: skipped,
    errors,
    errorMessages: errorMessages.length > 0 ? errorMessages : undefined,
    importError: importError ?? undefined,
    namespace: namespaceName,
  });
}
