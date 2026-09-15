# Final Art Direction — کیمیای وحش

**Status:** `LOCKED / APPROVED`  
**Authority:** Autonomous lock under Prompt 11 (owner-delegated)  
**Baseline evaluated:** Phase 09–10 prototypes + Phase 13 full-deck renders  
**Selected style:** **Stylized Semi-Realistic Fantasy Illustration**

---

## Decision rationale (objective)

Evaluated against the 10 priority criteria using Phase 10 review package and full-deck outputs:

| Criterion | Winner evidence |
|-----------|-----------------|
| Visual consistency | Same painterly language across Lion / Mammoth / Harpy / Cobra / Griffon |
| Gameplay-size readability | Rank badge + Persian name + silhouette remain usable at thumbnail |
| Four-suit fitness | Atmosphere tint carries suit; technique stays shared |
| Real + legendary | Griffon/Nemean/Moses sit in same universe as Wolf/Deer |
| Maturity | Teen/adult competitive tone; rejects chibi/stock |
| Fantasy identity | Cinematic rim light + atmospheric fog without neon spam |
| Production scalability | Promptable, repeatable, renderer-composited UI |
| Persian typography | Tahoma + reshape/bidi proven PASS in Phase 10 |
| Distinction from generic cards | Animal power fantasy + suit atmosphere + legendary dual-frame |
| Print suitability | Flat readable hierarchy, no glow-dependent detail |

**Rejected alternatives (implicit):** photoreal stock, flat cartoon/chibi, heavy ornament gothic, neon gacha glow.

Preferred baseline matched the strongest actual prototype result (**Lion / Griffon lineage**). Locked.

---

## Creature rendering style

- Stylized semi-realistic fantasy illustration (between cartoon and photoreal).
- Correct species anatomy mandatory; fantasy exaggerates presence, not identity.
- Medium stylization; cinematic key + rim lighting; sharp intentional eyes.
- Fur / feather / scale mass readable at hand size.
- Magical accents only as controlled legendary gleams — no particle spam.

## Frame

- Card canvas: **1000 × 1400** (~5:7).
- Rounded outer frame; rounded portrait window.
- **Normal:** suit-primary outline, medium weight.
- **Legendary:** thicker suit accent + inner gold ornamental line; same architecture (not a different franchise).
- Corner symmetry: rank TL + BR; suit symbol TR + BL.

## Typography

- **Primary:** Persian display name (RTL via arabic-reshaper + python-bidi).
- **Secondary:** English subtitle under Persian.
- Font: Tahoma / Tahoma Bold (system) until a licensed brand Persian face is acquired.
- No baked text inside portrait artwork.

## Portrait crop

- Default: head / head-and-neck, vertical ~3:4 window.
- Strong silhouette required.
- Pose diversity via production manifest cameras.
- **Dragon of Moses:**
  - C / I — readable head + neck (`large-head-and-neck`)
  - B / II — frame-filling colossal head (`frame-filling-colossal-head`)
  - A / III — `extreme-scale-eye-only` (giant eye, scales, face fragment, shadow; **no full head**)

## Color system

| Suit | Role | Primary RGB | Secondary | Accent |
|------|------|-------------|-----------|--------|
| Carnivore | Red | `160,28,36` | `90,12,18` | `240,190,120` |
| Herbivore | Green | `34,110,62` | `18,60,34` | `190,220,150` |
| Bird | Blue | `28,72,150` | `12,36,80` | `160,200,255` |
| Reptile | Purple | `98,48,140` | `48,20,72` | `210,170,255` |

Special-card family uses a separate **obsidian / amber** identity (not a fifth animal suit color alone).

Tokens file: `data/design-tokens.json`.

## Suit symbols (locked geometric set)

Final-for-v1 authored vector marks (renderer-drawn, print-safe):

| Suit | Symbol |
|------|--------|
| Carnivore | Fang triangle (point up) |
| Herbivore | Leaf |
| Bird | Diamond / kite |
| Reptile | Hex plate |

Color of mark = suit accent. May be replaced later by illustrated icons without changing layout slots.

## Legendary treatment

- Dual-line gold inner frame + thicker outer accent.
- Gold-tinted power-bar fill.
- Slight portrait contrast/saturation boost in renderer.
- Richer atmosphere allowed in portrait; **no excessive glow**.
- Remains visibly related to Normal cards.

## Power bar

- Horizontal **13 segments**.
- Fill from `data/rank-model.json` only.
- Mapping: 1→1 … 10→10, C→11, B→12, A→13.
- Normal fill: green; Legendary fill: gold.

## Background treatment

- Atmospheric only: gradients, fog, particles, abstract habitat hints.
- Suit-tinted ambience.
- No competing full landscapes inside portraits.

## Ornament density

- **Low–medium.** Hierarchy: creature > rank > name > suit mark > ornament.
- Legendary may add one inner gold line; avoid filigree spam.

## Export standard

| Asset | Spec |
|-------|------|
| Master portrait | PNG under `assets/cards/portraits/masters/{suit}/` |
| Optimized portrait | PNG + WebP under `assets/cards/portraits/final/{suit}/` |
| Clean card | 1000×1400 PNG + WebP `assets/cards/final/clean/` |
| Presentation card | Card on light canvas `assets/cards/final/presentation/` |
| Color space | sRGB |
| No baked UI in portraits | Mandatory |

---

## Related locked documents

- `docs/card-art-direction.md`
- `docs/portrait-production-quality-rules.md`
- `docs/design-principles.md`
- `docs/phase-11-owner-decisions.md`
- `data/design-tokens.json`
- `data/portrait-production-manifest.json`
