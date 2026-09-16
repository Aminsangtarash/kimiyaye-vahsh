# Rule Realignment Report — Phase 1 Complete (+ Final Addenda)

**Date:** 2026-09-16  
**Phase:** Rules & documentation only (no runtime code changes)  
**Deck:** 52 main cards remain **FROZEN**  
**Final addendum:** Individual ImpactScore + Winner MVP

---

## Deliverables

| Artifact | Role |
|----------|------|
| `docs/GAME_RULES_V2_DRAFT.md` | Target rules (Hunter, lobby, bots, impact/MVP) |
| `docs/SPECIAL_CARD_RULES_V2_DRAFT.md` | S1 six specials + open questions |
| `docs/LOBBY_FLOW_V2.md` | Auto-start lobby (no Ready) |
| `docs/BOT_PLAYER_DESIGN.md` | Bot architecture & safety |
| `docs/IMPACT_AND_MVP_SCORING.md` | **New** — ImpactScore, MVP, data shape |
| `data/game-rules.v2.draft.json` | Machine draft v2.0.2 (**not wired**) |
| `docs/RULE_REALIGNMENT_REPORT.md` | This report |

**Runtime still untouched:** `game-core`, `game-server`, `apps/web`, live JSON rules/specials, DB, websockets.

---

## 1. Rules now considered final

### Table / identity

1. Hunter Realm = realm of the **trick leader** (never winning card suit).  
2. First trick has Hunter Realm.  
3. Winner leads next → next Hunter = winner’s realm.  
4. Unique realm per seat; realm ≠ hand ≠ team.  
5. Teams = opposite seats.  
6. Deck + legendary ranks frozen.  
7. Follow-suit preserved; Chameleon not a universal bypass.  
8. S1 specials named; Shield/Scout/Silence/Anchor legacy/inactive.

### Lobby / bots

9. No Ready; auto-start on 4 seats + 4 realms + controllers; 3s countdown.  
10. Realm auto-assign when 4th seat fills; lock on countdown.  
11. Bots first-class; player-safe view; decisions outside core; same command path.  
12. Play with Bots 1+3; mixed comps; QM bot fill after 45s config; private host-only bots.  
13. Disconnect bot takeover; safe human reclaim; `hasBots` metadata.

### Impact / MVP

14. **Team victory is primary** — Impact/MVP never override winning team.  
15. Deterministic **ImpactScore** from formal events only; configurable weights.  
16. Defaults: trick +10, special success +10, legendary counter +20, team assist +10, human timeout −5.  
17. Distinct events may stack on one resolution; no duplicate same event.  
18. MVP = higher impact among **winning team only**; tie-breaks then **shared MVP** via `mvpParticipantIds[]`.  
19. `MatchResult` ≠ `ImpactScore` ≠ `MVP` ≠ `WebsiteReward`; core has no currency values.  
20. Bots accrue impact; may be MVP in bot matches; competitive filters use `hasBots`.

---

## 2. Unresolved (still open)

Specials S-INV / S-TB / S-TRAP / S-FS / S-CH / … (predicates for SPECIAL_SUCCESS, LEGENDARY_COUNTER, TEAM_ASSIST depend on these).

Impact residuals: I1–I6 in `IMPACT_AND_MVP_SCORING.md` (event predicates, forfeit, mid-match display).

Lobby residuals: L1–L5 in prior addendum.

---

## 3. Contradiction table (impact rows added)

| Topic | Old v1 runtime | New v2 target | Future code change |
|-------|----------------|---------------|-------------------|
| Trump | Superior = winning card suit | Hunter = leader realm | `engine` / `trick` / UI / persist |
| Ready | Required + host start | Removed; auto countdown | `rooms.ts`, web lobby |
| Bots | None | Controllers + metadata | bot-strategy + server |
| **Individual score** | **Team tricks/hands only** | **+ ImpactScore / MVP** | core events, summary, UI, persist |
| **MVP** | Absent | Winners-only; shared supported | `mvpParticipantIds[]` |
| **Rewards** | Mock match reward | Still separate; may use impact later | adapter only — no economy in core |
| Specials | 7 active | S1 six | catalog + handlers |

---

## 4. Revised Phase 2 implementation plan

**Do not start automatically.**

### Wave A — Rules core (table)

1. `playerRealms` + `hunterRealm` in `game-core` (replace Superior / Anchor).  
2. Contracts + projections + Hunter unit tests.  
3. Defer full S1 specials until OPEN items close (stubs/gates OK).

### Wave B — Lobby auto-start + realms (no Ready)

1. Lobby FSM + countdown + realm select/auto-assign/lock.  
2. Remove Ready gate.  
3. Web lobby UX.

### Wave C — Bots

1. Bot-strategy module; BALANCED; player-safe projection; same command path.  
2. Play with Bots, QM fill, private host fill, disconnect takeover.  
3. Persist `hasBots` / `botSeatCount` / `controllerType`.

### Wave D — Specials S1

1. Wire six specials; disable legacy four; ±2.5 math.  
2. Formal event marks: SPECIAL_SUCCESS, LEGENDARY_COUNTER, TEAM_ASSIST.

### Wave E — ImpactScore + MVP

1. Central impact weight config.  
2. `game-core`: emit events, accumulate counters, compute ImpactScore, select `mvpParticipantIds` (shared supported).  
3. `contracts`: match summary schema.  
4. `game-server`: persist summary on match complete.  
5. `apps/web` results: team winner + بازیکن مؤثرتر / shared MVP.  
6. `rewards.ts`: extension hooks only (no website point amounts in core); may later read MVP/`hasBots`.

### Wave F — Polish

Board UX, Hunter clarity, bot badges, FA/EN docs, balance sims.

**Suggested order:** A → B → C, with D then E (impact needs special event definitions), then F.  
Impact scaffolding (counters for tricks won) can begin in A/C; full SPECIAL/LEGENDARY/ASSIST weights land with D→E.

---

## 5. Modules requiring changes (Phase 2 checklist)

### New

- `packages/bot-strategy` (or server `src/bot/`)  
- Lobby / QM timers  
- Impact aggregator (prefer inside `game-core` pure functions + config)

### `packages/contracts`

- Realms, controllerType, S1 specials, lobby commands  
- **Match summary / participant stats / MVP array / impact config schema**  
- Env keys: countdown, QM bot fill, impact weights  

### `packages/game-core`

- Hunter + realms; specials; **impact events & MVP selection**  
- No bot AI; no website currency  

### `packages/game-server`

- Rooms FSM, bots, persist **match summary + impact fields**  
- Reward adapter reads summary later  

### `apps/web`

- Lobby without Ready; Play with Bots; Hunter UI  
- **Results screen: team + MVP / shared MVP + optional impact breakdown**  

### Persistence / migration (when DB enabled)

- Participant rows: realm, controllerType, tricksWon, successfulSpecials, legendaryCounters, teamAssists, impactScore  
- Match: winningTeamId, mvpParticipantIds (array/json), hasBots, botSeatCount  

---

## 6. Migration risks (impact)

| Risk | Severity | Mitigation |
|------|----------|------------|
| MVP shown as if it changed the winner | High | UI copy: team first; MVP subtitle only |
| Double-counting same event | High | Event-id per resolution; unit tests on cumulative example |
| Timeout penalty on bot seats | Med | Gate on human-controlled only |
| Impact weights hardcoded | Med | Single config object |
| Website points inside core | High | Forbid; adapter only |
| MVP before specials defined | Med | Ship tricksWon impact first; add special events in Wave E |

---

## 7. Tests to add (impact / MVP)

- Team win unchanged when computing MVP  
- Impact = configured sum of events  
- Cumulative Final Sacrifice example (+10+20+10) once rules exist  
- MVP only from winning team  
- Tie → tricks → specials → timeouts → shared `mvpParticipantIds.length === 2`  
- Bot can be sole MVP; `hasBots` still true  
- humanTimeout not applied under bot controller  
- Match summary schema validation  

(Prior Hunter / lobby / bot tests still required.)

---

## 8. Phase 1 final checklist

- [x] Hunter Realm + first trick + realm lobby rules  
- [x] S1 specials + legacy marked  
- [x] Ready removed; auto-start; bots; QM/private policies  
- [x] ImpactScore + MVP + shared MVP + match summary shape  
- [x] Draft JSON updated (v2.0.2)  
- [x] Phase 2 plan revised with Wave E  
- [x] **No runtime implementation**  

---

## 9. STOP

**Phase 1 documentation is complete.** Do not begin Phase 2 automatically.

When you request Phase 2, start with **Wave A (Hunter Realm + player realms)** unless you specify otherwise.
