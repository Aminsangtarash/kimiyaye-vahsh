# Game Rules v2 — Draft (Target)

**Status:** Target rules draft — **not wired to runtime**  
**Machine draft:** `data/game-rules.v2.draft.json`  
**Lobby / bots:** `docs/LOBBY_FLOW_V2.md`, `docs/BOT_PLAYER_DESIGN.md`  
**Impact / MVP:** `docs/IMPACT_AND_MVP_SCORING.md`  
**Runtime still uses:** `data/game-rules.json` (v1 Superior Suit + Ready flow)  
**Main deck:** FROZEN (`data/cards.json` — 52 cards). Do not change roster, ranks, portraits, frames, or artwork.

Owner decisions in this document supersede the Superior Suit model and the Ready-based lobby described in v1 docs.

---

## 1. Players, controllers, teams, realms

### Players & controllers

- Every match has **4 seats**.
- Each seat is controlled by a **human** or a **bot**.
- Supported compositions: 4 humans; 3H+1B; 2H+2B; 1H+3B (including dedicated **Play with Bots**).
- Bots use the **same** rules and the **same** `game-core` as humans. No simplified bot rules engine.
- Bots get **no** hidden information beyond a player-safe seat projection. See `docs/BOT_PLAYER_DESIGN.md`.

### Teams

- 2 teams of 2.
- Partners sit **opposite** (seats `0`↔`2` Team A; `1`↔`3` Team B).
- Team identity exists **before** cards are dealt and is **independent** of animal realms.
- A player’s realm does **not** imply their team.

### Player realm representation (required)

Each seat represents exactly one animal realm:

| Realm (EN) | Realm (data id) |
|------------|-----------------|
| Carnivore | `carnivore` |
| Herbivore | `herbivore` |
| Bird | `bird` |
| Reptile | `reptile` |

Rules:

- Exactly **one** representative per realm in a match (bijection).
- Represented realm is **independent** of the cards in hand.
- A Bird representative may hold and play any suit’s cards.

### Realm assignment

1. Humans select from **currently available** realms (earlier joiners have more choice).
2. A realm taken by another seat cannot be selected again.
3. Before match countdown, a human may change to another realm **only if it is still free**.
4. When the **fourth seat** is occupied, any seat still without an explicit realm receives an **automatic assignment** from remaining free realms. Do **not** block indefinitely waiting for confirmation.
5. Realm assignments become **immutable when the start countdown begins**.

Do **not** use fixed seat→realm maps as the primary rule.  
Do **not** randomly assign all realms up front as the primary rule.

**Play with Bots:** human picks one realm; bots receive the other three.

---

## 2. Lobby & auto start (no Ready)

**Ready / Unready is removed** from target v2.

### Start prerequisites

Match start countdown begins when **all** are true:

- exactly 4 occupied seats  
- exactly 4 unique realm assignments  
- each seat has a valid controller (human or bot)

### Countdown

- Server-controlled; recommended default **3 seconds** (`MATCH_START_COUNTDOWN_MS=3000`).
- After countdown → deal and play.
- If a human leaves during countdown (and seat is not immediately replaced under explicit mode policy) → **cancel** countdown and return to waiting.

Full state machine: `docs/LOBBY_FLOW_V2.md`  
(`WAITING_FOR_PLAYERS` → `WAITING_FOR_REALMS` → `STARTING` → `IN_MATCH` → `COMPLETED`)

### Matchmaking modes (summary)

| Mode | Bot policy |
|------|------------|
| **Play with Bots** | 1 human + 3 bots; same game-core |
| **Quick Match** | Prefer humans; after `QUICK_MATCH_BOT_FILL_AFTER_MS` (default **45s**), fill remaining seats with bots |
| **Private room** | **No** idle auto-bots; host may **Fill empty seats with bots** / Add Bot / remove bots pre-start |

### Disconnect

After reconnect grace expires, a **bot may take temporary control of the same seat** (same realm/hand/state). Human reclaim only at a safe action boundary. Details: `docs/BOT_PLAYER_DESIGN.md`.

### Metadata

Persist at least `hasBots`, `botSeatCount`, and per-seat `controllerType` (`human` \| `bot`) for future reward/tournament filters. Bot matches are valid for practice; competitive rewards may later require `hasBots == false`.

---

## 3. Components

### Main deck (frozen)

- 52 animal cards: 4 suits × 13 ranks.
- Ranks: `1`…`10`, legendary `C` / `B` / `A`.
- Strength (centralized in `data/rank-model.json`):

| Display | Strength |
|---------|----------|
| 1…10 | 1…10 |
| C | 11 |
| B | 12 |
| A | 13 |

Legendary design principle: feel extremely strong (A ≈ near-invincible), but remain counterable via rare strategy (Final Sacrifice path). **Do not redesign ranks.**

### Special cards (target roster S1)

Exactly six concepts for Game Rules v2 (details and open questions in `docs/SPECIAL_CARD_RULES_V2_DRAFT.md`):

1. Inversion — نفرین وارونگی  
2. Chameleon — نیرنگ آفتاب‌پرست  
3. Team Bond / Equal Riding — همتازی  
4. Doping — دوپینگ (design value **+2.5**)  
5. Trap — تله (design value **−2.5**)  
6. Final Sacrifice — قربانی نهایی  

**Not canonical for v2:** Shield, Scout, Silence, Anchor — legacy / inactive / experimental. Do not delete historical data or code in Phase 1.

Copy counts, deal size, and max-per-trick limits: **not fully locked** (see specials draft).

---

## 4. Match structure

- First team to **7 tricks** wins the hand.
- First team to **3 hands** wins the match.
- Each hand deals all 52 animals (13 each). Special deal parameters TBD when specials lock.

First lead of a match: random seat (or agreed host policy).  
Later hands: winner of the previous hand’s last trick leads (policy parity with v1 unless later changed).

---

## 5. Hunter Realm (canonical trump)

### Definition (final)

> **The Hunter Realm for each trick is the realm represented by the player who leads that trick.**

- Based on **player representation**, never on the printed suit of any card.
- The leader may lead any legal animal; they need **not** lead their own realm’s suit.

### First trick

- Hunter Realm is **active from Trick 1**.
- Trick 1 Hunter Realm = represented realm of the initial leader.
- There is **no** Hunter-less opening trick.

### Between tricks

- Trick winner becomes the next leader.
- Therefore next Hunter Realm = **represented realm of the previous trick’s winner**.

### Explicit non-rule

The printed suit of the winning card **never** sets Hunter Realm.

### Worked example (owner-canonical)

```
Trick 1
  Leader = Player A
  Player A Realm = Birds
  Hunter Realm = Birds

Player C wins Trick 1
  Player C Realm = Reptiles

Trick 2
  Leader = Player C
  Hunter Realm = Reptiles
```

Additional example:

- Bird representative wins using a **Carnivore** card → next Hunter Realm = **Birds**, not Carnivores.

### Resolution (target)

1. Apply accepted special modifiers (once special priority is locked).
2. Cards whose **effective suit** equals **Hunter Realm** beat all non-Hunter cards.
3. Among Hunter cards, highest **effective strength** wins.
4. If no Hunter card was played, highest effective strength among **led-suit** cards wins.
5. Off-suit non-Hunter cards cannot win if any led-suit or Hunter card exists.
6. Ties on the winning track: earliest play wins (revisit if fractional ±2.5 creates new tie patterns).

---

## 6. Follow-suit

- If you hold ≥1 card of the **led suit**, you must play the led suit.
- If void, you may play any animal.

Specials may create **controlled** exceptions only when explicitly defined.

**Chameleon:** must **not** bypass follow-suit while holding the led suit. Void-only controlled flexibility; details in specials draft.

---

## 7. Team scoring, ImpactScore, MVP

### Team victory (primary)

- First team to **7 tricks** wins the hand; first to **3 hands** wins the match (unchanged intent).
- Match outcome is always a **winning team** (2 players) and a **losing team** (2 players).
- Individual metrics must **never** override which team won.

### ImpactScore (internal)

- Each participant gets a deterministic **ImpactScore** from formal match events only.
- Purpose: MVP, stats, analytics, optional later website bonus hooks.
- Not the same as website currency / reward points.
- Full model: `docs/IMPACT_AND_MVP_SCORING.md`.

v1 configurable weights (defaults):

| Event | Default |
|-------|---------|
| Trick won | +10 |
| Successful special resolution | +10 |
| Legendary counter success | +20 |
| Team-assist (formal Hamtaazi mark) | +10 |
| Human timeout / forced play while human-controlled | −5 (optional; never when seat is bot-controlled) |

One resolution may cumulatively award distinct events (e.g. Final Sacrifice → `SPECIAL_SUCCESS` + `LEGENDARY_COUNTER` + `TRICK_WON`). Do not double-emit the same event.

### MVP

- Compared **only among the two winning-team players**.
- Higher ImpactScore → MVP (Persian UI: **بازیکن مؤثرتر** / برترین بازیکن تیم برنده).
- Tie-break: more tricks won → more successful specials → fewer invalid/timeouts → **shared MVP**.
- Data: `mvpParticipantIds: string[]` (supports shared).
- Bots also accrue impact; a bot may be MVP in practice/bot matches. Competitive rewards may later ignore via `hasBots`.

### Separation

`MatchResult` ≠ `ImpactScore` ≠ `MVP` ≠ `WebsiteReward`  
`game-core` exposes objective stats only — no monetary reward values.

---

## 8. Modes & lore

- Standalone guest / private / quick / play-vs-bots without website account.
- Authenticated mode shares identical rules; rewards outside the rules engine.
- Lore must not be required to understand legal moves.

---

## 9. What this draft does **not** change

- The 52-card identities, ranks, or art.
- Team seating geometry.
- Authoritative-server principle (client never decides winners; bots use the same validation path).

## 10. What remains for later phases

- Wire Hunter Realm + realms into `game-core`.
- Implement lobby auto-start, bots, QM fill, private host fill (server + UI).
- Finalize six specials’ timing/targets; then formalize SPECIAL_SUCCESS / LEGENDARY_COUNTER / TEAM_ASSIST predicates.
- Fractional strength (±2.5) support.
- Impact event emission, MVP selection, results UI.

---

## Authority order (after implementation lands)

1. `data/game-rules.v2.draft.json` → promote when wired  
2. Specials draft → promote when locked  
3. Impact/MVP doc + impact config weights  
4. `data/rank-model.json` / `data/cards.json` (frozen deck)  
5. Lobby/bot docs for orchestration semantics  
6. Lore (flavor only)
