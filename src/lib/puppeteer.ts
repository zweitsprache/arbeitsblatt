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

  // Filter out --headless='shell' from chromium.args — the old headless mode
  // does NOT support Page.printToPDF in Chrome 143+. We let puppeteer set
  // --headless=new via the headless option instead.
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
    executablePath: isProduction
      ? await chromium.executablePath(CHROMIUM_PACK_URL)
      : process.platform === "darwin"
        ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        : process.platform === "win32"
          ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
          : "/usr/bin/google-chrome",
    headless: true,
  });
}
