-- Forward migration: V2 realms, controllers, hunter realm, impact/MVP
-- Safe to apply on existing DBs. Does not delete historical rows.
-- Apply: psql $DATABASE_URL -f packages/game-server/migrations/002_v2_realms_bots_impact.sql

ALTER TABLE match_players
  ADD COLUMN IF NOT EXISTS realm TEXT,
  ADD COLUMN IF NOT EXISTS controller_type TEXT DEFAULT 'human';

ALTER TABLE match_tricks
  ADD COLUMN IF NOT EXISTS hunter_realm_after TEXT;

-- Historical superior_after remains for V1 rows; do not rename/drop.
COMMENT ON COLUMN match_tricks.superior_after IS 'DEPRECATED V1 Superior Suit. Not Hunter Realm.';

ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS has_bots BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS bot_seat_count SMALLINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mvp_participant_ids JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS participants_json JSONB DEFAULT '[]'::jsonb;
