"""Build premium transparent Convertek brand pack (logo, favicon, OG, desktop)."""
from __future__ import annotations

import base64
import io
import shutil
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(r"e:\Zconvetr\zconvert")
PUBLIC = ROOT / "public"
BRAND = PUBLIC / "brand"
OUT_DESK = (
    ROOT
    / "CloudConverter.Desktop"
    / "src"
    / "CloudConverter.Desktop"
    / "Assets"
)
ASSET_CANDIDATES = [
    Path(
        r"C:\Users\Daoud Khan\.cursor\projects\e-Zconvetr-zconvert\assets\convertek-premium-3d-mark.png"
    ),
    BRAND / "convertek-premium-3d-mark.png",
]
OG_CANDIDATES = [
    Path(
        r"C:\Users\Daoud Khan\.cursor\projects\e-Zconvetr-zconvert\assets\convertek-premium-og.png"
    ),
    BRAND / "convertek-premium-og.png",
]


def find_first(paths: list[Path]) -> Path:
    for p in paths:
        if p.is_file():
            return p
    raise FileNotFoundError(paths)


def knock_studio(im: Image.Image) -> Image.Image:
    """Remove pure/near-black studio plate; keep emerald glass + chrome arrows."""
    rgba = im.convert("RGBA")
    arr = np.asarray(rgba).astype(np.float32)
    r, g, b, a0 = arr[..., 0], arr[..., 1], arr[..., 2], arr[..., 3]
    bright = (r + g + b) / 3.0
    maxc = np.maximum(np.maximum(r, g), b)
    minc = np.minimum(np.minimum(r, g), b)
    chroma = maxc - minc
    green_bias = g - np.maximum(r, b)
    blue_bias = b - np.maximum(r, g)

    # Soft key black → transparent
    alpha = np.clip((bright - 8) * (255.0 / 36.0), 0, 255)
    # Hard kill pure black / dark gray plate
    alpha = np.where((bright < 14) | ((bright < 32) & (chroma < 14)), 0, alpha)
    # Keep vivid cyan/emerald/chrome
    protect = (
        ((green_bias > 10) & (g > 40))
        | ((blue_bias > 12) & (b > 45))
        | (bright > 150)
        | ((chroma > 25) & (bright > 35))
    )
    alpha = np.where(protect, np.maximum(alpha, 220), alpha)
    # Soft floor glow under logo: keep partial alpha if tinted
    glow = (bright < 90) & (chroma > 8) & ((green_bias > 5) | (blue_bias > 5))
    alpha = np.where(glow, np.maximum(alpha, np.clip(bright * 1.8, 0, 160)), alpha)

    out = np.dstack([r, g, b, alpha]).astype(np.uint8)
    img = Image.fromarray(out, "RGBA")
    # Feather mask slightly
    mask = img.split()[3].filter(ImageFilter.GaussianBlur(0.8))
    m = np.asarray(mask).astype(np.float32)
    m = np.where(m < 8, 0, np.where(m > 250, 255, m))
    img.putalpha(Image.fromarray(m.astype(np.uint8), "L"))

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


def save_ico(path: Path, logo: Image.Image, sizes=(16, 24, 32, 48, 64)) -> None:
    frames = [fit_square(logo, s, pad_ratio=0.05) for s in sizes]
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


def compose_og(logo: Image.Image, optional_ref: Path | None) -> Image.Image:
    """Prefer clean compose on mint for social previews (transparent mark + type)."""
    w, h = 1200, 630
    arr = np.zeros((h, w, 3), dtype=np.uint8)
    for y in range(h):
        t = y / max(1, h - 1)
        # soft mint atmosphere
        arr[y, :] = (
            int(236 + (250 - 236) * t),
            int(253 + (252 - 253) * t),
            int(245 + (250 - 245) * t),
        )
    # left soft cyan glow
    for y in range(h):
        for x in range(420):
            d = 1.0 - (x / 420.0) * (0.55 + 0.45 * abs(y - h / 2) / (h / 2))
            if d <= 0:
                continue
            u = d * 0.12
            arr[y, x, 0] = int(arr[y, x, 0] * (1 - u) + 16 * u)
            arr[y, x, 1] = int(arr[y, x, 1] * (1 - u) + 185 * u)
            arr[y, x, 2] = int(arr[y, x, 2] * (1 - u) + 129 * u)

    og = Image.fromarray(arr, "RGB").convert("RGBA")
    mark = fit_square(logo, 360, pad_ratio=0.04)
    # soft drop shadow under logo
    shadow = Image.new("RGBA", mark.size, (0, 0, 0, 0))
    alpha = mark.split()[3].filter(ImageFilter.GaussianBlur(12))
    shadow.putalpha(alpha.point(lambda p: int(p * 0.28)))
    sx, sy = 90, (h - 360) // 2 + 18
    og.alpha_composite(shadow, (sx + 6, sy + 18))
    og.alpha_composite(mark, (sx - 6, sy))

    draw = ImageDraw.Draw(og)
    try:
        font_lg = ImageFont.truetype("segoeuib.ttf", 78)
        font_sm = ImageFont.truetype("segoeui.ttf", 30)
    except OSError:
        try:
            font_lg = ImageFont.truetype("arialbd.ttf", 78)
            font_sm = ImageFont.truetype("arial.ttf", 30)
        except OSError:
            font_lg = ImageFont.load_default()
            font_sm = font_lg
    draw.text((470, 230), "Convertek", fill=(6, 78, 59, 255), font=font_lg)
    draw.text((474, 330), "www.convertek.tech", fill=(5, 150, 105, 255), font=font_sm)
    draw.text(
        (474, 385),
        "Universal file converter",
        fill=(100, 116, 139, 255),
        font=font_sm,
    )
    return og.convert("RGB")


def main() -> None:
    PUBLIC.mkdir(parents=True, exist_ok=True)
    BRAND.mkdir(parents=True, exist_ok=True)
    OUT_DESK.mkdir(parents=True, exist_ok=True)

    src = find_first(ASSET_CANDIDATES)
    shutil.copy2(src, BRAND / "convertek-premium-3d-mark.png")
    print("source:", src)

    raw = Image.open(src)
    logo = knock_studio(raw)
    a = np.asarray(logo.split()[3])
    print(f"transparent crop {logo.size}, opaque={(a > 10).mean():.1%}")

    # Masters (design / PWA store only under brand + icon-1024)
    logo.save(BRAND / "convertek-3d-logo-mark.png", "PNG", optimize=True)
    master = fit_square(logo, 1024, pad_ratio=0.07)
    master.save(BRAND / "logo-mark.png", "PNG", optimize=True)
    master.save(PUBLIC / "icon-1024.png", "PNG", optimize=True)

    # Site UI logo — small assets (header is ~40px; do not ship 1024 PNG in pages)
    web = fit_square(logo, 384, pad_ratio=0.07)
    web.save(PUBLIC / "logo-mark.png", "PNG", optimize=True)
    ui = fit_square(logo, 160, pad_ratio=0.07)
    ui.save(PUBLIC / "logo-mark-fallback.png", "PNG", optimize=True)
    try:
        ui.save(PUBLIC / "logo-mark.webp", "WEBP", quality=80, method=6)
    except Exception as e:
        print("webp skip:", e)

    for size, name, pad in [
        (512, "icon-512.png", 0.07),
        (192, "icon-192.png", 0.07),
        (64, "favicon-64.png", 0.05),
        (32, "favicon-32.png", 0.05),
    ]:
        fit_square(logo, size, pad_ratio=pad).save(PUBLIC / name, "PNG", optimize=True)
        print("saved", name)

    with_bg(fit_square(logo, 180, pad_ratio=0.08), (236, 253, 245, 255)).convert(
        "RGB"
    ).save(PUBLIC / "apple-touch-icon.png", "PNG")

    save_ico(PUBLIC / "favicon.ico", logo, sizes=(16, 32, 48, 64))
    fit_square(logo, 512).save(OUT_DESK / "app.png", "PNG")
    save_ico(OUT_DESK / "app.ico", logo)

    og = compose_og(logo, None)
    try:
        ref = find_first(OG_CANDIDATES)
        shutil.copy2(ref, BRAND / "convertek-premium-og-raw.png")
    except FileNotFoundError:
        pass
    og.save(PUBLIC / "og-image.png", "PNG", optimize=True)
    print("saved og-image.png")

    for name, size in [("favicon.svg", 64), ("icon.svg", 512), ("logo.svg", 512)]:
        (PUBLIC / name).write_text(svg_data_uri(logo, size), encoding="utf-8")

    # Horizontal lockup SVG (transparent mark + wordmark)
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

    # Also keep convert.logo-source as latest transparent master for re-runs
    master.save(BRAND / "convertek-logo-source.png", "PNG", optimize=True)
    print("done — premium transparent brand pack")


if __name__ == "__main__":
    main()
