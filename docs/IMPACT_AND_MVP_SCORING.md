# Impact Score & MVP — Target Design (Phase 1 Final Addendum)

**Status:** Rules / data target — **not wired to runtime**  
**Companions:** `docs/GAME_RULES_V2_DRAFT.md`, `data/game-rules.v2.draft.json`  
**Separation:** `MatchResult` ≠ `ImpactScore` ≠ `MVP` ≠ `WebsiteReward`

---

## 1. Team victory is primary

Kimiyaye Vahsh is a **2v2 team** game.

A completed match has:

| Outcome | Count |
|---------|-------|
| Winning team | 1 |
| Winning players | 2 |
| Losing team | 1 |
| Losing players | 2 |

**Individual ImpactScore / MVP must never replace or override which team won.**

MVP is a **display / analytics / optional later bonus hook** among the winners only.

---

## 2. ImpactScore (internal)

Each participant receives a match-scoped **ImpactScore**.

### Purpose

- MVP selection  
- Profile statistics  
- Optional website reward *bonus* (later — not defined here)  
- Analytics & balance review  

### Constraints

- Derived **only** from deterministic game events / formal counters.  
- No vague labels (“good play”, “smart move”) unless formally defined from state.  
- Values come from **central config**, not scattered constants.  
- `game-core` exposes objective stats and computed impact; it does **not** know monetary or website point economy.

---

## 3. MVP

After `match_complete`:

1. Restrict comparison to the **two players on the winning team**.  
2. Higher `ImpactScore` → MVP.  

**Persian UI concepts:**

- بازیکن مؤثرتر  
- or برترین بازیکن تیم برنده  

MVP does **not** change the winning team.

### Tie-break (recommended v1 order)

Among the two winners, if ImpactScore equal:

1. More **tricks won**  
2. More **successful special-card resolutions**  
3. Fewer **invalid / timeout actions** (human timeout / forced plays while human-controlled)  
4. If still tied → **shared MVP**

### Shared MVP

Data model **must** support multiple MVPs:

```json
"mvpParticipantIds": ["…", "…"]
```

Use an array even when length is 1. Empty only if match aborted without winners (edge policy Phase 2).

---

## 4. Impact model v1 (event-based)

Do **not** lock website reward points yet.

### Configurable weights (recommended defaults)

```yaml
impact:
  trickWon: 10
  successfulSpecial: 10
  legendaryCounter: 20
  teamAssist: 10
  humanTimeout: -5
```

| Component | Event | Default | Notes |
|-----------|-------|---------|-------|
| A. Trick won | `TRICK_WON` attributed to winner seat | +10 | Per trick the seat wins |
| B. Successful special | `SPECIAL_SUCCESS` | +10 | Only when the special produces its **intended legal effect** |
| C. Legendary counter | `LEGENDARY_COUNTER` | +20 | e.g. Final Sacrifice successfully counters a Legendary per final rules |
| D. Team assist | `TEAM_ASSIST` | +10 | Only when Team Bond / همتازی formally marks an assisting player |
| E. Human timeout | `HUMAN_TIMEOUT` (optional) | −5 | Forced/timeout action while seat is **human-controlled**. **Not** applied when seat is legitimately bot-controlled |

All weights: config keys under `impact` in target rules / server config — **not** hardcoded in multiple files.

### Formal counters to accumulate (for MVP ties & UI)

Per participant at minimum:

- `tricksWon`  
- `successfulSpecials`  
- `legendaryCounters`  
- `teamAssists`  
- `humanTimeouts` (and/or `invalidActions` if tracked)  
- `impactScore` (sum of weighted events)

---

## 5. Cumulative events vs double-counting

A **single player action** may emit **multiple distinct event types** when they represent genuinely different contributions.

### Allowed cumulative example

Final Sacrifice successfully counters Rank **A** and that seat also wins the trick:

| Event | Impact |
|-------|--------|
| `SPECIAL_SUCCESS` | +10 |
| `LEGENDARY_COUNTER` | +20 |
| `TRICK_WON` | +10 |
| **Total for that resolution** | **+40** |

This is **intentional** cumulative impact.

### Forbidden

- Emitting the same event id twice for one resolution  
- Counting “trick won” twice for one trick  
- Awarding `SPECIAL_SUCCESS` when the special was played but cancelled / illegal / produced no intended effect  
- Awarding `TEAM_ASSIST` without a formal Hamtaazi assist mark in rules  

Engine should emit a structured event list per resolution; ImpactScore = fold(config, events).

---

## 6. Separation from website rewards

| Concept | Owner | Notes |
|---------|-------|-------|
| `MatchResult` | game-core / server | Winning team, scores, hands |
| `ImpactScore` | derived from match events | Internal contribution metric |
| `MVP` | derived from winners’ impact + ties | Presentation + hooks |
| `WebsiteReward` | main-site / reward adapter | Economy; **outside** game-core |

Future website policy (example only — **not implemented**):

- Base reward for both winners  
- Smaller participation for losers  
- Optional MVP bonus  

Competitive systems may ignore bot matches via `hasBots == false`.

---

## 7. Bot policy

- Bots **also** receive ImpactScore (analytics / practice MVP).  
- A bot **may** be MVP in a bot/practice match.  
- Persist impact & MVP the same way for human and bot participants.  
- Future competitive rewards filter with `hasBots`, not by deleting bot impact data.

---

## 8. Match summary data target

```json
{
  "winningTeamId": 0,
  "hasBots": true,
  "botSeatCount": 3,
  "participants": [
    {
      "participantId": "seat-0",
      "teamId": 0,
      "controllerType": "human",
      "realm": "bird",
      "tricksWon": 4,
      "successfulSpecials": 1,
      "legendaryCounters": 1,
      "teamAssists": 0,
      "humanTimeouts": 0,
      "impactScore": 50
    }
  ],
  "mvpParticipantIds": ["seat-0"]
}
```

Notes:

- `mvpParticipantIds` is an **array** (shared MVP = length 2).  
- `participantId` may be seat-stable id or persistent user id when authenticated — Phase 2 chooses; seat id always available.  
- Losing participants are included with their stats; they are **not** MVP candidates.

---

## 9. Open items for Phase 2 (do not invent silently)

| ID | Question |
|----|----------|
| I1 | Exact definition of `SPECIAL_SUCCESS` per each S1 card once specials lock |
| I2 | Exact `LEGENDARY_COUNTER` predicate once Final Sacrifice locks |
| I3 | Exact `TEAM_ASSIST` mark once Hamtaazi locks |
| I4 | Whether surrender / disconnect forfeit adjusts impact |
| I5 | Whether hand-level impact is shown mid-match or only at end |
| I6 | `invalidActions` tracking source (rejected commands vs timeouts only) |

---

## 10. Phase 2 implementation touchpoints

| Area | Work |
|------|------|
| `packages/contracts` | Match summary / participant stats / MVP schemas; impact config schema |
| `packages/game-core` | Emit typed impact events; accumulate counters; compute ImpactScore from config; select `mvpParticipantIds` |
| `packages/game-server` | Persist summary; include in match record / projections on complete |
| `apps/web` | Results UI: team winner + بازیکن مؤثرتر / shared MVP |
| Reward adapter | Consume stats later; no economy values inside core |

`game-core` must remain free of website currency amounts.
