import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { launchBrowser } from "@/lib/puppeteer";

type BrowserPage = Awaited<ReturnType<Awaited<ReturnType<typeof launchBrowser>>["newPage"]>>;

function normalizeExternalUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^[a-z]+:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function shouldBlockRequest(requestUrl: string): boolean {
  const lower = requestUrl.toLowerCase();
  const blockedSubstrings = [
    "cookielaw",
    "cookiebot",
    "consentmanager",
    "consentcdn",
    "didomi",
    "onetrust",
    "trustarc",
    "usercentrics",
    "quantcast.mgr.consensu",
  ];

  return blockedSubstrings.some((part) => lower.includes(part));
}

async function clickConsentButtons(page: BrowserPage) {
  await page.evaluate(() => {
    const acceptTokens = [
      "accept",
      "accept all",
      "allow all",
      "agree",
      "i agree",
      "ok",
      "got it",
      "zustimmen",
      "alle akzeptieren",
      "akzeptieren",
      "einverstanden",
      "tout accepter",
      "accepter",
      "accetta",
      "aceptar",
    ];

    const candidates = Array.from(
      document.querySelectorAll<HTMLElement>(
        "button, a[role='button'], [role='button'], input[type='button'], input[type='submit']"
      )
    );

    for (const element of candidates) {
      const text = (
        (element.textContent || "") +
        " " +
        (element.getAttribute("aria-label") || "") +
        " " +
        (element.getAttribute("value") || "")
      )
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();

      if (!text) continue;
      if (!acceptTokens.some((token) => text.includes(token))) continue;

      const style = window.getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden") continue;

      element.click();
    }
  });
}

async function removeConsentOverlays(page: BrowserPage) {
  await page.evaluate(() => {
    const selectors = [
      "#CybotCookiebotDialog",
      "#didomi-host",
      "#onetrust-banner-sdk",
      "#onetrust-consent-sdk",
      "#sp_message_container_1258309",
      "#usercentrics-root",
      "[aria-label*='cookie' i]",
      "[class*='consent' i]",
      "[class*='cookie' i]",
      "[id*='consent' i]",
      "[id*='cookie' i]",
    ];

    for (const selector of selectors) {
      document.querySelectorAll(selector).forEach((node) => node.remove());
    }

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const allNodes = Array.from(document.body.querySelectorAll<HTMLElement>("*"));
    for (const element of allNodes) {
      const style = window.getComputedStyle(element);
      const position = style.position;
      if (position !== "fixed" && position !== "sticky") continue;

      const z = Number.parseInt(style.zIndex || "0", 10);
      if (!Number.isFinite(z) || z < 999) continue;

      const rect = element.getBoundingClientRect();
      const area = Math.max(0, rect.width) * Math.max(0, rect.height);
      if (area < vw * vh * 0.18) continue;

      element.remove();
    }

    document.documentElement.style.overflow = "auto";
    document.body.style.overflow = "auto";
  });
}

// POST /api/website-screenshot
// Body: { url: string }
// Returns: PNG (16:9 viewport screenshot)
export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { url } = (await req.json()) as { url?: string };
  const targetUrl = normalizeExternalUrl(url || "");

  if (!targetUrl) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    const viewport = { width: 1600, height: 900, deviceScaleFactor: 1 };
    await page.setViewport(viewport);

    await page.setRequestInterception(true);
    page.on("request", (request) => {
      const requestUrl = request.url();
      if (shouldBlockRequest(requestUrl)) {
        request.abort();
        return;
      }
      request.continue();
    });

    const navigationResponse = await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForNetworkIdle({ idleTime: 700, timeout: 12000 }).catch(() => {});

    await clickConsentButtons(page);
    await new Promise((resolve) => setTimeout(resolve, 350));
    await removeConsentOverlays(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Detect whether the site likely blocked the headless browser.
    const httpStatus = navigationResponse?.status() ?? 200;
    const pageTitle = await page.title().catch(() => "");
    const blockedTitlePatterns = /access denied|denied|captcha|robot|are you human|just a moment|checking your browser|cloudflare|ddos|verify you are|human verification|security check|attention required|please enable javascript/i;
    const isBlocked =
      httpStatus >= 400 ||
      blockedTitlePatterns.test(pageTitle);

    const screenshot = await page.screenshot({
      type: "png",
      clip: { x: 0, y: 0, width: viewport.width, height: viewport.height },
    });

    return new NextResponse(Buffer.from(screenshot), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
        "x-screenshot-blocked": isBlocked ? "1" : "0",
        "x-screenshot-http-status": String(httpStatus),
        "x-screenshot-page-title": pageTitle.slice(0, 200),
      },
    });
  } catch (error) {
    console.error("[WebsiteScreenshot] Generation failed:", error);
    return NextResponse.json({ error: "Screenshot generation failed" }, { status: 500 });
  } finally {
    await browser.close();
  }
}