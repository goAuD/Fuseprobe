"""Render scripts/social-card.html into assets/fuseprobe_social.png.

    python scripts/render_social_card.py

The output is the GitHub social preview and the og:image the landing page points
at. GitHub asks for 1280x640 and crops anything else, so that is what this
produces.

It renders at twice that and downsamples, which is the cheapest way to get clean
type: the browser's own antialiasing at 1x leaves the mono text looking thin at
the sizes social platforms display these at.

Uses the Playwright browser the desktop app's e2e suite already installs, so
there is no separate dependency to manage:

    npm --prefix apps/desktop exec playwright install chromium
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "scripts" / "social-card.html"
TARGET = ROOT / "assets" / "fuseprobe_social.png"
WIDTH, HEIGHT, SCALE = 1280, 640, 2

RENDER_SCRIPT = """
import {{ chromium }} from '@playwright/test';
const browser = await chromium.launch();
const page = await browser.newPage({{
  viewport: {{ width: {width}, height: {height} }},
  deviceScaleFactor: {scale},
}});
await page.goto({source!r});
// Webfonts arrive after load, and a screenshot taken before they land silently
// falls back to a system face.
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(600);
await page.screenshot({{ path: {target!r} }});
await browser.close();
"""


def main() -> int:
    if not SOURCE.exists():
        sys.exit(f"missing source: {SOURCE}")

    desktop = ROOT / "apps" / "desktop"
    script = desktop / ".render-social.mjs"
    script.write_text(
        RENDER_SCRIPT.format(
            width=WIDTH,
            height=HEIGHT,
            scale=SCALE,
            source=SOURCE.as_uri(),
            target=str(TARGET).replace("\\", "/"),
        ),
        encoding="utf-8",
    )

    try:
        result = subprocess.run(["node", str(script)], cwd=desktop, capture_output=True, text=True)
        if result.returncode != 0:
            print(result.stdout, result.stderr, sep="\n")
            return result.returncode
    finally:
        script.unlink(missing_ok=True)

    try:
        from PIL import Image
    except ImportError:
        print(f"rendered {TARGET.name} at {WIDTH * SCALE}x{HEIGHT * SCALE}; install pillow to downsample")
        return 0

    with Image.open(TARGET) as image:
        image.convert("RGB").resize((WIDTH, HEIGHT), Image.LANCZOS).save(
            TARGET, "PNG", optimize=True
        )

    size_kb = TARGET.stat().st_size / 1024
    print(f"wrote {TARGET.relative_to(ROOT).as_posix()}  {WIDTH}x{HEIGHT}  {size_kb:.0f} KB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
