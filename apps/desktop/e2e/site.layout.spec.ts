import { expect, test } from "@playwright/test";

/**
 * Layout guards for the GitHub Pages landing page in `site/`.
 *
 * This lives under the desktop app's e2e folder because that is where the only
 * Playwright runner is, and the `Frontend E2E` CI job already executes it. The
 * page under test is a single static file with no build step, so it is loaded
 * over file:// and the config's baseURL does not apply.
 *
 * Every assertion here exists because the corresponding bug shipped once:
 *
 *  - `.hero` and `.shot` set the `padding` shorthand while also carrying
 *    `.wrap`, which zeroed the horizontal padding that keeps content off the
 *    screen edge, so those two sections ran edge to edge while the rest stayed
 *    inset.
 *  - A bare `nav.site a` rule outranked `.btn-primary` and repainted the header
 *    button's label, leaving it unreadable on the accent background.
 *  - Footer and nav links sat at 20px tall, below the WCAG 2.5.8 minimum.
 *  - `repeat(auto-fit, minmax(19rem, 1fr))` kept demanding its minimum in a
 *    narrower container and pushed the page sideways at the 320px floor.
 *
 * All four were invisible when reading the diff and obvious in a render.
 */

const SITE_URL = new URL("../../../site/index.html", import.meta.url).href;

/** One element per major section, each of which must start at the same offset. */
const SECTION_EDGES = [
  { name: "header logo", selector: ".logo" },
  { name: "hero heading", selector: ".hero h1" },
  { name: "screenshot figure", selector: ".shot figure" },
  { name: "security defaults", selector: "#security .defaults" },
  { name: "footer legal", selector: ".foot-legal" },
] as const;

const WIDTHS = [
  { name: "floor", width: 320, height: 700 },
  { name: "phone", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
] as const;

/** The declared layout floor. Below this the viewport scrolls, by design. */
const MIN_WIDTH = 320;

/** WCAG 2.5.8 target size minimum. Links inside running prose are exempt. */
const MIN_TAP_TARGET = 24;

for (const viewport of WIDTHS) {
  test.describe(`site layout @ ${viewport.name} (${viewport.width}x${viewport.height})`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("every section starts at the same horizontal offset", async ({ page }) => {
      await page.goto(SITE_URL);

      const edges: { name: string; left: number }[] = [];
      for (const { name, selector } of SECTION_EDGES) {
        const box = await page.locator(selector).first().boundingBox();
        expect(box, `${name} should have a layout box`).not.toBeNull();
        edges.push({ name, left: Math.round(box!.x) });
      }

      const reference = edges[0]!.left;
      expect(reference, "content should be inset from the screen edge").toBeGreaterThan(0);
      for (const edge of edges) {
        expect(
          edge.left,
          `${edge.name} should align with ${edges[0]!.name} at ${reference}px`,
        ).toBe(reference);
      }
    });

    test("nothing overflows the viewport horizontally", async ({ page }) => {
      await page.goto(SITE_URL);

      const overflow = await page.evaluate(() => {
        const root = document.documentElement;
        const limit = root.clientWidth;
        const offenders = [...document.querySelectorAll<HTMLElement>("body *")]
          // The screenshot is deliberately wider than a phone and pans inside
          // its own scroll container, which does not move the document.
          .filter((el) => !el.closest(".shot-scroll"))
          .filter((el) => el.getBoundingClientRect().right > limit + 0.5)
          .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).trim().split(/\s+/)[0]}`);

        return {
          documentScrolls: root.scrollWidth > root.clientWidth,
          offenders: [...new Set(offenders)],
        };
      });

      expect(overflow.offenders, "no element may extend past the viewport").toEqual([]);
      expect(overflow.documentScrolls, "the page must not scroll sideways").toBe(false);
    });

    test("interactive targets outside prose are tall enough to tap", async ({ page }) => {
      await page.goto(SITE_URL);

      const tooSmall = await page.evaluate((minimum) => {
        return [...document.querySelectorAll<HTMLElement>("a")]
          // Links inside running text fall under the WCAG inline exception.
          .filter((el) => !el.closest("p, li"))
          .map((el) => ({ text: (el.textContent ?? "").trim(), height: el.getBoundingClientRect().height }))
          .filter((entry) => entry.height > 0 && entry.height < minimum);
      }, MIN_TAP_TARGET);

      expect(tooSmall, `every target should be at least ${MIN_TAP_TARGET}px tall`).toEqual([]);
    });
  });
}

test.describe("site layout guards independent of viewport width", () => {
  test("the header action keeps its own colours", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(SITE_URL);

    const action = page.locator("nav.site .btn-primary");
    await expect(action).toBeVisible();

    const painted = await action.evaluate((el) => {
      const style = getComputedStyle(el);
      return { color: style.color, background: style.backgroundColor };
    });

    // Near black label on the accent. A nav-scoped rule winning here is what
    // previously left this button reading as a blank green rectangle.
    expect(painted.color).toBe("rgb(4, 18, 12)");
    expect(painted.background).toBe("rgb(0, 255, 153)");
  });

  test("the layout stops compressing below the declared floor", async ({ page }) => {
    await page.setViewportSize({ width: 280, height: 700 });
    await page.goto(SITE_URL);

    const measured = await page.evaluate(() => ({
      bodyWidth: Math.round(document.body.getBoundingClientRect().width),
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));

    expect(measured.bodyWidth, "body should hold at the floor").toBe(MIN_WIDTH);
    expect(
      measured.scrollWidth,
      "the viewport should scroll rather than the layout shrinking further",
    ).toBeGreaterThan(measured.clientWidth);
  });
});
