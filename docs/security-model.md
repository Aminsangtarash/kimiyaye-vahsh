# Security Model — Kimiyaye Vahsh

## Trust boundary

| Component | Trust |
|-----------|-------|
| Browser / client | **Untrusted** |
| Socket.IO messages | Validated with Zod; rate-limited |
| `game-core` on server | Sole authority for legality, winners, scores |
| Main-site ticket | HMAC-verified; short-lived |

Clients never choose shuffle seeds, never compute power, never award rewards.

## Authorization

- Room membership is bound on join (`boundRoomId` + `boundSeat` on the socket).
- Commands for another `roomId` are rejected (`Unauthorized room access`).
- Seat in actions is forced to the authenticated seat (client cannot spoof seat).
- New sessions cannot join an in-progress match; same `sessionId` may reconnect to its seat.

## Hidden state

- Wire payloads use `projectForSeat` — only the viewer’s hand and specials.
- Opponent hands are never broadcast; only hand counts.
- Match persistence stores `sessionIdHash`, not raw session IDs after hashing.
- Raw shuffle `seed` is stripped from completed match records; `seedHash` retained for audit.

## Message integrity

- Zod `ClientCommandSchema` rejects malformed payloads.
- `commandId` UUID dedupe (idempotent).
- Monotonic `clientSeq` rejects replays / stale messages.
- Max Socket.IO buffer `16KB`; JSON body limit `32kb`.
- Rate limits: joins (~10 burst) and commands (~30 burst) per session hash.

## Rewards

- Server creates signed `RewardEvent` after `match_complete`.
- `MockRewardProvider` / DB unique `event_id` prevent duplicate credits on reconnect.

## RNG

- Match seeds from `crypto.randomBytes` (`secureSeed`).
- Clients cannot supply seed or deck order.

## Logging

Structured JSON logs with `matchId` / `roomId` / hashed session. Tokens and secrets are redacted.

## Admin debug

`GET /admin/matches/:id` only when `NODE_ENV !== production` and `x-kv-admin-key` matches.
