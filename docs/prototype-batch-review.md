# Prototype Batch Review — Phase 09

**Purpose:** Cross-suit validation (not bulk production).  
**Art direction:** `provisional` — Stylized Semi-Realistic Fantasy Illustration (`docs/art-direction-provisional.md`).  
**Renderer:** `tools/render_card.py` (created this phase; none existed before).

---

## Prototype set (canonical selections)

| # | Card | Suit | Rank | Fill | Why this card |
|---|------|------|------|------|----------------|
| 1 | Lion | carnivore | 9 | 9/13 | Required |
| 2 | Wolf | carnivore | 4 | 4/13 | Required |
| 3 | Fox | carnivore | 2 | 2/13 | Required |
| 4 | Mammoth | herbivore | 10 | 10/13 | Powerful herbivore from canonical deck (rank 10) |
| 5 | Harpy Eagle | bird | 10 | 10/13 | Eagle-tier canonical representative |
| 6 | King Cobra | reptile | 4 | 4/13 | Required representative |
| 7 | Griffon | carnivore | B | 12/13 | Legendary B |

---

## Automated checks

All required assertions **PASS**:

- Lion 9 → 9/13 · Carnivore theme
- Wolf 4 → 4/13
- Fox 2 → 2/13
- Griffon B → 12/13 · Legendary frame treatment
- Mammoth / Harpy Eagle / King Cobra match canonical ranks & fills

---

## Per-card evaluation

### Lion
- **Artwork quality:** Strong roaring portrait; cinematic warm/cool split lighting.
- **Character identity:** Dominant Rank-9 presence clear.
- **Crop:** Head+mane fills window well.
- **Readability:** Rank badge and bar correct; Persian name OK after RTL fix.
- **Consistency:** Sets carnivore red language.
- **Problems:** Background ember density slightly busy vs design “not overly busy” — acceptable for prototype.

### Wolf
- **Artwork quality:** Good howl silhouette; moonlight mood.
- **Character identity:** Wild wolf (not dog) succeeds.
- **Crop:** Raised muzzle reads at thumbnail size.
- **Readability:** Rank 4 / 4 segments clear.
- **Consistency:** Same illustration family as Lion.
- **Problems:** Darker overall; thumbnail contrast slightly lower than Lion/Fox.

### Fox
- **Artwork quality:** Excellent cunning expression; not childish.
- **Character identity:** Intelligent/angled head matches brief.
- **Crop:** Face-forward readable small.
- **Readability:** Rank 2 / 2 fill correct.
- **Consistency:** Matches carnivore suite.
- **Problems:** Minor — could use slightly stronger silhouette edge.

### Mammoth (Herbivore rep)
- **Artwork quality:** Mass and tusks communicate power.
- **Character identity:** Controlled strength; not “weak herbivore.”
- **Crop:** Tusks dominate — good for recognition.
- **Readability:** Green suit distinction works; Rank 10 / 10 fill OK.
- **Consistency:** Style aligned; palette correctly green-family.
- **Problems:** Frontal crop leaves less “face expression” than predators — expected for species.

### Harpy Eagle (Bird rep)
- **Artwork quality:** Sharp eye/beak/crest; aerial authority.
- **Character identity:** Eagle-tier readable.
- **Crop:** Profile works for feathers.
- **Readability:** Blue suit clear; Rank 10 / 10 fill OK.
- **Consistency:** Shares “raptor eye language” useful for Griffon universe.
- **Problems:** Card still `needs-review` in canonical data for source-asset identity (Harpy vs generic eagle) — prototype does not resolve that data issue.

### King Cobra (Reptile rep)
- **Artwork quality:** Hood + scales + tension; not turned into a dragon.
- **Character identity:** Ambush/calculated danger succeeds.
- **Crop:** Hood silhouette excellent at thumbnail size.
- **Readability:** Purple suit distinct; Rank 4 / 4 fill OK.
- **Consistency:** Same stylized fantasy treatment.
- **Problems:** None major for prototype goals.

### Griffon (Legendary B)
- **Artwork quality:** Eagle+lion hybrid reads; restrained glow.
- **Character identity:** Same universe as Lion + Eagle — success.
- **Crop:** Profile head clear.
- **Readability:** B badge + 12/13 gold-tint bar + dual legendary frame visible.
- **Consistency:** Legendary distinction via frame/presence, not VFX spam.
- **Problems:** Ornament still minimal (prototype frame); final legendary frame art TBD.

---

## Sheets

| Sheet | Path | Result |
|-------|------|--------|
| Consistency | `assets/prototypes/sheets/consistency-sheet.png` | Style/suit colors/frames comparable side-by-side |
| Thumbnail | `assets/prototypes/sheets/thumbnail-check.png` | Rank, suit color, animal still recognizable at gameplay size |

Thumbnail verdict: **acceptable for prototype**. Rank squares remain readable; suit colors distinguish cards; animals remain identifiable (cobra hood / mammoth tusks / lion mane especially strong).

---

## Global Card Design System issues

1. **No prior renderer/tokens/frames** — Phase 09 introduced a minimal Pillow renderer. Final design system (tokens, true suit icons, Normal vs Legendary frame assets) still missing.
2. **Persian RTL** — Initial render broke glyph order; fixed with `arabic-reshaper` + `python-bidi`. Must remain a hard renderer requirement.
3. **Suit icons** — Geometric placeholders (triangle/leaf/diamond/hex). Need authored icons later.
4. **Power bar orientation** — Prototype uses horizontal top bar for readability in 1000×1400; original prompts also described vertical bars under ranks. Decide before full production.
5. **Portrait style drift risk** — AI portraits are close but not locked to a single model seed/reference sheet. Need a locked style board before bulk.
6. **Harpy Eagle data flag** — Visual prototype OK; canonical `needs-review` remains for asset naming identity.
7. **Legendary frame** — Dual gold line is a stand-in; not final ornamented Legendary Frame.

---

## Outputs inventory

- Prompts: `prompts/portraits/prototypes/*.md` (7)
- Portraits: `assets/prototypes/portraits/*.png` (7)
- Clean cards: `assets/prototypes/cards/clean/*.png` (7)
- Presentation cards: `assets/prototypes/cards/presentation/*.png` (7)
- Sheets: `assets/prototypes/sheets/*.png` (2)
- Manifest: `data/prototype-batch.json`

## Explicitly NOT done

- No remaining 45 portraits
- No full 52-card render
- No speculative redesign of entire deck
- No game environment / multiplayer / rules
