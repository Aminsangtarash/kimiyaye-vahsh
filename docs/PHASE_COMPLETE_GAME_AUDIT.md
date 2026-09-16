# Audit — Complete Game Implementation After Main Deck Freeze

**Date:** 2026-09-15  
**Scope:** Repository vs owner specification (playable online game; 52 cards frozen)  
**Constraint honored:** No implementation changes in this phase — audit only.

---

## Executive summary

The repository already contains a **substantial playable MVP**:

- Frozen-looking **52-card main deck** with art/renders
- Deterministic **`game-core`** engine
- **Socket.IO** multiplayer (quick match, private rooms, guest)
- Ticket/reward **extension points**
- Docs for rules, architecture, deployment

However, the current rules engine is built around **Superior Suit = winning card’s printed suit**.  
The new owner specification requires **Hunter Realm = winner’s player representation realm**.  
That is a **core design conflict**, not a polish gap.

**Classification after this audit:**  
`PARTIAL_MVP — RULES REALIGNMENT REQUIRED BEFORE POLISH`

Do **not** treat `FINAL_PROJECT_REPORT.md` “READY_WITH_INTEGRATION_DEPENDENCY” as final against this new brief.

---

## 1. Current implementation status

### 1.1 Repository layout (healthy)

| Area | Path | Status |
|------|------|--------|
| Client | `apps/web` | Functional MVP UI (entry/lobby/game/results) |
| Rules engine | `packages/game-core` | Deterministic; 9 unit tests passing |
| Server | `packages/game-server` | Rooms, security, persistence hooks; 10 tests passing |
| Contracts | `packages/contracts` | Zod schemas / protocol |
| Canonical data | `data/cards.json`, `rank-model.json`, `game-rules.json`, `special-cards.json`, `game-config.json` | Present |
| Assets | `assets/cards/...` | 52 portraits + clean renders; special art present |
| Docs | `docs/*` | Extensive (rules FA/EN, architecture, ops) |
| Ops | Docker, health/ready/metrics, `.env.example` | Present |

**Tests (verified this audit):** `pnpm test` → contracts pass-with-no-tests; game-core 9/9; game-server 10/10.

### 1.2 Main deck (FROZEN — aligned)

| Requirement | Current | Verdict |
|-------------|---------|---------|
| 52 animals | `data/cards.json` = 52 | OK |
| 4 suits | carnivore / herbivore / bird / reptile | OK |
| Ranks 1–10, C/B/A | Present | OK |
| Strength 1…13 | `data/rank-model.json` centralized | OK |
| No identity redesign | Art + IDs stable; freeze must be enforced going forward | OK to freeze now |

**Freeze policy recommendation:** treat `data/cards.json` + portraits under `assets/cards/portraits/final/` + clean renders as immutable unless a critical technical defect is filed.

### 1.3 What already matches the new vision

- 4 players, partners opposite (`TEAM_BY_SEAT = [0,1,0,1]`) — teams exist before play
- Trick-taking + must-follow-suit
- Winner of trick leads next
- Specials scarce (2 per player; Option A fixed small hand) — documented rationale exists
- Authoritative server; client projections hide opponent hands
- Guest + authenticated ticket boundary (adapter-style)
- Quick Match + Private Room
- Reconnect by `sessionId`
- Reward events as extension (mock provider); no full economy
- Scoring: 7 tricks / hand, 3 hands / match (config-driven)

### 1.4 Feature maturity snapshot

| System | Maturity | Notes |
|--------|----------|-------|
| Deck / art | **Complete (freeze)** | Owner-approved milestone |
| Rank model | **Complete** | Centralized JSON |
| Trick engine | **Complete but wrong trump source** | See conflicts |
| Player realm identity | **Missing** | No seat→realm representation |
| Hunter Realm | **Missing** (Superior Suit instead) | Spec conflict |
| Specials (current 7) | **Implemented** | Differs from candidate 6 |
| Multiplayer rooms | **MVP complete** | In-memory; works |
| Auth integration | **Boundary only** | Needs live main-site tickets |
| DB | **Schema + file audit** | Postgres optional; not required for local |
| UI | **Playable MVP** | Not polished board; limited lore/animations |
| Inactivity auto-play | **Documented, not scheduled** | Known gap in QA report |
| Companion / genie | **Not implemented** | Correctly deferred |
| Tournament economy | **Not implemented** | Extension points only |

---

## 2. Missing systems (relative to this specification)

### 2.1 Critical missing / incorrect (must fix for rules fidelity)

1. **Player realm representation**  
   Each of 4 seats must be assigned exactly one realm (Carnivore / Herbivore / Bird / Reptile).  
   Identity ≠ cards in hand. **Not modeled in `GameState` or lobby.**

2. **Hunter Realm mechanic**  
   Spec: after a trick, Hunter Realm = **winner’s represented realm**.  
   Current: Superior Suit = **winning animal’s printed suit**.  
   Engine, docs, UI, specials (esp. Anchor), and tests all assume the old rule.

3. **Special system realignment (design decision required)**  
   Spec candidates (≤6): Adrenaline, Poison, Chameleon, Team Bond (Hamtaazi), Inversion, Final Sacrifice.  
   Current implemented (7): Adrenaline, Poison, Chameleon, Shield, Scout, Silence, Anchor.  
   Overlap: Adrenaline / Poison / Chameleon.  
   Missing vs candidates: Team Bond, Inversion, Final Sacrifice.  
   Extra vs candidates: Shield, Scout, Silence, Anchor.

4. **Legendary strategic counters**  
   Spec wants rare counters (e.g. Final Sacrifice) so Legendaries feel nearly unbeatable but not absolute.  
   Current counters are mostly ±2 strength / Silence / Shield — not a dedicated anti-legendary sacrifice.

### 2.2 Important gaps (playable polish / online completeness)

5. **UI board completeness**  
   Missing / weak: clear 4-position layout, realm symbols per player, Hunter Realm prominence, teammate clarity, special targeting UX, legal-move feedback polish, animations.

6. **Inactivity timeout scheduler**  
   Config exists (`inactivityTimeoutMs`); server interval auto-play not wired (called out in `docs/QA_REPORT.md`).

7. **Partner-confirmed surrender**  
   Rules mention partner confirmation online; engine has single-seat `SURRENDER`.

8. **Authenticated UX path in client**  
   Ticket verification exists server-side; entry UI is guest-centric (no ticket paste/flow).

9. **Replay / dispute completeness**  
   Actions/tricks persisted in file/SQL sketches; no replay viewer UI; trick table lacks full card payloads for forensic replay.

10. **Large-scale balance simulation refresh**  
    Older simulators/docs target Superior Suit + current 7 specials. Must re-run after Hunter Realm + special redesign.

11. **Documentation filename alignment**  
    Spec asks: `GAME_DESIGN_DOCUMENT.md`, `GAME_RULES_FA.md`, `ARCHITECTURE.md`, `SPECIAL_CARD_RULES.md`, `BALANCE_REPORT.md`, `DEPLOYMENT.md`.  
    Present with close names: `architecture.md`, `special-card-rules.md`, `special-card-balance-report.md` (case/underscore differences). Content exists; naming can be normalized.

12. **Companion/genie progression**  
    Explicitly out of scope for full build now — keep extension points only (OK).

---

## 3. Conflicts with this specification

### Conflict A — Trump source (BLOCKING)

| | Spec | Current |
|-|------|---------|
| Name | Hunter Realm | Superior Suit / دستهٔ برتر |
| Source | Winner’s **player representation** | Winner’s **card printed suit** |
| Spec warning | Explicitly forbids “winning card suit becomes trump” | That exact rule is canonical in `data/game-rules.json` + engine |

**Impact:** Rework `finishTrick`, `resolveTrickWinner` inputs, projections, UI labels, Anchor (or replacement), edge-case docs, and all tests/sims that assume printed-suit trump.

**Edge implication:** A Bird representative can win a trick with a Carnivore card; Hunter Realm becomes **Birds**, not Carnivores. Current code would set Carnivores.

### Conflict B — Special roster

| Spec direction | Current |
|----------------|---------|
| ≤6 types; review original intent; include Team Bond / Inversion / Final Sacrifice candidates | 7 types approved in `special-cards.json` as `approved-v1` |

**Impact:** Either  
- (B1) adopt new candidate set and deprecate Shield/Scout/Silence/Anchor, or  
- (B2) keep current 7 with owner sign-off as the “reviewed original intent,” mapping lore names differently.  

**This audit does not choose** — owner decision required before Phase 2 coding of specials.

### Conflict C — Project “complete” narrative

`FINAL_PROJECT_REPORT.md` presents the game as essentially complete under Superior Suit rules.  
Against this new brief, that report is **outdated** and must be superseded after rules realignment.

### Conflict D — Minor / non-blocking

- Spec: “Create centralized configuration” for ranks → **already exists** (`rank-model.json`); keep using it.
- Spec: no production deploy → current docs include deployment guidance but do not force prod; OK if we stay local.
- Teams assigned by seat before deal → **already true**; no conflict.

---

## 4. What should NOT be touched

Per freeze + this audit:

- Do not replace animals, change ranks, redesign card visuals, regenerate portraits, or modify card identity
- Do not add blockchain, economy, ranking ladders, or tournament systems beyond stubs
- Do not couple `game-core` to website DB/ORM
- Do not let the client decide winners / legality / Hunter Realm / scores

---

## 5. Recommended implementation order

Aligned with the brief’s phases, adjusted for the discovered conflict:

### Phase 0 — Owner decisions (before coding)

1. Confirm **Hunter Realm = player representation** supersedes Superior Suit (assumed YES from this brief).
2. Choose special set:
   - **Option S1:** Replace toward ≤6 candidates (Team Bond, Inversion, Final Sacrifice + keep Adrenaline/Poison/Chameleon).
   - **Option S2:** Keep current 7 with explicit owner approval as final specials for v1.
3. Confirm realm assignment method:
   - Fixed seat→realm map (seat0=Carnivore…), or
   - Random permutation of 4 realms at match start (still before deal).
4. Confirm first-trick Hunter Realm: none (mirror current first-trick rule) vs seeded from first leader’s realm.

### Phase 1 — Finalize rules & data model (docs + JSON only)

- Rewrite `data/game-rules.json` for Hunter Realm
- Update `GAME_DESIGN_DOCUMENT.md`, `GAME_RULES_FA.md` / EN, `rule-edge-cases.md`
- Add `playerRealms: [Suit×4]` (or equivalent) to state/contracts
- Decide and document specials → update `special-cards.json` + `SPECIAL_CARD_RULES` / balance doc
- Extend DB model notes: store realm per seat; rename `superior_after` → `hunter_realm_after` (or dual-write during migration)
- **Exit criteria:** written rules with examples; no engine change yet OR minimal type stubs only

### Phase 2 — Implement game-core against frozen deck

- Realm assignment at match start
- Hunter Realm update on trick win from **winner seat’s realm**
- Trick resolution using Hunter Realm suit track
- Specials per Phase 0 decision (including legendary counter if S1)
- Central config remains `rank-model.json` / `game-config.json`
- Expand unit tests: comparison, Hunter Realm, specials, legendary interactions
- **Exit criteria:** `pnpm --filter @kv/game-core test` green; headless full-hand simulation

### Phase 3 — Local playable prototype

- Update projections + minimal UI labels (Hunter Realm, realm badges)
- Hotseat or 4 local sockets against one server
- Manual checklist for follow-suit + Hunter Realm examples
- **Exit criteria:** humans can finish a match locally with correct trump semantics

### Phase 4 — Multiplayer hardening

- Keep quick/private/guest
- Wire inactivity auto-play timer
- Strengthen reconnect mid-match UX
- Partner surrender if required
- Integration tests: full match, reconnect, invalid actions
- Thousands of automated matches for broken states / dominant specials
- **Exit criteria:** server tests + load smoke; no hand leaks

### Phase 5 — Website authentication

- Client ticket flow
- Associate `userId` on results
- No reward payout logic beyond events

### Phase 6 — Rewards integration

- Server-controlled reward events only
- Idempotent webhook / mock provider
- Extension fields for future tournament IDs

### Phase 7 — UI / lore polish

- Four-seat board, realm symbols, Hunter Realm clarity
- Legendary / special FX without harming readability
- Moon Full Arena presentation optional
- **Exit criteria:** polished first playable version; still no prod deploy mandate

After each phase: build checks, tests, doc updates.

---

## 6. Suggested decision defaults (if owner wants speed)

Only defaults for discussion — **not applied**:

| Topic | Suggested default |
|-------|-------------------|
| Trump | Hunter Realm from winner’s representation |
| First trick | No Hunter Realm (parity with current first-trick neutrality) |
| Realm assignment | Random bijection seat→4 realms at match start; shown in lobby before ready |
| Specials | Hybrid: keep Adrenaline/Poison/Chameleon; replace Anchor with realm-aware lock; replace Scout/Silence/Shield set partially with Team Bond + Final Sacrifice; drop to 6 types |
| Distribution | Keep Option A (2 specials dealt) — already strategic and understandable |
| Companion/genie | Stub interface only |

---

## 7. Audit conclusion

| Question | Answer |
|----------|--------|
| Is the 52-card deck ready to freeze? | **Yes** |
| Is the online skeleton reusable? | **Yes** (architecture is sound) |
| Can we “just polish UI”? | **No** — trump identity is wrong vs owner vision |
| Biggest risk | Shipping Superior Suit as if it were Hunter Realm |
| First coding work after decisions | Phase 1 rules JSON + Phase 2 engine Hunter Realm |

**Next action:** obtain Phase 0 owner decisions (especially special roster S1 vs S2), then begin Phase 1 documentation/data model updates — still without portrait/deck changes.
