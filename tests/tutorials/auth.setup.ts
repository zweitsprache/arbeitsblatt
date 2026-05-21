import { test as setup, expect } from "@playwright/test";

const authFile = "playwright/.auth/user.json";
const locale = process.env.PLAYWRIGHT_LOCALE || "de";
const email = process.env.PLAYWRIGHT_EMAIL;
const password = process.env.PLAYWRIGHT_PASSWORD;

setup("authenticate tutorial recorder", async ({ page }) => {
  if (!email || !password) {
    throw new Error(
      "Missing PLAYWRIGHT_EMAIL or PLAYWRIGHT_PASSWORD environment variables."
    );
  }

  await page.goto(`/${locale}/auth/sign-in`);

  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);

  const submitButton = page
    .getByRole("button", { name: /login|sign in|anmelden|weiter/i })
    .first();

  await submitButton.click();
  await page.waitForTimeout(2000);
  await page.goto(`/${locale}/account/settings`, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(new RegExp(`/${locale}/account/settings$`));
  await page.context().storageState({ path: authFile });
});