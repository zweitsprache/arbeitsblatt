import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

/**
 * Launch a headless Chrome browser.
 * - On Vercel / AWS Lambda: uses @sparticuz/chromium bundled binary
 * - Locally: uses the system Chrome installation
 */
export async function launchBrowser() {
  const isProduction = process.env.NODE_ENV === "production";

  return puppeteer.launch({
    args: isProduction
      ? chromium.args
      : [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--font-render-hinting=none",
        ],
    executablePath: isProduction
      ? await chromium.executablePath()
      : process.platform === "darwin"
        ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        : process.platform === "win32"
          ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
          : "/usr/bin/google-chrome",
    headless: true,
  });
}
