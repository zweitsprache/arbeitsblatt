import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/require-auth";
import { isAdmin } from "@/lib/auth/is-admin";
import { launchBrowser } from "@/lib/puppeteer";

function getBaseUrl() {
  return process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
}

async function hideDevOverlays(
  page: Awaited<ReturnType<Awaited<ReturnType<typeof launchBrowser>>["newPage"]>>
) {
  await page.evaluate(() => {
    document
      .querySelectorAll('nextjs-portal, [id^="__next-build"], [id^="__nextjs"]')
      .forEach((el) => el.remove());
    const style = document.createElement("style");
    style.textContent =
      "nextjs-portal, [data-nextjs-dialog-overlay], [data-nextjs-toast] { display: none !important; }";
    document.head.appendChild(style);
  });
}

// POST /api/courses/[id]/block-screenshot
// Body: { blockId: string, moduleId: string, topicId: string, lessonId: string }
// Returns: PNG image of the specified block
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  if (!isAdmin(userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { blockId, moduleId, topicId, lessonId } = (await req.json()) as {
    blockId: string;
    moduleId: string;
    topicId: string;
    lessonId: string;
  };

  if (!blockId || !moduleId || !topicId || !lessonId) {
    return NextResponse.json(
      { error: "blockId, moduleId, topicId, and lessonId are required" },
      { status: 400 }
    );
  }

  // Look up the course
  const course = await prisma.course.findFirst({
    where: { id, userId },
    select: { slug: true },
  });

  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  const baseUrl = getBaseUrl();
  const lessonUrl = `${baseUrl}/de/course/${course.slug}/${moduleId}/${topicId}/${lessonId}`;

  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setViewport({
      width: 794,
      height: 1123,
      deviceScaleFactor: 2,
    });
    await page.goto(lessonUrl, { waitUntil: "networkidle0", timeout: 30000 });
    await page.evaluateHandle("document.fonts.ready");
    await new Promise((r) => setTimeout(r, 1000));
    await hideDevOverlays(page);

    // Find the block element by data-block-id
    const blockElement = await page.$(`[data-block-id="${blockId}"]`);
    if (!blockElement) {
      return NextResponse.json(
        { error: "Block not found on page" },
        { status: 404 }
      );
    }

    // Take an element-level screenshot (cropped to just this block)
    const screenshot = await blockElement.screenshot({ type: "png" });

    return new NextResponse(Buffer.from(screenshot), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="block-${blockId}.png"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[CourseBlockScreenshot] Generation failed:", err);
    return NextResponse.json(
      { error: "Screenshot generation failed" },
      { status: 500 }
    );
  } finally {
    await browser.close();
  }
}
