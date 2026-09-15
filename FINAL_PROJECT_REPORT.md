# FINAL PROJECT REPORT — کیمیای وحش (Kimiyaye Vahsh)

## Project Status

**Classification: `READY_WITH_INTEGRATION_DEPENDENCY`**

The playable standalone game (52-card deck, specials, 4-player rooms, authoritative server, UI, art) is complete and builds/tests green.

Remaining external dependency: **main website** must mint short-lived game tickets and optionally consume reward webhooks. A working mock reward provider and ticket HMAC verifier are in-repo.

---

## Implemented Features

- 52-card main deck (4 suits × 13) with Legendary A/B/C
- Dragon of Moses I / II / III (C/B/A) with escalating portrait concepts
- 7 special card types + balance docs
- Hokm-derived trick-taking, follow-suit, dynamic Superior Suit
- Quick Match, Private Room, Guest mode
- Authenticated ticket boundary + reward event contract
- Reconnect by session, per-seat projections (no hand leaks)
- Authoritative TypeScript engine + Socket.IO server + React client

## Final Architecture

Monorepo under `site/`:

| Package | Role |
|---------|------|
| `apps/web` | Vite + React client |
| `packages/game-core` | Deterministic rules |
| `packages/game-server` | Rooms, security, persistence |
| `packages/contracts` | Shared schemas |

Docs: `docs/architecture.md`, `docs/realtime-protocol.md`, `docs/security-model.md`, `docs/recovery-model.md`.

## Game Rules

Canonical: `data/game-rules.json`, `docs/GAME_RULES_EN.md`, `docs/GAME_RULES_FA.md`, `docs/GAME_DESIGN_DOCUMENT.md`.

Superior Suit: winner’s printed suit becomes Superior for the next trick; first trick of a hand has none; Anchor extends lock.

## Main Cards

- Source: `data/cards.json` (52)
- Art: `assets/cards/portraits/final/{carnivores,herbivores,birds,reptiles}/` — **52/52 PNG**
- Renders: `assets/cards/final/clean/` — **52/52**
- Review: `review/final-deck/`

## Special Cards

- Definitions: `data/special-cards.json` (7 types × 2 copies dealt)
- Art + renders: `assets/cards/special/` — **7/7**
- Rules: `docs/special-card-rules.md`

## Multiplayer

Socket.IO rooms with Zod-validated commands, rate limits, idempotent `commandId`, `clientSeq`, room authorization, file match audit (`.data/matches/`), optional Postgres schema.

## Standalone Mode

Guest session UUID + display name; no main-site account; no rewards.

## Main-Site Integration

- Ticket HMAC: `packages/game-server/src/ticket.ts`
- Rewards: `docs/reward-contract.md`, `MockRewardProvider`
- Docs: `docs/main-site-integration.md`

## Security

- Server-only outcomes and seeds (`secureSeed`)
- Projection privacy, payload size caps, rate limits
- Admin match viewer disabled in production
- See `docs/security-model.md`

## Tests

| Suite | Result |
|-------|--------|
| `@kv/game-core` unit | Pass (9) |
| `@kv/game-server` rooms + security | Pass (10) |
| `validate-data` | Pass (52 cards, 7 specials) |
| Load smoke 50 rooms / 200 users | 0 errors |
| Production builds + typecheck | Pass |

Report: `docs/QA_REPORT.md`.

## Production Build

```bash
pnpm install && pnpm run build && pnpm test
docker compose up --build   # optional
```

Docs: `docs/DEPLOYMENT.md`, `docs/BACKUP_AND_RECOVERY.md`.

## Asset Status

| Asset class | Status |
|-------------|--------|
| Main portraits | Complete (52) |
| Clean/presentation cards | Complete (52) |
| Special portraits/renders | Complete (7) |
| Suit icons | Geometric v1 placeholders (locked) |
| Brand Persian display font | Tahoma interim |

No remaining portrait placeholders for the main deck.

## Known Limitations

1. Open lobbies are in-memory (process restart drops them); completed matches audit to disk/DB.
2. Inactivity auto-play timer not scheduled on a server interval yet (rules defined).
3. No Playwright browser E2E in CI (critical flows covered by server tests + manual checklist).
4. Main-site ticket minting API and live reward webhook are external.
5. Redis not wired (single-node MVP).
6. Special-card timing UX is MVP-level.

## Remaining Manual Actions

1. Deploy with real `GAME_TICKET_SECRET` / `SESSION_SECRET`.
2. Implement main-site ticket issuer + optional reward webhook consumer.
3. Host static `apps/web/dist` with card assets / CDN.
4. Optional: run Postgres migration and point `DATABASE_URL`.
5. Owner playtest of visual polish / special UX.

## How to Run

```bash
cd site
pnpm install
cp .env.example .env
pnpm run dev:server   # :4010
pnpm run dev:web      # :5173
```

## How to Deploy

See `docs/DEPLOYMENT.md` (Docker Compose + nginx WebSocket notes).

## Important Paths

```
data/cards.json
data/special-cards.json
data/game-rules.json
data/design-tokens.json
docs/GAME_DESIGN_DOCUMENT.md
docs/final-art-direction.md
packages/game-core/
packages/game-server/
apps/web/
assets/cards/
FINAL_PROJECT_REPORT.md
```

## Assumptions

- Owner delegated autonomous art lock and engineering completion.
- Geometric suit marks accepted for v1.
- Mock reward adapter satisfies engineering until website API exists.
