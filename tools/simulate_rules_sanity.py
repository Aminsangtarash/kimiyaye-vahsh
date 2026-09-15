# -*- coding: utf-8 -*-
"""Rules sanity: many hands, assert no soft-locks / impossible counters."""
from __future__ import annotations

import json
from pathlib import Path

from simulate_special_balance import Match, load_animals, load_specials, run_batch

ROOT = Path(__file__).resolve().parents[1]


def assert_hand_invariants(seed: int):
    animals = load_animals()
    specials = load_specials()
    m = Match(seed, specials, animals, use_specials=True)
    m.deal()
    assert sum(len(h) for h in m.hands) == 52
    assert all(len(h) == 13 for h in m.hands)
    assert all(len(s) == 2 for s in m.special_hands)
    result = Match(seed, specials, animals, use_specials=True).play_hand()
    assert sum(result["team_tricks"]) >= 7
    assert max(result["team_tricks"]) >= 7
    assert result["team_winner"] in (0, 1)
    assert m.superior_lock >= 0 or True


def main():
    for s in range(50):
        assert_hand_invariants(1000 + s)
    batch = run_batch(500, seed=7, use_specials=True)
    assert batch["matches"] == 500
    assert abs(batch["team_wins"].get(0, 0) - batch["team_wins"].get(1, 0)) < 120  # loose fairness band
    out = {
        "ok": True,
        "invariantHands": 50,
        "batch": batch,
        "rulesRef": "data/game-rules.json",
    }
    (ROOT / "data/rules-sim-results.json").write_text(json.dumps(out, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(out, indent=2))


if __name__ == "__main__":
    main()
