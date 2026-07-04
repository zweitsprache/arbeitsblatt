import { test, expect, type Locator } from "@playwright/test";

const locale = process.env.PLAYWRIGHT_LOCALE || "de";
const targetHeadingText = "In meiner Wohnung";

async function pulseFocus(
  locator: Locator,
  holdMs = 700,
  scale = 1.08,
  padding: number | { x: number; top: number; bottom: number } = 14
) {
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error("Could not resolve highlight box bounds.");
  }

  const page = locator.page();
  const overlayPadding =
    typeof padding === "number"
      ? { x: padding, top: padding, bottom: padding }
      : padding;
  const overlayId = `pw-highlight-${Date.now()}`;

  await page.evaluate(
    ({ id, boxModel, nextScale, gap }: { id: string; boxModel: { x: number; y: number; width: number; height: number }; nextScale: number; gap: { x: number; top: number; bottom: number } }) => {
      const overlay = document.createElement("div");
      overlay.id = id;
      overlay.style.position = "fixed";
      overlay.style.left = `${boxModel.x - gap.x}px`;
      overlay.style.top = `${boxModel.y - gap.top}px`;
      overlay.style.width = `${boxModel.width + gap.x * 2}px`;
      overlay.style.height = `${boxModel.height + gap.top + gap.bottom}px`;
      overlay.style.borderRadius = "14px";
      overlay.style.border = "2px solid rgba(37, 99, 235, 0.95)";
      overlay.style.boxShadow = "0 0 0 8px rgba(37, 99, 235, 0.12), 0 18px 45px rgba(15, 23, 42, 0.18)";
      overlay.style.pointerEvents = "none";
      overlay.style.zIndex = "999999";
      overlay.style.transition = "transform 240ms ease, opacity 240ms ease";
      overlay.style.transformOrigin = "center center";
      overlay.style.transform = `scale(${nextScale})`;
      overlay.style.opacity = "1";
      document.body.appendChild(overlay);
    },
    { id: overlayId, boxModel: box, nextScale: scale, gap: overlayPadding }
  );

  await page.waitForTimeout(holdMs);
  await page.evaluate((id: string) => document.getElementById(id)?.remove(), overlayId);
}

test.describe("tutorial recording", () => {
  test.setTimeout(60_000);

  test("create worksheet and edit heading", async ({ page }) => {
    await page.goto(`/${locale}`);
    await page.waitForLoadState("networkidle");

    await expect(page).not.toHaveURL(new RegExp(`/auth/sign-in$`));

    const newWorksheetButton = page
      .getByRole("main")
      .getByRole("link", { name: /neues arbeitsblatt|new worksheet/i })
      .first();
    await expect(newWorksheetButton).toBeVisible();
    await page.waitForTimeout(900);
    const editorHref = await newWorksheetButton.getAttribute("href");
    await newWorksheetButton.click();

    try {
      await page.waitForURL(new RegExp(`/${locale}/editor(?:$|\\?)`), {
        timeout: 3000,
      });
    } catch {
      if (!editorHref) {
        throw new Error("Could not resolve editor link href.");
      }
      await page.goto(editorHref, { waitUntil: "domcontentloaded" });
      await page.waitForURL(new RegExp(`/${locale}/editor(?:$|\\?)`), {
        timeout: 30000,
      });
    }
    await page.waitForLoadState("networkidle");

    const headingLibraryItem = page.getByRole("button", {
      name: /überschrift titel und überschriften hinzufügen/i,
    });
    const emptyCanvas = page.locator(".editor-canvas");

    await expect(headingLibraryItem).toBeVisible();
    await expect(emptyCanvas).toBeVisible();
  await pulseFocus(headingLibraryItem, 850, 1.1);
    await page.waitForTimeout(700);

    const sourceBox = await headingLibraryItem.boundingBox();
    const targetBox = await emptyCanvas.boundingBox();

    if (!sourceBox || !targetBox) {
      throw new Error("Could not resolve drag source or target for heading block.");
    }

    await page.mouse.move(
      sourceBox.x + sourceBox.width / 2,
      sourceBox.y + sourceBox.height / 2
    );
    await page.waitForTimeout(250);
    await page.mouse.down();
    await page.mouse.move(
      targetBox.x + targetBox.width / 2,
      targetBox.y + Math.min(220, targetBox.height / 2),
      { steps: 40 }
    );
    await page.waitForTimeout(250);
    await page.mouse.up();
    await page.waitForTimeout(1400);

    const headingOnCanvas = page.getByRole("heading", { name: "Heading" }).first();
    await expect(headingOnCanvas).toBeVisible();
    await pulseFocus(headingOnCanvas, 850, 1.08, { x: 14, top: 26, bottom: 28 });

    const contentInput = page.getByRole("textbox").last();
    await expect(contentInput).toBeVisible();
    await pulseFocus(contentInput, 950, 1.08);
    await page.waitForTimeout(350);
    await contentInput.click();
    await contentInput.press("Meta+A");
    await contentInput.press("Backspace");
    await contentInput.pressSequentially(targetHeadingText, { delay: 110 });
    await page.waitForTimeout(900);

    const levelTrigger = page.locator("button[role='combobox']").filter({ hasText: /überschrift 1|heading 1/i }).first();
    await page.waitForTimeout(400);
    await levelTrigger.click();
    await page.waitForTimeout(450);
    await page.getByRole("option", { name: /überschrift 2|heading 2/i }).click();
    await page.waitForTimeout(1100);

    await expect(page.getByRole("heading", { name: targetHeadingText, level: 2 }).first()).toBeVisible();
    await page.mouse.move(1450, 220, { steps: 18 });
    await page.waitForTimeout(1500);
  });
});