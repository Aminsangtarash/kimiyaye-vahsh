# Current Deck Status — کیمیای وحش

**Checkpoint:** Phase 08 Canonical  
**Authoritative file:** `data/cards.json`  
**Rank config:** `data/rank-model.json`

---

## Snapshot

| Metric | Value |
|--------|-------|
| Main cards | **52** |
| Per suit | carnivore 13 · herbivore 13 · bird 13 · reptile 13 |
| Normal | **40** (10×4) |
| Legendary | **12** (3×4) |
| Approved | 16 |
| Provisional | 35 |
| Needs-review | 1 (`bird-harpy-eagle`) |
| Rejected/bench preserved | 13 (`data/rejected-card-candidates.json`) |

---

## Suit readiness

| Suit | Membership | Ranking | Notes |
|------|------------|---------|-------|
| Carnivore | Locked | Locked | Approved base data |
| Reptile normals | Selected | Provisional | See deck-selection-decisions.md |
| Reptile legendaries | Locked | Locked FINAL | Moses I/II/III independent |
| Bird | Selected | Provisional | Harpy art identity needs-review |
| Herbivore | Selected | Provisional | Full draft ladder |

---

## Dragon of Moses III (exception)

- Frame: Legendary (same system; not redesigned)
- Portrait: `extreme-scale-eye-only`
- Shows only: giant eye · surrounding scales · fragment of face · strong shadow
- Message: creature too large to fit in the card

---

## Visual / renderer state

| System | State |
|--------|-------|
| Design tokens | missing |
| Normal / Legendary frames | missing |
| Suit icons | missing |
| Card renderer (1000×1400) | **not found** |
| Final portraits | not generated |
| Source concept PNGs (parent folders) | many exist → mapped as `prototype` refs only |

---

## Design tone (locked principles)

Must: professional · fantasy · mysterious · competitive · readable · teen/adult  
Must not: childish · chibi · overly busy · horror · photorealistic stock-like  

See `docs/design-principles.md`.

---

## Power bar (from config only)

| displayRank | fill / 13 |
|-------------|-----------|
| 1–10 | 1–10 |
| C | 11 |
| B | 12 |
| A | 13 |

Source: `data/rank-model.json` → `displayRankToPowerBarFill`.

---

## Safe next steps (not done here)

1. User confirm provisional reptile/bird/herbivore ranks  
2. Resolve Harpy Eagle vs `10_eagle.png`  
3. Design tokens + Normal/Legendary frames  
4. Renderer skeleton 1000×1400  
5. Portrait generation pipeline (per-card, not bulk-blind)

**Out of scope until later:** full 52 final art, game environment, multiplayer, game rules.
