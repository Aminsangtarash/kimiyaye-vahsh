# Phase 13 — Final Deck Rendering Report

## Summary

- Total cards rendered: **52** / 52
- QA status: **PASS**
- Clean outputs: `assets/cards/final/clean/`
- Presentation outputs: `assets/cards/final/presentation/`
- Review package: `review/final-deck/`
- Manifest: `data/final-deck-manifest.json`

## Validation results

### Pre-render

- All pre-render checks passed (suit counts, ranks, power fills, portraits present).

### Programmatic QA

- Exactly 52 unique card IDs and filenames
- Dimensions 1000×1400 for all clean cards
- Power bar fill mapped correctly for ranks 1–10 / C / B / A (segments=13)
- Portraits, ranks, and suit assignments present for every card

### Counts

- By suit: carnivore 13, herbivore 13, bird 13, reptile 13
- By type: normal 40, legendary 12

## Review assets

- Suit sheets: `review/final-deck/carnivores.jpg`, `herbivores.jpg`, `birds.jpg`, `reptiles.jpg`
- Full deck: `review/final-deck/full-deck.jpg`
- Legendary collection: `review/final-deck/legendary-collection.jpg`
- Rank comparison: `review/final-deck/rank-comparison.jpg`
- Moses trilogy: `review/final-deck/dragon-of-moses-trilogy.jpg`
- Thumbnails: `review/final-deck/thumbnail-qa.jpg`
- Rotation samples: `review/final-deck/rotation-samples/`

## Portrait notes for this phase

- Phase 12 left only carnivore finals on disk; missing portraits were recovered in Phase 13 so the deck could render (allowed: missing assets).
- Seeded from Phase 09 prototypes: mammoth, harpy-eagle, king-cobra.
- Remaining missing finals were generated as portrait-only assets under `assets/cards/portraits/final/{suit}/`.
- Renderer zoom for `extreme-scale-eye-only` set to 1.0 because Moses III final art already encodes the eye-scale concept.

## Unresolved visual problems

- Owner visual review still required (HARD STOP).
- Persian typography uses Tahoma reshape/bidi; confirm no clipping in final review.
- Suit symbols remain geometric placeholders (triangle / leaf / diamond / hex) pending final icon set.
- `bird-harpy-eagle` remains `needs-review` in canonical data identity notes.
- Some recovered portraits may need owner-selected regenerations for strict style unity across suits.

## Rejected / regenerated cards

- No rendered cards rejected by Phase 13 automation.
- Missing final portraits recovered before render (see portrait notes).

## File locations

- `assets/cards/final/clean/{slug}.png` (+ `.webp`)
- `assets/cards/final/presentation/{slug}.png`
- `assets/cards/portraits/final/{suit}/{slug}.png`
- `review/final-deck/*.jpg`
- `data/final-deck-manifest.json`
- Render tool: `tools/phase13_render_deck.py`

## HARD STOP

Phase 13 complete pending owner review of the full 52-card deck.

Do not begin Special Card or Game Environment phases until approved.
