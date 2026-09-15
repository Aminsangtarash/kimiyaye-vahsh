# Final Main Deck Report

**Status:** complete (Prompt 13)  
**Canonical data:** `data/cards.json`  
**Renderer:** `tools/render_card.py` + `tools/phase13_render_deck.py`  
**Art direction:** `docs/final-art-direction.md`

## Totals

- Main cards rendered: **52 / 52**
- Clean PNG + WebP: `assets/cards/final/clean/`
- Presentation PNG: `assets/cards/final/presentation/`
- Manifest: `data/final-deck-manifest.json`

## Suit breakdown

| Suit | Cards |
|------|------:|
| Carnivores | 13 |
| Herbivores | 13 |
| Birds | 13 |
| Reptiles | 13 |

| Type | Cards |
|------|------:|
| Normal | 40 |
| Legendary | 12 |

## Validation

Programmatic QA (Phase 13 pipeline): **PASS**

- Unique IDs and filenames
- Dimensions 1000×1400
- Power bar 13 segments with correct fills (1–10 / C=11 / B=12 / A=13)
- Correct suit theme tokens per card
- Portraits present for all cards
- Persian RTL pipeline active

## Review sheets

- `review/final-deck/carnivores.jpg`
- `review/final-deck/herbivores.jpg`
- `review/final-deck/birds.jpg`
- `review/final-deck/reptiles.jpg`
- `review/final-deck/full-deck.jpg`
- `review/final-deck/legendary-collection.jpg`
- `review/final-deck/rank-comparison.jpg`
- `review/final-deck/dragon-of-moses-trilogy.jpg`
- `review/final-deck/thumbnail-qa.jpg`
- `review/final-deck/rotation-samples/`

## Artwork status

All 52 portraits present and approved in `data/portrait-production-manifest.json`. No placeholders in the final main deck.

## Unresolved (non-blocking)

- Suit marks are locked geometric v1 icons (not painted emblems).
- Tahoma is interim Persian font.
- Owner may still request portrait regenerations for taste; deck composition is engineering-complete.
