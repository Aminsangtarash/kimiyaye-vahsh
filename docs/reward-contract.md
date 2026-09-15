# Reward Contract

Clients **never** award points. The game server creates signed, idempotent reward events after a validated `match_complete`.

## Event shape

See `RewardEvent` in `@kv/contracts`:

```json
{
  "eventId": "uuid",
  "matchId": "uuid",
  "userId": "string",
  "teamResult": "win | loss",
  "createdAt": "ISO-8601",
  "signature": "hex-hmac-sha256"
}
```

## Signature

```
HMAC-SHA256(secret, "{eventId}|{matchId}|{userId}|{teamResult}|{createdAt}")
```

## Idempotency

- Primary key / unique constraint on `eventId`
- Retries with same `eventId` return success without double credit

## Webhook (optional)

When `REWARD_WEBHOOK_URL` is set, server POSTs JSON body + `X-KV-Signature` header (future).

## Mock provider

`MockRewardProvider` in dev tracks seen `eventId`s in memory.

## Guest policy

No `userId` → no reward event.

## Tournament extension (future)

Optional fields (not in v1 payload):

- `tournamentId`
- `placement`
- `rewardType`

Add as new event schema version without breaking v1 consumers.
