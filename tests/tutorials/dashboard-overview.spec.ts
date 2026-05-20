import { test, expect } from "@playwright/test";

const locale = process.env.PLAYWRIGHT_LOCALE || "de";
const targetHeadingText = "In meiner Wohnung2";

test.describe("tutorial recording", () => {
  test("create worksheet and edit heading", async ({ page }) => {
    await page.goto(`/${locale}/worksheets`);
    await page.waitForLoadState("networkidle");

    await expect(page).not.toHaveURL(new RegExp(`/auth/sign-in$`));

    const newWorksheetButton = page.getByRole("button", {
      name: /neues arbeitsblatt|new worksheet/i,
    });
    await expect(newWorksheetButton).toBeVisible();
    await newWorksheetButton.click();

    await page.waitForURL(new RegExp(`/${locale}/editor(?:$|\?)`), {
      timeout: 30000,
    });
    await page.waitForLoadState("networkidle");

    const headingLibraryItem = page
      .locator("div")
      .filter({ hasText: /^Überschrift$/ })
      .first();
    const emptyCanvas = page.locator(".editor-canvas");

    await expect(headingLibraryItem).toBeVisible();
    await expect(emptyCanvas).toBeVisible();

    const sourceBox = await headingLibraryItem.boundingBox();
    const targetBox = await emptyCanvas.boundingBox();

    if (!sourceBox || !targetBox) {
      throw new Error("Could not resolve drag source or target for heading block.");
    }

    await page.mouse.move(
      sourceBox.x + sourceBox.width / 2,
      sourceBox.y + sourceBox.height / 2
    );
    await page.mouse.down();
    await page.mouse.move(
      targetBox.x + targetBox.width / 2,
      targetBox.y + Math.min(220, targetBox.height / 2),
      { steps: 24 }
    );
    await page.mouse.up();
    await page.waitForTimeout(900);

    const headingOnCanvas = page.getByRole("heading", { name: "Heading" }).first();
    await expect(headingOnCanvas).toBeVisible();
    await headingOnCanvas.click();

    const contentInput = page.locator('input[value="Heading"]').first();
    await expect(contentInput).toBeVisible();
    await contentInput.fill(targetHeadingText);
    await page.waitForTimeout(500);

    const levelTrigger = page.locator("button[role='combobox']").filter({ hasText: /überschrift 1|heading 1/i }).first();
    await levelTrigger.click();
    await page.getByRole("option", { name: /überschrift 2|heading 2/i }).click();
    await page.waitForTimeout(700);

    await expect(page.getByRole("heading", { name: targetHeadingText, level: 2 }).first()).toBeVisible();
    await page.mouse.move(1180, 180);
    await page.waitForTimeout(1000);
  });
});