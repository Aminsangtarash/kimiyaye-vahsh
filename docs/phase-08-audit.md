# Phase 08 Audit — Consolidation Checkpoint

**Project:** کیمیای وحش (Kimiyaye Vahsh)  
**Phase:** 08 — Consolidation Audit & Canonical Deck Checkpoint  
**Date:** 2026-09-12  
**Rule:** Stabilize only. No redesign from scratch. No bulk art. No deletions of prior work.

---

## 1. What actually exists (inventory)

### Present in `site/`

| Area | Status | Paths |
|------|--------|-------|
| Canonical / deck data | **Present** | `data/cards.json`, `main-deck.draft.json`, `candidates-by-suit.json`, `deck.json`, `carnivores.json`, `suits.json`, `rank-model.json`, `rejected-card-candidates.json` |
| Selection / naming docs | **Present** | `docs/deck-candidate-review.md`, `docs/deck-selection-decisions.md`, `docs/design-principles.md`, `data/SOURCE_AUDIT.md`, `data/NAME_AUDIT.md` |
| Design tokens | **Missing** | none |
| Card renderer | **Missing** | no `src/`, no render scripts |
| Frame assets | **Missing** | none |
| Suit icon assets | **Missing** | none |
| Generated portrait prompts (structured) | **Missing** | none in site |
| Generated card previews / exports | **Missing** | none |
| Game environment / multiplayer / rules code | **Missing** | none (correct for this phase) |

### Parent folder sources (outside `site/`, referenced only)

Four suit image folders + ZIPs + list TXT files + `prompts.txt` — Phase 01 audit already covered these. Not moved/deleted.

### Prompts 01–07 completion reality

| Prompt / theme | Actually completed? |
|----------------|---------------------|
| 01 Source audit & data foundation | Yes |
| 02 Deck selection & ranking draft | Yes (partial confirmations) |
| Design principles (tone) | Yes — `docs/design-principles.md` |
| Dragon of Moses identity / III exception | Yes — metadata in data |
| Carnivore lock | Yes |
| Reptile normals provisional ranks | Yes — documented |
| 03–07 Visual system / renderer / frames / bulk art | **Not found in repo** |

**Conclusion:** Data + documentation checkpoint exists. Visual pipeline (tokens, frames, renderer, final portraits) has **not** been built inside `site/`.

---

## 2. Contradictions found & actions

| # | Issue | Action taken |
|---|--------|--------------|
| C1 | `cards.json` had **64** entries (full candidate pool) while Main Deck target is **52** | **Fixed:** `cards.json` rewritten as authoritative **52** main cards. Pool preserved in `candidates-by-suit.json` / `deck.json` / `main-deck.draft.json` (not deleted). |
| C2 | `suits.json` still said `faceRankMap: null` / deferred while Phase 08 requires configured power-bar mapping | **Fixed:** `data/rank-model.json` created; `suits.json` points to it. |
| C3 | A/B/C previously kept `numericPower: null` while visual bar needs C=11, B=12, A=13 | **Fixed via config:** cards now store `powerBarFill` + `numericPower` **from** `rank-model.json` (not scattered literals in renderer — renderer still missing). `displayRank` remains `A`/`B`/`C`. |
| C4 | Risk of reading Dragon of Moses as alt-art / multi-form | **Verified FINAL:** three independent legendary cards; `mythicForm` deprecated; III has `portraitConcept: extreme-scale-eye-only` + `artisticException`. |
| C5 | `cards.json` herbivore/bird ranks incomplete vs `main-deck.draft.json` ranked 52 | **Fixed** by promoting main-deck selection into canonical `cards.json`. |
| C6 | Asset filename ranks `8_lion` / `9_tiger` vs Base List Tiger=8 Lion=9 | **Documented only** (carnivore lock). No membership change. |
| C7 | Harpy Eagle vs asset `10_eagle.png` identity | **Preserved** as `needs-review` — not auto-replaced. |
| C8 | No renderer/config to contradict yet | Noted as **missing**, not a code bug. |

No duplicate `id` values in the 52-card set.

---

## 3. Dragon of Moses (FINAL)

| Card | Rank | portraitConcept | Notes |
|------|------|-----------------|-------|
| Dragon of Moses I | C | `large-head-and-neck` | Independent legendary; head+neck readable |
| Dragon of Moses II | B | `frame-filling-colossal-head` | Independent legendary; head dominates frame |
| Dragon of Moses III | A | `extreme-scale-eye-only` | Independent legendary; eye/scales/face fragment/shadow; frame unchanged legendary |

Never merge. Never mark II/III as alternate artwork.

---

## 4. Suit structures (canonical)

### Carnivore — APPROVED (unchanged)

1 Wolverine … 10 Polar Bear; C Amarok; B Griffon; A Nemean Lion.

### Reptile — 10 normals (provisional ranks) + 3 Moses (approved)

Normals (preserved from Phase 02 selection; not silently replaced):  
Gila Monster, Alligator Snapping Turtle, Python, King Cobra, Black Mamba, Taipan, Anaconda, Black Caiman, Crocodile, Komodo Dragon.

Concern (documented, not changed): order differs slightly from original `لیست خزندگان.txt` (Gila/Turtle and Caiman/Crocodile). Status remains `provisional`.

### Bird — provisional 13 preserved

Ranks 1–6 draft; 7–10 + A/B/C from sources.  
`bird-harpy-eagle` = `needs-review`.

### Herbivore — provisional 13 preserved

Full Phase 02 draft ladder unchanged.

---

## 5. Rank model

Single config: `data/rank-model.json`

- Order: A > B > C > 10 > … > 1  
- Power bar: 1→1/13 … 10→10/13; C→11/13; B→12/13; A→13/13  

---

## 6. Rejected candidates

Stored in `data/rejected-card-candidates.json` (13 entries: 12 bench + Monitor Lizard conceptual cut).  
Nothing permanently discarded from project history.

---

## 7. Asset mapping (no generation)

| Field | Typical status |
|-------|----------------|
| portrait asset | `prototype` if parent named PNG referenced; else `missing` (2 cards) |
| portrait prompt | `missing` for all 52 |
| frame | `missing` for all 52 |
| rank / suit / names / type | present |
| renderStatus | `missing` for all 52 |

Classifications used: `missing` | `draft` | `prototype` | `approved`.  
No portraits generated in Phase 08.

---

## 8. Renderer audit

**Result:** No renderer implementation found under `site/`.

Required capabilities (1000×1400, frames, themes, power bar, exports) are **specified as targets** in checkpoint metadata / docs only — **not implemented**.

No code bugs to fix (nothing to run).

---

## 9. Validation performed

- Asserted 52 cards, 13 per suit, unique ranks 1–10+C/B/A per suit, 10 normal + 3 legendary per suit.
- Confirmed carnivore membership/order.
- Confirmed three Moses cards independent with III exception metadata.

---

## 10. Files written/updated this phase

| File | Action |
|------|--------|
| `data/cards.json` | Rebuilt as canonical 52 |
| `data/rank-model.json` | Created |
| `data/rejected-card-candidates.json` | Created |
| `data/suits.json` | Linked to rank-model |
| `docs/phase-08-audit.md` | Created (this file) |
| `docs/current-deck-status.md` | Created |
| Prior Phase 01–02 files | **Preserved** |
