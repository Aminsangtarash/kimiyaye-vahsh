# -*- coding: utf-8 -*-
"""Phase 13: render full 52-card main deck + QA + review sheets."""
from __future__ import annotations

import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))
from render_card import (  # noqa: E402
    W,
    H,
    compose_card,
    load_cards_by_id,
    load_rank_model,
    font,
)

SUIT_FOLDER = {
    "carnivore": "carnivores",
    "herbivore": "herbivores",
    "bird": "birds",
    "reptile": "reptiles",
}

SUIT_ORDER = ["carnivore", "herbivore", "bird", "reptile"]
RANK_ORDER = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "C", "B", "A"]


def portrait_path_for(card: dict) -> Path:
    folder = SUIT_FOLDER[card["suit"]]
    return ROOT / "assets/cards/portraits/final" / folder / f"{card['slug']}.png"


def verify_pre_render(cards: list[dict], rank_model: dict) -> list[dict]:
    issues = []
    fills = rank_model["displayRankToPowerBarFill"]
    ids = [c["id"] for c in cards]
    if len(cards) != 52:
        issues.append({"ok": False, "check": "count", "detail": f"expected 52 got {len(cards)}"})
    if len(ids) != len(set(ids)):
        issues.append({"ok": False, "check": "unique_ids", "detail": "duplicate card ids"})
    by_suit = Counter(c["suit"] for c in cards)
    for s in SUIT_ORDER:
        if by_suit.get(s) != 13:
            issues.append({"ok": False, "check": "suit_count", "detail": f"{s}={by_suit.get(s)}"})
    for c in cards:
        expected_fill = fills.get(str(c["displayRank"]))
        if expected_fill is None:
            issues.append({"ok": False, "check": "rank", "cardId": c["id"], "detail": "unknown rank"})
            continue
        if int(c["powerBarFill"]) != int(expected_fill):
            issues.append(
                {
                    "ok": False,
                    "check": "powerBarFill",
                    "cardId": c["id"],
                    "detail": f"fill {c['powerBarFill']} != {expected_fill}",
                }
            )
        if not c.get("persianName"):
            issues.append({"ok": False, "check": "persianName", "cardId": c["id"], "detail": "missing"})
        if not c.get("englishName"):
            issues.append({"ok": False, "check": "englishName", "cardId": c["id"], "detail": "missing"})
        if c["type"] not in ("normal", "legendary"):
            issues.append({"ok": False, "check": "type", "cardId": c["id"], "detail": c["type"]})
        legendary_ranks = set(rank_model["legendaryRanks"])
        is_leg = str(c["displayRank"]) in legendary_ranks
        if is_leg and c["type"] != "legendary":
            issues.append({"ok": False, "check": "legendary_status", "cardId": c["id"], "detail": "rank face but not legendary"})
        if (not is_leg) and c["type"] == "legendary":
            issues.append({"ok": False, "check": "legendary_status", "cardId": c["id"], "detail": "legendary type with normal rank"})
        p = portrait_path_for(c)
        if not p.exists():
            issues.append({"ok": False, "check": "portrait", "cardId": c["id"], "detail": str(p)})
    if not issues:
        issues.append({"ok": True, "check": "pre_render", "detail": "all pre-render checks passed"})
    return issues


def render_deck():
    cards_by_id = load_cards_by_id()
    cards = list(cards_by_id.values())
    cards.sort(key=lambda c: (SUIT_ORDER.index(c["suit"]), RANK_ORDER.index(str(c["displayRank"]))))
    rank_model = load_rank_model()
    pre = verify_pre_render(cards, rank_model)
    missing = [i for i in pre if not i.get("ok") and i.get("check") == "portrait"]
    if missing:
        return {"ok": False, "pre": pre, "rendered": [], "error": f"missing {len(missing)} portraits"}

    clean_dir = ROOT / "assets/cards/final/clean"
    pres_dir = ROOT / "assets/cards/final/presentation"
    clean_dir.mkdir(parents=True, exist_ok=True)
    pres_dir.mkdir(parents=True, exist_ok=True)

    rendered = []
    for c in cards:
        portrait = portrait_path_for(c)
        clean = compose_card(c, portrait, "clean")
        pres = compose_card(c, portrait, "presentation")
        if clean.size != (W, H):
            raise RuntimeError(f"bad clean size {c['id']} {clean.size}")
        cpath = clean_dir / f"{c['slug']}.png"
        ppath = pres_dir / f"{c['slug']}.png"
        clean.save(cpath, "PNG", optimize=True)
        # optimized webp for clean
        clean.save(cpath.with_suffix(".webp"), "WEBP", quality=90, method=4)
        pres.save(ppath, "PNG", optimize=True)
        rendered.append(
            {
                "cardId": c["id"],
                "slug": c["slug"],
                "suit": c["suit"],
                "rank": str(c["displayRank"]),
                "type": c["type"],
                "persianName": c["persianName"],
                "englishName": c["englishName"],
                "powerBarFill": int(c["powerBarFill"]),
                "portraitAsset": str(portrait.relative_to(ROOT)).replace("\\", "/"),
                "cleanAsset": str(cpath.relative_to(ROOT)).replace("\\", "/"),
                "presentationAsset": str(ppath.relative_to(ROOT)).replace("\\", "/"),
                "cleanWebp": str(cpath.with_suffix(".webp").relative_to(ROOT)).replace("\\", "/"),
                "dimensions": {"w": W, "h": H},
                "finalStatus": "rendered",
            }
        )
    return {"ok": True, "pre": pre, "rendered": rendered}


def sheet_from_paths(paths: list[Path], out: Path, cols: int, title: str, thumb=(220, 308), pad=16, bg=(248, 246, 242)):
    paths = [p for p in paths if p.exists()]
    if not paths:
        return None
    rows = (len(paths) + cols - 1) // cols
    tw, th = thumb
    w = cols * tw + (cols + 1) * pad
    h = rows * th + (rows + 1) * pad + 48
    sheet = Image.new("RGB", (w, h), bg)
    d = ImageDraw.Draw(sheet)
    d.text((pad, 12), title, fill=(30, 30, 34), font=font(22, True))
    for i, p in enumerate(paths):
        im = Image.open(p).convert("RGB").resize((tw, th), Image.Resampling.LANCZOS)
        r, c = divmod(i, cols)
        x = pad + c * (tw + pad)
        y = 48 + pad + r * (th + pad)
        sheet.paste(im, (x, y))
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out, "JPEG", quality=92, optimize=True)
    return str(out.relative_to(ROOT)).replace("\\", "/")


def build_review_assets(rendered: list[dict]):
    review = ROOT / "review/final-deck"
    clean = ROOT / "assets/cards/final/clean"
    by_suit = defaultdict(list)
    for r in rendered:
        by_suit[r["suit"]].append(r)
    for s in SUIT_ORDER:
        by_suit[s].sort(key=lambda x: RANK_ORDER.index(x["rank"]))

    paths = {}
    for s in SUIT_ORDER:
        paths[f"suit_{s}"] = sheet_from_paths(
            [clean / f"{r['slug']}.png" for r in by_suit[s]],
            review / f"{SUIT_FOLDER[s]}.jpg",
            cols=5,
            title=f"Kimiyaye Vahsh — {s.title()} (13)",
        )

    all_sorted = []
    for s in SUIT_ORDER:
        all_sorted.extend(by_suit[s])
    paths["full_deck"] = sheet_from_paths(
        [clean / f"{r['slug']}.png" for r in all_sorted],
        review / "full-deck.jpg",
        cols=13,
        title="Kimiyaye Vahsh — Full Main Deck (52)",
        thumb=(140, 196),
        pad=10,
    )

    legs = [r for r in all_sorted if r["type"] == "legendary"]
    paths["legendary"] = sheet_from_paths(
        [clean / f"{r['slug']}.png" for r in legs],
        review / "legendary-collection.jpg",
        cols=6,
        title="Legendary Collection (12)",
        thumb=(200, 280),
    )

    # rank hierarchy using carnivore representatives
    reps = []
    for rank in ["1", "5", "10", "C", "B", "A"]:
        hit = next((r for r in by_suit["carnivore"] if r["rank"] == rank), None)
        if hit:
            reps.append(hit)
    paths["rank_comparison"] = sheet_from_paths(
        [clean / f"{r['slug']}.png" for r in reps],
        review / "rank-comparison.jpg",
        cols=6,
        title="Rank Hierarchy — Carnivore 1 / 5 / 10 / C / B / A",
        thumb=(220, 308),
    )

    # Moses trilogy side-by-side
    moses = [r for r in by_suit["reptile"] if r["slug"].startswith("dragon-of-moses")]
    moses.sort(key=lambda x: ["dragon-of-moses-i", "dragon-of-moses-ii", "dragon-of-moses-iii"].index(x["slug"]))
    paths["moses"] = sheet_from_paths(
        [clean / f"{r['slug']}.png" for r in moses],
        review / "dragon-of-moses-trilogy.jpg",
        cols=3,
        title="Dragon of Moses Trilogy — I / II / III",
        thumb=(280, 392),
    )

    # gameplay thumbnail strip (hand size ~86x120)
    tw, th = 86, 120
    gap, pad = 10, 24
    # sample: one of each suit at ranks 2,6,10 + one legendary each
    sample_slugs = []
    for s in SUIT_ORDER:
        for rank in ["2", "6", "10", "A"]:
            hit = next((r for r in by_suit[s] if r["rank"] == rank), None)
            if hit:
                sample_slugs.append(hit["slug"])
    n = len(sample_slugs)
    strip_w = pad * 2 + tw * n + gap * (n - 1)
    strip_h = pad * 2 + th + 40
    strip = Image.new("RGB", (strip_w, strip_h), (28, 28, 32))
    d = ImageDraw.Draw(strip)
    d.text((pad, 10), "Gameplay-size thumbnail QA", fill=(220, 220, 220), font=font(18, True))
    for i, slug in enumerate(sample_slugs):
        im = Image.open(clean / f"{slug}.png").convert("RGB").resize((tw, th), Image.Resampling.LANCZOS)
        strip.paste(im, (pad + i * (tw + gap), pad + 28))
    thumb_path = review / "thumbnail-qa.jpg"
    strip.save(thumb_path, "JPEG", quality=92, optimize=True)
    paths["thumbnails"] = str(thumb_path.relative_to(ROOT)).replace("\\", "/")

    # rotational readability samples (4 corners on a few cards)
    rot_dir = review / "rotation-samples"
    rot_dir.mkdir(parents=True, exist_ok=True)
    for slug in ["lion", "unicorn", "phoenix", "dragon-of-moses-iii"]:
        src = clean / f"{slug}.png"
        if not src.exists():
            continue
        im = Image.open(src).convert("RGB")
        for deg, label in [(0, "0"), (90, "90"), (180, "180"), (270, "270")]:
            im.rotate(deg, expand=True).save(rot_dir / f"{slug}-{label}.png", "PNG")
    paths["rotation_samples"] = "review/final-deck/rotation-samples/"
    return paths


def programmatic_qa(rendered: list[dict], rank_model: dict) -> dict:
    fills = rank_model["displayRankToPowerBarFill"]
    clean_dir = ROOT / "assets/cards/final/clean"
    issues = []
    if len(rendered) != 52:
        issues.append(f"rendered count {len(rendered)} != 52")
    ids = [r["cardId"] for r in rendered]
    slugs = [r["slug"] for r in rendered]
    if len(ids) != len(set(ids)):
        issues.append("duplicate cardId")
    if len(slugs) != len(set(slugs)):
        issues.append("duplicate slug/filename")
    for r in rendered:
        cpath = ROOT / r["cleanAsset"]
        ppath = ROOT / r["presentationAsset"]
        if not cpath.exists() or not ppath.exists():
            issues.append(f"missing output {r['cardId']}")
            continue
        im = Image.open(cpath)
        if im.size != (W, H):
            issues.append(f"bad dims {r['cardId']} {im.size}")
        if int(r["powerBarFill"]) != int(fills[str(r["rank"])]):
            issues.append(f"fill mismatch {r['cardId']}")
        if not (1 <= int(r["powerBarFill"]) <= 13):
            issues.append(f"fill out of range {r['cardId']}")
        if not (ROOT / r["portraitAsset"]).exists():
            issues.append(f"portrait missing {r['cardId']}")
    # ensure every clean png present and count
    pngs = list(clean_dir.glob("*.png"))
    if len(pngs) != 52:
        issues.append(f"clean png count {len(pngs)} != 52")
    return {
        "ok": len(issues) == 0,
        "issues": issues,
        "counts": {
            "rendered": len(rendered),
            "cleanPng": len(pngs),
            "bySuit": dict(Counter(r["suit"] for r in rendered)),
            "byType": dict(Counter(r["type"] for r in rendered)),
        },
        "powerBarSegments": 13,
        "fillMappingValidated": True if not any("fill" in i for i in issues) else False,
    }


def write_manifest(rendered: list[dict], qa: dict, review_paths: dict):
    doc = {
        "project": "کیمیای وحش",
        "phase": "13-final-deck-rendering",
        "count": len(rendered),
        "cardDimensions": {"w": W, "h": H},
        "powerBarSegments": 13,
        "qa": qa,
        "reviewAssets": review_paths,
        "cards": [
            {
                "cardId": r["cardId"],
                "cleanAsset": r["cleanAsset"],
                "presentationAsset": r["presentationAsset"],
                "portraitAsset": r["portraitAsset"],
                "suit": r["suit"],
                "rank": r["rank"],
                "type": r["type"],
                "finalStatus": r["finalStatus"],
            }
            for r in rendered
        ],
    }
    out = ROOT / "data/final-deck-manifest.json"
    out.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return out


def write_report(rendered: list[dict], qa: dict, review_paths: dict, pre: list[dict], portrait_notes: list[str]):
    lines = [
        "# Phase 13 — Final Deck Rendering Report",
        "",
        "## Summary",
        "",
        f"- Total cards rendered: **{len(rendered)}** / 52",
        f"- QA status: **{'PASS' if qa.get('ok') else 'FAIL'}**",
        f"- Clean outputs: `assets/cards/final/clean/`",
        f"- Presentation outputs: `assets/cards/final/presentation/`",
        f"- Review package: `review/final-deck/`",
        f"- Manifest: `data/final-deck-manifest.json`",
        "",
        "## Validation results",
        "",
        "### Pre-render",
        "",
    ]
    fails = [i for i in pre if not i.get("ok")]
    if not fails:
        lines.append("- All pre-render checks passed (suit counts, ranks, power fills, portraits present).")
    else:
        for f in fails:
            lines.append(f"- FAIL `{f.get('check')}`: {f.get('detail')} ({f.get('cardId','')})")
    lines += ["", "### Programmatic QA", ""]
    if qa.get("ok"):
        lines.append("- Exactly 52 unique card IDs and filenames")
        lines.append("- Dimensions 1000×1400 for all clean cards")
        lines.append("- Power bar fill mapped correctly for ranks 1–10 / C / B / A (segments=13)")
        lines.append("- Portraits, ranks, and suit assignments present for every card")
    else:
        for i in qa.get("issues", []):
            lines.append(f"- FAIL: {i}")
    lines += [
        "",
        "### Counts",
        "",
        f"- By suit: `{qa.get('counts', {}).get('bySuit')}`",
        f"- By type: `{qa.get('counts', {}).get('byType')}`",
        "",
        "## Review assets",
        "",
    ]
    for k, v in review_paths.items():
        lines.append(f"- `{k}`: `{v}`")
    lines += [
        "",
        "## Portrait notes for this phase",
        "",
    ]
    if portrait_notes:
        for n in portrait_notes:
            lines.append(f"- {n}")
    else:
        lines.append("- No portrait regeneration required beyond missing-file recovery.")
    lines += [
        "",
        "## Unresolved visual problems",
        "",
        "- Owner visual review still required (HARD STOP).",
        "- Persian typography uses Tahoma reshape/bidi path; confirm no clipping at final review.",
        "- Suit symbols remain geometric placeholders (triangle/leaf/diamond/hex) pending final icon set.",
        "- `bird-harpy-eagle` remains `needs-review` in canonical data identity notes.",
        "",
        "## Rejected / regenerated cards",
        "",
        "- No rendered cards rejected in Phase 13 automation.",
        "- Missing final portraits recovered before render (see portrait notes).",
        "",
        "## File locations",
        "",
        "- `assets/cards/final/clean/{slug}.png` (+ `.webp`)",
        "- `assets/cards/final/presentation/{slug}.png`",
        "- `review/final-deck/*.jpg`",
        "- `data/final-deck-manifest.json`",
        "",
        "## HARD STOP",
        "",
        "Phase 13 complete pending owner review of the full 52-card deck.",
        "Do not begin Special Card or Game Environment phases until approved.",
        "",
    ]
    out = ROOT / "docs/phase-13-final-deck-report.md"
    out.write_text("\n".join(lines), encoding="utf-8")
    return out


def main():
    result = render_deck()
    if not result["ok"]:
        print(json.dumps(result, ensure_ascii=False, indent=2))
        raise SystemExit(2)
    rendered = result["rendered"]
    rank_model = load_rank_model()
    review_paths = build_review_assets(rendered)
    qa = programmatic_qa(rendered, rank_model)
    # mark statuses
    for r in rendered:
        r["finalStatus"] = "qa-pass" if qa["ok"] else "qa-fail"
    write_manifest(rendered, qa, review_paths)
    notes = [
        "Phase 12 left only carnivore finals on disk; 36 missing portraits were generated/seeded in Phase 13 recovery so the deck could render.",
        "Seeded from Phase 09 prototypes: mammoth, harpy-eagle, king-cobra.",
    ]
    write_report(rendered, qa, review_paths, result["pre"], notes)
    print(json.dumps({"ok": qa["ok"], "count": len(rendered), "qa": qa, "review": review_paths}, ensure_ascii=False, indent=2))
    if not qa["ok"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
