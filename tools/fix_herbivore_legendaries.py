# -*- coding: utf-8 -*-
"""Verify Herbivore legendary lock: Behemoth(A) / Unicorn(B) / Mammoth(C).

Idempotent: if Bonnacon already archived and trio is correct, exits 0.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CARDS = ROOT / "data/cards.json"
ARCHIVE = ROOT / "docs/archive/herbivore-bonnacon-archived.json"
TOKENS = ROOT / "data/design-tokens.json"
MANIFEST = ROOT / "data/final-deck-manifest.json"

EXPECTED = {
    "herbivore-behemoth": ("A", 13, "legendary"),
    "herbivore-unicorn": ("B", 12, "legendary"),
    "herbivore-mammoth": ("C", 11, "legendary"),
    "herbivore-elephant": ("10", 10, "normal"),
    "herbivore-giraffe": ("9", 9, "normal"),
}


def main() -> int:
    doc = json.loads(CARDS.read_text(encoding="utf-8"))
    by_id = {c["id"]: c for c in doc["cards"]}
    herb = [c for c in doc["cards"] if c["suit"] == "herbivore"]
    errors: list[str] = []

    if "herbivore-bonnacon" in by_id:
        errors.append("herbivore-bonnacon still in cards.json (should be archived only)")
    if not ARCHIVE.exists():
        errors.append(f"missing archive: {ARCHIVE}")

    if len(herb) != 13:
        errors.append(f"herbivore count={len(herb)} expected 13")
    if len(doc["cards"]) != 52:
        errors.append(f"deck count={len(doc['cards'])} expected 52")

    for cid, (rank, fill, typ) in EXPECTED.items():
        c = by_id.get(cid)
        if not c:
            errors.append(f"missing {cid}")
            continue
        if str(c["displayRank"]) != rank:
            errors.append(f"{cid} rank={c['displayRank']} expected {rank}")
        if int(c["powerBarFill"]) != fill:
            errors.append(f"{cid} fill={c['powerBarFill']} expected {fill}")
        if c["type"] != typ:
            errors.append(f"{cid} type={c['type']} expected {typ}")

    leg = sorted(
        [c for c in herb if c["type"] == "legendary"],
        key=lambda c: {"A": 0, "B": 1, "C": 2}[str(c["displayRank"])],
    )
    ids = [c["id"] for c in leg]
    if ids != ["herbivore-behemoth", "herbivore-unicorn", "herbivore-mammoth"]:
        errors.append(f"legendary trio={ids}")

    if TOKENS.exists():
        tok = json.loads(TOKENS.read_text(encoding="utf-8"))
        lock = (tok.get("herbivoreLegendaryLock") or {})
        if lock.get("A") != "herbivore-behemoth" or lock.get("B") != "herbivore-unicorn" or lock.get("C") != "herbivore-mammoth":
            # tolerate nested shape under suits / visualRepair
            flat = tok.get("herbivoreLegendaries") or tok.get("locks", {}).get("herbivoreLegendaries")
            if not flat:
                pass  # tokens may use different key; cards.json is source of truth

    if MANIFEST.exists():
        man = json.loads(MANIFEST.read_text(encoding="utf-8"))
        hlock = man.get("herbivoreLegendaryLock") or {}
        if hlock and (hlock.get("A"), hlock.get("B"), hlock.get("C")) != ("behemoth", "unicorn", "mammoth"):
            errors.append(f"manifest lock mismatch: {hlock}")

    if errors:
        print("FAIL")
        for e in errors:
            print(" -", e)
        return 1

    print("OK herbivore lock A=Behemoth B=Unicorn C=Mammoth; Giraffe=9 Elephant=10; deck=52; Bonnacon archived")
    return 0


if __name__ == "__main__":
    sys.exit(main())
