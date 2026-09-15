# Phase 10 — Human Review Package

**Project:** کیمیای وحش (Kimiyaye Vahsh)  
**Location:** `review/phase-10/`  
**Hard stop:** Visual approval required before any bulk production.

Open these first:
1. `comparisons/consistency-sheet.png`
2. `comparisons/thumbnail-check.png`
3. `comparisons/normal-vs-legendary.png`
4. `presentation-cards/` (7 cards)

Programmatic QA: `qa-validation.json` → **all power bars PASS (13 segments, correct fills)** · **RTL PASS**

---

## A. Art Style

**Current status:** `provisional`

**Name:** Stylized Semi-Realistic Fantasy Illustration  
**Doc:** `docs/art-direction-provisional.md`

Aligned with design principles (professional / fantasy / mysterious / competitive / readable / teen-adult).  
**Not permanently approved.**

---

## B. Card Frame

**Status:** Prototype renderer frame (`tools/render_card.py`)

| Element | Status |
|---------|--------|
| Card size | 1000×1400 (ratio ≈ 5:7) — PASS |
| Outer rounded frame | Present |
| Portrait rounded mask | Present |
| Normal vs Legendary | Legendary = thicker accent + inner gold line |
| Final ornamented Legendary Frame asset | **Missing** (stand-in only) |
| Design tokens file | **Missing** |

**QA notes:** Corner badges symmetric (TL + BR). Frame alignment consistent across prototypes.

---

## C. Suit Identity

| Suit | Color | Symbol (placeholder) | Identifiable without name? |
|------|-------|----------------------|----------------------------|
| Carnivore | Red | Triangle | Mostly yes (color + triangle) |
| Herbivore | Green | Leaf-like | Yes if symbol noticed; leaf still crude |
| Bird | Blue | Diamond | Yes with color+diamond |
| Reptile | Purple | Hex | Yes with color+hex |

**Finding:** Color carries most of the suit signal. Symbols help but are geometric placeholders — **not final icons**.  
See `comparisons/cross-suit-identity.png`.

---

## D. Typography

**Persian rendering:** Fixed in Phase 09 via `arabic-reshaper` + `python-bidi`.  
Phase 10 re-check: shaping / RTL / center alignment / no clipping — **PASS** on all 7 prototypes.

Font: Tahoma (system). No dedicated brand Persian display font yet.

English subtitle: readable at 100% and 50%; weak at thumbnail size (acceptable — Persian primary).

---

## E. Power Bar

**Implementation:** Horizontal 13-segment bar under top rank area.  
**Source of truth:** `data/rank-model.json` → `powerBarFill`.

| Card | Rank | Expected | Measured | Result |
|------|------|----------|----------|--------|
| Lion | 9 | 9/13 | 9/13 | PASS |
| Wolf | 4 | 4/13 | 4/13 | PASS |
| Fox | 2 | 2/13 | 2/13 | PASS |
| Mammoth | 10 | 10/13 | 10/13 | PASS |
| Harpy Eagle | 10 | 10/13 | 10/13 | PASS |
| King Cobra | 4 | 4/13 | 4/13 | PASS |
| Griffon | B | 12/13 | 12/13 | PASS |

**Note:** Original prompts also described vertical bars; current prototype uses horizontal for readability. Owner may prefer vertical later — see Decisions.

**Thumbnail:** Segments still countable at 50%; at gameplay thumb size, fill *level* readable more than individual ticks.

---

## F. Legendary Treatment

**Griffon vs Lion:** See `comparisons/normal-vs-legendary.png`

Current legendary cues:
- Inner gold frame line + thicker accent
- Gold-tinted power bar fill
- Rank letter (B) instead of number
- Slight portrait contrast/saturation boost

**Verdict:** Recognizable as higher class **without** looking like a different franchise.  
**Gap:** Ornament still minimal — may need more crafted Legendary Frame later, **without** heavy glow spam.

---

## G. Prototype Cards

| Card | Short review |
|------|----------------|
| **Lion** | Strong roar identity; best carnivore reference. Crop/hierarchy good. |
| **Wolf** | Howl reads; darker — slightly weaker thumbnail contrast. |
| **Fox** | Cunning face succeeds; not childish. |
| **Mammoth** | Mass/tusks communicate power; herbivore not “weak.” |
| **Harpy Eagle** | Aerial authority clear; data `needs-review` for source naming remains. |
| **King Cobra** | Hood silhouette excellent; stayed a cobra (not a dragon). |
| **Griffon** | Same universe as Lion/Eagle; legendary cues work at prototype level. |

Portrait consistency: Same stylization family overall. Mild outliers: Wolf darker; Mammoth less facial “expression” (species-driven). Background complexity varies (Lion busier embers).

---

## H. Decisions Required From Owner

Only open preferences (answers not already locked in docs):

1. **Approve or reject** provisional art style as the production style?  
2. **Legendary frame:** keep minimal dual-line, or increase crafted ornament (still no glow spam)?  
3. **Portrait window size:** current crop OK, or larger/smaller animal vs UI chrome?  
4. **Suit colors:** current red/green/blue/purple OK, or adjust hues?  
5. **Power bar orientation:** keep horizontal prototype, or switch to vertical-under-rank per early prompts?  
6. **Suit icons:** accept geometric placeholders temporarily, or require authored icons before next art batch?

**Already decided (do not re-ask):**
- 52-card structure / Carnivore lock / Moses I·II·III independent + III eye-only concept  
- Design principles must/must-not list  
- No bulk generation until visual approval  

---

## Layout readability (recorded, not auto-enlarged)

| Size | Rank badge | Suit symbol | Power bar | Persian name | Animal |
|------|------------|------------|-----------|--------------|--------|
| 100% | Clear | Clear | Clear | Clear | Clear |
| 50% | Clear | OK | OK | Clear | Clear |
| Thumbnail | OK | Marginal | Fill-level OK, ticks hard | Persian OK / English weak | OK (strong silhouettes best) |

Elements that weaken first at small size: suit symbol detail, English subtitle, individual power-bar ticks.

---

## Dragon of Moses architecture (no final art)

Structural support added in renderer: `fit_portrait(... portraitConcept=...)`  
Supports:
- `large-head-and-neck` (I)
- `frame-filling-colossal-head` (II)
- `extreme-scale-eye-only` (III)

Test plate (placeholder only):  
`structural-tests/moses-iii-extreme-crop-architecture.png`  
Confirms legendary frame + rounded mask + extreme crop path work. **Not final Dragon artwork.**

---

## Package map

```
review/phase-10/
  REVIEW.md                          ← this file
  qa-validation.json
  presentation-cards/                ← 7 presentation renders
  size-ladder/<card>/                ← 100% / 50% / thumbnail
  comparisons/
    consistency-sheet.png
    thumbnail-check.png
    cross-suit-identity.png
    lion-size-ladder.png
    normal-vs-legendary.png
  structural-tests/
    moses-iii-extreme-crop-architecture.png
```
