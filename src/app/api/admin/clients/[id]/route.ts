import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { normalizeClientSubdomain } from "@/lib/client-subdomain";

// GET /api/admin/clients/[id] — get client with projects
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAdmin();
  if (result instanceof NextResponse) return result;

  const { id } = await params;
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      projects: {
        orderBy: { updatedAt: "desc" },
        include: { _count: { select: { contents: true } } },
      },
    },
  });

  if (!client) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(client);
}

// PUT /api/admin/clients/[id] — update client
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAdmin();
  if (result instanceof NextResponse) return result;

  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.client.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const normalizedSlug =
    body.slug !== undefined ? normalizeClientSubdomain(String(body.slug)) : undefined;

  if (body.slug !== undefined && !normalizedSlug) {
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }

  if (normalizedSlug && normalizedSlug !== existing.slug) {
    const slugOwner = await prisma.client.findUnique({ where: { slug: normalizedSlug } });
    if (slugOwner && slugOwner.id !== id) {
      return NextResponse.json({ error: "slug already in use" }, { status: 409 });
    }
  }

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (normalizedSlug !== undefined) data.slug = normalizedSlug;
  if (body.brandSettings !== undefined) data.brandSettings = body.brandSettings;

  const client = await prisma.client.update({ where: { id }, data });
  return NextResponse.json(client);
}

// DELETE /api/admin/clients/[id] — delete client (cascades to projects + content assignments)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAdmin();
  if (result instanceof NextResponse) return result;

  const { id } = await params;
  const existing = await prisma.client.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.client.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
