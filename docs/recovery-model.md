# Recovery Model

## Temporary disconnect

1. Seat marked `connected: false`; grace = `RECONNECT_GRACE_MS` (default 60s).
2. Client reconnects with the same `sessionId` (guest) or ticket `sub` (auth).
3. `joinRoom` finds the existing seat, marks connected, emits **only that seat’s** projection.
4. Client replaces local UI state from `stateVersion` + projection (no delta merge of private data).

## What is restored

- Lobby / seat / team / ready
- Public trick, superior suit, scores
- **Your** hand and specials
- Legal card IDs for your seat

## What is never restored to others

- Opponent private hands
- Raw shuffle seed (completed matches)

## Match audit persistence

On disk under `.data/matches/` (or `KV_PERSIST_DIR`):

- `{matchId}.json` — participants, seed hash, actions, tricks, scores, result, reward status
- `{matchId}.ndjson` — append-only action log

PostgreSQL schema: `packages/game-server/migrations/001_init.sql` (optional).

## Crash recovery (MVP)

In-memory rooms are lost on process restart. For production, enable DB persistence and reload open matches (future). File audit remains for completed matches written before crash.

## Inactivity

Rules define auto-play on timeout (`INACTIVITY_TIMEOUT_MS`). Engine supports legal lowest-card play; scheduling can be enabled in ops without changing core validation.
