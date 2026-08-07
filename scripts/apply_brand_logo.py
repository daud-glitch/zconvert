"""Build Convertek brand assets from HD icon (knock pure black BG → transparent)."""
from __future__ import annotations

import base64
import io
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(r"e:\Zconvetr\zconvert")
PUBLIC = ROOT / "public"
BRAND = PUBLIC / "brand"
SRC = BRAND / "convertek-logo-source.png"
OUT_DESK = (
    ROOT
    / "CloudConverter.Desktop"
    / "src"
    / "CloudConverter.Desktop"
    / "Assets"
)


def knock_black(im: Image.Image, hard: int = 12, soft: int = 42) -> Image.Image:
    """HD render: pure black studio → alpha; preserve blue/green symbols + shadows on mark."""
    rgba = im.convert("RGBA")
    arr = np.asarray(rgba).astype(np.float32)
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    bright = (r + g + b) / 3.0
    maxc = np.maximum(np.maximum(r, g), b)
    minc = np.minimum(np.minimum(r, g), b)
    chroma = maxc - minc

    # Soft key black → transparent
    alpha = np.clip((bright - hard) * (255.0 / max(1, soft - hard)), 0, 255)
    # Kill pure black / gray studio noise
    alpha = np.where((bright < 10) | ((bright < 22) & (chroma < 10)), 0, alpha)
    # Protect colored pixels even if dark (recessed arrow shadow on logo)
    protect = (chroma > 18) & ((b > 40) | (g > 50))
    alpha = np.where(protect, np.maximum(alpha, 200), alpha)

    out = np.dstack([arr[..., 0], arr[..., 1], arr[..., 2], alpha]).astype(np.uint8)
    img = Image.fromarray(out, "RGBA")
    a = img.split()[3].filter(ImageFilter.GaussianBlur(0.5))
    a_arr = np.asarray(a).astype(np.float32)
    a_arr = np.where(a_arr < 6, 0, np.where(a_arr > 248, 255, a_arr))
    img.putalpha(Image.fromarray(a_arr.astype(np.uint8), "L"))

    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
    return img


def fit_square(im: Image.Image, size: int, pad_ratio: float = 0.08) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    content = im.convert("RGBA")
    bbox = content.getbbox() or (0, 0, content.width, content.height)
    content = content.crop(bbox)
    inner = max(1, int(size * (1.0 - 2 * pad_ratio)))
    content.thumbnail((inner, inner), Image.Resampling.LANCZOS)
    x = (size - content.width) // 2
    y = (size - content.height) // 2
    canvas.paste(content, (x, y), content)
    return canvas


def with_bg(im: Image.Image, rgba: tuple[int, int, int, int]) -> Image.Image:
    base = Image.new("RGBA", im.size, rgba)
    base.alpha_composite(im)
    return base


def save_ico(path: Path, logo: Image.Image, sizes=(16, 24, 32, 48, 64, 128, 256)) -> None:
    frames = [fit_square(logo, s, pad_ratio=0.06) for s in sizes]
    frames[0].save(
        path,
        format="ICO",
        sizes=[(s, s) for s in sizes],
        append_images=frames[1:],
    )


def png_bytes(im: Image.Image) -> bytes:
    buf = io.BytesIO()
    im.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


def svg_data_uri(logo: Image.Image, size: int) -> str:
    fitted = fit_square(logo, size, pad_ratio=0.06)
    b64 = base64.b64encode(png_bytes(fitted)).decode("ascii")
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" role="img" aria-label="Convertek">
  <image href="data:image/png;base64,{b64}" width="{size}" height="{size}" preserveAspectRatio="xMidYMid meet"/>
</svg>
"""


def make_og(logo: Image.Image) -> Image.Image:
    w, h = 1200, 630
    arr = np.zeros((h, w, 3), dtype=np.uint8)
    for y in range(h):
        t = y / max(1, h - 1)
        arr[y, :] = (
            int(236 + (248 - 236) * t),
            int(253 + (250 - 253) * t),
            int(245 + (252 - 245) * t),
        )
    og = Image.fromarray(arr, "RGB").convert("RGBA")
    mark = fit_square(logo, 360, pad_ratio=0.04)
    og.alpha_composite(mark, (70, (h - 360) // 2))
    draw = ImageDraw.Draw(og)
    draw.rounded_rectangle([460, 200, 1140, 430], radius=28, fill=(255, 255, 255, 210))
    try:
        font_lg = ImageFont.truetype("segoeui.ttf", 72)
        font_sm = ImageFont.truetype("segoeui.ttf", 28)
    except OSError:
        try:
            font_lg = ImageFont.truetype("arial.ttf", 72)
            font_sm = ImageFont.truetype("arial.ttf", 28)
        except OSError:
            font_lg = ImageFont.load_default()
            font_sm = font_lg
    draw.text((500, 250), "Convertek", fill=(6, 78, 59, 255), font=font_lg)
    draw.text((500, 350), "www.convertek.tech", fill=(5, 150, 105, 255), font=font_sm)
    return og.convert("RGB")


def main() -> None:
    PUBLIC.mkdir(parents=True, exist_ok=True)
    BRAND.mkdir(parents=True, exist_ok=True)
    OUT_DESK.mkdir(parents=True, exist_ok=True)
    if not SRC.is_file():
        raise SystemExit(f"Missing {SRC}")

    raw = Image.open(SRC)
    # If already RGBA with real transparency, keep alpha; else knock black
    if raw.mode == "RGBA":
        a = np.asarray(raw.split()[3])
        if (a < 10).mean() > 0.2:
            logo = raw
            bbox = logo.getbbox()
            if bbox:
                logo = logo.crop(bbox)
        else:
            logo = knock_black(raw)
    else:
        logo = knock_black(raw)

    a = np.asarray(logo.split()[3])
    print(f"HD crop {logo.size}, opaque={(a > 10).mean():.1%}")

    logo.save(BRAND / "convertek-3d-logo-mark.png", "PNG", optimize=True)
    # Full HD masters
    master = fit_square(logo, 1024, pad_ratio=0.07)
    master.save(BRAND / "logo-mark.png", "PNG", optimize=True)
    master.save(PUBLIC / "logo-mark.png", "PNG", optimize=True)
    master.save(PUBLIC / "icon-1024.png", "PNG", optimize=True)

    for size, name in [
        (512, "icon-512.png"),
        (192, "icon-192.png"),
        (64, "favicon-64.png"),
        (32, "favicon-32.png"),
    ]:
        fit_square(logo, size, pad_ratio=0.06).save(PUBLIC / name, "PNG", optimize=True)
        print("saved", name)

    with_bg(fit_square(logo, 180, pad_ratio=0.08), (236, 253, 245, 255)).convert(
        "RGB"
    ).save(PUBLIC / "apple-touch-icon.png", "PNG")

    save_ico(PUBLIC / "favicon.ico", logo, sizes=(16, 32, 48, 64))
    fit_square(logo, 512).save(OUT_DESK / "app.png", "PNG")
    save_ico(OUT_DESK / "app.ico", logo)
    make_og(logo).save(PUBLIC / "og-image.png", "PNG", optimize=True)

    for name, size in [("favicon.svg", 64), ("icon.svg", 512), ("logo.svg", 512)]:
        (PUBLIC / name).write_text(svg_data_uri(logo, size), encoding="utf-8")

    m = fit_square(logo, 160)
    b64 = base64.b64encode(png_bytes(m)).decode("ascii")
    (PUBLIC / "logo-wordmark.svg").write_text(
        f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 200" role="img" aria-label="Convertek">
  <image href="data:image/png;base64,{b64}" x="16" y="20" width="160" height="160" preserveAspectRatio="xMidYMid meet"/>
  <text x="196" y="118" font-family="Segoe UI, system-ui, Helvetica, Arial, sans-serif" font-size="64" font-weight="700" letter-spacing="-1.5" fill="#064e3b">Convertek</text>
  <text x="198" y="152" font-family="Segoe UI, system-ui, Helvetica, Arial, sans-serif" font-size="14" font-weight="600" letter-spacing="3.2" fill="#059669">convertek.tech</text>
</svg>
""",
        encoding="utf-8",
    )
    print("done")


if __name__ == "__main__":
    main()
