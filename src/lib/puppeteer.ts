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
