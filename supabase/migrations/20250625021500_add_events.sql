-- Surge: Sprint 4 Schema
-- Immutable domain events with idempotency support

CREATE TABLE events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id    UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  actor_id    UUID NOT NULL REFERENCES users(id),
  entity_type TEXT NOT NULL,
  entity_id   UUID NOT NULL,
  event_type  TEXT NOT NULL,
  metadata    JSONB NOT NULL DEFAULT '{}',
  event_key   TEXT UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_quest ON events (quest_id, created_at DESC);
CREATE INDEX idx_events_entity ON events (entity_type, entity_id);
CREATE INDEX idx_events_actor ON events (actor_id);
CREATE INDEX idx_events_type ON events (event_type);
CREATE INDEX idx_events_key ON events (event_key) WHERE event_key IS NOT NULL;

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events_select_members" ON events
  FOR SELECT
  USING (
    quest_id IN (
      SELECT quest_members.quest_id FROM quest_members
      WHERE user_id = (
        SELECT id FROM users
        WHERE clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
      )
    )
  );

-- Only backend service role can insert events, RLS blocks client inserts by default.
