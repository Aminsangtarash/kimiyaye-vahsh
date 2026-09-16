# Lobby Flow v2 — Target (Phase 1 Addendum)

**Status:** Target lobby / matchmaking design — **not wired to runtime**  
**Removes:** Ready / Unready confirmation  
**Companions:** `docs/BOT_PLAYER_DESIGN.md`, `docs/GAME_RULES_V2_DRAFT.md`

---

## 1. Design goals

- Start matches **automatically** when prerequisites are met.  
- No Ready button / Ready status.  
- Realm selection remains human-friendly but **must not block forever**.  
- Bots are first-class seat controllers.  
- Server is authoritative for countdown and start.

---

## 2. Target lobby states

| State | Meaning |
|-------|---------|
| `WAITING_FOR_PLAYERS` | Fewer than 4 occupied seats |
| `WAITING_FOR_REALMS` | 4 seats occupied, but unique realms not yet complete (rare if auto-assign runs immediately on 4th join) |
| `STARTING` | Prerequisites met; server countdown running |
| `IN_MATCH` | Match in progress |
| `COMPLETED` | Match finished |

v1 `READY` / host `START_MATCH` confirmation are **obsolete** in the target model.

---

## 3. Match-start prerequisites

All must be true:

1. Exactly **4** occupied seats  
2. Exactly **4 unique** realm assignments (one each of Carnivore / Herbivore / Bird / Reptile)  
3. Each seat has a valid controller: **human** or **bot**

When all become true → enter **`STARTING`** and begin countdown.

**Recommended default countdown:** `MATCH_START_COUNTDOWN_MS=3000` (3 seconds)

After countdown completes → deal / `IN_MATCH`.

Server remains authoritative; clients only display countdown.

---

## 4. Realm selection (pre-start)

### Primary

- Humans select from **available** realms.  
- Earlier joiners have more choice.  
- Taken realms cannot be selected by another seat.  
- Before countdown, humans may change to another **free** realm.

### Auto-assignment (mandatory when needed)

If the **fourth seat** becomes occupied while one or more humans still have **no** explicit realm:

→ **automatically assign** remaining free realm(s) to unset seats.  
→ Do **not** block the room indefinitely waiting for realm confirmation.

### Lock

Realm assignments become **immutable once match countdown begins** (`STARTING`).

---

## 5. Countdown cancel rules

If during `STARTING`:

- a human **leaves**, and that seat is not immediately replaced under room policy → **cancel countdown**, return to `WAITING_FOR_PLAYERS` (or `WAITING_FOR_REALMS` if still 4 controllers but realms broken — should not happen if leave frees a seat).

If room policy **immediately** replaces the leaver with a bot (e.g. Play-with-Bots / host fill still applicable only pre-countdown — during countdown prefer cancel unless product explicitly allows instant bot replace):

- Owner note: default recommended = **cancel on human leave during countdown** unless an explicit bot-replace policy is enabled for that mode.  
- Document mode-specific policy in Phase 2; Play-with-Bots rarely has humans leaving mid-countdown as the only human.

---

## 6. Mode flows

### A. Play with Bots

1. Entry: **Play with Bots**.  
2. Create room: 1 human seat + 3 bot seats (or fill bots as soon as human seated).  
3. Human picks one realm; bots get the other three.  
4. Prerequisites met → countdown → match.  
5. Same `game-core` as online.

### B. Private room

1. Host creates room; friends join.  
2. **No** automatic bot injection due to idle time.  
3. Host may: **Fill empty seats with bots** / **Add Bot** / remove pre-match bots.  
4. Humans pick realms; on 4th occupant, auto-assign any unset realms.  
5. Countdown → match.

### C. Quick Match

1. Enter queue; prefer human opponents.  
2. Search humans first.  
3. After `QUICK_MATCH_BOT_FILL_AFTER_MS` (default **45000**), fill remaining seats with bots if still short.  
4. Auto-assign realms as needed.  
5. Countdown → match.

### D. Mixed human + bot

Supported compositions: 1+3, 2+2, 3+1, 4+0 — same four-seat model.

---

## 7. UI target (lobby)

### Remove

- Ready button  
- Ready / not-ready seat badges as a start gate  

### Show

- Connected players / bot seats  
- Selected realm per seat  
- Remaining free realms  
- Matchmaking / waiting status  
- Automatic start countdown  

### Example copy

```
3 / 4 players
Searching for one more player...
```

```
Bot will join in 12s
```

Private room:

```
Waiting for player
[Fill empty seats with bots]
```

During start:

```
Match starts in 3…
```

---

## 8. Obsolete v1 lobby commands (target)

| v1 | v2 target |
|----|-----------|
| `READY` | Removed as start prerequisite |
| Host-only `START_MATCH` when all ready | Replaced by auto countdown |
| Ready flags on seats | Replaced by realm + controller completeness |

Replacement commands (illustrative for Phase 2 protocol — not implemented yet):

- `SELECT_REALM`  
- `HOST_FILL_BOTS` / `HOST_ADD_BOT` / `HOST_REMOVE_BOT`  
- `PLAY_VS_BOTS` entry  
- Quick Match queue join/leave (existing family, extended)

---

## 9. Configuration (draft)

| Key | Recommended default | Purpose |
|-----|---------------------|---------|
| `MATCH_START_COUNTDOWN_MS` | `3000` | Auto-start delay |
| `QUICK_MATCH_BOT_FILL_AFTER_MS` | `45000` | Delay before QM bot fill |
| `RECONNECT_GRACE_MS` | (existing) `60000` | Human reserve before bot takeover |
| `BOT_PROFILE_DEFAULT` | `balanced` | Only profile in v1 |

Store in server env / `game-config` style config — **not** inside deterministic `game-core` rule tables.

---

## 10. Relation to game-core

Lobby / matchmaking / bot controllers are **server orchestration**.

`game-core` starts when the server issues `START_MATCH` (or equivalent internal action) **after** countdown — still the only authority for dealing and legality.
