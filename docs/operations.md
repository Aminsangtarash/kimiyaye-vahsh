# Operations

## Services

| Service | Port | Command |
|---------|------|---------|
| Game server | 4010 | `pnpm run dev:server` / `pnpm --filter @kv/game-server start` |
| Web client | 5173 | `pnpm run dev:web` |
| Postgres (optional) | 5432 | `docker compose up db` |

## Health

- `GET /health` — liveness
- `GET /ready` — process ready + room count
- `GET /metrics` — Prometheus-style gauges (rooms, connections)

## Data validation

```bash
pnpm --filter @kv/game-server validate-data
```

Checks duplicate IDs, ranks, suits, power fills, portrait files, special definitions.

## Configurable constants

`data/game-config.json` + `data/game-rules.json` + `data/rank-model.json`.  
Not exposed for client mutation.

## Match debug (dev only)

```bash
curl -H "x-kv-admin-key: dev-admin" http://localhost:4010/admin/matches/<matchId>
```

Returns audit record (no raw seed after completion).

## Persistence dir

Default `.data/matches/`. Override with `KV_PERSIST_DIR`. Add to `.gitignore`.

## Load smoke

```bash
pnpm --filter @kv/game-server load-test
# or KV_LOAD_ROOMS=50 pnpm --filter @kv/game-server load-test
```

## Logs

Stdout JSON lines. Ship to any log aggregator; never store tickets.
