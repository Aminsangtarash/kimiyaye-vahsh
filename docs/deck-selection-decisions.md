# Deck Selection Decisions — Phase 02

## Reptile Normal Cards (ranks 1–10)

**Status of ranking:** `provisional` — awaiting user confirmation.  
**Legendary trio (Dragon of Moses I/II/III):** unchanged / FINAL — not part of this cut.

### Candidate pool considered

| Candidate | In Phase 01 named data? |
|-----------|-------------------------|
| Alligator Snapping Turtle | Yes (source list) |
| Gila Monster | Yes (source list) |
| Python | Yes (source list) |
| King Cobra | Yes (source list) |
| Black Mamba | Yes (source list) |
| Taipan | Yes (source list) |
| Anaconda | Yes (source list) |
| Crocodile | Yes (source list) |
| Black Caiman | Yes (source list) |
| Komodo Dragon | Yes (source list) |
| Gharial | Yes (asset-only extra) |
| Monitor Lizard | **No** named card/list/asset in Phase 01 sources |

### Selection criteria (combined — not physical power alone)

Threat · Physical power · Venom · Hunting capability · Visual identity · Card-game appeal · Species distinction · Variety (avoid filling the suit with near-duplicates)

---

### Two cards NOT selected (cut)

#### 1) Gharial

**Decision:** Out of Main Deck 10 normals → remains on **bench**.

**Reasons:**
- **Threat / hunting:** Highly specialized fish-eater; weaker competitive “menace” fantasy than other crocodilians.
- **Species distinction / variety:** Suit already keeps **Crocodile** and **Black Caiman**; a third crocodilian adds redundancy with less card drama.
- **Card-game appeal:** Narrow snout / piscivore identity is distinctive but less aggressive for a competitive animal deck than the selected ten.
- **Not invented:** Cut is from an existing asset candidate, not a deletion of source-ranked lore.

#### 2) Monitor Lizard (generic)

**Decision:** Not added to Main Deck.

**Reasons:**
- **No Phase 01 named source:** Not present in `لیست خزندگان.txt` or as a named file in `خزندگان/` / ZIP. Selecting it would require inventing a new creature entry.
- **Species distinction:** **Komodo Dragon** already occupies the apex monitor niche (Komodo *is* a monitor). A generic “Monitor Lizard” would dilute distinction and overlap visually/thematically with rank 10.
- **Policy:** Prefer documenting the gap over inventing a card to force variety.

---

### Selected 10 real reptiles — provisional ranks

| Rank | englishName | persianName | Brief placement rationale |
|------|-------------|-------------|---------------------------|
| 1 | Gila Monster | هیولای گیلا | Unique venomous lizard; strong visual ID; lowest scale/threat in set |
| 2 | Alligator Snapping Turtle | لاک‌پشت گازگیر تمساحی | Distinct clade (turtle); ambush bite; limited mobility vs higher threats |
| 3 | Python | پایتون | Entry constrictor; hunting via coil; less mass than Anaconda |
| 4 | King Cobra | شاه‌کبرا | Iconic hood visual; venom + intimidation; high card appeal mid-ladder |
| 5 | Black Mamba | مامبای سیاه | Speed + lethal reputation; excellent threat/appeal balance |
| 6 | Taipan | تایپان | Peak venom specialist; slightly less pop-iconic than Mamba |
| 7 | Anaconda | آناکوندا | Top constrictor physical power and prey control |
| 8 | Black Caiman | کایمن سیاه | Large aggressive New World crocodilian hunter |
| 9 | Crocodile | کروکودیل | Apex crocodilian archetype; maximum recognition/ambush threat among normals below Komodo |
| 10 | Komodo Dragon | اژدهای کومودو | Highest real reptile package: size, venom, hunting, “dragon” visual identity |

**Variety check across the 10:** turtle · small venomous lizard · constrictors (2) · elapids (3) · crocodilians (2) · apex monitor (1).

### Compared to original `لیست خزندگان.txt` order

Source list order differed slightly (Turtle=1, Gila=2, … Crocodile=8, Black Caiman=9).  
Provisional draft swaps emphasis for **card appeal / variety**:
- Gila ↔ Turtle at the bottom (Gila=1 for unique low-scale venom ID)
- Black Caiman=8, Crocodile=9 (Crocodile higher recognition as apex croc slot)
- Venom ladder Mamba=5, Taipan=6 retained in spirit of source mid-tier elapids

Until confirmation, all ten normals use:

```json
"rankStatus": "provisional"
```

---

### Open for user confirmation

1. Approve or reorder ranks 1–10.  
2. Confirm cuts: **Gharial** + **Monitor Lizard** (not invented).  
3. If Monitor Lizard should exist later, it needs an explicit new source entry — not silently added.
