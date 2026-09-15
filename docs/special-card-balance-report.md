# Special Card Balance Report — v1

## Distribution locked

- Model: fixed small special hand (2 specials per player)
- Deck: 2 copies × 7 types = 14
- Max 1 special per player per trick

## Simulator

Tool: `tools/simulate_special_balance.py`  
Results: `data/special-card-sim-results.json`  
Method: 1500 synthetic hands with heuristic bots (not human-optimal).

### Sanity results

| Mode | Team0 wins | Team1 wins |
|------|------------|------------|
| No specials | 747 | 753 |
| With specials | 741 | 759 |

Team balance remains near 50/50. Specials do not create a structural team bias in this heuristic batch.

### Usage (with specials, 1500 hands)

| Card | Activations (approx) | Read |
|------|---------------------:|------|
| Adrenaline | 1503 | Common on high cards — expected; scarcity still limits blowups |
| Poison | 1362 | Common contested tool |
| Silence | 1033 | Healthy anti-combo presence |
| Scout | 1141 | Frequent low-impact info use |
| Anchor | 842 | Moderate superior-lock usage |
| Chameleon | 841 | Situational void tool — healthy |
| Shield | 230 | Low by design (reactive only); still blocked 230 Poisons |

No card approached “must-pick always wins hand alone” behavior under these heuristics.

## Conservative adjustments made during design

1. Cap ±2 and ban same-type stacking on one animal.
2. Chameleon restricted to **void-only led-suit mimic** (preserves follow-suit).
3. Silence does not unwind already-applied effects (prevents undo loops).
4. Anchor extends Superior by one extra trick only (no permanent runaway).
5. Chose fixed 2-card special hands over mid-hand special draws.

## Residual risks

- Skilled humans may time Adrenaline+high-rank better than bots — monitor in playtests.
- Shield may feel rare; acceptable for v1 reactive tech.
- Anchor + long Superior runs should be watched in live play; duration already short.

## Artwork

- Family: obsidian/amber alchemy (not an animal suit color alone)
- Portraits: `assets/cards/special/portraits/`
- Clean/presentation: `assets/cards/special/final/`
- Contact sheet: `review/special-cards/special-contact-sheet.jpg`

## Verdict

v1 special set approved for rules lock. No further numeric nerfs required from this sanity pass.
