import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";

// GET /api/admin/content/search?q=...&type=... — search all content for assignment picker
export async function GET(req: NextRequest) {
  const result = await requireAdmin();
  if (result instanceof NextResponse) return result;

  const q = req.nextUrl.searchParams.get("q") || "";
  const type = req.nextUrl.searchParams.get("type"); // optional filter

  const titleFilter = q
    ? { title: { contains: q, mode: "insensitive" as const } }
    : {};

  const results: Array<{
    id: string;
    title: string;
    slug: string;
    published: boolean;
    contentType: string;
  }> = [];

  if (!type || type === "WORKSHEET") {
    const worksheets = await prisma.worksheet.findMany({
      where: titleFilter,
      select: { id: true, title: true, slug: true, published: true },
      orderBy: { updatedAt: "desc" },
      take: 20,
    });
    results.push(
      ...worksheets.map((w) => ({ ...w, contentType: "WORKSHEET" as const }))
    );
  }

  if (!type || type === "EBOOK") {
    const ebooks = await prisma.eBook.findMany({
      where: titleFilter,
      select: { id: true, title: true, slug: true, published: true },
      orderBy: { updatedAt: "desc" },
      take: 20,
    });
    results.push(
      ...ebooks.map((e) => ({ ...e, contentType: "EBOOK" as const }))
    );
  }

  if (!type || type === "COURSE") {
    const courses = await prisma.course.findMany({
      where: titleFilter,
      select: { id: true, title: true, slug: true, published: true },
      orderBy: { updatedAt: "desc" },
      take: 20,
    });
    results.push(
      ...courses.map((c) => ({ ...c, contentType: "COURSE" as const }))
    );
  }

  if (!type || type === "AI_TOOL") {
    const aiTools = await prisma.aiTool.findMany({
      where: titleFilter,
      select: { id: true, title: true, slug: true, published: true },
      orderBy: { updatedAt: "desc" },
      take: 20,
    });
    results.push(
      ...aiTools.map((a) => ({ ...a, contentType: "AI_TOOL" as const }))
    );
  }

  return NextResponse.json(results);
}
