# -*- coding: utf-8 -*-
"""Headless Kimiyaye Vahsh rules + special-card balance simulator."""
from __future__ import annotations

import json
import random
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

ROOT = Path(__file__).resolve().parents[1]
SUITS = ["carnivore", "herbivore", "bird", "reptile"]
RANK_ORDER = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "C", "B", "A"]
RANK_VALUE = {r: i + 1 for i, r in enumerate(RANK_ORDER)}  # 1..13


def load_animals():
    doc = json.loads((ROOT / "data/cards.json").read_text(encoding="utf-8"))
    cards = []
    for c in doc["cards"]:
        cards.append(
            {
                "id": c["id"],
                "suit": c["suit"],
                "rank": str(c["displayRank"]),
                "value": int(c["powerBarFill"]),
                "type": c["type"],
            }
        )
    return cards


def load_specials():
    doc = json.loads((ROOT / "data/special-cards.json").read_text(encoding="utf-8"))
    return doc


@dataclass
class Play:
    player: int
    card: dict
    effective_suit: str
    effective_value: int
    chameleon: bool = False


@dataclass
class TrickState:
    leader: int
    led_suit: Optional[str] = None
    superior: Optional[str] = None
    plays: list = field(default_factory=list)
    silence: bool = False
    mods: dict = field(default_factory=dict)  # card_id -> delta
    specials_used_by: set = field(default_factory=set)


class Match:
    def __init__(self, seed: int, specials_doc: dict, animals: list[dict], use_specials=True):
        self.rng = random.Random(seed)
        self.specials_doc = specials_doc
        self.animals = animals
        self.use_specials = use_specials
        self.hands: list[list[dict]] = [[] for _ in range(4)]
        self.special_hands: list[list[str]] = [[] for _ in range(4)]
        self.tricks_won = [0, 0, 0, 0]
        self.team_tricks = [0, 0]  # teams 0:(0,2) 1:(1,3)
        self.superior: Optional[str] = None
        self.superior_lock = 0  # remaining tricks including current upcoming
        self.stats = Counter()

    def deal(self):
        deck = list(self.animals)
        self.rng.shuffle(deck)
        for i, card in enumerate(deck):
            self.hands[i % 4].append(dict(card))
        if self.use_specials:
            types = [c["slug"] for c in self.specials_doc["cards"]]
            sdeck = types * int(self.specials_doc["distribution"]["copiesPerType"])
            self.rng.shuffle(sdeck)
            for p in range(4):
                self.special_hands[p] = [sdeck.pop(), sdeck.pop()]

    def team(self, p: int) -> int:
        return 0 if p % 2 == 0 else 1

    def legal_animals(self, p: int, led: Optional[str]) -> list[dict]:
        hand = self.hands[p]
        if led is None:
            return list(hand)
        same = [c for c in hand if c["suit"] == led]
        return same if same else list(hand)

    def choose_animal(self, p: int, led: Optional[str], superior: Optional[str]) -> dict:
        legal = self.legal_animals(p, led)
        # Heuristic: if void and superior available, sometimes play high superior
        if led and not any(c["suit"] == led for c in self.hands[p]) and superior:
            sup = [c for c in legal if c["suit"] == superior]
            if sup and self.rng.random() < 0.55:
                return max(sup, key=lambda c: c["value"])
        # else play median-ish card
        legal_sorted = sorted(legal, key=lambda c: c["value"])
        return legal_sorted[len(legal_sorted) // 2]

    def maybe_specials(self, trick: TrickState, p: int, played: dict, void: bool):
        if not self.use_specials or trick.silence:
            return
        if p in trick.specials_used_by:
            return
        hand = self.special_hands[p]
        if not hand:
            return
        # simple policies
        if "silence" in hand and self.rng.random() < 0.08:
            hand.remove("silence")
            trick.silence = True
            trick.specials_used_by.add(p)
            self.stats["silence"] += 1
            return
        if void and "chameleon" in hand and self.rng.random() < 0.45:
            hand.remove("chameleon")
            trick.specials_used_by.add(p)
            self.stats["chameleon"] += 1
            played["_chameleon"] = True
            return
        if "adrenaline" in hand and played["value"] >= 8 and self.rng.random() < 0.35:
            hand.remove("adrenaline")
            trick.mods[played["id"]] = trick.mods.get(played["id"], 0) + 2
            trick.specials_used_by.add(p)
            self.stats["adrenaline"] += 1
            return
        # poison vs highest opponent so far
        if "poison" in hand and trick.plays and self.rng.random() < 0.3:
            opp = max((pl for pl in trick.plays if self.team(pl.player) != self.team(p)), key=lambda pl: pl.effective_value, default=None)
            if opp:
                hand.remove("poison")
                # shield chance from that opponent
                if "shield" in self.special_hands[opp.player] and not trick.silence and opp.player not in trick.specials_used_by and self.rng.random() < 0.5:
                    self.special_hands[opp.player].remove("shield")
                    trick.specials_used_by.add(opp.player)
                    self.stats["shield"] += 1
                    self.stats["poison_blocked"] += 1
                else:
                    trick.mods[opp.card["id"]] = trick.mods.get(opp.card["id"], 0) - 2
                    self.stats["poison"] += 1
                trick.specials_used_by.add(p)
                return
        if "scout" in hand and self.rng.random() < 0.1:
            hand.remove("scout")
            trick.specials_used_by.add(p)
            self.stats["scout"] += 1

    def resolve_trick(self, trick: TrickState) -> int:
        # recompute effective values with mods
        for pl in trick.plays:
            delta = trick.mods.get(pl.card["id"], 0)
            delta = max(-2, min(2, delta)) if delta else 0
            # allow net from adrenaline+poison separately already applied per card id
            pl.effective_value = pl.card["value"] + trick.mods.get(pl.card["id"], 0)

        led = trick.led_suit
        superior = trick.superior
        candidates = list(trick.plays)
        # Superior cards (effective suit) beat non-superior when played by void logic:
        # A card competes on superior track if effective_suit == superior and effective_suit != led
        # or if led == superior and effective_suit == superior.
        def track(pl: Play):
            if superior and pl.effective_suit == superior:
                return (2, pl.effective_value)
            if pl.effective_suit == led:
                return (1, pl.effective_value)
            return (0, pl.effective_value)

        winner_play = max(candidates, key=lambda pl: (track(pl), -pl.player))
        # tie-break: higher track already; if equal value same track, earliest play wins
        best_key = track(winner_play)
        same = [pl for pl in candidates if track(pl) == best_key]
        same.sort(key=lambda pl: next(i for i, x in enumerate(trick.plays) if x is pl))
        return same[0].player

    def play_hand(self) -> dict:
        self.deal()
        leader = self.rng.randrange(4)
        self.superior = None
        self.superior_lock = 0
        while min(len(h) for h in self.hands) > 0 and max(self.team_tricks) < 7:
            if self.superior_lock > 0:
                # superior already set; lock counts down after trick
                pass
            trick = TrickState(leader=leader, superior=self.superior)
            order = [(leader + i) % 4 for i in range(4)]
            for p in order:
                led = trick.led_suit
                void = bool(led) and not any(c["suit"] == led for c in self.hands[p])
                card = self.choose_animal(p, led, self.superior)
                self.hands[p].remove(next(c for c in self.hands[p] if c["id"] == card["id"]))
                card = dict(card)
                card["_chameleon"] = False
                self.maybe_specials(trick, p, card, void)
                eff_suit = card["suit"]
                if card.get("_chameleon"):
                    eff_suit = led  # led must exist when void chameleon
                if trick.led_suit is None:
                    trick.led_suit = eff_suit
                play = Play(
                    player=p,
                    card=card,
                    effective_suit=eff_suit,
                    effective_value=card["value"],
                    chameleon=bool(card.get("_chameleon")),
                )
                trick.plays.append(play)
            winner = self.resolve_trick(trick)
            self.tricks_won[winner] += 1
            self.team_tricks[self.team(winner)] += 1
            # Anchor?
            if self.use_specials and "anchor" in self.special_hands[winner] and self.rng.random() < 0.25:
                self.special_hands[winner].remove("anchor")
                self.superior_lock = 2
                self.stats["anchor"] += 1
            # Superior update
            win_card = next(pl.card for pl in trick.plays if pl.player == winner)
            if self.superior_lock > 0:
                # keep current superior if lock active; if none, set from winner then lock
                if self.superior is None:
                    self.superior = win_card["suit"]
                self.superior_lock -= 1
            else:
                self.superior = win_card["suit"]
            leader = winner
            self.stats["tricks"] += 1
        team_winner = 0 if self.team_tricks[0] > self.team_tricks[1] else 1
        return {
            "team_tricks": list(self.team_tricks),
            "team_winner": team_winner,
            "stats": dict(self.stats),
            "tricks_won": list(self.tricks_won),
        }


def run_batch(n: int = 2000, seed: int = 42, use_specials=True):
    animals = load_animals()
    specials = load_specials()
    team_wins = Counter()
    usage = Counter()
    first_leader_team_wins = Counter()
    for i in range(n):
        m = Match(seed + i, specials, animals, use_specials=use_specials)
        # track first leader advantage: deal then note leader team after first hand result vs leader
        m.deal()
        # redo properly via play_hand but capture leader: simpler re-init
        m = Match(seed + i, specials, animals, use_specials=use_specials)
        result = m.play_hand()
        team_wins[result["team_winner"]] += 1
        usage.update(result["stats"])
    return {
        "matches": n,
        "use_specials": use_specials,
        "team_wins": dict(team_wins),
        "usage": dict(usage),
        "avg_tricks": usage.get("tricks", 0) / max(1, n),
    }


def compare_special_impact(n: int = 1500):
    base = run_batch(n=n, seed=100, use_specials=False)
    with_sp = run_batch(n=n, seed=100, use_specials=True)
    # rough dominance: usage rates
    return {"baseline_no_specials": base, "with_specials": with_sp}


if __name__ == "__main__":
    out = compare_special_impact(1500)
    path = ROOT / "data/special-card-sim-results.json"
    path.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(out, indent=2))
