import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ path: ".env.playwright.local" });
dotenv.config({ path: ".env.local", override: false });

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/tutorials",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: {
      mode: "on",
      size: { width: 1920, height: 1080 },
    },
    viewport: { width: 1920, height: 1080 },
    launchOptions: {
      slowMo: Number(process.env.PLAYWRIGHT_SLOWMO || 225),
      args: ["--window-size=1920,1080"],
    },
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1920, height: 1080 },
        storageState: "playwright/.auth/user.json",
      },
    },
  ],
  outputDir: "recordings/playwright",
});