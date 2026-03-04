import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";
import { requireAdmin } from "@/lib/auth/require-admin";

// GET /api/admin/projects — list all projects with client name + content count
export async function GET() {
  const result = await requireAdmin();
  if (result instanceof NextResponse) return result;

  const projects = await prisma.project.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      client: { select: { id: true, name: true, slug: true } },
      _count: { select: { contents: true } },
    },
  });

  return NextResponse.json(projects);
}

// POST /api/admin/projects — create a new project
export async function POST(req: NextRequest) {
  const result = await requireAdmin();
  if (result instanceof NextResponse) return result;

  const body = await req.json();

  if (!body.clientId) {
    return NextResponse.json(
      { error: "clientId is required" },
      { status: 400 }
    );
  }

  // Verify client exists
  const client = await prisma.client.findUnique({
    where: { id: body.clientId },
  });
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const slug = body.slug || nanoid(10);

  const project = await prisma.project.create({
    data: {
      name: body.name || "New Project",
      slug,
      clientId: body.clientId,
      domain: body.domain || null,
      settings: body.settings || {},
    },
    include: {
      client: { select: { id: true, name: true, slug: true } },
    },
  });

  return NextResponse.json(project);
}
