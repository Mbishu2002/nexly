#!/usr/bin/env python3
"""Generate every app icon in assets/ from the Nexly logo lockup.

    python scripts/make-icons.py path/to/logo.png

The source is the full lockup (elephant mark above the "Nexly" wordmark) drawn
on a solid white ground. This script keys the white out, splits the mark from
the wordmark, and emits each target at the size and transparency its platform
actually requires. Run `npx expo prebuild --platform android --clean` afterwards
to push the results into the native project.

Requires Pillow and NumPy.
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image

ASSETS = Path(__file__).resolve().parent.parent / "assets"

# Android masks adaptive icons to a circle 66dp across on a 108dp canvas, and
# only the inner 72dp is guaranteed visible at all. Anything outside the circle
# can be shaved off by a round-icon launcher.
SAFE_CIRCLE = 66 / 108

WHITE_CUT = 250.0   # >= this on every channel is background
WHITE_RAMP = 15.0   # soft edge width, so antialiasing survives the key


def key_white(rgb: Image.Image) -> Image.Image:
    """Solid white ground -> transparent, with a soft edge."""
    a = np.asarray(rgb).astype(np.float32)
    alpha = np.clip((WHITE_CUT - a.min(axis=2)) / WHITE_RAMP * 255.0, 0, 255)
    return Image.fromarray(np.dstack([a, alpha]).astype(np.uint8), "RGBA")


def split_lockup(src: Image.Image) -> tuple[tuple[int, int, int, int], tuple[int, int, int, int]]:
    """Find the mark (above) and the full lockup, via the blank band between
    the elephant and the wordmark. Detected rather than hardcoded so a redrawn
    logo still works."""
    ink = np.asarray(src.convert("RGB")).astype(int).min(axis=2) < 240
    w, h = src.size
    blank = ~ink.any(axis=1)

    bands, start = [], None
    for y, b in enumerate(blank):
        if b and start is None:
            start = y
        elif not b and start is not None:
            if y - start > 20:
                bands.append((start, y))
            start = None

    # The widest interior gap separates mark from wordmark.
    interior = [b for b in bands if b[0] > h * 0.2 and b[1] < h * 0.95]
    mark_bottom = max(interior, key=lambda b: b[1] - b[0])[0] if interior else h
    return (0, 0, w, mark_bottom), (0, 0, w, h)


def fit(src: Image.Image, box, canvas: int, frac: float, mono: bool = False) -> Image.Image:
    """Scale a crop to `frac` of a square canvas, centred.

    The resize happens in RGB and the alpha is keyed afterwards; keying first
    would let the transparent white bleed into the edges as a halo.
    """
    region = src.crop(box)
    rw, rh = region.size
    scale = (canvas * frac) / max(rw, rh)
    w, h = max(1, round(rw * scale)), max(1, round(rh * scale))
    art = key_white(region.resize((w, h), Image.LANCZOS))
    if mono:
        px = np.asarray(art).copy()
        px[:, :, :3] = 0
        art = Image.fromarray(px, "RGBA")
    out = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
    out.paste(art, ((canvas - w) // 2, (canvas - h) // 2), art)
    return out


def ink_outside_safe_circle(img: Image.Image) -> float:
    """Percentage of visible ink a round launcher mask would clip."""
    alpha = np.asarray(img)[:, :, 3]
    ys, xs = np.nonzero(alpha > 8)
    if len(xs) == 0:
        return 0.0
    c = img.size[0] / 2
    return float((np.hypot(xs - c, ys - c) > SAFE_CIRCLE * img.size[0] / 2).mean() * 100)


def largest_safe_scale(src: Image.Image, mark) -> float:
    """Biggest scale at which the mark clears the circle completely.

    A wide-eared mark overruns the circle much earlier than a square logo, so
    this is measured rather than guessed.
    """
    print(f"  {'scale':>6}  {'ink clipped by round mask':>26}")
    chosen = None
    for frac in [f / 100 for f in range(80, 39, -2)]:
        outside = ink_outside_safe_circle(fit(src, mark, 1024, frac))
        flag = ""
        if outside == 0.0 and chosen is None:
            chosen, flag = frac, "  <- chosen"
        print(f"  {frac:>6.2f}  {outside:>25.2f}%{flag}")
        if chosen is not None and frac < chosen - 0.05:
            break
    return chosen or 0.50


def flatten(img: Image.Image, bg=(255, 255, 255, 255)) -> Image.Image:
    return Image.alpha_composite(Image.new("RGBA", img.size, bg), img).convert("RGB")


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__)
        return 2
    path = Path(sys.argv[1])
    if not path.is_file():
        print(f"error: no such file: {path}")
        return 1

    src = Image.open(path).convert("RGB")
    mark, full = split_lockup(src)
    print(f"source {path.name}: {src.size[0]}x{src.size[1]}")
    print(f"  mark     y 0..{mark[3]}")
    print(f"  wordmark y {mark[3]}..{full[3]}")
    print("\nfitting the mark to the Android adaptive-icon safe circle:")
    frac = largest_safe_scale(src, mark)

    ASSETS.mkdir(exist_ok=True)
    # iOS app icons must be fully opaque -- no alpha channel allowed.
    flatten(fit(src, full, 1024, 0.86)).save(ASSETS / "icon.png")
    fit(src, mark, 1024, frac).save(ASSETS / "adaptive-icon.png")
    fit(src, mark, 1024, frac, mono=True).save(ASSETS / "adaptive-icon-monochrome.png")
    fit(src, full, 1024, 0.75).save(ASSETS / "splash-icon.png")
    fit(src, mark, 196, 0.92).save(ASSETS / "favicon.png")
    key_white(src).save(ASSETS / "logo.png")

    # In-app brand mark: tight crop, no safe-zone padding. The launcher assets
    # bake in padding for Android's mask, which reads as a tiny logo lost in
    # whitespace at 28px in an app bar.
    m = key_white(src.crop(mark))
    m = m.crop(m.getbbox())
    m.resize((512, round(512 * m.size[1] / m.size[0])), Image.LANCZOS).save(ASSETS / "mark.png")

    print("\nwrote:")
    for name in ("icon", "adaptive-icon", "adaptive-icon-monochrome",
                 "splash-icon", "favicon", "logo", "mark"):
        im = Image.open(ASSETS / f"{name}.png")
        print(f"  assets/{name + '.png':32} {im.size[0]}x{im.size[1]:<6} {im.mode}")
    print("\nnow run: npx expo prebuild --platform android --clean")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
