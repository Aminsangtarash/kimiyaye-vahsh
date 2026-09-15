# -*- coding: utf-8 -*-
"""Kimiyaye Vahsh premium card renderer — reference-aligned shell.

Layout target (Behemoth reference):
- cream/white outer border
- metallic braided rectangular frame
- circular braided portrait seal
- vertical 13-segment power bars (mirrored L/R)
- hex rank seals TL/BR with optically centered glyphs
- suit icon tiles TR/BL
- light nameplate with metal rim
"""
from __future__ import annotations

import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance, ImageChops
import arabic_reshaper
from bidi.algorithm import get_display

ROOT = Path(r"d:\Projects\card game\site")
DATA = ROOT / "data"
W, H = 1000, 1400

SUIT_THEME = {
    "carnivore": {
        "name": "Carnivore",
        "primary": (148, 24, 32),
        "secondary": (42, 12, 14),
        "accent": (232, 176, 96),
        "metal": (196, 120, 64),
        "metal_hi": (255, 210, 150),
        "metal_lo": (120, 60, 28),
        "fill_bar": (210, 72, 62),
        "fill_bar_leg": (240, 190, 90),
        "plate": (250, 244, 236),
        "plate_ink": (40, 18, 16),
        "symbol": "fang",
        "motif": "claw",
    },
    "herbivore": {
        "name": "Herbivore",
        "primary": (28, 110, 58),
        "secondary": (10, 36, 24),
        "accent": (170, 210, 120),
        "metal": (184, 140, 72),
        "metal_hi": (236, 206, 140),
        "metal_lo": (110, 78, 36),
        "fill_bar": (56, 196, 96),
        "fill_bar_leg": (72, 220, 110),
        "plate": (252, 250, 244),
        "plate_ink": (22, 40, 28),
        "symbol": "leaf",
        "motif": "vine",
    },
    "bird": {
        "name": "Bird",
        "primary": (32, 78, 148),
        "secondary": (10, 24, 52),
        "accent": (168, 206, 255),
        "metal": (150, 170, 210),
        "metal_hi": (220, 230, 255),
        "metal_lo": (70, 90, 130),
        "fill_bar": (72, 140, 220),
        "fill_bar_leg": (120, 180, 255),
        "plate": (246, 248, 252),
        "plate_ink": (18, 28, 48),
        "symbol": "feather",
        "motif": "wing",
    },
    "reptile": {
        "name": "Reptile",
        "primary": (96, 44, 132),
        "secondary": (28, 12, 42),
        "accent": (208, 168, 255),
        "metal": (168, 120, 72),
        "metal_hi": (230, 190, 130),
        "metal_lo": (96, 64, 36),
        "fill_bar": (150, 90, 200),
        "fill_bar_leg": (190, 130, 240),
        "plate": (250, 246, 252),
        "plate_ink": (36, 18, 48),
        "symbol": "scale",
        "motif": "coil",
    },
}

_FONT_DIR = ROOT / "assets" / "fonts"
# Mysterious but readable: Amiri (Persian calligraphy) + Cinzel (Latin ranks / English)
# Note: El Messiri lacks Persian codepoints (ی/ک/ه‍) — do not use for FA names.
_FONT_FA_BOLD = [
    _FONT_DIR / "Amiri-Bold.ttf",
    _FONT_DIR / "Vazirmatn-Bold.ttf",
    Path(r"C:\Windows\Fonts\tahomabd.ttf"),
]
_FONT_FA = [
    _FONT_DIR / "Amiri-Regular.ttf",
    _FONT_DIR / "Vazirmatn-Regular.ttf",
    Path(r"C:\Windows\Fonts\tahoma.ttf"),
]
_FONT_EN_BOLD = [
    _FONT_DIR / "Cinzel-Bold.ttf",
    _FONT_DIR / "Cinzel-SemiBold.ttf",
    _FONT_DIR / "Vazirmatn-Bold.ttf",
    Path(r"C:\Windows\Fonts\georgiab.ttf"),
]
_FONT_EN = [
    _FONT_DIR / "Cinzel-Regular.ttf",
    _FONT_DIR / "Cinzel-SemiBold.ttf",
    _FONT_DIR / "Vazirmatn-Regular.ttf",
    Path(r"C:\Windows\Fonts\georgia.ttf"),
]


def _pick_font(cands: list[Path]) -> Path:
    for p in cands:
        if p.exists():
            return p
    return Path(r"C:\Windows\Fonts\tahoma.ttf")


FONT_FA = _pick_font(_FONT_FA)
FONT_FA_B = _pick_font(_FONT_FA_BOLD)
FONT_EN = _pick_font(_FONT_EN)
FONT_EN_B = _pick_font(_FONT_EN_BOLD)
# Back-compat aliases used by review sheets
FONT = FONT_EN
FONT_B = FONT_FA_B


def persian(text: str) -> str:
    return get_display(arabic_reshaper.reshape(text))


def load_rank_model():
    return json.loads((DATA / "rank-model.json").read_text(encoding="utf-8"))


def load_cards_by_id():
    doc = json.loads((DATA / "cards.json").read_text(encoding="utf-8"))
    return {c["id"]: c for c in doc["cards"]}


def font(size: int, bold: bool = False, face: str = "fa"):
    """face: 'fa' for Persian (Amiri), 'en' for Latin (Cinzel)."""
    if face == "en":
        path = FONT_EN_B if bold else FONT_EN
    else:
        path = FONT_FA_B if bold else FONT_FA
    return ImageFont.truetype(str(path), size)


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def draw_poly(draw, pts, fill=None, outline=None, width=1):
    draw.polygon(pts, fill=fill, outline=outline)
    if outline and width > 1:
        draw.line(pts + [pts[0]], fill=outline, width=width)


def ink_center_delta(text: str, fnt) -> tuple[float, float]:
    """Offset so the *ink* bbox center lands on the draw point (not font metrics)."""
    probe = Image.new("L", (256, 256), 0)
    pd = ImageDraw.Draw(probe)
    pd.text((128, 128), text, fill=255, font=fnt, anchor="mm")
    bbox = probe.getbbox()
    if not bbox:
        return 0.0, 0.0
    ink_cx = (bbox[0] + bbox[2]) / 2.0
    ink_cy = (bbox[1] + bbox[3]) / 2.0
    return 128.0 - ink_cx, 128.0 - ink_cy


def centered_text(draw, xy, text, fill, fnt, shadow=None):
    """Optically center glyph ink inside its badge/plate."""
    cx, cy = xy
    dx, dy = ink_center_delta(text, fnt)
    x, y = cx + dx, cy + dy
    if shadow:
        draw.text((x + 1, y + 1), text, fill=shadow, font=fnt, anchor="mm")
    draw.text((x, y), text, fill=fill, font=fnt, anchor="mm")


# ── Suit icons ───────────────────────────────────────────────────────────────

def _shade(color, toward, t):
    return lerp(color, toward, t)


def draw_suit_symbol(draw, cx, cy, kind, color, scale=28):
    """Premium suit seals — readable at thumbnail, mystic at card size."""
    s = float(scale)
    hi = _shade(color, (255, 250, 235), 0.35)
    lo = _shade(color, (8, 6, 10), 0.45)
    ink = (14, 12, 16)

    if kind == "fang":
        # Triple claw slash + central fang — reads at tiny size, predatory seal
        for i, (ox, thick) in enumerate(((-0.55, 0.14), (0.0, 0.18), (0.55, 0.14))):
            claw = [
                (cx + s * (ox - thick * 0.35), cy - s * 0.95),
                (cx + s * (ox + thick * 0.55), cy - s * 0.88),
                (cx + s * (ox + thick * 0.15), cy + s * 0.55),
                (cx + s * (ox - thick * 0.25), cy + s * 0.35),
            ]
            draw_poly(draw, claw, fill=hi if i == 1 else color)
        fang = [
            (cx - s * 0.16, cy + s * 0.2),
            (cx + s * 0.16, cy + s * 0.2),
            (cx, cy + s * 1.05),
        ]
        draw_poly(draw, fang, fill=hi)
        draw.line([(cx, cy + s * 0.25), (cx, cy + s * 0.85)], fill=lo, width=max(1, int(s * 0.06)))
        draw.arc(
            [cx - s * 0.95, cy - s * 1.15, cx + s * 0.95, cy - s * 0.15],
            210,
            330,
            fill=lo,
            width=max(2, int(s * 0.14)),
        )

    elif kind == "leaf":
        # Sacred ash leaf with stem — herbivore seal
        leaf = [
            (cx, cy - s * 1.05),
            (cx + s * 0.55, cy - s * 0.55),
            (cx + s * 0.78, cy + s * 0.05),
            (cx + s * 0.42, cy + s * 0.55),
            (cx, cy + s * 0.85),
            (cx - s * 0.42, cy + s * 0.55),
            (cx - s * 0.78, cy + s * 0.05),
            (cx - s * 0.55, cy - s * 0.55),
        ]
        draw_poly(draw, leaf, fill=color)
        # soft highlight lobe
        draw_poly(
            draw,
            [
                (cx - s * 0.08, cy - s * 0.85),
                (cx + s * 0.35, cy - s * 0.45),
                (cx + s * 0.28, cy + s * 0.05),
                (cx - s * 0.05, cy + s * 0.15),
            ],
            fill=hi,
        )
        # midrib + side veins
        draw.line([(cx, cy - s * 0.95), (cx, cy + s * 0.78)], fill=ink, width=max(2, int(s * 0.1)))
        for t in (-0.55, -0.2, 0.15, 0.45):
            y = cy + s * t
            draw.line([(cx, y), (cx + s * 0.42, y - s * 0.18)], fill=ink, width=max(1, int(s * 0.05)))
            draw.line([(cx, y + s * 0.06), (cx - s * 0.42, y - s * 0.12)], fill=ink, width=max(1, int(s * 0.05)))
        # stem
        draw.line([(cx, cy + s * 0.78), (cx, cy + s * 1.05)], fill=lo, width=max(2, int(s * 0.12)))
        draw.ellipse([cx - s * 0.1, cy + s * 0.95, cx + s * 0.1, cy + s * 1.12], fill=lo)

    elif kind == "feather":
        # Curved mystic plume — bird seal
        plume = [
            (cx - s * 0.08, cy - s * 1.05),
            (cx + s * 0.42, cy - s * 0.55),
            (cx + s * 0.55, cy + s * 0.05),
            (cx + s * 0.28, cy + s * 0.55),
            (cx + s * 0.06, cy + s * 0.95),
            (cx - s * 0.12, cy + s * 0.55),
            (cx - s * 0.38, cy + s * 0.05),
            (cx - s * 0.48, cy - s * 0.45),
        ]
        draw_poly(draw, plume, fill=color)
        # inner vane highlight
        draw_poly(
            draw,
            [
                (cx - s * 0.02, cy - s * 0.85),
                (cx + s * 0.22, cy - s * 0.35),
                (cx + s * 0.18, cy + s * 0.25),
                (cx - s * 0.02, cy + s * 0.55),
                (cx - s * 0.18, cy + s * 0.05),
                (cx - s * 0.22, cy - s * 0.35),
            ],
            fill=hi,
        )
        # rachis
        draw.line(
            [(cx - s * 0.02, cy - s * 0.95), (cx + s * 0.04, cy + s * 0.88)],
            fill=ink,
            width=max(2, int(s * 0.1)),
        )
        # barbs
        for i in range(-3, 4):
            y = cy + i * s * 0.18
            slant = 0.08 * i
            draw.line(
                [(cx + s * slant, y), (cx + s * (0.38 + slant * 0.2), y - s * 0.1)],
                fill=ink,
                width=max(1, int(s * 0.045)),
            )
            draw.line(
                [(cx + s * slant, y + s * 0.04), (cx - s * (0.32 - slant * 0.2), y - s * 0.06)],
                fill=lo,
                width=max(1, int(s * 0.04)),
            )
        # tip spark
        draw.ellipse([cx - s * 0.14, cy - s * 1.12, cx + s * 0.1, cy - s * 0.88], fill=hi)

    else:
        # Triple diamond scales with coiled hint — reptile seal
        def diamond(ox, oy, rs, fill):
            pts = [
                (ox, oy - rs),
                (ox + rs * 0.72, oy),
                (ox, oy + rs),
                (ox - rs * 0.72, oy),
            ]
            draw_poly(draw, pts, fill=fill)

        diamond(cx - s * 0.28, cy + s * 0.08, s * 0.52, lo)
        diamond(cx + s * 0.28, cy + s * 0.08, s * 0.52, lo)
        diamond(cx, cy - s * 0.22, s * 0.62, color)
        # inner facet on top scale
        diamond(cx, cy - s * 0.28, s * 0.28, hi)
        # tiny pupil gem — alchemy eye
        draw.ellipse(
            [cx - s * 0.16, cy - s * 0.38, cx + s * 0.16, cy - s * 0.06],
            fill=ink,
        )
        draw.ellipse(
            [cx - s * 0.07, cy - s * 0.32, cx + s * 0.07, cy - s * 0.14],
            fill=hi,
        )
        # coil underline
        draw.arc(
            [cx - s * 0.85, cy + s * 0.15, cx + s * 0.85, cy + s * 1.05],
            200,
            340,
            fill=color,
            width=max(2, int(s * 0.14)),
        )


def draw_icon_tile(draw, cx, cy, theme, legendary, size=44):
    """Dark medallion tile with metal rim and suit seal."""
    half = size
    metal = theme["metal_hi"] if legendary else theme["metal"]
    box = [cx - half, cy - half, cx + half, cy + half]
    draw.rounded_rectangle(box, 10, fill=(12, 10, 14), outline=metal, width=4)
    draw.rounded_rectangle(
        [cx - half + 5, cy - half + 5, cx + half - 5, cy + half - 5],
        7,
        outline=theme["metal_lo"],
        width=2,
    )
    # circular well so the seal feels engraved
    well_r = int(half * 0.72)
    draw.ellipse(
        [cx - well_r, cy - well_r, cx + well_r, cy + well_r],
        fill=(8, 7, 10),
        outline=_shade(metal, theme["accent"], 0.25),
        width=2,
    )
    if legendary:
        draw.ellipse(
            [cx - well_r + 3, cy - well_r + 3, cx + well_r - 3, cy + well_r - 3],
            outline=(255, 228, 150),
            width=1,
        )
    draw_suit_symbol(draw, cx, cy, theme["symbol"], theme["accent"], scale=30 if size >= 48 else 24)


# ── Rank medallion ───────────────────────────────────────────────────────────

def hexagon(cx, cy, r):
    return [
        (cx + r * math.cos(math.radians(60 * i - 30)), cy + r * math.sin(math.radians(60 * i - 30)))
        for i in range(6)
    ]


def draw_rank_badge(card_img: Image.Image, cx, cy, text, theme, legendary=False, rotate_180=False):
    """Thematic hex seal; bottom-right corner can be inverted for opponent readability."""
    r = 86 if legendary else 80
    side = r * 2 + 22
    layer = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    lx = ly = side / 2

    draw_poly(draw, hexagon(lx + 3, ly + 5, r), fill=(0, 0, 0, 200))

    ring = theme["metal_hi"] if legendary else theme["metal"]
    draw_poly(draw, hexagon(lx, ly, r), fill=ring)
    draw.line(hexagon(lx, ly, r) + [hexagon(lx, ly, r)[0]], fill=lerp(ring, (255, 245, 210), 0.45), width=3)

    trough = lerp(theme["secondary"], (4, 4, 6), 0.35)
    draw_poly(draw, hexagon(lx, ly, r - 7), fill=trough)
    draw.line(
        hexagon(lx, ly, r - 7) + [hexagon(lx, ly, r - 7)[0]],
        fill=lerp(theme["metal_lo"], theme["accent"], 0.25),
        width=2,
    )

    gem = lerp(theme["primary"], (8, 6, 10), 0.18)
    draw_poly(draw, hexagon(lx, ly, r - 14), fill=gem)
    hi_gem = lerp(gem, theme["accent"], 0.28)
    draw_poly(draw, hexagon(lx - 2, ly - 3, r - 28), fill=hi_gem)
    draw_poly(draw, hexagon(lx, ly, r - 22), fill=gem)
    draw.line(
        hexagon(lx, ly, r - 14) + [hexagon(lx, ly, r - 14)[0]],
        fill=lerp(theme["accent"], (255, 255, 255), 0.35),
        width=2,
    )

    for i in range(6):
        ang = math.radians(60 * i - 30)
        x0 = lx + (r - 4) * math.cos(ang)
        y0 = ly + (r - 4) * math.sin(ang)
        x1 = lx + (r - 11) * math.cos(ang)
        y1 = ly + (r - 11) * math.sin(ang)
        draw.line([(x0, y0), (x1, y1)], fill=lerp(ring, theme["accent"], 0.4), width=2)

    if legendary:
        draw.line(hexagon(lx, ly, r - 2) + [hexagon(lx, ly, r - 2)[0]], fill=(255, 228, 150), width=3)
        draw.ellipse([lx - 6, ly - 6, lx + 6, ly + 6], outline=(255, 220, 140, 180), width=1)

    label = str(text)
    size = 98 if len(label) == 1 else (80 if len(label) == 2 else 64)
    fnt = font(size, bold=True, face="en")
    probe = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    pd = ImageDraw.Draw(probe)
    pd.text((lx, ly), label, fill=(255, 255, 255, 255), font=fnt, anchor="mm")
    bbox = probe.split()[-1].getbbox()
    shift_x = shift_y = 0.0
    if bbox:
        ink_cx = (bbox[0] + bbox[2]) / 2.0
        ink_cy = (bbox[1] + bbox[3]) / 2.0
        shift_x = lx - ink_cx
        shift_y = ly - ink_cy
    draw.text((lx + shift_x + 2, ly + shift_y + 2), label, fill=(8, 10, 12, 230), font=fnt, anchor="mm")
    draw.text((lx + shift_x, ly + shift_y), label, fill=(255, 252, 245, 255), font=fnt, anchor="mm")

    if rotate_180:
        layer = layer.rotate(180, expand=False)

    px = int(round(cx - side / 2))
    py = int(round(cy - side / 2))
    card_img.alpha_composite(layer, (px, py))
    return r


# ── Vertical power bars (13 segments, mirrored) ──────────────────────────────

POWER_SEG_W = 40
POWER_SEG_H = 38
POWER_SEG_GAP = 5
POWER_BAR_PAD = 10
POWER_SEGMENTS = 13


def power_bar_total_h(segments: int = POWER_SEGMENTS) -> int:
    return segments * POWER_SEG_H + (segments - 1) * POWER_SEG_GAP


def draw_vertical_power_bar(
    card_img: Image.Image,
    x,
    y_top,
    fill_n,
    theme,
    legendary=False,
    segments=POWER_SEGMENTS,
    rotate_180=False,
):
    """Bottom-up fill in a carved channel; bottom-right rail can be inverted 180°."""
    seg_w, seg_h, gap = POWER_SEG_W, POWER_SEG_H, POWER_SEG_GAP
    total_h = power_bar_total_h(segments)
    pad = POWER_BAR_PAD
    margin = 3
    layer_w = seg_w + 2 * pad + 2 * margin
    layer_h = total_h + 2 * pad + 2 * margin
    layer = Image.new("RGBA", (layer_w, layer_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    ox = margin + pad
    oy = margin + pad

    housing = [ox - pad, oy - pad, ox + seg_w + pad, oy + total_h + pad]
    metal = theme["metal_hi"] if legendary else theme["metal"]
    draw.rounded_rectangle(housing, 10, fill=(4, 4, 6, 255), outline=metal + (255,), width=5)
    draw.rounded_rectangle(
        [housing[0] + 3, housing[1] + 3, housing[2] - 3, housing[3] - 3],
        8,
        outline=lerp(metal, (255, 245, 210), 0.45 if legendary else 0.28) + (255,),
        width=2,
    )
    on = theme["fill_bar_leg"] if legendary else theme["fill_bar"]
    on = lerp(on, (255, 255, 255), 0.22)
    off = (10, 10, 12)
    off_edge = lerp(metal, (70, 70, 78), 0.55)
    for i in range(segments):
        sy = oy + (segments - 1 - i) * (seg_h + gap)
        filled = i < fill_n
        box = [ox, sy, ox + seg_w, sy + seg_h]
        if filled:
            draw.rounded_rectangle(box, 6, fill=on + (255,), outline=lerp(on, (0, 0, 0), 0.28) + (255,), width=2)
            draw.line([(ox + 5, sy + 5), (ox + seg_w - 5, sy + 5)], fill=lerp(on, (255, 255, 255), 0.62) + (255,), width=3)
            draw.line([(ox + 5, sy + 9), (ox + seg_w - 5, sy + 9)], fill=lerp(on, (255, 255, 255), 0.28) + (255,), width=1)
            draw.line(
                [(ox + 5, sy + seg_h - 6), (ox + seg_w - 5, sy + seg_h - 6)],
                fill=lerp(on, (0, 0, 0), 0.45) + (255,),
                width=2,
            )
            draw.line([(ox + 4, sy + 7), (ox + 4, sy + seg_h - 7)], fill=lerp(on, (255, 255, 255), 0.4) + (255,), width=3)
            draw.line(
                [(ox + seg_w - 4, sy + 7), (ox + seg_w - 4, sy + seg_h - 7)],
                fill=lerp(on, (0, 0, 0), 0.25) + (255,),
                width=2,
            )
        else:
            draw.rounded_rectangle(box, 6, fill=off + (255,), outline=off_edge + (255,), width=2)
            draw.rectangle(
                [ox + 6, sy + 6, ox + seg_w - 6, sy + seg_h - 6],
                fill=(6, 6, 8, 255),
                outline=(28, 28, 32, 255),
                width=1,
            )

    if rotate_180:
        layer = layer.rotate(180, expand=False)

    px = int(round(x - pad - margin))
    py = int(round(y_top - pad - margin))
    card_img.alpha_composite(layer, (px, py))
    return total_h


# ── Ornate metallic frames ───────────────────────────────────────────────────

def draw_mystic_border(draw, box, theme, legendary, thickness=28):
    """Patterned mysterious outer frame — weave, seals, corner sigils."""
    x0, y0, x1, y1 = [int(v) for v in box]
    lo, mid = theme["metal_lo"], theme["metal"]
    hi = theme["metal_hi"] if legendary else lerp(theme["metal"], (255, 240, 200), 0.28)
    accent = theme["accent"]

    # layered metal trough
    for i in range(thickness):
        t = i / max(1, thickness - 1)
        col = lerp(lo, hi, 0.15 + 0.7 * abs(0.5 - t) * 2)
        draw.rounded_rectangle([x0 + i, y0 + i, x1 - i, y1 - i], 18 - i // 3, outline=col, width=1)

    # inner luminous lip
    inset = thickness // 2
    draw.rounded_rectangle(
        [x0 + inset, y0 + inset, x1 - inset, y1 - inset],
        14,
        outline=hi,
        width=3,
    )
    draw.rounded_rectangle(
        [x0 + inset + 5, y0 + inset + 5, x1 - inset - 5, y1 - inset - 5],
        12,
        outline=lerp(mid, accent, 0.35),
        width=1,
    )

    # mystic bead / rune ticks along edges
    step = 14
    bead_r = 3
    for x in range(x0 + thickness + 6, x1 - thickness - 6, step):
        for yy, flip in ((y0 + thickness // 2, 1), (y1 - thickness // 2, -1)):
            odd = (x // step) % 2 == 0
            draw.ellipse([x - bead_r, yy - bead_r, x + bead_r, yy + bead_r], fill=hi if odd else mid)
            draw.line([(x, yy), (x, yy + flip * (thickness // 2 - 2))], fill=accent, width=1)
            if odd:
                draw.line([(x - 4, yy + flip * 4), (x + 4, yy + flip * 4)], fill=hi, width=1)
    for y in range(y0 + thickness + 6, y1 - thickness - 6, step):
        for xx, flip in ((x0 + thickness // 2, 1), (x1 - thickness // 2, -1)):
            odd = (y // step) % 2 == 0
            draw.ellipse([xx - bead_r, y - bead_r, xx + bead_r, y + bead_r], fill=hi if odd else mid)
            draw.line([(xx, y), (xx + flip * (thickness // 2 - 2), y)], fill=accent, width=1)
            if odd:
                # tiny chevron / seal tick
                draw.polygon(
                    [
                        (xx + flip * 6, y),
                        (xx + flip * 12, y - 4),
                        (xx + flip * 12, y + 4),
                    ],
                    outline=accent,
                )

    # corner ritual seals (diamond + arc + inner spark)
    seal = 40
    for cx, cy, sx, sy in (
        (x0 + thickness + 10, y0 + thickness + 10, 1, 1),
        (x1 - thickness - 10, y0 + thickness + 10, -1, 1),
        (x0 + thickness + 10, y1 - thickness - 10, 1, -1),
        (x1 - thickness - 10, y1 - thickness - 10, -1, -1),
    ):
        pts = [
            (cx, cy - seal // 2 * sy),
            (cx + seal // 2 * sx, cy),
            (cx, cy + seal // 2 * sy),
            (cx - seal // 2 * sx, cy),
        ]
        draw.polygon(pts, outline=hi)
        draw.polygon(
            [
                (cx, cy - seal // 4 * sy),
                (cx + seal // 4 * sx, cy),
                (cx, cy + seal // 4 * sy),
                (cx - seal // 4 * sx, cy),
            ],
            outline=accent,
        )
        draw.ellipse([cx - 5, cy - 5, cx + 5, cy + 5], fill=lerp(mid, accent, 0.4), outline=hi, width=1)
        draw.arc([cx - 18, cy - 18, cx + 18, cy + 18], 0, 300, fill=mid, width=2)


def draw_portrait_window_frame(draw, box, theme, legendary, radius=18, top_open=False):
    """Ornate rounded-rect lip around the portrait window."""
    x0, y0, x1, y1 = box
    lo, mid = theme["metal_lo"], theme["metal"]
    hi = theme["metal_hi"] if legendary else lerp(theme["metal"], (255, 240, 200), 0.25)
    accent = theme["accent"]

    draw.rounded_rectangle([x0 - 10, y0 - 10, x1 + 10, y1 + 10], radius + 6, outline=lo, width=6)
    draw.rounded_rectangle([x0 - 6, y0 - 6, x1 + 6, y1 + 6], radius + 4, outline=hi, width=3)
    draw.rounded_rectangle([x0 - 2, y0 - 2, x1 + 2, y1 + 2], radius + 2, outline=accent, width=2)

    step = 14
    # bottom + sides hash marks
    for x in range(x0 + 12, x1 - 12, step):
        draw.line([(x, y1 + 2), (x + 5, y1 + 7)], fill=hi, width=1)
    for y in range(y0 + 12, y1 - 12, step):
        draw.line([(x0 - 7, y), (x0 - 2, y + 5)], fill=mid, width=1)
        draw.line([(x1 + 2, y), (x1 + 7, y + 5)], fill=mid, width=1)

    if top_open:
        # open top for breakout — only corner guides
        draw.arc([x0 - 6, y0 - 6, x0 + radius * 2, y0 + radius * 2], 180, 270, fill=hi, width=3)
        draw.arc([x1 - radius * 2, y0 - 6, x1 + 6, y0 + radius * 2], 270, 360, fill=hi, width=3)
    else:
        for x in range(x0 + 12, x1 - 12, step):
            draw.line([(x, y0 - 7), (x + 5, y0 - 2)], fill=hi, width=1)


def paste_rounded_portrait_with_breakout(
    card_img: Image.Image,
    portrait_src: Image.Image,
    box: tuple[int, int, int, int],
    portrait_concept: str | None,
    theme: dict,
    legendary: bool = False,
    corner_radius: int = 18,
):
    """Tall rounded-rect portrait filling the card; crown features may break out top."""
    pw0, ph0, pw1, ph1 = box
    tw, th = pw1 - pw0, ph1 - ph0
    # Extra headroom above the window for antlers / ears / crests
    headroom = 100
    tall_h = th + headroom
    fitted = fit_portrait(portrait_src, tw, tall_h, portrait_concept, legendary=legendary)

    # Window shows the lower part of the tall crop (animal sits in frame, crest in headroom)
    y0 = headroom - 48  # how much crest sits above the window edge
    y0 = max(0, min(y0, tall_h - th))
    window = fitted.crop((0, y0, tw, y0 + th))

    mask = Image.new("L", (tw, th), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, tw - 1, th - 1], corner_radius, fill=255)
    card_img.paste(window, (pw0, ph0), mask)

    vig = Image.new("RGBA", (tw, th), (0, 0, 0, 0))
    vd = ImageDraw.Draw(vig)
    for i in range(26):
        a = int(75 * (i / 26) ** 1.3)
        vd.rounded_rectangle([i, i, tw - 1 - i, th - 1 - i], corner_radius, outline=(0, 0, 0, a))
    card_img.alpha_composite(vig, (pw0, ph0))

    draw = ImageDraw.Draw(card_img)
    draw_portrait_window_frame(
        draw, [pw0, ph0, pw1, ph1], theme, legendary, radius=corner_radius, top_open=True
    )

    # Breakout strip: from top of fitted down past the window top
    strip_bottom = y0 + 50
    strip = fitted.crop((0, 0, tw, strip_bottom))
    geom = Image.new("L", strip.size, 255)
    overflow = animal_breakout_alpha(strip, geom)
    # Only above + slight into window
    clip = Image.new("L", strip.size, 0)
    ImageDraw.Draw(clip).rectangle([0, 0, tw, y0 + 44], fill=255)
    overflow = ImageChops.multiply(overflow, clip)
    paste_y = ph0 - y0
    card_img.paste(strip, (pw0, paste_y), overflow)

    # Reinforce bottom/side lip after breakout
    hi = theme["metal_hi"] if legendary else lerp(theme["metal"], (255, 240, 200), 0.25)
    draw.rounded_rectangle([pw0 - 4, ph0 - 4, pw1 + 4, ph1 + 4], corner_radius + 2, outline=hi, width=2)
    draw.line([(pw0 + corner_radius, ph1 + 3), (pw1 - corner_radius, ph1 + 3)], fill=hi, width=3)


def compose_card(card: dict, portrait_path: Path, mode: str = "clean") -> Image.Image:
    theme = SUIT_THEME[card["suit"]]
    legendary = card["type"] == "legendary"
    fill_n = int(card["powerBarFill"])
    rank = str(card["displayRank"])
    portrait_concept = card.get("portraitConcept") or (card.get("artDirection") or {}).get("portraitConcept")

    if mode == "presentation":
        canvas = Image.new("RGB", (W + 120, H + 120), (242, 238, 232))
        ox, oy = 60, 60
    else:
        canvas = Image.new("RGB", (W, H), (255, 255, 255))
        ox, oy = 0, 0

    # cream outer margin
    card_img = Image.new("RGBA", (W, H), (248, 246, 240, 255))
    draw = ImageDraw.Draw(card_img)

    border = 26
    inner = [border, border, W - border, H - border]
    draw.rounded_rectangle(inner, 22, fill=theme["secondary"])
    paint_atmosphere(card_img, theme, legendary)
    draw = ImageDraw.Draw(card_img)

    braid_box = [border + 6, border + 6, W - border - 6, H - border - 6]
    draw_mystic_border(draw, braid_box, theme, legendary, thickness=30 if legendary else 26)

    portrait = Image.open(portrait_path).convert("RGB")
    if legendary:
        portrait = ImageEnhance.Color(portrait).enhance(1.12)
        portrait = ImageEnhance.Contrast(portrait).enhance(1.08)

    # Shared tall rounded-rect window — fills card, animal more visible
    if legendary:
        pw0, ph0, pw1, ph1 = 70, 100, W - 70, H - 180
    else:
        pw0, ph0, pw1, ph1 = 74, 104, W - 74, H - 184

    paste_rounded_portrait_with_breakout(
        card_img,
        portrait,
        (pw0, ph0, pw1, ph1),
        portrait_concept,
        theme,
        legendary=legendary,
        corner_radius=32 if legendary else 28,
    )
    draw = ImageDraw.Draw(card_img)

    # Rank seals + power rails — neat corner alignment.
    # Left: rail hangs under TL seal (centered on seal, small gap).
    # Right: rail sits above BR seal; both BR seal and rail inverted 180°.
    badge = 128
    badge_r = 86 if legendary else 80
    rail_gap = 12
    total_h = power_bar_total_h()
    seg_w = POWER_SEG_W

    tl_cx = tl_cy = badge
    br_cx, br_cy = W - badge, H - badge

    # Center rails on seal centers; flush to seal corners vertically
    left_x = int(round(tl_cx - seg_w / 2))
    left_bar_top = tl_cy + badge_r + rail_gap + POWER_BAR_PAD

    right_x = int(round(br_cx - seg_w / 2))
    right_bar_top = br_cy - badge_r - rail_gap - total_h - POWER_BAR_PAD

    # Nameplate inset so it never collides with corner seals
    draw_nameplate(
        card_img,
        theme,
        legendary,
        card["persianName"],
        card["englishName"],
        side_clear=badge + badge_r + 48,
    )
    draw = ImageDraw.Draw(card_img)
    draw_icon_tile(draw, W - badge, badge, theme, legendary, size=54)
    draw_icon_tile(draw, badge, H - badge, theme, legendary, size=54)

    draw_vertical_power_bar(card_img, left_x, left_bar_top, fill_n, theme, legendary=legendary, rotate_180=False)
    draw_vertical_power_bar(card_img, right_x, right_bar_top, fill_n, theme, legendary=legendary, rotate_180=True)

    # Seals last — always above nameplate
    draw_rank_badge(card_img, tl_cx, tl_cy, rank, theme, legendary=legendary, rotate_180=False)
    draw_rank_badge(card_img, br_cx, br_cy, rank, theme, legendary=legendary, rotate_180=True)

    card_rgb = card_img.convert("RGB")
    if mode == "presentation":
        shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        sd = ImageDraw.Draw(shadow)
        sd.rounded_rectangle([ox + 10, oy + 14, ox + W + 10, oy + H + 14], 30, fill=(0, 0, 0, 80))
        shadow = shadow.filter(ImageFilter.GaussianBlur(18))
        canvas = Image.alpha_composite(canvas.convert("RGBA"), shadow).convert("RGB")
        canvas.paste(card_rgb, (ox, oy))
        return canvas
    return card_rgb



def paint_atmosphere(img: Image.Image, theme: dict, legendary: bool):
    """Misty mysterious plate — clearer magical fog (less muddy blur)."""
    import random

    rng = random.Random(theme["primary"][0] * 97 + theme["primary"][1] * 13 + theme["primary"][2])
    base = lerp(theme["secondary"], theme["primary"], 0.18)
    plate = Image.new("RGBA", img.size, base + (255,))

    # soft depth wash — light blur only
    wash = Image.new("RGBA", img.size, (0, 0, 0, 0))
    wd = ImageDraw.Draw(wash)
    for i in range(12):
        t = i / 11
        c = lerp(theme["secondary"], theme["primary"], 0.15 + t * 0.4)
        a = int(28 + t * 45)
        pad_x = int(16 + i * 16)
        pad_y = int(24 + i * 18)
        wd.ellipse([pad_x - 50, pad_y - 10, W - pad_x + 50, H - pad_y - 30], fill=c + (a,))
    wash = wash.filter(ImageFilter.GaussianBlur(18))
    plate.alpha_composite(wash)

    # fog banks — readable shapes, moderate blur
    fog = Image.new("RGBA", img.size, (0, 0, 0, 0))
    fd = ImageDraw.Draw(fog)
    n_banks = 18 if legendary else 14
    for _ in range(n_banks):
        mix = rng.uniform(0.25, 0.75)
        c = lerp(theme["secondary"], theme["primary"], mix)
        if rng.random() < 0.5:
            c = lerp(c, theme["accent"], 0.32)
        a = rng.randint(90, 160)
        bw = rng.randint(160, 380)
        bh = rng.randint(90, 220)
        x = rng.randint(-80, W - 60)
        y = rng.randint(-40, H - 100)
        fd.ellipse([x, y, x + bw, y + bh], fill=c + (a,))
    fog = fog.filter(ImageFilter.GaussianBlur(22))
    plate.alpha_composite(fog)

    # luminous magical wisps — sharper, more defined
    wisps = Image.new("RGBA", img.size, (0, 0, 0, 0))
    wd = ImageDraw.Draw(wisps)
    for _ in range(16 if legendary else 12):
        c = lerp(theme["primary"], theme["accent"], rng.uniform(0.4, 0.85))
        a = rng.randint(70, 130)
        bw = rng.randint(100, 260)
        bh = rng.randint(40, 110)
        x = rng.randint(40, W - 160)
        y = rng.randint(70, H - 200)
        wd.ellipse([x, y, x + bw, y + bh], fill=c + (a,))
        # thin filament edge for clarity
        wd.ellipse([x + 4, y + 4, x + bw - 4, y + bh - 4], outline=c + (min(200, a + 40),), width=2)
    wisps = wisps.filter(ImageFilter.GaussianBlur(10))
    plate.alpha_composite(wisps)

    # crisp magical arcs / rune curls
    arcs = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ad = ImageDraw.Draw(arcs)
    for _ in range(10 if legendary else 7):
        c = lerp(theme["accent"], (255, 255, 255), rng.uniform(0.15, 0.45))
        a = rng.randint(90, 170)
        cx = rng.randint(80, W - 80)
        cy = rng.randint(100, H - 180)
        rr = rng.randint(40, 120)
        start = rng.randint(0, 300)
        ad.arc([cx - rr, cy - rr, cx + rr, cy + rr], start, start + rng.randint(50, 140), fill=c + (a,), width=2)
    arcs = arcs.filter(ImageFilter.GaussianBlur(1.2))
    plate.alpha_composite(arcs)

    # mote / star sparkles — keep sharp
    spark = Image.new("RGBA", img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(spark)
    for _ in range(140 if legendary else 100):
        x = rng.randint(45, W - 45)
        y = rng.randint(55, H - 160)
        a = rng.randint(100, 220)
        s = rng.randint(1, 3)
        col = (240, 245, 255, a) if rng.random() < 0.6 else theme["accent"] + (a,)
        sd.ellipse([x, y, x + s, y + s], fill=col)
        if rng.random() < 0.25:
            sd.line([(x - 2, y + s // 2), (x + s + 2, y + s // 2)], fill=col, width=1)
            sd.line([(x + s // 2, y - 2), (x + s // 2, y + s + 2)], fill=col, width=1)
    plate.alpha_composite(spark)

    # light vignette (don't crush mist)
    vig = Image.new("RGBA", img.size, (0, 0, 0, 0))
    vd = ImageDraw.Draw(vig)
    for i in range(40):
        a = int(1.5 + i * 1.2)
        vd.rectangle([i, i, W - 1 - i, H - 1 - i], outline=(0, 0, 0, min(a, 70)))
    plate.alpha_composite(vig)

    img.paste(plate)


# ── Nameplate ────────────────────────────────────────────────────────────────

def fit_text_font(
    draw,
    text: str,
    max_width: int,
    start_size: int,
    bold: bool = True,
    min_size: int = 22,
    face: str = "fa",
) -> ImageFont.FreeTypeFont:
    """Shrink font until text fits within max_width."""
    size = start_size
    while size > min_size:
        fnt = font(size, bold=bold, face=face)
        bbox = draw.textbbox((0, 0), text, font=fnt)
        if bbox[2] - bbox[0] <= max_width:
            return fnt
        size -= 2
    return font(min_size, bold=bold, face=face)



def draw_nameplate(card_img: Image.Image, theme, legendary, persian_name: str, english_name: str, side_clear: int = 220):
    """Dark suit-primary plate; dual names optically centered as one block."""
    draw = ImageDraw.Draw(card_img)
    plate = [side_clear, H - 168, W - side_clear, H - 52]
    metal = theme["metal_hi"] if legendary else theme["metal"]
    fill = lerp(theme["primary"], (6, 6, 8), 0.55)
    if legendary:
        fill = lerp(fill, theme["secondary"], 0.15)
    draw.rounded_rectangle(
        [plate[0] + 3, plate[1] + 4, plate[2] + 3, plate[3] + 4],
        10,
        fill=(0, 0, 0),
    )
    draw.rounded_rectangle(plate, 10, fill=fill, outline=metal, width=4)
    draw.rounded_rectangle(
        [plate[0] + 5, plate[1] + 5, plate[2] - 5, plate[3] - 5],
        7,
        outline=lerp(metal, fill, 0.35),
        width=1,
    )
    name = persian(persian_name)
    ink = (245, 240, 230, 255)
    sub = (*lerp((245, 240, 230), theme["accent"], 0.22), 255)
    max_w = plate[2] - plate[0] - 72
    p_start = 32 if len(persian_name) >= 12 else 40
    e_start = 14 if len(english_name) >= 18 else 17
    pf = fit_text_font(draw, name, max_w, start_size=p_start, bold=True, min_size=20, face="fa")
    ef = fit_text_font(draw, english_name, max_w, start_size=e_start, bold=False, min_size=11, face="en")

    # Compose both lines on a probe, then paste by alpha-bbox so the *ink block*
    # is truly centered in the plate (fixes dual-line vertical drift).
    gap = 8
    probe_w = plate[2] - plate[0]
    probe_h = plate[3] - plate[1]
    probe = Image.new("RGBA", (probe_w, probe_h * 2), (0, 0, 0, 0))
    pd = ImageDraw.Draw(probe)
    # provisional stack near top of tall probe
    y0 = 8
    pd.text((probe_w // 2 + 1, y0 + 1), name, fill=(0, 0, 0, 200), font=pf, anchor="mt")
    pd.text((probe_w // 2, y0), name, fill=ink, font=pf, anchor="mt")
    pb = probe.getbbox()
    persian_bottom = pb[3] if pb else y0 + pf.size
    ey = persian_bottom + gap
    pd.text((probe_w // 2, ey), english_name, fill=sub, font=ef, anchor="mt")
    bbox = probe.getbbox()
    if not bbox:
        return
    block = probe.crop(bbox)
    px = plate[0] + (probe_w - block.width) // 2
    py = plate[1] + (probe_h - block.height) // 2
    card_img.alpha_composite(block, (px, py))


def find_glowing_eye_center(portrait: Image.Image) -> tuple[float, float]:
    """Locate bright orange/red reptile eye by weighted warm-glow centroid."""
    rgb = portrait.convert("RGB").resize(
        (max(1, portrait.width // 4), max(1, portrait.height // 4)),
        Image.Resampling.BILINEAR,
    )
    w, h = rgb.size
    px = rgb.load()
    sx = sy = sw = 0.0
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            # fiery orange-red glow (moses eye), not purple mist
            if r >= 140 and r > g + 25 and r > b + 40 and g >= 40:
                weight = (r - 100) * (1.0 + (r - g) / 80.0)
                sx += x * weight
                sy += y * weight
                sw += weight
    if sw <= 0:
        return portrait.width / 2, portrait.height * 0.42
    return (sx / sw) * 4, (sy / sw) * 4


def fit_portrait(
    portrait: Image.Image,
    target_w: int,
    target_h: int,
    portrait_concept: str | None = None,
    legendary: bool = False,
) -> Image.Image:
    concept = portrait_concept or "large-head-and-neck"

    # Dragon of Moses III — giant centered eye, immediately readable
    if concept == "extreme-scale-eye-only":
        eye_x, eye_y = find_glowing_eye_center(portrait)
        # Strong zoom so the eye dominates first glance
        zoom = 1.72 if legendary else 1.4
        scale = max(target_w / portrait.width, target_h / portrait.height) * zoom
        nw = max(target_w, int(portrait.width * scale))
        nh = max(target_h, int(portrait.height * scale))
        portrait = portrait.resize((nw, nh), Image.Resampling.LANCZOS)
        ex = eye_x * scale
        ey = eye_y * scale
        left = int(ex - target_w / 2)
        # bias crop upward so the pupil lands on the frame's visual center
        top = int(ey - target_h / 2 - target_h * 0.012)
        left = min(max(0, left), max(0, nw - target_w))
        top = min(max(0, top), max(0, nh - target_h))
        return portrait.crop((left, top, left + target_w, top + target_h))

    if legendary:
        # pull back harder to reveal bust / shoulders / more body
        zoom = 0.78
        top_frac = 0.06
    else:
        # slightly pulled back so antlers/ears/horns stay available for circle breakout
        zoom = {
            "large-head-and-neck": 0.86,
            "frame-filling-colossal-head": 0.95,
        }.get(concept, 0.86)
        top_frac = {
            "frame-filling-colossal-head": 0.12,
        }.get(concept, 0.02)
    scale = max(target_w / portrait.width, target_h / portrait.height) * zoom
    nw, nh = max(target_w, int(portrait.width * scale)), max(target_h, int(portrait.height * scale))
    portrait = portrait.resize((nw, nh), Image.Resampling.LANCZOS)
    left = (nw - target_w) // 2
    top = max(0, int((nh - target_h) * top_frac))
    left = min(max(0, left), max(0, nw - target_w))
    top = min(max(0, top), max(0, nh - target_h))
    return portrait.crop((left, top, left + target_w, top + target_h))


def animal_breakout_alpha(portrait: Image.Image, geom_mask: Image.Image) -> Image.Image:
    """Keep only creature matter (horns/ears/fur) in overflow — never portrait mist."""
    rgb = portrait.convert("RGB")
    w, h = rgb.size
    src = rgb.load()
    gm = geom_mask.load()
    out = Image.new("L", (w, h), 0)
    dst = out.load()
    for y in range(h):
        for x in range(w):
            gmv = gm[x, y]
            if gmv < 50:
                continue
            r, g, b = src[x, y]
            mx = r if r >= g and r >= b else (g if g >= b else b)
            mn = r if r <= g and r <= b else (g if g <= b else b)
            sat = 0.0 if mx == 0 else (mx - mn) / mx
            # antler / horn / fur (warm)
            warm = r >= g + 10 and r >= b + 14 and mx >= 50 and sat >= 0.08
            # bird feathers (cool but not mist)
            feather = b >= r + 12 and sat >= 0.14 and mx >= 55
            # vivid scales / markings
            vivid = sat >= 0.32 and 55 <= mx <= 230
            # dark fur / black feathers (not empty void)
            dark_fur = mx <= 70 and sat >= 0.06 and (abs(r - g) > 6 or abs(g - b) > 6 or r > 25)
            if warm or feather or vivid or dark_fur:
                dst[x, y] = 255
    # slight thicken then soften — avoid MaxFilter which pulls mist back in
    out = out.filter(ImageFilter.MaxFilter(3))
    out = ImageChops.multiply(out, geom_mask.point(lambda v: 255 if v >= 50 else 0))
    out = out.filter(ImageFilter.GaussianBlur(0.9))
    return out


