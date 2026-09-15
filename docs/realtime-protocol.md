# Realtime Protocol

**Version:** `PROTOCOL_VERSION = 1` (`@kv/contracts`)

## Transport

- Socket.IO over WebSocket (fallback polling)
- Server: `@kv/game-server` default port `4010`
- Client env: `VITE_GAME_SERVER_URL`

## Authentication handshake

`socket.handshake.auth`:

| Field | Purpose |
|-------|---------|
| `displayName` | Guest or ticket display name |
| `sessionId` | Stable guest session UUID |
| `ticket` | Optional signed game ticket (authenticated) |

## Client → Server events

| Event | Payload | Ack |
|-------|---------|-----|
| `kv:quick_match` | `{}` | `{ ok, roomId, code, seat }` |
| `kv:join_room` | `{ create?: true, code?: string }` | `{ ok, roomId, code, seat }` |
| `kv:command` | `ClientCommand` (Zod) | `CommandAck` |

### ClientCommand

- `commandId` — UUID, idempotent dedupe key
- `clientSeq` — monotonic per connection; stale values rejected
- `roomId` — server-generated UUID
- `type` — `READY` \| `START_MATCH` \| `PLAY_CARD` \| `PLAY_SPECIAL` \| `PASS_SPECIAL` \| `SURRENDER`

## Server → Client events

| Event | Payload |
|-------|---------|
| `kv:event` | `{ type: "game_state", stateVersion, payload: { lobby, game? } }` |

`game` is a **PlayerGameView** — only the receiving seat’s private cards.

## Reconnect

- Same `sessionId` re-joins the same seat if room still open
- `stateVersion` on each ack; client replaces local state from latest `game_state`
- Grace period: `RECONNECT_GRACE_MS` (default 60s) — seat marked disconnected, not removed immediately

## Security rules

- Server-generated `roomId` and room codes
- No broadcast of full `GameState`
- All gameplay commands validated in `game-core` on server
