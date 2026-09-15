# Database Model (optional PostgreSQL)

MVP runs without a database. This schema supports production persistence when `DATABASE_URL` is set.

## Tables

### `users` (main-site mirror or local)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | Main-site user id |
| display_name | text | |
| created_at | timestamptz | |

### `matches`

| Column | Type |
|--------|------|
| id | uuid PK |
| room_id | uuid |
| seed | integer |
| started_at | timestamptz |
| ended_at | timestamptz |
| winner_team | smallint |
| surrender | boolean |

### `match_players`

| Column | Type |
|--------|------|
| match_id | uuid FK |
| seat | smallint |
| user_id | uuid nullable |
| guest_session_id | text nullable |
| team | smallint |

### `reward_events`

| Column | Type |
|--------|------|
| event_id | uuid PK |
| match_id | uuid FK |
| user_id | uuid |
| team_result | text |
| signature | text |
| submitted_at | timestamptz |
| webhook_status | text |

Unique index on `event_id` enforces idempotent reward submission.

## Redis (optional)

- `room:{roomId}` — serialized lobby metadata TTL 2h
- `quick_queue` — list of open quick-match room ids

Not wired in MVP; in-memory maps suffice for local dev.
