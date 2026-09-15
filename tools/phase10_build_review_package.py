# -*- coding: utf-8 -*-
"""Assemble Phase 10 human review package. No new creature artwork."""
from __future__ import annotations

import json
import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

import render_card as rc

ROOT = Path(r"d:\Projects\card game\site")
REVIEW = ROOT / "review" / "phase-10"
CLEAN = ROOT / "assets/prototypes/cards/clean"
PRES = ROOT / "assets/prototypes/cards/presentation"
SHEETS = ROOT / "assets/prototypes/sheets"
FONT = Path(r"C:\Windows\Fonts\tahoma.ttf")


def font(size, bold=False):
    return ImageFont.truetype(str(FONT), size)


def ensure_dirs():
    for p in [
        REVIEW,
        REVIEW / "presentation-cards",
        REVIEW / "size-ladder",
        REVIEW / "comparisons",
        REVIEW / "structural-tests",
    ]:
        p.mkdir(parents=True, exist_ok=True)


def copy_presentation():
    for src in PRES.glob("*.png"):
        shutil.copy2(src, REVIEW / "presentation-cards" / src.name)


def copy_existing_sheets():
    for name in ["consistency-sheet.png", "thumbnail-check.png"]:
        src = SHEETS / name
        if src.exists():
            shutil.copy2(src, REVIEW / "comparisons" / name)


def size_ladder_for(slug: str):
    im = Image.open(CLEAN / f"{slug}.png").convert("RGB")
    out_dir = REVIEW / "size-ladder" / slug
    out_dir.mkdir(parents=True, exist_ok=True)
    variants = {
        "100pct.png": 1.0,
        "50pct.png": 0.5,
        "thumbnail.png": 86 / 1000,
    }
    for name, scale in variants.items():
        w = max(1, int(im.width * scale))
        h = max(1, int(im.height * scale))
        im.resize((w, h), Image.Resampling.LANCZOS).save(out_dir / name, "PNG")


def lion_style_comparison():
    """Lion at 100 / 50 / thumbnail side by side."""
    base = CLEAN / "lion.png"
    im = Image.open(base).convert("RGB")
    parts = []
    labels = []
    for label, scale in [("100%", 1.0), ("50%", 0.5), ("thumb", 86 / 1000)]:
        w = max(1, int(im.width * scale))
        h = max(1, int(im.height * scale))
        parts.append(im.resize((w, h), Image.Resampling.LANCZOS))
        labels.append(label)
    # normalize heights for row by pasting on common canvas
    max_h = max(p.height for p in parts) + 60
    gap = 40
    width = sum(p.width for p in parts) + gap * (len(parts) + 1)
    sheet = Image.new("RGB", (width, max_h), (248, 246, 242))
    d = ImageDraw.Draw(sheet)
    d.text((gap, 12), "Lion size ladder — readability check", fill=(30, 30, 30), font=font(22))
    x = gap
    for p, label in zip(parts, labels):
        y = 50 + (max_h - 60 - p.height) // 2
        sheet.paste(p, (x, y))
        d.text((x, max_h - 28), label, fill=(50, 50, 50), font=font(16))
        x += p.width + gap
    sheet.save(REVIEW / "comparisons" / "lion-size-ladder.png", "PNG")


def normal_vs_legendary():
    lion = Image.open(CLEAN / "lion.png").convert("RGB").resize((320, 448), Image.Resampling.LANCZOS)
    griff = Image.open(CLEAN / "griffon.png").convert("RGB").resize((320, 448), Image.Resampling.LANCZOS)
    gap = 48
    sheet = Image.new("RGB", (320 * 2 + gap * 3, 448 + 90), (250, 248, 244))
    d = ImageDraw.Draw(sheet)
    d.text((gap, 16), "Normal vs Legendary — Lion (9) vs Griffon (B)", fill=(30, 30, 30), font=font(22))
    sheet.paste(lion, (gap, 55))
    sheet.paste(griff, (gap * 2 + 320, 55))
    d.text((gap, 448 + 60), "Normal frame", fill=(80, 80, 80), font=font(16))
    d.text((gap * 2 + 320, 448 + 60), "Legendary frame (prototype)", fill=(80, 80, 80), font=font(16))
    sheet.save(REVIEW / "comparisons" / "normal-vs-legendary.png", "PNG")


def moses_structural_support_test():
    """Procedural placeholder only — NOT final Dragon artwork."""
    # create abstract dark plate with a large circle (eye stand-in)
    plate = Image.new("RGB", (900, 1200), (8, 10, 14))
    d = ImageDraw.Draw(plate)
    # scales suggestion
    for y in range(0, 1200, 40):
        for x in range(0, 900, 48):
            d.ellipse([x, y, x + 36, y + 28], outline=(40, 55, 48), width=2)
    # giant eye stand-in
    d.ellipse([180, 320, 720, 860], fill=(20, 70, 55), outline=(180, 220, 160), width=8)
    d.ellipse([320, 460, 580, 720], fill=(6, 10, 8))
    d.ellipse([390, 520, 470, 600], fill=(220, 240, 200))
    d.text((40, 40), "STRUCTURAL TEST ONLY — not final art", fill=(160, 160, 160), font=font(28))

    stub = REVIEW / "structural-tests" / "moses-iii-placeholder-portrait.png"
    plate.save(stub, "PNG")

    card = {
        "id": "reptile-dragon-of-moses-iii",
        "suit": "reptile",
        "type": "legendary",
        "displayRank": "A",
        "powerBarFill": 13,
        "persianName": "اژدهای موسی، تجلی نهایی",
        "englishName": "Dragon of Moses III (structural)",
        "portraitConcept": "extreme-scale-eye-only",
        "artDirection": {"portraitConcept": "extreme-scale-eye-only"},
    }
    clean = rc.compose_card(card, stub, "clean")
    out = REVIEW / "structural-tests" / "moses-iii-extreme-crop-architecture.png"
    clean.save(out, "PNG")
    return str(out)


def cross_suit_identifiability_sheet():
    """One card per suit for symbol+color check."""
    picks = ["lion", "mammoth", "harpy-eagle", "king-cobra"]
    thumbs = []
    for slug in picks:
        thumbs.append(Image.open(CLEAN / f"{slug}.png").convert("RGB").resize((260, 364), Image.Resampling.LANCZOS))
    gap = 36
    pad = 40
    w = pad * 2 + 260 * 4 + gap * 3
    h = 364 + 110
    sheet = Image.new("RGB", (w, h), (245, 243, 238))
    d = ImageDraw.Draw(sheet)
    d.text((pad, 14), "Cross-suit identity — can suit be told without reading the name?", fill=(30, 30, 30), font=font(20))
    labels = ["Carnivore (triangle)", "Herbivore (leaf)", "Bird (diamond)", "Reptile (hex)"]
    x = pad
    for im, lab in zip(thumbs, labels):
        sheet.paste(im, (x, 50))
        d.text((x, 364 + 60), lab, fill=(60, 60, 60), font=font(14))
        x += 260 + gap
    sheet.save(REVIEW / "comparisons" / "cross-suit-identity.png", "PNG")


def main():
    ensure_dirs()
    copy_presentation()
    copy_existing_sheets()
    for slug in ["lion", "wolf", "fox", "mammoth", "harpy-eagle", "king-cobra", "griffon"]:
        size_ladder_for(slug)
    lion_style_comparison()
    normal_vs_legendary()
    cross_suit_identifiability_sheet()
    moses_path = moses_structural_support_test()
    print("moses structural", moses_path)
    print("review package ready", REVIEW)


if __name__ == "__main__":
    main()
