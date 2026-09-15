# Debugging

## Engine-only

```bash
pnpm --filter @kv/game-core test
```

Use `SeededRandom(seed)` for reproducible hands in unit tests.

## Room / multiplayer

```bash
pnpm --filter @kv/game-server test
```

Security cases live in `security.test.ts`.

## Live match inspection

1. Run server with `NODE_ENV=development`.
2. Play a match; note `roomId` from lobby.
3. `GET /admin/matches/:roomId` with admin key.
4. Inspect `actions`, `tricks`, `scores`, `seedHash`.

## Common issues

| Symptom | Check |
|---------|-------|
| Illegal card always | Follow-suit; turn seat; projection `legalCardIds` |
| Can’t reconnect | Same `sessionId`; room not expired |
| No rewards | Guest mode skips; need authenticated ticket |
| CORS errors | `CORS_ORIGINS` includes client origin |
| Missing art | `validate-data`; paths under `assets/cards/` |

## Client network

Browser DevTools → WS frames should never contain other players’ `instanceId` cards in hand arrays.
