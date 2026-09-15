# Phase 12 — Portrait Production Report

**Status:** complete  
**Art direction:** `docs/final-art-direction.md` (locked)

## Counts

| Metric | Count |
|--------|------:|
| Generated / present portraits | 52 |
| Approved | 52 |
| Needs-regeneration | 0 |
| Missing | 0 |

## Suit coverage

- Carnivores: 13
- Herbivores: 13
- Birds: 13
- Reptiles: 13 (includes Dragon of Moses I / II / III)

## Contact sheets

- `review/portraits/carnivores.jpg`
- `review/portraits/herbivores.jpg`
- `review/portraits/birds.jpg`
- `review/portraits/reptiles.jpg`
- `review/portraits/master-52.jpg`

## Asset roots

- Final: `assets/cards/portraits/final/{suit}/`
- Masters: `assets/cards/portraits/masters/{suit}/`
- Manifest: `data/portrait-production-manifest.json`
- Prompts: `prompts/portraits/final/`

## Dragon of Moses

| Card | Concept | Notes |
|------|---------|-------|
| I / C | large-head-and-neck | Readable head + neck |
| II / B | frame-filling-colossal-head | Greater scale / intimidation |
| III / A | extreme-scale-eye-only | Giant eye + scales + fragment; no full head |

## Known visual inconsistencies

- Suit atmosphere intensity varies slightly (carnivore ember vs herbivore fog).
- A few portraits include more environmental silhouette than ideal atmospheric minimum; still portrait-first.
- `bird-harpy-eagle` data identity remains `needs-review` in `cards.json` (portrait exists).
- Style unity is acceptable for v1; owner may request selective regenerations later.

## Production notes

- Portraits contain creature art only (no baked UI/text/rank).
- Optimized WebP siblings generated alongside PNG finals.
