"""Capture a single window on Windows without the desktop compositor touching it.

Screen grabbers, the Snipping Tool included, read the composited desktop. By that
point Auto Color Management or HDR tone mapping has already been applied, which
visibly lifts a dark surface like Fuseprobe's #0B0F12. They also pick up whatever
happens to overlap the window, and the drop shadow around it.

PrintWindow asks DWM for the window's own rendering instead, so none of that
applies: no tone mapping, nothing else in frame, no shadow bleed.

Requires pywin32 and Pillow, both of which are already installed here:

    python -m pip install pywin32 pillow

Usage:

    python scripts/capture_window.py --list
    python scripts/capture_window.py --title Fuseprobe --out assets/fuseprobe.png
"""

from __future__ import annotations

import argparse
import ctypes
import sys
from ctypes import wintypes

# Window titles are frequently not ASCII. Without this, printing the listing dies
# or mangles on a console still running a legacy code page.
for stream in (sys.stdout, sys.stderr):
    try:
        stream.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, OSError):
        pass

try:
    import win32gui
    import win32ui
    from PIL import Image
except ImportError as exc:  # pragma: no cover
    sys.exit(f"missing dependency: {exc}. run: python -m pip install pywin32 pillow")

# Without this flag PrintWindow returns a blank client area for windows that draw
# through a child surface, which is exactly what Tauri's WebView2 does.
PW_RENDERFULLCONTENT = 0x00000002

# GetWindowRect on Windows 10 and 11 includes an invisible resize border roughly
# 7px wide. This attribute reports the bounds the user actually sees.
DWMWA_EXTENDED_FRAME_BOUNDS = 9


def make_dpi_aware() -> None:
    """Capture real pixels rather than a scaled approximation.

    On a display at anything other than 100%, a DPI unaware process is handed
    virtualised coordinates and the result comes back soft.
    """
    user32 = ctypes.windll.user32
    try:
        # -4 is DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2.
        if user32.SetProcessDpiAwarenessContext(ctypes.c_void_p(-4)):
            return
    except (AttributeError, OSError):
        pass
    try:
        ctypes.windll.shcore.SetProcessDpiAwareness(2)  # PROCESS_PER_MONITOR_DPI_AWARE
        return
    except (AttributeError, OSError):
        pass
    user32.SetProcessDPIAware()


def visible_windows() -> list[tuple[int, str]]:
    found: list[tuple[int, str]] = []

    def collect(hwnd: int, _) -> bool:
        if not win32gui.IsWindowVisible(hwnd):
            return True
        title = win32gui.GetWindowText(hwnd)
        if title.strip():
            found.append((hwnd, title))
        return True

    win32gui.EnumWindows(collect, None)
    return found


def find_window(needle: str) -> int:
    matches = [(h, t) for h, t in visible_windows() if needle.lower() in t.lower()]
    if not matches:
        sys.exit(f"no visible window matching {needle!r}. run with --list to see candidates.")
    if len(matches) > 1:
        listing = "\n".join(f"  {h}  {t}" for h, t in matches)
        sys.exit(f"{needle!r} matches {len(matches)} windows, be more specific:\n{listing}")
    return matches[0][0]


def extended_frame(hwnd: int) -> tuple[int, int, int, int] | None:
    rect = wintypes.RECT()
    status = ctypes.windll.dwmapi.DwmGetWindowAttribute(
        wintypes.HWND(hwnd),
        ctypes.c_uint(DWMWA_EXTENDED_FRAME_BOUNDS),
        ctypes.byref(rect),
        ctypes.sizeof(rect),
    )
    if status != 0:
        return None
    return rect.left, rect.top, rect.right, rect.bottom


def capture(hwnd: int) -> Image.Image:
    left, top, right, bottom = win32gui.GetWindowRect(hwnd)
    width, height = right - left, bottom - top
    if width <= 0 or height <= 0:
        sys.exit("window reports a zero size, is it minimised?")

    window_dc = win32gui.GetWindowDC(hwnd)
    src_dc = win32ui.CreateDCFromHandle(window_dc)
    mem_dc = src_dc.CreateCompatibleDC()
    bitmap = win32ui.CreateBitmap()
    bitmap.CreateCompatibleBitmap(src_dc, width, height)
    mem_dc.SelectObject(bitmap)

    try:
        ok = ctypes.windll.user32.PrintWindow(hwnd, mem_dc.GetSafeHdc(), PW_RENDERFULLCONTENT)
        if not ok:
            sys.exit("PrintWindow refused. the window may be elevated, try running as admin.")
        info = bitmap.GetInfo()
        image = Image.frombuffer(
            "RGB",
            (info["bmWidth"], info["bmHeight"]),
            bitmap.GetBitmapBits(True),
            "raw",
            "BGRX",
            0,
            1,
        )
    finally:
        win32gui.DeleteObject(bitmap.GetHandle())
        mem_dc.DeleteDC()
        src_dc.DeleteDC()
        win32gui.ReleaseDC(hwnd, window_dc)

    frame = extended_frame(hwnd)
    if frame:
        box = (frame[0] - left, frame[1] - top, frame[2] - left, frame[3] - top)
        # Guard against a frame report that does not sit inside the captured area.
        if box[0] >= 0 and box[1] >= 0 and box[2] <= image.width and box[3] <= image.height:
            image = image.crop(box)

    return image


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--title", default="Fuseprobe", help="substring of the window title (default: Fuseprobe)")
    parser.add_argument("--out", default="assets/fuseprobe.png", help="output path (default: assets/fuseprobe.png)")
    parser.add_argument("--list", action="store_true", help="list visible windows and exit")
    args = parser.parse_args()

    make_dpi_aware()

    if args.list:
        for hwnd, title in visible_windows():
            print(f"{hwnd}  {title}")
        return

    hwnd = find_window(args.title)
    image = capture(hwnd)
    image.save(args.out, "PNG", optimize=True)

    # A dark app that came through a compositor arrives lighter than it should,
    # so report the per channel floor. Fuseprobe's ground is #0B0F12: anything
    # noticeably above that means something lifted the blacks on the way out.
    floor = tuple(channel[0] for channel in image.getextrema()[:3])
    print(
        f"saved {args.out}  {image.width}x{image.height}  "
        f"darkest channel values #{floor[0]:02X}{floor[1]:02X}{floor[2]:02X}"
    )


if __name__ == "__main__":
    main()
