# Game Design Document — کیمیای وحش (v1)

**Status:** Canonical for first complete version  
**Rules machine source:** `data/game-rules.json`  
**Main deck:** `data/cards.json` (52)  
**Specials:** `data/special-cards.json` (7 types)  
**Art:** `docs/final-art-direction.md`

---

## 1. Vision

Kimiyaye Vahsh is a four-player partnership trick-taking game inspired by Hokm, built on a fantasy animal deck. Players read hands, follow suit, manage a dynamic Superior Suit, and spend scarce special cards for timing edges — without turning ranks into noise.

## 2. Player fantasy

You command beasts of four kingdoms. Winning a fight elevates that kingdom’s dominance for the next clash. Alchemy specials are rare interventions, not a second game.

## 3. Components

- 52 animal cards (4 suits × 13)
- 14 special cards (7 types × 2)
- 4 players / 2 teams (partners opposite)

## 4. Core loop

1. Deal 13 animals + 2 specials each  
2. Lead / follow / void decisions  
3. Optional one special per player per trick  
4. Resolve trick via Superior + strength  
5. Update Superior from winner’s suit  
6. First team to 7 tricks wins the hand; first to 3 hands wins the match  

## 5. Superior Suit (locked)

**Rule:** After each trick, the **printed suit of the winning animal** becomes Superior for the **next** trick.  
**First trick of a hand:** no Superior.  
**Anchor:** extends that Superior across one extra trick.

This resolves “previous winning play’s category becomes superior” into a single deterministic sentence with minimal edge cases.

## 6. Special system summary

Adrenaline, Poison, Chameleon, Shield, Scout, Silence, Anchor — see `docs/special-card-rules.md`.

Design pillars: follow-suit preserved, animal ranks matter, deterministic timing, scarce hands.

## 7. Presentation

- Main deck art direction locked  
- Special family: obsidian/amber alchemy  
- Standalone and connected modes share identical rules  

## 8. Non-goals (v1)

- No traditional Hâkem seat  
- No board movement minigame  
- No RNG combat beyond fair shuffling / first-lead seat  
- No permanent hand destruction specials  

## 9. Validation

- Deck render QA: `docs/final-main-deck-report.md`  
- Special balance sanity: `docs/special-card-balance-report.md`  
- Rules edge cases: `docs/rule-edge-cases.md`  
- Simulator: `tools/simulate_special_balance.py` (+ rules batch in same tool family)

## 10. Authority order

1. `data/game-rules.json`  
2. `data/special-cards.json` / `data/rank-model.json` / `data/cards.json`  
3. Human-readable rules FA/EN  
4. Lore docs (flavor only)
