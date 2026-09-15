-- Kimiyaye Vahsh — reproducible schema (PostgreSQL)
-- Apply: psql $DATABASE_URL -f packages/game-server/migrations/001_init.sql

CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY,
  room_id UUID NOT NULL,
  room_code TEXT NOT NULL,
  mode TEXT NOT NULL,
  seed_hash TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  winner_team SMALLINT,
  surrender BOOLEAN NOT NULL DEFAULT FALSE,
  reward_status TEXT NOT NULL DEFAULT 'none',
  scores_json JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS match_players (
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  seat SMALLINT NOT NULL CHECK (seat BETWEEN 0 AND 3),
  team SMALLINT NOT NULL CHECK (team IN (0, 1)),
  kind TEXT NOT NULL,
  session_id_hash TEXT NOT NULL,
  user_id TEXT,
  display_name TEXT NOT NULL,
  PRIMARY KEY (match_id, seat)
);

CREATE TABLE IF NOT EXISTS match_actions (
  id BIGSERIAL PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  at TIMESTAMPTZ NOT NULL,
  seat SMALLINT NOT NULL,
  action_type TEXT NOT NULL,
  command_id UUID NOT NULL,
  summary_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (match_id, command_id)
);

CREATE TABLE IF NOT EXISTS match_tricks (
  id BIGSERIAL PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  trick_index INT NOT NULL,
  winner_seat SMALLINT NOT NULL,
  team SMALLINT NOT NULL,
  superior_after TEXT
);

CREATE TABLE IF NOT EXISTS reward_events (
  event_id UUID PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  team_result TEXT NOT NULL,
  signature TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  webhook_status TEXT NOT NULL DEFAULT 'pending'
);

CREATE INDEX IF NOT EXISTS idx_matches_room ON matches(room_id);
CREATE INDEX IF NOT EXISTS idx_actions_match ON match_actions(match_id);
CREATE INDEX IF NOT EXISTS idx_rewards_user ON reward_events(user_id);
