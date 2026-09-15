# Kimiyaye Vahsh (کیمیای وحش)

Four-player partnership trick-taking card game inspired by Hokm, with a fantasy animal main deck and scarce special cards. Playable as a **standalone** guest experience; optional main-website identity and rewards via signed tickets.

## Architecture

```
apps/web                 React + Vite client
packages/game-core       Deterministic authoritative rules engine
packages/game-server     Socket.IO rooms, persistence, security
packages/contracts       Shared Zod schemas & protocol
data/                    Canonical cards, rules, specials, tokens
assets/                  Portraits & rendered cards
docs/                    Design + ops documentation
```

See `docs/architecture.md`.

## Local setup

```bash
pnpm install
cp .env.example .env
pnpm run dev:server    # :4010
pnpm run dev:web       # :5173
```

Open the web app → Guest Quick Match or Private Room.

## Production build

```bash
pnpm run build
pnpm test
pnpm --filter @kv/game-server validate-data
```

Docker (optional):

```bash
docker compose up --build
```

Details: `docs/DEPLOYMENT.md`.

## Environment

Documented in `.env.example` and `docs/environment.md`. Never commit secrets.

## Database

Optional Postgres. Schema: `packages/game-server/migrations/001_init.sql`.  
Without DB, matches audit to `.data/matches/`.

## Game server

- Health: `GET /health`
- Ready: `GET /ready`
- Metrics: `GET /metrics`
- Realtime: Socket.IO (`docs/realtime-protocol.md`)

## Client

Static SPA. Build with `VITE_GAME_SERVER_URL` pointing at the API. Prefer WebP portraits under `/cards/portraits/final/...`.

## Assets

- Main deck portraits: `assets/cards/portraits/final/{suit}/`
- Clean cards: `assets/cards/final/clean/`
- Specials: `assets/cards/special/`

## Testing

```bash
pnpm test                                 # unit + integration
pnpm --filter @kv/game-server load-test   # local load smoke
```

## Troubleshooting

| Issue | Action |
|-------|--------|
| WS CORS | Set `CORS_ORIGINS` |
| Missing cards | Run `validate-data` |
| Reconnect fails | Same `sessionId`; grace window |
| Admin 404 in prod | Expected — debug disabled |

More: `docs/debugging.md`, `docs/operations.md`.
