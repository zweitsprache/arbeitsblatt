import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";
import { DEFAULT_COURSE_SETTINGS, DEFAULT_COURSE_COVER_SETTINGS } from "@/types/course";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function NewCoursePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  let session;
  try {
    const result = await auth.getSession();
    session = result.data;
  } catch {
    redirect(`/${locale}/auth/sign-in`);
  }
  if (!session?.user) {
    redirect(`/${locale}/auth/sign-in`);
  }

  // Create a new course and redirect to editor
  const course = await prisma.course.create({
    data: {
      title: "Untitled Course",
      slug: nanoid(10),
      structure: [],
      coverSettings: DEFAULT_COURSE_COVER_SETTINGS as unknown as Prisma.InputJsonValue,
      settings: DEFAULT_COURSE_SETTINGS as unknown as Prisma.InputJsonValue,
      userId: session.user.id,
    },
  });

  redirect(`/${locale}/editor/course/${course.id}`);
}
