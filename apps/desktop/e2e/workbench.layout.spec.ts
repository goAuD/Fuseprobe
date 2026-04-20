import { expect, test } from "@playwright/test";

const VIEWPORTS = [
  { name: "default", width: 1400, height: 900 },
  { name: "compact", width: 1280, height: 720 },
  { name: "narrow", width: 1024, height: 700 },
] as const;

for (const viewport of VIEWPORTS) {
  test.describe(`workbench layout @ ${viewport.name} (${viewport.width}x${viewport.height})`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("body and headers textareas render with usable height", async ({ page }) => {
      await page.goto("/");

      const body = page.locator("#request-body");
      const headers = page.locator("#request-headers");

      await expect(body).toBeVisible();
      await expect(headers).toBeVisible();

      const bodyBox = await body.boundingBox();
      const headersBox = await headers.boundingBox();

      expect(bodyBox, "body textarea should have a layout box").not.toBeNull();
      expect(headersBox, "headers textarea should have a layout box").not.toBeNull();
      expect(bodyBox!.height).toBeGreaterThanOrEqual(110);
      expect(headersBox!.height).toBeGreaterThanOrEqual(90);
    });

    test("request panel does not overflow horizontally", async ({ page }) => {
      await page.goto("/");

      const horizontalOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth - document.documentElement.clientWidth;
      });

      expect(horizontalOverflow).toBeLessThanOrEqual(1);
    });

    test("editor-input honors explicit height after layout", async ({ page }) => {
      // Proxy for the resize grip: browsers implement `resize: vertical` by
      // setting inline `height` on drag. Previous bug was a flex:1 override
      // with flex-basis:0 that discarded that inline height.
      await page.goto("/");

      const body = page.locator("#request-body");
      await expect(body).toBeVisible();

      const beforeHeight = await body.evaluate((el) => el.getBoundingClientRect().height);

      await body.evaluate((el) => {
        const target = el as HTMLTextAreaElement;
        target.style.height = `${target.getBoundingClientRect().height + 120}px`;
      });

      const afterHeight = await body.evaluate((el) => el.getBoundingClientRect().height);

      expect(afterHeight).toBeGreaterThan(beforeHeight + 60);
    });
  });
}
