# Visual Repair Report — Kimiyaye Vahsh

**Phase:** Visual Repair (frame / rank / power / nameplate / legendary)  
**Date:** 2026-09-15  
**Deck size:** 52 cards (Bonnacon archived; Giraffe restored as Herbivore 9)

---

## Summary

The presentation shell was redesigned for a premium fantasy trading-card feel. Existing portraits were kept. Herbivore legendary leaders are locked to **A = Behemoth, B = Unicorn, C = Mammoth**. Full deck and review sheets were re-rendered.

---

## What changed

### Design tokens (`data/design-tokens.json` v2)
- Suit-specific metal / accent / power-fill colors
- Motif tags: claw / vine / wing / coil
- Vazirmatn as primary Persian/English type
- Canonical herbivore legendary lock recorded

### Renderer (`tools/render_card.py`)
1. **Outer / inner frame** — layered rims, braided border dashes, suit-colored plate
2. **Corner ornaments** — suit motifs (claw, vine arc, wing arc, coil eyes)
3. **Portrait window** — double lip + soft vignette for shell/art cohesion
4. **Rank badge** — hexagonal medallion with metal ring, suit gem face, mirrored TL/BR
5. **Power bar** — 13-segment bar inside carved housing; legendary gold inner rim; suit-harmonized fills
6. **Suit icon tiles** — inset panels with bevel + corner ticks; shared icon family (fang / leaf / feather / scale)
7. **Nameplate** — depth shadow, double frame, side gems; Persian primary + English secondary (Vazirmatn)
8. **Legendary treatment** — gold rims, braid, stronger accents, slight portrait color/contrast lift

### Herbivore data
| Rank | Card | Notes |
|------|------|--------|
| 9 | Giraffe | Restored to keep 52 after Mammoth → C |
| 10 | Elephant | Promoted from previous slot shuffle |
| C | Mammoth | Legendary leader |
| B | Unicorn | Legendary leader |
| A | Behemoth | Legendary leader |

- **Bonnacon** removed from live deck; archived at `docs/archive/herbivore-bonnacon-archived.json`
- Bonnacon clean/presentation renders deleted

### Typography
- Replaced interim Tahoma-first path with **Vazirmatn Bold / Regular** under `assets/fonts/`
- RTL via arabic-reshaper + python-bidi unchanged

---

## What was preserved

- Gameplay rules, multiplayer, and architecture
- Portrait assets for essentially the full deck (no mass regeneration)
- 13-segment power model and rank mapping (`data/rank-model.json`)
- Card IDs, Persian/English names, suit structure
- Special-card / alchemy family (out of scope for this shell pass)

---

## What was regenerated

| Item | Reason |
|------|--------|
| Giraffe portrait + prompt | Needed after restoring rank 9 |
| All 52 clean + presentation PNGs/WebPs | New shell |
| Prototype contact sheet | Step 6 evaluation |
| Per-suit, full-deck, legendary, rank, herbivore-trio, thumbnail QA sheets | Final exports |
| Bonnacon renders | Removed from final output |

Portraits classified mostly as **keep**. No deck-wide portrait regen. Mammoth kept existing art but now renders with full legendary shell.

---

## Major visual decisions

1. **Hex rank seals** — readable 1–10 / A–B–C, medallion presence without covering the portrait.
2. **Suit motif language** — identity in border rhythm, corners, icon tiles, and power fill — not only flat color swaps.
3. **Power housing** — segments stay functionally clear; channel + gleam make them feel authored.
4. **Legendary = same system, elevated chrome** — gold rims/braid/accent lift, not a second unrelated layout.
5. **Herbivore trio lock** — Behemoth / Unicorn / Mammoth; Bonnacon archived, Giraffe fills the numeric gap.

---

## Before / after notes

| Area | Before | After |
|------|--------|--------|
| Frame | Flat bordered panel | Layered rim + braid + suit ornaments |
| Rank | Plain corner numeral | Hex seal medallion (suit gem) |
| Power | Floating green strips | Housed 13-seg, suit/legendary fills |
| Nameplate | Flat strip | Framed plate with depth + gems |
| Icons | Placeholder squares | Family of carved seal marks in tiles |
| Legendary | Mildly stronger | Gold chrome + braid + accent lift |
| Herbivore C | Bonnacon (or conflicting) | Mammoth; Bonnacon archived |

---

## Deck identity

**Improved.** Cards read as one collectible system with clearer suit and rarity signals while portraits stay the art focus.

---

## Remaining visual weaknesses

1. **Behemoth portrait** still reads as lion-adjacent; shell is premium, but a future art pass could push more distinct Behemoth anatomy if desired.
2. **Normal corners** are lighter than legendary — intentional hierarchy; can thicken claw/vine/wing marks later if normals feel thin at thumbnail size.
3. **Some bust crops** remain; only legendaries/high ranks were composition-sensitive — further heroic crops are optional.
4. **Giraffe** is newly generated; worth a quick human QA against the rest of the herbivore line.

---

## Deliverable paths

### Renders
- `assets/cards/final/clean/*.png` (+ `.webp`) — 52 cards
- `assets/cards/final/presentation/*.png`

### Review sheets
- `review/visual-repair/prototype-batch.jpg`
- `review/final-deck/full-deck.jpg`
- `review/final-deck/carnivores.jpg`
- `review/final-deck/herbivores.jpg`
- `review/final-deck/birds.jpg`
- `review/final-deck/reptiles.jpg`
- `review/final-deck/legendary-collection.jpg`
- `review/final-deck/herbivore-legendary-trio.jpg`
- `review/final-deck/rank-comparison.jpg`
- `review/final-deck/thumbnail-qa.jpg`

### Data / archive
- `data/design-tokens.json`
- `data/cards.json` (herbivore lock)
- `data/final-deck-manifest.json`
- `docs/archive/herbivore-bonnacon-archived.json`

### Tools
- `tools/render_card.py`
- `tools/visual_repair_render.py`
- `tools/fix_herbivore_legendaries.py`

---

## 2026-09-15 — Reference alignment pass

Moved shell closer to uploaded Behemoth target:

* cream/white outer border
* thicker metallic braided rectangular frame
* circular braided portrait seal + nebula plate
* **vertical** mirrored 13-segment power bars (L/R)
* light nameplate with metal rim (Persian primary)
* **optical ink centering** for rank glyphs (fixes numbers/letters sitting off-center in hex seals)

Reference stored at `review/visual-repair/refs/behemoth-target.jpg`.
