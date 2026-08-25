"""Capture a window on Windows at exact colours and a repeatable size.

Requires pywin32 and Pillow:

    python -m pip install pywin32 pillow

Usage:

    python scripts/capture_window.py --list
    python scripts/capture_window.py --title Fuseprobe --size 1280x820 --client-only

Three problems with hand captured screenshots that this avoids.

**Colour.** The Windows Snipping Tool applies its own colour handling and shifts
every channel, which is invisible until you compare against the palette and
obvious once you do. On a dark surface like Fuseprobe's #0B0F12 ground the result
looks washed out. `--expect` turns that into a check rather than a hope: it
compares the most common colour in the capture against the value you name and
exits non-zero if they differ. Note that a plain screen grab is not the problem
here, it is the tool: PIL's own ImageGrab returns exact pixels too.

**Size.** Cropping by hand gives a slightly different size every time. `--size`
sets the window before capturing, so repeated runs produce identical dimensions.

**What is in frame.** PrintWindow asks DWM for the window's own rendering rather
than reading the screen, so nothing overlapping the window can appear in the
capture and it works even when the window is partly covered. `--client-only`
goes further and drops the title bar and border, leaving only the application's
own interface.
"""

from __future__ import annotations

import argparse
import ctypes
import sys
import time
from collections import Counter
from ctypes import wintypes

# Window titles are frequently not ASCII. Without this, printing the listing dies
# or mangles on a console still running a legacy code page.
for stream in (sys.stdout, sys.stderr):
    try:
        stream.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, OSError):
        pass

try:
    import win32con
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

# Fuseprobe's ground token. A capture whose dominant colour is not this has been
# through something that changed it.
DEFAULT_EXPECTED_GROUND = "#0B0F12"


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


def resize_window(hwnd: int, width: int, height: int, settle_seconds: float) -> None:
    """Set an exact window size so repeated runs produce identical images.

    The pause afterwards is not decoration. A resized window relays out
    asynchronously, and a WebView2 surface in particular can still be mid reflow
    when the next statement runs.
    """
    win32gui.SetWindowPos(
        hwnd,
        0,
        0,
        0,
        width,
        height,
        win32con.SWP_NOMOVE | win32con.SWP_NOZORDER | win32con.SWP_NOACTIVATE,
    )
    time.sleep(settle_seconds)


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


def capture(hwnd: int, client_only: bool) -> Image.Image:
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

    if client_only:
        # The client rectangle sits inside the frame, so this also removes the
        # title bar and the rounded corners Windows 11 draws on the frame.
        _, _, client_width, client_height = win32gui.GetClientRect(hwnd)
        origin_x, origin_y = win32gui.ClientToScreen(hwnd, (0, 0))
        offset_x, offset_y = origin_x - left, origin_y - top
        crop = (offset_x, offset_y, offset_x + client_width, offset_y + client_height)
    else:
        frame = extended_frame(hwnd)
        crop = None if frame is None else (frame[0] - left, frame[1] - top, frame[2] - left, frame[3] - top)

    if crop and crop[0] >= 0 and crop[1] >= 0 and crop[2] <= image.width and crop[3] <= image.height:
        image = image.crop(crop)

    return image


def check_ground(image: Image.Image, expected_hex: str) -> bool:
    """The most common colour in the capture must be the app's own ground.

    This is what catches a colour managed capture. A tool that shifts every
    channel still produces a plausible looking image, and comparing it against
    the palette is the only way to see that it did.
    """
    try:
        pixels = image.get_flattened_data()  # Pillow 11.3 and newer
    except AttributeError:  # pragma: no cover
        pixels = image.getdata()

    dominant, _count = Counter(pixels).most_common(1)[0]
    expected = tuple(int(expected_hex.lstrip("#")[i : i + 2], 16) for i in (0, 2, 4))
    drift = max(abs(a - b) for a, b in zip(dominant, expected))
    got = "#{:02X}{:02X}{:02X}".format(*dominant)

    if drift == 0:
        print(f"  ground exact: {got}")
        return True
    print(f"  GROUND DRIFT: {got} against expected {expected_hex.upper()}, off by {drift} per channel")
    return False


def parse_size(value: str) -> tuple[int, int]:
    try:
        width, height = value.lower().split("x", 1)
        return int(width), int(height)
    except ValueError:
        raise argparse.ArgumentTypeError(f"expected WIDTHxHEIGHT, got {value!r}") from None


def main() -> int:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--title", default="Fuseprobe", help="substring of the window title")
    parser.add_argument("--out", default="assets/fuseprobe.png", help="output path")
    parser.add_argument("--size", type=parse_size, metavar="WxH",
                        help="set the window to this size first, so runs are repeatable")
    parser.add_argument("--client-only", action="store_true",
                        help="drop the title bar and border, keeping only the app's own interface")
    parser.add_argument("--expect", default=DEFAULT_EXPECTED_GROUND, metavar="HEX",
                        help=f"colour the dominant pixel must equal (default: {DEFAULT_EXPECTED_GROUND})")
    parser.add_argument("--no-verify", action="store_true", help="skip the colour check")
    parser.add_argument("--settle", type=float, default=0.6, metavar="SECONDS",
                        help="pause after resizing, to let the window finish laying out")
    parser.add_argument("--list", action="store_true", help="list visible windows and exit")
    args = parser.parse_args()

    make_dpi_aware()

    if args.list:
        for hwnd, title in visible_windows():
            print(f"{hwnd}  {title}")
        return 0

    hwnd = find_window(args.title)
    if args.size:
        resize_window(hwnd, args.size[0], args.size[1], args.settle)

    image = capture(hwnd, client_only=args.client_only)
    image.save(args.out, "PNG", optimize=True)
    print(f"saved {args.out}  {image.width}x{image.height}")

    if args.no_verify:
        return 0
    return 0 if check_ground(image, args.expect) else 1


if __name__ == "__main__":
    raise SystemExit(main())
