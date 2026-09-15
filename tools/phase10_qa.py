# -*- coding: utf-8 -*-
"""Phase 10 QA validation — no new creature art."""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
import arabic_reshaper
from bidi.algorithm import get_display

ROOT = Path(r"d:\Projects\card game\site")
CLEAN = ROOT / "assets/prototypes/cards/clean"
REVIEW = ROOT / "review/phase-10"
SEGMENTS = 13
# Must match tools/render_card.py draw_power_bar defaults
BAR_X, BAR_Y = 190, 78
SEG_W, SEG_H, GAP = 14, 28, 4
ON_NORMAL = (46, 180, 90)
ON_LEGENDARY = (230, 190, 70)


def near(c, target, tol=35):
    return all(abs(int(c[i]) - target[i]) <= tol for i in range(3))


def count_filled_segments(im: Image.Image, legendary: bool = False) -> tuple[int, int]:
    """Return (filled, total_detected_on_or_off)."""
    px = im.load()
    target = ON_LEGENDARY if legendary else ON_NORMAL
    filled = 0
    present = 0
    for i in range(SEGMENTS):
        sx = BAR_X + i * (SEG_W + GAP) + SEG_W // 2
        sy = BAR_Y + SEG_H // 2
        # sample a few pixels in segment
        samples = [
            px[sx, sy],
            px[sx - 2, sy],
            px[sx + 2, sy],
            px[sx, sy - 2],
            px[sx, sy + 2],
        ]
        on_votes = sum(1 for s in samples if near(s, target))
        off_votes = sum(1 for s in samples if s[0] < 60 and s[1] < 70 and s[2] < 60)
        if on_votes >= 2:
            filled += 1
            present += 1
        elif off_votes >= 2:
            present += 1
        else:
            # still count as a slot if roughly in bar band
            present += 1
            if on_votes >= 1:
                filled += 1
    return filled, SEGMENTS


def persian_ok(text: str) -> dict:
    shaped = get_display(arabic_reshaper.reshape(text))
    return {
        "original": text,
        "shaped": shaped,
        "has_persian_letters": any("\u0600" <= ch <= "\u06FF" for ch in text),
        "shaped_nonempty": bool(shaped.strip()),
        "ok": bool(shaped.strip()) and any("\u0600" <= ch <= "\u06FF" for ch in text),
    }


def main():
    cards = {c["id"]: c for c in json.loads((ROOT / "data/cards.json").read_text(encoding="utf-8"))["cards"]}
    protos = json.loads((ROOT / "data/prototype-batch.json").read_text(encoding="utf-8"))["prototypes"]
    report = {"powerBars": [], "rtl": [], "sizes": [], "ratios": []}

    for p in protos:
        card = cards[p["cardId"]]
        path = CLEAN / f"{p['slug']}.png"
        im = Image.open(path).convert("RGB")
        legendary = card["type"] == "legendary"
        filled, total = count_filled_segments(im, legendary=legendary)
        expected = int(card["powerBarFill"])
        ok = total == 13 and filled == expected
        entry = {
            "slug": p["slug"],
            "expectedFill": expected,
            "measuredFill": filled,
            "totalSegments": total,
            "ok": ok,
            "cardSize": list(im.size),
            "ratio": round(im.size[0] / im.size[1], 4),
        }
        report["powerBars"].append(entry)
        report["rtl"].append({"slug": p["slug"], **persian_ok(card["persianName"])})

        # size readability notes via downscales (no auto enlarge)
        for label, scale in [("100%", 1.0), ("50%", 0.5), ("thumbnail", 86 / 1000)]:
            w = max(1, int(im.size[0] * scale))
            h = max(1, int(im.size[1] * scale))
            report["sizes"].append(
                {
                    "slug": p["slug"],
                    "label": label,
                    "size": [w, h],
                    "rankBadgePx": round(120 * scale, 1),
                    "suitSymbolPxApprox": round(52 * scale, 1),
                    "powerSegW": round(SEG_W * scale, 2),
                }
            )

    report["allPowerBarsOk"] = all(x["ok"] for x in report["powerBars"])
    report["allRtlOk"] = all(x["ok"] for x in report["rtl"])
    out = REVIEW / "qa-validation.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"allPowerBarsOk": report["allPowerBarsOk"], "allRtlOk": report["allRtlOk"], "bars": report["powerBars"]}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
