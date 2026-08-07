"""
zConvert 60s tech-clean launch promo (motion graphics).
Renders MP4 via OpenCV + Pillow. Roman Urdu VO on-screen (script match).
"""
from __future__ import annotations

import math
import os
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

W, H = 1280, 720
FPS = 30
DURATION = 60
TOTAL = FPS * DURATION
OUT = Path(__file__).resolve().parent / "zconvert-launch-60s.mp4"

# Scene end times (seconds)
SCENES = [
    (5, "open"),
    (12, "formats"),
    (20, "drop"),
    (28, "select"),
    (38, "progress"),
    (48, "ready"),
    (55, "devices"),
    (60, "cta"),
]

EMERALD = (16, 185, 129)
EMERALD_DARK = (4, 120, 87)
WHITE = (255, 255, 255)
INK = (15, 23, 42)
MUTED = (100, 116, 139)
SOFT = (241, 245, 249)
CARD = (255, 255, 255)
BG_TOP = (248, 250, 252)
BG_BOT = (226, 232, 240)


def find_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = []
    if bold:
        candidates += [
            r"C:\Windows\Fonts\segoeuib.ttf",
            r"C:\Windows\Fonts\arialbd.ttf",
            r"C:\Windows\Fonts\tahomabd.ttf",
            r"C:\Windows\Fonts\calibrib.ttf",
        ]
    candidates += [
        r"C:\Windows\Fonts\segoeui.ttf",
        r"C:\Windows\Fonts\arial.ttf",
        r"C:\Windows\Fonts\tahoma.ttf",
        r"C:\Windows\Fonts\calibri.ttf",
    ]
    for p in candidates:
        if os.path.isfile(p):
            try:
                return ImageFont.truetype(p, size)
            except OSError:
                continue
    return ImageFont.load_default()


FONT_HERO = find_font(64, bold=True)
FONT_H1 = find_font(46, bold=True)
FONT_H2 = find_font(32, bold=True)
FONT_BODY = find_font(26)
FONT_SM = find_font(20)
FONT_XS = find_font(16)


def ease_out(t: float) -> float:
    t = max(0.0, min(1.0, t))
    return 1 - (1 - t) ** 3


def ease_in_out(t: float) -> float:
    t = max(0.0, min(1.0, t))
    return 0.5 * (1 - math.cos(math.pi * t))


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def lerp_color(c1, c2, t: float):
    t = max(0.0, min(1.0, t))
    return tuple(int(lerp(a, b, t)) for a, b in zip(c1, c2))


def gradient_bg_array(t: float = 0.0) -> np.ndarray:
    """Fast vertical gradient as RGB uint8 array (H, W, 3)."""
    y = np.linspace(0, 1, H, dtype=np.float32)[:, None]
    wave = 0.03 * np.sin((np.arange(H, dtype=np.float32) / 80.0) + t * 2.0)[:, None]
    kk = np.clip(y + wave, 0.0, 1.0)
    r = BG_TOP[0] + (BG_BOT[0] - BG_TOP[0]) * kk
    g = BG_TOP[1] + (BG_BOT[1] - BG_TOP[1]) * kk
    b = BG_TOP[2] + (BG_BOT[2] - BG_TOP[2]) * kk
    g = np.minimum(255, g + 8 * (1 - y))
    row = np.concatenate([r, g, b], axis=1).astype(np.uint8)  # (H, 3)
    return np.repeat(row[:, None, :], W, axis=1)


def gradient_bg(draw: ImageDraw.ImageDraw, t: float = 0.0, img: Image.Image | None = None):
    arr = gradient_bg_array(t)
    if img is not None:
        img.paste(Image.fromarray(arr, "RGB"))
    else:
        # fallback per-row (slow) — keep for safety
        for y in range(H):
            draw.line([(0, y), (W, y)], fill=tuple(int(x) for x in arr[y, 0]))


def rounded_rect(draw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def shadow_card(img: Image.Image, box, radius=24, blur_steps=6):
    """Simple soft shadow under card."""
    x0, y0, x1, y1 = box
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    for i in range(blur_steps, 0, -1):
        pad = i * 2
        alpha = int(18 * (i / blur_steps))
        od.rounded_rectangle(
            [x0 - pad, y0 - pad + 8, x1 + pad, y1 + pad + 8],
            radius=radius + pad // 2,
            fill=(15, 23, 42, alpha),
        )
    base = img.convert("RGBA")
    return Image.alpha_composite(base, overlay).convert("RGB")


def draw_logo(draw, cx, cy, size, alpha_scale=1.0):
    half = size // 2
    box = [cx - half, cy - half, cx + half, cy + half]
    # soft outer glow
    for i in range(3, 0, -1):
        pad = i * 4
        c = lerp_color((236, 253, 245), (167, 243, 208), 1 - i / 3)
        draw.rounded_rectangle(
            [box[0] - pad, box[1] - pad, box[2] + pad, box[3] + pad],
            radius=size // 4 + pad,
            fill=c,
        )
    rounded_rect(draw, box, size // 4, EMERALD)
    # dual arrows as lines
    s = size * 0.22
    # top arrow: rightward
    y1 = cy - size * 0.08
    draw.line(
        [(cx - s * 1.2, y1), (cx + s * 0.9, y1)],
        fill=WHITE,
        width=max(3, size // 14),
    )
    draw.line(
        [(cx + s * 0.3, y1 - s * 0.45), (cx + s * 0.9, y1), (cx + s * 0.3, y1 + s * 0.45)],
        fill=WHITE,
        width=max(3, size // 14),
    )
    # bottom arrow: leftward
    y2 = cy + size * 0.12
    draw.line(
        [(cx + s * 1.2, y2), (cx - s * 0.9, y2)],
        fill=WHITE,
        width=max(3, size // 14),
    )
    draw.line(
        [(cx - s * 0.3, y2 - s * 0.45), (cx - s * 0.9, y2), (cx - s * 0.3, y2 + s * 0.45)],
        fill=WHITE,
        width=max(3, size // 14),
    )


def center_text(draw, text, y, font, fill=INK):
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    draw.text(((W - tw) / 2, y), text, font=font, fill=fill)


def text_width(draw, text, font):
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[2] - bbox[0]


def scene_at(sec: float) -> tuple[str, float]:
    prev = 0.0
    for end, name in SCENES:
        if sec < end:
            local = (sec - prev) / (end - prev)
            return name, local
        prev = end
    return "cta", 1.0


def particle_field(draw, t, n=18):
    rng = np.random.RandomState(42)
    for i in range(n):
        base_x = rng.rand() * W
        base_y = rng.rand() * H
        speed = 8 + rng.rand() * 20
        x = (base_x + t * speed) % W
        y = (base_y + math.sin(t * 0.7 + i) * 12) % H
        r = 1 + int(rng.rand() * 2)
        a_col = lerp_color(SOFT, EMERALD, 0.35 + 0.2 * math.sin(t + i))
        draw.ellipse([x - r, y - r, x + r, y + r], fill=a_col)


def draw_browser_chrome(draw, box, title="zConvert"):
    x0, y0, x1, y1 = box
    rounded_rect(draw, box, 18, WHITE, outline=(226, 232, 240), width=2)
    # title bar
    draw.rounded_rectangle([x0, y0, x1, y0 + 40], radius=18, fill=(248, 250, 252))
    draw.rectangle([x0, y0 + 22, x1, y0 + 40], fill=(248, 250, 252))
    # traffic lights
    for i, col in enumerate([(248, 113, 113), (251, 191, 36), (52, 211, 153)]):
        cx = x0 + 22 + i * 18
        draw.ellipse([cx - 5, y0 + 15, cx + 5, y0 + 25], fill=col)
    # url pill
    draw.rounded_rectangle(
        [x0 + 100, y0 + 10, x1 - 20, y0 + 32],
        radius=10,
        fill=(241, 245, 249),
    )
    draw.text((x0 + 112, y0 + 12), title, font=FONT_XS, fill=MUTED)


def scene_open(img, draw, local, sec):
    gradient_bg(draw, sec, img)
    particle_field(draw, sec, 22)
    pop = ease_out(min(1.0, local * 1.4))
    size = int(lerp(40, 110, pop))
    cy = int(lerp(H / 2 + 40, H / 2 - 40, pop))
    draw_logo(draw, W // 2, cy, size)
    fade = ease_out(max(0.0, (local - 0.25) / 0.5))
    if fade > 0:
        # brand name
        col = lerp_color(BG_TOP, INK, fade)
        center_text(draw, "zConvert", H // 2 + 50, FONT_HERO, col)
        col2 = lerp_color(BG_TOP, MUTED, fade)
        center_text(draw, "Files convert karna… ab asaan hai.", H // 2 + 120, FONT_BODY, col2)


def scene_formats(img, draw, local, sec):
    gradient_bg(draw, sec, img)
    particle_field(draw, sec * 0.8, 14)
    fade = ease_out(min(1.0, local * 2))
    center_text(draw, "Har format. Ek jagah.", 90, FONT_H1, lerp_color(BG_TOP, INK, fade))
    center_text(
        draw,
        "PDF · Images · Video · Audio",
        150,
        FONT_BODY,
        lerp_color(BG_TOP, MUTED, fade),
    )

    labels = ["PDF", "JPG", "MP4", "MP3", "DOCX", "PNG", "WAV", "ZIP"]
    n = len(labels)
    spread = ease_out(min(1.0, local * 1.2))
    for i, lab in enumerate(labels):
        ang = (i / n) * math.pi * 2 - math.pi / 2
        r = 160 * spread
        cx = W // 2 + int(math.cos(ang + sec * 0.25) * r)
        cy = H // 2 + 40 + int(math.sin(ang + sec * 0.25) * r * 0.55)
        s = 54
        col = lerp_color(SOFT, WHITE, spread)
        rounded_rect(
            draw,
            [cx - s, cy - s // 2, cx + s, cy + s // 2],
            14,
            col,
            outline=EMERALD if i % 2 == 0 else (203, 213, 225),
            width=2,
        )
        tw = text_width(draw, lab, FONT_SM)
        draw.text((cx - tw / 2, cy - 10), lab, font=FONT_SM, fill=INK)

    # center brand
    draw_logo(draw, W // 2, H // 2 + 40, 72)


def scene_drop(img, draw, local, sec):
    gradient_bg(draw, sec, img)
    center_text(draw, "bas drop karein", 70, FONT_H1, INK)
    center_text(draw, "File uthain… yahan chhor dein.", 125, FONT_BODY, MUTED)

    browser = [160, 180, W - 160, H - 70]
    img_s = shadow_card(img, browser, 18)
    draw = ImageDraw.Draw(img_s)
    draw_browser_chrome(draw, browser)

    # dropzone
    dz = [260, 260, W - 260, H - 130]
    # pulse border
    pulse = 0.5 + 0.5 * math.sin(sec * 4)
    border = lerp_color((203, 213, 225), EMERALD, pulse)
    rounded_rect(draw, dz, 20, (248, 250, 252), outline=border, width=3)

    # dashed feel via small ticks
    draw.text(
        (W // 2 - 90, (dz[1] + dz[3]) // 2 - 10),
        "Drop file yahan",
        font=FONT_BODY,
        fill=MUTED,
    )

    # floating file card drops in
    drop_t = ease_in_out(min(1.0, local * 1.1))
    fx = W // 2 - 70
    fy = int(lerp(200, 340, drop_t))
    rounded_rect(draw, [fx, fy, fx + 140, fy + 90], 14, WHITE, outline=EMERALD, width=2)
    draw_logo(draw, fx + 40, fy + 45, 36)
    draw.text((fx + 62, fy + 28), "report", font=FONT_SM, fill=INK)
    draw.text((fx + 62, fy + 50), ".pdf", font=FONT_XS, fill=MUTED)

    if drop_t > 0.85:
        center_text(draw, "Uploaded", H - 95, FONT_SM, EMERALD_DARK)

    return img_s


def scene_select(img, draw, local, sec):
    gradient_bg(draw, sec, img)
    center_text(draw, "Jo format chahiye — choose karein", 70, FONT_H2, INK)

    browser = [180, 150, W - 180, H - 80]
    img_s = shadow_card(img, browser, 18)
    draw = ImageDraw.Draw(img_s)
    draw_browser_chrome(draw, browser, "zConvert · Convert")

    # source / target cards
    left = [240, 250, 520, 420]
    right = [W - 520, 250, W - 240, 420]
    rounded_rect(draw, left, 16, SOFT, outline=(226, 232, 240), width=2)
    rounded_rect(draw, right, 16, (236, 253, 245), outline=EMERALD, width=2)
    draw.text((left[0] + 30, left[1] + 40), "From", font=FONT_XS, fill=MUTED)
    draw.text((left[0] + 30, left[1] + 70), "MP4", font=FONT_H1, fill=INK)
    draw.text((right[0] + 30, right[1] + 40), "To", font=FONT_XS, fill=MUTED)

    formats = ["AVI", "MOV", "MP3", "GIF"]
    idx = min(len(formats) - 1, int(local * len(formats) * 1.2))
    chosen = formats[idx]
    draw.text((right[0] + 30, right[1] + 70), chosen, font=FONT_H1, fill=EMERALD_DARK)

    # arrow
    ax = W // 2
    ay = 335
    draw.line([(ax - 40, ay), (ax + 40, ay)], fill=EMERALD, width=5)
    draw.polygon(
        [(ax + 40, ay), (ax + 20, ay - 12), (ax + 20, ay + 12)],
        fill=EMERALD,
    )

    # dropdown list animating
    if local > 0.2:
        menu = [right[0], right[1] + 120, right[2], right[1] + 120 + 40 * len(formats)]
        rounded_rect(draw, menu, 12, WHITE, outline=(226, 232, 240), width=1)
        for i, f in enumerate(formats):
            y = menu[1] + 8 + i * 40
            if i == idx:
                rounded_rect(draw, [menu[0] + 6, y, menu[2] - 6, y + 34], 8, (209, 250, 229))
            draw.text((menu[0] + 18, y + 6), f, font=FONT_BODY, fill=INK)

    return img_s


def scene_progress(img, draw, local, sec):
    gradient_bg(draw, sec, img)
    center_text(draw, "Secure. Fast. Simple.", 80, FONT_H1, INK)
    center_text(
        draw,
        "Bina app install. Bina complicated steps.",
        140,
        FONT_BODY,
        MUTED,
    )

    # progress ring
    cx, cy = W // 2, H // 2 + 40
    r = 90
    pct = ease_out(min(1.0, local * 1.05))
    # base ring
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(226, 232, 240), width=14)
    # arc via many short lines
    steps = max(1, int(120 * pct))
    for i in range(steps):
        a0 = -math.pi / 2 + (i / 120) * 2 * math.pi
        a1 = -math.pi / 2 + ((i + 1) / 120) * 2 * math.pi
        x0 = cx + int(math.cos(a0) * r)
        y0 = cy + int(math.sin(a0) * r)
        x1 = cx + int(math.cos(a1) * r)
        y1 = cy + int(math.sin(a1) * r)
        draw.line([(x0, y0), (x1, y1)], fill=EMERALD, width=14)

    draw.text(
        (cx - 30, cy - 18),
        f"{int(pct * 100)}%",
        font=FONT_H2,
        fill=INK,
    )
    # pills
    for i, label in enumerate(["Secure", "Fast", "Private"]):
        pw = 120
        px = W // 2 - 200 + i * 140
        py = H - 120
        rounded_rect(draw, [px, py, px + pw, py + 40], 20, WHITE, outline=EMERALD, width=2)
        tw = text_width(draw, label, FONT_SM)
        draw.text((px + (pw - tw) / 2, py + 10), label, font=FONT_SM, fill=EMERALD_DARK)


def scene_ready(img, draw, local, sec):
    gradient_bg(draw, sec, img)
    center_text(draw, "File ready — turant download", 80, FONT_H1, INK)

    card = [W // 2 - 220, 200, W // 2 + 220, 480]
    img_s = shadow_card(img, card, 24)
    draw = ImageDraw.Draw(img_s)
    rounded_rect(draw, card, 24, WHITE, outline=(226, 232, 240), width=2)

    # check circle
    pop = ease_out(min(1.0, local * 1.5))
    cr = int(50 * pop)
    ccx, ccy = W // 2, 280
    draw.ellipse([ccx - cr, ccy - cr, ccx + cr, ccy + cr], fill=(209, 250, 229))
    if pop > 0.5:
        draw.line(
            [(ccx - 18, ccy), (ccx - 4, ccy + 16), (ccx + 22, ccy - 16)],
            fill=EMERALD_DARK,
            width=6,
        )

    draw.text((W // 2 - 70, 360), "video.mp3", font=FONT_H2, fill=INK)
    draw.text((W // 2 - 55, 405), "2.4 MB · Ready", font=FONT_SM, fill=MUTED)

    # download button
    btn = [W // 2 - 100, 440, W // 2 + 100, 490]
    pulse = 0.92 + 0.08 * math.sin(sec * 5)
    bcol = lerp_color(EMERALD, EMERALD_DARK, (math.sin(sec * 3) + 1) / 2)
    rounded_rect(draw, btn, 14, bcol)
    tw = text_width(draw, "Download", FONT_BODY)
    draw.text((W // 2 - tw / 2, 452), "Download", font=FONT_BODY, fill=WHITE)

    return img_s


def scene_devices(img, draw, local, sec):
    gradient_bg(draw, sec, img)
    center_text(draw, "Browser pe. Desktop pe.", 70, FONT_H1, INK)
    center_text(draw, "Jahan kaam karte hain — wahi convert.", 125, FONT_BODY, MUTED)

    slide = ease_out(min(1.0, local * 1.3))
    # laptop
    lx = int(lerp(-100, 220, slide))
    laptop = [lx, 220, lx + 420, 480]
    rounded_rect(draw, laptop, 12, INK)
    rounded_rect(draw, [lx + 12, 232, lx + 408, 450], 6, WHITE)
    draw_logo(draw, lx + 210, 320, 48)
    draw.text((lx + 160, 370), "zConvert Web", font=FONT_SM, fill=MUTED)
    # base
    draw.rounded_rectangle([lx + 40, 480, lx + 380, 500], radius=4, fill=(51, 65, 85))

    # phone
    px = int(lerp(W + 50, W - 360, slide))
    phone = [px, 200, px + 160, 520]
    rounded_rect(draw, phone, 22, INK)
    rounded_rect(draw, [px + 8, 220, px + 152, 500], 14, WHITE)
    draw_logo(draw, px + 80, 320, 40)
    draw.text((px + 28, 380), "Desktop", font=FONT_XS, fill=MUTED)
    draw.text((px + 38, 400), "App", font=FONT_XS, fill=MUTED)


def scene_cta(img, draw, local, sec):
    gradient_bg(draw, sec, img)
    particle_field(draw, sec, 24)
    pop = ease_out(min(1.0, local * 1.6))
    size = int(lerp(70, 100, pop))
    draw_logo(draw, W // 2, H // 2 - 80, size)
    fade = ease_out(max(0.0, min(1.0, (local - 0.1) / 0.4)))
    center_text(draw, "zConvert", H // 2 + 10, FONT_HERO, lerp_color(BG_TOP, INK, fade))
    center_text(
        draw,
        "Ab free convert karo",
        H // 2 + 85,
        FONT_H2,
        lerp_color(BG_TOP, EMERALD_DARK, fade),
    )
    center_text(
        draw,
        "Ab free try karein",
        H // 2 + 140,
        FONT_BODY,
        lerp_color(BG_TOP, MUTED, fade),
    )
    # bottom bar
    if fade > 0.5:
        rounded_rect(draw, [W // 2 - 160, H - 100, W // 2 + 160, H - 50], 14, EMERALD)
        tw = text_width(draw, "Launch · zConvert", FONT_BODY)
        draw.text((W // 2 - tw / 2, H - 88), "Launch · zConvert", font=FONT_BODY, fill=WHITE)


def render_frame(frame_i: int) -> np.ndarray:
    sec = frame_i / FPS
    name, local = scene_at(sec)
    img = Image.new("RGB", (W, H), BG_TOP)
    draw = ImageDraw.Draw(img)

    handlers = {
        "open": scene_open,
        "formats": scene_formats,
        "drop": scene_drop,
        "select": scene_select,
        "progress": scene_progress,
        "ready": scene_ready,
        "devices": scene_devices,
        "cta": scene_cta,
    }
    result = handlers[name](img, draw, local, sec)
    if result is not None:
        img = result

    # subtle letterbox time barcode (hidden-ish) — actually skip
    # convert RGB -> BGR for OpenCV
    arr = np.array(img)
    return cv2.cvtColor(arr, cv2.COLOR_RGB2BGR)


def main():
    print(f"Rendering {DURATION}s @ {FPS}fps -> {OUT}")
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(str(OUT), fourcc, FPS, (W, H))
    if not writer.isOpened():
        # fallback codec
        fourcc = cv2.VideoWriter_fourcc(*"XVID")
        avi = OUT.with_suffix(".avi")
        writer = cv2.VideoWriter(str(avi), fourcc, FPS, (W, H))
        out_path = avi
    else:
        out_path = OUT

    # progress every 5%
    step = max(1, TOTAL // 20)
    for i in range(TOTAL):
        frame = render_frame(i)
        writer.write(frame)
        if i % step == 0:
            print(f"  {100 * i / TOTAL:5.1f}%  ({i}/{TOTAL})")
    writer.release()
    print(f"Done: {out_path}")
    print(f"Size: {out_path.stat().st_size / (1024 * 1024):.2f} MB")


if __name__ == "__main__":
    main()
