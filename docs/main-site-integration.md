# Main Website Integration

The game **must work standalone** (guest, private room, quick match). The main website is an optional identity and rewards provider.

## Adapters (server-side)

| Interface | Purpose |
|-----------|---------|
| **Identity** | Map ticket/JWT → `{ userId, displayName }` |
| **Game access** | Optional feature flags / bans (extension point) |
| **Reward provider** | Submit idempotent `RewardEvent` after match |
| **Tournament** | Optional `tournamentMatchId`, eligibility hooks (future) |

Implementations live in `packages/game-server/src/` (`ticket.ts`, `rewards.ts`). Do not import website ORM models into `game-core`.

## Game ticket flow

1. Main site authenticates user.
2. Site issues short-lived signed ticket (HMAC-SHA256, `GAME_TICKET_SECRET`).
3. Client connects to game server with `auth.ticket`.
4. Server validates expiry + signature → `kind: authenticated`.

Claims schema: `GameTicketClaims` in `@kv/contracts`.

Passwords and long-lived site cookies are **never** sent to the game server.

## Guest flow

- Client generates `sessionId` UUID + display name.
- No rewards persisted to main-site accounts.

## Connected mode

- Match results associated with `userId` in server memory (DB when enabled).
- On `match_complete`, server emits reward events via `RewardProvider`.

## Embedding in Next.js

Options:

1. Deploy `apps/web` static build under `/play`
2. Iframe standalone client
3. Import `@kv/contracts` only in a thin Next API route that mints tickets

Core rules remain in `@kv/game-core` — never duplicate in the website.
