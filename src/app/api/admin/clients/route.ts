import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";
import { requireAdmin } from "@/lib/auth/require-admin";
import { DEFAULT_BRAND_SETTINGS } from "@/types/project";

// GET /api/admin/clients — list all clients with project count
export async function GET() {
  const result = await requireAdmin();
  if (result instanceof NextResponse) return result;

  try {
    const clients = await prisma.client.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { projects: true } },
      },
    });

    return NextResponse.json(clients);
  } catch (err) {
    console.error("GET /api/admin/clients error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST /api/admin/clients — create a new client
export async function POST(req: NextRequest) {
  const result = await requireAdmin();
  if (result instanceof NextResponse) return result;

  const body = await req.json();
  const slug = nanoid(10);

  const client = await prisma.client.create({
    data: {
      name: body.name || "New Client",
      slug,
      brandSettings: body.brandSettings || DEFAULT_BRAND_SETTINGS,
    },
  });

  return NextResponse.json(client);
}
