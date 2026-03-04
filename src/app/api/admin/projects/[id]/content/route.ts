import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { ContentType as ContentTypeEnum } from "@prisma/client";

const VALID_CONTENT_TYPES: ContentTypeEnum[] = [
  "WORKSHEET",
  "EBOOK",
  "COURSE",
  "AI_TOOL",
];

// GET /api/admin/projects/[id]/content — list assigned content with details
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAdmin();
  if (result instanceof NextResponse) return result;

  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const contents = await prisma.projectContent.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
  });

  // Enrich with titles
  const enriched = await Promise.all(
    contents.map(async (pc) => {
      let title: string | undefined;
      let slug: string | undefined;
      let published: boolean | undefined;

      switch (pc.contentType) {
        case "WORKSHEET": {
          const w = await prisma.worksheet.findUnique({
            where: { id: pc.contentId },
            select: { title: true, slug: true, published: true },
          });
          if (w) ({ title, slug, published } = w);
          break;
        }
        case "EBOOK": {
          const e = await prisma.eBook.findUnique({
            where: { id: pc.contentId },
            select: { title: true, slug: true, published: true },
          });
          if (e) ({ title, slug, published } = e);
          break;
        }
        case "COURSE": {
          const c = await prisma.course.findUnique({
            where: { id: pc.contentId },
            select: { title: true, slug: true, published: true },
          });
          if (c) ({ title, slug, published } = c);
          break;
        }
        case "AI_TOOL": {
          const a = await prisma.aiTool.findUnique({
            where: { id: pc.contentId },
            select: { title: true, slug: true, published: true },
          });
          if (a) ({ title, slug, published } = a);
          break;
        }
      }

      return { ...pc, title, slug, published };
    })
  );

  return NextResponse.json(enriched);
}

// POST /api/admin/projects/[id]/content — assign content to project
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAdmin();
  if (result instanceof NextResponse) return result;

  const { id } = await params;
  const body = await req.json();

  if (
    !body.contentType ||
    !VALID_CONTENT_TYPES.includes(body.contentType as ContentTypeEnum)
  ) {
    return NextResponse.json(
      { error: "Invalid contentType" },
      { status: 400 }
    );
  }
  if (!body.contentId) {
    return NextResponse.json(
      { error: "contentId is required" },
      { status: 400 }
    );
  }

  // Verify project exists
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Check for duplicate assignment
  const existing = await prisma.projectContent.findUnique({
    where: {
      projectId_contentType_contentId: {
        projectId: id,
        contentType: body.contentType as ContentTypeEnum,
        contentId: body.contentId,
      },
    },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Content already assigned to this project" },
      { status: 409 }
    );
  }

  const assignment = await prisma.projectContent.create({
    data: {
      projectId: id,
      contentType: body.contentType as ContentTypeEnum,
      contentId: body.contentId,
    },
  });

  return NextResponse.json(assignment);
}

// DELETE /api/admin/projects/[id]/content — unassign content from project
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAdmin();
  if (result instanceof NextResponse) return result;

  const { id } = await params;
  const body = await req.json();

  if (!body.contentType || !body.contentId) {
    return NextResponse.json(
      { error: "contentType and contentId are required" },
      { status: 400 }
    );
  }

  const existing = await prisma.projectContent.findUnique({
    where: {
      projectId_contentType_contentId: {
        projectId: id,
        contentType: body.contentType as ContentTypeEnum,
        contentId: body.contentId,
      },
    },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "Assignment not found" },
      { status: 404 }
    );
  }

  await prisma.projectContent.delete({ where: { id: existing.id } });
  return NextResponse.json({ success: true });
}
