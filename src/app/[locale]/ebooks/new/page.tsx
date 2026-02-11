import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";
import { DEFAULT_EBOOK_SETTINGS, DEFAULT_EBOOK_COVER_SETTINGS } from "@/types/ebook";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function NewEBookPage({
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

  // Create a new ebook and redirect to editor
  const ebook = await prisma.eBook.create({
    data: {
      title: "Untitled E-Book",
      slug: nanoid(10),
      chapters: [],
      coverSettings: DEFAULT_EBOOK_COVER_SETTINGS as unknown as Prisma.InputJsonValue,
      settings: DEFAULT_EBOOK_SETTINGS as unknown as Prisma.InputJsonValue,
      userId: session.user.id,
    },
  });

  redirect(`/${locale}/editor/ebook/${ebook.id}`);
}
