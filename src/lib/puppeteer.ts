import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium-min";

// Remote URL for the chromium binary (must match the installed @sparticuz/chromium-min version)
const CHROMIUM_PACK_URL =
  "https://github.com/Sparticuz/chromium/releases/download/v143.0.4/chromium-v143.0.4-pack.x64.tar";

/**
 * Launch a headless Chrome browser.
 * - On Vercel / AWS Lambda: downloads chromium binary from GitHub releases
 * - Locally: uses the system Chrome installation
 */
export async function launchBrowser() {
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    chromium.setGraphicsMode = false;
  }

  // chromium.args includes --headless='shell' with LITERAL single quotes.
  // When passed directly as process args (not through a shell), Chrome receives
  // the actual quote characters, which it doesn't understand. We strip that flag
  // and let puppeteer set the correct --headless=shell via { headless: "shell" }.
  const prodArgs = isProduction
    ? chromium.args.filter((arg: string) => !arg.startsWith("--headless"))
    : [];

  return puppeteer.launch({
    args: isProduction
      ? prodArgs
      : [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--font-render-hinting=none",
        ],
    defaultViewport: { width: 1920, height: 1080 },
    executablePath: isProduction
      ? await chromium.executablePath(CHROMIUM_PACK_URL)
      : process.platform === "darwin"
        ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        : process.platform === "win32"
          ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
          : "/usr/bin/google-chrome",
    headless: "shell" as const,
  });
}

/**
 * Fetch an image URL and return it as a data URI (base64-encoded).
 * Returns empty string on failure so the card renders without the image.
 * Used to inline external images into HTML before passing to `page.setContent()`
 * — headless Chrome on Vercel Lambda cannot reliably fetch external URLs.
 */
export async function fetchImageAsDataUri(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15_000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[fetchImageAsDataUri] HTTP ${response.status} for ${url}`);
      return "";
    }

    const contentType = response.headers.get("content-type") || "image/png";
    const buffer = Buffer.from(await response.arrayBuffer());
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch (error) {
    console.warn(
      `[fetchImageAsDataUri] Error: ${url}`,
      error instanceof Error ? error.message : error
    );
    return "";
  }
}
