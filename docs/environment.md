# Environment Configuration

Copy `.env.example` to `.env` at the repository root.

## Required for local play

| Variable | Default | Description |
|----------|---------|-------------|
| `GAME_SERVER_PORT` | `4010` | Socket.IO server port |
| `CORS_ORIGINS` | `http://localhost:5173` | Allowed web origins |
| `VITE_GAME_SERVER_URL` | `http://localhost:4010` | Client → server URL |

## Security (change in production)

| Variable | Description |
|----------|-------------|
| `GAME_TICKET_SECRET` | HMAC secret for short-lived game tickets |
| `SESSION_SECRET` | Session signing (future HTTP sessions) |

## Timeouts

| Variable | Default |
|----------|---------|
| `RECONNECT_GRACE_MS` | `60000` |
| `INACTIVITY_TIMEOUT_MS` | `60000` |

## Optional

| Variable | When |
|----------|------|
| `DATABASE_URL` | Persist matches / rewards |
| `REDIS_URL` | Horizontal room scaling |
| `REWARD_WEBHOOK_URL` | Push rewards to main site |
| `MAIN_SITE_JWT_*` | Verify main-site issued JWTs |

Validation: `loadServerEnv()` in `@kv/contracts` (Zod).
