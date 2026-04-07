import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAiToolDefinition } from "@/ai-tools/registry";

// GET /api/admin/projects/[id] — get project with client + assigned contents
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAdmin();
  if (result instanceof NextResponse) return result;

  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      client: true,
      contents: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Enrich content items with titles from their respective tables
  const enrichedContents = await Promise.all(
    project.contents.map(async (pc) => {
      let title: string | undefined;
      let slug: string | undefined;
      let published: boolean | undefined;

      switch (pc.contentType) {
        case "WORKSHEET": {
          const w = await prisma.worksheet.findUnique({
            where: { id: pc.contentId },
            select: { title: true, slug: true, published: true },
          });
          if (w) {
            title = w.title;
            slug = w.slug;
            published = w.published;
          }
          break;
        }
        case "EBOOK": {
          const e = await prisma.eBook.findUnique({
            where: { id: pc.contentId },
            select: { title: true, slug: true, published: true },
          });
          if (e) {
            title = e.title;
            slug = e.slug;
            published = e.published;
          }
          break;
        }
        case "COURSE": {
          const c = await prisma.course.findUnique({
            where: { id: pc.contentId },
            select: { title: true, slug: true, published: true },
          });
          if (c) {
            title = c.title;
            slug = c.slug;
            published = c.published;
          }
          break;
        }
        case "AI_TOOL": {
          const tool = getAiToolDefinition(pc.contentId);
          if (tool) {
            title = tool.title;
            slug = tool.toolKey;
            published = true;
          }
          break;
        }
      }

      return { ...pc, title, slug, published };
    })
  );

  return NextResponse.json({ ...project, contents: enrichedContents });
}

// PUT /api/admin/projects/[id] — update project
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAdmin();
  if (result instanceof NextResponse) return result;

  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.slug !== undefined) data.slug = body.slug;
  if (body.clientId !== undefined) data.clientId = body.clientId;
  if (body.domain !== undefined) data.domain = body.domain || null;
  if (body.settings !== undefined) data.settings = body.settings;

  const project = await prisma.project.update({
    where: { id },
    data,
    include: {
      client: { select: { id: true, name: true, slug: true } },
    },
  });

  return NextResponse.json(project);
}

// DELETE /api/admin/projects/[id] — delete project (cascades content assignments)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAdmin();
  if (result instanceof NextResponse) return result;

  const { id } = await params;

  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.project.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
