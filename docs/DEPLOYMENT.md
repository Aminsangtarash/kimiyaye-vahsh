# Deployment

## What to deploy

1. **game-server** — Node authoritative Socket.IO service  
2. **web** — static Vite build (nginx or CDN)  
3. **optional Postgres** — match / reward persistence  

Assets (`assets/cards`) should be served by the web container or a CDN; portrait WebP thumbnails preferred over master PNG.

## Docker Compose (production-like local)

```bash
export GAME_TICKET_SECRET="$(openssl rand -hex 32)"
export SESSION_SECRET="$(openssl rand -hex 32)"
docker compose up --build
```

- Web: http://localhost:8080  
- Server: http://localhost:4010/health  
- DB: localhost:5432 (`kv` / `kv` / `kimiyaye_vahsh`)

Schema auto-applies from `packages/game-server/migrations/001_init.sql`.

## Without Docker

```bash
pnpm install
pnpm run build
pnpm --filter @kv/game-server start
# serve apps/web/dist with any static host
```

Set `VITE_GAME_SERVER_URL` at **build time** for the client.

## WebSocket proxy requirements

- HTTP Upgrade support for `/socket.io/`
- Sticky sessions if multiple server replicas (or Redis adapter — not in MVP)
- Idle timeout ≥ 60s

See `deploy/nginx-game-proxy.conf.example`.

## Environment

All variables documented in `.env.example` and `docs/environment.md`.  
**Never** commit real secrets.

## Health checks

- Liveness: `GET /health`
- Readiness: `GET /ready`

## Migrations

```bash
psql "$DATABASE_URL" -f packages/game-server/migrations/001_init.sql
```

Idempotent `CREATE TABLE IF NOT EXISTS`.

## Release checklist

- [ ] `pnpm test` green  
- [ ] `pnpm run build` green  
- [ ] `validate-data` green  
- [ ] Secrets rotated from defaults  
- [ ] CORS origins locked  
- [ ] Admin debug disabled (`NODE_ENV=production`)  
