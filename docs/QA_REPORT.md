# QA Report — Prompts 21–23

**Date:** 2026-09-15  
**Scope:** Hardening, tooling, automated QA

## Unit (game-core)

Run: `pnpm --filter @kv/game-core test`  
Coverage includes follow-suit, superior suit, specials, deterministic seeds, property checks.

## Integration (game-server)

Run: `pnpm --filter @kv/game-server test`  

| Case | Result |
|------|--------|
| Four-player ready + start | Covered |
| Illegal / out-of-turn play | Covered (`security.test.ts`) |
| Fake card id | Covered |
| Duplicate command idempotency | Covered |
| Projection hand leak check | Covered |
| Unauthorized late join | Covered |
| Reward idempotency | Covered |
| Expired ticket | Covered |
| Rate limiter | Covered |

## E2E (browser)

Full Playwright suite not added (avoid brittle large suite on MVP). Critical flows covered by:

1. Server room lifecycle integration tests  
2. Manual checklist below for UI  

### Manual E2E checklist

- [ ] Guest entry / Quick Match  
- [ ] Create private room + join with code  
- [ ] Four ready → start  
- [ ] Play cards; illegal cards disabled  
- [ ] Results screen on match complete  
- [ ] Reconnect mid-lobby with same session  

## Reconnect

Same `sessionId` reclaims seat; projection-only recovery documented in `docs/recovery-model.md`.

## Security cases

See `packages/game-server/src/security.test.ts` and `docs/security-model.md`.

## Load (local smoke)

```bash
pnpm --filter @kv/game-server load-test
```

**Observed (laptop, 2026-09-15):**

| Metric | Value |
|--------|------:|
| Rooms | 50 |
| Simulated users | 200 |
| Errors | 0 |
| Total wall time | ~211 s |
| Room latency p50 | ~3.9 s |
| Room latency p95 | ~7.1 s |
| RSS | ~90 MB |

**Not** a production capacity claim.

## UI / a11y notes

- Desktop-first layout; stacks on ≤900px  
- RTL root (`lang=fa` `dir=rtl`)  
- Focus outline on buttons  
- `prefers-reduced-motion` disables transitions  
- Cards use WebP portraits (~86px gameplay size) — avoid loading master PNGs in hand strip  

## Defects fixed in this pass

- Unauthorized room command binding  
- Rate limiting + payload size caps  
- Secure server seed (no client shuffle)  
- Match audit persistence without leaking completed seeds  
- Admin debug gated to non-production  

## Remaining risks

- Active lobbies still in-memory (process restart loses open rooms)  
- Inactivity auto-play timer not yet scheduled on server interval  
- No Playwright E2E in CI yet  
