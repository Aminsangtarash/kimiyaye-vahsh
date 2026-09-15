# -*- coding: utf-8 -*-
"""Render special-card family (distinct from animal suits)."""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont
import arabic_reshaper
from bidi.algorithm import get_display

ROOT = Path(__file__).resolve().parents[1]
W, H = 1000, 1400
TOKENS = json.loads((ROOT / "data/design-tokens.json").read_text(encoding="utf-8"))["specialFamily"]
SPECIALS = json.loads((ROOT / "data/special-cards.json").read_text(encoding="utf-8"))["cards"]

FONT = Path(r"C:\Windows\Fonts\tahoma.ttf")
FONT_B = Path(r"C:\Windows\Fonts\tahomabd.ttf")
if not FONT_B.exists():
    FONT_B = FONT


def font(size, bold=False):
    return ImageFont.truetype(str(FONT_B if bold else FONT), size)


def persian(text: str) -> str:
    return get_display(arabic_reshaper.reshape(text))


def draw_seal(draw, cx, cy, color, scale=34):
    # alchemical octagon + inner diamond
    s = scale
    pts = []
    for i in range(8):
        ang = (i / 8) * 3.14159265 * 2 - 3.14159265 / 8
        import math
        pts.append((cx + int(math.cos(ang) * s), cy + int(math.sin(ang) * s)))
    draw.polygon(pts, outline=color)
    d = scale // 2
    draw.polygon([(cx, cy - d), (cx + d, cy), (cx, cy + d), (cx - d, cy)], outline=color)
    draw.ellipse([cx - 6, cy - 6, cx + 6, cy + 6], fill=color)


ICON_GLYPH = {
    "adrenaline": "⚡",
    "poison": "☠",
    "chameleon": "◐",
    "shield": "◈",
    "scout": "◎",
    "silence": "✕",
    "anchor": "⚓",
}


def compose_special(card: dict, art: Image.Image, mode="clean") -> Image.Image:
    primary = tuple(TOKENS["primary"])
    secondary = tuple(TOKENS["secondary"])
    accent = tuple(TOKENS["accent"])
    highlight = tuple(TOKENS["highlight"])

    if mode == "presentation":
        canvas = Image.new("RGB", (W + 120, H + 120), (245, 245, 248))
        ox, oy = 60, 60
    else:
        canvas = Image.new("RGB", (W, H), (255, 255, 255))
        ox, oy = 0, 0

    card_img = Image.new("RGB", (W, H), secondary)
    draw = ImageDraw.Draw(card_img)
    draw.rounded_rectangle([28, 28, W - 28, H - 28], 28, fill=primary, outline=accent, width=14)
    draw.rounded_rectangle([46, 46, W - 46, H - 46], 22, outline=highlight, width=3)

    # art window
    pw0, ph0, pw1, ph1 = 70, 160, W - 70, H - 280
    draw.rounded_rectangle([pw0 - 4, ph0 - 4, pw1 + 4, ph1 + 4], 18, outline=accent, width=3)
    target = (pw1 - pw0, ph1 - ph0)
    art = art.convert("RGB").resize(target, Image.Resampling.LANCZOS)
    mask = Image.new("L", target, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, target[0], target[1]], 16, fill=255)
    card_img.paste(art, (pw0, ph0), mask)

    # top badge
    draw.rounded_rectangle([56, 48, 200, 120], 16, fill=(50, 36, 24), outline=accent, width=3)
    draw.text((74, 62), "SPECIAL", fill=highlight, font=font(28, True))
    draw_seal(draw, W - 100, 90, accent, 28)
    draw_seal(draw, 100, H - 250, accent, 20)

    # name plate
    draw.rounded_rectangle([70, H - 230, W - 70, H - 70], 16, fill=(20, 16, 14), outline=accent, width=3)
    name = persian(card["persianName"])
    nf = font(46, True)
    bbox = draw.textbbox((0, 0), name, font=nf)
    tw = bbox[2] - bbox[0]
    draw.text(((W - tw) / 2, H - 200), name, fill=(250, 240, 220), font=nf)
    en = card["englishName"]
    ef = font(26)
    bbox = draw.textbbox((0, 0), en, font=ef)
    tw = bbox[2] - bbox[0]
    draw.text(((W - tw) / 2, H - 140), en, fill=(200, 180, 140), font=ef)
    # short effect line
    eff = card["effect"]
    if len(eff) > 64:
        eff = eff[:61] + "..."
    ef2 = font(18)
    bbox = draw.textbbox((0, 0), eff, font=ef2)
    tw = bbox[2] - bbox[0]
    draw.text(((W - tw) / 2, H - 100), eff, fill=(170, 155, 130), font=ef2)

    if mode == "presentation":
        shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        sd = ImageDraw.Draw(shadow)
        sd.rounded_rectangle([ox + 10, oy + 14, ox + W + 10, oy + H + 14], 30, fill=(0, 0, 0, 70))
        shadow = shadow.filter(ImageFilter.GaussianBlur(18))
        canvas = Image.alpha_composite(canvas.convert("RGBA"), shadow).convert("RGB")
        canvas.paste(card_img, (ox, oy))
        return canvas
    return card_img


def main():
    art_dir = ROOT / "assets/cards/special/portraits"
    clean_dir = ROOT / "assets/cards/special/final/clean"
    pres_dir = ROOT / "assets/cards/special/final/presentation"
    clean_dir.mkdir(parents=True, exist_ok=True)
    pres_dir.mkdir(parents=True, exist_ok=True)
    art_dir.mkdir(parents=True, exist_ok=True)

    rendered = []
    for card in SPECIALS:
        art_path = art_dir / f"{card['slug']}.png"
        if not art_path.exists():
            # deterministic placeholder if art missing
            ph = Image.new("RGB", (864, 1152), tuple(TOKENS["primary"]))
            d = ImageDraw.Draw(ph)
            d.ellipse([180, 280, 684, 784], outline=tuple(TOKENS["accent"]), width=8)
            d.text((320, 500), card["englishName"][:10], fill=tuple(TOKENS["highlight"]), font=font(36, True))
            ph.save(art_path)
            status = "placeholder"
        else:
            status = "artwork"
        art = Image.open(art_path)
        clean = compose_special(card, art, "clean")
        pres = compose_special(card, art, "presentation")
        cpath = clean_dir / f"{card['slug']}.png"
        ppath = pres_dir / f"{card['slug']}.png"
        clean.save(cpath, "PNG")
        clean.save(cpath.with_suffix(".webp"), "WEBP", quality=90, method=4)
        pres.save(ppath, "PNG")
        rendered.append({"id": card["id"], "clean": str(cpath.relative_to(ROOT)).replace('\\', '/'), "status": status})

    # contact sheet
    review = ROOT / "review/special-cards"
    review.mkdir(parents=True, exist_ok=True)
    thumbs = []
    for card in SPECIALS:
        thumbs.append(Image.open(clean_dir / f"{card['slug']}.png").convert("RGB").resize((200, 280), Image.Resampling.LANCZOS))
    cols = 4
    rows = (len(thumbs) + cols - 1) // cols
    pad = 16
    sheet = Image.new("RGB", (cols * 200 + (cols + 1) * pad, rows * 280 + (rows + 1) * pad + 40), (248, 246, 242))
    d = ImageDraw.Draw(sheet)
    d.text((pad, 10), "Kimiyaye Vahsh — Special Card Family", fill=(30, 30, 30), font=font(22, True))
    for i, im in enumerate(thumbs):
        r, c = divmod(i, cols)
        sheet.paste(im, (pad + c * (200 + pad), 40 + pad + r * (280 + pad)))
    sheet.save(review / "special-contact-sheet.jpg", "JPEG", quality=92)
    print(json.dumps(rendered, indent=2))


if __name__ == "__main__":
    main()
