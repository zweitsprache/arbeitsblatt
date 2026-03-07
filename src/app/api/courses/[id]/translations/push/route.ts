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
  createString,
  deleteString,
  getBaseStrings,
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

  // ── Fetch existing base strings from i18nexus to detect changes ──
  let remoteStrings: Record<string, string> = {};
  try {
    const baseStrings = await getBaseStrings(namespaceName);
    for (const s of baseStrings) {
      remoteStrings[s.key] = s.value;
    }
  } catch {
    // If fetch fails (e.g. new namespace), treat everything as new
    remoteStrings = {};
  }

  // Categorize each entry:
  //  - new:       key does not exist remotely → createString (triggers auto-translate)
  //  - changed:   key exists but German value differs → deleteString + createString (re-triggers auto-translate)
  //  - unchanged: key exists with same value → skip entirely

  let created = 0;
  let retranslated = 0;
  let unchanged = 0;
  let errors = 0;
  const errorMessages: string[] = [];
  const failedKeys = new Set<string>();

  for (let i = 0; i < entries.length; i++) {
    const [key, value] = entries[i];
    const remoteValue = remoteStrings[key];
    const isNew = remoteValue === undefined;
    const isChanged = !isNew && remoteValue !== value;

    // Unchanged keys: nothing to do
    if (!isNew && !isChanged) {
      unchanged++;
      continue;
    }

    // Changed keys: delete first so createString treats them as new
    if (isChanged) {
      let attempt = 0;
      const MAX_RETRIES = 4;
      let deleted = false;
      while (attempt <= MAX_RETRIES) {
        try {
          await deleteString(key, namespaceName);
          deleted = true;
          break;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes("429") && attempt < MAX_RETRIES) {
            const delay = 1000 * Math.pow(2, attempt);
            await new Promise((resolve) => setTimeout(resolve, delay));
            attempt++;
          } else {
            errors++;
            failedKeys.add(key);
            if (errorMessages.length < 3) {
              errorMessages.push(`Delete failed for "${key}": ${msg}`);
            }
            break;
          }
        }
      }
      if (!deleted) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Create the string (new or just-deleted) → triggers auto-translation
    let attempt = 0;
    const MAX_RETRIES = 4;
    while (attempt <= MAX_RETRIES) {
      try {
        const aiInstructions = getAiInstructions(key, value);
        await createString(key, value, namespaceName, aiInstructions);
        if (isChanged) {
          retranslated++;
        } else {
          created++;
        }
        break;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("429") && attempt < MAX_RETRIES) {
          const delay = 1000 * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
          attempt++;
        } else {
          errors++;
          failedKeys.add(key);
          if (errorMessages.length < 3) {
            errorMessages.push(`Create failed for "${key}": ${msg}`);
          }
          break;
        }
      }
    }

    // Throttle: 1 request per second to stay within i18nexus limits
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return NextResponse.json({
    success: errors === 0,
    stringCount: entries.length,
    newStrings: created,
    retranslatedStrings: retranslated,
    unchangedStrings: unchanged,
    errors,
    errorMessages: errorMessages.length > 0 ? errorMessages : undefined,
    namespace: namespaceName,
  });
}
