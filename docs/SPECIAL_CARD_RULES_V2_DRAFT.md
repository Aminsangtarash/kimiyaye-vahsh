# Special Card Rules v2 — Draft (S1 Target)

**Status:** Target roster draft — **not wired to runtime**  
**Companion rules:** `docs/GAME_RULES_V2_DRAFT.md`  
**Runtime still uses:** `data/special-cards.json` (7 legacy types including Shield/Scout/Silence/Anchor)

Owner decision **S1:** do **not** canonize Cursor’s seven-card set. Target v1 gameplay uses **six** concepts below.

Legacy / inactive / experimental (keep data & code until later cleanup; not part of v2 canon):

- Shield — سپر  
- Scout — دیده‌بان  
- Silence — خاموشی  
- Anchor — لنگر  

---

## Global (known vs open)

| Topic | Known / intended | Unresolved |
|-------|------------------|------------|
| Roster size | Exactly 6 types for v2 | — |
| Distribution model | Prefer scarce tactical hand (v1 used 2 copies × N types, 2 dealt/player) | Copies per type; deck size; dealt per player; redraw? |
| Max specials / player / trick | Likely 1 (preserves animal primacy) | Not owner-locked |
| Strength math | Doping **+2.5**, Trap **−2.5** | Engine today is integer-only; tie-break with halves; stack caps |
| Hunter Realm interaction | Specials must not redefine Hunter Realm from card suit | Per-card details below |
| Follow-suit | Specials only create **explicit** exceptions | Per-card |
| Legendary | A/B/C stay 11/12/13; Final Sacrifice is rare counter path | Exact sacrifice resolution |

**Phase 1 rule:** do **not** invent missing resolutions silently. Open items are flagged **OPEN**.

---

## 1. Inversion — نفرین وارونگی

### Purpose

Reverse the usual power relationship so a normally weak card becomes dangerous (and/or a strong card becomes vulnerable) under controlled conditions.

### Current known rule

- Concept approved as one of the six S1 specials.
- Persian name: نفرین وارونگی.
- Must remain deterministic; must not make every low card universally dominant.

### Unresolved timing — **OPEN**

- Played before lead, with the animal play, after the animal is tabled, or as a reaction?
- Lasts for one trick only, or until end of hand?
- Declared on a specific card already in the trick, or on a card still in hand?

### Unresolved targeting — **OPEN**

- Own card only? Any card in the current trick? One opponent card?
- Does it invert **rank order within the comparison track** (Hunter / led), or invert absolute strength (e.g. strength′ = `14 − strength` or `max − strength`)?
- Does it affect only the targeted card, or the entire trick’s ordering?

### Stacking concerns — **OPEN**

- Interaction with Doping (+2.5) and Trap (−2.5): invert before or after deltas?
- Two Inversions on the same trick?
- Interaction with Chameleon’s effective suit rewrite.

### Interactions with Hunter Realm — **OPEN**

- If inverted card is off-Hunter, does inversion help it beat Hunter cards? (**Should probably not** delete Hunter primacy — flag for owner.)
- Preferred direction to validate later: inversion changes strength **within** the same winning-track rules, not “ignore Hunter.”

### Interactions with Legendary A/B/C — **OPEN**

- Can Inversion turn a `1` into something that beats `A` on the same track?
- Can Inversion weaken an `A` enough to lose to a mid card?
- If yes, does that steal Final Sacrifice’s design role?

### Interactions with other specials — **OPEN**

- vs Trap / Doping order  
- vs Team Bond combined strength  
- vs Final Sacrifice (who wins if both apply?)

---

## 2. Chameleon — نیرنگ آفتاب‌پرست

### Purpose

Controlled realm/suit adaptation when void — softens voids without deleting follow-suit skill.

### Current known rule (target direction)

- Persian: نیرنگ آفتاب‌پرست.
- **If the player still holds the led suit → must follow; Chameleon is illegal for that play.**
- **If void in led suit →** Chameleon may grant controlled flexibility so the played animal counts as a chosen/led suit **for comparison only**.
- Printed rank / base strength unchanged by Chameleon itself.
- Must **not** become a universal ignore-follow-suit tool.
- Must **not** by itself change Hunter Realm identity.

### Unresolved timing — **OPEN** (minor)

- Must be declared simultaneously with the animal play (preferred) vs a separate command window?

### Unresolved targeting — **OPEN**

- Effective suit becomes **exactly the led suit** (v1 behavior), or player may choose any suit including Hunter Realm while void?
- If choice allowed: can void player chameleon **into Hunter Realm** to trump? That is a major balance fork.

### Stacking concerns

- One Chameleon declaration per play (intended).
- No second suit rewrite in the same play.

### Interactions with Hunter Realm

- Chameleon never sets next Hunter Realm.
- Whether chameleon-into-Hunter is allowed is **OPEN** (see targeting).
- If chameleon only mimics **led** suit (v1-like), Hunter interaction is simpler and safer.

### Interactions with Legendary

- None beyond normal strength comparison (known intent).

### Interactions with other specials — **OPEN**

- With Inversion on the same card.
- With Team Bond if partner also chameleon’d.

**Recommended default to confirm in Phase 2 kickoff (not auto-implemented):** void-only; effective suit = **led suit only**; cannot invent Hunter membership unless led suit already is Hunter.

---

## 3. Team Bond / Equal Riding — همتازی

### Purpose

Team coordination: teammates combine or support cards under **controlled** conditions — not an automatic win.

### Current known rule

- Persian working name: همتازی.
- Concept: partnership support / combined presence.
- Must not dominate every trick when both partners play.

### Unresolved timing — **OPEN**

- Both partners must play into the same trick before activation?
- Only the second teammate may play it?
- Before resolution only?

### Unresolved targeting — **OPEN**

- Which cards are linked (both partners’ animals in the trick)?
- Resolution modes to choose among later:
  - **Sum** strengths (dangerous vs Legendary)?
  - **Max + bonus**?
  - **Take higher track membership** (e.g. if either is Hunter-effective, bond counts as Hunter)?
  - **Force compare as a single virtual play** owned by one seat?

### Stacking concerns — **OPEN**

- Bond + Doping on one half.
- Bond + Inversion.
- Both teammates try to play Team Bond same trick (max 1 special/player may still allow two Bonds/trick).

### Interactions with Hunter Realm — **OPEN**

- Critical: if only one partner’s card is Hunter-suit, does the bond elevate the other?
- Spec intent likely needs: bond must not trivially convert non-Hunter into Hunter without cost.

### Interactions with Legendary — **OPEN**

- Can Bond let two mid cards beat an `A`?
- If yes, overlap with Final Sacrifice fantasy — needs separation of roles.

### Interactions with other specials — **OPEN**

- Especially Trap on one bonded card; Final Sacrifice vs bonded pair.

---

## 4. Doping — دوپینگ (Adrenaline lineage)

### Purpose

Temporary power increase for your animal — timing tool, not a second deck.

### Current known rule

- Persian: دوپینگ.
- Design value: **+2.5 effective strength**.
- Lineage: replaces v1 Adrenaline’s **+2** integer buff as the target number.
- Intended target direction (from v1, pending confirm): your own animal **already in the current trick**.

### Unresolved timing — **OPEN** (mostly inherited)

- Confirm: only after your animal is tabled, before resolution?
- Still max one special per player per trick?

### Unresolved targeting — **OPEN** (minor)

- Confirm: own current-trick animal only (recommended).
- Not cards in hand; not partner; not opponents.

### Stacking concerns — **OPEN**

- Cap: single Doping only (no double +5)?
- Net with Trap on different cards: independent.
- Same card: Doping then Trap from opponent → net math with halves.

### Interactions with Hunter Realm

- Does not change Hunter Realm.
- Only changes effective strength used inside existing track rules.

### Interactions with Legendary

- `A` (13) + 2.5 = 15.5 — reinforces near-invincible feel; Final Sacrifice must still have a path.

### Interactions with other specials — **OPEN**

- vs Inversion order  
- vs Team Bond  
- Legacy Shield is inactive (no cancel tool in S1 roster unless added later)

**Numeric migration note:** v1 `maxStrengthDelta: 2` and integer strengths must become half-capable in Phase 2.

---

## 5. Trap — تله (Poison lineage)

### Purpose

Reduce opponent strength under a clear target rule — the “snare,” not vague poison flavor alone.

### Current known rule

- Persian: تله.
- Design value: **−2.5 effective strength** against opponent card(s) **according to the final target rule**.
- Lineage: replaces v1 Poison’s **−2**.

### Unresolved timing — **OPEN**

- After target animal is in the current trick only?
- Can it be set as a “pending trap” before the opponent plays? (name “Trap” suggests possible set-ahead — **major fork**)

### Unresolved targeting — **OPEN** (critical)

Choose later among:

1. **Single opponent animal in current trick** (Poison-like; simplest).  
2. **All opponent animals in current trick** (−2.5 each — strong).  
3. **Named seat’s next animal this trick**.  
4. **True trap:** play on your turn; triggers when a condition met (e.g. opponent plays Legendary / plays Hunter card) — needs full trigger grammar.

Duration: this trick only vs lingering — **OPEN**.

### Stacking concerns — **OPEN**

- Two Traps on one card?
- Trap + Inversion order.
- Team Bond with one trapped half.

### Interactions with Hunter Realm

- Should not change Hunter Realm.
- Trap on a Hunter card only lowers strength; card still Hunter-track if suit matches.

### Interactions with Legendary — **OPEN**

- `A` 13 − 2.5 = 10.5 — still beats many cards; may not alone dethrone `A` without Final Sacrifice / Inversion / Bond.
- Confirm whether Trap is allowed to target Legendaries (expected **yes**).

### Interactions with other specials — **OPEN**

- No Shield in S1 → fewer cancels; Trap is stickier than v1 Poison.

---

## 6. Final Sacrifice — قربانی نهایی

### Purpose

Rare strategic counter against extremely powerful cards — especially Legendary `A`/`B`/`C` — without creating a common “delete any threat” button.

### Current known rule

- Persian working name: قربانی نهایی.
- Design role: preserve hope against near-invincible Legendaries.
- Must not be commonly abusable.
- Must be deterministic.

### Unresolved timing — **OPEN**

- Only when a Legendary is already in the current trick?
- Only when you are about to lose?
- Before or after strength modifiers?

### Unresolved targeting — **OPEN** (critical)

Possible models to choose later:

1. **Destroy / void one opposing Legendary in the current trick**; sacrificer also loses their played animal (or discards an extra card).  
2. **Win the trick automatically** if conditions met (too strong? — high abuse risk).  
3. **Set opposing Legendary effective strength to 0 / remove from winning track** for this trick only.  
4. **Exchange:** your card is removed; Legendary cannot win this trick.

Cost identity (**OPEN**): what is sacrificed — current animal, a hand card, a future trick claim, partner consent?

### Stacking concerns — **OPEN**

- Playable only once per hand / per match?
- Copies in special deck: probably **very few** (e.g. 1–2 total), separate from “2 per type” if that model returns.

### Interactions with Hunter Realm — **OPEN**

- Can it beat a Hunter-track Legendary while you are off-suit non-Hunter?  
  - If yes, it is a true trump exception (document explicitly).  
  - If no, it only works when you could already contest the track — weaker vs voids.

### Interactions with Legendary

- Primary intended interaction: counter `A`/`B`/`C`.
- **OPEN:** usable against non-Legendary high cards (10) or not? Prefer Legendary-only to protect rarity fantasy.

### Interactions with other specials — **OPEN**

- vs Doping on the Legendary  
- vs Team Bond  
- vs Inversion (double answer to `A`?)  
- Priority if multiple “win condition” effects ever exist

**Abuse guards to decide later:** Legendary-only target; heavy cost; scarce copies; maybe once per match.

---

## Distribution decision (still evaluate; not locked)

| Option | Summary | Fit for S1 |
|--------|---------|------------|
| A — limited at start | Deal small private special hands | Best default; matches prior design & scarcity |
| B — acquire during match | Mid-match economy | Higher complexity; delay |
| C — hybrid | Some dealt + rare acquire | Only if Final Sacrifice needs ultra-rare injection |

**Documentation stance for Phase 1:** prefer **Option A** as the strategic/understandable default, but **do not lock copy counts** until Final Sacrifice scarcity and ±2.5 balance are simulated in Phase 2+.

---

## Conflict priority — **OPEN**

v1 order (Silence → Shield → …) is obsolete for S1.

Need a new total order covering:

`final-sacrifice`, `inversion`, `team-bond`, `trap`, `doping`, `chameleon`

No priority table is final until timing models lock.

---

## Edge cases to carry into Phase 2 tests (once rules lock)

- Follow-suit still enforced while holding led suit + Chameleon attempted → illegal  
- Hunter Realm unchanged by winning card’s printed suit when specials fire  
- Doping +2.5 / Trap −2.5 arithmetic and ties  
- Final Sacrifice vs `A` with and without Hunter track membership  
- Team Bond not auto-winning when both partners play mid cards  

---

## Summary: what is final vs open

| Final enough for docs | Still open |
|-----------------------|------------|
| Six-name S1 roster | Exact timing/targets for Inversion, Team Bond, Trap, Final Sacrifice |
| Chameleon cannot skip follow-suit when holding led suit | Chameleon effective-suit = led-only vs choose-suit |
| Doping +2.5 / Trap −2.5 as design values | Stack caps, priority, deal counts |
| Legacy four specials inactive for v2 canon | Cleanup schedule |
| Specials never set Hunter Realm from card ink | Whether any special can ignore Hunter track |
