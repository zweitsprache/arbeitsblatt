import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";
import { DEFAULT_COURSE_SETTINGS, DEFAULT_COURSE_COVER_SETTINGS } from "@/types/course";
import { requireAuth } from "@/lib/auth/require-auth";

// GET /api/courses — list courses (optionally filtered by folderId or search)
export async function GET(req: NextRequest) {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  const folderId = req.nextUrl.searchParams.get("folderId");
  const search = req.nextUrl.searchParams.get("search");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { userId };

  if (search) {
    where.title = { contains: search, mode: "insensitive" };
  } else if (folderId === "root") {
    where.folderId = null;
  } else if (folderId) {
    where.folderId = folderId;
  }

  const courses = await prisma.course.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      published: true,
      structure: true,
      coverSettings: true,
      settings: true,
      folderId: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return NextResponse.json(courses);
}

// POST /api/courses — create a new course
export async function POST(req: NextRequest) {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  const body = await req.json();
  const slug = nanoid(10);

  const course = await prisma.course.create({
    data: {
      title: body.title || "Untitled Course",
      slug,
      structure: body.structure || [],
      coverSettings: body.coverSettings || DEFAULT_COURSE_COVER_SETTINGS,
      settings: body.settings || DEFAULT_COURSE_SETTINGS,
      published: body.published || false,
      folderId: body.folderId || null,
      userId,
    },
  });

  return NextResponse.json({
    id: course.id,
    title: course.title,
    slug: course.slug,
    structure: course.structure,
    coverSettings: course.coverSettings,
    settings: course.settings,
    published: course.published,
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
  });
}
