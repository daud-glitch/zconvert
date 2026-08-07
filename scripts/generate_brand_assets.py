"""Generate Convertek PNG/ICO brand assets matching public/favicon.svg."""
from pathlib import Path
from PIL import Image, ImageDraw

OUT_PUBLIC = Path(r"e:\Zconvetr\zconvert\public")
OUT_DESK = Path(
    r"e:\Zconvetr\zconvert\CloudConverter.Desktop\src\CloudConverter.Desktop\Assets"
)


def lerp(a: int, b: int, t: float) -> int:
    return int(a + (b - a) * t)


def make_icon(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    radius = max(4, size // 4)
    for y in range(size):
        t = y / max(1, size - 1)
        if t < 0.45:
            u = t / 0.45
            c = (
                lerp(0x34, 0x10, u),
                lerp(0xD3, 0xB9, u),
                lerp(0x99, 0x81, u),
                255,
            )
        else:
            u = (t - 0.45) / 0.55
            c = (
                lerp(0x10, 0x04, u),
                lerp(0xB9, 0x78, u),
                lerp(0x81, 0x57, u),
                255,
            )
        d.line([(0, y), (size - 1, y)], fill=c)

    mask = Image.new("L", (size, size), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    base = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    base.paste(img, (0, 0))
    base.putalpha(mask)
    d = ImageDraw.Draw(base)

    m = size / 64
    cx, cy = size // 2, size // 2
    r = int(18.5 * m)
    ring = max(1, int(1.5 * m))
    d.ellipse(
        [cx - r, cy - r, cx + r, cy + r],
        outline=(236, 253, 245, int(255 * 0.28)),
        width=ring,
    )
    sw = max(2, int(3.4 * m))
    white = (255, 255, 255, 255)
    y1 = int(27 * m)
    y2 = int(37 * m)
    xL, xR = int(18 * m), int(40 * m)
    xL2, xR2 = int(24 * m), int(46 * m)
    tip = int(7 * m)
    d.line([(xL, y1), (xR, y1)], fill=white, width=sw)
    d.line([(xR - tip, y1 - tip), (xR, y1), (xR - tip, y1 + tip)], fill=white, width=sw)
    d.line([(xR2, y2), (xL2, y2)], fill=white, width=sw)
    d.line([(xL2 + tip, y2 - tip), (xL2, y2), (xL2 + tip, y2 + tip)], fill=white, width=sw)
    nr = max(2, int(2.4 * m))
    d.ellipse(
        [int(17.5 * m) - nr, y1 - nr, int(17.5 * m) + nr, y1 + nr],
        fill=(236, 253, 245, 255),
    )
    d.ellipse(
        [int(46.5 * m) - nr, y2 - nr, int(46.5 * m) + nr, y2 + nr],
        fill=(236, 253, 245, 255),
    )
    return base


def save_ico(path: Path, sizes=(16, 24, 32, 48, 64, 128, 256)) -> None:
    images = [make_icon(s) for s in sizes]
    images[0].save(path, format="ICO", sizes=[(s, s) for s in sizes])


def main() -> None:
    OUT_PUBLIC.mkdir(parents=True, exist_ok=True)
    OUT_DESK.mkdir(parents=True, exist_ok=True)

    for s, name in [(512, "icon-512.png"), (180, "apple-touch-icon.png"), (32, "favicon-32.png")]:
        p = OUT_PUBLIC / name
        make_icon(s).save(p, "PNG")
        print("saved", p)

    make_icon(512).save(OUT_DESK / "app.png", "PNG")
    print("saved", OUT_DESK / "app.png")
    save_ico(OUT_DESK / "app.ico")
    print("saved", OUT_DESK / "app.ico")
    save_ico(OUT_PUBLIC / "favicon.ico", sizes=(16, 32, 48))
    print("saved", OUT_PUBLIC / "favicon.ico")
    print("done")


if __name__ == "__main__":
    main()
