import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";
import { DEFAULT_PRESENTATION_SETTINGS } from "@/types/presentation";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function NewPresentationPage({
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

  const presentation = await prisma.presentation.create({
    data: {
      title: "Untitled Presentation",
      slug: nanoid(10),
      blocks: [],
      settings: DEFAULT_PRESENTATION_SETTINGS as unknown as Prisma.InputJsonValue,
      userId: session.user.id,
    },
  });

  redirect(`/${locale}/editor/presentation/${presentation.id}`);
}
