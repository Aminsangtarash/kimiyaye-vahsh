# Bot Player Design — Target Architecture (Phase 1 Addendum)

**Status:** Architecture / rules target — **not wired to runtime**  
**Companion docs:** `docs/LOBBY_FLOW_V2.md`, `docs/GAME_RULES_V2_DRAFT.md`  
**Config draft keys:** `data/game-rules.v2.draft.json` → `lobby`, `bots`, `matchmaking`

---

## 1. Role of a Bot

A **Bot** is a valid **player controller** occupying a normal match seat (0–3).

Bots obey the **same** rules as humans for:

- animal cards & follow-suit  
- special cards  
- teams (opposite seats)  
- realm representation  
- Hunter Realm  
- turn order / legality  

Bots receive **no gameplay privileges**.

---

## 2. Information boundary (non-negotiable)

Bot decision code may receive only a **player-safe view** for its seat — the same class of information a human client would get for that seat.

### Must NOT pass to Bot AI

- opponent hands  
- future deck / shuffle remainder order  
- hidden specials of other seats  
- secret server RNG / seed material beyond what humans get  
- other seats’ private scout-like info (when such effects exist)  

### May pass

- public table state (trick, scores, Hunter Realm, public realms, seat controllers as public metadata)  
- own hand + own specials  
- legal actions enumerated by server/`game-core` helpers  
- public match config  

**Never create a trusted “bot bypass”** that applies illegal or unaudited actions.

---

## 3. Architecture separation

```
game-core
  → validates & resolves actions (deterministic)

bot-player / bot-strategy
  → receives player-safe projection + legalActions
  → returns a candidate ClientCommand-equivalent action

game-server room loop
  → submits bot action through the SAME command pathway as humans
  → game-core validates again
```

Conceptual API:

```ts
BotStrategy.chooseAction(playerView, legalActions) → ActionIntent
```

| Layer | Responsibility |
|-------|----------------|
| `game-core` | Rules only — **no** bot heuristics |
| `bot-strategy` (new package or server module) | Heuristics / profiles |
| `game-server` | Timing, seat controller swap, queue fill, disconnect takeover |

Future profiles (`easy` / `balanced` / `hard`) plug in as strategy implementations **without** changing `game-core`.

---

## 4. v1 bot profile: BALANCED only

| Goal | Requirement |
|------|-------------|
| Legality | Always choose from `legalActions` |
| Quality | Reasonable card & special decisions |
| Team | Basic partner awareness (public info only) |
| Fairness | No cheating / no hidden data |
| Strength | Not perfect minimax |

Do **not** ship multiple difficulties in the first implementation wave. Architecture must still allow them later.

---

## 5. Match compositions

All use the **same** four-seat model and **same** `game-core`:

| Mode | Composition |
|------|-------------|
| Play with Bots | **1 human + 3 bots** (initial dedicated entry) |
| Mixed | 2H+2B, 3H+1B |
| Full human | 4 humans |
| Quick Match | Prefer humans; bot fill after threshold |
| Private room | Bots only if host opts in |

### Play with Bots (dedicated entry)

1. Human chooses one available realm.  
2. Three bots take the other three realms.  
3. Teams = opposite seats (unchanged).  
4. Auto-start countdown when prerequisites met (usually immediate after realm + bot seats filled).

Do **not** build a separate simplified rules engine for this mode.

---

## 6. Quick Match bot auto-fill

Priority: **human opponents first**. Do **not** fill with bots immediately.

1. Player enters Quick Match queue.  
2. System searches for humans.  
3. After configurable wait, remaining empty seats **may** be filled with bots.  
4. When 4 valid seats + 4 unique realms exist → auto start countdown.

**Recommended config (not hardcoded in game-core):**

`QUICK_MATCH_BOT_FILL_AFTER_MS=45000`

---

## 7. Private room bot policy

- Do **not** auto-inject bots merely because a private room is old.  
- Host actions (target UX):
  - **Fill empty seats with bots**
  - **Add Bot** to a specific empty seat  
  - **Remove** pre-match bots  
- Once start countdown begins, normal start-lock applies.

---

## 8. Disconnect → bot takeover

Uses the **same** bot controller architecture.

1. Human disconnects → reconnect grace (existing config family, e.g. `RECONNECT_GRACE_MS`).  
2. Seat remains reserved for that identity during grace.  
3. If human returns in grace → human control restored.  
4. If grace expires → **Bot takes temporary control of the SAME seat**.  
5. Bot inherits: realm, team, hand, specials, scores/state — **no redeal / no restart**.

### Human reclaim boundary (Phase 2 must implement)

**Recommended safe rule (owner-endorsed direction):**

- Human reclaim is allowed only at a **safe action boundary**:  
  **before their next unresolved action**,  
  **never midway through an already submitted bot action**.  
- If a bot command is in-flight / already accepted by `game-core`, let it finish; human takes over for subsequent decisions.

Exact edge cases (mid special window, countdown, between tricks) to be enumerated in Phase 2 protocol tests — do not invent extra privileges here.

---

## 9. Match metadata (persist)

Minimum:

```json
{
  "hasBots": true,
  "botSeatCount": 3
}
```

Per participant (ideal):

```json
{
  "seat": 0,
  "controllerType": "human" | "bot",
  "realm": "bird"
}
```

Reasons: tournament eligibility, ranking, rewards, anti-abuse — **later**.  
Do **not** implement tournament economy now.

---

## 10. Future reward safety (extension point)

- Bot matches are **valid** for normal play / practice.  
- Competitive / tournament rewards must be able to require `hasBots == false`.  
- Reward adapters should read metadata; game-core stays reward-agnostic.

---

## 11. Phase 2 modules (bot-specific)

| New / change | Notes |
|--------------|-------|
| `packages/bot-strategy` (or `game-server/src/bot/`) | `BalancedStrategy`; interface for future difficulties |
| Player-safe projection reuse | Prefer existing `projectForSeat`; never a richer bot view |
| Server bot ticker | On bot seat + current turn / special window → choose → same command path |
| Controller field on seat | `human` \| `bot` (+ optional `botProfile`) |
| Disconnect takeover | Swap controller after grace |
| Metadata in persist/SQL | `hasBots`, `botSeatCount`, per-seat `controllerType` |

`game-core` remains free of bot I/O and heuristics.
