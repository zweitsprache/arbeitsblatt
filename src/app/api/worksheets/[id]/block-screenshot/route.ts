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

// POST /api/worksheets/[id]/block-screenshot
// Body: { blockId: string }
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
  const { blockId } = (await req.json()) as { blockId: string };

  if (!blockId) {
    return NextResponse.json({ error: "blockId is required" }, { status: 400 });
  }

  // Look up the worksheet
  const worksheet = await prisma.worksheet.findFirst({
    where: { id, userId },
    select: { slug: true, settings: true },
  });

  if (!worksheet) {
    return NextResponse.json({ error: "Worksheet not found" }, { status: 404 });
  }

  const settings = (worksheet.settings as Record<string, unknown>) || {};
  const isLandscape = settings.orientation === "landscape";
  const baseUrl = getBaseUrl();
  const printUrl = `${baseUrl}/de/worksheet/${worksheet.slug}/print`;

  // Viewport matching A4 proportions
  const viewportW = 794;
  const viewportH = isLandscape
    ? Math.round(viewportW * (210 / 297))
    : Math.round(viewportW * (297 / 210));

  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setViewport({
      width: viewportW,
      height: viewportH,
      deviceScaleFactor: 2,
    });
    await page.goto(printUrl, { waitUntil: "networkidle0", timeout: 30000 });
    await page.evaluateHandle("document.fonts.ready");
    await new Promise((r) => setTimeout(r, 500));
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
    console.error("[BlockScreenshot] Generation failed:", err);
    return NextResponse.json(
      { error: "Screenshot generation failed" },
      { status: 500 }
    );
  } finally {
    await browser.close();
  }
}
