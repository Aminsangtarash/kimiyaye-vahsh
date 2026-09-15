# -*- coding: utf-8 -*-
"""Visual repair: re-render deck with premium shell."""
from __future__ import annotations

import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))
from render_card import W, H, compose_card, load_cards_by_id, load_rank_model, font  # noqa: E402

SUIT_FOLDER = {
    "carnivore": "carnivores",
    "herbivore": "herbivores",
    "bird": "birds",
    "reptile": "reptiles",
}
SUIT_ORDER = ["carnivore", "herbivore", "bird", "reptile"]
RANK_ORDER = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "C", "B", "A"]

PROTOTYPE_IDS = [
    "carnivore-lion",
    "carnivore-griffon",
    "herbivore-elephant",
    "herbivore-mammoth",
    "herbivore-unicorn",
    "herbivore-behemoth",
    "bird-owl",
    "bird-phoenix",
    "reptile-king-cobra",
    "reptile-dragon-of-moses-iii",
]


def portrait_path_for(card: dict) -> Path:
    return ROOT / "assets/cards/portraits/final" / SUIT_FOLDER[card["suit"]] / f"{card['slug']}.png"


def render_set(card_ids: list[str] | None = None):
    cards_by_id = load_cards_by_id()
    cards = list(cards_by_id.values())
    if card_ids:
        cards = [cards_by_id[i] for i in card_ids]
    cards.sort(key=lambda c: (SUIT_ORDER.index(c["suit"]), RANK_ORDER.index(str(c["displayRank"]))))
    rm = load_rank_model()
    clean_dir = ROOT / "assets/cards/final/clean"
    pres_dir = ROOT / "assets/cards/final/presentation"
    clean_dir.mkdir(parents=True, exist_ok=True)
    pres_dir.mkdir(parents=True, exist_ok=True)
    rendered = []
    for c in cards:
        expected = rm["displayRankToPowerBarFill"][str(c["displayRank"])]
        assert int(c["powerBarFill"]) == int(expected), c["id"]
        portrait = portrait_path_for(c)
        if not portrait.exists():
            raise FileNotFoundError(portrait)
        clean = compose_card(c, portrait, "clean")
        pres = compose_card(c, portrait, "presentation")
        assert clean.size == (W, H)
        cpath = clean_dir / f"{c['slug']}.png"
        ppath = pres_dir / f"{c['slug']}.png"
        clean.save(cpath, "PNG", optimize=True)
        clean.save(cpath.with_suffix(".webp"), "WEBP", quality=90, method=4)
        pres.save(ppath, "PNG", optimize=True)
        rendered.append(c)
        print("rendered", c["id"], c["displayRank"], c["type"])
    return rendered


def sheet_from_paths(paths, out: Path, cols: int, title: str, thumb=(220, 308), pad=16):
    paths = [p for p in paths if p.exists()]
    if not paths:
        return
    rows = (len(paths) + cols - 1) // cols
    tw, th = thumb
    w = cols * tw + (cols + 1) * pad
    h = rows * th + (rows + 1) * pad + 48
    sheet = Image.new("RGB", (w, h), (248, 246, 242))
    d = ImageDraw.Draw(sheet)
    d.text((pad, 12), title, fill=(30, 30, 34), font=font(22, True))
    for i, p in enumerate(paths):
        im = Image.open(p).convert("RGB").resize((tw, th), Image.Resampling.LANCZOS)
        r, c = divmod(i, cols)
        sheet.paste(im, (pad + c * (tw + pad), 48 + pad + r * (th + pad)))
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out, "JPEG", quality=92, optimize=True)
    print("sheet", out)


def build_review(all_cards: list[dict]):
    review = ROOT / "review/final-deck"
    clean = ROOT / "assets/cards/final/clean"
    by_suit = defaultdict(list)
    for c in all_cards:
        by_suit[c["suit"]].append(c)
    for s in SUIT_ORDER:
        by_suit[s].sort(key=lambda x: RANK_ORDER.index(str(x["displayRank"])))
        sheet_from_paths(
            [clean / f"{c['slug']}.png" for c in by_suit[s]],
            review / f"{SUIT_FOLDER[s]}.jpg",
            cols=5,
            title=f"Kimiyaye Vahsh — {s.title()} (visual repair)",
        )
    all_sorted = []
    for s in SUIT_ORDER:
        all_sorted.extend(by_suit[s])
    sheet_from_paths(
        [clean / f"{c['slug']}.png" for c in all_sorted],
        review / "full-deck.jpg",
        cols=13,
        title="Full Main Deck (52) — Visual Repair",
        thumb=(140, 196),
        pad=10,
    )
    legs = [c for c in all_sorted if c["type"] == "legendary"]
    sheet_from_paths(
        [clean / f"{c['slug']}.png" for c in legs],
        review / "legendary-collection.jpg",
        cols=6,
        title="Legendary Collection (12)",
        thumb=(200, 280),
    )
    reps = []
    for rank in ["1", "5", "10", "C", "B", "A"]:
        hit = next((c for c in by_suit["carnivore"] if str(c["displayRank"]) == rank), None)
        if hit:
            reps.append(hit)
    sheet_from_paths(
        [clean / f"{c['slug']}.png" for c in reps],
        review / "rank-comparison.jpg",
        cols=6,
        title="Rank Hierarchy — Carnivore",
    )
    # herbivore legendary trio
    herbs_leg = [
        next(c for c in by_suit["herbivore"] if c["slug"] == "mammoth"),
        next(c for c in by_suit["herbivore"] if c["slug"] == "unicorn"),
        next(c for c in by_suit["herbivore"] if c["slug"] == "behemoth"),
    ]
    sheet_from_paths(
        [clean / f"{c['slug']}.png" for c in herbs_leg],
        review / "herbivore-legendary-trio.jpg",
        cols=3,
        title="Herbivore Legendary Trio — Mammoth C / Unicorn B / Behemoth A",
        thumb=(280, 392),
    )
    # gameplay thumbs
    tw, th = 86, 120
    sample = []
    for s in SUIT_ORDER:
        for rank in ["2", "6", "10", "A"]:
            hit = next((c for c in by_suit[s] if str(c["displayRank"]) == rank), None)
            if hit:
                sample.append(hit)
    gap, pad = 10, 24
    n = len(sample)
    strip = Image.new("RGB", (pad * 2 + tw * n + gap * (n - 1), pad * 2 + th + 40), (28, 28, 32))
    d = ImageDraw.Draw(strip)
    d.text((pad, 10), "Gameplay-size thumbnail QA", fill=(220, 220, 220), font=font(18, True))
    for i, c in enumerate(sample):
        im = Image.open(clean / f"{c['slug']}.png").convert("RGB").resize((tw, th), Image.Resampling.LANCZOS)
        strip.paste(im, (pad + i * (tw + gap), pad + 28))
    strip.save(review / "thumbnail-qa.jpg", "JPEG", quality=92)
    print("thumbnail sheet ok")


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "full"
    if mode == "proto":
        render_set(PROTOTYPE_IDS)
        review = ROOT / "review/visual-repair"
        review.mkdir(parents=True, exist_ok=True)
        clean = ROOT / "assets/cards/final/clean"
        sheet_from_paths(
            [clean / f"{load_cards_by_id()[i]['slug']}.png" for i in PROTOTYPE_IDS],
            review / "prototype-batch.jpg",
            cols=5,
            title="Visual Repair Prototype Batch",
            thumb=(200, 280),
        )
    else:
        cards = render_set(None)
        build_review(cards)
        # remove obsolete bonnacon renders if present
        for p in [
            ROOT / "assets/cards/final/clean/bonnacon.png",
            ROOT / "assets/cards/final/clean/bonnacon.webp",
            ROOT / "assets/cards/final/presentation/bonnacon.png",
        ]:
            if p.exists():
                p.unlink()
                print("removed", p.name)
        # update final manifest quickly
        entries = []
        for c in cards:
            entries.append(
                {
                    "cardId": c["id"],
                    "cleanAsset": f"assets/cards/final/clean/{c['slug']}.png",
                    "presentationAsset": f"assets/cards/final/presentation/{c['slug']}.png",
                    "portraitAsset": f"assets/cards/portraits/final/{SUIT_FOLDER[c['suit']]}/{c['slug']}.png",
                    "suit": c["suit"],
                    "rank": str(c["displayRank"]),
                    "type": c["type"],
                    "finalStatus": "visual-repair",
                }
            )
        man = {
            "project": "کیمیای وحش",
            "phase": "visual-repair",
            "count": len(entries),
            "cardDimensions": {"w": W, "h": H},
            "herbivoreLegendaryTrio": {"A": "behemoth", "B": "unicorn", "C": "mammoth"},
            "cards": entries,
            "counts": {
                "bySuit": dict(Counter(c["suit"] for c in cards)),
                "byType": dict(Counter(c["type"] for c in cards)),
            },
        }
        (ROOT / "data/final-deck-manifest.json").write_text(
            json.dumps(man, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        print("done", len(cards))


if __name__ == "__main__":
    main()
